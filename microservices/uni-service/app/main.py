from __future__ import annotations
import os
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from .routers import v1
from .storage import load_data_bundle

APP_NAME = "Suni Onboard Login"
ENV = os.getenv("ENV", "dev")

app = FastAPI(title=APP_NAME, version="1.0.0")

# CORS (tighten in prod)
allow_origins = ["*"] if ENV != "prod" else os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

@app.get("/health")
def health():
    return {"status": "ok", "service": APP_NAME, "time": now_iso(), "env": ENV}

@app.get("/universityData")
def university_data(response: Response):
    # Bulk dump (kept for convenience)
    try:
        bundle = load_data_bundle()
        response.headers["ETag"] = bundle.etag
        response.headers["Last-Modified"] = bundle.last_modified_http
        response.headers["Cache-Control"] = "public, max-age=60"
        return {
            "status": "ok",
            "time": now_iso(),
            "version": bundle.data.version,
            "data": bundle.data.model_dump(),
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load data: {e}")

# Mount versioned router
app.include_router(v1.router)
