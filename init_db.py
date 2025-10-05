"""
Initialize PostgreSQL Database

This script creates all the necessary tables in the PostgreSQL database
based on the SQLAlchemy models.
"""
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.database.database import engine, Base
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

def init_db():
    """Create all tables in the database."""
    print("Creating database tables...")
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully!")
    except Exception as e:
        print(f"❌ Error creating database tables: {e}")
        return False
    return True

if __name__ == "__main__":
    print("BAI Database Initialization")
    print("=" * 30)
    
    if init_db():
        print("\nYou can now start the BAI application.")
    else:
        print("\nFailed to initialize the database. Please check the error message above.")
