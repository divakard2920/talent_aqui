from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from pydantic import BaseModel

from app.models.database import get_db
from app.models.candidate_group import CandidateGroup, candidate_group_association
from app.models.candidate import Candidate

router = APIRouter(prefix="/candidate-groups", tags=["candidate-groups"])


class GroupCreate(BaseModel):
    name: str
    description: str | None = None
    color: str = "#4F46E5"


class GroupUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None


class GroupResponse(BaseModel):
    id: int
    name: str
    description: str | None
    color: str
    candidate_count: int = 0

    class Config:
        from_attributes = True


@router.get("/", response_model=list[GroupResponse])
async def list_groups(db: AsyncSession = Depends(get_db)):
    """List all candidate groups with candidate counts."""
    result = await db.execute(select(CandidateGroup))
    groups = result.scalars().all()

    # Get candidate counts for each group
    response = []
    for group in groups:
        count_result = await db.execute(
            select(func.count()).select_from(candidate_group_association).where(
                candidate_group_association.c.group_id == group.id
            )
        )
        count = count_result.scalar() or 0
        response.append(GroupResponse(
            id=group.id,
            name=group.name,
            description=group.description,
            color=group.color,
            candidate_count=count
        ))

    return response


@router.post("/", response_model=GroupResponse)
async def create_group(group: GroupCreate, db: AsyncSession = Depends(get_db)):
    """Create a new candidate group."""
    # Check if group with same name exists
    result = await db.execute(
        select(CandidateGroup).where(CandidateGroup.name == group.name)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Group with this name already exists")

    new_group = CandidateGroup(
        name=group.name,
        description=group.description,
        color=group.color,
    )
    db.add(new_group)
    await db.commit()
    await db.refresh(new_group)

    return GroupResponse(
        id=new_group.id,
        name=new_group.name,
        description=new_group.description,
        color=new_group.color,
        candidate_count=0
    )


@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(group_id: int, group: GroupUpdate, db: AsyncSession = Depends(get_db)):
    """Update a candidate group."""
    result = await db.execute(select(CandidateGroup).where(CandidateGroup.id == group_id))
    existing = result.scalar_one_or_none()
    if not existing:
        raise HTTPException(status_code=404, detail="Group not found")

    if group.name is not None:
        existing.name = group.name
    if group.description is not None:
        existing.description = group.description
    if group.color is not None:
        existing.color = group.color

    await db.commit()
    await db.refresh(existing)

    # Get count
    count_result = await db.execute(
        select(func.count()).select_from(candidate_group_association).where(
            candidate_group_association.c.group_id == group_id
        )
    )
    count = count_result.scalar() or 0

    return GroupResponse(
        id=existing.id,
        name=existing.name,
        description=existing.description,
        color=existing.color,
        candidate_count=count
    )


@router.delete("/{group_id}")
async def delete_group(group_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a candidate group."""
    result = await db.execute(select(CandidateGroup).where(CandidateGroup.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Delete associations first
    await db.execute(
        delete(candidate_group_association).where(
            candidate_group_association.c.group_id == group_id
        )
    )

    await db.delete(group)
    await db.commit()
    return {"message": "Group deleted successfully"}


@router.get("/{group_id}/candidates")
async def get_group_candidates(group_id: int, db: AsyncSession = Depends(get_db)):
    """Get all candidates in a group."""
    result = await db.execute(select(CandidateGroup).where(CandidateGroup.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Get candidate IDs in this group
    result = await db.execute(
        select(candidate_group_association.c.candidate_id).where(
            candidate_group_association.c.group_id == group_id
        )
    )
    candidate_ids = [row[0] for row in result.fetchall()]

    if not candidate_ids:
        return []

    # Get candidates
    result = await db.execute(
        select(Candidate).where(Candidate.id.in_(candidate_ids))
    )
    return result.scalars().all()


@router.post("/{group_id}/candidates/{candidate_id}")
async def add_candidate_to_group(group_id: int, candidate_id: int, db: AsyncSession = Depends(get_db)):
    """Add a candidate to a group."""
    # Verify group exists
    result = await db.execute(select(CandidateGroup).where(CandidateGroup.id == group_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Group not found")

    # Verify candidate exists
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Check if already in group
    result = await db.execute(
        select(candidate_group_association).where(
            candidate_group_association.c.group_id == group_id,
            candidate_group_association.c.candidate_id == candidate_id
        )
    )
    if result.fetchone():
        return {"message": "Candidate already in group"}

    # Add to group
    await db.execute(
        candidate_group_association.insert().values(
            group_id=group_id,
            candidate_id=candidate_id
        )
    )
    await db.commit()
    return {"message": "Candidate added to group"}


@router.delete("/{group_id}/candidates/{candidate_id}")
async def remove_candidate_from_group(group_id: int, candidate_id: int, db: AsyncSession = Depends(get_db)):
    """Remove a candidate from a group."""
    await db.execute(
        delete(candidate_group_association).where(
            candidate_group_association.c.group_id == group_id,
            candidate_group_association.c.candidate_id == candidate_id
        )
    )
    await db.commit()
    return {"message": "Candidate removed from group"}


@router.post("/{group_id}/candidates/bulk")
async def add_candidates_bulk(group_id: int, candidate_ids: list[int], db: AsyncSession = Depends(get_db)):
    """Add multiple candidates to a group."""
    # Verify group exists
    result = await db.execute(select(CandidateGroup).where(CandidateGroup.id == group_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Group not found")

    # Get existing associations
    result = await db.execute(
        select(candidate_group_association.c.candidate_id).where(
            candidate_group_association.c.group_id == group_id
        )
    )
    existing_ids = {row[0] for row in result.fetchall()}

    # Add new associations
    new_ids = set(candidate_ids) - existing_ids
    for cid in new_ids:
        await db.execute(
            candidate_group_association.insert().values(
                group_id=group_id,
                candidate_id=cid
            )
        )

    await db.commit()
    return {"message": f"Added {len(new_ids)} candidates to group"}
