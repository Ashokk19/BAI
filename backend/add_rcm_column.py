import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

database_url = os.getenv('DATABASE_URL')
if not database_url:
    raise RuntimeError('DATABASE_URL is required to run this script')

conn = psycopg2.connect(database_url)
cur = conn.cursor()

print("Adding rcm_applicable column to organizations table...")
cur.execute("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS rcm_applicable BOOLEAN DEFAULT FALSE")
conn.commit()
print("✅ Done!")

cur.close()
conn.close()
