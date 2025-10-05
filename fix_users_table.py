#!/usr/bin/env python3
"""
Fix Users Table Structure

Add missing columns to match the User model.
"""

import psycopg2

def fix_users_table():
    """Add missing columns to the users table."""
    
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="bai_db",
            user="bai_user",
            password="bai_password"
        )
        cursor = conn.cursor()
        
        print("Fixing Users Table Structure...")
        print("=" * 40)
        
        # Check current columns
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = 'users'
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        print(f"Existing columns: {existing_columns}")
        
        # Define required columns from User model
        required_columns = {
            'username': 'VARCHAR(100) UNIQUE',
            'hashed_password': 'VARCHAR(255)',
            'first_name': 'VARCHAR(100)',
            'last_name': 'VARCHAR(100)',
            'is_active': 'BOOLEAN DEFAULT TRUE',
            'is_admin': 'BOOLEAN DEFAULT FALSE',
            'is_verified': 'BOOLEAN DEFAULT FALSE',
            'phone': 'VARCHAR(20)',
            'mobile': 'VARCHAR(20)',
            'address': 'TEXT',
            'city': 'VARCHAR(100)'
        }
        
        # Add missing columns
        for col_name, col_definition in required_columns.items():
            if col_name not in existing_columns:
                print(f"Adding column: {col_name}")
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_definition}")
            else:
                print(f"Column {col_name} already exists")
        
        # Create indexes for username and email if they don't exist
        try:
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username)")
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email)")
            print("Indexes created/verified")
        except Exception as e:
            print(f"Index creation warning: {e}")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("Users table structure fixed successfully!")
        return True
        
    except Exception as e:
        print(f"Error fixing users table: {e}")
        return False

if __name__ == "__main__":
    fix_users_table()
