// src/components/Login.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/white-horizontal.png';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");

    if (email) {
      sessionStorage.setItem("mentorEmail", email);
      navigate("/");
    }
  }, [navigate]);

  const handleLogin = () => {
    window.location.href = "http://localhost:5050/auth/login-basic";
  };

  return (
    <div className="login-container">
      <div className="glow top-left" />
      <div className="glow bottom-right" />

      <div className="login-card">
        <img src={logo} alt="Ummah Professionals" className="login-logo" />
        <h1 className="login-header">Ummah Scheduler</h1>
        <p className="login-subtext">Future-forward mentorship, powered by purpose.</p>
        <button className="google-login-button" onClick={handleLogin}>
          <svg viewBox="0 0 256 262" xmlns="http://www.w3.org/2000/svg" className="google-icon">
            <path fill="#4285F4" d="M255.9 133.5c0-11.6-1-23.2-3-34.4H130.1v65.1h71.7c-3 16-11.7 29.6-24.8 38.6v32h40c23.4-21.5 38.9-53.2 38.9-91.3z" />
            <path fill="#34A853" d="M130.1 261c33.6 0 61.9-11.1 82.5-30.2l-40-32c-11.1 7.4-25.3 11.8-42.5 11.8-32.7 0-60.4-22.1-70.3-51.9H18v32.5c20.5 40.6 62.9 69.8 112.1 69.8z" />
            <path fill="#FBBC05" d="M59.8 158.7c-4.8-14.2-4.8-29.5 0-43.7V82.5H18c-17.9 35.7-17.9 78 0 113.7l41.8-32.5z" />
            <path fill="#EA4335" d="M130.1 51.7c17.8 0 33.8 6.1 46.5 18l34.8-34.8C192 12.1 162.7 0 130.1 0 80.9 0 38.5 29.2 18 69.8l41.8 32.5c9.9-29.8 37.6-51.9 70.3-51.9z" />
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
