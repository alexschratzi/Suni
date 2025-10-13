from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime
from hashlib import sha256
from pathlib import Path
from typing import Optional

from .models import UniversityData

UNI_DATA_PATH = Path(os.getenv("UNI_DATA_PATH", "universities.json"))


@dataclass
class DataBundle:
    data: UniversityData
    mtime: float
    etag: str
    last_modified_http: str  # RFC 1123 format


_cache: Optional[DataBundle] = None


def _httpdate(ts: float) -> str:
    # RFC 1123
    return datetime.utcfromtimestamp(ts).strftime("%a, %d %b %Y %H:%M:%S GMT")


def _compute_etag(payload: bytes, mtime: float) -> str:
    h = sha256()
    h.update(payload)
    h.update(str(mtime).encode())
    return f"W/\"{h.hexdigest()}\""  # weak ETag


def load_data_bundle() -> DataBundle:
    global _cache
    if not UNI_DATA_PATH.exists():
        raise FileNotFoundError(f"Config file not found: {UNI_DATA_PATH}")

    mtime = UNI_DATA_PATH.stat().st_mtime
    if _cache and _cache.mtime == mtime:
        return _cache

    raw = UNI_DATA_PATH.read_bytes()
    parsed = json.loads(raw)
    data = UniversityData.model_validate(parsed)

    etag = _compute_etag(raw, mtime)
    last_modified_http = _httpdate(mtime)

    _cache = DataBundle(data=data, mtime=mtime, etag=etag, last_modified_http=last_modified_http)
    return _cache
