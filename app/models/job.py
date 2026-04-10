from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func

from app.models.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=False)
    department = Column(String(100))
    location = Column(String(100))
    employment_type = Column(String(50))  # full-time, part-time, contract
    experience_min_years = Column(Integer, default=0)
    experience_max_years = Column(Integer)
    skills_required = Column(JSON)  # List of required skills
    skills_preferred = Column(JSON)  # List of nice-to-have skills
    salary_min = Column(Integer)
    salary_max = Column(Integer)
    status = Column(String(20), default="open")  # open, closed, on_hold
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
