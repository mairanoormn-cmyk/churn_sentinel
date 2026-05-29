"""
Vanta — FastAPI Backend with SSE Streaming
"""
import json
import os
import httpx
from pathlib import Path
from typing import Optional, List, Union
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

import database

# Resolve path to import from adjacent ai-llm and bright-data folders
import sys
_root_dir = Path(__file__).parent.parent
sys.path.insert(0, str(_root_dir / "ai-llm"))
sys.path.insert(0, str(_root_dir / "bright-data"))

import agent_orchestrator as agent_module

app = FastAPI(title="Vanta API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request/Response models ───────────────────────────────────────────────────
class ScanRequest(BaseModel):
    competitor: str

class BattlecardRequest(BaseModel):
    signal_id: Union[int, str]
    competitor: Optional[str] = None
    # Inline signal data — used when signal_id is temp (not yet in DB)
    company_name: Optional[str] = None
    pain_point: Optional[str] = None
    raw_text: Optional[str] = None
    company_size: Optional[str] = None
    industry: Optional[str] = None

class PushRequest(BaseModel):
    signal_id: Union[int, str]
    crm_type: str = "HubSpot"
    # Inline signal data for temp IDs
    company_name: Optional[str] = None
    pain_point: Optional[str] = None
    raw_text: Optional[str] = None
    source: Optional[str] = None
    intent_score: Optional[int] = None

class EnrichRequest(BaseModel):
    company_name: str
    industry: Optional[str] = None

# ── Root ─────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "Vanta API v2 is running."}

# ── SSE scan endpoint ─────────────────────────────────────────────────────────
@app.post("/api/scan")
async def start_scan(request: ScanRequest):
    """
    SSE stream: yields JSON events as the agent works in real-time.
    Event types: thinking | tool_call | search_result | scrape_result |
                 signals_ready | complete | error
    """
    competitor = request.competitor.strip()
    if not competitor:
        raise HTTPException(status_code=400, detail="Competitor name cannot be empty")

    job_id = database.create_scan_job(competitor)

    async def generate():
        # First event — job created
        yield f"data: {json.dumps({'type': 'job_created', 'job_id': job_id, 'competitor': competitor})}\n\n"

        database.update_job_status(job_id, "RUNNING", 10)
        found_signals = []

        try:
            async for event in agent_module.run_agent_stream(competitor):
                # Persist signals when the agent finishes extracting them
                if event.get("type") == "signals_ready":
                    found_signals = event.get("signals", [])
                    if found_signals:
                        database.add_signals(job_id, found_signals)
                        

                    database.update_job_status(job_id, "SCORING", 90)

                if event.get("type") == "complete":
                    database.update_job_status(job_id, "COMPLETED", 100)

                yield f"data: {json.dumps(event)}\n\n"

        except Exception as e:
            database.update_job_status(job_id, "FAILED", 0)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        yield "data: {\"type\": \"stream_end\"}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":   "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":      "keep-alive",
        }
    )

# ── Status endpoint ───────────────────────────────────────────────────────────
@app.get("/api/status/{job_id}")
def get_status(job_id: str):
    job = database.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

# ── Signals endpoint ──────────────────────────────────────────────────────────
@app.get("/api/signals")
def get_signals(competitor: Optional[str] = None, job_id: Optional[str] = None):
    if job_id:
        return database.get_signals_by_job(job_id)
    elif competitor:
        return database.get_all_signals_by_competitor(competitor)
    return database.get_recent_signals(limit=50)

# ── Battle card endpoint ──────────────────────────────────────────────────────
@app.post("/api/battlecard")
async def generate_battlecard(request: BattlecardRequest):
    signal_id = request.signal_id
    signal = None

    # Try to get from DB first (real integer ID)
    if not (isinstance(signal_id, str) and str(signal_id).startswith("temp_")):
        try:
            signal = database.get_signal_by_id(int(signal_id))
        except (ValueError, TypeError):
            pass

    # If not in DB yet (temp ID or not found), use inline data from request
    if signal is None:
        if not request.company_name:
            raise HTTPException(
                status_code=400,
                detail="Signal not found in DB and no inline data provided."
            )
        signal = {
            "id": signal_id,
            "job_id": None,
            "company_name": request.company_name,
            "pain_point": request.pain_point or "Dissatisfaction",
            "raw_text": request.raw_text or "",
            "company_size": request.company_size or "Unknown",
            "industry": request.industry or "Technology",
        }

    competitor = request.competitor or "Competitor"
    if not request.competitor and signal.get("job_id"):
        job = database.get_job(signal["job_id"])
        if job:
            competitor = job["competitor"]

    print(f"[Battlecard] Generating for '{signal['company_name']}' vs '{competitor}'")
    battlecard = await agent_module.generate_battlecard(signal, competitor)

    # Save to DB only if we have a real integer ID
    if not (isinstance(signal_id, str) and str(signal_id).startswith("temp_")):
        try:
            database.update_signal_battlecard(int(signal_id), battlecard)
        except Exception:
            pass

    return battlecard

