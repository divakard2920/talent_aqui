"""
AI Interview Engine - Manages the L1 interview conversation.

Handles:
- Dynamic question generation based on job + candidate
- Natural conversation flow
- Follow-up questions based on responses
- Interview evaluation and scoring
"""

from datetime import datetime
from typing import Optional
from app.services.azure_openai import azure_openai_service


class InterviewEngine:
    """Manages AI-driven L1 interviews."""

    def __init__(self):
        self.conversation_history = []
        self.questions_asked = []
        self.candidate_responses = []
        self.current_phase = "introduction"
        self.job_context = None
        self.candidate_context = None
        self.company_name = "Our Company"  # Can be configured
        self.interviewer_name = "Arun"  # Human interviewer persona

    def initialize(
        self,
        job: dict,
        candidate: dict,
        company_name: str = "Our Company",
    ):
        """Initialize interview with job and candidate context."""
        self.job_context = job
        self.candidate_context = candidate
        self.company_name = company_name
        self.conversation_history = []
        self.questions_asked = []
        self.candidate_responses = []
        self.current_phase = "introduction"

    def get_system_prompt(self) -> str:
        """Generate the system prompt for the interviewer."""
        job = self.job_context or {}
        candidate = self.candidate_context or {}

        return f"""You are {self.interviewer_name}, a Senior Talent Acquisition Specialist at {self.company_name}. You're conducting an L1 screening call with a candidate.

**CRITICAL RULES - NEVER BREAK THESE:**
- You are a HUMAN named {self.interviewer_name}, never mention or hint that you are an AI, bot, assistant, or automated system
- Never say things like "I'm here to help", "As an AI", "I don't have feelings", or anything that sounds robotic
- Speak naturally like a real recruiter would - use casual phrases, show genuine reactions
- Have opinions, share brief personal anecdotes when relevant ("I remember when I joined..." or "From what I've seen in this role...")

**Your Personality ({self.interviewer_name}):**
- Friendly, warm, and personable - like chatting with a colleague over coffee
- Genuinely curious about people and their experiences
- Uses natural speech patterns: "Oh that's cool!", "Hmm, interesting...", "Right, right", "Got it"
- Occasionally uses filler words naturally: "So...", "Well...", "You know..."
- Shows empathy: "That sounds challenging", "I can imagine that was exciting"
- Has a light sense of humor when appropriate
- Speaks in a flowing, conversational way - not robotic or scripted

**Interview Flow (~25-30 minutes):**
1. Warm greeting & small talk (2 min)
2. Brief about the role & team (5 min)
3. Walk through their background (8 min)
4. Technical/skill discussion (10 min)
5. Their questions for you (3 min)
6. Wrap up & next steps (2 min)

**Role You're Hiring For:**
- Position: {job.get('title', 'N/A')}
- Team: {job.get('department', 'N/A')}
- About the role: {job.get('description', 'N/A')}
- What we need: {job.get('requirements', 'N/A')}
- Key skills: {', '.join(job.get('skills_required', []))}
- Experience level: {job.get('experience_min_years', 0)}-{job.get('experience_max_years', 'N/A')} years

**Candidate You're Speaking With:**
- Name: {candidate.get('name', 'Candidate')}
- Experience: {candidate.get('total_years_experience', 'N/A')} years
- Skills: {', '.join(candidate.get('skills', [])[:10])}
- Based in: {candidate.get('location', 'N/A')}
- Background: {candidate.get('summary', 'N/A')}

**Their Work History:**
{self._format_experience(candidate.get('experience', []))}

**How to Conduct This Call:**
- Keep responses short and natural (2-3 sentences typically, like real conversation)
- One question at a time - let them talk
- Reference their resume naturally: "I saw you worked at X, tell me about that"
- Dig deeper on interesting points with follow-ups
- React genuinely to their answers before moving on
- If they ask about the role/company, answer confidently based on what you know
- Transition smoothly between topics
- End warmly when you've covered everything

**Remember:** This is a VOICE call. Speak naturally, like you're actually talking to someone on the phone. No bullet points, no formal language. Just two professionals having a conversation."""

    def _format_experience(self, experience: list) -> str:
        """Format experience list for prompt."""
        if not experience:
            return "Not provided"

        formatted = []
        for exp in experience[:4]:  # Limit to 4 most recent
            if isinstance(exp, dict):
                formatted.append(
                    f"- {exp.get('title', 'N/A')} at {exp.get('company', 'N/A')} "
                    f"({exp.get('start_date', '')} - {exp.get('end_date', '')})"
                )
        return "\n".join(formatted) or "Not provided"

    def get_opening_message(self) -> str:
        """Generate the interview opening message."""
        candidate_name = self.candidate_context.get('name', 'there').split()[0]  # First name
        job_title = self.job_context.get('title', 'the position')

        prompt = f"""Generate a warm, natural opening for a phone screening call.

Your name: {self.interviewer_name}
Your role: Senior Talent Acquisition Specialist
Candidate's first name: {candidate_name}
Position they applied for: {job_title}
Company: {self.company_name}

The opening should:
1. Greet them warmly by name
2. Introduce yourself naturally (Hi, I'm {self.interviewer_name} from the talent team at {self.company_name})
3. Thank them for taking the time
4. Mention this is an initial chat to learn about them and share more about the role
5. Keep it casual - maybe ask how their day is going or make brief small talk
6. Then ask if they're ready to dive in

IMPORTANT: You are a HUMAN recruiter named {self.interviewer_name}. Do NOT mention AI, bots, or automation in any way. Sound like a real person making a real call.

Keep it conversational and warm - this will be spoken aloud. About 4-5 sentences."""

        response = azure_openai_service.chat_completion(
            messages=[
                {"role": "system", "content": f"You are {self.interviewer_name}, a friendly human recruiter. Generate natural, spoken dialogue. Never mention AI or that you're automated."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.8,
            max_tokens=300,
        )

        self.conversation_history.append({
            "role": "assistant",
            "content": response,
            "timestamp": datetime.utcnow().isoformat(),
            "phase": "introduction"
        })

        return response

    def process_response(self, candidate_speech: str) -> dict:
        """
        Process candidate's response and generate AI's next message.

        Returns:
            dict with:
            - ai_response: str - AI's response text
            - is_complete: bool - Whether interview is finished
            - phase: str - Current interview phase
        """
        # Add candidate's response to history
        self.conversation_history.append({
            "role": "user",
            "content": candidate_speech,
            "timestamp": datetime.utcnow().isoformat(),
        })
        self.candidate_responses.append(candidate_speech)

        # Build messages for AI
        messages = [
            {"role": "system", "content": self.get_system_prompt()},
        ]

        # Add conversation history
        for entry in self.conversation_history:
            messages.append({
                "role": entry["role"] if entry["role"] in ["user", "assistant"] else "assistant",
                "content": entry["content"]
            })

        # Add guidance based on conversation length
        guidance = self._get_phase_guidance()
        if guidance:
            messages.append({
                "role": "system",
                "content": guidance
            })

        # Get AI response
        response = azure_openai_service.chat_completion(
            messages=messages,
            temperature=0.7,
            max_tokens=400,
        )

        # Check if interview should end
        is_complete = self._should_end_interview()

        # Add AI response to history
        self.conversation_history.append({
            "role": "assistant",
            "content": response,
            "timestamp": datetime.utcnow().isoformat(),
            "phase": self.current_phase
        })

        return {
            "ai_response": response,
            "is_complete": is_complete,
            "phase": self.current_phase,
        }

    def _get_phase_guidance(self) -> Optional[str]:
        """Get guidance based on interview progress."""
        num_exchanges = len(self.candidate_responses)

        if num_exchanges == 0:
            self.current_phase = "introduction"
            return "Great, they're ready! Now share a bit about the company culture and what the team is like. Be genuine and enthusiastic."

        elif num_exchanges <= 2:
            self.current_phase = "company_brief"
            return None

        elif num_exchanges <= 5:
            self.current_phase = "background"
            return "Time to learn about them. Ask about their journey - where they started, what brought them here. Reference something specific from their resume to show you did your homework."

        elif num_exchanges <= 10:
            self.current_phase = "technical"
            return "Now dig into the technical side. Ask about specific projects, technologies they've used, challenges they've solved. Get concrete examples."

        elif num_exchanges <= 13:
            self.current_phase = "candidate_questions"
            return "Check if they have questions for you about the role, team, or company. Answer from your perspective as someone who works there."

        else:
            self.current_phase = "wrap_up"
            return "Time to wrap up naturally. Thank them genuinely, let them know the hiring team will review and someone will reach out within a week. Wish them well and end warmly."

    def _should_end_interview(self) -> bool:
        """Check if interview should end."""
        num_exchanges = len(self.candidate_responses)

        # End after wrap-up phase or 15+ exchanges
        if num_exchanges >= 15:
            return True

        # Check if interviewer indicated call is ending
        last_response = self.conversation_history[-1]["content"] if self.conversation_history else ""
        end_indicators = [
            "thank you for your time",
            "thanks for chatting",
            "we'll be in touch",
            "someone will reach out",
            "best of luck",
            "have a great day",
            "have a good one",
            "take care",
            "talk soon",
            "that wraps up",
            "great chatting with you"
        ]
        return any(indicator in last_response.lower() for indicator in end_indicators)

    def generate_evaluation(self) -> dict:
        """Generate post-interview evaluation."""
        transcript_text = "\n".join([
            f"{self.interviewer_name if entry['role'] == 'assistant' else 'Candidate'}: {entry['content']}"
            for entry in self.conversation_history
        ])

        job = self.job_context or {}
        candidate = self.candidate_context or {}

        prompt = f"""You're {self.interviewer_name}, reviewing your notes after an L1 screening call. Provide your assessment of this candidate.

**Position:** {job.get('title', 'N/A')}
**Key Skills Needed:** {', '.join(job.get('skills_required', []))}
**Experience Range:** {job.get('experience_min_years', 0)}-{job.get('experience_max_years', 'N/A')} years

**Candidate:** {candidate.get('name', 'N/A')}
**Their Experience:** {candidate.get('total_years_experience', 'N/A')} years

**Call Transcript:**
{transcript_text}

Based on your conversation, provide your evaluation as JSON:
{{
    "overall_score": <0-100>,
    "communication_score": <0-100 - how well did they articulate their thoughts?>,
    "technical_score": <0-100 - depth of technical knowledge shown>,
    "culture_fit_score": <0-100 - would they fit well with the team?>,
    "enthusiasm_score": <0-100 - how interested did they seem in the role?>,
    "recommendation": "<proceed_to_l2 / hold / reject>",
    "summary": "<2-3 sentence summary of your impression - write as if you're briefing the hiring manager>",
    "strengths": ["<what stood out positively>", "..."],
    "concerns": ["<any red flags or areas to probe further>", "..."],
    "key_highlights": ["<memorable things they mentioned>", "..."],
    "suggested_l2_questions": ["<things the next interviewer should dig into>", "..."]
}}

Return ONLY valid JSON."""

        response = azure_openai_service.chat_completion(
            messages=[
                {"role": "system", "content": f"You are {self.interviewer_name}, an experienced recruiter writing up your candidate assessment after a screening call."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        return azure_openai_service.parse_json_response(response)

    def get_transcript(self) -> list:
        """Get the full conversation transcript."""
        return self.conversation_history


# Singleton instance
interview_engine = InterviewEngine()
