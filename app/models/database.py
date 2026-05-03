from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=True)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session


async def init_db():
    # Import all models to ensure they're registered with Base
    from app.models.job import Job
    from app.models.candidate import Candidate, CandidateJobMatch
    from app.models.interview import Interview
    from app.models.walkin_drive import WalkInDrive, DriveRegistration
    from sqlalchemy import text

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Add missing columns (simple migration for SQLite)
        try:
            await conn.execute(text("ALTER TABLE walkin_drives ADD COLUMN is_registration_open BOOLEAN DEFAULT 1"))
        except Exception:
            pass  # Column already exists
        try:
            await conn.execute(text("ALTER TABLE walkin_drives ADD COLUMN question_type VARCHAR(20) DEFAULT 'mixed'"))
        except Exception:
            pass  # Column already exists
