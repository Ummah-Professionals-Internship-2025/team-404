"""
Pull the newest items from a Monday.com board and post them
to a Discord channel via webhook.
Run it manually, or in a while-loop / cron job while testing.
"""
import os, time, requests, textwrap
from dotenv import load_dotenv
from pathlib import Path

# Load the .env file 
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / '.env')

# var 
MONDAY_API_KEY       = os.getenv("MONDAY_API_KEY")
MONDAY_BOARD_ID      = os.getenv("MONDAY_BOARD_ID")
DISCORD_WEBHOOK_URL  = os.getenv("DISCORD_WEBHOOK_URL")

# Debug print to check if values are loaded
print("MONDAY_API_KEY:", MONDAY_API_KEY)
print("MONDAY_BOARD_ID:", MONDAY_BOARD_ID)
print("DISCORD_WEBHOOK_URL:", DISCORD_WEBHOOK_URL)

MONDAY_API = "https://api.monday.com/v2"

def get_latest_items(limit: int = 5):
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
            }}
          }}
        }}
      }}
    }}
    """

    print("\n--- GraphQL Query ---")
    print(query)
    print("---------------------\n")

    resp = requests.post(
        MONDAY_API,
        headers={"Authorization": MONDAY_API_KEY},
        json={"query": query}
    )

    print("Status Code:", resp.status_code)

    if resp.status_code != 200:
        print("ERROR RESPONSE:")
        print(resp.text)

    resp.raise_for_status()
    return resp.json()["data"]["boards"][0]["items_page"]["items"]




def post_to_discord(item):
    columns = {c.get("id", "unknown"): c.get("text", "") for c in item["column_values"]}
    
    
   
    
    content = (
        f"** New Career-Prep Submission**\n"
        f"**Name:** {item['name']}\n"
        f"**Email:** {columns.get('Email', 'N/A')}\n"
        f"**Phone:** {columns.get('Phone', 'N/A')}\n"
        f"**Industry:** {columns.get('Industry', 'N/A')}\n"
        f"**Academic Standing:** {columns.get('Academic Standing', 'N/A')}\n"
        f"**Looking For:** {columns.get('Looking For', 'N/A')}\n"
        f"**Resume:** {columns.get('Resume', 'N/A')}\n"
        f"**How They Heard:** {columns.get('How did you hear about this service?', 'N/A')}\n"
        f"**Weekly Availability:** {columns.get('Weekly Availability', 'N/A')}\n"
        f"**Preferred Times:** {columns.get('Please choose below the times that work with you.', 'N/A')}\n"
        f"**Other Info:** {columns.get('Other Information', 'N/A')}\n"
        f"**Submitted:** {item['created_at']}\n"
        f"[ View in Scheduler Tool](https://our-scheduler-url.com/goes/here)\n"
    )
    
    r = requests.post(DISCORD_WEBHOOK_URL, json={"content": content})
    r.raise_for_status()

if __name__ == "__main__":
    SEEN_IDS = set()
    print("Polling Monday.com…  Ctrl-C to stop.")
    try:
        while True:
            for itm in get_latest_items(limit=5):
                if itm["id"] not in SEEN_IDS:
                    post_to_discord(itm)
                    SEEN_IDS.add(itm["id"])
                    print("→ sent item", itm["id"])
            time.sleep(300)
    except KeyboardInterrupt:
        print("Stopped.")
