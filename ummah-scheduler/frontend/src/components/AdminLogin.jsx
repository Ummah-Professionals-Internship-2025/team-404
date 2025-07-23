//adminlogin.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    const res = await fetch("http://localhost:5050/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const result = await res.json();
    if (result.success) {
      sessionStorage.setItem("adminLoggedIn", "true");
      sessionStorage.setItem("adminEmail", email);

      navigate("/admin-dashboard");
    } else {
      alert("Invalid credentials.");
    }
  };

  return (
    <div className="schedule-container">
      <div className="schedule-card">
        <h2 className="schedule-title">Admin Login</h2>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Admin Email"
            className="name-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="name-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="send-invite-btn">Login</button>
        </form>
      </div>
    </div>
  );
}
