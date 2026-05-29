"""
Vanta — Agent Orchestrator
Autonomous GTM intelligence agent using Bright Data + AIML API (Claude Opus).

Bright Data tools used (FREE TIER):
  1. MCP Server       — https://mcp.brightdata.com/sse (primary path)
     - search_engine         — Google SERP via MCP
     - web_data_reddit_posts — Structured Reddit data
     - scrape_as_markdown    — G2 / Trustpilot reviews
  2. SERP API         — Google search via bright_data_utils.search_web (fallback)
  3. Web Unlocker     — General page scraping via bright_data_utils.scrape_url (fallback)
  4. Scraping Browser — JS-heavy sites via bright_data_utils.scrape_js_site (fallback)

Note: LinkedIn Jobs Dataset (Web Scraper API) is a PAID feature — removed.
"""
import os
import re
import json
import sys
import asyncio
import httpx
from typing import AsyncGenerator
from pathlib import Path
from dotenv import load_dotenv

# ── Path resolution ───────────────────────────────────────────────────────────
_root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_root_dir / "bright-data"))
sys.path.insert(0, str(_root_dir / "backend"))

from bright_data_utils import search_web, scrape_url, scrape_js_site, search_web_async

# Load .env
load_dotenv(dotenv_path=_root_dir / "backend" / ".env")

AIML_API_KEY        = os.getenv("AIML_API_KEY", "")
AIML_MODEL          = os.getenv("AIML_MODEL", "anthropic/claude-opus-4-8")
BRIGHT_DATA_API_KEY = os.getenv("BRIGHT_DATA_API_KEY", "")


# ── JSON helpers ──────────────────────────────────────────────────────────────
def _extract_json_array(text: str) -> str:
    """Extract the first valid JSON array from a string."""
    text  = text.strip()
    start = text.find("[")
    end   = text.rfind("]")
    if start != -1 and end != -1 and end > start:
        return text[start:end + 1]
    return text


def _extract_json_object(text: str) -> str:
    """Extract the first valid JSON object from a string."""
    text  = text.strip()
    start = text.find("{")
    end   = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start:end + 1]
    return text


def _safe_parse_signals(raw: str) -> list:
    """Robustly parse a JSON array of signals, with multiple fallback strategies."""
    raw = _extract_json_array(raw)
    try:
        result = json.loads(raw)
        return result if isinstance(result, list) else []
    except json.JSONDecodeError:
        pass
    # Try trimming trailing garbage after last ]
    try:
        trimmed = raw[:raw.rindex("]") + 1]
        result  = json.loads(trimmed)
        return result if isinstance(result, list) else []
    except Exception:
        return []


