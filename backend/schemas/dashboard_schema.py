"""
BAI Backend Dashboard Schemas

This module contains the Pydantic schemas for the dashboard data.
"""

from pydantic import BaseModel
from typing import List

class KPI(BaseModel):
    """Key Performance Indicator schema."""
    title: str
    value: str
    change: str
    change_type: str
    description: str

class SalesDataPoint(BaseModel):
    """Sales data point for the sales overview chart."""
    name: str
    sales: float

class InventoryStatus(BaseModel):
    """Inventory status by category."""
    name: str
    value: int

class RecentActivity(BaseModel):
    """Recent activity item."""
    action: str
    details: str
    time: str

class DashboardData(BaseModel):
    """Dashboard data schema."""
    kpis: List[KPI]
    sales_overview: List[SalesDataPoint]
    inventory_status: List[InventoryStatus]
    recent_activity: List[RecentActivity] 