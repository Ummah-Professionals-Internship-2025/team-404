# routes/monday.py
from flask import Blueprint, jsonify
from services.monday_poll import get_latest_items  # Make sure this returns the formatted dicts

monday_bp = Blueprint('monday', __name__)

@monday_bp.route('/submissions', methods=['GET'])
def fetch_submissions():
    try:
        items = get_latest_items(limit=20)
        return jsonify(items)  # Should return a list of dictionaries
    except Exception as e:
        return jsonify({"error": str(e)}), 500
