import json
import sqlite3
import os
from datetime import datetime

# Paths
BASE_DIR = os.path.dirname(__file__)
JSON_FILE = os.path.join(BASE_DIR, "data", "submissions.json")
DB_PATH = os.path.join(BASE_DIR, "admin_data.db")

# Connect to SQLite
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# Make sure the table exists with all columns we need
c.execute("""
CREATE TABLE IF NOT EXISTS admin_submissions (
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
    pickedByEmail TEXT,
    event_id TEXT,
    updated_at TEXT
)
""")

# Read JSON file
if not os.path.exists(JSON_FILE):
    print("❌ submissions.json not found")
    exit()

with open(JSON_FILE, "r") as f:
    submissions = json.load(f)

print(f"Found {len(submissions)} submissions in JSON")

for sub in submissions:
    # Extract fields safely
    c.execute("""
        INSERT INTO admin_submissions (
            id, name, email, phone, industry, academicStanding,
            lookingFor, resume, howTheyHeard, availability, timeline,
            otherInfo, submitted, status, pickedBy, pickedByEmail, event_id, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            email=excluded.email,
            phone=excluded.phone,
            industry=excluded.industry,
            academicStanding=excluded.academicStanding,
            lookingFor=excluded.lookingFor,
            resume=excluded.resume,
            howTheyHeard=excluded.howTheyHeard,
            availability=excluded.availability,
            timeline=excluded.timeline,
            otherInfo=excluded.otherInfo,
            submitted=excluded.submitted,
            status=excluded.status,
            pickedBy=excluded.pickedBy,
            pickedByEmail=excluded.pickedByEmail,
            event_id=excluded.event_id,
            updated_at=excluded.updated_at
    """, (
        sub.get("id"),
        sub.get("name"),
        sub.get("email"),
        sub.get("phone"),
        sub.get("industry"),
        sub.get("academicStanding"),
        sub.get("lookingFor"),
        sub.get("resume"),
        sub.get("howTheyHeard"),
        sub.get("availability"),
        sub.get("timeline"),
        sub.get("otherInfo"),
        sub.get("submitted"),
        sub.get("status", "To Do"),
        sub.get("pickedBy"),
        sub.get("pickedByEmail"),
        sub.get("event_id"),
        datetime.utcnow().isoformat()
    ))

conn.commit()
conn.close()

print("✅ Migration complete! Check admin_data.db in DB Browser.")
