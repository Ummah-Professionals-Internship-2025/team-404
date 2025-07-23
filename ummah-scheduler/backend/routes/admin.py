#backend route admin.py
from flask import Blueprint, request, jsonify
from db import verify_admin

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/api/admin-login", methods=["POST"])
def admin_login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    if verify_admin(email, password):
        return jsonify({"success": True})
    return jsonify({"success": False}), 401
