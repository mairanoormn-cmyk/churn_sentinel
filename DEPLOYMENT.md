# 🚀 VANTA — Vercel Deployment Guide

## Architecture (Single Project)

```
Vercel Project (one project, one domain)
    ↓
vercel.json:
  1. Runs: cd frontend && npm install && npm run build
  2. Deploys: api/index.py (Python serverless function)
     ├── /api/*       → FastAPI endpoints
     └── /*           → Serves frontend/dist/ (React SPA)
```

---

## Prerequisites

- [ ] GitHub account + repo with this code
- [ ] Vercel account (free tier OK)
- [ ] Supabase PostgreSQL database
- [ ] Bright Data API key
- [ ] AIML API key (for Claude Opus)
- [ ] HubSpot Access Token (optional)

---

## Step 1: Prepare Environment Variables

You'll need these values ready before deploying:

| Variable | Where to get |
|----------|-------------|
| `BRIGHT_DATA_API_KEY` | [brightdata.com](https://brightdata.com) → Account Settings |
| `BRIGHT_DATA_SERP_ZONE` | Bright Data → Zones (default: `serp_api2`) |
| `BRIGHT_DATA_UNLOCKER_ZONE` | Bright Data → Zones (default: `web_unlocker1`) |
| `BRIGHT_DATA_SB_ZONE` | Bright Data → Zones (default: `scraping_browser1`) |
| `AIML_API_KEY` | [aimlapi.com](https://aimlapi.com) → API Keys |
| `AIML_MODEL` | `anthropic/claude-opus-4-8` |
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection String (URI) |
| `HUBSPOT_ACCESS_TOKEN` | HubSpot → Settings → Private Apps (OPTIONAL) |
| `VITE_API_URL` | Leave **EMPTY** (same domain serves frontend + backend) |

---

## Step 2: Push to GitHub

```bash
# Make sure all changes are committed
git add .
git commit -m "feat: add Vercel deployment config"
git push origin main
```

---

## Step 3: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Click **Import Git Repository** → select your GitHub repo
3. On the configuration page:
   - **Framework Preset**: `Other`
   - **Root Directory**: `.` (leave as root — don't change!)
   - **Build Command**: _(auto-detected from vercel.json — leave blank)_
   - **Output Directory**: _(leave blank)_
   - **Install Command**: _(leave blank)_

4. Click **Environment Variables** → Add all variables from Step 1:

   ```
   BRIGHT_DATA_API_KEY     = your_key_here
   BRIGHT_DATA_SERP_ZONE   = serp_api2
   BRIGHT_DATA_UNLOCKER_ZONE = web_unlocker1
   BRIGHT_DATA_SB_ZONE     = scraping_browser1
   AIML_API_KEY            = your_key_here
   AIML_MODEL              = anthropic/claude-opus-4-8
   DATABASE_URL            = postgresql://user:pass@host:5432/postgres
   HUBSPOT_ACCESS_TOKEN    = (optional — leave blank for sandbox mode)
   VITE_API_URL            = (leave EMPTY)
   ```

5. Click **Deploy** → Wait ~2-3 minutes for build to finish

---

## Step 4: Initialize Database (First Time Only)

After deploy, open Vercel → Functions → click your function → **Logs**

Or run from local (with your Supabase DATABASE_URL in backend/.env):

```bash
cd backend
python -c "import database; print('DB initialized!')"
```

The database tables auto-create on first backend startup.

---

## Step 5: Test Your Deployment

```bash
# Health check
curl https://your-app.vercel.app/

# Should return:
# {"message": "Vanta API v2 is running."}

# Test scan
curl -X POST https://your-app.vercel.app/api/scan \
  -H "Content-Type: application/json" \
  -d '{"competitor": "Salesforce"}'
```

Open `https://your-app.vercel.app` in browser → Run a scan!

---

## ⚠️ Important: SSE Timeout

Vercel Hobby plan has a **60-second serverless function timeout**.

A full competitor scan can take 60-120 seconds. If scans time out:

**Option A — Upgrade to Vercel Pro** ($20/month): 300s timeout

**Option B — Backend on Railway** (free, unlimited):
1. Deploy backend on [railway.app](https://railway.app) (free tier)
2. Set `VITE_API_URL = https://your-backend.railway.app` in Vercel env vars
3. Rebuild frontend on Vercel

---

## Local Development (unchanged)

```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2 — Frontend
cd frontend
npm install --legacy-peer-deps
npm run dev
# → http://localhost:5173
```

---

## Project Structure After Deployment

```
/ (root)
├── api/
│   └── index.py          ← Vercel Python entry point
├── vercel.json            ← Deployment config
├── requirements.txt       ← Python deps for Vercel
├── backend/
│   ├── main.py            ← FastAPI app (serves API + static files)
│   ├── database.py
│   └── requirements.txt   ← Local dev deps
├── ai-llm/
│   └── agent_orchestrator.py
├── bright-data/
│   └── bright_data_utils.py
└── frontend/
    ├── src/               ← React source (not deployed, built to dist/)
    └── dist/              ← Built by Vercel, served by FastAPI
```

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| Build fails: `cognee not found` | Check `requirements.txt` at root — `cognee` should NOT be there |
| `DATABASE_URL not set` | Add `DATABASE_URL` in Vercel environment variables |
| Frontend shows blank page | Check Vercel build logs — frontend build must succeed |
| API returns 404 | Check `vercel.json` routes are correct |
| Scan times out | See SSE Timeout section above |
| CORS error | Ensure `VITE_API_URL` is empty in Vercel env vars |
