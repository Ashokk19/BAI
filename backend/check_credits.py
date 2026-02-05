import psycopg2

conn = psycopg2.connect('postgresql://postgres.jcuupuwxfmdhpfwjemou:postgres@aws-1-ap-south-1.pooler.supabase.com:5432/postgres')
cur = conn.cursor()

print("Checking all credits for customer_id=10:")
cur.execute("""
    SELECT id, credit_number, credit_type, customer_id, account_id, status, 
           original_amount, remaining_amount, used_amount, expiry_date, created_at
    FROM customer_credits 
    WHERE customer_id = 10 
    ORDER BY credit_date
""")

for row in cur.fetchall():
    print(f"  ID: {row[0]}, Number: {row[1]}, Type: {row[2]}, Status: {row[5]}")
    print(f"    Original: {row[6]}, Remaining: {row[7]}, Used: {row[8]}")
    print(f"    Expiry: {row[9]}, Created: {row[10]}")
    print()

print("\nChecking credits that match the WHERE clause (active, remaining > 0, not expired):")
cur.execute("""
    SELECT id, credit_number, credit_type, status, remaining_amount, expiry_date
    FROM customer_credits
    WHERE customer_id = 10
    AND status = 'active'
    AND remaining_amount > 0
    AND (expiry_date IS NULL OR expiry_date > CURRENT_TIMESTAMP)
    ORDER BY credit_date ASC
""")

rows = cur.fetchall()
print(f"Found {len(rows)} credits matching the query:")
for row in rows:
    print(f"  {row[1]} ({row[2]}): remaining={row[4]}, status={row[3]}, expiry={row[5]}")

cur.close()
conn.close()
