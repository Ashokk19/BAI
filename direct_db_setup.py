"""
Direct Database Setup for BAI Application

This script directly creates all necessary tables in the PostgreSQL database
without relying on the application's import structure.
"""
from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Numeric, Date, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime
import enum

# Create SQLAlchemy engine
DATABASE_URL = "postgresql://bai_user:bai_password@localhost:5432/bai_db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Enums
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    STAFF = "staff"
    CUSTOMER = "customer"

class CustomerType(str, enum.Enum):
    INDIVIDUAL = "individual"
    BUSINESS = "business"

# Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    role = Column(Enum(UserRole), default=UserRole.STAFF)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(String(100), nullable=False, index=True)
    customer_code = Column(String(50), nullable=False)
    company_name = Column(String(200))
    contact_person = Column(String(100))
    first_name = Column(String(50))
    last_name = Column(String(50))
    email = Column(String(255), index=True, nullable=False)
    phone = Column(String(20))
    mobile = Column(String(20))
    website = Column(String(255))
    billing_address = Column(Text)
    shipping_address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    postal_code = Column(String(20))
    customer_type = Column(Enum(CustomerType), default=CustomerType.INDIVIDUAL)
    tax_number = Column(String(50))
    gst_number = Column(String(50))
    credit_limit = Column(Numeric(12, 2), default=0.00)
    payment_terms = Column(String(50), default="immediate")
    currency = Column(String(10), default="USD")
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Item(Base):
    __tablename__ = "items"
    
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(String(100), nullable=False, index=True)
    item_code = Column(String(50), nullable=False, unique=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    unit = Column(String(20))
    purchase_price = Column(Numeric(12, 2))
    selling_price = Column(Numeric(12, 2), nullable=False)
    tax_rate = Column(Numeric(5, 2), default=0.00)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(String(100), nullable=False, index=True)
    invoice_number = Column(String(50), unique=True, nullable=False)
    customer_id = Column(Integer, ForeignKey('customers.id'))
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date)
    status = Column(String(20), default="draft")  # draft, sent, paid, cancelled
    subtotal = Column(Numeric(12, 2), nullable=False)
    tax_amount = Column(Numeric(12, 2), default=0.00)
    discount_amount = Column(Numeric(12, 2), default=0.00)
    total_amount = Column(Numeric(12, 2), nullable=False)
    notes = Column(Text)
    terms = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    customer = relationship("Customer")

class InvoiceItem(Base):
    __tablename__ = "invoice_items"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey('invoices.id'), nullable=False)
    item_id = Column(Integer, ForeignKey('items.id'))
    description = Column(Text, nullable=False)
    quantity = Column(Numeric(10, 2), nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    tax_rate = Column(Numeric(5, 2), default=0.00)
    amount = Column(Numeric(12, 2), nullable=False)
    
    invoice = relationship("Invoice", back_populates="items")
    item = relationship("Item")

Invoice.items = relationship("InvoiceItem", back_populates="invoice")

def create_tables():
    """Create all tables in the database."""
    print("Creating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully!")
        return True
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False

if __name__ == "__main__":
    print("BAI Database Setup")
    print("=" * 30)
    
    if create_tables():
        print("\nThe following tables were created:")
        for table in Base.metadata.tables:
            print(f"- {table}")
        print("\nYou can now start the BAI application.")
    else:
        print("\nFailed to create database tables. Please check the error message above.")