# ── Bright Data MCP Agent (Primary Path) ─────────────────────────────────────
async def _run_mcp_agent(competitor: str) -> tuple[bool, list]:
    """
    Connect to Bright Data MCP Server via SSE.
    Tools used:
      - search_engine         (Google SERP)
      - web_data_reddit_posts (structured Reddit)
      - scrape_as_markdown    (G2 + Trustpilot)
    """
    comp = competitor.strip()

    try:
        from mcp import ClientSession
        from mcp.client.sse import sse_client
    except ImportError:
        print("[MCP] mcp library not installed — falling back.")
        return False, []

    mcp_url = (
        f"https://mcp.brightdata.com/sse"
        f"?token={BRIGHT_DATA_API_KEY}"
        f"&pro=1"
        f"&unlocker={os.getenv('BRIGHT_DATA_UNLOCKER_ZONE', 'web_unlocker1')}"
        f"&browser={os.getenv('BRIGHT_DATA_SB_ZONE', 'scraping_browser1')}"
    )

    mcp_content: list[str] = []

    try:
        async with sse_client(mcp_url) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                print("[MCP] Connected to Bright Data MCP Server.")

                # ── Tool 1: search_engine ─────────────────────────────────
                search_queries = [
                    f'site:reddit.com "{comp}" alternatives OR switching OR frustrated 2025 OR 2026',
                    f'"{comp}" "switched to" OR "migrated from" OR "replaced" company 2025 OR 2026',
                    f'site:news.ycombinator.com "{comp}" alternative OR pricing OR cancel',
                ]
                for q in search_queries:
                    try:
                        result = await session.call_tool(
                            "search_engine",
                            {"query": q, "engine": "google"},
                        )
                        for block in result.content:
                            text = getattr(block, "text", "")
                            if text and len(text) > 50:
                                mcp_content.append(f"Search: {q}\n{text[:2500]}")
                        print(f"[MCP] search_engine OK: {q[:60]}")
                    except Exception as e:
                        print(f"[MCP] search_engine error: {e}")

                # ── Tool 2: web_data_reddit_posts ─────────────────────────
                reddit_url = (
                    f"https://www.reddit.com/search/"
                    f"?q={comp.replace(' ', '+')}+alternatives+OR+switching&sort=new"
                )
                try:
                    result = await session.call_tool(
                        "web_data_reddit_posts",
                        {"url": reddit_url},
                    )
                    for block in result.content:
                        text = getattr(block, "text", "")
                        if text and len(text) > 50:
                            mcp_content.append(f"Reddit structured data:\n{text[:2500]}")
                    print("[MCP] web_data_reddit_posts OK")
                except Exception as e:
                    print(f"[MCP] web_data_reddit_posts error: {e}")

                # ── Tool 3: scrape_as_markdown ────────────────────────────
                review_urls = [
                    f"https://www.g2.com/products/{comp.lower().replace(' ', '-')}/reviews",
                    f"https://www.trustpilot.com/review/www.{comp.lower().replace(' ', '')}.com",
                ]
                for url in review_urls:
                    try:
                        result = await session.call_tool(
                            "scrape_as_markdown",
                            {"url": url},
                        )
                        for block in result.content:
                            text = getattr(block, "text", "")
                            if text and len(text) > 200:
                                mcp_content.append(f"Scraped {url}:\n{text[:3000]}")
                        print(f"[MCP] scrape_as_markdown OK: {url}")
                    except Exception as e:
                        print(f"[MCP] scrape_as_markdown error: {e}")

    except Exception as e:
        print(f"[MCP] SSE connection error: {e}")
        return False, []

    if not mcp_content:
        print("[MCP] No content retrieved — falling back.")
        return False, []

    # ── Extract signals via Claude Opus ──────────────────────────────────────
    combined = "\n\n".join(mcp_content)

    prompt = f"""You are Vanta, a B2B sales intelligence agent. Extract actionable sales signals from this web data about companies dissatisfied with '{comp}'.

Data:
{combined}

For EACH signal, extract:
1. company_name — MANDATORY: Create a REALISTIC, PROFESSIONAL company name. BANNED WORDS: "Unknown", "Anonymous", "Not identified", "poster", "user". Use context clues:
   - Budget mentioned ($19k/year) → "Mid-Market Technology Company"
   - Database size (15,000 contacts) → "Healthcare Provider with 15K Database"
   - Industry clear (clinic, SaaS, agency) → e.g. "Healthcare Clinic", "Marketing Agency"
   - Multiple tools (SFDC + HubSpot) → "Enterprise Sales Organization"
   - Default → "Mid-Market [Industry] Company"

2. company_size — Infer from context: "10-50", "50-200", "200-1000", "1000+", or "SMB"
3. industry — "SaaS", "Healthcare", "E-commerce", "Fintech", "Marketing Agency", "Technology"
4. intent_score — 1-10 (9-10: actively switching, 7-8: strong complaints, 5-6: moderate frustration)
5. source — "Reddit", "G2", "Trustpilot", "HackerNews"
6. source_details — Thread title or subreddit name
7. pain_point — "Pricing", "Support Issues", "Feature Gaps", "Reliability", "UX Complexity"
8. raw_text — Direct quote from the data

RULES:
- Return ONLY a JSON array: [{{...}}, {{...}}]
- No markdown, no explanations
- NEVER use "Unknown", "Anonymous", "Not identified", "poster", "user" in company_name
- Extract ALL signals — minimum 1 if any negative sentiment exists

Example:
[{{"company_name":"Mid-Market SaaS Company","company_size":"50-200","industry":"SaaS","intent_score":8,"source":"Reddit","source_details":"r/CRM pricing thread","pain_point":"Pricing","raw_text":"We spend over $19k a year on {comp}. Alternatives?"}}]"""

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                "https://api.aimlapi.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {AIML_API_KEY}",
                    "Content-Type":  "application/json",
                },
                json={
                    "model":       AIML_MODEL,
                    "messages":    [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                },
            )
            if resp.status_code == 200:
                raw     = resp.json()["choices"][0]["message"]["content"].strip()
                signals = _safe_parse_signals(raw)
                if signals:
                    print(f"[MCP] Extracted {len(signals)} signals.")
                    return True, signals
                print("[MCP] No signals parsed from response.")
            else:
                print(f"[MCP] AIML API error: {resp.status_code}")
    except Exception as e:
        print(f"[MCP] Extraction error: {e}")

    return False, []


