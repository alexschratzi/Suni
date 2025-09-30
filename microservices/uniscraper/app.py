# main.py
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

APP_NAME = "Suni Onboard Login"
DATA_PATH = Path(os.getenv("UNI_DATA_PATH", "universities.json"))

app = FastAPI(title=APP_NAME)

# CORS (dev-friendly; restrict in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# --- naive cache with mtime check (auto-reload on file change) ---
_cache: Dict[str, Any] = {}
_cache_mtime: Optional[float] = None

def load_data() -> Dict[str, Any]:
    global _cache, _cache_mtime
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Config file not found: {DATA_PATH}")

    mtime = DATA_PATH.stat().st_mtime
    if _cache and _cache_mtime == mtime:
        return _cache

    with DATA_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)

    # very light validation
    for key in ("countries", "universities", "programs", "uniConfigs"):
        if key not in data:
            raise ValueError(f"Key '{key}' missing in {DATA_PATH}")

    _cache = data
    _cache_mtime = mtime
    return _cache

@app.get("/health")
def health():
    return {"status": "ok", "service": APP_NAME, "time": now_iso()}

@app.get("/universityData")
def university_data():
    try:
        data = load_data()
        return {
            "status": "ok",
            "time": now_iso(),
            "version": data.get("version", "dev"),
            "data": data,
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load data: {e}")
