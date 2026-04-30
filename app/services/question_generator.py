"""
Question Generator Service - Uses LLM to generate assessment questions.

Generates questions based on job skills and experience requirements.
"""

import uuid
import json
from typing import Optional
from app.services.azure_openai import azure_openai_service


class QuestionGenerator:
    """Generates assessment questions using LLM."""

    def generate_question_bank(
        self,
        job_title: str,
        skills_required: list[str],
        skills_preferred: list[str],
        experience_min_years: int,
        experience_max_years: int,
        job_description: str,
        total_questions: int = 50,
        mcq_ratio: float = 0.7,
        difficulty_distribution: Optional[dict] = None,
    ) -> list[dict]:
        """
        Generate a bank of questions for a walk-in drive.

        Args:
            job_title: Title of the job
            skills_required: List of required skills
            skills_preferred: List of preferred skills
            experience_min_years: Minimum years of experience
            experience_max_years: Maximum years of experience
            job_description: Full job description
            total_questions: Total questions to generate
            mcq_ratio: Ratio of MCQ questions (default 70%)
            difficulty_distribution: Distribution of difficulty levels

        Returns:
            List of question dictionaries
        """
        if not difficulty_distribution:
            difficulty_distribution = {
                "easy": 0.2,
                "intermediate": 0.5,
                "hard": 0.3
            }

        mcq_count = int(total_questions * mcq_ratio)
        short_answer_count = total_questions - mcq_count

        # Determine experience level description
        exp_level = self._get_experience_level(experience_min_years, experience_max_years)

        all_skills = list(set(skills_required + (skills_preferred or [])))

        prompt = f"""Generate assessment questions for a walk-in drive hiring event.

**Job Details:**
- Title: {job_title}
- Required Skills: {', '.join(skills_required)}
- Preferred Skills: {', '.join(skills_preferred) if skills_preferred else 'None'}
- Experience Required: {experience_min_years}-{experience_max_years} years ({exp_level})
- Description: {job_description[:500]}

**Question Requirements:**
- Total MCQ Questions: {mcq_count}
- Total Short Answer Questions: {short_answer_count}
- Difficulty Distribution: {json.dumps(difficulty_distribution)}

**Experience Level Guidelines ({exp_level}):**
{self._get_difficulty_guidelines(experience_min_years, experience_max_years)}

**Skills to Cover:**
Distribute questions across these skills proportionally: {', '.join(all_skills)}

**Output Format:**
Return a JSON array of questions. Each question must have:
- id: unique string (e.g., "q1", "q2")
- type: "mcq" or "short_answer"
- skill: which skill this tests
- difficulty: "easy", "intermediate", or "hard"
- question: the question text
- options: (for MCQ only) array of {{"label": "A", "text": "option text"}}
- correct_answer: (for MCQ only) the correct label ("A", "B", "C", or "D")
- expected_keywords: (for short_answer only) key concepts the answer should include
- points: 5 for easy, 10 for intermediate, 15 for hard

**Important:**
- Questions must match the {experience_min_years}-{experience_max_years} year experience level
- MCQ should have exactly 4 options (A, B, C, D)
- Short answer questions should be answerable in 2-3 sentences
- Cover practical, real-world scenarios relevant to the role
- Avoid trick questions or overly academic topics

Return ONLY valid JSON array, no other text."""

        try:
            print(f"[QuestionGenerator] Generating {total_questions} questions for {job_title}")
            print(f"[QuestionGenerator] Skills: {all_skills}")

            response = azure_openai_service.chat_completion(
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert technical recruiter creating assessment questions. Generate practical, fair questions that accurately test candidate skills at the specified experience level."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=4000,
                response_format={"type": "json_object"}
            )

            print(f"[QuestionGenerator] Raw response length: {len(response) if response else 0}")

            result = azure_openai_service.parse_json_response(response)
            print(f"[QuestionGenerator] Parsed result type: {type(result)}, keys: {result.keys() if isinstance(result, dict) else 'N/A'}")

            questions = result.get("questions", result) if isinstance(result, dict) else result

            if not isinstance(questions, list):
                print(f"[QuestionGenerator] Questions is not a list: {type(questions)}")
                return []

            # Add unique IDs if missing
            for i, q in enumerate(questions):
                if not q.get("id"):
                    q["id"] = f"q{i+1}_{uuid.uuid4().hex[:6]}"

            print(f"[QuestionGenerator] Generated {len(questions)} questions")
            return questions

        except Exception as e:
            import traceback
            print(f"[QuestionGenerator] Error generating questions: {e}")
            print(f"[QuestionGenerator] Traceback: {traceback.format_exc()}")
            return []

    def _get_experience_level(self, min_years: int, max_years: int) -> str:
        """Get experience level description."""
        avg = (min_years + max_years) / 2
        if avg <= 2:
            return "Entry Level / Fresher"
        elif avg <= 5:
            return "Mid Level"
        elif avg <= 8:
            return "Senior Level"
        else:
            return "Lead / Architect Level"

    def _get_difficulty_guidelines(self, min_years: int, max_years: int) -> str:
        """Get difficulty guidelines based on experience."""
        avg = (min_years + max_years) / 2

        if avg <= 2:
            return """
- Easy: Basic syntax, fundamental concepts, definitions
- Intermediate: Simple problem-solving, common use cases
- Hard: Understanding of best practices, basic design patterns"""

        elif avg <= 5:
            return """
- Easy: Core concepts review, common patterns
- Intermediate: Real-world scenarios, debugging, optimization basics
- Hard: Design decisions, trade-offs, integration challenges"""

        elif avg <= 8:
            return """
- Easy: Quick recall of advanced concepts
- Intermediate: System design basics, architectural patterns
- Hard: Complex problem-solving, scalability, performance tuning"""

        else:
            return """
- Easy: Leadership scenarios, team management basics
- Intermediate: System architecture, strategic technical decisions
- Hard: Enterprise-scale design, organizational technical strategy"""

    def score_short_answer(
        self,
        question: str,
        expected_keywords: list[str],
        candidate_answer: str,
        max_points: int,
    ) -> dict:
        """
        Score a short answer question using LLM.

        Args:
            question: The question that was asked
            expected_keywords: Keywords expected in the answer
            candidate_answer: The candidate's answer
            max_points: Maximum points for this question

        Returns:
            Dict with score and feedback
        """
        prompt = f"""Score this candidate's answer to a technical question.

**Question:** {question}

**Expected Keywords/Concepts:** {', '.join(expected_keywords)}

**Candidate's Answer:** {candidate_answer}

**Scoring Criteria:**
- Full points ({max_points}): Covers all key concepts correctly
- Partial points: Covers some concepts, may have minor gaps
- Zero points: Incorrect, irrelevant, or empty answer

**Output Format (JSON):**
{{
    "score": <0 to {max_points}>,
    "feedback": "<brief explanation of score>",
    "concepts_covered": ["<concept1>", "<concept2>"],
    "concepts_missing": ["<missing1>", "<missing2>"]
}}

Return ONLY valid JSON."""

        response = azure_openai_service.chat_completion(
            messages=[
                {
                    "role": "system",
                    "content": "You are a fair technical evaluator. Score answers objectively based on correctness and completeness."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            response_format={"type": "json_object"}
        )

        try:
            return azure_openai_service.parse_json_response(response)
        except Exception as e:
            print(f"[QuestionGenerator] Error scoring answer: {e}")
            return {"score": 0, "feedback": "Error scoring answer"}


# Singleton instance
question_generator = QuestionGenerator()
