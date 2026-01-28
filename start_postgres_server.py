#!/usr/bin/env python3
"""
Start BAI Backend Server with PostgreSQL (No SQLAlchemy)
"""

import sys
import os
import subprocess

def start_postgres_server():
    """Start the PostgreSQL version of BAI backend server."""
    
    print("🐘 Starting BAI Backend Server (PostgreSQL Version)")
    print("=" * 50)
    
    # Change to backend directory
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    os.chdir(backend_dir)
    
    # Add backend to Python path
    sys.path.insert(0, backend_dir)
    
    try:
        # Test PostgreSQL connection first
        print("🔍 Testing PostgreSQL connection...")
        from database.postgres_db import postgres_db
        result = postgres_db.execute_single("SELECT 1 as test")
        if result:
            print("✅ PostgreSQL connection successful")
        else:
            print("❌ PostgreSQL connection failed")
            return
        
        print("\n🚀 Starting server...")
        print("📊 API Documentation: http://localhost:8001/docs")
        print("📋 ReDoc: http://localhost:8001/redoc")
        print("🌐 Health Check: http://localhost:8001/health")
        print("\n" + "=" * 50)
        
        # Start the server
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "app.postgres_main:app",
            "--host", "localhost",
            "--port", "8001", 
            "--reload"
        ])
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    start_postgres_server()
