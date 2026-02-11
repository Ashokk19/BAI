import psycopg2

conn = psycopg2.connect('postgresql://postgres.jcuupuwxfmdhpfwjemou:postgres@aws-1-ap-south-1.pooler.supabase.com:5432/postgres')
cur = conn.cursor()

print("Adding last_invoice_number column to organizations table...")
cur.execute("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_invoice_number INTEGER DEFAULT 0")

print("Adding last_proforma_number column to organizations table...")
cur.execute("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_proforma_number INTEGER DEFAULT 0")

conn.commit()
print("✅ Done!")

cur.close()
conn.close()
