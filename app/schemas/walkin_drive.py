"""
Walk-in Drive Schemas - Pydantic models for API requests/responses.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


# --- Drive Schemas ---

class TimeSlot(BaseModel):
    time: str  # e.g., "9:00 AM"
    capacity: int


class DriveCreate(BaseModel):
    job_id: int
    title: str
    drive_date: datetime
    slots: Optional[list[TimeSlot]] = None
    total_capacity: Optional[int] = None  # Optional - walk-ins are hard to predict
    test_enabled: bool = True
    questions_per_candidate: int = 20
    test_duration_minutes: int = 30
    passing_score_percent: int = 60


class DriveUpdate(BaseModel):
    title: Optional[str] = None
    drive_date: Optional[datetime] = None
    slots: Optional[list[TimeSlot]] = None
    total_capacity: Optional[int] = None
    test_enabled: Optional[bool] = None
    questions_per_candidate: Optional[int] = None
    test_duration_minutes: Optional[int] = None
    passing_score_percent: Optional[int] = None
    status: Optional[str] = None
    is_registration_open: Optional[bool] = None


class DriveResponse(BaseModel):
    id: int
    job_id: int
    title: str
    drive_date: datetime
    slots: Optional[list] = None
    total_capacity: Optional[int] = None
    test_enabled: bool
    questions_per_candidate: int
    test_duration_minutes: int
    passing_score_percent: int
    question_bank: Optional[list] = None
    status: str
    is_registration_open: bool = True
    registration_slug: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Computed fields
    registered_count: Optional[int] = None
    checked_in_count: Optional[int] = None
    tested_count: Optional[int] = None

    class Config:
        from_attributes = True


# --- Question Schemas ---

class QuestionOption(BaseModel):
    label: str  # A, B, C, D
    text: str


class Question(BaseModel):
    id: str
    type: str  # mcq, true_false, short_answer
    skill: str
    difficulty: str  # easy, intermediate, hard
    question: str
    options: Optional[list[QuestionOption]] = None  # For MCQ
    correct_answer: Optional[str] = None  # For MCQ/true_false
    expected_keywords: Optional[list[str]] = None  # For short_answer
    points: int = 5


class GenerateQuestionsRequest(BaseModel):
    total_questions: int = 50
    mcq_ratio: float = 0.7  # 70% MCQ, 30% short answer
    difficulty_distribution: Optional[dict] = None  # {"easy": 0.3, "intermediate": 0.5, "hard": 0.2}


# --- Registration Schemas ---

class RegistrationCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    experience_years: Optional[float] = None
    current_company: Optional[str] = None
    current_role: Optional[str] = None
    selected_slot: Optional[str] = None


class RegistrationResponse(BaseModel):
    id: int
    drive_id: int
    candidate_id: Optional[int] = None
    name: str
    email: str
    phone: str
    experience_years: Optional[float] = None
    current_company: Optional[str] = None
    current_role: Optional[str] = None
    selected_slot: Optional[str] = None
    registration_code: str
    token_number: Optional[int] = None
    status: str
    checked_in_at: Optional[datetime] = None
    test_score: Optional[float] = None
    test_passed: Optional[bool] = None
    test_score_breakdown: Optional[dict] = None
    assigned_questions: Optional[list] = None
    answers: Optional[dict] = None
    registered_at: datetime
    interview_status: Optional[str] = None
    interview_score: Optional[float] = None

    class Config:
        from_attributes = True


class CheckInRequest(BaseModel):
    registration_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class CheckInResponse(BaseModel):
    registration: RegistrationResponse
    token_number: int
    message: str


# --- Test Schemas ---

class TestQuestion(BaseModel):
    """Question shown to candidate (without correct answer)"""
    id: str
    type: str
    skill: str
    question: str
    options: Optional[list[QuestionOption]] = None
    points: int


class StartTestResponse(BaseModel):
    registration_id: int
    questions: list[TestQuestion]
    duration_minutes: int
    started_at: datetime


class SubmitAnswerRequest(BaseModel):
    question_id: str
    answer: str  # For MCQ: "A", "B", etc. For short_answer: full text


class SubmitTestRequest(BaseModel):
    answers: dict[str, str]  # {"q1": "B", "q2": "Django middleware..."}


class TestResultResponse(BaseModel):
    registration_id: int
    score: float
    total_points: int
    earned_points: float
    score_percent: float
    passed: bool
    passing_score_percent: int
    breakdown: Optional[dict] = None  # {"mcq": 80, "short_answer": 70}
    completed_at: datetime


# --- Results/Leaderboard Schemas ---

class LeaderboardEntry(BaseModel):
    rank: int
    registration_id: int
    name: str
    email: str
    phone: str
    experience_years: Optional[float] = None
    test_score: Optional[float] = None
    test_passed: Optional[bool] = None
    status: str
    checked_in_at: Optional[datetime] = None
    interview_status: Optional[str] = None
    interview_score: Optional[float] = None


class DriveStats(BaseModel):
    total_registered: int
    checked_in: int
    tested: int
    passed: int
    failed: int
    no_show: int
    shortlisted: int
    average_score: Optional[float] = None