# ── Multi-source search query builder ────────────────────────────────────────
def build_search_queries(competitor: str) -> list[str]:
    c = competitor.strip()
    return [
        f'site:reddit.com "{c}" switching OR alternatives OR "too expensive" OR "looking for"',
        f'site:reddit.com "{c}" frustrated OR "cancel" OR "bad support" OR "price increase"',
        f'"{c}" reviews "switched to" OR "moved away" OR "migrated from" site:g2.com',
        f'"{c}" "not recommended" OR "disappointed" OR "overpriced" site:trustpilot.com',
        f'"{c}" alternative OR switching site:news.ycombinator.com',
        f'"{c}" "we switched" OR "we migrated" OR "replaced {c}" company 2024 OR 2025 OR 2026',
        f'"{c}" pricing complaints OR "price hike" OR "too expensive" company blog OR forum',
        f'"{c}" "looking for alternative" OR "evaluating alternatives" site:linkedin.com',
    ]


# ── Core Agent Loop ───────────────────────────────────────────────────────────
async def run_agent_stream(competitor: str) -> AsyncGenerator[dict, None]:
    """
    Autonomous GTM scanning agent — streams real-time events via SSE.

    Primary path:  Bright Data MCP Server → Claude Opus (AIML API)
    Fallback path: SERP API + Web Unlocker + Scraping Browser → Claude Opus
    """
    comp = competitor.strip()

    yield {"type": "thinking", "message": f"Initialising competitive scan for {comp}..."}

    # ── Step 1: Bright Data MCP Server (primary path) ─────────────────────────
    mcp_success = False
    signals: list = []

    if BRIGHT_DATA_API_KEY and AIML_API_KEY:
        yield {"type": "thinking", "message": "Connecting to Bright Data MCP Server via SSE transport..."}
        try:
            mcp_success, signals = await asyncio.wait_for(
                _run_mcp_agent(comp),
                timeout=120  # 2 minute max for MCP — prevents infinite hang
            )
        except asyncio.TimeoutError:
            print("[MCP] Timed out after 120s — falling back to manual pipeline.")
            mcp_success = False
            signals = []
        if mcp_success:
            for sig in signals:
                yield {
                    "type":    "thinking",
                    "message": f"MCP signal: {sig.get('company_name')} — {sig.get('pain_point')}",
                }
            yield {"type": "thinking", "message": f"MCP path complete: {len(signals)} signals extracted."}

    # ── Step 2: Fallback — SERP + Web Unlocker + Scraping Browser ────────────
    if not mcp_success:
        yield {"type": "thinking", "message": "MCP unavailable. Running manual multi-source scraper pipeline..."}

        queries        = build_search_queries(comp)
        urls_to_scrape: list[str] = []
        serp_snippets:  list[str] = []

        # SERP API — collect URLs AND snippets
        for q in queries:
            yield {"type": "thinking",  "message": f"SERP search: {q}"}
            yield {"type": "tool_call", "tool": "search_web", "query": q}
            try:
                res = await search_web_async(q, num=8)
                if res.get("success") and res.get("results"):
                    results = res["results"]
                    yield {
                        "type":  "search_result",
                        "count": len(results),
                        "urls":  [r["url"] for r in results],
                    }
                    for r in results:
                        snippet = r.get("snippet", "").strip()
                        title   = r.get("title", "").strip()
                        url     = r.get("url", "")
                        if snippet and len(snippet) > 30:
                            serp_snippets.append(
                                f"Source: {url}\nTitle: {title}\nSnippet: {snippet}"
                            )
                        # Queue non-JS URLs for full scraping
                        if url not in urls_to_scrape and len(urls_to_scrape) < 8:
                            is_blocked = any(
                                d in url.lower()
                                for d in ["g2.com", "glassdoor.com", "trustpilot.com",
                                          "capterra.com", "twitter.com", "x.com", "reddit.com"]
                            )
                            if not is_blocked:
                                urls_to_scrape.append(url)
                else:
                    yield {"type": "search_result", "count": 0, "urls": []}
            except Exception as e:
                print(f"[SERP] Error for '{q}': {e}")

        scraped_data: list[str] = []

        # SERP snippets as primary data source
        if serp_snippets:
            scraped_data.append(
                "=== SERP SEARCH SNIPPETS (Google via Bright Data SERP API) ===\n"
                + "\n\n".join(serp_snippets[:30])
            )

        # Scrape non-blocked URLs for full content
        for url in urls_to_scrape[:4]:
            yield {"type": "thinking",  "message": f"Scraping: {url}"}
            yield {"type": "tool_call", "tool": "scrape_url", "url": url}
            try:
                res     = scrape_url(url)
                content = res.get("content", "") if res.get("success") else ""
                if content and len(content) > 200:
                    yield {
                        "type":    "scrape_result",
                        "chars":   len(content),
                        "url":     url,
                        "preview": content[:200],
                    }
                    scraped_data.append(f"--- Full page: {url} ---\n{content[:4000]}")
                else:
                    yield {"type": "scrape_result", "chars": 0, "url": url, "preview": ""}
            except Exception as e:
                print(f"[Scrape] Error for {url}: {e}")

        # Scraping Browser for JS-heavy review sites (G2, Trustpilot)
        review_urls: list[str] = []
        for q in queries[:4]:
            try:
                res = await search_web_async(q, num=3)
                for r in res.get("results", []):
                    url = r.get("url", "")
                    if any(d in url.lower() for d in ["g2.com", "trustpilot.com"]):
                        if url not in review_urls:
                            review_urls.append(url)
            except Exception:
                pass

        for url in review_urls[:2]:
            yield {"type": "thinking",  "message": f"Scraping JS site: {url}"}
            yield {"type": "tool_call", "tool": "scrape_url", "url": url}
            try:
                content = await scrape_js_site(url)
                if content and len(content) > 200:
                    yield {
                        "type":    "scrape_result",
                        "chars":   len(content),
                        "url":     url,
                        "preview": content[:200],
                    }
                    scraped_data.append(f"--- JS Site: {url} ---\n{content[:4000]}")
                else:
                    yield {"type": "scrape_result", "chars": 0, "url": url, "preview": ""}
            except Exception as e:
                print(f"[JS Scrape] Error for {url}: {e}")

        if not scraped_data:
            yield {"type": "thinking", "message": "No data collected — cannot run signal analysis."}
            yield {"type": "signals_ready", "signals": []}
            yield {"type": "complete",       "total_signals": 0}
            return

        yield {"type": "thinking", "message": f"Analysing {len(scraped_data)} sources with {AIML_MODEL}..."}

        combined = "\n\n".join(scraped_data)

        extraction_prompt = f"""You are Vanta, an AI agent identifying B2B sales opportunities from competitor dissatisfaction signals.

Analyse the following web intelligence data and identify companies or personas that are dissatisfied with '{comp}' or actively planning to switch.

Data collected:
{combined}

For each signal found, extract:
1. company_name — MANDATORY: Create a REALISTIC, PROFESSIONAL company name. BANNED WORDS: "Unknown", "Anonymous", "Not identified", "poster", "user". Use context clues:
   - Budget ($19k/year) → "Mid-Market Technology Company"
   - Database size (15,000 contacts) → "Healthcare Provider with 15K Database"
   - Industry (clinic, SaaS, agency) → e.g. "Healthcare Clinic", "Marketing Agency"
   - Multiple tools (SFDC + HubSpot) → "Enterprise Sales Organization"
   - Default → "Mid-Market [Industry] Company"

2. company_size — Infer from budget/database/context:
   - $5k-$20k budget → "50-200 employees"
   - $20k-$100k budget → "200-1000 employees"
   - $100k+ budget → "Enterprise (1000+)"
   - Default → "SMB"

3. industry — "SaaS", "Healthcare", "E-commerce", "Fintech", "Marketing Agency", "Technology", "Retail"

4. intent_score — Integer 1-10:
   - 9-10: Actively switching / stated "we are leaving"
   - 7-8:  Strong complaints, asking for alternatives
   - 5-6:  Moderate frustration, feature gaps
   - 3-4:  General dissatisfaction

5. source — "Reddit", "G2", "Trustpilot", "HackerNews"
6. source_details — Thread title, review title, or subreddit
7. pain_point — "Pricing", "Support Issues", "Feature Gaps", "Reliability", "UX Complexity", "Vendor Lock-in"
8. raw_text — Direct quote or close paraphrase

CRITICAL RULES:
- Return ONLY a JSON array: [{{...}}, {{...}}]
- No markdown, no explanations, just the array
- NEVER use "Unknown", "Anonymous", "Not identified", "poster", "user" in company_name
- Extract ALL signals — minimum 1 if any negative sentiment about {comp} exists

Examples:
[
  {{"company_name":"Mid-Market SaaS Company","company_size":"50-200 employees","industry":"SaaS","intent_score":8,"source":"Reddit","source_details":"r/CRM pricing discussion","pain_point":"Pricing","raw_text":"We spend over $19k a year on {comp}. Alternatives?"}},
  {{"company_name":"Healthcare Clinic with 15K Patient Database","company_size":"50-200 employees","industry":"Healthcare","intent_score":6,"source":"Reddit","source_details":"r/Emailmarketing alternatives","pain_point":"Feature Gaps","raw_text":"Our clinic is looking for the best way to send emails to our database of 15,000 contacts..."}},
  {{"company_name":"Enterprise Sales Organization","company_size":"200-1000 employees","industry":"Technology","intent_score":7,"source":"Reddit","source_details":"r/revops discussion","pain_point":"Pricing","raw_text":"We're managing our sales process in SFDC, and {comp} prices have skyrocketed..."}}
]"""

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    "https://api.aimlapi.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {AIML_API_KEY}",
                        "Content-Type":  "application/json",
                    },
                    json={
                        "model":       AIML_MODEL,
                        "messages":    [{"role": "user", "content": extraction_prompt}],
                        "temperature": 0.3,
                    },
                )
                if resp.status_code == 200:
                    raw     = resp.json()["choices"][0]["message"]["content"].strip()
                    # Strip markdown code fences if present
                    if raw.startswith("```"):
                        lines = raw.splitlines()
                        lines = lines[1:] if lines[0].startswith("```") else lines
                        lines = lines[:-1] if lines and lines[-1].startswith("```") else lines
                        raw   = "\n".join(lines).strip()
                    signals = _safe_parse_signals(raw)
                    if not signals:
                        print(f"[Extraction] No signals parsed. Raw snippet: {raw[:200]}")
                        yield {"type": "error", "message": "Signal extraction returned no results."}
                        yield {"type": "signals_ready", "signals": []}
                        yield {"type": "complete",       "total_signals": 0}
                        return
                else:
                    yield {"type": "error", "message": f"AIML API returned {resp.status_code}"}
                    return
        except Exception as e:
            yield {"type": "error", "message": f"Signal extraction failed: {e}"}
            return

    if not isinstance(signals, list):
        signals = []

    yield {"type": "signals_ready", "signals": signals}
    yield {"type": "complete",       "total_signals": len(signals)}


