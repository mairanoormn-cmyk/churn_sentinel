---
inclusion: always
---

# VANTA Project — Kiro Steering Guide

## What is VANTA?
VANTA is an autonomous GTM intelligence agent built for the Bright Data AI Agents Hackathon (May 2026). It scans the web for competitor dissatisfaction signals, scores intent with Claude Opus, generates battle cards, and pushes leads to HubSpot CRM.

## Project Structure
- `backend/` — FastAPI server, PostgreSQL database, API endpoints
- `ai-llm/` — Agent orchestrator, Claude Opus integration, MCP client
- `bright-data/` — SERP API, Web Unlocker, Scraping Browser utilities
- `frontend/` — React + Vite dashboard with real-time SSE streaming

## Key Files
- `backend/main.py` — All API endpoints (7 routes)
- `backend/database.py` — PostgreSQL schema and CRUD
- `ai-llm/agent_orchestrator.py` — Core agent logic
- `bright-data/bright_data_utils.py` — Bright Data tools
- `frontend/src/pages/Dashboard.jsx` — Main UI component

## Tech Stack
- Backend: Python, FastAPI, uvicorn, psycopg2, httpx
- AI: Claude Opus via AIML API (`https://api.aimlapi.com/v1`)
- Data: Bright Data MCP Server, SERP API, Web Unlocker, Scraping Browser
- Frontend: React 19, Vite, Recharts, React Router
- Database: PostgreSQL (Supabase compatible)
- CRM: HubSpot Deals API

## Environment Variables (backend/.env)
- `BRIGHT_DATA_API_KEY` — Required for all scraping
- `AIML_API_KEY` — Required for Claude Opus
- `DATABASE_URL` — PostgreSQL connection string
- `HUBSPOT_ACCESS_TOKEN` — Optional, enables real CRM push

## Running Locally
```bash
# Backend
cd backend && python -m uvicorn main:app --port 8000 --reload

# Frontend
cd frontend && npm run dev
```

## Coding Conventions
- Python: async/await throughout, type hints, docstrings
- JavaScript: functional React components, hooks
- Error handling: always graceful, never crash
- API responses: consistent JSON structure
