"""
Vanta — Vercel Python Entry Point

This file is the Vercel serverless function entry.
It sets up the Python path and imports the FastAPI app from backend/main.py.
All traffic is routed here via vercel.json.
"""
import sys
from pathlib import Path

# Resolve project root (one level up from api/)
ROOT = Path(__file__).resolve().parent.parent

# Add all module directories to Python path
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "ai-llm"))
sys.path.insert(0, str(ROOT / "bright-data"))

# Import the FastAPI app — Vercel needs a variable named `app`
from main import app  # noqa: F401, E402
