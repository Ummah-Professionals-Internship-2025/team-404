# backend/app.py
from flask import Flask
from flask_cors import CORS
from routes.monday import monday_bp
from routes.auth import auth_bp
from routes.schedule import schedule
from routes.followup import followup_bp
from app_config import FLASK_SECRET_KEY

app = Flask(__name__)
app.secret_key = FLASK_SECRET_KEY

# ✅ Updated CORS config — full support for frontend from localhost:5173
CORS(app, supports_credentials=True, resources={
    r"/api/*": {
        "origins": "http://localhost:5173",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
# ✅ Register blueprints
app.register_blueprint(monday_bp, url_prefix="/api")
app.register_blueprint(auth_bp)
app.register_blueprint(schedule) 
app.register_blueprint(followup_bp, url_prefix='/api')


@app.route("/")
def index():
    return "Backend is running"

if __name__ == "__main__":
    print("\n📍 Registered routes:")
    for rule in app.url_map.iter_rules():
        print(f"{rule.endpoint:30s} {rule.methods} {rule}")
    print()  # spacing

    app.run(debug=True, port=5050)