# ── Battle Card Generator ─────────────────────────────────────────────────────
async def generate_battlecard(signal: dict, competitor: str) -> dict:
    """
    Generate a full GTM battle card using Claude Opus via AIML API.
    Includes: summary, talking points, outbound email, objection handling.
    """
    prompt = f"""You are a senior B2B sales strategist. Generate a competitive battle card to win the account '{signal['company_name']}'.

Context:
- They currently use: {competitor}
- Pain point: {signal['pain_point']}
- Evidence: {signal['raw_text']}
- Company size: {signal.get('company_size', 'Unknown')}
- Industry: {signal.get('industry', 'Unknown')}

Generate a complete battle card with:
1. summary — 2-3 sentence account vulnerability summary
2. talking_points — exactly 4 specific tactical talking points addressing their exact pain with {competitor}
3. email_pitch — personalized cold outbound email (subject + body)
4. objection_handling — one likely objection and a sharp response

Return ONLY this JSON object (no markdown):
{{
  "summary": "...",
  "talking_points": ["...", "...", "...", "..."],
  "email_pitch": {{
    "subject": "...",
    "body": "..."
  }},
  "objection_handling": {{
    "objection": "...",
    "response": "..."
  }}
}}"""

    try:
        async with httpx.AsyncClient(timeout=45) as client:
            resp = await client.post(
                "https://api.aimlapi.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {AIML_API_KEY}",
                    "Content-Type":  "application/json",
                },
                json={
                    "model":       AIML_MODEL,
                    "messages":    [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                },
            )
            if resp.status_code == 200:
                raw = resp.json()["choices"][0]["message"]["content"].strip()
                if raw.startswith("```"):
                    lines = raw.splitlines()
                    lines = lines[1:] if lines[0].startswith("```") else lines
                    lines = lines[:-1] if lines and lines[-1].startswith("```") else lines
                    raw   = "\n".join(lines).strip()
                raw = _extract_json_object(raw)
                return json.loads(raw)
    except Exception as e:
        print(f"[Battlecard] Error: {e}")

    # Fallback battlecard
    return {
        "summary": (
            f"{signal['company_name']} is experiencing {signal.get('pain_point', 'dissatisfaction')} "
            f"with {competitor}. High switching intent detected."
        ),
        "talking_points": [
            f"Directly address their {signal.get('pain_point', 'pain')} with {competitor}.",
            "Offer a structured, zero-downtime migration plan.",
            "Demonstrate 30%+ TCO reduction with a live cost comparison.",
            "Dedicated onboarding CSM and 90-day success guarantee.",
        ],
        "email_pitch": {
            "subject": f"Helping {signal['company_name']} move beyond {competitor}",
            "body": (
                f"Hi,\n\nWe noticed signals suggesting {signal['company_name']} may be "
                f"evaluating alternatives to {competitor}.\n\n"
                f"We specialise in seamless migrations — typically completed in under 30 days "
                f"with zero data loss.\n\n"
                f"Would you be open to a 15-minute call this week?\n\nBest regards"
            ),
        },
        "objection_handling": {
            "objection": "Migration is too risky and time-consuming.",
            "response": (
                "We handle all data mapping and migration engineering at no extra cost, "
                "with a guaranteed rollback option if anything goes wrong."
            ),
        },
    }


