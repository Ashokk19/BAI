#!/usr/bin/env python3
"""
Add Missing Columns to Users Table

This script adds the missing columns to the users table to match the User model.
"""

import psycopg2

def add_user_columns():
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
        
        print("Adding missing columns to users table...")
        print("=" * 50)
        
        # Check current columns
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = 'users'
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        print(f"Existing columns: {existing_columns}")
        
        # Define columns to add
        columns_to_add = {
            'username': 'VARCHAR(100)',
            'hashed_password': 'VARCHAR(255)',
            'first_name': 'VARCHAR(100)',
            'last_name': 'VARCHAR(100)',
            'is_active': 'BOOLEAN DEFAULT TRUE',
            'is_admin': 'BOOLEAN DEFAULT FALSE', 
            'is_verified': 'BOOLEAN DEFAULT FALSE',
            'phone': 'VARCHAR(20)',
            'mobile': 'VARCHAR(20)',
            'address': 'TEXT',
            'city': 'VARCHAR(100)',
            'state': 'VARCHAR(100)',
            'postal_code': 'VARCHAR(20)',
            'company': 'VARCHAR(200)',
            'designation': 'VARCHAR(100)'
        }
        
        # Add missing columns
        added_count = 0
        for col_name, col_definition in columns_to_add.items():
            if col_name not in existing_columns:
                print(f"Adding column: {col_name} {col_definition}")
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_definition}")
                added_count += 1
            else:
                print(f"Column {col_name} already exists")
        
        # Add unique constraints if columns were added
        if 'username' not in existing_columns:
            try:
                cursor.execute("ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username)")
                print("Added unique constraint for username")
            except Exception as e:
                print(f"Username constraint warning: {e}")
        
        if 'email' in existing_columns:
            try:
                cursor.execute("ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email)")
                print("Added unique constraint for email")
            except Exception as e:
                print(f"Email constraint warning (may already exist): {e}")
        
        # Create indexes
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_users_username ON users (username)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_users_email ON users (email)")
            print("Created/verified indexes")
        except Exception as e:
            print(f"Index creation warning: {e}")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"\nSuccessfully added {added_count} columns to users table!")
        return True
        
    except Exception as e:
        print(f"Error adding columns: {e}")
        return False

if __name__ == "__main__":
    add_user_columns()
