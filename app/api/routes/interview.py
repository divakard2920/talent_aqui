"""
Interview API Routes - Handles AI voice interview endpoints.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import get_db
from app.models.candidate import Candidate
from app.models.job import Job
from app.models.interview import Interview, InterviewStatus
from app.schemas.interview import (
    InterviewCreate,
    InterviewResponse,
    InterviewStartRequest,
    InterviewSpeechRequest,
    InterviewSpeechResponse,
)
from app.services.interview_engine import InterviewEngine
from app.services.voice_service import voice_service

router = APIRouter(prefix="/interviews", tags=["interviews"])

# Store active interview sessions (in production, use Redis)
active_sessions: dict[int, InterviewEngine] = {}


@router.post("/", response_model=InterviewResponse)
async def create_interview(
    request: InterviewCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create/schedule a new interview for a candidate."""
    # Verify candidate exists
    result = await db.execute(
        select(Candidate).where(Candidate.id == request.candidate_id)
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Verify job exists and is open
    result = await db.execute(select(Job).where(Job.id == request.job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "open":
        raise HTTPException(status_code=400, detail="Job is not open for interviews")

    # Check for existing pending interview
    result = await db.execute(
        select(Interview).where(
            Interview.candidate_id == request.candidate_id,
            Interview.job_id == request.job_id,
            Interview.status.in_([InterviewStatus.SCHEDULED.value, InterviewStatus.IN_PROGRESS.value]),
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="An interview is already scheduled or in progress for this candidate"
        )

    # Create interview
    interview = Interview(
        candidate_id=request.candidate_id,
        job_id=request.job_id,
        scheduled_at=request.scheduled_at or datetime.utcnow(),
        status=InterviewStatus.SCHEDULED.value,
    )

    db.add(interview)
    await db.commit()
    await db.refresh(interview)

    return interview


@router.get("/", response_model=list[InterviewResponse])
async def list_interviews(
    status: str | None = None,
    candidate_id: int | None = None,
    job_id: int | None = None,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """List all interviews with optional filters."""
    query = select(Interview)

    if status:
        query = query.where(Interview.status == status)
    if candidate_id:
        query = query.where(Interview.candidate_id == candidate_id)
    if job_id:
        query = query.where(Interview.job_id == job_id)

    query = query.order_by(Interview.created_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{interview_id}", response_model=InterviewResponse)
async def get_interview(interview_id: int, db: AsyncSession = Depends(get_db)):
    """Get interview details."""
    result = await db.execute(
        select(Interview).where(Interview.id == interview_id)
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


@router.post("/{interview_id}/start")
async def start_interview(interview_id: int, db: AsyncSession = Depends(get_db)):
    """
    Start an interview session.

    Returns the AI's opening message (text + audio).
    """
    # Get interview
    result = await db.execute(
        select(Interview).where(Interview.id == interview_id)
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if interview.status not in [InterviewStatus.SCHEDULED.value, InterviewStatus.IN_PROGRESS.value]:
        raise HTTPException(status_code=400, detail=f"Interview cannot be started (status: {interview.status})")

    # Get candidate and job details
    result = await db.execute(
        select(Candidate).where(Candidate.id == interview.candidate_id)
    )
    candidate = result.scalar_one_or_none()

    result = await db.execute(select(Job).where(Job.id == interview.job_id))
    job = result.scalar_one_or_none()

    # Prepare contexts
    candidate_context = {
        "name": candidate.name,
        "email": candidate.email,
        "location": candidate.location,
        **(candidate.parsed_data or {}),
    }

    job_context = {
        "title": job.title,
        "department": job.department,
        "description": job.description,
        "requirements": job.requirements,
        "skills_required": job.skills_required or [],
        "skills_preferred": job.skills_preferred or [],
        "experience_min_years": job.experience_min_years,
        "experience_max_years": job.experience_max_years,
        "location": job.location,
    }

    # Initialize interview engine
    engine = InterviewEngine()
    engine.initialize(
        job=job_context,
        candidate=candidate_context,
        company_name="Knorr-Bremse",  # TODO: Make configurable
    )

    # Store session
    active_sessions[interview_id] = engine

    # Get opening message
    opening_text = engine.get_opening_message()

    # Convert to speech
    try:
        audio_base64 = voice_service.text_to_speech(opening_text)
    except Exception as e:
        print(f"TTS failed: {e}")
        audio_base64 = None

    # Update interview status
    interview.status = InterviewStatus.IN_PROGRESS.value
    interview.started_at = datetime.utcnow()
    interview.interview_config = {
        "job_title": job.title,
        "candidate_name": candidate.name,
        "started_at": datetime.utcnow().isoformat(),
    }
    await db.commit()

    return {
        "interview_id": interview_id,
        "status": "in_progress",
        "ai_message": opening_text,
        "ai_audio_base64": audio_base64,
    }


@router.post("/{interview_id}/respond")
async def process_candidate_response(
    interview_id: int,
    request: InterviewSpeechRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Process candidate's speech and get AI's response.

    Expects base64 encoded audio of candidate's speech.
    Returns AI's response as text + audio.
    """
    # Check interview exists and is in progress
    result = await db.execute(
        select(Interview).where(Interview.id == interview_id)
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if interview.status != InterviewStatus.IN_PROGRESS.value:
        raise HTTPException(status_code=400, detail="Interview is not in progress")

    # Get session
    engine = active_sessions.get(interview_id)
    if not engine:
        raise HTTPException(status_code=400, detail="Interview session not found. Please restart.")

    # Convert speech to text
    try:
        candidate_text = voice_service.speech_to_text(request.audio_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not process audio: {str(e)}")

    # Process response and get AI's reply
    result = engine.process_response(candidate_text)

    ai_response = result["ai_response"]
    is_complete = result["is_complete"]

    # Convert AI response to speech
    try:
        audio_base64 = voice_service.text_to_speech(ai_response)
    except Exception as e:
        print(f"TTS failed: {e}")
        audio_base64 = None

    # If interview is complete, finalize
    if is_complete:
        evaluation = engine.generate_evaluation()
        transcript = engine.get_transcript()

        interview.status = InterviewStatus.COMPLETED.value
        interview.completed_at = datetime.utcnow()
        interview.duration_minutes = int(
            (datetime.utcnow() - interview.started_at).total_seconds() / 60
        )
        interview.transcript = transcript
        interview.evaluation = evaluation

        # Clean up session
        del active_sessions[interview_id]

        await db.commit()

    return {
        "candidate_transcript": candidate_text,
        "ai_message": ai_response,
        "ai_audio_base64": audio_base64,
        "is_complete": is_complete,
        "phase": result.get("phase", "unknown"),
    }


@router.post("/{interview_id}/respond-text")
async def process_candidate_text(
    interview_id: int,
    text: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Process candidate's text response (for testing without voice).

    Alternative to /respond for text-based interaction.
    """
    # Check interview exists and is in progress
    result = await db.execute(
        select(Interview).where(Interview.id == interview_id)
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if interview.status != InterviewStatus.IN_PROGRESS.value:
        raise HTTPException(status_code=400, detail="Interview is not in progress")

    # Get session
    engine = active_sessions.get(interview_id)
    if not engine:
        raise HTTPException(status_code=400, detail="Interview session not found. Please restart.")

    # Process response
    result = engine.process_response(text)

    ai_response = result["ai_response"]
    is_complete = result["is_complete"]

    # If interview is complete, finalize
    if is_complete:
        evaluation = engine.generate_evaluation()
        transcript = engine.get_transcript()

        interview.status = InterviewStatus.COMPLETED.value
        interview.completed_at = datetime.utcnow()
        interview.duration_minutes = int(
            (datetime.utcnow() - interview.started_at).total_seconds() / 60
        )
        interview.transcript = transcript
        interview.evaluation = evaluation

        # Clean up session
        del active_sessions[interview_id]

        await db.commit()

    return {
        "ai_message": ai_response,
        "is_complete": is_complete,
        "phase": result.get("phase", "unknown"),
    }


@router.post("/{interview_id}/end")
async def end_interview(interview_id: int, db: AsyncSession = Depends(get_db)):
    """Manually end an interview early."""
    result = await db.execute(
        select(Interview).where(Interview.id == interview_id)
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    engine = active_sessions.get(interview_id)

    if engine:
        # Generate evaluation with whatever we have
        evaluation = engine.generate_evaluation()
        transcript = engine.get_transcript()

        interview.transcript = transcript
        interview.evaluation = evaluation

        del active_sessions[interview_id]

    interview.status = InterviewStatus.COMPLETED.value
    interview.completed_at = datetime.utcnow()
    if interview.started_at:
        interview.duration_minutes = int(
            (datetime.utcnow() - interview.started_at).total_seconds() / 60
        )

    await db.commit()

    return {"status": "completed", "evaluation": interview.evaluation}


@router.delete("/{interview_id}")
async def cancel_interview(interview_id: int, db: AsyncSession = Depends(get_db)):
    """Cancel a scheduled interview."""
    result = await db.execute(
        select(Interview).where(Interview.id == interview_id)
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if interview.status == InterviewStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Cannot cancel a completed interview")

    # Clean up session if exists
    if interview_id in active_sessions:
        del active_sessions[interview_id]

    interview.status = InterviewStatus.CANCELLED.value
    await db.commit()

    return {"status": "cancelled"}
