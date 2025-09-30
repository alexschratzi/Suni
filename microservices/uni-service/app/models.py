from __future__ import annotations
from typing import List, Dict, Optional
from pydantic import BaseModel, Field, HttpUrl

# --- Core entities ---

class Country(BaseModel):
    id: int
    name: str

class University(BaseModel):
    id: int
    name: str
    countryId: int

class Program(BaseModel):
    id: int
    name: str
    universityId: int

class LinkItem(BaseModel):
    id: str
    title: str
    url: HttpUrl

class LoginDetectionConfig(BaseModel):
    successHostSuffixes: List[str] = Field(default_factory=list)
    idpHosts: List[str] = Field(default_factory=list)

class UniConfig(BaseModel):
    uniId: int
    loginUrl: Optional[HttpUrl] = None
    links: List[LinkItem] = Field(default_factory=list)
    loginDetection: Optional[LoginDetectionConfig] = None

# --- File payload ---

class UniversityData(BaseModel):
    version: str = "dev"
    countries: List[Country]
    universities: List[University]
    programs: List[Program]
    uniConfigs: Dict[str, UniConfig]  # keys as strings in JSON
