import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import async_session
from app.models.candidate import Candidate, CandidateJobMatch
from app.models.job import Job
from app.services.candidate_matcher import candidate_matcher
from app.schemas.candidate import ParsedResumeData


async def screen_candidates_for_job(job_id: int):
    """
    Background task to automatically screen all candidates for a new job.

    This runs after a job is created and:
    1. Fetches all candidates from the database
    2. Runs AI matching for each candidate against the job
    3. Stores match scores and recommendations
    """
    async with async_session() as db:
        try:
            # Get the job
            result = await db.execute(select(Job).where(Job.id == job_id))
            job = result.scalar_one_or_none()

            if not job:
                print(f"[Auto-Screen] Job {job_id} not found")
                return

            # Only screen for open jobs
            if job.status != "open":
                print(f"[Auto-Screen] Skipping job {job_id} - status is '{job.status}', not 'open'")
                return

            print(f"[Auto-Screen] Starting screening for job: {job.title} (ID: {job_id})")

            # Get all candidates with parsed data
            result = await db.execute(
                select(Candidate).where(Candidate.parsed_data.isnot(None))
            )
            candidates = result.scalars().all()

            if not candidates:
                print(f"[Auto-Screen] No candidates to screen for job {job_id}")
                return

            print(f"[Auto-Screen] Screening {len(candidates)} candidates...")

            screened_count = 0
            for candidate in candidates:
                try:
                    # Parse candidate data
                    parsed_data = ParsedResumeData(**(candidate.parsed_data or {}))

                    # Calculate match score using AI
                    match_result = candidate_matcher.calculate_match(parsed_data, job)

                    # Check for existing match
                    result = await db.execute(
                        select(CandidateJobMatch).where(
                            CandidateJobMatch.candidate_id == candidate.id,
                            CandidateJobMatch.job_id == job_id,
                        )
                    )
                    existing_match = result.scalar_one_or_none()

                    if existing_match:
                        # Skip rejected and shortlisted candidates during rescreening
                        # - Rejected: recruiter decided they're not a fit
                        # - Shortlisted: recruiter already approved, no need to re-evaluate
                        if existing_match.status in ("rejected", "shortlisted"):
                            print(f"[Auto-Screen] Skipping {existing_match.status} candidate {candidate.id}")
                            continue
                        # Update existing match (only pending candidates)
                        existing_match.overall_score = match_result.get("overall_score")
                        existing_match.skills_score = match_result.get("skills_score")
                        existing_match.experience_score = match_result.get("experience_score")
                        existing_match.education_score = match_result.get("education_score")
                        existing_match.analysis = match_result.get("analysis")
                    else:
                        # Create new match record
                        match = CandidateJobMatch(
                            candidate_id=candidate.id,
                            job_id=job_id,
                            overall_score=match_result.get("overall_score"),
                            skills_score=match_result.get("skills_score"),
                            experience_score=match_result.get("experience_score"),
                            education_score=match_result.get("education_score"),
                            analysis=match_result.get("analysis"),
                            status="pending",
                        )
                        db.add(match)

                    screened_count += 1

                    # Commit every 5 candidates to avoid long transactions
                    if screened_count % 5 == 0:
                        await db.commit()
                        print(f"[Auto-Screen] Processed {screened_count}/{len(candidates)} candidates")

                except Exception as e:
                    print(f"[Auto-Screen] Error screening candidate {candidate.id}: {e}")
                    continue

            # Final commit
            await db.commit()
            print(f"[Auto-Screen] Completed! Screened {screened_count} candidates for job {job_id}")

        except Exception as e:
            print(f"[Auto-Screen] Error in screening job {job_id}: {e}")
            await db.rollback()


def run_screening_background(job_id: int):
    """
    Wrapper to run the async screening function in a background thread.
    """
    asyncio.create_task(screen_candidates_for_job(job_id))
