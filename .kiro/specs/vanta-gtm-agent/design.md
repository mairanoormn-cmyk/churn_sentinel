# VANTA — System Design

## Architecture Overview

VANTA is a full-stack autonomous AI agent with three main layers:
1. **React Frontend** — Real-time dashboard with SSE streaming
2. **FastAPI Backend** — Async API server with PostgreSQL persistence
3. **AI Agent Layer** — Bright Data + Claude Opus intelligence pipeline

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   REACT FRONTEND (Vite)                     │
│  Home | Dashboard | HowItWorks | About | Navbar | Footer    │
│                                                             │
│  Components:                                                │
│  ├── LandingPanel (search + vulnerability table)            │
│  ├── ScanWorkspace (real-time agent activity)               │
│  ├── SignalsPanel (extracted leads)                         │
│  ├── Drawer (signal detail + battle card)                   │
│  ├── VulnerabilityRadar (Recharts 5D radar)                 │
│  └── ROIPanel (pipeline metrics)                            │
└────────────────────────────┬────────────────────────────────┘
                             │ POST /api/scan (SSE)
                             │ GET  /api/signals
                             │ POST /api/battlecard
                             │ POST /api/push-crm
                             │ GET  /api/competitor-stats
                             │ POST /api/enrich
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND                          │
│  main.py                                                    │
│  ├── POST /api/scan      → SSE StreamingResponse            │
│  ├── GET  /api/signals   → List[Signal]                     │
│  ├── POST /api/battlecard → BattleCard dict                 │
│  ├── POST /api/push-crm  → CRM push result                  │
│  ├── GET  /api/competitor-stats → Radar data                │
│  └── POST /api/enrich    → Contact list                     │
│                                                             │
│  database.py                                                │
│  ├── scan_jobs table                                        │
│  └── signals table                                          │
└────────────────────────────┬────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
    ┌──────────────────┐         ┌──────────────────┐
    │  Agent           │         │  PostgreSQL /    │
    │  Orchestrator    │         │  Supabase        │
    │  (ai-llm/)       │         │                  │
    └────────┬─────────┘         └──────────────────┘
             │
    ┌────────┴──────────────────────────────┐
    ▼                                       ▼
PRIMARY PATH                        FALLBACK PATH
Bright Data MCP Server              Manual Pipeline
├── search_engine                   ├── SERP API (8 queries)
├── web_data_reddit_posts           ├── Web Unlocker (4 URLs)
└── scrape_as_markdown              └── Scraping Browser (2 URLs)
         │                                   │
         └──────────────┬────────────────────┘
                        ▼
           ┌────────────────────────┐
           │  Claude Opus           │
           │  via AIML API          │
           │  ├── Signal extraction │
           │  ├── Intent scoring    │
           │  ├── Battle card gen   │
           │  └── Lead enrichment   │
           └────────────┬───────────┘
                        ▼
           ┌────────────────────────┐
           │  HubSpot CRM           │
           │  (optional)            │
           └────────────────────────┘
```

---

## Component Design

### 1. Agent Orchestrator (`ai-llm/agent_orchestrator.py`)

**Primary Function:** `run_agent_stream(competitor) → AsyncGenerator[dict]`

**Flow:**
```
1. Try MCP Server (timeout: 120s)
   ├── search_engine × 3 queries
   ├── web_data_reddit_posts × 1
   └── scrape_as_markdown × 2 (G2 + Trustpilot)
   
2. If MCP fails → Fallback Pipeline
   ├── SERP API × 8 queries (build_search_queries)
   ├── Web Unlocker × 4 non-blocked URLs
   └── Scraping Browser × 2 review site URLs
   
3. Claude Opus extraction
   ├── Input: combined scraped content
   ├── Output: JSON array of signals
   └── Fallback: empty array with error event

4. Yield SSE events throughout
```

**SSE Event Types:**
| Event | When | Payload |
|-------|------|---------|
| `job_created` | Scan starts | `{job_id, competitor}` |
| `thinking` | Status update | `{message}` |
| `tool_call` | Before tool use | `{tool, query/url}` |
| `search_result` | After SERP | `{count, urls}` |
| `scrape_result` | After scrape | `{chars, url, preview}` |
| `signals_ready` | Extraction done | `{signals[]}` |
| `complete` | Scan finished | `{total_signals}` |
| `error` | Any failure | `{message}` |
| `stream_end` | Stream closes | `{}` |

---

### 2. Bright Data Utils (`bright-data/bright_data_utils.py`)

**Three tools, one endpoint:**
```
POST https://api.brightdata.com/request
Authorization: Bearer {BRIGHT_DATA_API_KEY}
```

| Function | Zone | Purpose | Async |
|----------|------|---------|-------|
| `search_web(query, num=8)` | `serp_api2` | Google SERP | ❌ (sync) |
| `scrape_url(url)` | `web_unlocker1` | General pages | ❌ (sync) |
| `scrape_js_site(url)` | `scraping_browser1` | JS-heavy sites | ✅ (async) |
| `search_web_async(query)` | `serp_api2` | Async wrapper | ✅ (async) |

**Fallback Chain:**
```
scrape_js_site(url)
  └── Try Scraping Browser
      └── If fails → Try Web Unlocker
          └── If fails → Return ""
