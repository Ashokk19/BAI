"""
Unit tests for BAI Backend Authentication Router

This module contains unit tests for the authentication API endpoints
including login, registration, and user management routes.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from datetime import datetime

from app.main import app
from models.user import User
from services.auth_service import AuthService


class TestAuthRouter:
    """Test class for authentication router endpoints."""
    
    def setup_method(self):
        """Set up test fixtures before each test method."""
        self.client = TestClient(app)
        
        # Sample user data for testing
        self.user_data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": "testpassword123",
            "first_name": "Test",
            "last_name": "User"
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
            is_admin=False,
            created_at=datetime.utcnow()
        )

    @patch('routers.auth.get_db')
    @patch('services.auth_service.auth_service.authenticate_user')
    @patch('services.auth_service.auth_service.update_last_login')
    def test_login_success(self, mock_update_login, mock_authenticate, mock_get_db):
        """Test successful user login."""
        # Mock successful authentication
        mock_authenticate.return_value = self.sample_user
        mock_update_login.return_value = None
        
        login_data = {
            "email": "test@example.com",
            "password": "testpassword123"
        }
        
        response = self.client.post("/api/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert "user" in data
        assert data["user"]["email"] == "test@example.com"

    @patch('routers.auth.get_db')
    @patch('services.auth_service.auth_service.authenticate_user')
    def test_login_invalid_credentials(self, mock_authenticate, mock_get_db):
        """Test login with invalid credentials."""
        # Mock failed authentication
        mock_authenticate.return_value = None
        
        login_data = {
            "email": "test@example.com",
            "password": "wrongpassword"
        }
        
        response = self.client.post("/api/auth/login", json=login_data)
        
        assert response.status_code == 401
        data = response.json()
        assert data["detail"] == "Incorrect email or password"

    @patch('routers.auth.get_db')
    @patch('services.auth_service.auth_service.authenticate_user')
    def test_login_inactive_user(self, mock_authenticate, mock_get_db):
        """Test login with inactive user."""
        # Create inactive user
        inactive_user = User(
            id=1,
            email="test@example.com",
            username="testuser",
            is_active=False
        )
        
        mock_authenticate.return_value = inactive_user
        
        login_data = {
            "email": "test@example.com",
            "password": "testpassword123"
        }
        
        response = self.client.post("/api/auth/login", json=login_data)
        
        assert response.status_code == 401
        data = response.json()
        assert data["detail"] == "Inactive user"

    def test_login_invalid_email_format(self):
        """Test login with invalid email format."""
        login_data = {
            "email": "invalid-email",
            "password": "testpassword123"
        }
        
        response = self.client.post("/api/auth/login", json=login_data)
        
        assert response.status_code == 422  # Validation error

    def test_login_missing_fields(self):
        """Test login with missing required fields."""
        login_data = {
            "email": "test@example.com"
            # Missing password
        }
        
        response = self.client.post("/api/auth/login", json=login_data)
        
        assert response.status_code == 422  # Validation error

    @patch('routers.auth.get_db')
    @patch('services.auth_service.auth_service.create_user')
    def test_register_success(self, mock_create_user, mock_get_db):
        """Test successful user registration."""
        # Mock successful user creation
        mock_create_user.return_value = self.sample_user
        
        # Mock database query to return no existing user
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_get_db.return_value = mock_db
        
        response = self.client.post("/api/auth/register", json=self.user_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["email"] == "test@example.com"
        assert data["username"] == "testuser"
        assert data["first_name"] == "Test"
        assert data["last_name"] == "User"

    @patch('routers.auth.get_db')
    def test_register_existing_email(self, mock_get_db):
        """Test registration with existing email."""
        # Mock database query to return existing user with same email
        mock_db = Mock()
        existing_user = User(email="test@example.com", username="otheruser")
        mock_db.query.return_value.filter.return_value.first.return_value = existing_user
        mock_get_db.return_value = mock_db
        
        response = self.client.post("/api/auth/register", json=self.user_data)
        
        assert response.status_code == 400
        data = response.json()
        assert data["detail"] == "Email already registered"

    @patch('routers.auth.get_db')
    def test_register_existing_username(self, mock_get_db):
        """Test registration with existing username."""
        # Mock database query to return existing user with same username
        mock_db = Mock()
        existing_user = User(email="other@example.com", username="testuser")
        mock_db.query.return_value.filter.return_value.first.return_value = existing_user
        mock_get_db.return_value = mock_db
        
        response = self.client.post("/api/auth/register", json=self.user_data)
        
        assert response.status_code == 400
        data = response.json()
        assert data["detail"] == "Username already taken"

    def test_register_invalid_data(self):
        """Test registration with invalid data."""
        invalid_data = {
            "email": "invalid-email",
            "username": "ab",  # Too short
            "password": "123",  # Too short
            "first_name": "",  # Empty
            "last_name": ""   # Empty
        }
        
        response = self.client.post("/api/auth/register", json=invalid_data)
        
        assert response.status_code == 422  # Validation error

    @patch('utils.auth_deps.get_current_user')
    def test_get_current_user_success(self, mock_get_current_user):
        """Test getting current user information."""
        mock_get_current_user.return_value = self.sample_user
        
        headers = {"Authorization": "Bearer valid_token"}
        response = self.client.get("/api/auth/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["email"] == "test@example.com"
        assert data["username"] == "testuser"

    def test_get_current_user_no_auth(self):
        """Test getting current user without authentication."""
        response = self.client.get("/api/auth/me")
        
        assert response.status_code == 401  # Unauthorized

    @patch('utils.auth_deps.get_current_user')
    @patch('routers.auth.get_db')
    def test_update_current_user(self, mock_get_db, mock_get_current_user):
        """Test updating current user information."""
        mock_get_current_user.return_value = self.sample_user
        
        # Mock database operations
        mock_db = Mock()
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None
        mock_get_db.return_value = mock_db
        
        update_data = {
            "first_name": "Updated",
            "last_name": "User",
            "phone": "9876543210"
        }
        
        headers = {"Authorization": "Bearer valid_token"}
        response = self.client.put("/api/auth/me", json=update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["first_name"] == "Updated"
        assert data["last_name"] == "User"

    @patch('utils.auth_deps.get_current_user')
    @patch('routers.auth.get_db')
    @patch('services.auth_service.auth_service.verify_password')
    @patch('services.auth_service.auth_service.get_password_hash')
    def test_change_password_success(self, mock_hash, mock_verify, mock_get_db, mock_get_current_user):
        """Test successful password change."""
        mock_get_current_user.return_value = self.sample_user
        mock_verify.return_value = True
        mock_hash.return_value = "new_hashed_password"
        
        # Mock database operations
        mock_db = Mock()
        mock_db.commit.return_value = None
        mock_get_db.return_value = mock_db
        
        password_data = {
            "current_password": "oldpassword123",
            "new_password": "newpassword123"
        }
        
        headers = {"Authorization": "Bearer valid_token"}
        response = self.client.post("/api/auth/change-password", json=password_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Password changed successfully"

    @patch('utils.auth_deps.get_current_user')
    @patch('services.auth_service.auth_service.verify_password')
    def test_change_password_incorrect_current(self, mock_verify, mock_get_current_user):
        """Test password change with incorrect current password."""
        mock_get_current_user.return_value = self.sample_user
        mock_verify.return_value = False
        
        password_data = {
            "current_password": "wrongpassword",
            "new_password": "newpassword123"
        }
        
        headers = {"Authorization": "Bearer valid_token"}
        response = self.client.post("/api/auth/change-password", json=password_data, headers=headers)
        
        assert response.status_code == 400
        data = response.json()
        assert data["detail"] == "Incorrect current password"

    @patch('utils.auth_deps.get_current_user')
    def test_logout(self, mock_get_current_user):
        """Test user logout."""
        mock_get_current_user.return_value = self.sample_user
        
        headers = {"Authorization": "Bearer valid_token"}
        response = self.client.post("/api/auth/logout", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Logged out successfully" 