"""
Pull new submissions from a Monday.com board and post them
to Discord channels via webhook.
Only posts items that have never been sent before.
Extracts direct resume file URLs from Monday file column JSON.
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

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

SEEN_FILE = Path(__file__).resolve().parent / "seen_items.json"

print("🔑 MONDAY_BOARD_ID:", MONDAY_BOARD_ID)
print("🔗 FRONTEND_URL:", FRONTEND_URL)

MONDAY_API = "https://api.monday.com/v2"

def load_seen_ids():
    if SEEN_FILE.exists():
        with open(SEEN_FILE, "r") as f:
            return set(json.load(f))
    return set()

def save_seen_ids(ids):
    with open(SEEN_FILE, "w") as f:
        json.dump(list(ids), f)

def get_latest_items(limit: int = 100):
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

def extract_resume_url(column_values):
    """Look for resume in the files_1 column and return direct link"""
    for col in column_values:
        if col["id"] == "files_1" and col.get("value"):
            try:
                file_data = json.loads(col["value"])
                if isinstance(file_data, list) and len(file_data) > 0:
                    # prefer public_url if available
                    return file_data[0].get("public_url") or file_data[0].get("url") or "N/A"
            except Exception as e:
                print(f"⚠️ Could not parse files_1 JSON: {e}")
    return "N/A"

def safe_post(url, content, industry, item_id):
    if not url or not url.startswith("https://discord.com/api/webhooks/"):
        print(f"⚠️ Skipping invalid webhook for {industry} (item {item_id})")
        return
    try:
        resp = requests.post(url.strip(), json={"content": content})
        resp.raise_for_status()
        print(f"✅ Posted {item_id} to {industry} channel")
    except Exception as e:
        print(f"❌ Error posting {item_id} to {industry} → {e}")

def post_to_discord(item):
    columns = {c["id"]: c.get("text", "") for c in item["column_values"]}
    industry_str = columns.get("dropdown_mksazheg", "N/A")
    industries = [i.strip() for i in industry_str.split(",")] if industry_str and industry_str != "N/A" else []

    resume_url = extract_resume_url(item["column_values"])

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
