// src/components/FollowUp.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import "../App.css";
import logo from "../assets/white-horizontal.png";
import filter_icon from '../assets/filter_icon.svg';
import search_icon from '../assets/search_icon.svg';
import light_mode_icon from '../assets/light_mode.svg';
import dark_mode_icon from '../assets/dark_mode.svg';
import Sidebar from "./Sidebar";
import FollowUpModal from "./FollowUpModal";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL;

export default function FollowUp() {
  const [doneSubmissions, setDoneSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProfession, setSelectedProfession] = useState("");
  const [mentorEmail, setMentorEmail] = useState("");
  const navigate = useNavigate();

  // Theme state (same as dashboard)
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboardTheme');
      if (saved === 'light' || saved === 'dark') return saved;
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
    } catch {}
    return 'light';
  });
  
  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('dashboardTheme', next); } catch {}
      return next;
    });
  };

  // --- data fetch with loading state ---
  useEffect(() => {
    setLoading(true);
     fetch(`${BACKEND_URL}/api/followup`)
      .then((res) => res.json())
      .then((data) => {
        const deletedIds = JSON.parse(
          localStorage.getItem("softDeletedFollowUps") || "[]"
        );
        const filtered = data.filter((item) => !deletedIds.includes(item.id));
        setDoneSubmissions(filtered);
      })
      .catch((err) => console.error("Error fetching follow-ups:", err))
      .finally(() => setLoading(false));
  }, []);

  // store current mentor (if any)
  useEffect(() => {
    setMentorEmail(sessionStorage.getItem("mentorEmail") || "");
  }, []);

  // --- helpers for webmail ---
  function getWebmailUrl(email, subject, body) {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    const domain = (email || "").split("@")[1]?.toLowerCase() || "";
    if (domain.includes("gmail.com"))
      return `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${encodedSubject}&body=${encodedBody}`;
    if (
      domain.includes("outlook.com") ||
      domain.includes("hotmail.com") ||
      domain.includes("live.com")
    )
      return `https://outlook.office.com/mail/deeplink/compose?to=${email}&subject=${encodedSubject}&body=${encodedBody}`;
    if (domain.includes("yahoo.com"))
      return `https://compose.mail.yahoo.com/?to=${email}&subject=${encodedSubject}&body=${encodedBody}`;
    return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
  }

  // Auto-resume after login (message flow)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loggedIn = params.get("loggedIn") === "true";
    const emailParam = params.get("email");

    if (emailParam) {
      sessionStorage.setItem("mentorEmail", emailParam);
      setMentorEmail(emailParam);
    }

    if (loggedIn && sessionStorage.getItem("messageIntent") === "true") {
      const studentEmail = sessionStorage.getItem("messageStudentEmail");
      const studentName = sessionStorage.getItem("messageStudentName");
      sessionStorage.removeItem("messageIntent");
      sessionStorage.removeItem("messageStudentEmail");
      sessionStorage.removeItem("messageStudentName");

      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      const subject = "Follow-Up on Your Ummah Professionals Mentorship";
      const body = `Hi ${studentName},\n\nI hope you're doing well! I'm following up to see if you'd like a second mentorship session.\nIf you're interested, let me know and we can schedule a new meeting.\n\n- ${
        emailParam || mentorEmail
      }`;
      const url = getWebmailUrl(studentEmail, subject, body);
      setTimeout(() => window.open(url, "_blank"), 400);
    }
  }, []);

  // Soft delete (UI only)
  const handleSoftDelete = (id) => {
    // Find the submission to get the name for confirmation
    const submission = doneSubmissions.find(item => item.id === id);
    const name = submission?.name || 'this meeting';
    
    if (!window.confirm(`Are you sure you want to delete ${name}? This will hide it from the list.`)) {
      return;
    }
    
    setDoneSubmissions((prev) => prev.filter((item) => item.id !== id));
    const deletedIds = JSON.parse(
      localStorage.getItem("softDeletedFollowUps") || "[]"
    );
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem(
        "softDeletedFollowUps",
        JSON.stringify(deletedIds)
      );
    }
  };

  // ---------- presentation helpers ----------
  const DAYS = ["Su", "M", "Tu", "W", "Th", "F", "Sa"];

  const renderAvailabilityChips = (value) => {
    const raw = Array.isArray(value) ? value.join(",") : String(value || "");
    return (
      <div className="wkdays wkdays--dash">
        {DAYS.map((d) => {
          const on = raw.toLowerCase().includes(d.toLowerCase());
          return (
            <span key={d} className={`day ${on ? "on" : "off"}`}>
              {d}
            </span>
          );
        })}
      </div>
    );
  };

  const splitIndustry = (val) => {
    if (!val) return { primary: "—", extra: 0 };
    if (Array.isArray(val))
      return { primary: val[0] || "—", extra: Math.max(0, val.length - 1) };
    const parts = String(val)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return { primary: parts[0] || "—", extra: Math.max(0, parts.length - 1) };
  };

  const renderIndustryPills = (industry) => {
    const { primary, extra } = splitIndustry(industry);
    return (
      <>
        <span className="pill-blue">{primary}</span>
        {extra > 0 && <span className="pill-extra">+{extra}</span>}
      </>
    );
  };

  // Only calculate visibleRows when not loading to improve performance
  const visibleRows = loading ? [] : doneSubmissions.filter(
    (item) =>
      (!searchQuery ||
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(item.industry || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())) &&
      (!selectedProfession || item.industry === selectedProfession)
  );

  // Handle propose meeting from modal
  const handleProposeMeeting = (dateTime) => {
    if (!selected) return;

    sessionStorage.setItem("studentId", selected.id);
    sessionStorage.setItem("meetingTime", dateTime.toISOString());
    sessionStorage.setItem("fromFollowUp", "true");

    const me = sessionStorage.getItem("mentorEmail") || mentorEmail;
    if (!me) {
       window.location.href = `${BACKEND_URL}/auth/login`;
      return;
    }
   window.location.href = `${FRONTEND_URL}/schedule-confirm?email=${me}`;
};


  return (
    <div className={`app-container ${theme === 'dark' ? 'theme-dark' : ''}`}>
      {/* Use same header styling as dashboard */}
      <header className="app-header">
        <div className="main-header">
          <div className="admin-header-left">
            <img src={logo} alt="Ummah Professionals" className="logo" />
          </div>

          <h1>Follow-Up</h1>

          <div className="admin-header-right">
            {/* Theme toggle */}
            <button
              className="theme-toggle"
              aria-label="Toggle dark mode"
              aria-pressed={theme === 'dark'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={toggleTheme}
            >
              <img 
                src={theme === 'dark' ? light_mode_icon : dark_mode_icon}
                alt={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                width="30"
                height="27.5"
              />
            </button>

            <div className="sidebar-anchor">
              <Sidebar theme={theme} />
            </div>
          </div>
        </div>
      </header>

      {/* Use same filter controls as dashboard */}
      <div className="filter-controls">
        <div className="toolbar-left">
          {/* Search pill */}
          <div className="search-pill">
            <img 
              src={search_icon} 
              alt="Search" 
              className="search-icon"
              onClick={() => {
                document.querySelector('.search-pill input').focus();
              }}
            />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

          {/* Filter dropdown pill */}
          <div className="filter-pill">
            <img 
              src={filter_icon} 
              alt="Filter" 
              className="filter-icon"
              onClick={() => {
                document.querySelector('.filter-pill select').click();
              }}
            />
          <select
            value={selectedProfession}
            onChange={(e) => setSelectedProfession(e.target.value)}
          >
            <option value="">Filter by Profession</option>
              {loading ? [] : [...new Set(doneSubmissions.map((s) => s.industry).filter(Boolean))].map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
          </select>
            <svg 
              className="chevron-icon" 
              viewBox="0 0 20 20" 
              fill="currentColor"
              onClick={() => {
                document.querySelector('.filter-pill select').click();
              }}
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          </div>
        </div>
      </div>

      <div className="content-container">
        {/* Column headers using same structure as dashboard */}
        <div className="dash-card header-card">
          <div className="card-content">
            <div className="dash-col-left">
              <div className="header-text">NAME</div>
            </div>
            <div className="dash-col-avail">
              <div className="header-text">AVAILABILITY</div>
            </div>
            <div className="dash-col-industry">
              <div className="header-text">INDUSTRY</div>
            </div>
            <div className="dash-col-picked">
              <div className="header-text">STATUS</div>
            </div>
            <div className="dash-col-status">
              <div className="header-text">ACTIONS</div>
        </div>
        </div>
      </div>

        {/* List using dashboard card styling */}
        {loading ? (
          <p className="status-text">Loading submissions...</p>
        ) : (
          <div className="submissions-grid">
        {visibleRows.length === 0 && (
              <p className="status-text">No completed meetings yet.</p>
        )}

          {visibleRows.map((item) => (
            <div
              key={item.id}
              className="dash-card"
              onClick={() => setSelected(item)}
            >
              <div className="card-content">
                {/* Left column: Name and Email */}
                <div className="dash-col-left">
                  <div className="dash-name">{item.name}</div>
                  <div className="dash-email">{item.email}</div>
                </div>

                {/* Availability column */}
                <div className="dash-col-avail">
                  {renderAvailabilityChips(item.availability)}
              </div>

                {/* Industry column */}
                <div className="dash-col-industry">{renderIndustryPills(item.industry)}</div>

                {/* Status column */}
                <div className="dash-col-picked">
                  <div 
                    className="status-tag" 
                    style={theme === 'dark' ? { backgroundColor: '#0f2f22', color: '#86efac' } : { backgroundColor: '#DCFEE7', color: '#17803D' }}
                  >
                    DONE
                  </div>
              </div>

                {/* Actions column */}
                <div className="dash-col-status" style={{ display: 'flex', gap: '10px', flexDirection: 'row-reverse' }}>
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSoftDelete(item.id);
                    }}
                  >
                    DELETE
                  </button>
                  <button
                    className="message-btn"
                    style={{
                      background: '#024B6E',
                      color: '#fff',
                      boxShadow: '0 10px 22px rgba(2,75,110,0.35)',
                      borderRadius: '18px',
                      padding: '12px 18px',
                      fontWeight: '700',
                      letterSpacing: '.2px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'transform .15s ease, filter .15s ease',
                      userSelect: 'none'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const subject = "Follow-Up on Your Ummah Professionals Mentorship";
                      const body = `Hi ${item.name},\n\nI hope you're doing well! I'm following up to see if you'd like a second mentorship session.\nIf you're interested, let me know and we can schedule a new meeting.\n\n- ${mentorEmail}`;
                      const url = getWebmailUrl(item.email, subject, body);
                      window.open(url, "_blank");
                    }}
                  >
                    MESSAGE
                  </button>
                </div>
              </div>
            </div>
          ))}
                    </div>
                  )}
                </div>

      {/* Use the new DashboardModal-based modal */}
      {selected && (
        <div className="dashboard-modal-overlay" onClick={() => setSelected(null)}>
          <FollowUpModal
            student={selected}
            onClose={() => setSelected(null)}
            theme={theme}
            onProposeMeeting={handleProposeMeeting}
          />
        </div>
      )}
    </div>
  );
}
