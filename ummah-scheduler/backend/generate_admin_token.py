from google_auth_oauthlib.flow import InstalledAppFlow
import os

# Paths
CLIENT_SECRET_FILE = 'credentials/oauth_client_secret.json'
ADMIN_TOKEN_FILE = 'credentials/admin_token.json'

# Required scopes
SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/gmail.send'
]

def main():
    # Create the OAuth flow
    flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET_FILE, SCOPES)

    # ✅ Force refresh_token by requesting offline access and consent
    creds = flow.run_local_server(
        port=5050,
        authorization_prompt_message='',
        success_message='✅ Authentication complete. You may close this tab.',
        open_browser=True,
        access_type='offline',   # ✅ get refresh_token
        prompt='consent'         # ✅ force consent each time
    )

    # Save token to file
    os.makedirs(os.path.dirname(ADMIN_TOKEN_FILE), exist_ok=True)
    with open(ADMIN_TOKEN_FILE, 'w') as token:
        token.write(creds.to_json())

    print("✅ Admin token saved to", ADMIN_TOKEN_FILE)

if __name__ == '__main__':
    main()
