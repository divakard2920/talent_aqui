from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Table
from sqlalchemy.sql import func

from app.models.database import Base


# Many-to-many association table
candidate_group_association = Table(
    'candidate_group_members',
    Base.metadata,
    Column('candidate_id', Integer, ForeignKey('candidates.id', ondelete='CASCADE'), primary_key=True),
    Column('group_id', Integer, ForeignKey('candidate_groups.id', ondelete='CASCADE'), primary_key=True),
)


class CandidateGroup(Base):
    __tablename__ = "candidate_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(String(500))
    color = Column(String(20), default="#4F46E5")  # For UI display
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
