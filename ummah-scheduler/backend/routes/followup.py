# ummah-scheduler/backend/routes/followup.py
from flask import Blueprint, jsonify, request
import os
import json
from pathlib import Path
import sqlite3
from datetime import datetime
import traceback
from db import log_mentor_action


followup_bp = Blueprint('followup', __name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SUBMISSIONS_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'submissions.json')
DB_PATH = Path(__file__).resolve().parent.parent / "admin_data.db"

print("✅ followup.py loaded and blueprint created")
print("🛠 Absolute DB Path:", DB_PATH.resolve())

# Ensure the data directory exists
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Create admin_submissions table if not exists
def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
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
        conn.commit()

init_db()

@followup_bp.route('/save-status', methods=['OPTIONS'])
def save_status_options():
    return '', 200

@followup_bp.route('/followup', methods=['GET'])
def get_done_submissions():
    try:
        from services.monday_poll import get_latest_items

        items = get_latest_items(limit=50)

        # ✅ Load from JSON first (to keep existing flow)
        if os.path.exists(SUBMISSIONS_FILE):
            with open(SUBMISSIONS_FILE, 'r') as f:
                saved = json.load(f)
        else:
            saved = []

        saved_map = {entry["id"]: entry for entry in saved}

        # Merge status and pickedBy from JSON to latest items
        for item in items:
            saved_entry = saved_map.get(item["id"])
            if saved_entry:
                item["status"] = saved_entry.get("status", "To Do")
                item["pickedBy"] = saved_entry.get("pickedBy", "")

        # Only show Done items in followup page
        done_items = [item for item in items if item.get("status") == "Done"]
        return jsonify(done_items), 200

    except Exception as e:
        print("❌ Error in /api/followup:")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@followup_bp.route('/save-status', methods=['POST'])
def save_submission_status():
    try:
        data = request.json
        sub_id = data.get("id")
        new_status = data.get("status")
        picked_by = data.get("pickedBy", "")

        if not sub_id or not new_status:
            return jsonify({"error": "Missing required fields"}), 400

        full_fields = {
            "name": data.get("name", ""),
            "email": data.get("email", ""),
            "phone": data.get("phone", ""),
            "industry": data.get("industry", ""),
            "academicStanding": data.get("academicStanding", ""),
            "lookingFor": data.get("lookingFor", ""),
            "resume": data.get("resume", ""),
            "howTheyHeard": data.get("howTheyHeard", ""),
            "availability": data.get("availability", ""),
            "timeline": data.get("timeline", ""),
            "otherInfo": data.get("otherInfo", ""),
            "submitted": data.get("submitted", "")
        }

        # ✅ Step 1: Keep writing to JSON (original behavior)
        if os.path.exists(SUBMISSIONS_FILE):
            with open(SUBMISSIONS_FILE, 'r') as f:
                submissions = json.load(f)
        else:
            submissions = []

        updated = False
        for sub in submissions:
            if sub["id"] == sub_id:
                sub.update({
                    "status": new_status,
                    "pickedBy": picked_by,
                    **full_fields
                })
                updated = True
                break

        if not updated:
            submissions.append({
                "id": sub_id,
                "status": new_status,
                "pickedBy": picked_by,
                **full_fields
            })

        with open(SUBMISSIONS_FILE, 'w') as f:
            json.dump(submissions, f, indent=2)

        # ✅ Step 2: Also save/update SQLite for migration
        with sqlite3.connect(DB_PATH) as conn:
            c = conn.cursor()
            c.execute("""
            INSERT INTO admin_submissions (
                id, name, email, phone, industry, academicStanding,
                lookingFor, resume, howTheyHeard, availability,
                timeline, otherInfo, submitted, status, pickedBy, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                updated_at=excluded.updated_at
            """, (
                sub_id,
                full_fields["name"],
                full_fields["email"],
                full_fields["phone"],
                full_fields["industry"],
                full_fields["academicStanding"],
                full_fields["lookingFor"],
                full_fields["resume"],
                full_fields["howTheyHeard"],
                full_fields["availability"],
                full_fields["timeline"],
                full_fields["otherInfo"],
                full_fields["submitted"],
                new_status,
                picked_by,
                datetime.utcnow().isoformat()
            ))
            conn.commit()
            print(f"✅ SQLite updated for ID {sub_id}")

            if new_status == "Done" and picked_by:
                log_mentor_action(picked_by, "done", f"for {full_fields['name']}")
                


        return jsonify({"message": "Status saved (JSON + SQLite)"}), 200

    except Exception as e:
        print("❌ Error in save_submission_status:")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
