# services/monday_parser.py
from datetime import datetime, timezone

def _parse_to_ts(s: str) -> float:
    """Return a UTC timestamp (seconds) from several date formats."""
    if not s or s in ("N/A", "-", "--"):
        return 0.0
    s = str(s).strip()
    try:
        # e.g. 2025-08-23T11:27:29Z
        if s.endswith("Z"):
            return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
        # e.g. 2025-07-21 15:44:41 UTC (Monday "last_updated" text)
        if "UTC" in s:
            s2 = s.replace(" UTC", "")
            return datetime.strptime(s2, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc).timestamp()
        # fallback: try ISO without Z, assume UTC
        return datetime.fromisoformat(s).replace(tzinfo=timezone.utc).timestamp()
    except Exception:
        return 0.0

def _ts_to_iso_utc(ts: float) -> str | None:
    if not ts:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def parse_monday_item(item):
    """Flatten a Monday item and normalize submitted time."""
    cols = {c["id"]: c.get("text", "") for c in item.get("column_values", [])}

    submitted_raw = cols.get("last_updated") or item.get("created_at")
    submitted_ts  = _parse_to_ts(submitted_raw)
    submitted_iso = _ts_to_iso_utc(submitted_ts) or item.get("created_at")

    return {
        "id": item["id"],
        "name": item["name"],
        "email": cols.get("email_mksanes7", "N/A"),
        "phone": cols.get("phone_mksam3k4", "N/A"),
        "industry": cols.get("dropdown_mksazheg", "N/A"),
        "academicStanding": cols.get("dropdown_mksank0m", "N/A"),
        "lookingFor": cols.get("dropdown_mksa2xnv", "N/A"),
        "resume": cols.get("files_1", "N/A"),
        "howTheyHeard": cols.get("dropdown_mksatymx", "N/A"),
        "availability": cols.get("dropdown_mksddh69", "N/A"),
        "timeline": cols.get("project_timeline", "N/A"),
        "otherInfo": cols.get("text9", "N/A"),
        # normalized time fields used by API/UI
        "submitted": submitted_iso,      # ISO-8601 UTC (good for JS Date())
        "submitted_ts": submitted_ts,    # numeric timestamp (good for sorting)
        "status": cols.get("status_1", ""),
    }
