#!/usr/bin/env python3
"""
Test the dashboard API endpoint.
"""

import requests
import json

def test_dashboard_api():
    """Test the dashboard API endpoint."""
    
    print("Testing dashboard API endpoint...")
    
    try:
        response = requests.get(
            "http://localhost:8001/api/dashboard/?timeline=Today",
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Dashboard API working!")
            data = response.json()
            print("Response keys:", list(data.keys()))
            if 'kpis' in data:
                print(f"KPIs count: {len(data['kpis'])}")
        elif response.status_code == 500:
            print("❌ Server error - check logs")
            print("Response text:", response.text[:500])
        else:
            print(f"Response status: {response.status_code}")
            print("Response text:", response.text[:500])
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_dashboard_api()
