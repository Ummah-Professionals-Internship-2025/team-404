from flask import Blueprint, request, jsonify
from db import log_mentor_action

message_logger = Blueprint("message_logger", __name__)

@message_logger.route("/api/log-message", methods=["POST"])
def log_message():
    data = request.json
    email = data.get("mentorEmail")
    student = data.get("studentName")
    if email and student:
        log_mentor_action(email, "message", f"to {student}")
        return jsonify({"status": "ok"}), 200
    return jsonify({"error": "Missing fields"}), 400
