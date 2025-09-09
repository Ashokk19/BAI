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

from routers import auth, inventory, sales, purchases, dashboard, customers, organization, user_management
from database.database import engine, Base
from config.settings import settings

# Create database tables
Base.metadata.create_all(bind=engine)  # Initialize database tables

# Create FastAPI app instance
app = FastAPI(
    title="BAI - Billing and Inventory Management API",
    description="Backend API for BAI application",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"] if settings.DEBUG else settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Type"],
    max_age=3600,
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(customers.router, prefix="/api/customers", tags=["Customers"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(sales.router, prefix="/api/sales", tags=["Sales"])
app.include_router(purchases.router, prefix="/api/purchases", tags=["Purchases"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(organization.router, prefix="/api/organization", tags=["Organization"])
app.include_router(user_management.router, prefix="/api/user-management", tags=["User Management"])

@app.options("/{path:path}")
async def options_handler(path: str):
    """Handle CORS preflight requests."""
    return {"message": "OK"}

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