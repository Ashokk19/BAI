"""
BAI Backend Purchases Router - PostgreSQL Version

Basic purchases router with PostgreSQL operations.
"""

from fastapi import APIRouter, Depends
from utils.auth_deps import get_current_user
from typing import Dict, Any

router = APIRouter()

@router.get("/")
async def get_purchases_summary(
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get purchases summary (placeholder implementation)."""
    
    return {
        "total_purchases": 0,
        "purchases_count": 0,
        "recent_purchases": [],
        "status": "success",
        "message": "Purchases data (PostgreSQL implementation pending)"
    }

@router.get("/recent")
async def get_recent_purchases(
    current_user: dict = Depends(get_current_user),
    limit: int = 10
) -> Dict[str, Any]:
    """Get recent purchases (placeholder implementation)."""
    
    return {
        "purchases": [],
        "total": 0,
        "status": "success",
        "message": f"Recent {limit} purchases (PostgreSQL implementation pending)"
    }
