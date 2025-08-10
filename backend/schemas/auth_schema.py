"""
BAI Backend Authentication Schemas

This module contains Pydantic schemas for authentication requests and responses.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, validator

class UserLogin(BaseModel):
    """User login request schema."""
    identifier: str  # Can be either email or username
    password: str

class UserRegister(BaseModel):
    """User registration request schema."""
    email: EmailStr
    username: str
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    
    @validator('username')
    def validate_username(cls, v):
        """Validate username format."""
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters long')
        if not v.isalnum():
            raise ValueError('Username must contain only alphanumeric characters')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class UserResponse(BaseModel):
    """User response schema."""
    id: int
    email: str
    username: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: bool
    is_admin: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        """Pydantic configuration."""
        from_attributes = True

class TokenResponse(BaseModel):
    """Token response schema."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class PasswordChange(BaseModel):
    """Password change request schema."""
    current_password: str
    new_password: str
    
    @validator('new_password')
    def validate_new_password(cls, v):
        """Validate new password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class PasswordReset(BaseModel):
    """Password reset request schema."""
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    """Password reset confirmation schema."""
    token: str
    new_password: str
    
    @validator('new_password')
    def validate_new_password(cls, v):
        """Validate new password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class UserUpdate(BaseModel):
    """User update request schema."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None 