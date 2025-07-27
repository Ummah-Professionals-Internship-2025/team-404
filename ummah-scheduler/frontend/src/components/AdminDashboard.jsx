//admindashboard.jsx in components
import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if redirected from Google OAuth with ?loggedIn=true
    const params = new URLSearchParams(window.location.search);
    const isFromLogin = params.get("loggedIn") === "true";

    if (isFromLogin) {
      sessionStorage.setItem("adminLoggedIn", "true");
      // Clean up the URL so ?loggedIn=true doesn't stay in the bar
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
    fetch('http://localhost:5050/api/submissions')
      .then((res) => res.json())
      .then((data) => {
        setSubmissions(data);
        setLoading(false);
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
                  </div>
                  <div>
                    <button
                      className="propose-btn"
                      onClick={() => {
                        const recipient = encodeURIComponent(sub.email);
                        const subject = encodeURIComponent("Follow-up on your Ummah Professionals mentorship");
                        const body = encodeURIComponent(`Hi ${sub.name},\n\nJust checking in to see how your mentorship is going.\n\n- UP Team`);

                        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${subject}&body=${body}`;
                        window.open(gmailUrl, '_blank');
                      }}
                    >
                      Message
                    </button>
                    <button className="cancel-btn" onClick={() => alert("Cancel coming soon")}>Cancel</button>
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
