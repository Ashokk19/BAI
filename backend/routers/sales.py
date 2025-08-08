"""
BAI Backend Sales Router

This module contains the main sales routes and includes all sales-related sub-routers.
"""

from fastapi import APIRouter
from .customers import router as customers_router
from .invoices import router as invoices_router
from .sales_returns import router as sales_returns_router
from .credits import router as credits_router
from .payments import router as payments_router
from .shipments import router as shipments_router

router = APIRouter()

# Include all sales sub-routers
router.include_router(customers_router, prefix="/customers", tags=["customers"])
router.include_router(invoices_router, prefix="/invoices", tags=["invoices"])
router.include_router(sales_returns_router, prefix="/returns", tags=["sales-returns"])
router.include_router(credits_router, prefix="/credits", tags=["credits"])
router.include_router(payments_router, prefix="/payments", tags=["payments"])
router.include_router(shipments_router, prefix="/shipments", tags=["shipments"])

@router.get("/")
async def sales_overview():
    """Sales module overview."""
    return {
        "message": "Sales Management System",
        "available_endpoints": {
            "customers": "/api/sales/customers",
            "invoices": "/api/sales/invoices", 
            "returns": "/api/sales/returns",
            "credits": "/api/sales/credits",
            "payments": "/api/sales/payments",
            "shipments": "/api/sales/shipments"
        },
        "features": [
            "Customer Management",
            "Invoice Creation and Management",
            "Sales Returns Processing",
            "Customer Credit Management", 
            "Payment Processing",
            "Shipment and Delivery Tracking"
        ]
    } 