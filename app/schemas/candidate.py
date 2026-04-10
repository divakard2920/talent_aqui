from pydantic import BaseModel
from datetime import datetime


class ParsedResumeData(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    summary: str | None = None
    skills: list[str] | None = None
    experience: list[dict] | None = None  # List of work experiences
    education: list[dict] | None = None  # List of education entries
    certifications: list[str] | None = None
    total_years_experience: float | None = None


class CandidateCreate(BaseModel):
    name: str
    email: str
    phone: str | None = None
    location: str | None = None
    source: str = "upload"
    source_id: str | None = None


class CandidateResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str | None
    location: str | None
    resume_file_path: str | None
    parsed_data: dict | None
    source: str
    created_at: datetime

    class Config:
        from_attributes = True


class CandidateMatchResponse(BaseModel):
    id: int
    candidate_id: int
    job_id: int
    overall_score: float | None
    skills_score: float | None
    experience_score: float | None
    education_score: float | None
    analysis: str | None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class MatchResultResponse(BaseModel):
    candidate: CandidateResponse
    match: CandidateMatchResponse
