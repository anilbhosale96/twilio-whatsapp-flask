import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_DEFAULT_DB_PATH = os.path.join(_BASE_DIR, "smart_stack_ai.db")

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    DATABASE_URL: str = f"sqlite:///{_DEFAULT_DB_PATH.replace(os.sep, '/')}"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_NUMBER: str = "whatsapp:+14155238886"

    STT_ENGINE: str = "disabled"
    OPENAI_API_KEY: str = ""

    LLM_PROVIDER: str = "disabled"
    LLM_MODEL: str = "claude-3-5-sonnet-20241022"
    ANTHROPIC_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    DEFAULT_THRESHOLD: float = 5.0
    DEFAULT_LANGUAGE: str = "en"
    RATE_LIMIT_PER_MINUTE: int = 60
    VALIDATE_TWILIO_SIGNATURE: bool = False

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()

