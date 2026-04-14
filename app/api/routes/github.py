from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.models.database import get_db
from app.models.candidate import Candidate
from app.models.job import Job
from app.services.github_sourcing import get_github_service
from app.schemas.candidate import CandidateResponse

router = APIRouter(prefix="/github", tags=["github-sourcing"])


class GitHubSearchRequest(BaseModel):
    skills: list[str] | None = None
    location: str | None = None
    language: str | None = None  # Primary programming language
    min_repos: int = 5
    min_followers: int = 10
    max_results: int = 20
    job_id: int | None = None  # Optional: match against a job posting
    github_token: str | None = None  # Optional: for higher rate limits


class GitHubProfileRequest(BaseModel):
    username: str
    job_id: int | None = None
    github_token: str | None = None


class ImportCandidateRequest(BaseModel):
    username: str
    github_token: str | None = None


@router.post("/search")
async def search_github_candidates(
    request: GitHubSearchRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Search GitHub for developer candidates.

    This endpoint searches GitHub users based on skills, location, and other criteria,
    then analyzes their profiles using AI to assess fit.
    """
    github_service = get_github_service(request.github_token)

    # Get job requirements if job_id provided
    job_requirements = None
    if request.job_id:
        result = await db.execute(select(Job).where(Job.id == request.job_id))
        job = result.scalar_one_or_none()
        if job:
            job_requirements = {
                "title": job.title,
                "description": job.description,
                "requirements": job.requirements,
                "skills_required": job.skills_required or [],
                "skills_preferred": job.skills_preferred or [],
                "experience_min_years": job.experience_min_years,
                "experience_max_years": job.experience_max_years,
            }

    try:
        candidates = await github_service.source_candidates(
            skills=request.skills,
            location=request.location,
            language=request.language,
            min_repos=request.min_repos,
            min_followers=request.min_followers,
            max_results=request.max_results,
            analyze=True,
            job_requirements=job_requirements,
        )

        return {
            "total": len(candidates),
            "candidates": candidates,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GitHub search failed: {str(e)}")


@router.post("/analyze")
async def analyze_github_profile(
    request: GitHubProfileRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze a specific GitHub profile.

    Provide a username to get detailed analysis including AI assessment.
    """
    github_service = get_github_service(request.github_token)

    # Get job requirements if job_id provided
    job_requirements = None
    if request.job_id:
        result = await db.execute(select(Job).where(Job.id == request.job_id))
        job = result.scalar_one_or_none()
        if job:
            job_requirements = {
                "title": job.title,
                "description": job.description,
                "requirements": job.requirements,
                "skills_required": job.skills_required or [],
                "skills_preferred": job.skills_preferred or [],
                "experience_min_years": job.experience_min_years,
                "experience_max_years": job.experience_max_years,
            }

    try:
        # Get profile
        profile = await github_service.analyze_profile(request.username)

        # Run AI assessment
        assessment = await github_service.generate_ai_assessment(
            profile, job_requirements
        )

        return {
            "profile": {
                "username": profile.username,
                "name": profile.name,
                "email": profile.email,
                "bio": profile.bio,
                "location": profile.location,
                "company": profile.company,
                "blog": profile.blog,
                "public_repos": profile.public_repos,
                "followers": profile.followers,
                "following": profile.following,
                "total_stars": profile.total_stars,
                "languages": profile.languages,
                "profile_url": profile.profile_url,
                "avatar_url": profile.avatar_url,
                "hireable": profile.hireable,
                "created_at": profile.created_at,
                "top_repositories": profile.top_repositories,
                "linkedin_url": profile.linkedin_url,
                "twitter_url": profile.twitter_url,
                "social_accounts": profile.social_accounts,
            },
            "ai_assessment": assessment,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Profile analysis failed: {str(e)}"
        )


@router.post("/import", response_model=CandidateResponse)
async def import_github_candidate(
    request: ImportCandidateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Import a GitHub profile as a candidate into the system.

    This creates a candidate record from a GitHub profile for tracking and matching.
    """
    github_service = get_github_service(request.github_token)

    try:
        # Check if already imported
        result = await db.execute(
            select(Candidate).where(
                Candidate.source == "github",
                Candidate.source_id == request.username,
            )
        )
        existing = result.scalar_one_or_none()

        # Get profile
        profile = await github_service.analyze_profile(request.username)

        # Run AI assessment
        assessment = await github_service.generate_ai_assessment(profile)

        # Prepare parsed data
        parsed_data = {
            "name": profile.name,
            "email": profile.email,
            "location": profile.location,
            "bio": profile.bio,
            "company": profile.company,
            "skills": profile.languages + assessment.get("skills_detected", []),
            "github_profile": {
                "username": profile.username,
                "profile_url": profile.profile_url,
                "public_repos": profile.public_repos,
                "followers": profile.followers,
                "total_stars": profile.total_stars,
                "top_repositories": profile.top_repositories,
            },
            "ai_assessment": assessment,
            "total_years_experience": _estimate_experience(profile, assessment),
        }

        if existing:
            # Update existing candidate
            existing.name = profile.name or profile.username
            existing.email = profile.email
            existing.location = profile.location
            existing.parsed_data = parsed_data
            await db.commit()
            await db.refresh(existing)
            return existing

        # Create new candidate
        candidate = Candidate(
            name=profile.name or profile.username,
            email=profile.email or f"{profile.username}@github.placeholder",
            phone=None,
            location=profile.location,
            resume_file_path=None,
            resume_text=profile.bio,
            parsed_data=parsed_data,
            source="github",
            source_id=profile.username,
        )

        db.add(candidate)
        await db.commit()
        await db.refresh(candidate)
        return candidate

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.post("/source-for-job/{job_id}")
async def source_candidates_for_job(
    job_id: int,
    max_results: int = 20,
    github_token: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Source GitHub candidates based on a job posting.

    Analyzes the full job context (title, description, requirements)
    using AI to extract search criteria, then finds partially matching
    GitHub profiles.
    """
    from app.services.azure_openai import azure_openai_service

    # Get job
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != "open":
        raise HTTPException(status_code=400, detail=f"Cannot source for job with status '{job.status}'. Job must be open.")

    # Use AI to extract search criteria from full job context
    prompt = f"""Analyze this job posting and extract GitHub search criteria.

**Job Title:** {job.title}
**Department:** {job.department or 'N/A'}
**Description:** {job.description}
**Requirements:** {job.requirements}
**Required Skills:** {', '.join(job.skills_required or [])}
**Preferred Skills:** {', '.join(job.skills_preferred or [])}
**Experience:** {job.experience_min_years}-{job.experience_max_years or 'N/A'} years
**Location:** {job.location or 'N/A'}

Extract search criteria for finding matching GitHub developers. Return JSON:
{{
    "search_keywords": ["keyword1", "keyword2", ...],  // 5-8 key technologies/skills to search
    "primary_language": "Python",  // Main programming language or null
    "location": "location or null",  // Location if remote not acceptable
    "min_repos": 5,  // Minimum repos based on experience level
    "min_followers": 10  // Minimum followers based on seniority
}}

Focus on technologies and skills mentioned in description and requirements, not just the skills list.
Return ONLY valid JSON."""

    messages = [
        {"role": "system", "content": "You are an expert technical recruiter. Extract search criteria from job postings."},
        {"role": "user", "content": prompt},
    ]

    try:
        response = azure_openai_service.chat_completion(
            messages=messages,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        criteria = azure_openai_service.parse_json_response(response)
    except Exception as e:
        # Fallback to basic criteria
        criteria = {
            "search_keywords": job.skills_required or [],
            "primary_language": None,
            "location": job.location,
            "min_repos": 5,
            "min_followers": 10,
        }

    # Search GitHub with extracted criteria
    github_service = get_github_service(github_token)

    job_requirements = {
        "title": job.title,
        "description": job.description,
        "requirements": job.requirements,
        "skills_required": job.skills_required or [],
        "skills_preferred": job.skills_preferred or [],
        "experience_min_years": job.experience_min_years,
        "experience_max_years": job.experience_max_years,
    }

    try:
        candidates = await github_service.source_candidates(
            skills=criteria.get("search_keywords", []),
            location=criteria.get("location"),
            language=criteria.get("primary_language"),
            min_repos=criteria.get("min_repos", 5),
            min_followers=criteria.get("min_followers", 10),
            max_results=max_results,
            analyze=True,
            job_requirements=job_requirements,
        )

        return {
            "job_id": job_id,
            "job_title": job.title,
            "search_criteria": criteria,
            "total": len(candidates),
            "candidates": candidates,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GitHub sourcing failed: {str(e)}")


@router.get("/rate-limit")
async def check_rate_limit(github_token: str | None = None):
    """Check GitHub API rate limit status."""
    import httpx

    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if github_token:
        headers["Authorization"] = f"Bearer {github_token}"

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.github.com/rate_limit",
            headers=headers,
        )
        return response.json()


def _estimate_experience(profile, assessment: dict) -> float | None:
    """Estimate years of experience from GitHub profile."""
    experience_map = {
        "junior": 1.5,
        "mid": 4.0,
        "senior": 7.0,
        "principal": 12.0,
    }
    level = assessment.get("experience_level", "").lower()
    return experience_map.get(level)
