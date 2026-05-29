import psycopg2
import psycopg2.extras
import os
import json
import uuid
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load .env from same directory as this file
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    # Return raw psycopg2 connection
    return psycopg2.connect(DATABASE_URL)

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create ScanJobs table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS scan_jobs (
        id TEXT PRIMARY KEY,
        competitor TEXT NOT NULL,
        status TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    )
    ''')
    
    # Create Signals table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS signals (
        id SERIAL PRIMARY KEY,
        job_id TEXT,
        company_name TEXT NOT NULL,
        company_size TEXT,
        industry TEXT,
        intent_score INTEGER,
        source TEXT,
        source_url TEXT,
        source_details TEXT,
        pain_point TEXT,
        raw_text TEXT,
        battlecard TEXT,
        is_pushed INTEGER DEFAULT 0,
        FOREIGN KEY (job_id) REFERENCES scan_jobs (id)
    )
    ''')
    # Add source_url column if it doesn't exist (for existing databases)
    try:
        cursor.execute("ALTER TABLE signals ADD COLUMN IF NOT EXISTS source_url TEXT")
    except Exception:
        pass
    conn.commit()
    cursor.close()
    conn.close()

def create_scan_job(competitor):
    conn = get_db_connection()
    cursor = conn.cursor()
    job_id = str(uuid.uuid4())
    created_at = datetime.now().isoformat()
    cursor.execute(
        "INSERT INTO scan_jobs (id, competitor, status, progress, created_at) VALUES (%s, %s, %s, %s, %s)",
        (job_id, competitor, "PENDING", 0, created_at)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return job_id

def update_job_status(job_id, status, progress):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE scan_jobs SET status = %s, progress = %s WHERE id = %s",
        (status, progress, job_id)
    )
    conn.commit()
    cursor.close()
    conn.close()

def get_job(job_id):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM scan_jobs WHERE id = %s", (job_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if row:
        return dict(row)
    return None

def add_signals(job_id, signals_list):
    conn = get_db_connection()
    cursor = conn.cursor()
    for sig in signals_list:
        cursor.execute('''
            INSERT INTO signals (
                job_id, company_name, company_size, industry, intent_score,
                source, source_url, source_details, pain_point, raw_text, battlecard, is_pushed
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            job_id,
            sig.get("company_name"),
            sig.get("company_size"),
            sig.get("industry"),
            sig.get("intent_score"),
            sig.get("source"),
            sig.get("source_url"),
            sig.get("source_details"),
            sig.get("pain_point"),
            sig.get("raw_text"),
            sig.get("battlecard"),
            sig.get("is_pushed", 0)
        ))
    conn.commit()
    cursor.close()
    conn.close()

def get_signals_by_job(job_id):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM signals WHERE job_id = %s", (job_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [dict(r) for r in rows]

def get_all_signals_by_competitor(competitor):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute('''
        SELECT s.*, j.competitor, j.created_at as scan_time 
        FROM signals s 
        JOIN scan_jobs j ON s.job_id = j.id 
        WHERE LOWER(j.competitor) = LOWER(%s)
        ORDER BY s.intent_score DESC
    ''', (competitor,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [dict(r) for r in rows]

def get_signal_by_id(signal_id):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM signals WHERE id = %s", (signal_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if row:
        return dict(row)
    return None

def update_signal_battlecard(signal_id, battlecard):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE signals SET battlecard = %s WHERE id = %s",
        (battlecard if isinstance(battlecard, str) else json.dumps(battlecard), signal_id)
    )
    conn.commit()
    cursor.close()
    conn.close()

def mark_signal_pushed(signal_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE signals SET is_pushed = 1 WHERE id = %s",
        (signal_id,)
    )
    conn.commit()
    cursor.close()
    conn.close()

def get_recent_signals(limit: int = 50):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute(
        "SELECT * FROM signals ORDER BY intent_score DESC LIMIT %s",
        (limit,)
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [dict(r) for r in rows]

# Initialize database on module import with error handling
try:
    init_db()
    print("[DB] PostgreSQL Database initialized successfully.")
except Exception as e:
    print(f"[DB] Warning: Database initialization issue: {e}")
    print("   Attempting to proceed anyway -- database may be unavailable.")
    print("   Ensure DATABASE_URL is set in .env file.")
