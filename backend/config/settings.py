"""
BAI Backend Settings Configuration

This module contains all configuration settings for the BAI backend application.
Settings are loaded from environment variables with fallback defaults.
"""

import os
from typing import List, Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings configuration."""
    
    # App Configuration
    APP_NAME: str = "BAI Backend"
    DEBUG: bool = True
    HOST: str = "localhost"
    PORT: int = 8001
    # Database Configuration
    DATABASE_TYPE: str = "postgresql"  # postgresql, mysql, sqlite
    DATABASE_HOST: str = "aws-1-ap-south-1.pooler.supabase.com"
    DATABASE_PORT: int = 5432
    DATABASE_NAME: str = "postgres"
    DATABASE_USER: str = "postgres.jcuupuwxfmdhpfwjemou"
    DATABASE_PASSWORD: str = "postgres"
    DATABASE_URL: Optional[str] = None  # If provided, overrides other DB settings
    DATABASE_SSLMODE: str = "require"
    
    # For cloud deployment, you can set DATABASE_URL directly:
    # DATABASE_URL = "postgresql://user:password@cloud-host:5432/database"
    
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
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
    
    @property
    def database_url(self) -> str:
        """Get database URL for SQLAlchemy."""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        
        if self.DATABASE_TYPE == "postgresql":
            base = f"postgresql://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
            if getattr(self, "DATABASE_SSLMODE", None):
                return f"{base}?sslmode={self.DATABASE_SSLMODE}"
            return base
        elif self.DATABASE_TYPE == "mysql":
            return f"mysql://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
        elif self.DATABASE_TYPE == "sqlite":
            return f"sqlite:///./{self.DATABASE_NAME}.db"
        else:
            raise ValueError(f"Unsupported database type: {self.DATABASE_TYPE}")
    
    class Config:
        """Pydantic configuration."""
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

# Create settings instance
settings = Settings() 