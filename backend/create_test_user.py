import requests
import json

def create_test_user():
    """
    Creates a test user by calling the registration API endpoint.
    """
    
    # API endpoint
    url = "http://localhost:8001/api/auth/register"
    
    # User data
    user_data = {
        "email": "testuser@example.com",
        "username": "testuser123",
        "password": "password123",
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
            print(f"🔑 Password: {user_data['password']}")
            print(f"👤 Username: {user_data['username']}")
            print(f"📋 User ID: {result.get('id', 'N/A')}")
            return True
        else:
            error_data = response.json()
            print(f"❌ Failed to create user: {error_data.get('detail', 'Unknown error')}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to the backend server.")
        print("   Make sure the backend server is running on http://localhost:8001")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Creating test user...")
    create_test_user() 