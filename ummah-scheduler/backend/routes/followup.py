# ummah-scheduler/backend/routes/followup.py

from flask import Blueprint, jsonify, request
import os
import json
from pathlib import Path

followup_bp = Blueprint('followup', __name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SUBMISSIONS_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'submissions.json')

# Ensures the data directory exists
DATA_DIR.mkdir(parents=True, exist_ok=True)

@followup_bp.route('/api/save-status', methods=['OPTIONS'])
def save_status_options():
    return '', 200

@followup_bp.route('/api/followup', methods=['GET'])
def get_done_submissions():
    try:
        if not os.path.exists(SUBMISSIONS_FILE):
            return jsonify([]), 200

        with open(SUBMISSIONS_FILE, 'r') as f:
            submissions = json.load(f)

        done_submissions = [s for s in submissions if s.get("status") == "Done"]
        return jsonify(done_submissions), 200

    except Exception as e:
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

        # Use a safe path resolution
        from pathlib import Path
        SUBMISSIONS_FILE = Path(__file__).resolve().parent.parent / "data" / "submissions.json"

        if SUBMISSIONS_FILE.exists():
            with open(SUBMISSIONS_FILE, 'r') as f:
                submissions = json.load(f)
        else:
            submissions = []

        updated = False
        for sub in submissions:
            if sub["id"] == sub_id:
                sub["status"] = new_status
                sub["pickedBy"] = picked_by
                updated = True
                break

        if not updated:
            # Add a full object to maintain structure
            submissions.append({
                "id": sub_id,
                "status": new_status,
                "pickedBy": picked_by,
                "name": "", "email": "", "phone": "", "industry": "",
                "academicStanding": "", "lookingFor": "", "resume": "",
                "howTheyHeard": "", "availability": "", "timeline": "",
                "otherInfo": "", "submitted": ""
            })

        with open(SUBMISSIONS_FILE, 'w') as f:
            json.dump(submissions, f, indent=2)

        return jsonify({"message": "Status saved"}), 200

    except Exception as e:
        print("❌ Error in save_submission_status:")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
