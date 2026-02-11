import psycopg2

conn = psycopg2.connect('postgresql://postgres.jcuupuwxfmdhpfwjemou:postgres@aws-1-ap-south-1.pooler.supabase.com:5432/postgres')
cur = conn.cursor()

print("Adding rcm_applicable column to organizations table...")
cur.execute("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS rcm_applicable BOOLEAN DEFAULT FALSE")
conn.commit()
print("✅ Done!")

cur.close()
conn.close()
