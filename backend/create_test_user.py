import requests
import json
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:8001').rstrip('/')
TEST_USER_PASSWORD = os.getenv('TEST_USER_PASSWORD')

def create_test_user():
    """
    Creates a test user by calling the registration API endpoint.
    """
    
    # API endpoint
    url = f"{API_BASE_URL}/api/auth/register"

    if not TEST_USER_PASSWORD:
        raise RuntimeError('TEST_USER_PASSWORD is required to create a test user')
    
    # User data
    user_data = {
        "email": "testuser@example.com",
        "username": "testuser123",
        "password": TEST_USER_PASSWORD,
        "first_name": "Test",
        "last_name": "User",
        "phone": "+1234567890",
        "address": "123 Test Street"
    }
    
    try:
        response = requests.post(
            url,
            json=user_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ User created successfully!")
            print(f"📧 Email: {user_data['email']}")
            print(f" Username: {user_data['username']}")
            print(f"📋 User ID: {result.get('id', 'N/A')}")
            return True
        else:
            error_data = response.json()
            print(f"❌ Failed to create user: {error_data.get('detail', 'Unknown error')}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to the backend server.")
        print(f"   Make sure the backend server is running on {API_BASE_URL}")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Creating test user...")
    create_test_user() 