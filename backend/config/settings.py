"""
BAI Backend Settings Configuration

This module contains all configuration settings for the BAI backend application.
Settings are loaded from environment variables with fallback defaults.
"""

import os
import secrets
from pathlib import Path
from typing import List, Optional
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"
LOCAL_DATABASE_HOSTS = {"localhost", "127.0.0.1", "::1"}

class Settings(BaseSettings):
    """Application settings configuration."""
    
    # App Configuration
    APP_NAME: str = "BAI Backend"
    DEBUG: bool = False
    HOST: str = "localhost"
    PORT: int = 8001
    # Database Configuration
    DATABASE_TYPE: str = "postgresql"  # postgresql, mysql, sqlite
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: int = 5432
    DATABASE_NAME: str = "bai_db"
    DATABASE_USER: str = "postgres"
    DATABASE_PASSWORD: str = ""
    DATABASE_URL: Optional[str] = None  # If provided, overrides other DB settings
    DATABASE_SSLMODE: Optional[str] = None
    
    # For cloud deployment, you can set DATABASE_URL directly:
    # DATABASE_URL = "postgresql://user:password@cloud-host:5432/database"
    
    SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(64))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    RESEND_API_KEY: Optional[str] = None
    RESEND_API_URL: str = "https://api.resend.com/emails"
    DEFAULT_SENDER: str = "support@example.com"
    
    # CORS Configuration
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "http://localhost:5174",  # Vite dev server (alternate port)
        "http://localhost:5175",  # Vite dev server (alternate port)
        "http://localhost:5176",  # Vite dev server (alternate port)
        "http://localhost:5177",  # Vite dev server (alternate port)
        "http://localhost:5178",  # Vite dev server (alternate port)
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:5177",
        "http://127.0.0.1:5178"
    ]
    
    # Security
    BCRYPT_ROUNDS: int = 12
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    
    # File Upload
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = "uploads"

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @staticmethod
    def _is_local_database_host(host: Optional[str]) -> bool:
        return (host or "").strip().lower() in LOCAL_DATABASE_HOSTS

    @property
    def resolved_database_host(self) -> str:
        if self.DATABASE_URL:
            parsed = urlparse(self.DATABASE_URL)
            if parsed.hostname:
                return parsed.hostname
        return self.DATABASE_HOST

    @property
    def resolved_database_sslmode(self) -> Optional[str]:
        if self.DATABASE_TYPE != "postgresql":
            return None

        if self.DATABASE_SSLMODE:
            return self.DATABASE_SSLMODE

        return "disable" if self._is_local_database_host(self.resolved_database_host) else "require"

    def _normalize_database_url(self, dsn: str) -> str:
        if self.DATABASE_TYPE != "postgresql":
            return dsn

        parsed = urlparse(dsn)
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))

        if "sslmode" not in query:
            sslmode = self.resolved_database_sslmode
            if sslmode:
                query["sslmode"] = sslmode

        return urlunparse(parsed._replace(query=urlencode(query)))
    
    @property
    def database_url(self) -> str:
        """Get database URL for SQLAlchemy."""
        if self.DATABASE_URL:
            return self._normalize_database_url(self.DATABASE_URL)
        
        if self.DATABASE_TYPE == "postgresql":
            base = f"postgresql://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
            sslmode = self.resolved_database_sslmode
            if sslmode:
                return f"{base}?sslmode={sslmode}"
            return base
        elif self.DATABASE_TYPE == "mysql":
            return f"mysql://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
        elif self.DATABASE_TYPE == "sqlite":
            return f"sqlite:///./{self.DATABASE_NAME}.db"
        else:
            raise ValueError(f"Unsupported database type: {self.DATABASE_TYPE}")

# Create settings instance
settings = Settings()