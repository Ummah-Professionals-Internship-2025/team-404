import sqlite3

conn = sqlite3.connect("admin_data.db")
cursor = conn.cursor()

# Store meeting statuses and who picked them
cursor.execute('''
CREATE TABLE IF NOT EXISTS admin_submissions (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    availability TEXT,
    industry TEXT,
    status TEXT,
    picked_by TEXT,
    updated_at TEXT
)
''')

# Optional: Admin login tracking
cursor.execute('''
CREATE TABLE IF NOT EXISTS admin_logins (
    email TEXT,
    timestamp TEXT
)
''')

conn.commit()
conn.close()
