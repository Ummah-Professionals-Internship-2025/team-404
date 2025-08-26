"""
Pull new submissions from a Monday.com board and post them
to Discord channels via webhook.
Only posts items that have never been sent before.
Designed for GitHub Actions: runs once per execution and exits.
"""
import os, requests, json
from dotenv import load_dotenv
from pathlib import Path

# Load keys from .env (only needed locally; in Actions you'll use secrets)
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / '.env')

# Variables
MONDAY_API_KEY       = os.getenv("MONDAY_API_KEY")
MONDAY_BOARD_ID      = os.getenv("MONDAY_BOARD_ID")

DISCORD_GENERAL_WEBHOOK     = os.getenv("DISCORD_GENERAL_WEBHOOK") 
DISCORD_BUSINESS_WEBHOOK    = os.getenv("DISCORD_BUSINESS_WEBHOOK")
DISCORD_EDUCATION_WEBHOOK   = os.getenv("DISCORD_EDUCATION_WEBHOOK")
DISCORD_ENGINEERING_WEBHOOK = os.getenv("DISCORD_ENGINEERING_WEBHOOK")
DISCORD_FINANCE_WEBHOOK     = os.getenv("DISCORD_FINANCE_WEBHOOK")
DISCORD_IT_WEBHOOK          = os.getenv("DISCORD_IT_WEBHOOK")
DISCORD_LAW_WEBHOOK         = os.getenv("DISCORD_LAW_WEBHOOK")

# Frontend URL for clickable scheduler link
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# File to persist seen item IDs between runs
SEEN_FILE = Path(__file__).resolve().parent / "seen_items.json"

# Debug print to confirm env
print("🔑 MONDAY_BOARD_ID:", MONDAY_BOARD_ID)
print("🔗 FRONTEND_URL:", FRONTEND_URL)

MONDAY_API = "https://api.monday.com/v2"

def load_seen_ids():
    """Load previously posted item IDs"""
    if SEEN_FILE.exists():
        with open(SEEN_FILE, "r") as f:
            return set(json.load(f))
    return set()

def save_seen_ids(ids):
    """Save updated set of posted item IDs"""
    with open(SEEN_FILE, "w") as f:
        json.dump(list(ids), f)

def get_latest_items(limit: int = 100):
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
    data = resp.json()
    if "errors" in data:
        raise Exception(f"Monday API error: {data['errors']}")
    return data["data"]["boards"][0]["items_page"]["items"]

def post_to_discord(item):
    """Send a Monday item to the right Discord channel"""
    columns = {c["id"]: c.get("text", "") for c in item["column_values"]}
    industry_str = columns.get("dropdown_mksazheg", "N/A")
    industries = [i.strip() for i in industry_str.split(",")] if industry_str and industry_str != "N/A" else []

    content = (
        f"**New Career-Prep Submission**\n"
        f"**Name:** {item['name']}\n"
        f"**Email:** {columns.get('email_mksanes7', 'N/A')}\n"
        f"**Phone:** {columns.get('phone_mksam3k4', 'N/A')}\n"
        f"**Industry:** {industry_str}\n"
        f"**Academic Standing:** {columns.get('dropdown_mksank0m', 'N/A')}\n"
        f"**Looking For:** {columns.get('dropdown_mksa2xnv', 'N/A')}\n"
        f"**Resume:** {columns.get('files_1', 'N/A')}\n"
        f"**How They Heard:** {columns.get('dropdown_mksatymx', 'N/A')}\n"
        f"**Weekly Availability:** {columns.get('dropdown_mksddh69', 'N/A')}\n"
        f"**Preferred Times:** {columns.get('project_timeline', 'N/A')}\n"
        f"**Other Info:** {columns.get('text9', 'N/A')}\n"
        f"**Submitted:** {columns.get('last_updated', item['created_at'])}\n"
        f"[View in Scheduler Tool]({FRONTEND_URL})\n"
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
    print("🔄 Running Monday → Discord sync (new unique items only)")
    try:
        seen_ids = load_seen_ids()
        items = get_latest_items()
        print(f"📦 Pulled {len(items)} items from Monday")

        new_items = [itm for itm in items if itm["id"] not in seen_ids]
        print(f"🆕 Found {len(new_items)} unseen items to post")

        for itm in new_items:
            post_to_discord(itm)
            seen_ids.add(itm["id"])

        save_seen_ids(seen_ids)

    except Exception as e:
        print("❌ Error:", e)
    print("✅ Done. Exiting.")
