"""
Create Database Tables

This script connects to the PostgreSQL database and creates all the necessary tables
based on the SQLAlchemy models.
"""
import os
import sys

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import SQLAlchemy and models
from sqlalchemy import create_engine
from backend.database.database import Base
from backend.models.customer import Customer
from backend.models.organization import Organization
from backend.models.user import User
from backend.models.item import Item
from backend.models.invoice import Invoice, InvoiceItem
from backend.models.payment import Payment
from backend.models.credit import Credit, CreditPayment
from backend.models.inventory import Inventory, InventoryTransaction
from backend.models.purchase import Purchase, PurchaseItem
from backend.models.sales_return import SalesReturn, SalesReturnItem
from backend.models.shipment import Shipment, ShipmentItem
from backend.models.vendor import Vendor
from backend.models.gst_slab import GSTSlab

# Database connection string
DATABASE_URL = "postgresql://bai_user:bai_password@localhost:5432/bai_db"

def create_tables():
    """Create all tables in the database."""
    print("Connecting to the database...")
    try:
        # Create engine
        engine = create_engine(DATABASE_URL)
        
        # Create all tables
        print("Creating tables...")
        Base.metadata.create_all(bind=engine)
        
        print("✅ All tables created successfully!")
        return True
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False

if __name__ == "__main__":
    print("BAI Database Table Creation")
    print("=" * 30)
    
    if create_tables():
        print("\nDatabase setup is complete. You can now start the BAI application.")
    else:
        print("\nFailed to create database tables. Please check the error message above.")
