#!/usr/bin/env python3
"""
Test script to verify delivery status logic for invoices.
This script tests the delivery status functionality to ensure it works correctly.
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8001"
API_BASE = f"{BASE_URL}/api"

def test_delivery_status_logic():
    """Test the delivery status logic for invoices."""
    
    print("🧪 Testing Delivery Status Logic for Invoices")
    print("=" * 50)
    
    # Step 1: Test authentication
    print("\n1. Testing authentication...")
    auth_data = {
        "identifier": "admin@bai.com",
        "password": "admin123",
        "account_id": "TestAccount"
    }
    
    try:
        auth_response = requests.post(f"{API_BASE}/auth/login", json=auth_data)
        if auth_response.status_code == 200:
            token = auth_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            print("✅ Authentication successful")
        else:
            print(f"❌ Authentication failed: {auth_response.status_code}")
            print(auth_response.text)
            return
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        return
    
    # Step 2: Get all invoices
    print("\n2. Fetching invoices...")
    try:
        invoices_response = requests.get(f"{API_BASE}/sales/invoices", headers=headers)
        if invoices_response.status_code == 200:
            invoices = invoices_response.json()["invoices"]
            print(f"✅ Found {len(invoices)} invoices")
        else:
            print(f"❌ Failed to fetch invoices: {invoices_response.status_code}")
            print(invoices_response.text)
            return
    except Exception as e:
        print(f"❌ Error fetching invoices: {e}")
        return
    
    if not invoices:
        print("⚠️ No invoices found to test")
        return
    
    # Step 3: Check delivery notes for each invoice
    print("\n3. Checking delivery notes for each invoice...")
    for invoice in invoices[:5]:  # Test first 5 invoices
        invoice_id = invoice["id"]
        invoice_number = invoice["invoice_number"]
        
        print(f"\n   Invoice: {invoice_number} (ID: {invoice_id})")
        
        # Check delivery notes
        try:
            delivery_notes_response = requests.get(
                f"{API_BASE}/sales/shipments/delivery-notes/by-invoice/{invoice_id}", 
                headers=headers
            )
            
            if delivery_notes_response.status_code == 200:
                delivery_notes = delivery_notes_response.json()
                if delivery_notes:
                    print(f"   ✅ Found {len(delivery_notes)} delivery note(s)")
                    for note in delivery_notes:
                        print(f"      - DN: {note['delivery_note_number']}, Status: {note['delivery_status']}")
                else:
                    print("   ⚠️ No delivery notes found")
            else:
                print(f"   ❌ Failed to fetch delivery notes: {delivery_notes_response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Error checking delivery notes: {e}")
        
        # Check shipments
        try:
            shipments_response = requests.get(
                f"{API_BASE}/sales/shipments/by-invoice/{invoice_id}", 
                headers=headers
            )
            
            if shipments_response.status_code == 200:
                shipments = shipments_response.json()
                if shipments:
                    print(f"   ✅ Found {len(shipments)} shipment(s)")
                    for shipment in shipments:
                        print(f"      - Shipment: {shipment['shipment_number']}, Status: {shipment['status']}")
                else:
                    print("   ⚠️ No shipments found")
            else:
                print(f"   ❌ Failed to fetch shipments: {shipments_response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Error checking shipments: {e}")
    
    # Step 4: Test creating delivery notes for existing invoices
    print("\n4. Testing delivery note creation for existing invoices...")
    try:
        create_response = requests.post(
            f"{API_BASE}/sales/shipments/create-delivery-notes-for-invoices", 
            headers=headers
        )
        
        if create_response.status_code == 200:
            result = create_response.json()
            print(f"✅ {result['message']}")
        else:
            print(f"❌ Failed to create delivery notes: {create_response.status_code}")
            print(create_response.text)
            
    except Exception as e:
        print(f"❌ Error creating delivery notes: {e}")
    
    # Step 5: Verify delivery notes were created
    print("\n5. Verifying delivery notes after creation...")
    try:
        invoices_response = requests.get(f"{API_BASE}/sales/invoices", headers=headers)
        if invoices_response.status_code == 200:
            invoices = invoices_response.json()["invoices"]
            
            for invoice in invoices[:3]:  # Check first 3 invoices
                invoice_id = invoice["id"]
                invoice_number = invoice["invoice_number"]
                
                delivery_notes_response = requests.get(
                    f"{API_BASE}/sales/shipments/delivery-notes/by-invoice/{invoice_id}", 
                    headers=headers
                )
                
                if delivery_notes_response.status_code == 200:
                    delivery_notes = delivery_notes_response.json()
                    if delivery_notes:
                        print(f"   ✅ Invoice {invoice_number}: {len(delivery_notes)} delivery note(s)")
                    else:
                        print(f"   ⚠️ Invoice {invoice_number}: No delivery notes")
                else:
                    print(f"   ❌ Invoice {invoice_number}: Failed to fetch delivery notes")
                    
        else:
            print(f"❌ Failed to fetch invoices for verification: {invoices_response.status_code}")
            
    except Exception as e:
        print(f"❌ Error during verification: {e}")
    
    print("\n" + "=" * 50)
    print("🏁 Delivery Status Logic Test Complete!")

if __name__ == "__main__":
    test_delivery_status_logic()
