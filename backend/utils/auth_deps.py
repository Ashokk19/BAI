"""
BAI Backend Authentication Dependencies

This module contains FastAPI dependencies for authentication and authorization.
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database.database import get_db
from services.auth_service import auth_service
from models.user import User

# Initialize HTTP Bearer security scheme
security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token.
    
    Args:
        credentials: HTTP Authorization credentials
        db: Database session
        
    Returns:
        Current user object
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    user = auth_service.get_current_user(db, token)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
        )
    
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Get current active user.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Current active user
        
    Raises:
        HTTPException: If user is not active
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Get current admin user.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Current admin user
        
    Raises:
        HTTPException: If user is not admin
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get optional user from JWT token (for endpoints that work with or without authentication).
    
    Args:
        credentials: HTTP Authorization credentials (optional)
        db: Database session
        
    Returns:
        User object if authenticated, None otherwise
    """
    if credentials is None:
        return None
    
    token = credentials.credentials
    user = auth_service.get_current_user(db, token)
    
    if user and user.is_active:
        return user
    
    return None 