# ummah-scheduler/backend/routes/followup.py

from flask import Blueprint, jsonify, request
import os
import json
from pathlib import Path

followup_bp = Blueprint('followup', __name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SUBMISSIONS_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'submissions.json')

print("✅ followup.py loaded and blueprint created")

# Ensures the data directory exists
DATA_DIR.mkdir(parents=True, exist_ok=True)

@followup_bp.route('/save-status', methods=['OPTIONS'])
def save_status_options():
    return '', 200

@followup_bp.route('/followup', methods=['GET'])
def get_done_submissions():
    try:
        from services.monday_poll import get_latest_items

        # 1. Pull fresh items from Monday
        items = get_latest_items(limit=50)

        # 2. Load local status overrides
        if os.path.exists(SUBMISSIONS_FILE):
            with open(SUBMISSIONS_FILE, 'r') as f:
                saved = json.load(f)
        else:
            saved = []

        saved_map = {entry["id"]: entry for entry in saved}

        # 3. Merge saved status/pickedBy into Monday items
        for item in items:
            saved_entry = saved_map.get(item["id"])
            if saved_entry:
                item["status"] = saved_entry.get("status", "To Do")
                item["pickedBy"] = saved_entry.get("pickedBy", "")

        # 4. Filter only "Done" items
        done_items = [item for item in items if item.get("status") == "Done"]
        return jsonify(done_items), 200

    except Exception as e:
        print("❌ Error in /api/followup:", e)
        return jsonify({"error": str(e)}), 500


import traceback

@followup_bp.route('/save-status', methods=['POST', 'OPTIONS'])
def save_submission_status():
    if request.method == 'OPTIONS':
        return '', 200

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

        SUBMISSIONS_FILE = Path(__file__).resolve().parent.parent / "data" / "submissions.json"
        if SUBMISSIONS_FILE.exists():
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

        # ✅ If status is "Done", move to Completed group in Monday
        if new_status == "Done":
            import os
            import requests
            from dotenv import load_dotenv

            load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / '.env')
            MONDAY_API_KEY = os.getenv("MONDAY_API_KEY")
            MONDAY_BOARD_ID = os.getenv("MONDAY_BOARD_ID")
            COMPLETED_GROUP_ID = "new_group43041"  # <-- From your query results

            mutation = {
                "query": f"""
                    mutation {{
                      move_item_to_group (item_id: {sub_id}, group_id: "{COMPLETED_GROUP_ID}") {{
                        id
                      }}
                    }}
                """
            }

            headers = {
                "Authorization": MONDAY_API_KEY,
                "Content-Type": "application/json"
            }

            resp = requests.post("https://api.monday.com/v2", headers=headers, json=mutation)
            if resp.status_code != 200 or "errors" in resp.json():
                print("❌ Failed to move item in Monday:", resp.text)

        return jsonify({"message": "Status saved"}), 200

    except Exception as e:
        print("❌ Error in save_submission_status:")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
