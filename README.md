# 🗓️ Internal Scheduler Tool — Ummah Professionals

A responsive internal scheduling tool built for mentors to review mentee submissions and availability. Designed to streamline mentor-mentee meeting coordination with a clean, centered UI and real-time data display.

## Features

- View mentee name, email, industry, and availability
- Responsive grid-based layout
- Modal popups with full submission details
- Backend API integration for live data
- Clean UI using React + Vite
  
## Tech Stack

- **Frontend:** React + Vite, CSS
- **Backend:** Python (Flask)
- **API:** RESTful endpoint (`/api/submissions`)

## How to Run Locally

### 1. Clone the Repository
- git clone https://github.com/Ummah-Professionals-Internship-2025/team-404.git

### 2. Run the Backend (Python + Flask)

- Make sure you have **Python 3.x** installed.

```bash
cd backend
pip install flask flask-cors
python app.py
```
### 3. Run the Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```
- The frontend app will run on: http://localhost:5173

- GET /api/submissions: Fetches a list of all mentee form submissions in JSON format.
