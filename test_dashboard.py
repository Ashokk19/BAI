#!/usr/bin/env python3
"""
Test script for dashboard service
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from backend.config.settings import settings
from backend.services.dashboard_service import dashboard_service

def test_dashboard():
    """Test dashboard service directly"""
    try:
        # Create database connection - use SQLite database
        database_url = "sqlite:///./bai_db.db"
        engine = create_engine(database_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        print("Testing dashboard service...")
        result = dashboard_service.get_dashboard_data(db, "Today")
        
        print("✅ Dashboard service works!")
        print(f"KPIs: {len(result['kpis'])} items")
        print(f"Sales Overview: {len(result['sales_overview'])} items")
        print(f"Inventory Status: {len(result['inventory_status'])} items")
        print(f"Recent Activity: {len(result['recent_activity'])} items")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Dashboard service failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_dashboard()
