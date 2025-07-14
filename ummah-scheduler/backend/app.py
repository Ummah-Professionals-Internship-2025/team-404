# backend/app.py
from flask import Flask
from flask_cors import CORS
from routes.monday import monday_bp
from routes.auth import auth_bp
from routes.schedule import schedule  # Don't forget this!
from app_config import FLASK_SECRET_KEY

app = Flask(__name__)
app.secret_key = FLASK_SECRET_KEY

# ✅ Updated CORS config — full support for frontend from localhost:5173
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)

# ✅ Register blueprints
app.register_blueprint(monday_bp, url_prefix="/api")
app.register_blueprint(auth_bp)
app.register_blueprint(schedule)  # ✅ Include schedule blueprint!

@app.route("/")
def index():
    return "Backend is running"

if __name__ == "__main__":
    app.run(debug=True, port=5050)
