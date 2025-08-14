import React, { useEffect, useState, useRef } from 'react';
import './AdminDashboard.css';

const SOFT_DELETE_KEY = "softDeletedAdminSubmissions";

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false); // optional toggle
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
        const deletedIds = JSON.parse(localStorage.getItem(SOFT_DELETE_KEY) || "[]");
        const filtered = showDeleted
          ? data
          : data.filter(item => !deletedIds.includes(item.id));
        setSubmissions(filtered);
        setLoading(false);
      });
  };

  // Re-apply filter when toggling showDeleted
  useEffect(() => {
    // re-run filter without re-hitting API
    const deletedIds = JSON.parse(localStorage.getItem(SOFT_DELETE_KEY) || "[]");
    setSubmissions(prev => {
      if (showDeleted) return [...prev, ...[]]; // no-op: show all requires refetch
      // If we filtered before toggle, ensure refetch so we have the full list to filter from
      return prev.filter(item => !deletedIds.includes(item.id));
    });
    // Safer: just refetch so we always have full data then apply filter
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDeleted]);

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

<<<<<<< Updated upstream
<<<<<<< Updated upstream
  // 🧹 Soft delete (UI only; ID saved in localStorage, DB untouched)
=======
  
>>>>>>> Stashed changes
=======
  
>>>>>>> Stashed changes
  const handleSoftDelete = (e, id) => {
    e.stopPropagation();
    // Remove from current UI list
    setSubmissions(prev => prev.filter(item => item.id !== id));
    // Persist the hidden ID
    const deletedIds = JSON.parse(localStorage.getItem(SOFT_DELETE_KEY) || "[]");
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem(SOFT_DELETE_KEY, JSON.stringify(deletedIds));
    }
  };

  // ♻️ Optional restore helpers
  const handleRestoreAll = () => {
    localStorage.removeItem(SOFT_DELETE_KEY);
    fetchSubmissions();
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="dashboard-title">ADMIN DASHBOARD</h1>

        <div className="admin-actions">
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
                <div style={{ padding: '8px 12px' }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showDeleted}
                      onChange={() => setShowDeleted(v => !v)}
                    />
                    Show soft-deleted
                  </label>
                  <button
                    className="message-btn"
                    style={{ marginTop: 8 }}
                    onClick={handleRestoreAll}
                  >
                    Restore All
                  </button>
                </div>
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
<<<<<<< Updated upstream
<<<<<<< Updated upstream
                    {/* 🧹 Soft Delete button (UI only) */}
=======
                   
>>>>>>> Stashed changes
=======
                   
>>>>>>> Stashed changes
                    <button
                      className="soft-delete-btn"
                      style={{ marginLeft: 8, background: '#e5e7eb', color: '#111827', padding: '6px 10px', borderRadius: 8 }}
                      onClick={(e) => handleSoftDelete(e, sub.id)}
                    >
                      Delete
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
