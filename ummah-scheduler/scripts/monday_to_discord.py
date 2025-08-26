"""
Pull the newest items from a Monday.com board and post them
to a Discord channel via webhook.
Designed for GitHub Actions: runs once per execution and exits.
"""
import os, requests
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timedelta

# load keys from .env (only needed locally; in Actions you'll use secrets)
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / '.env')

# Variables
MONDAY_API_KEY  = os.getenv("MONDAY_API_KEY")
MONDAY_BOARD_ID = os.getenv("MONDAY_BOARD_ID")

DISCORD_GENERAL_WEBHOOK     = os.getenv("DISCORD_GENERAL_WEBHOOK") 
DISCORD_BUSINESS_WEBHOOK    = os.getenv("DISCORD_BUSINESS_WEBHOOK")
DISCORD_EDUCATION_WEBHOOK   = os.getenv("DISCORD_EDUCATION_WEBHOOK")
DISCORD_ENGINEERING_WEBHOOK = os.getenv("DISCORD_ENGINEERING_WEBHOOK")
DISCORD_FINANCE_WEBHOOK     = os.getenv("DISCORD_FINANCE_WEBHOOK")
DISCORD_IT_WEBHOOK          = os.getenv("DISCORD_IT_WEBHOOK")
DISCORD_LAW_WEBHOOK         = os.getenv("DISCORD_LAW_WEBHOOK")

# Frontend URL for clickable scheduler link
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Debug print to confirm env
print("🔑 MONDAY_BOARD_ID:", MONDAY_BOARD_ID)
print("🔗 FRONTEND_URL:", FRONTEND_URL)

MONDAY_API = "https://api.monday.com/v2"

def get_latest_items(limit: int = 20):
    """Pull most recent items from Monday board"""
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
    return resp.json()["data"]["boards"][0]["items_page"]["items"]

def post_to_discord(item):
    """Send a short Monday item to the right Discord channel"""
    columns = {c["id"]: c.get("text", "") for c in item["column_values"]}
    industry_str = columns.get("dropdown_mksazheg", "N/A")
    industries = [i.strip() for i in industry_str.split(",")] if industry_str and industry_str != "N/A" else []

    # Keep message short to avoid Discord truncation
    content = (
        f"**New Career-Prep Submission**\n"
        f"**Name:** {item['name']}\n"
        f"**Industry:** {industry_str}\n"
        f"**Resume:** {columns.get('files_1', 'N/A')}\n"
        f"**Availability:** {columns.get('dropdown_mksddh69', 'N/A')}\n"
        f"[View in Scheduler Tool]({FRONTEND_URL})"
    )

    posted_to_industry = False
    for industry in industries:
        url = None
        if "business" in industry.lower():
            url = DISCORD_BUSINESS_WEBHOOK
        elif "education" in industry.lower():
            url = DISCORD_EDUCATION_WEBHOOK
        elif "engineering" in industry.lower():
            url = DISCORD_ENGINEERING_WEBHOOK
        elif "finance" in industry.lower():
            url = DISCORD_FINANCE_WEBHOOK
        elif "information technology" in industry.lower():
            url = DISCORD_IT_WEBHOOK
        elif "law" in industry.lower():
            url = DISCORD_LAW_WEBHOOK

        if url:
            requests.post(url, json={"content": content}).raise_for_status()
            posted_to_industry = True
            print(f"✅ Posted {item['id']} to {industry} channel")

    if not posted_to_industry:
        requests.post(DISCORD_GENERAL_WEBHOOK, json={"content": content}).raise_for_status()
        print(f"✅ Posted {item['id']} to general channel")

if __name__ == "__main__":
    print("🔄 Running Monday → Discord sync (new items only)")
    try:
        items = get_latest_items()
        print(f"📦 Pulled {len(items)} items from Monday")

        # Only keep ones from the last 10 minutes
        cutoff = datetime.utcnow() - timedelta(minutes=10)
        recent_items = []
        for itm in items:
            created_at = datetime.fromisoformat(itm["created_at"].replace("Z", ""))
            if created_at > cutoff:
                recent_items.append(itm)

        print(f"🆕 Found {len(recent_items)} new items to post")

        for itm in recent_items:
            post_to_discord(itm)

    except Exception as e:
        print("❌ Error:", e)
    print("✅ Done. Exiting.")
