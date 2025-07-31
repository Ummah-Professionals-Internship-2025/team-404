# db_schema.py


import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "admin_data.db")

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()


cur.execute("DROP TABLE IF EXISTS admin_submissions")


cur.execute("""
CREATE TABLE admin_submissions (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    industry TEXT,
    academicStanding TEXT,
    lookingFor TEXT,
    resume TEXT,
    howTheyHeard TEXT,
    availability TEXT,
    timeline TEXT,
    otherInfo TEXT,
    submitted TEXT,
    status TEXT,
    pickedBy TEXT,
    updated_at TEXT,
    pickedByEmail TEXT,
    event_id TEXT
)
""")

conn.commit()
conn.close()

print(f"✅ SQLite DB initialized at {DB_PATH} with admin_submissions table.")
