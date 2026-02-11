"""
PostgreSQL Authentication Router - Direct database operations without SQLAlchemy.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from datetime import timedelta, datetime
from typing import Optional

from services.postgres_user_service import PostgresUserService
from services.postgres_accounts_service import PostgresAccountsService
from utils.postgres_auth_deps import create_access_token, get_current_user
from config.settings import settings
from database.postgres_db import postgres_db
from schemas.auth_schema import UserUpdate

router = APIRouter()
security = HTTPBearer()

class UserLogin(BaseModel):
    identifier: str  # username or email
    password: str
    account_id: str

class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = "defaultpassword123"  # Temporary default
    account_id: str
    
    def model_post_init(self, __context) -> None:
        # Combine first_name and last_name into full_name if not provided
        if not self.full_name and (self.first_name or self.last_name):
            self.full_name = f"{self.first_name or ''} {self.last_name or ''}".strip()
        
        # Use username as email if email not provided
        if not self.email:
            self.email = self.username

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    account_id: str
    username: str
    email: str
    full_name: str
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    phone: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    company: Optional[str] = None
    designation: Optional[str] = None
    is_active: bool
    is_admin: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    signature_name: Optional[str] = None
    signature_style: Optional[str] = None

@router.post("/login")
async def login(user_credentials: UserLogin):
    """Authenticate user and return JWT token."""
    # Require a valid account_id from accounts table (case-insensitive lookup)
    acc = PostgresAccountsService.get_by_account_id(user_credentials.account_id)
    if not acc or not acc.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or inactive account_id")

    # Use the canonical account_id from the database (preserves original casing)
    canonical_account_id = acc.get("account_id", user_credentials.account_id)

    user = PostgresUserService.authenticate_user(
        identifier=user_credentials.identifier,
        password=user_credentials.password,
        account_id=canonical_account_id,
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
    
    # Build sanitized user object and include in response
    full_name = user.get("full_name") or ""
    stored_first = user.get("first_name") or ""
    stored_last = user.get("last_name") or ""
    derived_first = full_name.split(" ")[0] if full_name else ""
    derived_last = " ".join(full_name.split(" ")[1:]) if full_name and len(full_name.split(" ")) > 1 else ""
    first_name = stored_first or derived_first
    last_name = stored_last or derived_last
    user_response = {
        "id": user["id"],
        "account_id": user["account_id"],
        "username": user["username"],
        "email": user.get("email", ""),
        "full_name": full_name,
        "first_name": first_name,
        "last_name": last_name,
        "phone": user.get("phone"),
        "mobile": user.get("mobile"),
        "address": user.get("address"),
        "city": user.get("city"),
        "state": user.get("state"),
        "postal_code": user.get("postal_code"),
        "company": user.get("company"),
        "designation": user.get("designation"),
        "is_active": user.get("is_active", True),
        "is_admin": user.get("is_admin", False),
        "created_at": user.get("created_at"),
        "updated_at": user.get("updated_at"),
        "last_login": user.get("last_login"),
        "signature_name": user.get("signature_name"),
        "signature_style": user.get("signature_style"),
    }
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response,
    }

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """Register a new user."""
    
    # Debug: Print received data
    print(f"🔍 Registration data received: {user_data.model_dump()}")
    
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
    # Prefer stored first/last names; fallback to deriving from full_name
    full_name = current_user.get("full_name") or ""
    stored_first = current_user.get("first_name") or ""
    stored_last = current_user.get("last_name") or ""
    derived_first = full_name.split(" ")[0] if full_name else ""
    derived_last = " ".join(full_name.split(" ")[1:]) if full_name and len(full_name.split(" ")) > 1 else ""
    first_name = stored_first or derived_first
    last_name = stored_last or derived_last
    return {
        "id": current_user["id"],
        "account_id": current_user["account_id"],
        "username": current_user["username"],
        "email": current_user.get("email", ""),
        "full_name": full_name,
        "first_name": first_name,
        "last_name": last_name,
        "phone": current_user.get("phone"),
        "mobile": current_user.get("mobile"),
        "address": current_user.get("address"),
        "city": current_user.get("city"),
        "state": current_user.get("state"),
        "postal_code": current_user.get("postal_code"),
        "company": current_user.get("company"),
        "designation": current_user.get("designation"),
        "is_active": current_user.get("is_active", True),
        "is_admin": current_user.get("is_admin", False),
        "created_at": current_user.get("created_at"),
        "updated_at": current_user.get("updated_at"),
        "last_login": current_user.get("last_login"),
        "signature_name": current_user.get("signature_name"),
        "signature_style": current_user.get("signature_style"),
    }

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update current user's profile using direct PostgreSQL operations."""
    update_data = user_update.model_dump(exclude_unset=True)
    if not update_data:
        return await get_current_user_info(current_user)

    allowed_fields = {
        "first_name", "last_name", "phone", "mobile", "address", "city", "state",
        "postal_code", "company", "designation", "signature_name", "signature_style"
    }
    # Ensure required columns exist (auto-create if missing)
    cols = postgres_db.execute_query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users'"
    )
    existing_cols = {row["column_name"] for row in cols} if cols else set()
    col_types = {
        "first_name": "VARCHAR(100)",
        "last_name": "VARCHAR(100)",
        "phone": "VARCHAR(20)",
        "mobile": "VARCHAR(20)",
        "address": "TEXT",
        "city": "VARCHAR(100)",
        "state": "VARCHAR(100)",
        "postal_code": "VARCHAR(20)",
        "company": "VARCHAR(200)",
        "designation": "VARCHAR(200)",
        "signature_name": "VARCHAR(200)",
        "signature_style": "VARCHAR(50)",
    }
    missing = [c for c in allowed_fields if c not in existing_cols and c in col_types]
    if missing:
        for c in missing:
            try:
                ddl = f"ALTER TABLE public.users ADD COLUMN IF NOT EXISTS {c} {col_types[c]}"
                postgres_db.execute_update(ddl)
                print(f"Added missing users column: {c}")
            except Exception as e:
                print(f"Failed adding column {c}: {e}")
        # reload existing columns after potential DDL
        cols = postgres_db.execute_query(
            "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users'"
        )
        existing_cols = {row["column_name"] for row in cols} if cols else set()
    effective_allowed = allowed_fields.intersection(existing_cols) if existing_cols else allowed_fields
    update_dict = {k: v for k, v in update_data.items() if k in effective_allowed}
    if not update_dict:
        return await get_current_user_info(current_user)

    # Attempt update; if signature columns are missing (pre-migration), retry without them
    def perform_update(fields: dict):
        set_clause_local = ", ".join([f"{k} = %s" for k in fields.keys()])
        params_local = list(fields.values()) + [current_user["account_id"], current_user["id"]]
        q_local = f"UPDATE users SET {set_clause_local}, updated_at = NOW() WHERE account_id = %s AND id = %s RETURNING id"
        print(f"Updating user {current_user['id']}@{current_user['account_id']} with fields: {list(fields.keys())}")
        res = postgres_db.execute_single(q_local, tuple(params_local))
        print(f"Update result: {res}")
        return res

    try:
        updated = perform_update(update_dict)
    except Exception as e:
        msg = str(e).lower()
        if "signature_name" in msg or "signature_style" in msg or "does not exist" in msg:
            filtered = {k: v for k, v in update_dict.items() if k not in {"signature_name", "signature_style"}}
            if not filtered:
                return await get_current_user_info(current_user)
            try:
                updated = perform_update(filtered)
            except Exception as e2:
                print(f"Profile update failed after filtering signature fields: {e2}")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update profile")
        else:
            print(f"Profile update failed: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update profile")
    if not updated:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update profile")

    # Fetch fresh user record
    refreshed = PostgresUserService.get_user_by_id(current_user["id"])
    if not refreshed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    full_name = refreshed.get("full_name") or ""
    first_name = full_name.split(" ")[0] if full_name else ""
    last_name = " ".join(full_name.split(" ")[1:]) if full_name and len(full_name.split(" ")) > 1 else ""
    return {
        "id": refreshed["id"],
        "account_id": refreshed["account_id"],
        "username": refreshed["username"],
        "email": refreshed.get("email", ""),
        "full_name": full_name,
        "first_name": refreshed.get("first_name") or first_name,
        "last_name": refreshed.get("last_name") or last_name,
        "is_active": refreshed.get("is_active", True),
        "is_admin": refreshed.get("is_admin", False),
        "created_at": refreshed.get("created_at"),
        "updated_at": refreshed.get("updated_at"),
        "signature_name": refreshed.get("signature_name"),
        "signature_style": refreshed.get("signature_style"),
    }

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: dict = Depends(get_current_user)
):
    """Change the current user's password."""
    # Fetch user with hashed_password
    user = postgres_db.execute_single(
        "SELECT id, hashed_password FROM users WHERE id = %s AND account_id = %s",
        (current_user["id"], current_user["account_id"])
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Verify current password
    if not PostgresUserService.verify_password(password_data.current_password, user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    # Validate new password
    if len(password_data.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 8 characters")

    # Hash and update
    import bcrypt
    new_hashed = bcrypt.hashpw(password_data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    postgres_db.execute_update(
        "UPDATE users SET hashed_password = %s, updated_at = NOW() WHERE id = %s AND account_id = %s",
        (new_hashed, current_user["id"], current_user["account_id"])
    )

    return {"message": "Password changed successfully"}

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
    
    return user
