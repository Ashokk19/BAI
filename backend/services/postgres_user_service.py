"""
PostgreSQL User Service - Direct database operations without SQLAlchemy.
"""

from typing import Optional, Dict
from datetime import datetime
from database.postgres_db import postgres_db
import bcrypt

class PostgresUserService:
    """User operations using direct PostgreSQL queries."""
    
    @staticmethod
    def get_user_by_id(user_id: int) -> Optional[Dict]:
        """Get user by ID using direct PostgreSQL."""
        
        query = """
        SELECT id, account_id, username, email, full_name, 
               is_active, is_admin, created_at, updated_at
        FROM users 
        WHERE id = %s
        """
        
        try:
            return postgres_db.execute_single(query, (user_id,))
        except Exception as e:
            print(f"Error getting user by ID: {e}")
            return None
    
    @staticmethod
    def get_user_by_username(username: str) -> Optional[Dict]:
        """Get user by username using direct PostgreSQL."""
        
        query = """
        SELECT id, account_id, username, email, full_name, 
               hashed_password, is_active, is_admin, created_at, updated_at
        FROM users 
        WHERE username = %s
        """
        
        try:
            return postgres_db.execute_single(query, (username,))
        except Exception as e:
            print(f"Error getting user by username: {e}")
            return None
    
    @staticmethod
    def get_user_by_username_and_account(username: str, account_id: str) -> Optional[Dict]:
        """Get user by username and account_id using direct PostgreSQL."""
        
        query = """
        SELECT id, account_id, username, email, full_name, 
               hashed_password, is_active, is_admin, created_at, updated_at
        FROM users 
        WHERE username = %s AND account_id = %s
        """
        
        try:
            return postgres_db.execute_single(query, (username, account_id))
        except Exception as e:
            print(f"Error getting user by username and account: {e}")
            return None
    
    @staticmethod
    def get_user_by_email(email: str) -> Optional[Dict]:
        """Get user by email using direct PostgreSQL."""
        
        query = """
        SELECT id, account_id, username, email, full_name, 
               hashed_password, is_active, is_admin, created_at, updated_at
        FROM users 
        WHERE email = %s
        """
        
        try:
            return postgres_db.execute_single(query, (email,))
        except Exception as e:
            print(f"Error getting user by email: {e}")
            return None
    
    @staticmethod
    def create_user(user_data: Dict) -> Optional[Dict]:
        """Create a new user using direct PostgreSQL."""
        
        # Hash the password
        hashed_password = bcrypt.hashpw(
            user_data['password'].encode('utf-8'), 
            bcrypt.gensalt()
        ).decode('utf-8')
        
        insert_query = """
        INSERT INTO users (
            account_id, username, email, full_name, hashed_password,
            is_active, is_admin, created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s
        ) RETURNING id, account_id, username, email, full_name, 
                   is_active, is_admin, created_at, updated_at
        """
        
        params = (
            user_data.get('account_id'),
            user_data.get('username'),
            user_data.get('email'),
            user_data.get('full_name'),
            hashed_password,
            user_data.get('is_active', True),
            user_data.get('is_admin', False),
            datetime.now(),
            datetime.now()
        )
        
        try:
            print(f"Creating user with params: {params}")
            result = postgres_db.execute_single(insert_query, params)
            print(f"User creation result: {result}")
            return result
        except Exception as e:
            print(f"Error creating user: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash."""
        try:
            return bcrypt.checkpw(
                plain_password.encode('utf-8'), 
                hashed_password.encode('utf-8')
            )
        except Exception as e:
            print(f"Error verifying password: {e}")
            return False
    
    @staticmethod
    def authenticate_user(identifier: str, password: str, account_id: str) -> Optional[Dict]:
        """Authenticate user with identifier (username/email), password, and account_id."""
        
        query = """
        SELECT id, account_id, username, email, full_name,
               hashed_password, is_active, is_admin, created_at, updated_at
        FROM users
        WHERE account_id = %s AND (username = %s OR email = %s)
        LIMIT 1
        """
        try:
            user = postgres_db.execute_single(query, (account_id, identifier, identifier))
        except Exception as e:
            print(f"Error authenticating user: {e}")
            user = None
        
        if not user:
            return None
        
        if not PostgresUserService.verify_password(password, user['hashed_password']):
            return None
        
        # Remove password from returned user data
        user.pop('hashed_password', None)
        return user
