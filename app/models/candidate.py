from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Float, ForeignKey
from sqlalchemy.sql import func

from app.models.database import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True)
    phone = Column(String(50))
    location = Column(String(100))
    resume_file_path = Column(String(500))
    resume_text = Column(Text)  # Extracted text from resume
    parsed_data = Column(JSON)  # Structured resume data from AI
    source = Column(String(50))  # upload, greenhouse, lever, etc.
    source_id = Column(String(100))  # External ATS ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class CandidateJobMatch(Base):
    __tablename__ = "candidate_job_matches"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    overall_score = Column(Float)  # 0-100 match score
    skills_score = Column(Float)
    experience_score = Column(Float)
    education_score = Column(Float)
    analysis = Column(Text)  # AI-generated analysis
    status = Column(String(20), default="pending")  # pending, shortlisted, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
