"""
BAI Backend Test Configuration

This module contains pytest configuration and fixtures for testing.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import Mock

from app.main import app
from database.database import get_db, Base


# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session")
def test_app():
    """Create test FastAPI application."""
    # Override database dependency
    app.dependency_overrides[get_db] = override_get_db
    return app


@pytest.fixture(scope="session")
def client(test_app):
    """Create test client."""
    return TestClient(test_app)


@pytest.fixture(scope="function")
def db_session():
    """Create database session for testing."""
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    session = TestingSessionLocal()
    
    try:
        yield session
    finally:
        session.close()
        # Drop tables after test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def mock_db():
    """Create mock database session."""
    return Mock()


@pytest.fixture
def sample_user_data():
    """Sample user data for testing."""
    return {
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpassword123",
        "first_name": "Test",
        "last_name": "User",
        "phone": "1234567890",
        "address": "123 Test St"
    } 