"""
Pull new submissions from a Monday.com board and post them
to Discord channels via webhook.
Only posts items that have never been sent before.
Uses public_url for resumes so they download directly.
Designed for GitHub Actions: runs once per execution and exits.
"""
import os, requests, json
from dotenv import load_dotenv
from pathlib import Path

# Load keys from .env (only needed locally; in Actions you'll use secrets)
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

# File to persist seen item IDs between runs
SEEN_FILE = Path(__file__).resolve().parent / "seen_items.json"

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

def extract_resume_url(raw_val):
    """Parse Monday file column JSON and return direct public URL"""
    if not raw_val:
        return "N/A"
    try:
        file_data = json.loads(raw_val)
        if isinstance(file_data, list) and len(file_data) > 0:
            return file_data[0].get("public_url") or file_data[0].get("url", "N/A")
    except Exception:
        pass
    return "N/A"

def safe_post(url, content, industry, item_id):
    """Safe wrapper to post to Discord"""
    if not url or not url.startswith("https://discord.com/api/webhooks/"):
        print(f"⚠️ Skipping invalid webhook for {industry} (item {item_id}) → url={repr(url)}")
        return
    try:
        resp = requests.post(url.strip(), json={"content": content})
        resp.raise_for_status()
        print(f"✅ Posted {item_id} to {industry} channel")
    except Exception as e:
        print(f"❌ Error posting {item_id} to {industry} → {e}")

def post_to_discord(item):
    """Send a short Monday item to the right Discord channel"""
    columns = {c["id"]: c.get("text", "") for c in item["column_values"]}
    industry_str = columns.get("dropdown_mksazheg", "N/A")
    industries = [i.strip() for i in industry_str.split(",")] if industry_str and industry_str != "N/A" else []

    resume_url = extract_resume_url(columns.get("files_1"))

    # Compact message — avoids Discord truncation
    content = (
        f"**New Career-Prep Submission**\n"
        f"**Name:** {item['name']}\n"
        f"**Industry:** {industry_str}\n"
        f"**Resume:** {resume_url}\n"
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
            safe_post(url, content, industry, item["id"])
            posted_to_industry = True

    if not posted_to_industry:
        safe_post(DISCORD_GENERAL_WEBHOOK, content, "general", item["id"])

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

