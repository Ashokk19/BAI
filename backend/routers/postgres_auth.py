"""
PostgreSQL Authentication Router - Direct database operations without SQLAlchemy.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from datetime import timedelta
from typing import Optional

from services.postgres_user_service import PostgresUserService
from utils.postgres_auth_deps import create_access_token, get_current_user
from config.settings import settings

router = APIRouter()
security = HTTPBearer()

class UserLogin(BaseModel):
    identifier: str  # username or email
    password: str
    account_id: str

class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    account_id: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    account_id: str
    username: str
    email: str
    full_name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool
    is_admin: bool
    created_at: Optional[str] = None

@router.post("/login")
async def login(user_credentials: UserLogin):
    """Authenticate user and return JWT token."""
    
    user = PostgresUserService.authenticate_user(
        identifier=user_credentials.identifier,
        password=user_credentials.password,
        account_id=user_credentials.account_id,
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"], "acc": user["account_id"]}, 
        expires_delta=access_token_expires
    )
    
    # Build sanitized user object for frontend compatibility
    full_name = user.get("full_name") or ""
    first_name = full_name.split(" ")[0] if full_name else ""
    last_name = " ".join(full_name.split(" ")[1:]) if full_name and len(full_name.split(" ")) > 1 else ""
    user_response = {
        "id": user["id"],
        "account_id": user["account_id"],
        "username": user["username"],
        "email": user.get("email", ""),
        "full_name": full_name,
        "first_name": first_name,
        "last_name": last_name,
        "is_active": user.get("is_active", True),
        "is_admin": user.get("is_admin", False),
        "created_at": user.get("created_at"),
        "updated_at": user.get("updated_at"),
    }
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response,
    }

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """Register a new user."""
    
    # Check if user already exists
    existing_user = PostgresUserService.get_user_by_username(user_data.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    existing_email = PostgresUserService.get_user_by_email(user_data.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user_dict = user_data.model_dump()
    created_user = PostgresUserService.create_user(user_dict)
    
    if not created_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )
    
    return created_user

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information."""
    full_name = current_user.get("full_name") or ""
    first_name = full_name.split(" ")[0] if full_name else ""
    last_name = " ".join(full_name.split(" ")[1:]) if full_name and len(full_name.split(" ")) > 1 else ""
    return {
        "id": current_user["id"],
        "account_id": current_user["account_id"],
        "username": current_user["username"],
        "email": current_user.get("email", ""),
        "full_name": full_name,
        "first_name": first_name,
        "last_name": last_name,
        "is_active": current_user.get("is_active", True),
        "is_admin": current_user.get("is_admin", False),
        "created_at": current_user.get("created_at"),
        "updated_at": current_user.get("updated_at"),
    }

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get user by ID (admin only or own user)."""
    
    # Allow users to get their own info or admins to get any user
    if user_id != current_user["id"] and not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    user = PostgresUserService.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    full_name = user.get("full_name") or ""
    first_name = full_name.split(" ")[0] if full_name else ""
    last_name = " ".join(full_name.split(" ")[1:]) if full_name and len(full_name.split(" ")) > 1 else ""
    return {
        "id": user["id"],
        "account_id": user["account_id"],
        "username": user["username"],
        "email": user.get("email", ""),
        "full_name": full_name,
        "first_name": first_name,
        "last_name": last_name,
        "is_active": user.get("is_active", True),
        "is_admin": user.get("is_admin", False),
        "created_at": user.get("created_at"),
        "updated_at": user.get("updated_at"),
    }
