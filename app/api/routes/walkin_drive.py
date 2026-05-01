"""
Walk-in Drive API Routes - Endpoints for managing walk-in recruitment drives.
"""

import random
import string
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.database import get_db
from app.models.job import Job
from app.models.walkin_drive import WalkInDrive, DriveRegistration, DriveStatus, RegistrationStatus
from app.schemas.walkin_drive import (
    DriveCreate, DriveUpdate, DriveResponse,
    GenerateQuestionsRequest, Question,
    RegistrationCreate, RegistrationResponse,
    CheckInRequest, CheckInResponse,
    StartTestResponse, TestQuestion, SubmitTestRequest, TestResultResponse,
    LeaderboardEntry, DriveStats,
)
from app.services.question_generator import question_generator

router = APIRouter(prefix="/walkin-drives", tags=["walkin-drives"])


def generate_registration_code() -> str:
    """Generate a unique 8-character registration code."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


def generate_slug(title: str) -> str:
    """Generate URL-friendly slug from title."""
    slug = title.lower().replace(' ', '-')
    slug = ''.join(c for c in slug if c.isalnum() or c == '-')
    return f"{slug}-{random.randint(1000, 9999)}"


# --- Drive Management ---

@router.post("/", response_model=DriveResponse)
async def create_drive(request: DriveCreate, db: AsyncSession = Depends(get_db)):
    """Create a new walk-in drive."""
    # Verify job exists
    result = await db.execute(select(Job).where(Job.id == request.job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    drive = WalkInDrive(
        job_id=request.job_id,
        title=request.title,
        drive_date=request.drive_date,
        slots=[s.model_dump() for s in request.slots] if request.slots else None,
        total_capacity=request.total_capacity,
        test_enabled=request.test_enabled,
        questions_per_candidate=request.questions_per_candidate,
        test_duration_minutes=request.test_duration_minutes,
        passing_score_percent=request.passing_score_percent,
        status=DriveStatus.DRAFT.value,
        registration_slug=generate_slug(request.title),
    )

    db.add(drive)
    await db.commit()
    await db.refresh(drive)

    return drive


@router.get("/", response_model=list[DriveResponse])
async def list_drives(
    status: str | None = None,
    job_id: int | None = None,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """List all walk-in drives."""
    query = select(WalkInDrive)

    if status:
        query = query.where(WalkInDrive.status == status)
    if job_id:
        query = query.where(WalkInDrive.job_id == job_id)

    query = query.order_by(WalkInDrive.drive_date.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    drives = result.scalars().all()

    # Add counts
    response = []
    for drive in drives:
        drive_dict = {
            "id": drive.id,
            "job_id": drive.job_id,
            "title": drive.title,
            "drive_date": drive.drive_date,
            "slots": drive.slots,
            "total_capacity": drive.total_capacity,
            "test_enabled": drive.test_enabled,
            "questions_per_candidate": drive.questions_per_candidate,
            "test_duration_minutes": drive.test_duration_minutes,
            "passing_score_percent": drive.passing_score_percent,
            "question_bank": drive.question_bank,
            "status": drive.status,
            "registration_slug": drive.registration_slug,
            "created_at": drive.created_at,
            "updated_at": drive.updated_at,
        }

        # Get counts
        reg_count = await db.execute(
            select(func.count(DriveRegistration.id)).where(DriveRegistration.drive_id == drive.id)
        )
        drive_dict["registered_count"] = reg_count.scalar() or 0

        checkin_count = await db.execute(
            select(func.count(DriveRegistration.id)).where(
                DriveRegistration.drive_id == drive.id,
                DriveRegistration.checked_in_at.isnot(None)
            )
        )
        drive_dict["checked_in_count"] = checkin_count.scalar() or 0

        tested_count = await db.execute(
            select(func.count(DriveRegistration.id)).where(
                DriveRegistration.drive_id == drive.id,
                DriveRegistration.test_completed_at.isnot(None)
            )
        )
        drive_dict["tested_count"] = tested_count.scalar() or 0

        response.append(drive_dict)

    return response


@router.get("/{drive_id}", response_model=DriveResponse)
async def get_drive(drive_id: int, db: AsyncSession = Depends(get_db)):
    """Get drive details."""
    result = await db.execute(select(WalkInDrive).where(WalkInDrive.id == drive_id))
    drive = result.scalar_one_or_none()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
    return drive


@router.patch("/{drive_id}", response_model=DriveResponse)
async def update_drive(drive_id: int, request: DriveUpdate, db: AsyncSession = Depends(get_db)):
    """Update drive details."""
    result = await db.execute(select(WalkInDrive).where(WalkInDrive.id == drive_id))
    drive = result.scalar_one_or_none()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "slots" and value:
            value = [s.model_dump() if hasattr(s, 'model_dump') else s for s in value]
        setattr(drive, field, value)

    await db.commit()
    await db.refresh(drive)
    return drive


@router.delete("/{drive_id}")
async def delete_drive(drive_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a drive."""
    result = await db.execute(select(WalkInDrive).where(WalkInDrive.id == drive_id))
    drive = result.scalar_one_or_none()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    await db.delete(drive)
    await db.commit()
    return {"status": "deleted"}


