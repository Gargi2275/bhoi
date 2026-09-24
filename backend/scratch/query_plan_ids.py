import os
import sqlite3

db_path = r"c:\Users\HP\Downloads\we-are-going-home-main\we-are-going-home-main\backend\db.sqlite3"

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT id, name, code, monthly_price FROM api_subscriptionplan")
    rows = cursor.fetchall()
    print("Plans in DB:")
    for r in rows:
        print(f"ID: {r[0]} | Name: {r[1]} | Code: {r[2]} | Monthly Price: {r[3]}")
except Exception as e:
    print("Error:", e)

conn.close()
