import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "admin.db"

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
