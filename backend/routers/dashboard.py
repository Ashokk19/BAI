"""
BAI Backend Dashboard Router

This module contains the dashboard routes for analytics and key metrics.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database.database import get_db
from utils.auth_deps import get_current_user
from models.user import User
from services.dashboard_service import dashboard_service
from schemas.dashboard_schema import DashboardData

router = APIRouter()

@router.get("/", response_model=DashboardData)
async def get_dashboard_data(
    timeline: str = Query("Today", enum=["Today", "This Week", "This Month", "This Year"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dashboard data."""
    return dashboard_service.get_dashboard_data(db, timeline) 