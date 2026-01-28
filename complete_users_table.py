#!/usr/bin/env python3
"""
Complete Users Table Setup

Add all missing columns to match the User model exactly.
"""

import psycopg2

def complete_users_table():
    """Add all missing columns to the users table."""
    
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="bai_db",
            user="bai_user",
            password="bai_password"
        )
        cursor = conn.cursor()
        
        print("Completing users table setup...")
        print("=" * 40)
        
        # Check current columns
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = 'users'
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        print(f"Existing columns: {existing_columns}")
        
        # Define all required columns from the User model
        required_columns = {
            'created_at': 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
            'updated_at': 'TIMESTAMP WITH TIME ZONE',
            'last_login': 'TIMESTAMP WITH TIME ZONE'
        }
        
        # Add missing columns
        added_count = 0
        for col_name, col_definition in required_columns.items():
            if col_name not in existing_columns:
                print(f"Adding column: {col_name}")
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_definition}")
                added_count += 1
                print(f"✅ Added {col_name}")
            else:
                print(f"✅ Column {col_name} already exists")
        
        # Commit changes
        conn.commit()
        
        # Verify final state
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        """)
        final_columns = [row[0] for row in cursor.fetchall()]
        print(f"\nFinal columns ({len(final_columns)}): {final_columns}")
        
        # Check if all expected columns are present
        expected_columns = [
            'account_id', 'id', 'email', 'username', 'hashed_password',
            'first_name', 'last_name', 'is_active', 'is_admin', 'is_verified',
            'phone', 'mobile', 'address', 'city', 'state', 'postal_code',
            'company', 'designation', 'created_at', 'updated_at', 'last_login'
        ]
        
        missing = [col for col in expected_columns if col not in final_columns]
        if missing:
            print(f"❌ Still missing: {missing}")
            return False
        else:
            print("✅ All required columns are present!")
            return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    success = complete_users_table()
    if success:
        print("\n🎉 Users table is now complete!")
        print("All required columns have been added.")
    else:
        print("\n❌ Users table setup incomplete.")
