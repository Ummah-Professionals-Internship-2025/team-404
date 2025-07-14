# backend/routes/auth.py
from flask import Blueprint, redirect, request, session, url_for, jsonify
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import os
import pathlib

auth_bp = Blueprint("auth", __name__)
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"  # Enable HTTP for localhost testing

# In-memory token storage: { email: credentials }
mentor_tokens = {}

CLIENT_SECRETS_FILE = str(pathlib.Path(__file__).resolve().parent.parent / "credentials" / "oauth_client_secret.json")
SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid"
]


@auth_bp.route("/auth/login")
def login():
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        redirect_uri="http://localhost:5050/oauth2callback"
    )
    auth_url, _ = flow.authorization_url(prompt='consent', access_type='offline', include_granted_scopes='true')
    session["flow"] = flow.credentials_to_dict() if hasattr(flow, "credentials_to_dict") else None
    return redirect(auth_url)

@auth_bp.route("/oauth2callback")
def oauth2callback():
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        redirect_uri="http://localhost:5050/oauth2callback"
    )
    flow.fetch_token(authorization_response=request.url)

    credentials = flow.credentials
    user_service = build("oauth2", "v2", credentials=credentials)
    user_info = user_service.userinfo().get().execute()

    mentor_email = user_info.get("email")
    if not mentor_email:
        return "Failed to get user email", 400

    # Store the mentor’s credentials
    mentor_tokens[mentor_email] = credentials_to_dict(credentials)
    return redirect(f"http://localhost:5173/schedule-confirm?email={mentor_email}")

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
