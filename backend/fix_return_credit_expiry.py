import psycopg2

conn = psycopg2.connect('postgresql://postgres.jcuupuwxfmdhpfwjemou:postgres@aws-1-ap-south-1.pooler.supabase.com:5432/postgres')
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
