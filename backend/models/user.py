"""
BAI Backend User Model

This module contains the User model for authentication and user management.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from database.database import Base

class User(Base):
    """User model for authentication and user management."""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    
    # User status and permissions
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    
    # Profile information
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        """String representation of User."""
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"
    
    @property
    def full_name(self):
        """Get user's full name."""
        return f"{self.first_name} {self.last_name}" 