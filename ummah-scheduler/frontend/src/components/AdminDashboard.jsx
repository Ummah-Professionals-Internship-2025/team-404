//admindashboard.jsx in components
// src/components/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle ?loggedIn=true after Google OAuth
    const params = new URLSearchParams(window.location.search);
    const isFromLogin = params.get("loggedIn") === "true";

    if (isFromLogin) {
      sessionStorage.setItem("adminLoggedIn", "true");
      window.history.replaceState(null, "", "/admin-dashboard");
    }

    const isLoggedIn = sessionStorage.getItem("adminLoggedIn");
    if (!isLoggedIn) {
      window.location.href = "/admin-login";
      return;
    }

    fetchSubmissions();
  }, []);

  const fetchSubmissions = () => {
    // ✅ Fetch from admin-submissions so we get event_id and pickedByEmail
    fetch('http://localhost:5050/api/admin-submissions')
      .then((res) => res.json())
      .then((data) => {
        setSubmissions(data);
        setLoading(false);
      });
  };

  const handleCancel = (sub) => {
    if (!window.confirm(`Are you sure you want to cancel the meeting for ${sub.name}?`)) return;

    fetch('http://localhost:5050/api/cancel-meeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sub.id }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          alert(`Error canceling meeting: ${data.error}`);
        } else {
          alert(`✅ ${data.message}`);
          fetchSubmissions(); // Refresh the list after cancel
        }
      })
      .catch((err) => {
        console.error("Cancel meeting error:", err);
        alert("❌ Failed to cancel meeting. Check backend logs.");
      });
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Admin Dashboard</h1>
        <Sidebar />
      </header>

      <div className="content-container">
        {loading ? (
          <p>Loading submissions...</p>
        ) : submissions.length === 0 ? (
          <p>No admin submissions yet.</p>
        ) : (
          <div className="submissions-grid">
            {submissions.map((sub) => (
              <div key={sub.id} className="submission-card">
                <div className="card-content">
                  <div className="student-info">
                    <p className="student-name">{sub.name}</p>
                    <p>{sub.email}</p>
                    <p><strong>Status:</strong> {sub.status || 'To Do'}</p>
                    <p><strong>Picked By:</strong> {sub.pickedBy || 'N/A'}</p>
                    <p><strong>Meeting Event:</strong> {sub.event_id || 'None yet'}</p>
                  </div>
                  <div>
                    <button
                      className="propose-btn"
                      onClick={() => {
                        const recipient = encodeURIComponent(sub.email);
                        const subject = encodeURIComponent("Follow-up on your Ummah Professionals mentorship");
                        const body = encodeURIComponent(
                          `Hi ${sub.name},\n\nJust checking in to see how your mentorship is going.\n\n- UP Team`
                        );
                        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${subject}&body=${body}`;
                        window.open(gmailUrl, '_blank');
                      }}
                    >
                      Message
                    </button>
                    <button className="cancel-btn" onClick={() => handleCancel(sub)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
