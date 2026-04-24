from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
import enum

from app.models.database import Base


class InterviewStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class Interview(Base):
    """Model for AI-conducted L1 interviews."""

    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)

    # Relations
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)

    # Scheduling
    scheduled_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=True)  # Actual duration

    # Status
    status = Column(String(20), default=InterviewStatus.SCHEDULED.value)

    # Interview content
    transcript = Column(JSON, nullable=True)  # List of {role, content, timestamp}

    # AI Evaluation
    evaluation = Column(JSON, nullable=True)
    """
    {
        "overall_score": 75,
        "communication_score": 80,
        "technical_score": 70,
        "culture_fit_score": 75,
        "enthusiasm_score": 85,
        "recommendation": "proceed_to_l2",
        "summary": "...",
        "strengths": [...],
        "concerns": [...],
        "key_highlights": [...],
        "suggested_l2_questions": [...]
    }
    """

    # Recording (optional)
    recording_url = Column(String(500), nullable=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Interview config used
    interview_config = Column(JSON, nullable=True)
    """
    {
        "company_intro": "...",
        "role_brief": "...",
        "questions_asked": [...],
        "total_questions": 10
    }
    """

    # Relationships
    candidate = relationship("Candidate", backref="interviews")
    job = relationship("Job", backref="interviews")

    def __repr__(self):
        return f"<Interview {self.id} - Candidate {self.candidate_id} for Job {self.job_id}>"
