# backend/app.py
from flask import Flask, jsonify
from flask_cors import CORS
from routes.monday import monday_bp
from routes.auth import auth_bp
from routes.schedule import schedule
from routes.followup import followup_bp
from app_config import FLASK_SECRET_KEY
from db import init_db, seed_admin
from routes.admin import admin_bp
from routes.message_logger import message_logger
import sqlite3
import os
from db import DB_PATH



app = Flask(__name__)
app.secret_key = FLASK_SECRET_KEY

# ✅ Load frontend URL from environment for CORS
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
print(f"🔗 Allowing CORS requests from: {FRONTEND_URL}")

CORS(app, supports_credentials=True, resources={
    r"/api/*": {
        "origins": FRONTEND_URL,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# ✅ Register blueprints
app.register_blueprint(admin_bp)
app.register_blueprint(monday_bp, url_prefix="/api")
app.register_blueprint(auth_bp)
app.register_blueprint(schedule)
app.register_blueprint(followup_bp, url_prefix='/api')
app.register_blueprint(message_logger)


@app.route("/")
def index():
    return "Backend is running"

@app.route("/api/mentor-activity")
def mentor_activity():
    try:
        with sqlite3.connect("admin_data.db") as conn:
            c = conn.cursor()
            c.execute("""
                SELECT email, action, timestamp, details
                FROM mentor_actions
                ORDER BY timestamp DESC
            """)
            rows = c.fetchall()
            results = []
            for email, action, ts, details in rows:
                results.append({
                    "email": email,
                    "action": action,
                    "timestamp": ts,
                    "details": details
                })
            return jsonify(results)
    except Exception as e:
        print("Mentor activity fetch error:", e)
        return jsonify([])



if __name__ == "__main__":
    init_db()
    seed_admin()

    print("\n📍 Registered routes:")
    for rule in app.url_map.iter_rules():
        print(f"{rule.endpoint:30s} {rule.methods} {rule}")
    print()

    app.run(debug=True, port=5050)
