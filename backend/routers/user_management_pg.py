from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import datetime
import bcrypt

from database.postgres_db import postgres_db
from utils.postgres_auth_deps import get_current_user
from services.postgres_accounts_service import PostgresAccountsService

router = APIRouter()

class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None
    password: Optional[str] = "defaultpassword123"
    full_name: Optional[str] = None
    account_id: str
    is_admin: bool = False

@router.get("/users")
async def get_organization_users(current_user: Dict[str, Any] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """Get users. Master account gets ALL users, others get only their account's users."""
    is_master = PostgresAccountsService.is_master_account(current_user.get("account_id"))
    if is_master:
        q = (
            "SELECT id, account_id, username, email, full_name, "
            "is_active, is_admin, created_at, updated_at "
            "FROM users ORDER BY account_id, id"
        )
        rows = postgres_db.execute_query(q)
    else:
        q = (
            "SELECT id, account_id, username, email, full_name, "
            "is_active, is_admin, created_at, updated_at "
            "FROM users WHERE account_id = %s ORDER BY id"
        )
        rows = postgres_db.execute_query(q, (current_user["account_id"],))
    return rows or []

@router.post("/users")
async def create_user(payload: UserCreate, current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Create a new user. Master account can create for any account, others only for their own."""
    is_master = PostgresAccountsService.is_master_account(current_user.get("account_id"))
    if not is_master and payload.account_id != current_user.get("account_id"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create user for different account")
    
    # Check account exists
    acc = PostgresAccountsService.get_by_account_id(payload.account_id)
    if not acc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Account '{payload.account_id}' not found")
    
    # Hash password
    hashed = bcrypt.hashpw((payload.password or "defaultpassword123").encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    try:
        result = postgres_db.execute_single(
            """
            INSERT INTO users (account_id, username, email, full_name, hashed_password, is_active, is_admin, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, TRUE, %s, %s, %s)
            RETURNING id, account_id, username, email, full_name, is_active, is_admin, created_at
            """,
            (
                payload.account_id,
                payload.username,
                payload.email or f"{payload.username}@example.com",
                payload.full_name or payload.username,
                hashed,
                payload.is_admin,
                datetime.now(),
                datetime.now(),
            )
        )
        return result
    except Exception as e:
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username or email already exists")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/users/{user_id}")
async def get_organization_user(user_id: int, current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    q = (
        "SELECT id, account_id, username, email, full_name, "
        "is_active, is_admin, created_at, updated_at "
        "FROM users WHERE id = %s"
    )
    user = postgres_db.execute_single(q, (user_id,))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    is_master = PostgresAccountsService.is_master_account(current_user.get("account_id"))
    if not is_master and user["account_id"] != current_user["account_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access user from different organization")
    return user