# ── Lead Enrichment ───────────────────────────────────────────────────────────
async def enrich_lead(company_name: str, industry: str) -> list:
    """
    Smart lead enrichment strategy:

    Since signals come from anonymous Reddit/HackerNews posts, we don't have
    real company names. Instead, we use Bright Data SERP to find REAL companies
    in the same industry that are known users of the competitor — these are the
    actual prospects to target.

    Pipeline:
      1. Bright Data SERP — find real companies in this industry using competitor
      2. Bright Data SERP — find their decision makers on LinkedIn
      3. Claude Opus — extract and structure contact info
    """
    safe_domain = re.sub(r"[^a-z0-9]", "", company_name.lower())
    collected: list[str] = []

    # Detect if this is a generic inferred name (not a real company)
    generic_keywords = [
        "mid-market", "enterprise", "saas company", "healthcare clinic",
        "marketing agency", "technology company", "organization", "startup",
        "provider", "database", "team", "business", "company"
    ]
    is_generic = any(kw in company_name.lower() for kw in generic_keywords)

    if is_generic:
        # Strategy: Find REAL companies in this industry that use the competitor
        # We search for actual companies, not the generic inferred name
        print(f"[Enrichment] Generic company name detected — searching for real {industry} prospects...")

        discovery_queries = [
            f'"{industry}" company uses OR "powered by" OR "built on" CRM site:linkedin.com',
            f'"{industry}" startup OR "scale-up" CRM migration OR "switching CRM" 2025',
            f'site:linkedin.com "{industry}" "VP of Sales" OR "Head of Revenue" OR "CTO"',
        ]

        for q in discovery_queries:
            try:
                res = await search_web_async(q, num=6)
                if res.get("success") and res.get("results"):
                    for r in res["results"]:
                        snippet = r.get("snippet", "").strip()
                        title   = r.get("title", "").strip()
                        url     = r.get("url", "")
                        if snippet and len(snippet) > 20:
                            collected.append(f"Source: {url}\nTitle: {title}\nSnippet: {snippet}")
            except Exception as e:
                print(f"[Enrichment] SERP error: {e}")

        if collected:
            combined = "\n\n".join(collected)
            prompt = f"""You are a B2B sales intelligence agent. From this web data, identify 2-3 REAL decision makers at {industry} companies who would be good prospects.

Web data:
{combined}

For each real person found, extract:
- name: Their actual full name from the data
- title: Their actual job title
- email: Construct as firstname.lastname@company.com (use their real company domain)
- linkedin: Their LinkedIn URL if found, otherwise construct from name

RULES:
- Only return REAL people with REAL names found in the data
- If no real contacts found, return search guidance instead
- Return ONLY a JSON array: [{{"name":"...","title":"...","email":"...","linkedin":"..."}}]
- No markdown, no explanations

Example:
[{{"name":"Sarah Chen","title":"VP of Sales","email":"sarah.chen@acmecorp.com","linkedin":"https://linkedin.com/in/sarahchen"}}]"""

            combined = "\n\n".join(collected)
            prompt = f"""You are a B2B sales intelligence agent. From this web data, identify 2-3 REAL decision makers at {industry} companies who would be good prospects.

Web data:
{combined}

For each real person found, extract:
- name: Their actual full name from the data
- title: Their actual job title
- email: Construct as firstname.lastname@company.com (use their real company domain)
- linkedin: Their LinkedIn URL if found, otherwise construct from name

RULES:
- Only return REAL people with REAL names found in the data
- If no real contacts found, return guidance on how to search for them
- Return ONLY a JSON array: [{{"name":"...","title":"...","email":"...","linkedin":"..."}}]
- No markdown, no explanations

Example:
[{{"name":"Sarah Chen","title":"VP of Sales","email":"sarah.chen@acmecorp.com","linkedin":"https://linkedin.com/in/sarahchen"}}]"""

            try:
                async with httpx.AsyncClient(timeout=45) as client:
                    resp = await client.post(
                        "https://api.aimlapi.com/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {AIML_API_KEY}",
                            "Content-Type":  "application/json",
                        },
                        json={
                            "model":       AIML_MODEL,
                            "messages":    [{"role": "user", "content": prompt}],
                            "temperature": 0.3,
                        },
                    )
                    if resp.status_code == 200:
                        raw = resp.json()["choices"][0]["message"]["content"].strip()
                        if raw.startswith("```"):
                            lines = raw.splitlines()
                            lines = lines[1:] if lines[0].startswith("```") else lines
                            lines = lines[:-1] if lines and lines[-1].startswith("```") else lines
                            raw   = "\n".join(lines).strip()
                        raw = _extract_json_array(raw)
                        contacts = json.loads(raw)
                        if isinstance(contacts, list) and len(contacts) > 0:
                            return contacts
            except Exception as e:
                print(f"[Enrichment] Error: {e}")

        # If no real contacts found, return search guidance
        return [
            {
                "name": f"Search LinkedIn for '{industry} VP of Sales'",
                "title": "Decision Maker",
                "email": f"Use LinkedIn Sales Navigator to find contacts at {industry} companies",
                "linkedin": f"https://www.linkedin.com/search/results/people/?keywords={industry.replace(' ', '%20')}%20VP%20Sales"
            }
        ]

    else:
        # Strategy: Try to find real contacts at the specific company
        print(f"[Enrichment] Searching for contacts at {company_name}...")

        contact_queries = [
            f'site:linkedin.com "{company_name}" "VP of Sales" OR "Head of Revenue" OR "CTO"',
            f'"{company_name}" contact OR email OR "reach out" site:linkedin.com',
            f'site:linkedin.com/in "{company_name}" decision maker OR executive',
        ]

        for q in contact_queries:
            try:
                res = await search_web_async(q, num=5)
                if res.get("success") and res.get("results"):
                    for r in res["results"]:
                        snippet = r.get("snippet", "").strip()
                        title   = r.get("title", "").strip()
                        url     = r.get("url", "")
                        if snippet and len(snippet) > 20:
                            collected.append(f"Source: {url}\nTitle: {title}\nSnippet: {snippet}")
            except Exception as e:
                print(f"[Enrichment] SERP error: {e}")

        if not collected:
            # No data found — return search guidance
            safe_name = company_name.replace(" ", "%20")
            return [
                {
                    "name": f"Search LinkedIn for contacts at {company_name}",
                    "title": "Decision Maker",
                    "email": f"Use LinkedIn Sales Navigator or company website",
                    "linkedin": f"https://www.linkedin.com/search/results/people/?keywords={safe_name}"
                }
            ]

        combined = "\n\n".join(collected)
        prompt = f"""You are a B2B sales intelligence agent. From this web data, identify 1-2 REAL decision makers at {company_name}.

Web data:
{combined}

For each real person found, extract:
- name: Their actual full name from the data
- title: Their actual job title
- email: Construct as firstname.lastname@{safe_domain}.com
- linkedin: Their LinkedIn URL if found, otherwise construct from name

RULES:
- Only REAL names found in the data — no invented names
- If a LinkedIn profile is found, extract the person's name and company
- Return ONLY a JSON array

[{{"name":"...","title":"...","email":"...","linkedin":"..."}}]"""

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    "https://api.aimlapi.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {AIML_API_KEY}",
                        "Content-Type":  "application/json",
                    },
                    json={
                        "model":       AIML_MODEL,
                        "messages":    [{"role": "user", "content": prompt}],
                        "temperature": 0.2,
                    },
                )
                if resp.status_code == 200:
                    raw      = resp.json()["choices"][0]["message"]["content"].strip()
                    if raw.startswith("`"):
                        lines = raw.splitlines()
                        lines = lines[1:] if lines[0].startswith("`") else lines
                        lines = lines[:-1] if lines and lines[-1].startswith("`") else lines
                        raw   = "\n".join(lines).strip()
                    contacts = _safe_parse_signals(raw)
                    if contacts:
                        print(f"[Enrichment] Found {len(contacts)} real contacts for {company_name}")
                        return contacts
        except Exception as e:
            print(f"[Enrichment] Claude error: {e}")

    # ── Fallback ──────────────────────────────────────────────────────────────
    print(f"[Enrichment] Returning search links for manual lookup")
    industry_clean = re.sub(r"[^a-z0-9 ]", "", industry.lower()).strip().replace(" ", "-")
    return [
        {
            "name":     f"Search {industry} Decision Makers",
            "title":    "LinkedIn Sales Navigator",
            "email":    "Use LinkedIn to find contacts",
            "linkedin": f"https://www.linkedin.com/search/results/people/?keywords={industry_clean}+VP+Sales+OR+CTO+OR+CEO",
        },
        {
            "name":     f"Search {industry} Executives",
            "title":    "Apollo.io Prospect Search",
            "email":    "Use Apollo.io for email lookup",
            "linkedin": f"https://app.apollo.io/#/people?personTitles[]=CEO&personTitles[]=VP%20of%20Sales&q_organization_industry_tag_ids[]={industry_clean}",
        },
    ]
