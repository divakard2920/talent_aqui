from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import get_db
from app.models.job import Job
from app.models.candidate import CandidateJobMatch
from app.schemas.job import JobCreate, JobResponse
from app.services.auto_screening import screen_candidates_for_job

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("/", response_model=JobResponse)
async def create_job(
    job: JobCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new job posting.

    After creation, automatically screens all existing candidates
    against this job in the background.
    """
    db_job = Job(**job.model_dump())
    db.add(db_job)
    await db.commit()
    await db.refresh(db_job)

    # Trigger automatic screening in background
    background_tasks.add_task(screen_candidates_for_job, db_job.id)

    return db_job


@router.get("/", response_model=list[JobResponse])
async def list_jobs(
    status: str | None = None,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """List all job postings."""
    query = select(Job)
    if status:
        query = query.where(Job.status == status)
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific job posting."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.patch("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    job_update: dict,
    db: AsyncSession = Depends(get_db),
):
    """Update a job posting."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    for key, value in job_update.items():
        if hasattr(job, key):
            setattr(job, key, value)

    await db.commit()
    await db.refresh(job)
    return job


@router.delete("/{job_id}")
async def delete_job(job_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a job posting and all associated matches."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Delete associated candidate-job matches first
    await db.execute(
        CandidateJobMatch.__table__.delete().where(
            CandidateJobMatch.job_id == job_id
        )
    )

    await db.delete(job)
    await db.commit()
    return {"message": "Job deleted successfully"}


@router.get("/{job_id}/matches")
async def get_job_matches(
    job_id: int,
    top_n: int = 20,
    min_score: float = 0,
    db: AsyncSession = Depends(get_db),
):
    """
    Get top matched candidates for a job.

    Returns candidates ranked by their AI match score.
    """
    from app.models.candidate import Candidate

    # Verify job exists
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Get matches with candidate info
    result = await db.execute(
        select(CandidateJobMatch, Candidate)
        .join(Candidate, CandidateJobMatch.candidate_id == Candidate.id)
        .where(
            CandidateJobMatch.job_id == job_id,
            CandidateJobMatch.overall_score >= min_score,
        )
        .order_by(CandidateJobMatch.overall_score.desc())
        .limit(top_n)
    )
    rows = result.all()

    matches = []
    for match, candidate in rows:
        matches.append({
            "match_id": match.id,
            "candidate_id": candidate.id,
            "candidate_name": candidate.name,
            "candidate_email": candidate.email,
            "candidate_location": candidate.location,
            "source": candidate.source,
            "overall_score": match.overall_score,
            "skills_score": match.skills_score,
            "experience_score": match.experience_score,
            "education_score": match.education_score,
            "analysis": match.analysis,
            "status": match.status,
            "parsed_data": candidate.parsed_data,
        })

    return {
        "job_id": job_id,
        "job_title": job.title,
        "total_matches": len(matches),
        "matches": matches,
    }


@router.post("/{job_id}/rescreen")
async def rescreen_job(
    job_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Manually trigger re-screening of all candidates for a job.

    Useful after adding new candidates or updating job requirements.
    """
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != "open":
        raise HTTPException(status_code=400, detail=f"Cannot screen for job with status '{job.status}'. Job must be open.")

    background_tasks.add_task(screen_candidates_for_job, job_id)

    return {"message": f"Re-screening started for job: {job.title}"}
