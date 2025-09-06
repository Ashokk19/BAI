"""
BAI Backend Authentication Router

This module contains the authentication routes for login, registration, and user management.
"""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database.database import get_db
from services.auth_service import auth_service
from schemas.auth_schema import (
    UserLogin, UserRegister, UserResponse, TokenResponse, 
    PasswordChange, UserUpdate
)
from utils.auth_deps import get_current_user, get_current_active_user
from models.user import User
from config.settings import settings

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
async def login(user_login: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate user and return access token.
    
    Args:
        user_login: User login credentials
        db: Database session
        
    Returns:
        Access token and user information
        
    Raises:
        HTTPException: If authentication fails
    """
    try:
        print(f"🔐 Login attempt for: {user_login.identifier}")
        print(f"🔐 Account ID: {user_login.account_id}")
        
        user = auth_service.authenticate_user(db, user_login.identifier, user_login.password, user_login.account_id)
        if not user:
            print(f"❌ Authentication failed for: {user_login.identifier}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username/email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        print(f"✅ User authenticated: {user.email}")
        
        if not user.is_active:
            print(f"❌ User is inactive: {user.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Inactive user",
            )
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error during login: {str(e)}"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_service.create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user)
    )

@router.post("/token", response_model=TokenResponse)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    OAuth2 compatible token login for Swagger UI.
    
    Args:
        form_data: OAuth2 form data
        db: Database session
        
    Returns:
        Access token and user information
        
    Raises:
        HTTPException: If authentication fails
    """
    # For OAuth2 form, we'll use the default account_id
    # In production, you might want to require account_id in the OAuth2 flow as well
    default_account_id = "TestAccount"
    
    user = auth_service.authenticate_user(db, form_data.username, form_data.password, default_account_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_service.create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user)
    )

@router.post("/register", response_model=UserResponse)
async def register(user_register: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user.
    
    Args:
        user_register: User registration data
        db: Database session
        
    Returns:
        Created user information
        
    Raises:
        HTTPException: If registration fails
    """
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.email == user_register.email) | 
        (User.username == user_register.username)
    ).first()
    
    if existing_user:
        if existing_user.email == user_register.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Create user
    user_data = user_register.model_dump()
    user = auth_service.create_user(db, user_data)
    
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        account_id=user.account_id,
        phone=user.phone,
        address=user.address,
        is_active=user.is_active,
        is_admin=user.is_admin,
        is_verified=user.is_verified,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login=user.last_login
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current user information.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Current user information
    """
    return UserResponse.model_validate(current_user)

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user information.
    
    Args:
        user_update: User update data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated user information
    """
    update_data = user_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    
    return UserResponse.model_validate(current_user)

@router.post("/change-password")
async def change_password(
    password_change: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change user password.
    
    Args:
        password_change: Password change data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If current password is incorrect
    """
    # Verify current password
    if not auth_service.verify_password(password_change.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    # Update password
    current_user.hashed_password = auth_service.get_password_hash(password_change.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}

@router.post("/forgot-password")
async def forgot_password(email_data: dict, db: Session = Depends(get_db)):
    """
    Send password reset email to user.
    
    Args:
        email_data: Dictionary containing email
        db: Database session
        
    Returns:
        Success message
    """
    email = email_data.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required"
        )
    
    # Check if user exists
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Return success even if user doesn't exist for security
        return {"message": "If an account with this email exists, a password reset link has been sent"}
    
    # For now, we'll simulate sending an email
    # In a real application, you would generate a reset token and send an email
    # TODO: Implement actual email sending with reset token
    
    return {"message": "If an account with this email exists, a password reset link has been sent"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current user information.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Current user information
    """
    return current_user

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """
    Logout user (client should discard the token).
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Success message
    """
    return {"message": "Logged out successfully"} 