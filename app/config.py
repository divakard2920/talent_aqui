from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Azure OpenAI
    azure_openai_endpoint: str
    azure_openai_deployment_name: str = "gpt-4"
    azure_openai_api_version: str = "2024-12-01-preview"

    # Authentication mode: "key" or "aad" (Azure AD / DefaultAzureCredential)
    azure_openai_auth_mode: str = "aad"  # Default to Azure AD auth

    # API Key (only used if auth_mode is "key")
    azure_openai_api_key: str | None = None

    # Database
    database_url: str = "sqlite+aiosqlite:///./talent_acquisition.db"

    # Upload settings
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 10

    # GitHub (optional - for higher rate limits)
    github_access_token: str | None = None

    # Azure OpenAI Voice Models (for AI Voice Interview)
    # Uses separate endpoint if TTS/Whisper are in different region than main GPT-4
    azure_openai_voice_endpoint: str | None = None  # Endpoint for TTS & Whisper
    azure_openai_tts_deployment: str | None = None  # e.g., "gpt-4o-mini-tts"
    azure_openai_whisper_deployment: str | None = None  # e.g., "whisper"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
