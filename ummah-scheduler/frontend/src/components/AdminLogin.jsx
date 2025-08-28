//adminlogin.jsx
import React, { useEffect } from 'react';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL;

export default function AdminLogin() {
  useEffect(() => {
    // On load, redirect to Google OAuth
    window.location.href = "http://localhost:5050/auth/admin-login";
  }, []);

  return (
    <div className="schedule-container">
      <div className="schedule-card">
        <h2 className="schedule-title">Redirecting to Google...</h2>
        <p>Please wait while we log you in with your UPTeam Google account.</p>
      </div>
    </div>
  );
}
