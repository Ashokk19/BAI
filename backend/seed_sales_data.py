"""
Comprehensive script to seed real data for sales modules.
"""

import requests
import json
from datetime import datetime, timedelta
from decimal import Decimal

BASE_URL = "http://localhost:8001/api"

# Sample data for seeding
def seed_all_sales_data():
    """Seed data for all sales modules."""
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        print("Starting comprehensive sales data seeding...")
        
        # 1. Seed Tamil Nadu customers first
        print("\n1. Seeding Tamil Nadu customers...")
        response = requests.post(f"{BASE_URL}/sales/customers/seed-tamil-nadu-customers", headers=headers)
        if response.status_code == 200:
            print("✓ Tamil Nadu customers seeded successfully")
            result = response.json()
            print(f"Created {len(result.get('created_customers', []))} customers")
        else:
            print(f"✗ Failed to seed customers: {response.status_code}")
        
        # 2. Seed GST slabs
        print("\n2. Seeding GST slabs...")
        response = requests.post(f"{BASE_URL}/sales/invoices/seed-gst-slabs", headers=headers)
        if response.status_code == 200:
            print("✓ GST slabs seeded successfully")
        else:
            print(f"✗ Failed to seed GST slabs: {response.status_code}")
        
        # 3. Seed sample invoices
        print("\n3. Seeding sample invoices...")
        response = requests.post(f"{BASE_URL}/sales/invoices/seed-sample-invoices", headers=headers)
        if response.status_code == 200:
            print("✓ Sample invoices seeded successfully")
            result = response.json()
            print(f"Created {len(result.get('created_invoices', []))} invoices")
        else:
            print(f"✗ Failed to seed invoices: {response.status_code}")
        
        # 4. Seed sample payments
        print("\n4. Seeding sample payments...")
        response = requests.post(f"{BASE_URL}/sales/payments/seed-sample-payments", headers=headers)
        if response.status_code == 200:
            print("✓ Sample payments seeded successfully")
            result = response.json()
            print(f"Created {len(result.get('created_payments', []))} payments")
        else:
            print(f"✗ Failed to seed payments: {response.status_code}")
        
        # 5. Seed customer credits
        print("\n5. Seeding customer credits...")
        response = requests.post(f"{BASE_URL}/sales/credits/seed-sample-credits", headers=headers)
        if response.status_code == 200:
            print("✓ Customer credits seeded successfully")
            result = response.json()
            print(f"Created {len(result.get('created_credits', []))} credits")
        else:
            print(f"✗ Failed to seed credits: {response.status_code}")
        
        # 6. Seed sales returns
        print("\n6. Seeding sales returns...")
        response = requests.post(f"{BASE_URL}/sales/returns/seed-sample-returns", headers=headers)
        if response.status_code == 200:
            print("✓ Sales returns seeded successfully")
            result = response.json()
            print(f"Created {len(result.get('created_returns', []))} returns")
        else:
            print(f"✗ Failed to seed returns: {response.status_code}")
        
        # 7. Seed shipments
        print("\n7. Seeding shipments...")
        response = requests.post(f"{BASE_URL}/sales/shipments/seed-sample-shipments", headers=headers)
        if response.status_code == 200:
            print("✓ Shipments seeded successfully")
            result = response.json()
            print(f"Created {len(result.get('created_shipments', []))} shipments")
        else:
            print(f"✗ Failed to seed shipments: {response.status_code}")
        
        print("\n" + "="*50)
        print("✓ COMPREHENSIVE SALES DATA SEEDING COMPLETED!")
        print("="*50)
        
        # Verify data counts
        print("\nVerifying seeded data...")
        
        endpoints = [
            ("customers", "/sales/customers/"),
            ("invoices", "/sales/invoices/"),
            ("payments", "/sales/payments/"),
            ("credits", "/sales/credits/"),
            ("returns", "/sales/returns/"),
            ("shipments", "/sales/shipments/")
        ]
        
        for name, endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            if response.status_code == 200:
                data = response.json()
                total = data.get('total', 0)
                print(f"- {name.capitalize()}: {total} records")
            else:
                print(f"- {name.capitalize()}: Failed to fetch")
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Is it running on port 8001?")
        print("Please ensure the backend server is running with: python -m uvicorn app.main:app --reload --port 8001")
    except Exception as e:
        print(f"Error seeding data: {e}")

if __name__ == "__main__":
    seed_all_sales_data() 