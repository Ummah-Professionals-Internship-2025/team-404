# routes/monday.py
from flask import Blueprint, jsonify
from services.monday_poll import get_latest_items
import os
import json

monday_bp = Blueprint('monday', __name__)

SUBMISSIONS_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'submissions.json')

@monday_bp.route('/submissions', methods=['GET'])
def fetch_submissions():
    try:
        items = get_latest_items(limit=50)

        # Merge saved fields (status/pickedBy) if you keep them locally
        if os.path.exists(SUBMISSIONS_FILE):
            with open(SUBMISSIONS_FILE, 'r') as f:
                saved = json.load(f)
        else:
            saved = []
        saved_map = {entry["id"]: entry for entry in saved}
        for item in items:
            s = saved_map.get(item["id"])
            if s:
                item["status"] = s.get("status", item.get("status", "To Do"))
                item["pickedBy"] = s.get("pickedBy", "")

        # ✅ Hard sort newest → oldest using normalized timestamp
        items.sort(key=lambda x: x.get("submitted_ts", 0), reverse=True)

        return jsonify(items)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
