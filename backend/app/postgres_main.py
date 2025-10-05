"""
BAI Backend Main Application - PostgreSQL Version (No SQLAlchemy)

This module contains the main FastAPI application instance using direct PostgreSQL.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi import HTTPException
import uvicorn
import traceback

# Import PostgreSQL routers instead of SQLAlchemy ones
from routers import postgres_auth, postgres_inventory, sales, purchases, dashboard, customers, organization, user_management
from database.postgres_db import postgres_db
from config.settings import settings

# Initialize PostgreSQL connection (no SQLAlchemy)
print("🐘 Initializing PostgreSQL connection...")

# Create FastAPI app instance
app = FastAPI(
    title="BAI - Billing and Inventory Management API (PostgreSQL)",
    description="Backend API for BAI application using direct PostgreSQL",
    version="2.0.0",
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

# Include PostgreSQL routers
app.include_router(postgres_auth.router, prefix="/api/auth", tags=["Authentication (PostgreSQL)"])
app.include_router(postgres_inventory.router, prefix="/api/inventory", tags=["Inventory (PostgreSQL)"])

# Keep existing routers for other modules (will migrate these later)
app.include_router(customers.router, prefix="/api/customers", tags=["Customers"])
app.include_router(sales.router, prefix="/api/sales", tags=["Sales"])
app.include_router(purchases.router, prefix="/api/purchases", tags=["Purchases"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(organization.router, prefix="/api/organization", tags=["Organization"])
app.include_router(user_management.router, prefix="/api/user-management", tags=["User Management"])

@app.on_event("startup")
async def startup_event():
    """Application startup event."""
    print("🚀 BAI PostgreSQL API starting up...")
    print(f"📊 Database: {settings.DATABASE_NAME}")
    print(f"🌐 Host: {settings.DATABASE_HOST}:{settings.DATABASE_PORT}")

@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event."""
    print("🛑 BAI PostgreSQL API shutting down...")

@app.options("/{path:path}")
async def options_handler(path: str):
    """Handle CORS preflight requests."""
    return {"message": "OK"}

@app.get("/")
async def root():
    """Root endpoint that returns API information."""
    return {
        "message": "BAI - Billing and Inventory Management API (PostgreSQL)",
        "version": "2.0.0",
        "database": "PostgreSQL (Direct Connection)",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint with database connectivity test."""
    try:
        # Test database connection
        result = postgres_db.execute_single("SELECT 1 as test")
        db_status = "connected" if result else "disconnected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "database": db_status,
        "version": "2.0.0"
    }

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
        "app.postgres_main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
