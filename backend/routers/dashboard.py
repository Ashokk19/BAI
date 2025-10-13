"""
BAI Backend Dashboard Router - PostgreSQL Version

This module contains the dashboard routes for analytics and key metrics.
Now using direct PostgreSQL operations instead of SQLAlchemy.
"""

from fastapi import APIRouter, Depends, Query
from utils.auth_deps import get_current_user
from services.postgres_inventory_service import PostgresInventoryService
from typing import Dict, Any, List

router = APIRouter()

@router.get("/")
async def get_dashboard_data(
    timeline: str = Query("Today", enum=["Today", "This Week", "This Month", "This Year"]),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get dashboard data using PostgreSQL in the shape the frontend expects."""
    account_id = current_user["account_id"]

    # Inventory summary KPIs
    summary = PostgresInventoryService.get_inventory_summary(account_id)
    total_items = summary.get("total_items", 0)
    low_stock = summary.get("low_stock_items", 0)
    total_value = float(summary.get("total_stock_value", 0.0) or 0.0)
    active_categories = summary.get("active_categories", 0)

    # Build KPI cards expected by UI
    kpis: List[Dict[str, Any]] = [
        {"title": "Total Stock Value", "value": f"₹{total_value:,.2f}", "change": "", "change_type": "positive", "description": "Current inventory worth"},
        {"title": "Sales", "value": f"₹{0:,.2f}", "change": "", "change_type": "positive", "description": f"Sales in the last {timeline}"},
        {"title": "Active Customers", "value": str(0), "change": "", "change_type": "positive", "description": "Customers with recent activity"},
        {"title": "Pending Orders", "value": str(0), "change": "", "change_type": "positive", "description": "Orders awaiting fulfillment"},
        {"title": "Low Stock Items", "value": str(int(low_stock)), "change": "", "change_type": "negative", "description": "Items below minimum stock"},
        {"title": "Revenue Growth", "value": f"{0}%", "change": "", "change_type": "positive", "description": "Year over year growth"},
    ]

    # Inventory status by category
    categories = PostgresInventoryService.get_categories_with_stats(account_id)
    inventory_status = [{"name": c["name"], "value": int(c.get("total_current_stock", 0) or 0)} for c in categories]

    # Sales overview placeholder (UI handles empty list)
    sales_overview: List[Dict[str, Any]] = []

    # Recent activity placeholder
    recent_activity: List[Dict[str, Any]] = []

    return {
        "kpis": kpis,
        "sales_overview": sales_overview,
        "inventory_status": inventory_status,
        "recent_activity": recent_activity,
    }