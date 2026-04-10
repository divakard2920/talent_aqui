from app.services.azure_openai import azure_openai_service
from app.schemas.candidate import ParsedResumeData
from app.models.job import Job


class CandidateMatcher:
    """Service for matching candidates to job openings."""

    MATCH_PROMPT = """You are an expert talent acquisition specialist. Evaluate how well this candidate matches the job requirements.

JOB DETAILS:
Title: {job_title}
Description: {job_description}
Requirements: {job_requirements}
Required Skills: {required_skills}
Preferred Skills: {preferred_skills}
Experience Required: {experience_min}-{experience_max} years

CANDIDATE PROFILE:
Name: {candidate_name}
Total Experience: {candidate_experience} years
Skills: {candidate_skills}
Work History: {work_history}
Education: {education}

Evaluate the candidate and return a JSON object with:
- overall_score: 0-100 overall match score
- skills_score: 0-100 how well skills match
- experience_score: 0-100 how well experience matches
- education_score: 0-100 how well education matches
- strengths: List of candidate strengths for this role
- gaps: List of potential gaps or concerns
- recommendation: "strong_match", "good_match", "potential_match", or "not_recommended"
- analysis: 2-3 sentence summary of the match

Return ONLY valid JSON."""

    def calculate_match(
        self,
        candidate_data: ParsedResumeData,
        job: Job,
    ) -> dict:
        """Calculate match score between candidate and job."""
        # Format work history for prompt
        work_history = ""
        if candidate_data.experience:
            for exp in candidate_data.experience[:3]:  # Last 3 roles
                if isinstance(exp, dict):
                    work_history += f"- {exp.get('title', 'N/A')} at {exp.get('company', 'N/A')}\n"

        # Format education
        education = ""
        if candidate_data.education:
            for edu in candidate_data.education:
                if isinstance(edu, dict):
                    education += f"- {edu.get('degree', 'N/A')} in {edu.get('field', 'N/A')} from {edu.get('institution', 'N/A')}\n"

        messages = [
            {
                "role": "system",
                "content": "You are an expert talent acquisition specialist. Always respond with valid JSON only.",
            },
            {
                "role": "user",
                "content": self.MATCH_PROMPT.format(
                    job_title=job.title,
                    job_description=job.description,
                    job_requirements=job.requirements,
                    required_skills=", ".join(job.skills_required or []),
                    preferred_skills=", ".join(job.skills_preferred or []),
                    experience_min=job.experience_min_years or 0,
                    experience_max=job.experience_max_years or "N/A",
                    candidate_name=candidate_data.name,
                    candidate_experience=candidate_data.total_years_experience or "Unknown",
                    candidate_skills=", ".join(candidate_data.skills or []),
                    work_history=work_history or "Not provided",
                    education=education or "Not provided",
                ),
            },
        ]

        response = azure_openai_service.chat_completion(
            messages=messages,
            temperature=0.2,
            response_format={"type": "json_object"},
        )

        return azure_openai_service.parse_json_response(response)

    def rank_candidates(
        self,
        candidates_with_scores: list[dict],
        top_n: int = 10,
    ) -> list[dict]:
        """Rank candidates by their match scores and return top N."""
        sorted_candidates = sorted(
            candidates_with_scores,
            key=lambda x: x.get("overall_score", 0),
            reverse=True,
        )
        return sorted_candidates[:top_n]


candidate_matcher = CandidateMatcher()
