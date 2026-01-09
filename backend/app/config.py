"""Application configuration using Pydantic Settings."""

from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database - REQUIRED, no default (must be set in .env or environment)
    DATABASE_URL: str = Field(
        description="Async PostgreSQL database URL",
    )

    # Security - REQUIRED, no default (must be set in .env or environment)
    SECRET_KEY: str = Field(
        min_length=32,
        description="Secret key for JWT token generation (min 32 characters)",
    )
    ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30, description="JWT token expiration time in minutes"
    )

    # OpenAI - Optional, empty default allows app to run without AI features
    OPENAI_API_KEY: str = Field(
        default="", description="OpenAI API key for generating player descriptions"
    )

    # CORS (stored as comma-separated string, converted to list via property)
    ALLOWED_ORIGINS_STR: str = Field(
        default="http://localhost:3000,http://localhost:8000",
        description="Comma-separated list of allowed CORS origins",
        alias="ALLOWED_ORIGINS",
    )

    # Application
    APP_NAME: str = Field(default="Baseball Stats API", description="Application name")
    DEBUG: bool = Field(default=False, description="Debug mode")

    # Database Connection Pool
    DB_POOL_SIZE: int = Field(default=5, description="Database connection pool size")
    DB_MAX_OVERFLOW: int = Field(default=10, description="Maximum overflow connections")
    DB_POOL_TIMEOUT: int = Field(
        default=30, description="Connection pool timeout in seconds"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        populate_by_name=True,
    )

    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS_STR.split(",")]


# Global settings instance
settings = Settings()
