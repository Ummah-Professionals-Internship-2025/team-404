
# services/monday_parser.py

def parse_monday_item(item):
    # Extract and flatten columns like in your working Discord bot
    columns = {c["id"]: c.get("text", "") for c in item["column_values"]}
    
    return {
        "id": item["id"],
        "name": item["name"],
        "email": columns.get("email_mksanes7", "N/A"),
        "phone": columns.get("phone_mksam3k4", "N/A"),
        "industry": columns.get("dropdown_mksazheg", "N/A"),
        "academicStanding": columns.get("dropdown_mksank0m", "N/A"),
        "lookingFor": columns.get("dropdown_mksa2xnv", "N/A"),
        "resume": columns.get("files_1", "N/A"),
        "howTheyHeard": columns.get("dropdown_mksatymx", "N/A"),
        "availability": columns.get("dropdown_mksddh69", "N/A"),
        "timeline": columns.get("project_timeline", "N/A"),
        "otherInfo": columns.get("text9", "N/A"),
        "submitted": columns.get("last_updated", item["created_at"]),
        "status": columns.get("status_1", ""),
    } 