```

---

### 3. Database Schema (`backend/database.py`)

**Table: `scan_jobs`**
```sql
CREATE TABLE scan_jobs (
    id TEXT PRIMARY KEY,          -- UUID
    competitor TEXT NOT NULL,
    status TEXT NOT NULL,         -- PENDING|RUNNING|SCORING|COMPLETED|FAILED
    progress INTEGER DEFAULT 0,   -- 0-100
    created_at TEXT NOT NULL
);
```

**Table: `signals`**
```sql
CREATE TABLE signals (
    id SERIAL PRIMARY KEY,
    job_id TEXT,                  -- FK → scan_jobs.id
    company_name TEXT NOT NULL,
    company_size TEXT,            -- "50-200", "200-1000", etc.
    industry TEXT,                -- "SaaS", "Healthcare", etc.
    intent_score INTEGER,         -- 1-10
    source TEXT,                  -- "Reddit", "G2", etc.
    source_url TEXT,
    source_details TEXT,
    pain_point TEXT,              -- "Pricing", "Support Issues", etc.
    raw_text TEXT,
    battlecard TEXT,              -- JSON string
    is_pushed INTEGER DEFAULT 0   -- 0 or 1
);
```

---

### 4. FastAPI Backend (`backend/main.py`)

**Request Models:**
```python
ScanRequest:      { competitor: str }
BattlecardRequest: { signal_id, competitor?, company_name?, pain_point?, ... }
PushRequest:      { signal_id, crm_type?, company_name?, ... }
EnrichRequest:    { company_name, industry? }
```

**Key Design Decisions:**
- SSE via `StreamingResponse` with `text/event-stream` media type
- Inline signal data support (temp IDs for pre-DB signals)
- HubSpot sandbox mode when no token configured
- Competitor stats computed with live SQL aggregation

---

### 5. React Frontend (`frontend/src/`)

**Routing:**
```
/ → Home (landing page)
/dashboard → Dashboard (main app)
/how-it-works → HowItWorks
/about → About
```

**Dashboard State Machine:**
```
'landing' view
    └── onSearch(competitor)
        └── 'scan' view (ScanWorkspace)
            ├── runScan() → SSE stream
            ├── signals[] → SignalsPanel
            ├── selected signal → Drawer
            │   ├── generate() → battlecard
            │   ├── push() → CRM
            │   └── enrich() → contacts
            └── onBack() → 'landing' view
```

**Signal ID Strategy:**
```
During scan:  temp_1, temp_2, ... (from SSE signals_ready)
After scan:   Real DB IDs (fetched via /api/signals?job_id=...)
Drawer uses:  Inline data for temp IDs, DB ID for real IDs
```

---

## Data Flow: Full Scan Lifecycle

```
1. User enters "Salesforce" → POST /api/scan
2. Backend creates scan_job (UUID) in DB
3. Backend yields: {type: "job_created", job_id: "abc-123"}
4. Agent tries MCP Server (120s timeout)
   a. If success: extract signals via Claude Opus
   b. If fail: run SERP + scraping fallback
5. Signals extracted → saved to DB → yield signals_ready
6. Frontend receives signals → displays in SignalsPanel
7. Scan completes → yield complete → update job status
8. Frontend fetches real DB signals (replaces temp IDs)
9. User clicks signal → Drawer opens
10. User clicks "Generate Battle Card" → POST /api/battlecard
11. Claude Opus generates → returns JSON → displayed in Drawer
12. User clicks "Push to CRM" → POST /api/push-crm
13. HubSpot API called (or sandbox) → success toast shown
```

---

## Technology Decisions

### Why FastAPI?
- Native async/await support for SSE streaming
- Pydantic models for request validation
- Auto-generated Swagger docs
- Fast performance for concurrent requests

### Why SSE over WebSocket?
- One-directional (server → client) is sufficient
- Simpler implementation
- Better browser compatibility
- No connection upgrade needed

### Why PostgreSQL?
- Structured data (signals, jobs)
- Complex queries for competitor stats
- Supabase compatibility for cloud hosting
- ACID compliance for data integrity

### Why Recharts?
- Already in React ecosystem
- RadarChart component built-in
- Responsive container support
- Customizable tooltips and styling

### Why Dual-Path Architecture?
- MCP Server is primary (most reliable, structured data)
- Fallback ensures scan always completes
- Graceful degradation without user impact
- Maximizes data collection coverage

---

## Security Design

- API keys in `.env` (never in code or git)
- CORS restricted to known origins
- No secrets in frontend bundle
- Input validation via Pydantic
- SQL parameterized queries (psycopg2)
- HubSpot token optional (sandbox fallback)

---

## Deployment Architecture

```
Production:
├── Backend → Railway / Render (Python)
├── Frontend → Vercel / Netlify (Static)
└── Database → Supabase (PostgreSQL)

Environment Variables:
├── Backend: BRIGHT_DATA_API_KEY, AIML_API_KEY, DATABASE_URL, HUBSPOT_ACCESS_TOKEN
└── Frontend: VITE_API_URL
```
