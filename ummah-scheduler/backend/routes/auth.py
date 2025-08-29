# backend/routes/auth.py
from flask import Blueprint, redirect, request, session, url_for, jsonify
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import os
import pathlib
from db import log_mentor_action

# Use env vars for backend + frontend URLs
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5050")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

auth_bp = Blueprint("auth", __name__)
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"  # Enable HTTP for localhost testing

# In-memory token storage: { email: credentials }
mentor_tokens = {}

SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid"
]

# ----------------------------
# HELPER: Build Flow from env vars or JSON
# ----------------------------
def build_flow(redirect_path: str):
    """Use env vars on Render, or JSON locally."""
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = f"{BACKEND_URL}{redirect_path}"

    if client_id and client_secret:
        client_config = {
            "web": {
                "client_id": client_id,
                "project_id": os.getenv("GOOGLE_PROJECT_ID", "ummah-scheduler"),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_secret": client_secret,
                "redirect_uris": [redirect_uri],
                "javascript_origins": [FRONTEND_URL, BACKEND_URL],
            }
        }
        return Flow.from_client_config(client_config, scopes=SCOPES, redirect_uri=redirect_uri)
    else:
        CLIENT_SECRETS_FILE = str(
            pathlib.Path(__file__).resolve().parent.parent / "credentials" / "oauth_client_secret.json"
        )
        return Flow.from_client_secrets_file(CLIENT_SECRETS_FILE, scopes=SCOPES, redirect_uri=redirect_uri)


# ----------------------------
# CLEAN LOGIN (DEFAULT)
# ----------------------------
@auth_bp.route("/auth/login-basic")
def login_basic():
    flow = build_flow("/oauth2callback")
    auth_url, _ = flow.authorization_url(
        prompt="consent",
        access_type="offline",
        include_granted_scopes="true"
    )
    session["flow"] = "login"
    return redirect(auth_url)


# ----------------------------
# MENTOR LOGIN FOR SCHEDULING (Propose Meeting)
# ----------------------------
@auth_bp.route("/auth/login")
def login_schedule():
    flow = build_flow("/oauth2callback")
    auth_url, _ = flow.authorization_url(
        prompt="consent",
        access_type="offline",
        include_granted_scopes="true"
    )
    session["flow"] = "schedule"
    return redirect(auth_url)


# ----------------------------
# OAUTH CALLBACK (Mentors)
# ----------------------------
@auth_bp.route("/oauth2callback")
def oauth2callback():
    flow = build_flow("/oauth2callback")
    flow.fetch_token(authorization_response=request.url)

    credentials = flow.credentials
    user_service = build("oauth2", "v2", credentials=credentials)
    user_info = user_service.userinfo().get().execute()

    mentor_email = user_info.get("email")
    if not mentor_email:
        return "Failed to get user email", 400

    mentor_tokens[mentor_email] = credentials_to_dict(credentials)
    log_mentor_action(mentor_email, "login")

    flow_type = session.get("flow")
    if flow_type == "message":
        return redirect(f"{FRONTEND_URL}/followup?loggedIn=true&email={mentor_email}")
    elif flow_type == "schedule":
        return redirect(f"{FRONTEND_URL}/schedule-confirm?email={mentor_email}")
    else:
        return redirect(f"{FRONTEND_URL}/login/callback?email={mentor_email}")


# ----------------------------
# NEW: MENTOR LOGIN FOR MESSAGING
# ----------------------------
@auth_bp.route("/auth/login-message")
def login_message():
    flow = build_flow("/oauth2callback")
    auth_url, _ = flow.authorization_url(
        prompt="consent",
        access_type="offline",
        include_granted_scopes="true"
    )
    session["flow"] = "message"
    return redirect(auth_url)


# ----------------------------
# TOKEN ENDPOINT
# ----------------------------
@auth_bp.route("/auth/token")
def get_token():
    email = request.args.get("email")
    creds = mentor_tokens.get(email)
    if not creds:
        return jsonify({"error": "No credentials found"}), 404
    return jsonify(creds)


# Utility to serialize credentials to dict
def credentials_to_dict(creds):
    return {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": creds.scopes
    }


# ----------------------------
# ADMIN LOGIN WITH GOOGLE
# ----------------------------
@auth_bp.route("/auth/admin-login")
def admin_google_login():
    flow = build_flow("/oauth2callback-admin")
    auth_url, _ = flow.authorization_url(
        prompt="consent",
        access_type="offline",
        include_granted_scopes="true"
    )

    session["admin_flow"] = {
        "client_id": flow.client_config["client_id"],
        "client_secret": flow.client_config["client_secret"],
        "scopes": SCOPES,
        "redirect_uri": f"{BACKEND_URL}/oauth2callback-admin"
    }
    return redirect(auth_url)

@auth_bp.route("/oauth2callback-admin")
def admin_oauth2callback():
    flow = build_flow("/oauth2callback-admin")
    flow.fetch_token(authorization_response=request.url)

    credentials = flow.credentials
    user_service = build("oauth2", "v2", credentials=credentials)
    user_info = user_service.userinfo().get().execute()

    admin_email = user_info.get("email")

    # Support multiple admin emails (comma-separated in env var)
    allowed_emails = os.getenv("ADMIN_GOOGLE_EMAILS", "").split(",")
    allowed_emails = [e.strip() for e in allowed_emails if e.strip()]

    if admin_email not in allowed_emails:
        return "Unauthorized", 403

    session["adminLoggedIn"] = True
    session["adminEmail"] = admin_email
    return redirect(f"{FRONTEND_URL}/admin-dashboard?loggedIn=true")
