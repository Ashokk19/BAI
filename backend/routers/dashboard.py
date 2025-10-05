"""
BAI Backend Dashboard Router - PostgreSQL Version

This module contains the dashboard routes for analytics and key metrics.
Now using direct PostgreSQL operations instead of SQLAlchemy.
"""

from fastapi import APIRouter, Depends, Query
from utils.auth_deps import get_current_user
from services.postgres_inventory_service import PostgresInventoryService
from typing import Dict, Any

router = APIRouter()

@router.get("/")
async def get_dashboard_data(
    timeline: str = Query("Today", enum=["Today", "This Week", "This Month", "This Year"]),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get dashboard data using PostgreSQL."""
    
    # Get inventory summary for dashboard
    inventory_summary = PostgresInventoryService.get_inventory_summary(current_user["account_id"])
    
    # Basic dashboard data structure
    dashboard_data = {
        "timeline": timeline,
        "total_items": inventory_summary.get("total_items", 0),
        "low_stock_items": inventory_summary.get("low_stock_items", 0),
        "total_inventory_value": inventory_summary.get("total_stock_value", 0.0),
        "active_categories": inventory_summary.get("active_categories", 0),
        
        # Placeholder data for other metrics (to be implemented)
        "total_sales": 0,
        "total_purchases": 0,
        "pending_orders": 0,
        "recent_transactions": [],
        
        # Status
        "status": "success",
        "message": f"Dashboard data for {timeline}"
    }
    
    return dashboard_data