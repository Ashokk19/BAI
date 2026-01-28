import psycopg2
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')

conn = psycopg2.connect(
    host=os.getenv("POSTGRES_HOST"),
    port=os.getenv("POSTGRES_PORT"),
    database=os.getenv("POSTGRES_DB"),
    user=os.getenv("POSTGRES_USER"),
    password=os.getenv("POSTGRES_PASSWORD")
)
cur = conn.cursor()

# Get the delivery note
cur.execute("""
    SELECT id, account_id, delivery_note_number, invoice_id, status, delivery_date, created_at
    FROM delivery_notes
    ORDER BY id DESC
    LIMIT 5
""")

print("Recent Delivery Notes:")
print("-" * 100)
for row in cur.fetchall():
    print(f"ID: {row[0]}, Account: {row[1]}, Number: {row[2]}, Invoice ID: {row[3]}, Status: {row[4]}, Date: {row[5]}, Created: {row[6]}")

cur.close()
conn.close()
