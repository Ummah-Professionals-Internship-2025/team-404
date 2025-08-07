import React, { useEffect, useState, useRef } from 'react';
import './AdminDashboard.css';
import logo from '../assets/blue-horizontal.png';

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
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

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSubmissions = () => {
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
          fetchSubmissions();
        }
      })
      .catch((err) => {
        console.error("Cancel meeting error:", err);
        alert("❌ Failed to cancel meeting. Check backend logs.");
      });
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-left">
          <img src={logo} alt="Logo" className="admin-logo" />
        </div>

        <h1 className="admin-header-center">ADMIN DASHBOARD</h1>

        <div className="admin-header-right">
          <div className="menu-wrapper" ref={menuRef}>
            <button
              className="menu-toggle"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Open navigation menu"
              style={{ color: '#2563eb' }}
            >
              ☰
            </button>
            {menuOpen && (
              <div className="dropdown-menu">
                <a href="/admin-dashboard">🏠 Dashboard</a>
                <a href="/admin-statistics">📊 Statistics</a>
                <a href="/">🔙 Exit Admin</a>
              </div>
            )}
          </div>
        </div>
      </header>




      <div className="dashboard-content">
        {loading ? (
          <p className="dashboard-status-text">Loading submissions...</p>
        ) : submissions.length === 0 ? (
          <p className="dashboard-status-text">No admin submissions yet.</p>
        ) : (
          <>
            <p className="dashboard-hint">Submissions are shown from most recent to oldest.</p>
            <div className="submission-list">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="submission-card horizontal-card"
                  onClick={() => setSelected(sub)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="horizontal-info">
                    <div className="card-top">
                      <h3 className="student-name">{sub.name}</h3>
                      <p className="student-email">{sub.email}</p>
                    </div>
                    <div className="card-details">
                      <p><strong>Status:</strong> {sub.status || 'To Do'}</p>
                      <p><strong>Picked By:</strong> {sub.pickedBy || 'N/A'}</p>
                      <p><strong>Event:</strong> {sub.event_id || 'None yet'}</p>
                      <p><strong>Submitted:</strong> {new Date(sub.submitted).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button
                      className="message-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        const recipient = encodeURIComponent(sub.email);
                        const subject = encodeURIComponent("Follow-up on your Ummah Professionals mentorship");
                        const body = encodeURIComponent(`Hi ${sub.name},\n\nJust checking in to see how your mentorship is going.\n\n- UP Team`);
                        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${subject}&body=${body}`;
                        window.open(gmailUrl, '_blank');
                      }}
                    >
                      Message
                    </button>
                    <button
                      className="cancel-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancel(sub);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelected(null)}>
              &times;
            </button>
            <h2>{selected.name}</h2>
            <p><strong>Email:</strong> {selected.email}</p>
            <p><strong>Phone:</strong> {selected.phone}</p>
            <p><strong>Industry:</strong> {selected.industry}</p>
            <p><strong>Academic Standing:</strong> {selected.academicStanding}</p>
            <p><strong>Availability:</strong> {selected.availability}</p>
            <p><strong>Timeline:</strong> {selected.timeline}</p>
            <p><strong>Resume:</strong> <a href={selected.resume} target="_blank" rel="noreferrer">View</a></p>
            <p><strong>Submitted:</strong> {new Date(selected.submitted).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
