from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import get_db
from app.models.candidate import Candidate, CandidateJobMatch
from app.schemas.candidate import CandidateResponse, CandidateMatchResponse

router = APIRouter(prefix="/candidates", tags=["candidates"])


@router.get("/", response_model=list[CandidateResponse])
async def list_candidates(
    skip: int = 0,
    limit: int = 20,
    source: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List all candidates."""
    query = select(Candidate)
    if source:
        query = query.where(Candidate.source == source)
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(candidate_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific candidate."""
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.get("/{candidate_id}/matches", response_model=list[CandidateMatchResponse])
async def get_candidate_matches(
    candidate_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get all job matches for a candidate."""
    # Verify candidate exists
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Get matches
    result = await db.execute(
        select(CandidateJobMatch).where(CandidateJobMatch.candidate_id == candidate_id)
    )
    return result.scalars().all()


@router.delete("/{candidate_id}")
async def delete_candidate(candidate_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a candidate and all associated records."""
    from app.models.interview import Interview
    from app.models.walkin_drive import DriveRegistration

    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Delete associated interviews first
    await db.execute(
        Interview.__table__.delete().where(
            Interview.candidate_id == candidate_id
        )
    )

    # Clear candidate_id from drive registrations (don't delete registrations)
    await db.execute(
        DriveRegistration.__table__.update()
        .where(DriveRegistration.candidate_id == candidate_id)
        .values(candidate_id=None, interview_id=None)
    )

    # Delete associated matches
    await db.execute(
        CandidateJobMatch.__table__.delete().where(
            CandidateJobMatch.candidate_id == candidate_id
        )
    )

    await db.delete(candidate)
    await db.commit()
    return {"message": "Candidate deleted successfully"}


@router.get("/shortlisted/{job_id}", response_model=list[CandidateResponse])
async def get_shortlisted_candidates(
    job_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get all shortlisted candidates for a job."""
    result = await db.execute(
        select(Candidate)
        .join(CandidateJobMatch)
        .where(
            CandidateJobMatch.job_id == job_id,
            CandidateJobMatch.status == "shortlisted",
        )
    )
    return result.scalars().all()


@router.get("/{candidate_id}/groups")
async def get_candidate_groups(candidate_id: int, db: AsyncSession = Depends(get_db)):
    """Get all groups a candidate belongs to."""
    from app.models.candidate_group import CandidateGroup, candidate_group_association

    # Verify candidate exists
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Get group IDs for this candidate
    result = await db.execute(
        select(candidate_group_association.c.group_id).where(
            candidate_group_association.c.candidate_id == candidate_id
        )
    )
    group_ids = [row[0] for row in result.fetchall()]

    if not group_ids:
        return []

    # Get groups
    result = await db.execute(
        select(CandidateGroup).where(CandidateGroup.id.in_(group_ids))
    )
    return result.scalars().all()
