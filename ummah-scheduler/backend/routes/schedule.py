# backend/routes/schedule.py
# backend/routes/schedule.py
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from routes.auth import mentor_tokens
from app_config import GOOGLE_CALENDAR_TIMEZONE
import sqlite3, os
from datetime import datetime as dt
from db import log_mentor_action


schedule = Blueprint('schedule', __name__)

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "admin_data.db")

# ✅ Preflight handler to resolve CORS properly
@schedule.route('/api/schedule-meeting', methods=['OPTIONS'])
def handle_options():
    response = jsonify({})
    response.status_code = 204
    return response

# ✅ POST handler to schedule the meeting
@schedule.route('/api/schedule-meeting', methods=['POST'])
def schedule_meeting():
    data = request.json
    student_email = data.get("studentEmail")
    mentor_email = data.get("mentorEmail")
    meeting_time = data.get("time")  # ISO 8601 string
    student_id = data.get("id")      # Student submission ID for SQLite

    if not student_email or not mentor_email or not meeting_time:
        return jsonify({"error": "Missing required fields"}), 400

    token_data = mentor_tokens.get(mentor_email)
    if not token_data:
        return jsonify({"error": "Mentor not authenticated with Google"}), 401

    try:
        creds = Credentials(**token_data)
        calendar_service = build("calendar", "v3", credentials=creds)

        start = datetime.fromisoformat(meeting_time.replace("Z", "+00:00"))
        end = start + timedelta(minutes=30)

        event = {
            'summary': f'Mentorship Session with {student_email}',
            'description': f'Scheduled via Ummah Scheduler by {mentor_email}',
            'start': {
                'dateTime': start.isoformat(),
                'timeZone': GOOGLE_CALENDAR_TIMEZONE,
            },
            'end': {
                'dateTime': end.isoformat(),
                'timeZone': GOOGLE_CALENDAR_TIMEZONE,
            },
            'attendees': [
                {'email': mentor_email},
                {'email': student_email}
            ],
            'conferenceData': {
                'createRequest': {
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'},
                    'requestId': f"ummah-{start.timestamp()}"
                }
            }
        }

        created_event = calendar_service.events().insert(
            calendarId='primary',
            body=event,
            conferenceDataVersion=1,
            sendUpdates='all'
        ).execute()

        event_id = created_event.get("id")
        event_link = created_event.get("htmlLink")

        # ✅ Update SQLite with event_id, pickedByEmail, status
        try:
            conn = sqlite3.connect(DB_PATH)
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO admin_submissions (id, email, status, pickedByEmail, event_id, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    status = excluded.status,
                    pickedByEmail = excluded.pickedByEmail,
                    event_id = excluded.event_id,
                    updated_at = excluded.updated_at
            """, (
                student_id,
                student_email,
                "In Progress",
                mentor_email,
                event_id,
                dt.utcnow().isoformat()
            ))
            conn.commit()
            conn.close()
            print(f"✅ SQLite updated with event_id for {student_email}")

            log_mentor_action(mentor_email, "propose", f"with {student_email}")
        except Exception as db_err:
            print("⚠️ Warning: Could not update SQLite with event info:", db_err)

        return jsonify({"message": "Invite sent", "eventLink": event_link})

    except Exception as e:
        print("Calendar error:", e)
        return jsonify({"error": str(e)}), 500
