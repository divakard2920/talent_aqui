from app.services.azure_openai import azure_openai_service
from app.schemas.candidate import ParsedResumeData


class ResumeAnalyzer:
    """Service for analyzing and parsing resume content using AI."""

    PARSE_RESUME_PROMPT = """You are an expert resume parser. Analyze the following resume text and extract structured information.

Return a JSON object with the following fields:
- name: Full name of the candidate
- email: Email address
- phone: Phone number
- location: City, State/Country
- summary: Brief professional summary (2-3 sentences)
- skills: List of technical and soft skills
- experience: List of work experiences, each with: company, title, start_date, end_date, description
- education: List of education entries, each with: institution, degree, field, graduation_year
- certifications: List of certifications
- total_years_experience: Estimated total years of professional experience (as a number)

Resume Text:
{resume_text}

Return ONLY valid JSON, no additional text."""

    def parse_resume(self, resume_text: str) -> ParsedResumeData:
        """Parse resume text and extract structured data."""
        messages = [
            {
                "role": "system",
                "content": "You are an expert resume parser. Always respond with valid JSON only.",
            },
            {
                "role": "user",
                "content": self.PARSE_RESUME_PROMPT.format(resume_text=resume_text),
            },
        ]

        response = azure_openai_service.chat_completion(
            messages=messages,
            temperature=0.1,  # Low temperature for consistent parsing
            response_format={"type": "json_object"},
        )

        parsed = azure_openai_service.parse_json_response(response)
        return ParsedResumeData(**parsed)

    def generate_summary(self, parsed_data: ParsedResumeData) -> str:
        """Generate a brief summary of the candidate."""
        messages = [
            {
                "role": "system",
                "content": "You are a talent acquisition specialist. Write concise, professional summaries.",
            },
            {
                "role": "user",
                "content": f"""Based on this candidate profile, write a 2-3 sentence professional summary:

Name: {parsed_data.name}
Skills: {', '.join(parsed_data.skills or [])}
Experience: {parsed_data.total_years_experience} years
Recent Role: {parsed_data.experience[0] if parsed_data.experience else 'N/A'}

Keep it brief and highlight key strengths.""",
            },
        ]

        return azure_openai_service.chat_completion(
            messages=messages,
            temperature=0.7,
            max_tokens=200,
        )


resume_analyzer = ResumeAnalyzer()
