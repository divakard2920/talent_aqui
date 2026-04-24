from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class InterviewCreate(BaseModel):
    candidate_id: int
    job_id: int
    scheduled_at: Optional[datetime] = None


class InterviewResponse(BaseModel):
    id: int
    candidate_id: int
    job_id: int
    scheduled_at: Optional[datetime]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration_minutes: Optional[int]
    status: str
    transcript: Optional[list] = None
    evaluation: Optional[dict] = None
    recording_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InterviewEvaluation(BaseModel):
    overall_score: int
    communication_score: int
    technical_score: int
    culture_fit_score: int
    enthusiasm_score: int
    recommendation: str  # "proceed_to_l2", "hold", "reject"
    summary: str
    strengths: list[str]
    concerns: list[str]
    key_highlights: list[str]
    suggested_l2_questions: list[str]


class TranscriptEntry(BaseModel):
    role: str  # "ai" or "candidate"
    content: str
    timestamp: datetime


class InterviewMessage(BaseModel):
    """For real-time interview communication."""
    type: str  # "start", "speech", "end", "error"
    content: Optional[str] = None
    audio_base64: Optional[str] = None


class InterviewStartRequest(BaseModel):
    interview_id: int


class InterviewSpeechRequest(BaseModel):
    interview_id: int
    audio_base64: str  # Base64 encoded audio from candidate


class InterviewSpeechResponse(BaseModel):
    transcript: str  # What candidate said
    ai_response: str  # AI's text response
    ai_audio_base64: str  # AI's voice response
    is_complete: bool  # Whether interview is finished
