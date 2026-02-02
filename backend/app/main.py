"""
BAI Backend Main Application

This module contains the main FastAPI application instance and configuration.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi import HTTPException
import uvicorn
import traceback

from routers import (
    auth,
    inventory,
    sales,
    purchases,
    dashboard,
    customers,
    organization_pg,
    user_management_pg,
    sales_invoices_pg,
    proforma_invoices_pg,
    payments_pg,
    shipments_pg,
    sales_returns_pg,
    credits_pg,
    vendors_pg,
    purchase_orders_pg,
    bills_pg,
    vendor_payments_pg,
    vendor_credits_pg,
    purchase_receipts_pg,
    accounts_pg,
    demo_requests,
)
from database.postgres_db import postgres_db
from config.settings import settings
from services.postgres_accounts_service import PostgresAccountsService

# Initialize PostgreSQL connection
print("🐘 Initializing PostgreSQL connection...")

# Create FastAPI app instance
app = FastAPI(
    title="BAI - Billing and Inventory Management API (PostgreSQL)",
    description="Backend API for BAI application using direct PostgreSQL",
    version="2.0.6",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173","http://18.60.227.50:5173","http://18.60.227.50:8001"] if settings.DEBUG else settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Type"],
    max_age=3600,
)

# Include routers (PostgreSQL versions)
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(accounts_pg.router, prefix="/api/accounts", tags=["Accounts (PostgreSQL)"])
app.include_router(customers.router, prefix="/api/customers", tags=["Customers"])
app.include_router(sales.router, prefix="/api/sales", tags=["Sales"])
app.include_router(sales_invoices_pg.router, prefix="/api/sales/invoices", tags=["Invoices (PostgreSQL)"])
app.include_router(proforma_invoices_pg.router, prefix="/api/sales/proforma-invoices", tags=["Proforma Invoices (PostgreSQL)"])
app.include_router(payments_pg.router, prefix="/api/sales/payments", tags=["Payments (PostgreSQL)"])
app.include_router(shipments_pg.router, prefix="/api/sales/shipments", tags=["Shipments (PostgreSQL)"])
app.include_router(sales_returns_pg.router, prefix="/api/sales/returns", tags=["Sales Returns (PostgreSQL)"])
app.include_router(credits_pg.router, prefix="/api/sales/credits", tags=["Credits (PostgreSQL)"])
app.include_router(purchases.router, prefix="/api/purchases", tags=["Purchases"])
app.include_router(vendors_pg.router, prefix="/api/purchases/vendors", tags=["Vendors (PostgreSQL)"])
app.include_router(purchase_orders_pg.router, prefix="/api/purchases/orders", tags=["Purchase Orders (PostgreSQL)"])
app.include_router(bills_pg.router, prefix="/api/purchases/bills", tags=["Bills (PostgreSQL)"])
app.include_router(vendor_payments_pg.router, prefix="/api/purchases/payments", tags=["Vendor Payments (PostgreSQL)"])
app.include_router(vendor_credits_pg.router, prefix="/api/purchases/credits", tags=["Vendor Credits (PostgreSQL)"])
app.include_router(purchase_receipts_pg.router, prefix="/api/purchases/receipts", tags=["Purchase Receipts (PostgreSQL)"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(organization_pg.router, prefix="/api/organization", tags=["Organization"])
app.include_router(user_management_pg.router, prefix="/api/user-management", tags=["User Management"])
app.include_router(demo_requests.router, prefix="/api/demo-requests", tags=["Demo Requests"])

# Ensure accounts table exists and seed default accounts
try:
    PostgresAccountsService.ensure_seed_accounts()
except Exception as e:
    print(f"Warning: failed to seed accounts: {e}")

@app.get("/")
async def root():
    """Root endpoint that returns API information."""
    return {
        "message": "BAI - Billing and Inventory Management API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Global HTTP exception handler with CORS headers."""
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )
    
    # Add CORS headers to error responses
    origin = request.headers.get("origin")
    if origin and origin in ["http://localhost:5173", "http://127.0.0.1:5173"]:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Expose-Headers"] = "Content-Disposition, Content-Type"
    
    return response

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled exceptions with CORS headers."""
    print(f"❌ Unhandled exception: {str(exc)}")
    traceback.print_exc()
    
    response = JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )
    
    # Add CORS headers to error responses
    origin = request.headers.get("origin")
    if origin and origin in ["http://localhost:5173", "http://127.0.0.1:5173"]:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Expose-Headers"] = "Content-Disposition, Content-Type"
    
    return response

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
