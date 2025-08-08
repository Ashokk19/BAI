"""
Unit tests for BAI Backend Authentication Service

This module contains comprehensive unit tests for the authentication service
including password hashing, token generation, and user management.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from sqlalchemy.orm import Session

from services.auth_service import AuthService
from models.user import User


class TestAuthService:
    """Test class for AuthService functionality."""
    
    def setup_method(self):
        """Set up test fixtures before each test method."""
        self.auth_service = AuthService()
        self.mock_db = Mock(spec=Session)
        
        # Sample user data for testing
        self.user_data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": "testpassword123",
            "first_name": "Test",
            "last_name": "User",
            "phone": "1234567890",
            "address": "123 Test St"
        }
        
        # Sample user object
        self.sample_user = User(
            id=1,
            email="test@example.com",
            username="testuser",
            hashed_password="$2b$12$hashed_password",
            first_name="Test",
            last_name="User",
            is_active=True,
            is_admin=False
        )

    def test_verify_password_correct(self):
        """Test password verification with correct password."""
        plain_password = "testpassword123"
        hashed_password = self.auth_service.get_password_hash(plain_password)
        
        result = self.auth_service.verify_password(plain_password, hashed_password)
        assert result is True

    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password."""
        plain_password = "testpassword123"
        wrong_password = "wrongpassword"
        hashed_password = self.auth_service.get_password_hash(plain_password)
        
        result = self.auth_service.verify_password(wrong_password, hashed_password)
        assert result is False

    def test_get_password_hash(self):
        """Test password hashing functionality."""
        password = "testpassword123"
        hashed = self.auth_service.get_password_hash(password)
        
        assert hashed is not None
        assert hashed != password
        assert hashed.startswith("$2b$")

    def test_authenticate_user_success(self):
        """Test successful user authentication."""
        # Mock database query
        self.mock_db.query.return_value.filter.return_value.first.return_value = self.sample_user
        
        # Mock password verification to return True
        with patch.object(self.auth_service, 'verify_password', return_value=True):
            result = self.auth_service.authenticate_user(
                self.mock_db, 
                "test@example.com", 
                "testpassword123"
            )
        
        assert result == self.sample_user
        self.mock_db.query.assert_called_once_with(User)

    def test_authenticate_user_not_found(self):
        """Test authentication with non-existent user."""
        # Mock database query to return None
        self.mock_db.query.return_value.filter.return_value.first.return_value = None
        
        result = self.auth_service.authenticate_user(
            self.mock_db, 
            "nonexistent@example.com", 
            "password"
        )
        
        assert result is None

    def test_authenticate_user_wrong_password(self):
        """Test authentication with wrong password."""
        # Mock database query
        self.mock_db.query.return_value.filter.return_value.first.return_value = self.sample_user
        
        # Mock password verification to return False
        with patch.object(self.auth_service, 'verify_password', return_value=False):
            result = self.auth_service.authenticate_user(
                self.mock_db, 
                "test@example.com", 
                "wrongpassword"
            )
        
        assert result is None

    def test_create_access_token(self):
        """Test JWT access token creation."""
        data = {"sub": "1"}
        token = self.auth_service.create_access_token(data)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_access_token_with_expiry(self):
        """Test JWT access token creation with custom expiry."""
        data = {"sub": "1"}
        expires_delta = timedelta(minutes=60)
        token = self.auth_service.create_access_token(data, expires_delta)
        
        assert token is not None
        assert isinstance(token, str)

    def test_verify_token_valid(self):
        """Test verification of valid JWT token."""
        data = {"sub": "1"}
        token = self.auth_service.create_access_token(data)
        
        result = self.auth_service.verify_token(token)
        
        assert result is not None
        assert result["sub"] == "1"
        assert "exp" in result

    def test_verify_token_invalid(self):
        """Test verification of invalid JWT token."""
        invalid_token = "invalid.token.here"
        
        result = self.auth_service.verify_token(invalid_token)
        
        assert result is None

    def test_get_current_user_success(self):
        """Test getting current user from valid token."""
        # Create token with user ID
        data = {"sub": "1"}
        token = self.auth_service.create_access_token(data)
        
        # Mock database query
        self.mock_db.query.return_value.filter.return_value.first.return_value = self.sample_user
        
        result = self.auth_service.get_current_user(self.mock_db, token)
        
        assert result == self.sample_user

    def test_get_current_user_invalid_token(self):
        """Test getting current user with invalid token."""
        invalid_token = "invalid.token.here"
        
        result = self.auth_service.get_current_user(self.mock_db, invalid_token)
        
        assert result is None

    def test_get_current_user_no_user_id(self):
        """Test getting current user when token has no user ID."""
        # Create token without user ID
        data = {"other": "data"}
        token = self.auth_service.create_access_token(data)
        
        result = self.auth_service.get_current_user(self.mock_db, token)
        
        assert result is None

    def test_create_user(self):
        """Test user creation functionality."""
        # Mock database operations
        self.mock_db.add = Mock()
        self.mock_db.commit = Mock()
        self.mock_db.refresh = Mock()
        
        result = self.auth_service.create_user(self.mock_db, self.user_data)
        
        assert result is not None
        assert result.email == self.user_data["email"]
        assert result.username == self.user_data["username"]
        assert result.first_name == self.user_data["first_name"]
        assert result.last_name == self.user_data["last_name"]
        assert result.hashed_password != self.user_data["password"]  # Should be hashed
        
        self.mock_db.add.assert_called_once()
        self.mock_db.commit.assert_called_once()
        self.mock_db.refresh.assert_called_once()

    def test_update_last_login(self):
        """Test updating user's last login timestamp."""
        # Mock database operations
        self.mock_db.commit = Mock()
        
        # Test user without last_login initially
        user = User(id=1, email="test@example.com", username="testuser")
        
        self.auth_service.update_last_login(self.mock_db, user)
        
        assert user.last_login is not None
        assert isinstance(user.last_login, datetime)
        self.mock_db.commit.assert_called_once()

    def test_password_hashing_consistency(self):
        """Test that password hashing is consistent and secure."""
        password = "testpassword123"
        
        # Hash the same password multiple times
        hash1 = self.auth_service.get_password_hash(password)
        hash2 = self.auth_service.get_password_hash(password)
        
        # Hashes should be different (due to salt)
        assert hash1 != hash2
        
        # But both should verify correctly
        assert self.auth_service.verify_password(password, hash1)
        assert self.auth_service.verify_password(password, hash2)

    def test_token_expiry_validation(self):
        """Test that expired tokens are properly rejected."""
        # Create token with very short expiry
        data = {"sub": "1"}
        expires_delta = timedelta(seconds=-1)  # Already expired
        token = self.auth_service.create_access_token(data, expires_delta)
        
        # Token should be invalid due to expiry
        result = self.auth_service.verify_token(token)
        assert result is None 