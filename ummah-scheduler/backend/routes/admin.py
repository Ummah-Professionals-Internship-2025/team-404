# backend/routes/admin.py
from flask import Blueprint, request, jsonify
from db import verify_admin
import os, sqlite3
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from datetime import datetime

admin_bp = Blueprint("admin", __name__)

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "admin_data.db")


# ---------------------------
# Admin Login (legacy password)
# ---------------------------
@admin_bp.route("/api/admin-login", methods=["POST"])
def admin_login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    if verify_admin(email, password):
        return jsonify({"success": True})
    return jsonify({"success": False}), 401


# ---------------------------
# Fetch Live Submissions (Internal Dashboard)
# ---------------------------
@admin_bp.route("/api/submissions", methods=["GET"])
def list_submissions():
    """Live Monday.com submissions merged with admin status for internal dashboard."""
    try:
        from services.monday_poll import get_latest_items
        items = get_latest_items(limit=50)

        # Merge admin statuses
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT id, status, pickedBy FROM admin_submissions").fetchall()
        conn.close()
        status_map = {row["id"]: row for row in rows}

        for item in items:
            sub_id = item["id"]
            if sub_id in status_map:
                db_row = status_map[sub_id]
                item["status"] = db_row["status"]
                item["pickedBy"] = db_row["pickedBy"]

        return jsonify(items)

    except Exception as e:
        print("❌ Error fetching Monday.com submissions:", e)
        return jsonify({"error": str(e)}), 500


# ---------------------------
# Fetch Admin-only Submissions
# ---------------------------
@admin_bp.route("/api/admin-submissions", methods=["GET"])
def list_admin_submissions():
    """Admin-only dashboard (SQLite entries with meeting info)."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        rows = conn.execute("""
            SELECT 
                id, name, email, status, pickedBy, pickedByEmail, 
                event_id, phone, industry, academicStanding,
                availability, timeline, resume, otherInfo, submitted, updated_at
            FROM admin_submissions
            ORDER BY submitted DESC
        """).fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])

    except Exception as e:
        print("❌ Error fetching admin submissions:", e)
        return jsonify({"error": str(e)}), 500


# ---------------------------
# Cancel Meeting (Admin) - Uses Admin Token
# ---------------------------
@admin_bp.route("/api/cancel-meeting", methods=["POST"])
def cancel_meeting():
    """Cancels a scheduled meeting using the admin token and updates status to Canceled."""
    data = request.json
    sub_id = data.get("id")
    if not sub_id:
        return jsonify({"error": "Missing submission ID"}), 400

    try:
        # Connect to DB
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        # Get the submission row
        row = cur.execute("""
            SELECT id, name, email, pickedByEmail, event_id
            FROM admin_submissions
            WHERE id = ?
        """, (sub_id,)).fetchone()

        if not row:
            conn.close()
            return jsonify({"error": "Submission not found"}), 404

        student_name = row["name"]
        event_id = row["event_id"]

               # ✅ Load Admin Token JSON from environment variable
        import json
        token_data = os.getenv("ADMIN_TOKEN_JSON")
        if not token_data:
            conn.close()
            return jsonify({"error": "Admin token not set in environment"}), 500

        try:
            token_data = json.loads(token_data)
        except Exception:
            conn.close()
            return jsonify({"error": "Invalid ADMIN_TOKEN_JSON format"}), 500


        # ✅ Ensure refresh_token exists (requires new script with prompt='consent')
        creds = Credentials.from_authorized_user_info(token_data)
        if not creds.refresh_token:
            conn.close()
            return jsonify({"error": "Admin token missing refresh_token. Re-generate with prompt='consent'."}), 500

        # Build calendar service
        calendar_service = build("calendar", "v3", credentials=creds)

        # ✅ Delete event and trigger Google official cancellation email
        if event_id:
            try:
                calendar_service.events().delete(
                    calendarId='primary',
                    eventId=event_id,
                    sendUpdates='all'  # Google sends official cancellation to mentor + student
                ).execute()
                print(f"✅ Event {event_id} deleted; Google auto sent cancellation emails.")
            except Exception as ce:
                print(f"⚠️ Could not delete event {event_id}: {ce}")

        # ✅ Update SQLite status
        cur.execute("""
            UPDATE admin_submissions
            SET status = ?, updated_at = ?
            WHERE id = ?
        """, ("Canceled", datetime.utcnow().isoformat(), sub_id))
        conn.commit()
        conn.close()

        return jsonify({"message": f"Meeting for {student_name} canceled."})

    except Exception as e:
        print("❌ Error in cancel_meeting:", e)
        return jsonify({"error": str(e)}), 500
