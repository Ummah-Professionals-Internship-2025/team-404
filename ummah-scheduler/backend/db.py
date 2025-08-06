import sqlite3
from pathlib import Path
from datetime import datetime

import os
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "admin_data.db"))



def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("""
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
        """)

        # ✅ Create mentor_actions table
        c.execute("""
        CREATE TABLE IF NOT EXISTS mentor_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            action TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            details TEXT
        )
        """)
        # Try to add 'details' if missing
        try:
            c.execute("ALTER TABLE mentor_actions ADD COLUMN details TEXT")
        except sqlite3.OperationalError:
            pass  # column already exists
        conn.commit()

def verify_admin(email, password):
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM admin WHERE email=? AND password=?", (email, password))
        return c.fetchone() is not None

def seed_admin():
    from os import getenv
    email = getenv("ADMIN_EMAIL")
    password = getenv("ADMIN_PASSWORD")
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("INSERT OR IGNORE INTO admin (email, password) VALUES (?, ?)", (email, password))
        conn.commit()

def log_mentor_action(email, action, details=None):
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS mentor_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                action TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                details TEXT
            )
        """)
        c.execute("""
            INSERT INTO mentor_actions (email, action, timestamp, details)
            VALUES (?, ?, ?, ?)
        """, (email, action, datetime.utcnow().isoformat(), details))
        conn.commit()
