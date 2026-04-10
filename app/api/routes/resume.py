import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import get_db
from app.models.candidate import Candidate, CandidateJobMatch
from app.models.job import Job
from app.schemas.candidate import CandidateResponse, CandidateMatchResponse, MatchResultResponse
from app.services.pdf_parser import pdf_parser
from app.services.resume_analyzer import resume_analyzer
from app.services.candidate_matcher import candidate_matcher
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.post("/upload", response_model=CandidateResponse)
async def upload_resume(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a resume PDF and create a candidate profile."""
    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    # Check file size
    content = await file.read()
    if len(content) > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds {settings.max_file_size_mb}MB limit",
        )

    # Save file
    os.makedirs(settings.upload_dir, exist_ok=True)
    file_id = str(uuid.uuid4())
    file_path = os.path.join(settings.upload_dir, f"{file_id}.pdf")

    with open(file_path, "wb") as f:
        f.write(content)

    # Extract text from PDF
    resume_text = pdf_parser.extract_text(file_path)
    if not resume_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")

    # Parse resume with AI
    parsed_data = resume_analyzer.parse_resume(resume_text)

    # Check if candidate already exists
    if parsed_data.email:
        result = await db.execute(
            select(Candidate).where(Candidate.email == parsed_data.email)
        )
        existing = result.scalar_one_or_none()
        if existing:
            # Update existing candidate
            existing.resume_file_path = file_path
            existing.resume_text = resume_text
            existing.parsed_data = parsed_data.model_dump()
            await db.commit()
            await db.refresh(existing)
            return existing

    # Create new candidate
    candidate = Candidate(
        name=parsed_data.name or "Unknown",
        email=parsed_data.email or f"unknown_{file_id}@placeholder.com",
        phone=parsed_data.phone,
        location=parsed_data.location,
        resume_file_path=file_path,
        resume_text=resume_text,
        parsed_data=parsed_data.model_dump(),
        source="upload",
    )

    db.add(candidate)
    await db.commit()
    await db.refresh(candidate)
    return candidate


@router.post("/match/{candidate_id}/{job_id}", response_model=CandidateMatchResponse)
async def match_candidate_to_job(
    candidate_id: int,
    job_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Calculate match score between a candidate and a job."""
    # Get candidate
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Get job
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check for existing match
    result = await db.execute(
        select(CandidateJobMatch).where(
            CandidateJobMatch.candidate_id == candidate_id,
            CandidateJobMatch.job_id == job_id,
        )
    )
    existing_match = result.scalar_one_or_none()

    # Calculate match
    from app.schemas.candidate import ParsedResumeData

    parsed_data = ParsedResumeData(**(candidate.parsed_data or {}))
    match_result = candidate_matcher.calculate_match(parsed_data, job)

    if existing_match:
        # Update existing match
        existing_match.overall_score = match_result.get("overall_score")
        existing_match.skills_score = match_result.get("skills_score")
        existing_match.experience_score = match_result.get("experience_score")
        existing_match.education_score = match_result.get("education_score")
        existing_match.analysis = match_result.get("analysis")
        await db.commit()
        await db.refresh(existing_match)
        return existing_match

    # Create new match record
    match = CandidateJobMatch(
        candidate_id=candidate_id,
        job_id=job_id,
        overall_score=match_result.get("overall_score"),
        skills_score=match_result.get("skills_score"),
        experience_score=match_result.get("experience_score"),
        education_score=match_result.get("education_score"),
        analysis=match_result.get("analysis"),
    )

    db.add(match)
    await db.commit()
    await db.refresh(match)
    return match


@router.post("/screen/{job_id}", response_model=list[MatchResultResponse])
async def screen_candidates_for_job(
    job_id: int,
    top_n: int = 10,
    db: AsyncSession = Depends(get_db),
):
    """Screen all candidates for a specific job and return ranked results."""
    # Get job
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Get all candidates
    result = await db.execute(select(Candidate))
    candidates = result.scalars().all()

    if not candidates:
        return []

    # Calculate matches for all candidates
    results = []
    from app.schemas.candidate import ParsedResumeData

    for candidate in candidates:
        parsed_data = ParsedResumeData(**(candidate.parsed_data or {}))
        match_result = candidate_matcher.calculate_match(parsed_data, job)

        # Save or update match in database
        result = await db.execute(
            select(CandidateJobMatch).where(
                CandidateJobMatch.candidate_id == candidate.id,
                CandidateJobMatch.job_id == job_id,
            )
        )
        existing_match = result.scalar_one_or_none()

        if existing_match:
            existing_match.overall_score = match_result.get("overall_score")
            existing_match.skills_score = match_result.get("skills_score")
            existing_match.experience_score = match_result.get("experience_score")
            existing_match.education_score = match_result.get("education_score")
            existing_match.analysis = match_result.get("analysis")
            match = existing_match
        else:
            match = CandidateJobMatch(
                candidate_id=candidate.id,
                job_id=job_id,
                overall_score=match_result.get("overall_score"),
                skills_score=match_result.get("skills_score"),
                experience_score=match_result.get("experience_score"),
                education_score=match_result.get("education_score"),
                analysis=match_result.get("analysis"),
            )
            db.add(match)

        results.append({"candidate": candidate, "match": match, "score": match_result.get("overall_score", 0)})

    await db.commit()

    # Sort by score and return top N
    results.sort(key=lambda x: x["score"] or 0, reverse=True)
    return [
        MatchResultResponse(candidate=r["candidate"], match=r["match"])
        for r in results[:top_n]
    ]


@router.patch("/shortlist/{match_id}")
async def update_shortlist_status(
    match_id: int,
    status: str,
    db: AsyncSession = Depends(get_db),
):
    """Update the shortlist status of a candidate-job match."""
    if status not in ["pending", "shortlisted", "rejected"]:
        raise HTTPException(
            status_code=400,
            detail="Status must be 'pending', 'shortlisted', or 'rejected'",
        )

    result = await db.execute(
        select(CandidateJobMatch).where(CandidateJobMatch.id == match_id)
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    match.status = status
    await db.commit()
    return {"message": f"Status updated to {status}"}