# ── CRM push endpoint ─────────────────────────────────────────────────────────
@app.post("/api/push-crm")
async def push_crm(request: PushRequest):
    signal_id = request.signal_id
    signal = None

    # Try DB first
    if not (isinstance(signal_id, str) and str(signal_id).startswith("temp_")):
        try:
            signal = database.get_signal_by_id(int(signal_id))
            if signal:
                database.mark_signal_pushed(int(signal_id))
        except (ValueError, TypeError):
            pass

    # Fallback to inline data
    if signal is None:
        if not request.company_name:
            raise HTTPException(status_code=400, detail="Signal not found and no inline data provided.")
        signal = {
            "company_name": request.company_name,
            "pain_point":   request.pain_point or "Dissatisfaction",
            "raw_text":     request.raw_text or "",
            "source":       request.source or "Web",
            "intent_score": request.intent_score or 7,
        }

    # Real HubSpot Integration (if configured)
    hubspot_token = os.getenv("HUBSPOT_ACCESS_TOKEN")
    hubspot_sent = False
    if hubspot_token:
        try:
            url = "https://api.hubapi.com/crm/v3/objects/deals"
            headers = {
                "Authorization": f"Bearer {hubspot_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "properties": {
                    "dealname": f"Competitor Churn: {signal['company_name']}",
                    "dealstage": "appointmentscheduled",
                    "description": f"Source: {signal['source']}\nPain Point: {signal['pain_point']}\nEvidence: {signal['raw_text']}"
                }
            }
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(url, headers=headers, json=payload)
                hubspot_sent = resp.status_code in (200, 201)
        except Exception as e:
            print("HubSpot API error:", e)

    print(f"[CRM] Pushed '{signal['company_name']}' (score {signal['intent_score']}) → {request.crm_type} (Real API: {hubspot_sent})")

    if hubspot_sent:
        msg = f"Lead successfully pushed via active HubSpot CRM Integration API."
    else:
        msg = f"Lead pushed to simulated {request.crm_type} sandbox pipeline."

    return {
        "success": True,
        "message": msg,
        "crm_type": request.crm_type,
        "signal_id": signal_id,
        "real_apis": {
            "hubspot": hubspot_sent
        }
    }


# ── Competitor Stats (Weekly Vulnerability Dashboard with Radar metrics) ─────
def compute_dimension_scores(signals: List[dict]) -> dict:
    categories = {
        'pricing_score': ['pricing', 'cost', 'expensive', 'license', 'price'],
        'support_score': ['support', 'service', 'response', 'help', 'sla'],
        'feature_score': ['feature', 'missing', 'functionality', 'limitation', 'ux'],
        'hiring_score':  ['hiring', 'migration', 'linkedin', 'job posting', 'admin'],
        'sentiment_score': ['reddit', 'twitter', 'glassdoor', 'g2', 'trustpilot'],
    }
    scores = {k: 0 for k in categories}
    for signal in signals:
        pain = signal.get("pain_point", "").lower() if signal.get("pain_point") else ""
        source = signal.get("source", "").lower() if signal.get("source") else ""
        text = signal.get("raw_text", "").lower() if signal.get("raw_text") else ""
        
        for dimension, keywords in categories.items():
            if any(kw in pain or kw in source or kw in text for kw in keywords):
                scores[dimension] += int(signal.get("intent_score", 5)) * 2
                
    # Normalize to 0-100 scale, minimum 10 to avoid empty radar shape
    return {k: max(10, min(v, 100)) for k, v in scores.items()}

@app.get("/api/competitor-stats")
def get_competitor_stats():
    import psycopg2.extras as _extras
    conn = database.get_db_connection()
    stats_list = []

    try:
        cursor = conn.cursor(cursor_factory=_extras.RealDictCursor)
        cursor.execute('''
            SELECT j.competitor, COUNT(s.id) as signal_count, AVG(s.intent_score) as avg_score
            FROM signals s
            JOIN scan_jobs j ON s.job_id = j.id
            GROUP BY j.competitor
        ''')
        rows = cursor.fetchall()

        for r in rows:
            comp = r['competitor']

            # Most common pain point
            cursor.execute('''
                SELECT pain_point, COUNT(pain_point) as c
                FROM signals s
                JOIN scan_jobs j ON s.job_id = j.id
                WHERE LOWER(j.competitor) = LOWER(%s)
                GROUP BY pain_point
                ORDER BY c DESC LIMIT 1
            ''', (comp,))
            pain_row = cursor.fetchone()
            trigger  = pain_row['pain_point'] if pain_row else "Dissatisfaction"

            # All signals for radar dimensions
            cursor.execute('''
                SELECT s.intent_score, s.pain_point, s.source, s.raw_text
                FROM signals s
                JOIN scan_jobs j ON s.job_id = j.id
                WHERE LOWER(j.competitor) = LOWER(%s)
            ''', (comp,))
            comp_signals    = cursor.fetchall()
            live_dim_scores = compute_dimension_scores(comp_signals)

            avg_score_val = min(int(r['avg_score'] * 10) if r['avg_score'] else 50, 100)

            level = "Low"
            if avg_score_val >= 80:
                level = "Critical"
            elif avg_score_val >= 65:
                level = "High"
            elif avg_score_val >= 50:
                level = "Moderate"

            stats_list.append({
                'name':    comp,
                'score':   avg_score_val,
                'level':   level,
                'trigger': trigger,
                'signals': r['signal_count'],
                'trend':   'up' if avg_score_val > 60 else 'stable',
                **live_dim_scores,
            })

        cursor.close()
    except Exception as e:
        print("Competitor stats error:", e)
    finally:
        conn.close()

    return stats_list

@app.post("/api/enrich")
async def enrich_endpoint(request: EnrichRequest):
    try:
        contacts = await agent_module.enrich_lead(request.company_name, request.industry or "B2B/Technology")
        return {"success": True, "contacts": contacts}
    except Exception as e:
        return {"success": False, "error": str(e)}

