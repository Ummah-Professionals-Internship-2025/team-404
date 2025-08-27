
# services/monday_poll.py
import os
import requests
from dotenv import load_dotenv
from pathlib import Path
from services.monday_parser import parse_monday_item

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / '.env')

MONDAY_API_KEY = os.getenv("MONDAY_API_KEY")
MONDAY_BOARD_ID = os.getenv("MONDAY_BOARD_ID")
MONDAY_API = "https://api.monday.com/v2"

def get_latest_items(limit: int = 20):
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

    resp = requests.post(
        MONDAY_API,
        headers={"Authorization": MONDAY_API_KEY},
        json={"query": query}
    )

    resp.raise_for_status()
    items = resp.json()["data"]["boards"][0]["items_page"]["items"]
    return [parse_monday_item(item) for item in items]
