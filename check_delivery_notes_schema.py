import psycopg2
import os

# Get connection details from environment
conn = psycopg2.connect(
    host=os.getenv("POSTGRES_HOST", "aws-1-ap-south-1.pooler.supabase.com"),
    port=os.getenv("POSTGRES_PORT", "6543"),
    database=os.getenv("POSTGRES_DB", "postgres"),
    user=os.getenv("POSTGRES_USER", "postgres.yrgdjyepiqhvccqoxzya"),
    password=os.getenv("POSTGRES_PASSWORD")
)
cur = conn.cursor()

cur.execute("""
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'delivery_notes'
    ORDER BY ordinal_position
""")

print("Delivery Notes Table Schema:")
print("-" * 60)
for row in cur.fetchall():
    print(f"{row[0]:<30} {row[1]:<20} Nullable: {row[2]}")

cur.close()
conn.close()
