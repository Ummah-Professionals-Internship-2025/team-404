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
        # Live items from Monday.com
        items = get_latest_items(limit=50)

        # Load saved statuses (if file exists)
        if os.path.exists(SUBMISSIONS_FILE):
            with open(SUBMISSIONS_FILE, 'r') as f:
                saved = json.load(f)
        else:
            saved = []

        saved_map = {entry["id"]: entry for entry in saved}

        # Merge status + pickedBy into each item
        for item in items:
            saved_entry = saved_map.get(item["id"])
            if saved_entry:
                item["status"] = saved_entry.get("status", "To Do")
                item["pickedBy"] = saved_entry.get("pickedBy", "")

        return jsonify(items[::-1])  # latest first
    except Exception as e:
        return jsonify({"error": str(e)}), 500
