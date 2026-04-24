from datetime import date
from app.services.azure_openai import azure_openai_service
from app.schemas.candidate import ParsedResumeData


class ResumeAnalyzer:
    """Service for analyzing and parsing resume content using AI."""

    PARSE_RESUME_PROMPT = """You are an expert resume parser. Analyze the following resume text and extract structured information.

IMPORTANT: Today's date is {current_date}. Use this when calculating experience duration for "Present" or "Current" positions.

Return a JSON object with the following fields:
- name: Full name of the candidate
- email: Email address
- phone: Phone number
- location: City, State/Country
- summary: Brief professional summary (2-3 sentences)
- skills: List of technical and soft skills
- experience: List of work experiences, each with: company, title, start_date, end_date (use "Present" if current job), description
- education: List of education entries, each with: institution, degree, field, graduation_year
- certifications: List of certifications
- total_years_experience: Total years of professional experience (as a decimal number, e.g., 3.9 for 3 years 11 months)

CRITICAL for total_years_experience calculation:
1. Calculate the duration from the EARLIEST start_date to TODAY ({current_date}), NOT the sum of individual job durations
2. If jobs overlap, count that time only ONCE
3. For "Present" or "Current" positions, use today's date ({current_date}) as the end date
4. Example: If someone started their first job in May 2022 and is still working (April 2026), that's approximately 3.9 years, NOT the sum of all job durations

Resume Text:
{resume_text}

Return ONLY valid JSON, no additional text."""

    def parse_resume(self, resume_text: str) -> ParsedResumeData:
        """Parse resume text and extract structured data."""
        current_date = date.today().strftime("%B %Y")  # e.g., "April 2026"
        messages = [
            {
                "role": "system",
                "content": "You are an expert resume parser. Always respond with valid JSON only.",
            },
            {
                "role": "user",
                "content": self.PARSE_RESUME_PROMPT.format(
                    resume_text=resume_text,
                    current_date=current_date
                ),
            },
        ]

        response = azure_openai_service.chat_completion(
            messages=messages,
            temperature=0.1,  # Low temperature for consistent parsing
            response_format={"type": "json_object"},
        )

        parsed = azure_openai_service.parse_json_response(response)
        return ParsedResumeData(**parsed)

    def generate_ai_assessment(self, parsed_data: ParsedResumeData) -> dict:
        """Generate an AI assessment of the candidate profile."""
        experience_list = ""
        if parsed_data.experience:
            for exp in parsed_data.experience[:5]:  # Limit to 5 most recent
                if isinstance(exp, dict):
                    experience_list += f"- {exp.get('title', 'N/A')} at {exp.get('company', 'N/A')} ({exp.get('start_date', '')} - {exp.get('end_date', '')})\n"

        education_list = ""
        if parsed_data.education:
            for edu in parsed_data.education:
                if isinstance(edu, dict):
                    education_list += f"- {edu.get('degree', 'N/A')} in {edu.get('field', 'N/A')} from {edu.get('institution', 'N/A')}\n"

        prompt = f"""Analyze this candidate profile and provide an assessment.

**Candidate Profile:**
- Name: {parsed_data.name}
- Location: {parsed_data.location or 'Not specified'}
- Total Experience: {parsed_data.total_years_experience or 'Unknown'} years
- Skills: {', '.join(parsed_data.skills or []) or 'Not specified'}

**Work Experience:**
{experience_list or 'Not specified'}

**Education:**
{education_list or 'Not specified'}

**Certifications:** {', '.join(parsed_data.certifications or []) or 'None'}

**Summary from Resume:** {parsed_data.summary or 'Not provided'}

Provide an assessment in JSON format:
{{
    "overall_score": <0-100 general profile strength>,
    "experience_level": "<junior/mid/senior/principal based on years and roles>",
    "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
    "areas_for_growth": ["<area 1>", "<area 2>"],
    "summary": "<2-3 sentence professional summary highlighting key qualifications>",
    "top_skills": ["<skill 1>", "<skill 2>", "<skill 3>", "<skill 4>", "<skill 5>"],
    "career_trajectory": "<brief description of career progression>"
}}

Return ONLY valid JSON."""

        messages = [
            {
                "role": "system",
                "content": "You are an expert talent acquisition specialist. Provide objective, insightful candidate assessments.",
            },
            {"role": "user", "content": prompt},
        ]

        try:
            response = azure_openai_service.chat_completion(
                messages=messages,
                temperature=0.3,
                response_format={"type": "json_object"},
            )
            return azure_openai_service.parse_json_response(response)
        except Exception as e:
            print(f"[ResumeAnalyzer] AI assessment failed: {e}")
            # Return basic assessment on failure
            return {
                "overall_score": 50,
                "experience_level": "unknown",
                "strengths": [],
                "areas_for_growth": [],
                "summary": parsed_data.summary or "Assessment unavailable",
                "top_skills": (parsed_data.skills or [])[:5],
                "career_trajectory": "Unable to assess",
            }


resume_analyzer = ResumeAnalyzer()
