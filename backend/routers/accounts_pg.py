"""
Accounts Router - Manage tenant accounts (account_id) using direct PostgreSQL.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional

from services.postgres_accounts_service import PostgresAccountsService
from utils.postgres_auth_deps import get_current_user

router = APIRouter(redirect_slashes=True)

class AccountCreate(BaseModel):
    account_id: str
    display_name: Optional[str] = None
    is_master: bool = False

class AccountUpdate(BaseModel):
    display_name: Optional[str] = None
    is_active: Optional[bool] = None

@router.get("/public")
async def list_public_accounts():
    """List active accounts for public use (login/register). Seeds defaults if empty."""
    try:
        return PostgresAccountsService.list_public()
    except Exception:
        return []

@router.get("")
@router.get("/")
async def list_all_accounts(current_user: dict = Depends(get_current_user)):
    """List all accounts. Only users of a master account may access."""
    if not PostgresAccountsService.is_master_account(current_user.get("account_id")):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Master account access required")
    return PostgresAccountsService.list_all()

@router.post("")
@router.post("/")
async def create_account(payload: AccountCreate, current_user: dict = Depends(get_current_user)):
    """Create a new account. Only users of a master account may create accounts."""
    if not PostgresAccountsService.is_master_account(current_user.get("account_id")):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Master account access required")
    created = PostgresAccountsService.create_account(
        account_id=payload.account_id,
        display_name=payload.display_name,
        is_master=bool(payload.is_master),
    )
    if not created:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create account")
    return created

@router.get("/{account_id}")
async def get_account(account_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single account by ID. Master account access required."""
    if not PostgresAccountsService.is_master_account(current_user.get("account_id")):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Master account access required")
    acc = PostgresAccountsService.get_by_account_id(account_id)
    if not acc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return acc

@router.put("/{account_id}")
async def update_account(account_id: str, payload: AccountUpdate, current_user: dict = Depends(get_current_user)):
    """Update an account. Master account access required."""
    if not PostgresAccountsService.is_master_account(current_user.get("account_id")):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Master account access required")
    updated = PostgresAccountsService.update_account(
        account_id=account_id,
        display_name=payload.display_name,
        is_active=payload.is_active,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found or update failed")
    return updated

@router.delete("/{account_id}")
async def delete_account(account_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an account. Master account access required. Cannot delete master account."""
    if not PostgresAccountsService.is_master_account(current_user.get("account_id")):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Master account access required")
    # Prevent deleting master account
    acc = PostgresAccountsService.get_by_account_id(account_id)
    if acc and acc.get("is_master"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete master account")
    deleted = PostgresAccountsService.delete_account(account_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return {"message": "Account deleted", "account_id": account_id}
