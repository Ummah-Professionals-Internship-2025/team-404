# ummah-scheduler/backend/services/monday_poll.py
import os
import requests
from dotenv import load_dotenv
from pathlib import Path
from services.monday_parser import parse_monday_item

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / '.env')

MONDAY_API_KEY = os.getenv("MONDAY_API_KEY", "").strip()
MONDAY_BOARD_ID = os.getenv("MONDAY_BOARD_ID", "").strip()
MONDAY_API = "https://api.monday.com/v2"

def get_latest_items(limit: int = 20):
    # If config missing, don't crash the app—just return empty
    if not MONDAY_API_KEY or not MONDAY_BOARD_ID:
        print("⚠️ Monday API key or board ID is missing. Returning empty list.")
        return []

    query = f"""
    query {{
      boards(ids: [{MONDAY_BOARD_ID}]) {{
        items_page(limit: {limit}) {{
          items {{
            id
            name
            created_at
            column_values {{
              id
              text
              value
            }}
          }}
        }}
      }}
    }}
    """
    try:
        resp = requests.post(
            MONDAY_API,
            headers={"Authorization": MONDAY_API_KEY},
            json={"query": query},
            timeout=20
        )
        resp.raise_for_status()
        payload = resp.json()

        if "errors" in payload:
            print("❌ Monday API returned errors:", payload["errors"])
            return []

        boards = payload.get("data", {}).get("boards", [])
        if not boards:
            return []

        items = boards[0].get("items_page", {}).get("items", []) or []
        return [parse_monday_item(item) for item in items]
    except Exception as e:
        print("❌ Monday API call failed:", repr(e))
        return []
