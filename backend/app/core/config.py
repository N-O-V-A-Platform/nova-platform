from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application configuration loaded from environment variables.
    """

import os
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = ".env.docker" if os.getenv("RUNNING_IN_DOCKER") == "1" else ".env.local"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


    # --------------------------------------------------
    # Application
    # --------------------------------------------------

    APP_NAME: str = "N.O.V.A API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # --------------------------------------------------
    # Database
    # --------------------------------------------------

    DATABASE_URL: str = Field(
        default="postgresql+psycopg://postgres:postgres@db:5432/nova"
    )

    # --------------------------------------------------
    # Redis
    # --------------------------------------------------

    REDIS_URL: str = "redis://redis:6379/0"

    # --------------------------------------------------
    # Authentication
    # --------------------------------------------------

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # --------------------------------------------------
    # Google OAuth
    # --------------------------------------------------

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # --------------------------------------------------
    # AI Providers
    # --------------------------------------------------

    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    PINECONE_API_KEY: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()