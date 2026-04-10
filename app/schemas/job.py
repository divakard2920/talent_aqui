from pydantic import BaseModel
from datetime import datetime


class JobCreate(BaseModel):
    title: str
    description: str
    requirements: str
    department: str | None = None
    location: str | None = None
    employment_type: str | None = None
    experience_min_years: int = 0
    experience_max_years: int | None = None
    skills_required: list[str] | None = None
    skills_preferred: list[str] | None = None
    salary_min: int | None = None
    salary_max: int | None = None


class JobResponse(BaseModel):
    id: int
    title: str
    description: str
    requirements: str
    department: str | None
    location: str | None
    employment_type: str | None
    experience_min_years: int
    experience_max_years: int | None
    skills_required: list[str] | None
    skills_preferred: list[str] | None
    salary_min: int | None
    salary_max: int | None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
