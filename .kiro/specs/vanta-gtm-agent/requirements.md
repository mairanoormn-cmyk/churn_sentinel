# VANTA — Requirements

## Project Overview
VANTA is an autonomous GTM (Go-To-Market) intelligence agent that scans the open web for competitor dissatisfaction signals, scores intent with AI, generates personalized battle cards, and pushes qualified leads directly into HubSpot CRM.

**Hackathon:** Web Data UNLOCKED — Bright Data AI Agents Hackathon (May 2026)  
**Track:** GTM Intelligence  
**Status:** ✅ Complete

---

## Functional Requirements

### REQ-1: Competitor Signal Detection
- **As a** sales team member
- **I want** the system to automatically scan the web for competitor dissatisfaction signals
- **So that** I can identify companies likely to switch from a competitor to our product

**Acceptance Criteria:**
- [ ] System accepts a competitor name as input
- [ ] System searches Reddit, G2, Glassdoor, Trustpilot, HackerNews
- [ ] System returns at least 1 signal per scan when data exists
- [ ] Scan completes within 3 minutes

---

### REQ-2: Real-Time Streaming
- **As a** user watching the dashboard
- **I want** to see live updates as the agent works
- **So that** I know the scan is progressing and what it's doing

**Acceptance Criteria:**
- [ ] Dashboard shows live SSE events from backend
- [ ] Events include: thinking, tool_call, search_result, scrape_result, signals_ready, complete
- [ ] Activity feed auto-scrolls as new events arrive
- [ ] Progress indicator shows scanning state

---

### REQ-3: AI Intent Scoring
- **As a** sales rep reviewing signals
- **I want** each signal scored 1-10 for switch intent
- **So that** I can prioritize which leads to contact first

**Acceptance Criteria:**
- [ ] Every signal has an intent_score (1-10)
- [ ] Score 9-10 = actively switching
- [ ] Score 7-8 = strong complaints, asking for alternatives
- [ ] Score 5-6 = moderate frustration
- [ ] Score includes pain_point category (Pricing, Support, Features, etc.)

---

### REQ-4: Battle Card Generation
- **As a** sales rep preparing for outreach
- **I want** an AI-generated battle card for each signal
- **So that** I have personalized talking points and email ready

**Acceptance Criteria:**
- [ ] Battle card includes: summary, talking_points (4), email_pitch, objection_handling
- [ ] Email pitch is personalized to company name and pain point
- [ ] Generation completes within 30 seconds
- [ ] Fallback battle card provided if AI API fails

---

### REQ-5: CRM Integration (HubSpot)
- **As a** sales manager
- **I want** qualified leads pushed directly to HubSpot
- **So that** my team can act on them immediately without manual data entry

**Acceptance Criteria:**
- [ ] "Push to CRM" button available on each signal
- [ ] Creates HubSpot deal with company name, pain point, source
- [ ] Shows success/failure feedback to user
- [ ] Works in sandbox mode if no HubSpot token configured

---

### REQ-6: Vulnerability Radar Chart
- **As a** marketing analyst
- **I want** a visual radar chart showing competitor vulnerability across 5 dimensions
- **So that** I can quickly identify which areas to target in campaigns

**Acceptance Criteria:**
- [ ] Radar chart shows 5 dimensions: Pricing, Support, Features, Hiring, Sentiment
- [ ] Data sourced from aggregated signals in database
- [ ] Interactive tooltips on hover
- [ ] Updates when new scans complete

---

### REQ-7: ROI Calculator
- **As a** sales manager justifying tool cost
- **I want** to see pipeline value and ROI metrics
- **So that** I can demonstrate business value to leadership

**Acceptance Criteria:**
- [ ] Shows: Pipeline Generated ($), Research Hours Saved, ROI %, High-Intent Leads count
- [ ] Pipeline = high-intent leads × $45k × 23% close rate
- [ ] Hours saved = total signals × 8 hours
- [ ] ROI = Pipeline / (Hours × $75/hr)

---

### REQ-8: Lead Enrichment
- **As a** sales rep preparing outreach
- **I want** to find decision maker contacts for each signal company
- **So that** I know who to email

**Acceptance Criteria:**
- [ ] "Find Contacts" button on each signal
- [ ] Returns 2-3 decision makers with name, title, email, LinkedIn
- [ ] Uses Bright Data SERP + Claude Opus for discovery
- [ ] Fallback to LinkedIn Sales Navigator search links

---

## Non-Functional Requirements

### NFR-1: Performance
- Scan completes within 3 minutes (MCP path) or 5 minutes (fallback)
- Battle card generates within 30 seconds
- Dashboard loads within 2 seconds
- SSE stream latency < 500ms

### NFR-2: Reliability
- Automatic fallback from MCP to manual pipeline
- Database error handling on startup
- Graceful degradation if any API fails
- All errors surfaced to user via SSE events

### NFR-3: Security
- API keys stored in .env (never committed)
- CORS restricted to localhost:5173 in development
- No sensitive data in frontend code
- HubSpot token optional (sandbox mode available)

### NFR-4: Scalability
- Async/await throughout backend
- PostgreSQL for persistent storage
- Supabase compatible for cloud deployment
- Stateless API design

---

## Bright Data Requirements (Hackathon Mandatory)

| Tool | Usage | Status |
|------|-------|--------|
| **MCP Server** | Primary agent path (search_engine, web_data_reddit_posts, scrape_as_markdown) | ✅ Implemented |
| **SERP API** | Fallback Google search (8 queries per scan) | ✅ Implemented |
| **Web Unlocker** | General page scraping with bot protection bypass | ✅ Implemented |
| **Scraping Browser** | JS-heavy sites (G2, Trustpilot, Glassdoor) | ✅ Implemented |

---

## Partner Integration Requirements

| Partner | Integration | Status |
|---------|-------------|--------|
| **AIML API** | Claude Opus for all AI tasks | ✅ Live |
| **Cognee** | Agent memory across scans | 📖 Documented |
| **TriggerWare** | Workflow automation on signal detection | 📖 Documented |
| **Kiro** | AI-assisted development (54% faster) | ✅ Used |
