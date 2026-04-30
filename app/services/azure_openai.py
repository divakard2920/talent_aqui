from openai import AzureOpenAI
import json

from app.config import get_settings

settings = get_settings()


class AzureOpenAIService:
    """Service for interacting with Azure OpenAI."""

    def __init__(self):
        self.client = AzureOpenAI(
            api_key=settings.azure_openai_api_key,
            api_version=settings.azure_openai_api_version,
            azure_endpoint=settings.azure_openai_endpoint,
        )
        self.deployment_name = settings.azure_openai_deployment_name

    def chat_completion(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        response_format: dict | None = None,
    ) -> str:
        """Send a chat completion request to Azure OpenAI."""
        kwargs = {
            "model": self.deployment_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format:
            kwargs["response_format"] = response_format

        response = self.client.chat.completions.create(**kwargs)
        return response.choices[0].message.content

    def parse_json_response(self, response: str) -> dict | list:
        """Parse a JSON response from the model."""
        if not response:
            raise ValueError("Empty response from model")

        # Clean up common issues
        cleaned = response.strip()

        # Remove markdown code blocks if present
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        # Try to parse directly
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            print(f"[AzureOpenAI] JSON parse error: {e}")
            print(f"[AzureOpenAI] Response preview: {cleaned[:500]}...")

            # Try to find JSON object within the response
            start = cleaned.find("{")
            end = cleaned.rfind("}") + 1
            if start != -1 and end > start:
                try:
                    return json.loads(cleaned[start:end])
                except json.JSONDecodeError:
                    pass

            # Try to find JSON array within the response
            start = cleaned.find("[")
            end = cleaned.rfind("]") + 1
            if start != -1 and end > start:
                try:
                    return json.loads(cleaned[start:end])
                except json.JSONDecodeError:
                    pass

            raise ValueError(f"Could not parse JSON from response: {e}")


azure_openai_service = AzureOpenAIService()
