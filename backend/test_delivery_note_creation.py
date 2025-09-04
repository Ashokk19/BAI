#!/usr/bin/env python3
"""
Test script to verify automatic delivery note creation for invoices.
"""

import requests
import json
from datetime import datetime

# API base URL
BASE_URL = "http://localhost:8001"

def test_login():
    """Test login to get authentication token."""
    login_data = {
        "identifier": "admin@bai.com",
        "password": "admin123",
        "account_id": "TestAccount"
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
    if response.status_code == 200:
        token = response.json()["access_token"]
        print("✅ Login successful")
        return token
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(response.text)
        return None

def test_invoice_creation(token):
    """Test creating an invoice to see if delivery note is created automatically."""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test invoice data
    invoice_data = {
        "account_id": "TestAccount",
        "customer_id": 1,  # Assuming customer ID 1 exists
        "invoice_date": datetime.now().isoformat(),
        "due_date": datetime.now().isoformat(),
        "currency": "INR",
        "billing_address": "123 Test Street, Test City, Test State",
        "shipping_address": "123 Test Street, Test City, Test State",
        "customer_state": "Tamil Nadu",
        "company_state": "Tamil Nadu",
        "items": [
            {
                "item_id": 1,  # Assuming item ID 1 exists
                "item_name": "Test Item",
                "item_sku": "TEST-001",
                "quantity": 2,
                "unit_price": 100.00,
                "gst_rate": 18.0
            }
        ]
    }
    
    print(f"Creating test invoice with customer ID: {invoice_data['customer_id']}")
    
    response = requests.post(f"{BASE_URL}/api/sales/invoices", json=invoice_data, headers=headers)
    if response.status_code == 200:
        invoice = response.json()
        print(f"✅ Invoice created successfully with ID: {invoice['id']}")
        return invoice['id']
    else:
        print(f"❌ Invoice creation failed: {response.status_code}")
        print(response.text)
        return None

def check_delivery_notes(token, invoice_id):
    """Check if delivery notes were created for the invoice."""
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"Checking delivery notes for invoice {invoice_id}...")
    
    response = requests.get(f"{BASE_URL}/api/sales/shipments/delivery-notes?invoice_id={invoice_id}", headers=headers)
    if response.status_code == 200:
        delivery_notes = response.json()
        if delivery_notes:
            print(f"✅ Found {len(delivery_notes)} delivery note(s):")
            for note in delivery_notes:
                print(f"   - DN: {note['delivery_note_number']}, Status: {note['delivery_status']}")
        else:
            print("❌ No delivery notes found for this invoice")
        return delivery_notes
    else:
        print(f"❌ Failed to fetch delivery notes: {response.status_code}")
        print(response.text)
        return []

def check_pending_payments(token, invoice_id):
    """Check if pending payment was created for the invoice."""
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"Checking pending payments for invoice {invoice_id}...")
    
    response = requests.get(f"{BASE_URL}/api/sales/payments?invoice_id={invoice_id}", headers=headers)
    if response.status_code == 200:
        payments = response.json()
        if payments:
            print(f"✅ Found {len(payments)} payment(s):")
            for payment in payments:
                print(f"   - Payment: {payment['payment_number']}, Status: {payment['payment_status']}")
        else:
            print("❌ No payments found for this invoice")
        return payments
    else:
        print(f"❌ Failed to fetch payments: {response.status_code}")
        print(response.text)
        return []

def main():
    """Main test function."""
    print("🧪 Testing Automatic Delivery Note Creation for Invoices")
    print("=" * 60)
    
    # Step 1: Login
    token = test_login()
    if not token:
        return
    
    # Step 2: Create test invoice
    invoice_id = test_invoice_creation(token)
    if not invoice_id:
        return
    
    print("\n" + "=" * 60)
    
    # Step 3: Check if delivery note was created
    delivery_notes = check_delivery_notes(token, invoice_id)
    
    # Step 4: Check if pending payment was created
    pending_payments = check_pending_payments(token, invoice_id)
    
    print("\n" + "=" * 60)
    
    if delivery_notes:
        print("🎉 SUCCESS: Automatic delivery note creation is working!")
    else:
        print("❌ FAILURE: Automatic delivery note creation is NOT working!")
    
    if pending_payments:
        print("🎉 SUCCESS: Automatic pending payment creation is working!")
    else:
        print("❌ FAILURE: Automatic pending payment creation is NOT working!")

if __name__ == "__main__":
    main()
