"""
Seed Vendor Data for BAI Backend

This script creates sample vendor data for testing the purchase module.
"""

import sys
import os
from datetime import datetime
from decimal import Decimal

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.database import SessionLocal, engine
from models.vendor import Vendor
from models.user import User

def create_vendors():
    """Create sample vendor data."""
    
    db = SessionLocal()
    
    try:
        # Check if vendors already exist
        existing_vendors = db.query(Vendor).count()
        if existing_vendors > 0:
            print(f"✅ {existing_vendors} vendors already exist. Skipping vendor creation.")
            return
        
        # Get the first user as creator
        creator = db.query(User).first()
        if not creator:
            print("❌ No users found. Please create a user first.")
            return
        
        vendors_data = [
            {
                "vendor_code": "VEN001",
                "company_name": "Tech Solutions India Pvt Ltd",
                "contact_person": "Rajesh Kumar",
                "email": "rajesh@techsolutionsindia.com",
                "phone": "+91-11-23456789",
                "mobile": "+91-9876543210",
                "website": "https://techsolutionsindia.com",
                "billing_address": "123, Nehru Place, New Delhi - 110019",
                "shipping_address": "123, Nehru Place, New Delhi - 110019",
                "city": "New Delhi",
                "state": "Delhi",
                "country": "India",
                "postal_code": "110019",
                "vendor_type": "supplier",
                "tax_number": "TECH123456789",
                "gst_number": "07AABCT1234Z1Z5",
                "payment_terms": "net_30",
                "currency": "INR",
                "bank_name": "HDFC Bank",
                "bank_account_number": "12345678901234",
                "routing_number": "HDFC0001234",
                "swift_code": "HDFCINBB",
                "is_active": True,
                "is_verified": True,
                "rating": Decimal("4.5"),
                "performance_score": Decimal("85.0"),
                "notes": "Reliable technology supplier with good track record"
            },
            {
                "vendor_code": "VEN002",
                "company_name": "Office Supplies Co.",
                "contact_person": "Priya Sharma",
                "email": "priya@officesuppliesco.com",
                "phone": "+91-22-34567890",
                "mobile": "+91-9876543211",
                "website": "https://officesuppliesco.com",
                "billing_address": "456, Andheri West, Mumbai - 400058",
                "shipping_address": "456, Andheri West, Mumbai - 400058",
                "city": "Mumbai",
                "state": "Maharashtra",
                "country": "India",
                "postal_code": "400058",
                "vendor_type": "supplier",
                "tax_number": "OFFICE987654321",
                "gst_number": "27AABCO9876Z1Z5",
                "payment_terms": "net_45",
                "currency": "INR",
                "bank_name": "ICICI Bank",
                "bank_account_number": "98765432109876",
                "routing_number": "ICIC0009876",
                "swift_code": "ICICINBB",
                "is_active": True,
                "is_verified": True,
                "rating": Decimal("4.2"),
                "performance_score": Decimal("78.0"),
                "notes": "Office supplies and furniture supplier"
            },
            {
                "vendor_code": "VEN003",
                "company_name": "Global Electronics Ltd",
                "contact_person": "Amit Patel",
                "email": "amit@globalelectronics.com",
                "phone": "+91-40-45678901",
                "mobile": "+91-9876543212",
                "website": "https://globalelectronics.com",
                "billing_address": "789, Banjara Hills, Hyderabad - 500034",
                "shipping_address": "789, Banjara Hills, Hyderabad - 500034",
                "city": "Hyderabad",
                "state": "Telangana",
                "country": "India",
                "postal_code": "500034",
                "vendor_type": "supplier",
                "tax_number": "GLOBAL555666777",
                "gst_number": "36AABCG5555Z1Z5",
                "payment_terms": "net_30",
                "currency": "INR",
                "bank_name": "Axis Bank",
                "bank_account_number": "55566677788899",
                "routing_number": "AXIS0005555",
                "swift_code": "AXISINBB",
                "is_active": True,
                "is_verified": True,
                "rating": Decimal("4.8"),
                "performance_score": Decimal("92.0"),
                "notes": "Premium electronics and computer hardware supplier"
            },
            {
                "vendor_code": "VEN004",
                "company_name": "Industrial Supplies Corp",
                "contact_person": "Suresh Reddy",
                "email": "suresh@industrialsupplies.com",
                "phone": "+91-80-56789012",
                "mobile": "+91-9876543213",
                "website": "https://industrialsupplies.com",
                "billing_address": "321, Electronic City, Bangalore - 560100",
                "shipping_address": "321, Electronic City, Bangalore - 560100",
                "city": "Bangalore",
                "state": "Karnataka",
                "country": "India",
                "postal_code": "560100",
                "vendor_type": "manufacturer",
                "tax_number": "INDUSTRIAL111222333",
                "gst_number": "29AABCI1111Z1Z5",
                "payment_terms": "net_60",
                "currency": "INR",
                "bank_name": "State Bank of India",
                "bank_account_number": "11122233344455",
                "routing_number": "SBIN0001111",
                "swift_code": "SBININBB",
                "is_active": True,
                "is_verified": True,
                "rating": Decimal("4.0"),
                "performance_score": Decimal("75.0"),
                "notes": "Industrial equipment and machinery supplier"
            },
            {
                "vendor_code": "VEN005",
                "company_name": "Quality Materials Ltd",
                "contact_person": "Kavita Singh",
                "email": "kavita@qualitymaterials.com",
                "phone": "+91-33-67890123",
                "mobile": "+91-9876543214",
                "website": "https://qualitymaterials.com",
                "billing_address": "654, Salt Lake City, Kolkata - 700091",
                "shipping_address": "654, Salt Lake City, Kolkata - 700091",
                "city": "Kolkata",
                "state": "West Bengal",
                "country": "India",
                "postal_code": "700091",
                "vendor_type": "supplier",
                "tax_number": "QUALITY444555666",
                "gst_number": "19AABCQ4444Z1Z5",
                "payment_terms": "net_30",
                "currency": "INR",
                "bank_name": "Punjab National Bank",
                "bank_account_number": "44455566677788",
                "routing_number": "PNBN0004444",
                "swift_code": "PNBNINBB",
                "is_active": True,
                "is_verified": True,
                "rating": Decimal("4.3"),
                "performance_score": Decimal("80.0"),
                "notes": "Quality raw materials and construction supplies"
            },
            {
                "vendor_code": "VEN006",
                "company_name": "Digital Solutions Pvt Ltd",
                "contact_person": "Rahul Verma",
                "email": "rahul@digitalsolutions.com",
                "phone": "+91-44-78901234",
                "mobile": "+91-9876543215",
                "website": "https://digitalsolutions.com",
                "billing_address": "987, T Nagar, Chennai - 600017",
                "shipping_address": "987, T Nagar, Chennai - 600017",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "country": "India",
                "postal_code": "600017",
                "vendor_type": "service_provider",
                "tax_number": "DIGITAL777888999",
                "gst_number": "33AABCD7777Z1Z5",
                "payment_terms": "net_30",
                "currency": "INR",
                "bank_name": "Canara Bank",
                "bank_account_number": "77788899900011",
                "routing_number": "CNRB0007777",
                "swift_code": "CNRBINBB",
                "is_active": True,
                "is_verified": True,
                "rating": Decimal("4.6"),
                "performance_score": Decimal("88.0"),
                "notes": "Digital marketing and IT services provider"
            },
            {
                "vendor_code": "VEN007",
                "company_name": "Logistics Express",
                "contact_person": "Meera Iyer",
                "email": "meera@logisticsexpress.com",
                "phone": "+91-79-89012345",
                "mobile": "+91-9876543216",
                "website": "https://logisticsexpress.com",
                "billing_address": "147, Navrangpura, Ahmedabad - 380009",
                "shipping_address": "147, Navrangpura, Ahmedabad - 380009",
                "city": "Ahmedabad",
                "state": "Gujarat",
                "country": "India",
                "postal_code": "380009",
                "vendor_type": "logistics",
                "tax_number": "LOGISTICS000111222",
                "gst_number": "24AABCL0000Z1Z5",
                "payment_terms": "net_15",
                "currency": "INR",
                "bank_name": "Bank of Baroda",
                "bank_account_number": "00011122233344",
                "routing_number": "BARB0000000",
                "swift_code": "BARBINBB",
                "is_active": True,
                "is_verified": True,
                "rating": Decimal("4.1"),
                "performance_score": Decimal("76.0"),
                "notes": "Logistics and transportation services"
            },
            {
                "vendor_code": "VEN008",
                "company_name": "Creative Design Studio",
                "contact_person": "Anjali Desai",
                "email": "anjali@creativedesign.com",
                "phone": "+91-20-90123456",
                "mobile": "+91-9876543217",
                "website": "https://creativedesign.com",
                "billing_address": "258, Koregaon Park, Pune - 411001",
                "shipping_address": "258, Koregaon Park, Pune - 411001",
                "city": "Pune",
                "state": "Maharashtra",
                "country": "India",
                "postal_code": "411001",
                "vendor_type": "service_provider",
                "tax_number": "CREATIVE333444555",
                "gst_number": "27AABCC3333Z1Z5",
                "payment_terms": "net_30",
                "currency": "INR",
                "bank_name": "Union Bank of India",
                "bank_account_number": "33344455566677",
                "routing_number": "UBIN0003333",
                "swift_code": "UBININBB",
                "is_active": True,
                "is_verified": True,
                "rating": Decimal("4.4"),
                "performance_score": Decimal("82.0"),
                "notes": "Creative design and branding services"
            },
            {
                "vendor_code": "VEN009",
                "company_name": "Security Systems Ltd",
                "contact_person": "Vikram Malhotra",
                "email": "vikram@securitysystems.com",
                "phone": "+91-11-01234567",
                "mobile": "+91-9876543218",
                "website": "https://securitysystems.com",
                "billing_address": "369, Connaught Place, New Delhi - 110001",
                "shipping_address": "369, Connaught Place, New Delhi - 110001",
                "city": "New Delhi",
                "state": "Delhi",
                "country": "India",
                "postal_code": "110001",
                "vendor_type": "supplier",
                "tax_number": "SECURITY666777888",
                "gst_number": "07AABCS6666Z1Z5",
                "payment_terms": "net_45",
                "currency": "INR",
                "bank_name": "Central Bank of India",
                "bank_account_number": "66677788899900",
                "routing_number": "CBIN0006666",
                "swift_code": "CBININBB",
                "is_active": True,
                "is_verified": True,
                "rating": Decimal("4.7"),
                "performance_score": Decimal("90.0"),
                "notes": "Security systems and surveillance equipment"
            },
            {
                "vendor_code": "VEN010",
                "company_name": "Green Energy Solutions",
                "contact_person": "Arun Kumar",
                "email": "arun@greenenergy.com",
                "phone": "+91-80-12345678",
                "mobile": "+91-9876543219",
                "website": "https://greenenergy.com",
                "billing_address": "741, Indiranagar, Bangalore - 560038",
                "shipping_address": "741, Indiranagar, Bangalore - 560038",
                "city": "Bangalore",
                "state": "Karnataka",
                "country": "India",
                "postal_code": "560038",
                "vendor_type": "supplier",
                "tax_number": "GREEN999000111",
                "gst_number": "29AABCG9999Z1Z5",
                "payment_terms": "net_30",
                "currency": "INR",
                "bank_name": "Indian Bank",
                "bank_account_number": "99900011122233",
                "routing_number": "IDIB0009999",
                "swift_code": "IDIBINBB",
                "is_active": True,
                "is_verified": True,
                "rating": Decimal("4.9"),
                "performance_score": Decimal("95.0"),
                "notes": "Solar panels and renewable energy solutions"
            }
        ]
        
        # Create vendors
        for vendor_data in vendors_data:
            vendor = Vendor(
                created_by=creator.id,
                **vendor_data
            )
            db.add(vendor)
        
        db.commit()
        print(f"✅ Successfully created {len(vendors_data)} vendors")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating vendors: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("🌱 Seeding vendor data...")
    create_vendors()
    print("✅ Vendor seeding completed!") 