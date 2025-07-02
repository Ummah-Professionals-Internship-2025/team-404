# app.py
from flask import Flask
from flask_cors import CORS


from routes.monday import monday_bp

app = Flask(__name__)
CORS(app)  # Enable CORS so frontend can fetch from backend

# Register your routes
app.register_blueprint(monday_bp, url_prefix='/api')  # Prefix to match frontend fetch

@app.route("/")
def index():
    return "Backend is running"

if __name__ == "__main__":
    app.run(debug=True)