# --- Question Generation ---

@router.post("/{drive_id}/generate-questions")
async def generate_questions(
    drive_id: int,
    request: GenerateQuestionsRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate question bank for a drive using LLM."""
    result = await db.execute(
        select(WalkInDrive).where(WalkInDrive.id == drive_id)
    )
    drive = result.scalar_one_or_none()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    # Get job details
    result = await db.execute(select(Job).where(Job.id == drive.job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    print(f"[GenerateQuestions] Job: {job.title}")
    print(f"[GenerateQuestions] Skills Required: {job.skills_required}")
    print(f"[GenerateQuestions] Skills Preferred: {job.skills_preferred}")
    print(f"[GenerateQuestions] Experience: {job.experience_min_years}-{job.experience_max_years} years")

    # Generate questions
    questions = question_generator.generate_question_bank(
        job_title=job.title,
        skills_required=job.skills_required or [],
        skills_preferred=job.skills_preferred or [],
        experience_min_years=job.experience_min_years or 0,
        experience_max_years=job.experience_max_years or 5,
        job_description=job.description or "",
        total_questions=request.total_questions,
        mcq_ratio=request.mcq_ratio,
        difficulty_distribution=request.difficulty_distribution,
    )

    # Save to drive
    drive.question_bank = questions
    await db.commit()

    return {"status": "generated", "question_count": len(questions), "questions": questions}


@router.put("/{drive_id}/questions")
async def update_questions(
    drive_id: int,
    questions: list[dict],
    db: AsyncSession = Depends(get_db),
):
    """Update/edit the question bank."""
    result = await db.execute(select(WalkInDrive).where(WalkInDrive.id == drive_id))
    drive = result.scalar_one_or_none()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    drive.question_bank = questions
    await db.commit()

    return {"status": "updated", "question_count": len(questions)}


# --- Registration ---

@router.post("/{drive_id}/register", response_model=RegistrationResponse)
async def register_candidate(
    drive_id: int,
    request: RegistrationCreate,
    db: AsyncSession = Depends(get_db),
):
    """Register a candidate for a walk-in drive."""
    result = await db.execute(select(WalkInDrive).where(WalkInDrive.id == drive_id))
    drive = result.scalar_one_or_none()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    if drive.status not in [DriveStatus.REGISTRATION_OPEN.value, DriveStatus.DRAFT.value]:
        raise HTTPException(status_code=400, detail="Registration is not open for this drive")

    # Check if already registered
    result = await db.execute(
        select(DriveRegistration).where(
            DriveRegistration.drive_id == drive_id,
            DriveRegistration.email == request.email,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Already registered with this email")

    registration = DriveRegistration(
        drive_id=drive_id,
        name=request.name,
        email=request.email,
        phone=request.phone,
        experience_years=request.experience_years,
        current_company=request.current_company,
        current_role=request.current_role,
        selected_slot=request.selected_slot,
        registration_code=generate_registration_code(),
        status=RegistrationStatus.REGISTERED.value,
    )

    db.add(registration)
    await db.commit()
    await db.refresh(registration)

    return registration


@router.get("/register/{slug}")
async def get_drive_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    """Get drive details by registration slug (public endpoint)."""
    result = await db.execute(
        select(WalkInDrive).where(WalkInDrive.registration_slug == slug)
    )
    drive = result.scalar_one_or_none()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    # Get job details
    result = await db.execute(select(Job).where(Job.id == drive.job_id))
    job = result.scalar_one_or_none()

    return {
        "id": drive.id,
        "title": drive.title,
        "drive_date": drive.drive_date,
        "slots": drive.slots,
        "status": drive.status,
        "test_enabled": drive.test_enabled,
        "job": {
            "id": job.id,
            "title": job.title,
            "department": job.department,
            "location": job.location,
            "description": job.description,
            "skills_required": job.skills_required,
            "experience_min_years": job.experience_min_years,
            "experience_max_years": job.experience_max_years,
        } if job else None,
    }


@router.get("/{drive_id}/registrations")
async def list_registrations(
    drive_id: int,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List all registrations for a drive with interview data."""
    from app.models.interview import Interview

    # Get drive for job_id
    result = await db.execute(select(WalkInDrive).where(WalkInDrive.id == drive_id))
    drive = result.scalar_one_or_none()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    query = select(DriveRegistration).where(DriveRegistration.drive_id == drive_id)

    if status:
        query = query.where(DriveRegistration.status == status)

    query = query.order_by(DriveRegistration.registered_at.desc())

    result = await db.execute(query)
    registrations = result.scalars().all()

    # Get all candidate IDs that might have interviews
    candidate_ids = [reg.candidate_id for reg in registrations if reg.candidate_id]
    interviews_map = {}
    if candidate_ids:
        result = await db.execute(
            select(Interview).where(
                Interview.candidate_id.in_(candidate_ids),
                Interview.job_id == drive.job_id,
            )
        )
        interviews = result.scalars().all()
        for interview in interviews:
            interviews_map[interview.candidate_id] = interview

    # Build response with interview data
    response = []
    for reg in registrations:
        interview = interviews_map.get(reg.candidate_id) if reg.candidate_id else None
        interview_score = None
        if interview and interview.evaluation:
            interview_score = interview.evaluation.get("overall_score")

        reg_dict = {
            "id": reg.id,
            "drive_id": reg.drive_id,
            "candidate_id": reg.candidate_id,
            "name": reg.name,
            "email": reg.email,
            "phone": reg.phone,
            "experience_years": reg.experience_years,
            "current_company": reg.current_company,
            "current_role": reg.current_role,
            "selected_slot": reg.selected_slot,
            "registration_code": reg.registration_code,
            "token_number": reg.token_number,
            "status": reg.status,
            "checked_in_at": reg.checked_in_at,
            "test_score": reg.test_score,
            "test_passed": reg.test_passed,
            "test_score_breakdown": reg.test_score_breakdown,
            "assigned_questions": reg.assigned_questions,
            "answers": reg.answers,
            "registered_at": reg.registered_at,
            "interview_status": interview.status if interview else None,
            "interview_score": interview_score,
        }
        response.append(reg_dict)

    return response


# --- Check-in ---

@router.post("/{drive_id}/checkin", response_model=CheckInResponse)
async def check_in_candidate(
    drive_id: int,
    request: CheckInRequest,
    db: AsyncSession = Depends(get_db),
):
    """Check in a candidate at the drive."""
    result = await db.execute(select(WalkInDrive).where(WalkInDrive.id == drive_id))
    drive = result.scalar_one_or_none()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    # Find registration
    query = select(DriveRegistration).where(DriveRegistration.drive_id == drive_id)

    if request.registration_code:
        query = query.where(DriveRegistration.registration_code == request.registration_code)
    elif request.phone:
        query = query.where(DriveRegistration.phone == request.phone)
    elif request.email:
        query = query.where(DriveRegistration.email == request.email)
    else:
        raise HTTPException(status_code=400, detail="Provide registration_code, phone, or email")

    result = await db.execute(query)
    registration = result.scalar_one_or_none()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    if registration.checked_in_at:
        raise HTTPException(status_code=400, detail="Already checked in")

    # Assign token number
    result = await db.execute(
        select(func.max(DriveRegistration.token_number)).where(
            DriveRegistration.drive_id == drive_id
        )
    )
    max_token = result.scalar() or 0
    token_number = max_token + 1

    registration.token_number = token_number
    registration.checked_in_at = datetime.utcnow()
    registration.status = RegistrationStatus.CHECKED_IN.value

    await db.commit()
    await db.refresh(registration)

    return CheckInResponse(
        registration=registration,
        token_number=token_number,
        message=f"Checked in successfully. Token number: {token_number}",
    )


# --- Walk-in Registration (Front Desk) ---

@router.post("/{drive_id}/walkin", response_model=CheckInResponse)
async def walkin_register(
    drive_id: int,
    request: RegistrationCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a walk-in candidate at the front desk.
    Combines registration + check-in + token assignment in one step.
    """
    result = await db.execute(select(WalkInDrive).where(WalkInDrive.id == drive_id))
    drive = result.scalar_one_or_none()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    # Check if already registered by email or phone
    result = await db.execute(
        select(DriveRegistration).where(
            DriveRegistration.drive_id == drive_id,
            (DriveRegistration.email == request.email) | (DriveRegistration.phone == request.phone),
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        if existing.checked_in_at:
            raise HTTPException(status_code=400, detail=f"Already checked in with token #{existing.token_number}")
        # Already registered but not checked in - check them in now
        result = await db.execute(
            select(func.max(DriveRegistration.token_number)).where(
                DriveRegistration.drive_id == drive_id
            )
        )
        max_token = result.scalar() or 0
        token_number = max_token + 1

        existing.token_number = token_number
        existing.checked_in_at = datetime.utcnow()
        existing.status = RegistrationStatus.CHECKED_IN.value

        await db.commit()
        await db.refresh(existing)

        return CheckInResponse(
            registration=existing,
            token_number=token_number,
            message=f"Welcome back! Token number: {token_number}",
        )

    # Assign token number
    result = await db.execute(
        select(func.max(DriveRegistration.token_number)).where(
            DriveRegistration.drive_id == drive_id
        )
    )
    max_token = result.scalar() or 0
    token_number = max_token + 1

    # Create registration with immediate check-in
    registration = DriveRegistration(
        drive_id=drive_id,
        name=request.name,
        email=request.email,
        phone=request.phone,
        experience_years=request.experience_years,
        current_company=request.current_company,
        current_role=request.current_role,
        registration_code=generate_registration_code(),
        token_number=token_number,
        checked_in_at=datetime.utcnow(),
        status=RegistrationStatus.CHECKED_IN.value,
    )

    db.add(registration)
    await db.commit()
    await db.refresh(registration)

    return CheckInResponse(
        registration=registration,
        token_number=token_number,
        message=f"Registered successfully! Token number: {token_number}",
    )


@router.post("/{drive_id}/walkin-with-resume")
async def walkin_register_with_resume(
    drive_id: int,
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    experience_years: float = Form(None),
    current_company: str = Form(None),
    current_role: str = Form(None),
    resume: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Register a walk-in candidate with resume upload (required).
    """
    import os
    import uuid as uuid_lib

    result = await db.execute(select(WalkInDrive).where(WalkInDrive.id == drive_id))
    drive = result.scalar_one_or_none()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    # Check if already registered
    result = await db.execute(
        select(DriveRegistration).where(
            DriveRegistration.drive_id == drive_id,
            (DriveRegistration.email == email) | (DriveRegistration.phone == phone),
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        if existing.checked_in_at:
            raise HTTPException(status_code=400, detail=f"Already checked in with token #{existing.token_number}")

    # Save resume if provided
    resume_path = None
    if resume and resume.filename:
        upload_dir = "uploads/walkin_resumes"
        os.makedirs(upload_dir, exist_ok=True)
        file_ext = os.path.splitext(resume.filename)[1]
        unique_filename = f"{uuid_lib.uuid4().hex}{file_ext}"
        resume_path = os.path.join(upload_dir, unique_filename)

        with open(resume_path, "wb") as f:
            content = await resume.read()
            f.write(content)

    # Assign token number
    result = await db.execute(
        select(func.max(DriveRegistration.token_number)).where(
            DriveRegistration.drive_id == drive_id
        )
    )
    max_token = result.scalar() or 0
    token_number = max_token + 1

    # Create registration
    registration = DriveRegistration(
        drive_id=drive_id,
        name=name,
        email=email,
        phone=phone,
        experience_years=experience_years,
        current_company=current_company,
        current_role=current_role,
        resume_path=resume_path,
        registration_code=generate_registration_code(),
        token_number=token_number,
        checked_in_at=datetime.utcnow(),
        status=RegistrationStatus.CHECKED_IN.value,
    )

    db.add(registration)
    await db.commit()
    await db.refresh(registration)

    return {
        "registration": {
            "id": registration.id,
            "name": registration.name,
            "token_number": registration.token_number,
            "status": registration.status,
        },
        "token_number": token_number,
        "message": f"Registered successfully! Token number: {token_number}",
    }


# --- Test Taking ---

@router.post("/{drive_id}/registrations/{registration_id}/start-test", response_model=StartTestResponse)
async def start_test(
    drive_id: int,
    registration_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Start the test for a candidate. Assigns random questions."""
    result = await db.execute(select(WalkInDrive).where(WalkInDrive.id == drive_id))
    drive = result.scalar_one_or_none()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    if drive.status != DriveStatus.ONGOING.value:
        raise HTTPException(status_code=400, detail="Drive is not active. Test can only be taken when drive is ongoing.")

    if not drive.test_enabled:
        raise HTTPException(status_code=400, detail="Test is not enabled for this drive")

    if not drive.question_bank:
        raise HTTPException(status_code=400, detail="Question bank not generated")

    result = await db.execute(
        select(DriveRegistration).where(
            DriveRegistration.id == registration_id,
            DriveRegistration.drive_id == drive_id,
        )
    )
    registration = result.scalar_one_or_none()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    if not registration.checked_in_at:
        raise HTTPException(status_code=400, detail="Candidate not checked in")

    if registration.test_started_at:
        raise HTTPException(status_code=400, detail="Test already started")

    # Select random questions
    all_questions = drive.question_bank
    num_questions = min(drive.questions_per_candidate, len(all_questions))
    selected_questions = random.sample(all_questions, num_questions)
    selected_ids = [q["id"] for q in selected_questions]

    # Update registration
    registration.assigned_questions = selected_ids
    registration.test_started_at = datetime.utcnow()
    registration.status = RegistrationStatus.TESTING.value

    await db.commit()

    # Return questions without answers
    test_questions = []
    for q in selected_questions:
        tq = TestQuestion(
            id=q["id"],
            type=q["type"],
            skill=q.get("skill", ""),
            question=q["question"],
            options=[{"label": o["label"], "text": o["text"]} for o in q.get("options", [])] if q.get("options") else None,
            points=q.get("points", 5),
        )
        test_questions.append(tq)

    return StartTestResponse(
        registration_id=registration_id,
        questions=test_questions,
        duration_minutes=drive.test_duration_minutes,
        started_at=registration.test_started_at,
    )


@router.get("/{drive_id}/registrations/{registration_id}/resume-test")
async def resume_test(
    drive_id: int,
    registration_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Resume a test that was started but not completed (e.g., candidate closed tab)."""
    result = await db.execute(select(WalkInDrive).where(WalkInDrive.id == drive_id))
    drive = result.scalar_one_or_none()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    result = await db.execute(
        select(DriveRegistration).where(
            DriveRegistration.id == registration_id,
            DriveRegistration.drive_id == drive_id,
        )
    )
    registration = result.scalar_one_or_none()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    if not registration.test_started_at:
        raise HTTPException(status_code=400, detail="Test not started")

    if registration.test_completed_at:
        raise HTTPException(status_code=400, detail="Test already completed")

    # Calculate remaining time
    elapsed = (datetime.utcnow() - registration.test_started_at).total_seconds()
    total_seconds = drive.test_duration_minutes * 60
    remaining_seconds = max(0, int(total_seconds - elapsed))

    if remaining_seconds <= 0:
        raise HTTPException(status_code=400, detail="Test time has expired")

    # Get assigned questions
    question_map = {q["id"]: q for q in drive.question_bank}
    assigned_ids = registration.assigned_questions or []

    test_questions = []
    for q_id in assigned_ids:
        q = question_map.get(q_id)
        if q:
            test_questions.append({
                "id": q["id"],
                "type": q["type"],
                "skill": q.get("skill", ""),
                "question": q["question"],
                "options": [{"label": o["label"], "text": o["text"]} for o in q.get("options", [])] if q.get("options") else None,
                "points": q.get("points", 5),
            })

    return {
        "registration_id": registration_id,
        "questions": test_questions,
        "remaining_seconds": remaining_seconds,
        "answers": registration.answers or {},  # Return previously saved answers
    }


@router.post("/{drive_id}/registrations/{registration_id}/submit-test", response_model=TestResultResponse)
async def submit_test(
    drive_id: int,
    registration_id: int,
    request: SubmitTestRequest,
    db: AsyncSession = Depends(get_db),
):
    """Submit test answers and get score."""
    result = await db.execute(select(WalkInDrive).where(WalkInDrive.id == drive_id))
    drive = result.scalar_one_or_none()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    result = await db.execute(
        select(DriveRegistration).where(
            DriveRegistration.id == registration_id,
            DriveRegistration.drive_id == drive_id,
        )
    )
    registration = result.scalar_one_or_none()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    if registration.test_completed_at:
        raise HTTPException(status_code=400, detail="Test already submitted")

    if not registration.test_started_at:
        raise HTTPException(status_code=400, detail="Test not started")

    # Get assigned questions
    question_map = {q["id"]: q for q in drive.question_bank}
    assigned_ids = registration.assigned_questions or []

    # Score answers
    total_points = 0
    earned_points = 0
    mcq_points = 0
    mcq_earned = 0
    short_points = 0
    short_earned = 0

    for q_id in assigned_ids:
        question = question_map.get(q_id)
        if not question:
            continue

        points = question.get("points", 5)
        total_points += points
        answer = request.answers.get(q_id, "")

        if question["type"] == "mcq":
            mcq_points += points
            if answer.upper() == question.get("correct_answer", "").upper():
                earned_points += points
                mcq_earned += points

        elif question["type"] == "short_answer":
            short_points += points
            # Use LLM to score
            score_result = question_generator.score_short_answer(
                question=question["question"],
                expected_keywords=question.get("expected_keywords", []),
                candidate_answer=answer,
                max_points=points,
            )
            score = score_result.get("score", 0)
            earned_points += score
            short_earned += score

    # Calculate percentage
    score_percent = (earned_points / total_points * 100) if total_points > 0 else 0
    passed = score_percent >= drive.passing_score_percent

    # Update registration
    registration.answers = request.answers
    registration.test_completed_at = datetime.utcnow()
    registration.test_score = score_percent
    registration.test_score_breakdown = {
        "mcq": {"earned": mcq_earned, "total": mcq_points},
        "short_answer": {"earned": short_earned, "total": short_points},
    }
    registration.test_passed = passed
    registration.status = RegistrationStatus.TEST_COMPLETED.value

    await db.commit()

    return TestResultResponse(
        registration_id=registration_id,
        score=earned_points,
        total_points=total_points,
        earned_points=earned_points,
        score_percent=score_percent,
        passed=passed,
        passing_score_percent=drive.passing_score_percent,
        breakdown=registration.test_score_breakdown,
        completed_at=registration.test_completed_at,
    )


# --- Results & Leaderboard ---

@router.get("/{drive_id}/leaderboard", response_model=list[LeaderboardEntry])
async def get_leaderboard(drive_id: int, db: AsyncSession = Depends(get_db)):
    """Get ranked leaderboard of candidates."""
    from app.models.interview import Interview

    # Get drive for job_id
    result = await db.execute(select(WalkInDrive).where(WalkInDrive.id == drive_id))
    drive = result.scalar_one_or_none()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    result = await db.execute(
        select(DriveRegistration)
        .where(DriveRegistration.drive_id == drive_id)
        .order_by(DriveRegistration.test_score.desc().nullslast())
    )
    registrations = result.scalars().all()

    # Get all candidate IDs that have interviews
    candidate_ids = [reg.candidate_id for reg in registrations if reg.candidate_id]
    interviews_map = {}
    if candidate_ids:
        result = await db.execute(
            select(Interview).where(
                Interview.candidate_id.in_(candidate_ids),
                Interview.job_id == drive.job_id,
            )
        )
        interviews = result.scalars().all()
        for interview in interviews:
            interviews_map[interview.candidate_id] = interview

    leaderboard = []
    for i, reg in enumerate(registrations):
        interview = interviews_map.get(reg.candidate_id) if reg.candidate_id else None
        interview_score = None
        if interview and interview.evaluation:
            interview_score = interview.evaluation.get("overall_score")

        leaderboard.append(LeaderboardEntry(
            rank=i + 1,
            registration_id=reg.id,
            name=reg.name,
            email=reg.email,
            phone=reg.phone,
            experience_years=reg.experience_years,
            test_score=reg.test_score,
            test_passed=reg.test_passed,
            status=reg.status,
            checked_in_at=reg.checked_in_at,
            interview_status=interview.status if interview else None,
            interview_score=interview_score,
        ))

    return leaderboard


@router.get("/{drive_id}/stats", response_model=DriveStats)
async def get_drive_stats(drive_id: int, db: AsyncSession = Depends(get_db)):
    """Get drive statistics."""
    result = await db.execute(
        select(DriveRegistration).where(DriveRegistration.drive_id == drive_id)
    )
    registrations = result.scalars().all()

    total = len(registrations)
    checked_in = sum(1 for r in registrations if r.checked_in_at)
    tested = sum(1 for r in registrations if r.test_completed_at)
    passed = sum(1 for r in registrations if r.test_passed)
    failed = sum(1 for r in registrations if r.test_passed is False)
    no_show = sum(1 for r in registrations if r.status == RegistrationStatus.NO_SHOW.value)
    shortlisted = sum(1 for r in registrations if r.status == RegistrationStatus.SHORTLISTED.value)

    scores = [r.test_score for r in registrations if r.test_score is not None]
    avg_score = sum(scores) / len(scores) if scores else None

    return DriveStats(
        total_registered=total,
        checked_in=checked_in,
        tested=tested,
        passed=passed,
        failed=failed,
        no_show=no_show,
        shortlisted=shortlisted,
        average_score=avg_score,
    )


# --- Candidate Test Portal ---

@router.get("/{drive_id}/lookup")
async def lookup_candidate(
    drive_id: int,
    phone: str | None = None,
    token: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Lookup a candidate by phone or token number for test portal."""
    result = await db.execute(select(WalkInDrive).where(WalkInDrive.id == drive_id))
    drive = result.scalar_one_or_none()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    query = select(DriveRegistration).where(DriveRegistration.drive_id == drive_id)

    if token:
        query = query.where(DriveRegistration.token_number == token)
    elif phone:
        query = query.where(DriveRegistration.phone == phone)
    else:
        raise HTTPException(status_code=400, detail="Provide phone or token")

    result = await db.execute(query)
    registration = result.scalar_one_or_none()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    if not registration.checked_in_at:
        raise HTTPException(status_code=400, detail="Not checked in yet")

    # Calculate remaining time if test started
    remaining_seconds = None
    if registration.test_started_at and not registration.test_completed_at:
        elapsed = (datetime.utcnow() - registration.test_started_at).total_seconds()
        total_seconds = drive.test_duration_minutes * 60
        remaining_seconds = max(0, int(total_seconds - elapsed))

    # Check for existing interview
    from app.models.interview import Interview
    interview_status = None
    interview_id = None
    interview_score = None
    if registration.candidate_id:
        result = await db.execute(
            select(Interview).where(
                Interview.candidate_id == registration.candidate_id,
                Interview.job_id == drive.job_id,
            ).order_by(Interview.created_at.desc())
        )
        interview = result.scalar_one_or_none()
        if interview:
            interview_id = interview.id
            interview_status = interview.status
            if interview.evaluation:
                interview_score = interview.evaluation.get("overall_score")

    return {
        "registration_id": registration.id,
        "name": registration.name,
        "token_number": registration.token_number,
        "status": registration.status,
        "test_started": registration.test_started_at is not None,
        "test_started_at": registration.test_started_at.isoformat() if registration.test_started_at else None,
        "test_completed": registration.test_completed_at is not None,
        "test_score": registration.test_score,
        "test_passed": registration.test_passed,
        "test_enabled": drive.test_enabled,
        "test_duration_minutes": drive.test_duration_minutes,
        "remaining_seconds": remaining_seconds,
        "drive_status": drive.status,
        "interview_id": interview_id,
        "interview_status": interview_status,
        "interview_score": interview_score,
    }


@router.post("/{drive_id}/registrations/{registration_id}/shortlist")
async def shortlist_candidate(
    drive_id: int,
    registration_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Shortlist a candidate."""
    result = await db.execute(
        select(DriveRegistration).where(
            DriveRegistration.id == registration_id,
            DriveRegistration.drive_id == drive_id,
        )
    )
    registration = result.scalar_one_or_none()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    registration.status = RegistrationStatus.SHORTLISTED.value
    await db.commit()

    return {"status": "shortlisted"}


@router.post("/{drive_id}/registrations/{registration_id}/reject")
async def reject_candidate(
    drive_id: int,
    registration_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Reject a candidate."""
    result = await db.execute(
        select(DriveRegistration).where(
            DriveRegistration.id == registration_id,
            DriveRegistration.drive_id == drive_id,
        )
    )
    registration = result.scalar_one_or_none()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    registration.status = RegistrationStatus.REJECTED.value
    await db.commit()

    return {"status": "rejected"}


@router.post("/{drive_id}/registrations/{registration_id}/start-interview")
async def start_walkin_interview(
    drive_id: int,
    registration_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Create an interview for a shortlisted walk-in candidate.
    Creates a candidate record if needed, then creates the interview.
    """
    from app.models.candidate import Candidate
    from app.models.interview import Interview, InterviewStatus

    # Get drive and registration
    result = await db.execute(select(WalkInDrive).where(WalkInDrive.id == drive_id))
    drive = result.scalar_one_or_none()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    result = await db.execute(
        select(DriveRegistration).where(
            DriveRegistration.id == registration_id,
            DriveRegistration.drive_id == drive_id,
        )
    )
    registration = result.scalar_one_or_none()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    if registration.status != RegistrationStatus.SHORTLISTED.value:
        raise HTTPException(status_code=400, detail="Candidate must be shortlisted to start interview")

    # Check if candidate already exists (by email)
    result = await db.execute(
        select(Candidate).where(Candidate.email == registration.email)
    )
    candidate = result.scalar_one_or_none()

    if not candidate:
        # Create new candidate record
        candidate = Candidate(
            name=registration.name,
            email=registration.email,
            phone=registration.phone,
            resume_file_path=registration.resume_path if hasattr(registration, 'resume_path') else None,
            source="walkin_drive",
            source_id=f"drive_{drive_id}_reg_{registration_id}",
        )
        db.add(candidate)
        await db.commit()
        await db.refresh(candidate)

    # Link candidate to registration
    registration.candidate_id = candidate.id
    await db.commit()

    # Check if interview already exists for this candidate and job
    result = await db.execute(
        select(Interview).where(
            Interview.candidate_id == candidate.id,
            Interview.job_id == drive.job_id,
        ).order_by(Interview.created_at.desc())
    )
    existing_interview = result.scalar_one_or_none()

    if existing_interview:
        # Return existing interview
        return {
            "interview_id": existing_interview.id,
            "candidate_id": candidate.id,
            "job_id": drive.job_id,
            "status": existing_interview.status,
        }

    # Create new interview only if none exists
    interview = Interview(
        candidate_id=candidate.id,
        job_id=drive.job_id,
        status=InterviewStatus.SCHEDULED.value,
    )
    db.add(interview)
    await db.commit()
    await db.refresh(interview)

    return {
        "interview_id": interview.id,
        "candidate_id": candidate.id,
        "job_id": drive.job_id,
        "status": interview.status,
    }


@router.get("/{drive_id}/interviews")
async def get_drive_interviews(
    drive_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Get all interviews for candidates registered in this specific drive.
    This filters by both job_id AND candidate_ids from this drive's registrations.
    """
    from app.models.candidate import Candidate
    from app.models.interview import Interview
    from app.models.job import Job

    # Get drive
    result = await db.execute(select(WalkInDrive).where(WalkInDrive.id == drive_id))
    drive = result.scalar_one_or_none()
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    # Get all candidate_ids from registrations in this drive
    result = await db.execute(
        select(DriveRegistration.candidate_id).where(
            DriveRegistration.drive_id == drive_id,
            DriveRegistration.candidate_id.isnot(None),
        )
    )
    candidate_ids = [row[0] for row in result.fetchall()]

    if not candidate_ids:
        return []

    # Get interviews for these specific candidates AND this job
    result = await db.execute(
        select(Interview)
        .where(
            Interview.job_id == drive.job_id,
            Interview.candidate_id.in_(candidate_ids),
        )
        .order_by(Interview.created_at.desc())
    )
    interviews = result.scalars().all()

    # Build response with candidate info
    response = []
    for interview in interviews:
        # Get candidate details
        cand_result = await db.execute(
            select(Candidate).where(Candidate.id == interview.candidate_id)
        )
        candidate = cand_result.scalar_one_or_none()

        # Get job details
        job_result = await db.execute(
            select(Job).where(Job.id == interview.job_id)
        )
        job = job_result.scalar_one_or_none()

        response.append({
            "id": interview.id,
            "candidate_id": interview.candidate_id,
            "job_id": interview.job_id,
            "status": interview.status,
            "scheduled_at": interview.scheduled_at,
            "started_at": interview.started_at,
            "ended_at": interview.ended_at,
            "duration_minutes": interview.duration_minutes,
            "evaluation": interview.evaluation,
            "created_at": interview.created_at,
            "candidate": {
                "id": candidate.id,
                "name": candidate.name,
                "email": candidate.email,
                "phone": candidate.phone,
            } if candidate else None,
            "job": {
                "id": job.id,
                "title": job.title,
            } if job else None,
        })

    return response
