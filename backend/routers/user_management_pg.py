from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status

from database.postgres_db import postgres_db
from utils.postgres_auth_deps import get_current_user

router = APIRouter()

@router.get("/users")
async def get_organization_users(current_user: Dict[str, Any] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    q = (
        "SELECT id, account_id, username, email, full_name, "
        "is_active, is_admin, created_at, updated_at "
        "FROM users WHERE account_id = %s ORDER BY id"
    )
    rows = postgres_db.execute_query(q, (current_user["account_id"],))
    return rows or []

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
    if user["account_id"] != current_user["account_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access user from different organization")
    return user
