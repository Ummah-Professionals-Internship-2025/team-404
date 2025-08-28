// src/components/LoginCallback.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL;

export default function LoginCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Processing...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");

    if (email) {
      console.log("✅ LoginCallback received email:", email);
      sessionStorage.setItem("mentorEmail", email);

      // Slight delay to ensure router is ready before redirecting
      setTimeout(() => {
        navigate("/");
      }, 100);
    } else {
      console.warn("❌ No email in query params");
      setStatus("Login failed. Please try again.");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    }
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h2 className="text-lg font-medium mb-4">{status}</h2>
      <div className="loader" />
    </div>
  );
}
