"""
Pull the newest items from a Monday.com board and post them
to a Discord channel via webhook.
Run it manually, or in a while-loop / cron job while testing.
"""
import os, time, requests
import json
from dotenv import load_dotenv
from pathlib import Path

# load keys from .env
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / '.env')

# Variables
MONDAY_API_KEY       = os.getenv("MONDAY_API_KEY")
MONDAY_BOARD_ID      = os.getenv("MONDAY_BOARD_ID")
DISCORD_WEBHOOK_URL  = os.getenv("DISCORD_WEBHOOK_URL")

# Debug print to confirm .env loading
print("MONDAY_API_KEY:", MONDAY_API_KEY)
print("MONDAY_BOARD_ID:", MONDAY_BOARD_ID)
print("DISCORD_WEBHOOK_URL:", DISCORD_WEBHOOK_URL)

MONDAY_API = "https://api.monday.com/v2"

def get_latest_items(limit: int = 5):
    """graphql query to pull most-recent items"""
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
    print("\n--- Raw Column Values ---")
    for col in item["column_values"]:
        print(f"id: {col['id']} | text: {col.get('text')}")

    # Use plain text for everything, including resume
    columns = {c["id"]: c.get("text", "") for c in item["column_values"]}

    content = (
        f"**********************************************************\n"
        f"** New Career-Prep Submission**\n"
        f"**********************************************************\n"
        f"**Industry:** {columns.get('dropdown_mksazheg', 'N/A')}\n"
        f"**********************************************************\n"
        f"**Name:** {item['name']}\n"
        f"**Email:** {columns.get('email_mksanes7', 'N/A')}\n"
        f"**Phone:** {columns.get('phone_mksam3k4', 'N/A')}\n"
        f"**Academic Standing:** {columns.get('dropdown_mksank0m', 'N/A')}\n"
        f"**Looking For:** {columns.get('dropdown_mksa2xnv', 'N/A')}\n"
        f"**Resume:** {columns.get('files_1', 'N/A')}\n"
        f"**How They Heard:** {columns.get('dropdown_mksatymx', 'N/A')}\n"
        f"**Weekly Availability:** {columns.get('dropdown_mksddh69', 'N/A')}\n"
        f"**Preferred Times:** {columns.get('project_timeline', 'N/A')}\n"
        f"**Other Info:** {columns.get('text9', 'N/A')}\n"
        f"**Submitted:** {columns.get('last_updated', item['created_at'])}\n"
        f"**Email:** {columns.get('email_mksanes7', 'N/A')}\n"
        f"**Phone:** {columns.get('phone_mksam3k4', 'N/A')}\n"
        f"**Industry:** {columns.get('dropdown_mksazheg', 'N/A')}\n"
        f"**Academic Standing:** {columns.get('dropdown_mksank0m', 'N/A')}\n"
        f"**Looking For:** {columns.get('dropdown_mksa2xnv', 'N/A')}\n"
        f"**Resume:** {columns.get('files_1', 'N/A')}\n"
        f"**How They Heard:** {columns.get('dropdown_mksatymx', 'N/A')}\n"
        f"**Weekly Availability:** {columns.get('dropdown_mksddh69', 'N/A')}\n"
        f"**Preferred Times:** {columns.get('project_timeline', 'N/A')}\n"
        f"**Other Info:** {columns.get('text9', 'N/A')}\n"
        f"**Submitted:** {columns.get('last_updated', item['created_at'])}\n"
        f"[ View in Scheduler Tool](https://our-scheduler-url.com/goes/here)\n"
        f"**********************************************************\n"
        f"**********************************************************\n"
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
            time.sleep(300)  # wait 5 mins before checking again
    except KeyboardInterrupt:
        print("Stopped.")
