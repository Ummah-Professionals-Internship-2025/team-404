from datetime import datetime, timedelta
from google.oauth2 import service_account
from googleapiclient.discovery import build
from backend.config import GOOGLE_CALENDAR_CREDENTIALS, GOOGLE_CALENDAR_TIMEZONE

# Set up Google credentials from .env
credentials = service_account.Credentials.from_service_account_file(
    GOOGLE_CALENDAR_CREDENTIALS,
    scopes=["https://www.googleapis.com/auth/calendar"]
)

calendar_service = build("calendar", "v3", credentials=credentials)

def create_meeting_event(mentor_email, student_email, start_time_iso):
    start = datetime.fromisoformat(start_time_iso)
    end = start + timedelta(minutes=30)

    event = {
        'summary': 'Mentorship Session',
        'description': 'Proposed via Ummah Scheduler',
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

    return created_event
