from __future__ import annotations
from fastapi import APIRouter, HTTPException, Header, Response, Query
from typing import Optional, List

from ..storage import load_data_bundle
from ..models import Country, University, Program, UniConfig

router = APIRouter(prefix="/v1", tags=["v1"])

def _apply_cache_headers(resp: Response, etag: str, last_modified: str, max_age: int = 60):
    resp.headers["ETag"] = etag
    resp.headers["Last-Modified"] = last_modified
    resp.headers["Cache-Control"] = f"public, max-age={max_age}"

@router.get("/countries", response_model=List[Country])
def get_countries(
    response: Response,
    if_none_match: Optional[str] = Header(default=None, alias="If-None-Match"),
):
    bundle = load_data_bundle()
    if if_none_match and if_none_match == bundle.etag:
        response.status_code = 304
        return []
    _apply_cache_headers(response, bundle.etag, bundle.last_modified_http)
    return bundle.data.countries

@router.get("/universities", response_model=List[University])
def get_universities(
    response: Response,
    countryId: Optional[int] = Query(default=None),
    if_none_match: Optional[str] = Header(default=None, alias="If-None-Match"),
):
    bundle = load_data_bundle()
    if if_none_match and if_none_match == bundle.etag:
        response.status_code = 304
        return []
    _apply_cache_headers(response, bundle.etag, bundle.last_modified_http)
    unis = bundle.data.universities
    if countryId is not None:
        unis = [u for u in unis if u.countryId == countryId]
    return unis

@router.get("/programs", response_model=List[Program])
def get_programs(
    response: Response,
    universityId: Optional[int] = Query(default=None),
    if_none_match: Optional[str] = Header(default=None, alias="If-None-Match"),
):
    bundle = load_data_bundle()
    if if_none_match and if_none_match == bundle.etag:
        response.status_code = 304
        return []
    _apply_cache_headers(response, bundle.etag, bundle.last_modified_http)
    progs = bundle.data.programs
    if universityId is not None:
        progs = [p for p in progs if p.universityId == universityId]
    return progs

@router.get("/unis/{uniId}/config", response_model=UniConfig)
def get_uni_config(
    uniId: int,
    response: Response,
    if_none_match: Optional[str] = Header(default=None, alias="If-None-Match"),
):
    bundle = load_data_bundle()
    if if_none_match and if_none_match == bundle.etag:
        response.status_code = 304
        return None  # ignored by FastAPI, 304 has no body

    cfg = bundle.data.uniConfigs.get(str(uniId))
    if not cfg:
        raise HTTPException(status_code=404, detail="uniId not found")
    _apply_cache_headers(response, bundle.etag, bundle.last_modified_http)
    return cfg

@router.get("/unis/{uniId}/links")
def get_uni_links(
    uniId: int,
    response: Response,
    if_none_match: Optional[str] = Header(default=None, alias="If-None-Match"),
):
    print("Test")
    bundle = load_data_bundle()
    if if_none_match and if_none_match == bundle.etag:
        response.status_code = 304
        return None
    cfg = bundle.data.uniConfigs.get(str(uniId))
    if not cfg:
        raise HTTPException(status_code=404, detail="uniId not found")
    _apply_cache_headers(response, bundle.etag, bundle.last_modified_http)
    return {"links": [l.model_dump() for l in (cfg.links or [])]}
