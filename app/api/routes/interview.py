"""
Interview API Routes - Handles AI voice interview endpoints.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import get_db, async_session
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


@router.get("/config")
async def get_interview_config():
    """
    Get interview configuration including available modes.
    """
    from app.config import get_settings
    settings = get_settings()

    return {
        "server_mic_available": settings.use_azure_speech_service,
        "speech_service": "azure_speech" if settings.use_azure_speech_service else "openai",
        "voicelive_available": settings.use_voicelive,
        "mode": "voicelive" if settings.use_voicelive else ("azure_speech" if settings.use_azure_speech_service else "openai"),
    }


# Store active VoiceLive sessions
voicelive_sessions: dict[int, "VoiceLiveInterview"] = {}


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
    interviews = result.scalars().all()

    # Clean up any stuck "in_progress" interviews that lost their session
    for interview in interviews:
        if interview.status == InterviewStatus.IN_PROGRESS.value:
            if interview.id not in active_sessions:
                # Session was lost (server restart or candidate abandoned)
                # Mark as completed with incomplete evaluation
                interview.status = InterviewStatus.COMPLETED.value
                interview.completed_at = datetime.utcnow()
                if interview.started_at:
                    interview.duration_minutes = int(
                        (datetime.utcnow() - interview.started_at).total_seconds() / 60
                    )
                if not interview.evaluation:
                    interview.evaluation = {
                        "overall_score": 0,
                        "communication_score": 0,
                        "technical_score": 0,
                        "culture_fit_score": 0,
                        "enthusiasm_score": 0,
                        "recommendation": "reject",
                        "summary": "Interview was abandoned or connection was lost.",
                        "strengths": [],
                        "concerns": ["Interview incomplete - candidate may have disconnected"],
                        "key_highlights": [],
                        "suggested_l2_questions": [],
                        "incomplete": True,
                        "reason": "abandoned_session"
                    }
                await db.commit()
                await db.refresh(interview)

    return interviews


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


@router.post("/{interview_id}/start-voicelive")
async def start_voicelive_interview(
    interview_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Start a VoiceLive real-time streaming interview.

    Uses server microphone and speakers for natural conversation.
    Interview runs in background - poll /interviews/{id} for status.
    """
    from app.config import get_settings
    from app.services.voicelive_service import VoiceLiveInterview, check_audio_devices

    settings = get_settings()

    if not settings.use_voicelive:
        raise HTTPException(status_code=400, detail="VoiceLive not enabled. Set USE_VOICELIVE=true")

    # Check audio devices
    audio_check = check_audio_devices()
    if not audio_check.get("available"):
        raise HTTPException(status_code=400, detail=f"Audio not available: {audio_check.get('error')}")

    # Get interview
    result = await db.execute(
        select(Interview).where(Interview.id == interview_id)
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if interview.status not in [InterviewStatus.SCHEDULED.value, InterviewStatus.IN_PROGRESS.value]:
        raise HTTPException(status_code=400, detail=f"Interview cannot be started (status: {interview.status})")

    # Check if already running
    if interview_id in voicelive_sessions:
        raise HTTPException(status_code=400, detail="Interview already in progress")

    # Get candidate and job
    result = await db.execute(
        select(Candidate).where(Candidate.id == interview.candidate_id)
    )
    candidate = result.scalar_one_or_none()

    result = await db.execute(select(Job).where(Job.id == interview.job_id))
    job = result.scalar_one_or_none()

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

    # Update status
    interview.status = InterviewStatus.IN_PROGRESS.value
    interview.started_at = datetime.utcnow()
    interview.interview_config = {
        "mode": "voicelive",
        "job_title": job.title,
        "candidate_name": candidate.name,
        "started_at": datetime.utcnow().isoformat(),
    }
    await db.commit()

    # Create VoiceLive session
    voicelive = VoiceLiveInterview(
        job_context=job_context,
        candidate_context=candidate_context,
        company_name="Knorr-Bremse",
    )
    voicelive_sessions[interview_id] = voicelive

    # Run in background
    import asyncio

    async def run_voicelive():
        try:
            await voicelive.start()
        except Exception as e:
            print(f"[VoiceLive] Error during interview: {e}")
        finally:
            # Save results
            try:
                transcript = voicelive.get_transcript()
                print(f"[VoiceLive] Saving results. Transcript entries: {len(transcript)}")

                # Generate evaluation
                try:
                    evaluation = voicelive.generate_evaluation()
                except Exception as e:
                    print(f"[VoiceLive] Error generating evaluation: {e}")
                    evaluation = {
                        "overall_score": 0,
                        "communication_score": 0,
                        "technical_score": 0,
                        "culture_fit_score": 0,
                        "enthusiasm_score": 0,
                        "recommendation": "hold",
                        "summary": f"Evaluation could not be generated: {str(e)}",
                        "strengths": [],
                        "concerns": ["Evaluation failed"],
                        "key_highlights": [],
                        "suggested_l2_questions": [],
                        "incomplete": True,
                    }

                async with async_session() as session:
                    result = await session.execute(
                        select(Interview).where(Interview.id == interview_id)
                    )
                    interview_record = result.scalar_one_or_none()
                    if interview_record:
                        interview_record.status = InterviewStatus.COMPLETED.value
                        interview_record.completed_at = datetime.utcnow()
                        if interview_record.started_at:
                            interview_record.duration_minutes = int(
                                (datetime.utcnow() - interview_record.started_at).total_seconds() / 60
                            )
                        interview_record.transcript = transcript
                        interview_record.evaluation = evaluation
                        await session.commit()
                        print(f"[VoiceLive] Results saved for interview {interview_id}")
                    else:
                        print(f"[VoiceLive] Interview {interview_id} not found in database")
            except Exception as e:
                print(f"[VoiceLive] Error saving results: {e}")

            # Cleanup
            if interview_id in voicelive_sessions:
                del voicelive_sessions[interview_id]

    asyncio.create_task(run_voicelive())

    return {
        "interview_id": interview_id,
        "status": "in_progress",
        "mode": "voicelive",
        "message": "VoiceLive interview started. Speak into server microphone.",
    }


@router.post("/{interview_id}/stop-voicelive")
async def stop_voicelive_interview(interview_id: int, db: AsyncSession = Depends(get_db)):
    """Stop a running VoiceLive interview and save results."""
    if interview_id not in voicelive_sessions:
        raise HTTPException(status_code=404, detail="No active VoiceLive session")

    voicelive = voicelive_sessions[interview_id]

    # Stop immediately (non-blocking)
    await voicelive.stop()

    # Get transcript that we have so far
    transcript = voicelive.get_transcript()

    # Update database immediately with what we have
    result = await db.execute(
        select(Interview).where(Interview.id == interview_id)
    )
    interview = result.scalar_one_or_none()
    if interview:
        interview.status = InterviewStatus.COMPLETED.value
        interview.completed_at = datetime.utcnow()
        if interview.started_at:
            interview.duration_minutes = int(
                (datetime.utcnow() - interview.started_at).total_seconds() / 60
            )
        interview.transcript = transcript
        await db.commit()

    # Cleanup session
    if interview_id in voicelive_sessions:
        del voicelive_sessions[interview_id]

    # Generate evaluation in background
    async def generate_eval():
        try:
            evaluation = voicelive.generate_evaluation()
            async with async_session() as session:
                result = await session.execute(
                    select(Interview).where(Interview.id == interview_id)
                )
                interview_record = result.scalar_one_or_none()
                if interview_record:
                    interview_record.evaluation = evaluation
                    await session.commit()
        except Exception as e:
            print(f"[VoiceLive] Error generating evaluation: {e}")

    import asyncio
    asyncio.create_task(generate_eval())

    return {"status": "completed", "message": "Interview stopped. Evaluation generating..."}


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


@router.post("/{interview_id}/respond-mic")
async def process_candidate_microphone(
    interview_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Listen from server's microphone and process candidate's response.

    For demo purposes when browser mic permissions are blocked.
    Requires USE_AZURE_SPEECH_SERVICE=true.
    """
    from app.config import get_settings
    settings = get_settings()

    if not settings.use_azure_speech_service:
        raise HTTPException(
            status_code=400,
            detail="Server-side microphone requires USE_AZURE_SPEECH_SERVICE=true"
        )

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

    # Listen from server microphone
    try:
        candidate_text = voice_service.listen_from_microphone(timeout_seconds=15)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Microphone error: {str(e)}")

    if not candidate_text:
        return {
            "candidate_transcript": "",
            "ai_message": "I didn't catch that. Could you please repeat?",
            "ai_audio_base64": None,
            "is_complete": False,
            "phase": engine.current_phase if hasattr(engine, 'current_phase') else "unknown",
        }

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
