import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

database_url = os.getenv('DATABASE_URL')
if not database_url:
    raise RuntimeError('DATABASE_URL is required to run this script')

conn = psycopg2.connect(database_url)
cur = conn.cursor()

print("Fixing Return Credit expiry dates...")

# Update all Return Credits to have NULL expiry_date (no expiry)
cur.execute("""
    UPDATE customer_credits 
    SET expiry_date = NULL
    WHERE credit_type = 'Return Credit'
    AND expiry_date IS NOT NULL
    RETURNING id, credit_number, credit_type, customer_id
""")

updated = cur.fetchall()
print(f"Updated {len(updated)} Return Credits:")
for row in updated:
    print(f"  ID: {row[0]}, Number: {row[1]}, Type: {row[2]}, Customer: {row[3]}")

conn.commit()
print("\n✅ Done! Return Credits will no longer expire.")

cur.close()
conn.close()
