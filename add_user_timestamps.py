#!/usr/bin/env python3
"""
Add Timestamp Columns to Users Table

Add created_at and updated_at columns if they don't exist.
"""

import psycopg2

def add_user_timestamps():
    """Add timestamp columns to the users table."""
    
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="bai_db",
            user="bai_user",
            password="bai_password"
        )
        cursor = conn.cursor()
        
        print("Adding timestamp columns to users table...")
        print("=" * 45)
        
        # Check current columns
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = 'users'
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        print(f"Current columns: {existing_columns}")
        
        # Add created_at if missing
        if 'created_at' not in existing_columns:
            print("Adding created_at column...")
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            """)
            print("✅ Added created_at")
        else:
            print("✅ created_at already exists")
        
        # Add updated_at if missing
        if 'updated_at' not in existing_columns:
            print("Adding updated_at column...")
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE
            """)
            print("✅ Added updated_at")
        else:
            print("✅ updated_at already exists")
        
        # Commit changes
        conn.commit()
        
        # Verify final columns
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        """)
        final_columns = [row[0] for row in cursor.fetchall()]
        print(f"\nFinal columns: {final_columns}")
        
        # Check if timestamp columns are present
        has_timestamps = 'created_at' in final_columns and 'updated_at' in final_columns
        if has_timestamps:
            print("✅ All timestamp columns are present!")
        else:
            print("❌ Some timestamp columns are missing")
        
        cursor.close()
        conn.close()
        
        return has_timestamps
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = add_user_timestamps()
    if success:
        print("\n🎉 User timestamp columns added successfully!")
        print("Please restart the server to apply changes.")
    else:
        print("\n❌ Failed to add timestamp columns.")
