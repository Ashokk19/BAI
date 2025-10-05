#!/usr/bin/env python3
"""
Final Fix for Users Table

Add the missing columns that are still causing errors.
"""

import psycopg2

def fix_users_table_final():
    """Add the specific missing columns that are causing errors."""
    
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="bai_db",
            user="bai_user",
            password="bai_password"
        )
        cursor = conn.cursor()
        
        print("Final fix for users table...")
        print("=" * 40)
        
        # Check what columns currently exist
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        print(f"Current columns: {existing_columns}")
        
        # The specific columns that are missing based on the error
        missing_columns = {
            'state': 'VARCHAR(100)',
            'postal_code': 'VARCHAR(20)', 
            'company': 'VARCHAR(200)',
            'designation': 'VARCHAR(100)'
        }
        
        # Add each missing column
        for col_name, col_type in missing_columns.items():
            if col_name not in existing_columns:
                print(f"Adding missing column: {col_name}")
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
                print(f"✅ Added {col_name}")
            else:
                print(f"✅ Column {col_name} already exists")
        
        # Commit the changes
        conn.commit()
        
        # Verify the columns were added
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        """)
        final_columns = [row[0] for row in cursor.fetchall()]
        print(f"\nFinal columns: {final_columns}")
        
        # Check if all required columns are now present
        required_columns = ['account_id', 'id', 'email', 'username', 'hashed_password', 
                          'first_name', 'last_name', 'is_active', 'is_admin', 'is_verified',
                          'phone', 'mobile', 'address', 'city', 'state', 'postal_code', 
                          'company', 'designation']
        
        missing = [col for col in required_columns if col not in final_columns]
        if missing:
            print(f"❌ Still missing: {missing}")
        else:
            print("✅ All required columns are present!")
        
        cursor.close()
        conn.close()
        
        return len(missing) == 0
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = fix_users_table_final()
    if success:
        print("\n🎉 Users table is now complete!")
        print("Please restart the server to apply changes.")
    else:
        print("\n❌ There are still issues with the users table.")
