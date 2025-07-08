from flask import Blueprint, request, jsonify
from backend.services.google_calendar import create_meeting_event

schedule = Blueprint('schedule', __name__)

@schedule.route('/api/schedule-meeting', methods=['POST'])
def schedule_meeting():
    data = request.json
    student_email = data.get("studentEmail")
    mentor_email = data.get("mentorEmail")
    meeting_time = data.get("time")  # ISO string

    if not student_email or not mentor_email or not meeting_time:
        return jsonify({"error": "Missing required fields"}), 400

    try:
        event = create_meeting_event(mentor_email, student_email, meeting_time)
        return jsonify({"message": "Invite sent", "eventLink": event.get("htmlLink")})
    except Exception as e:
        print("Calendar error:", e)
        return jsonify({"error": str(e)}), 500
