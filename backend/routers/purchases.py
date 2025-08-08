"""
BAI Backend Purchases Router

This module contains the main purchases routes and includes all purchases-related sub-routers.
"""

from fastapi import APIRouter
from .vendors import router as vendors_router
from .purchase_orders import router as purchase_orders_router
from .bills import router as bills_router
from .purchase_received import router as purchase_received_router
from .vendor_credits import router as vendor_credits_router
from .payments_made import router as payments_made_router

router = APIRouter()

print("🛍️ Purchases router loaded")

# Include all purchases sub-routers
router.include_router(vendors_router, prefix="/vendors", tags=["vendors"])
router.include_router(purchase_orders_router, prefix="/purchase-orders", tags=["purchase-orders"])
router.include_router(bills_router, prefix="/bills", tags=["bills"])
router.include_router(purchase_received_router, prefix="/purchase-received", tags=["purchase-received"])
router.include_router(vendor_credits_router, prefix="/vendor-credits", tags=["vendor-credits"])
router.include_router(payments_made_router, prefix="/payments-made", tags=["payments-made"])

@router.get("/")
async def purchases_overview():
    """Purchases module overview."""
    return {
        "message": "Purchases Management System",
        "available_endpoints": {
            "vendors": "/api/purchases/vendors",
            "purchase_orders": "/api/purchases/purchase-orders",
            "bills": "/api/purchases/bills",
            "payments_made": "/api/purchases/payments-made",
            "purchase_received": "/api/purchases/purchase-received",
            "vendor_credits": "/api/purchases/vendor-credits"
        },
        "features": [
            "Vendor Management",
            "Purchase Order Creation and Management",
            "Bill Processing",
            "Payment Management",
            "Purchase Receipt Tracking",
            "Vendor Credit Management"
        ]
    } 