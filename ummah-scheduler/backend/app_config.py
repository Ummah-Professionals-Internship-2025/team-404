import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env from the root directory
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / '.env')

# ───── Monday.com Config ─────
MONDAY_API_KEY = os.getenv("MONDAY_API_KEY")
MONDAY_FORM_URL = os.getenv("MONDAY_FORM_URL")
MONDAY_BOARD_ID = os.getenv("MONDAY_BOARD_ID")

# ───── Discord Config ─────
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")

# ───── Google Calendar Config ─────
GOOGLE_CALENDAR_CREDENTIALS = os.getenv("GOOGLE_CALENDAR_CREDENTIALS")
GOOGLE_CALENDAR_TIMEZONE = os.getenv("GOOGLE_CALENDAR_TIMEZONE", "America/New_York")

FLASK_SECRET_KEY = os.getenv("FLASK_SECRET_KEY")
