from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Azure OpenAI
    azure_openai_api_key: str
    azure_openai_endpoint: str
    azure_openai_deployment_name: str = "gpt-4"
    azure_openai_api_version: str = "2024-02-15-preview"

    # Database
    database_url: str = "sqlite+aiosqlite:///./talent_acquisition.db"

    # Upload settings
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 10

    # GitHub (optional - for higher rate limits)
    github_access_token: str | None = None

    # Azure OpenAI Voice Models (for AI Voice Interview)
    azure_openai_tts_deployment: str | None = None  # e.g., "tts" or "tts-hd"
    azure_openai_whisper_deployment: str | None = None  # e.g., "whisper"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
