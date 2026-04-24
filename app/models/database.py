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

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
