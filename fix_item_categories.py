"""
Fix item categories in the database.
Update the category text field to match the category name from categories table.
"""

import sys
sys.path.insert(0, 'backend')

from database.postgres_db import postgres_db
from psycopg2.extras import RealDictCursor

def fix_categories():
    """Update items.category to match categories.name based on category_id"""
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # First, let's see what we have
        print("=== Current Items and Categories ===")
        cursor.execute("""
            SELECT 
                i.id,
                i.name as item_name,
                i.category as category_text,
                i.category_id,
                c.name as category_name
            FROM items i
            LEFT JOIN categories c ON i.category_id = c.id AND i.account_id = c.account_id
            WHERE i.account_id = 'TestAccount'
            ORDER BY i.name
        """)
        items = cursor.fetchall()
        
        for item in items:
            print(f"Item: {item['item_name']:<20} | category_text: {item['category_text']:<15} | category_id: {item['category_id']} | category_name: {item['category_name']}")
        
        # Update items to use the category name from categories table
        print("\n=== Updating category text field ===")
        cursor.execute("""
            UPDATE items i
            SET category = c.name
            FROM categories c
            WHERE i.category_id = c.id 
            AND i.account_id = c.account_id
            AND i.account_id = 'TestAccount'
        """)
        
        rows_updated = cursor.rowcount
        print(f"Updated {rows_updated} rows")
        
        conn.commit()
        
        # Verify the changes
        print("\n=== After Update ===")
        cursor.execute("""
            SELECT 
                i.id,
                i.name as item_name,
                i.category as category_text,
                i.category_id,
                c.name as category_name
            FROM items i
            LEFT JOIN categories c ON i.category_id = c.id AND i.account_id = c.account_id
            WHERE i.account_id = 'TestAccount'
            ORDER BY i.name
        """)
        items = cursor.fetchall()
        
        for item in items:
            print(f"Item: {item['item_name']:<20} | category_text: {item['category_text']:<15} | category_id: {item['category_id']} | category_name: {item['category_name']}")
        
        cursor.close()
        print("\n✅ Category update complete!")

if __name__ == "__main__":
    try:
        fix_categories()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
