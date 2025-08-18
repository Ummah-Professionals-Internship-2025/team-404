import React, { useEffect, useState, useRef, useMemo } from 'react';
import './AdminDashboard.css';
import logo from '../assets/blue-horizontal.png'; // purely visual

const SOFT_DELETE_KEY = "softDeletedAdminSubmissions";

// 🔧 Normalize all status variants to a single canonical set used by the UI
const CANON_MAP = {
  '': 'To Do',
  'to do': 'To Do',
  'todo': 'To Do',
  'to-do': 'To Do',
  'pending': 'To Do',
  'new': 'To Do',
  'submitted': 'To Do',
  'in progress': 'In Progress',
  'in-progress': 'In Progress',
  'working': 'In Progress',
  'inprogress': 'In Progress',
  'done': 'Done',
  'complete': 'Done',
  'completed': 'Done',
  'canceled': 'Canceled',
  'cancelled': 'Canceled',
  'cancel': 'Canceled',
};
const canonicalStatus = (raw) => {
  const key = (raw ?? '').toString().trim().toLowerCase();
  return CANON_MAP[key] || 'To Do';
};

// Helper to safely read a date-ish string and return a Date (or null)
const parseDate = (v) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

// Build a stable uid using whatever the backend gives us
const buildUID = (s) => {
  const primary = s.id ?? s._id ?? s.uuid ?? s.submission_id;
  if (primary) return String(primary);
  const submitted = s.submitted ?? s.created_at ?? s.timestamp ?? '';
  const email = (s.email || '').trim().toLowerCase();
  const name = (s.name || '').trim().toLowerCase();
  const phone = (s.phone || '').trim();
  return [email, name, submitted, phone].join('|') || Math.random().toString(36).slice(2);
};

// ✅ Normalize a raw record into a consistent shape (our overrides LAST)
const normalize = (raw) => {
  const submittedISO = raw.submitted ?? raw.created_at ?? raw.timestamp ?? null;
  const submitted = parseDate(submittedISO)?.toISOString() || null;
  return {
    ...raw, // spread FIRST so our normalized keys override if conflicting
    id: raw.id ?? raw._id ?? raw.uuid ?? raw.submission_id ?? null,
    uid: buildUID(raw),
    name: raw.name ?? '',
    email: raw.email ?? '',
    phone: raw.phone ?? '',
    industry: raw.industry ?? raw.profession ?? '',
    pickedBy: raw.pickedBy ?? raw.picked_by ?? '',
    event_id: raw.event_id ?? raw.eventId ?? '',
    submitted, // normalized ISO or null
    status: canonicalStatus(raw.status), // 🔒 keep canonical
  };
};

// Merge + dedupe by uid (favor the first occurrence)
const mergeByUID = (arrays) => {
  const out = [];
  const seen = new Set();
  for (const arr of arrays) {
    for (const r of arr) {
      if (!r) continue;
      const uid = r.uid || buildUID(r);
      if (seen.has(uid)) continue;
      seen.add(uid);
      out.push(r);
    }
  }
  return out;
};

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  // menu / soft-delete
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const menuRef = useRef();

  // Theme (light/dark) — persist + respect system preference on first load
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('adminTheme');
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
      try { localStorage.setItem('adminTheme', next); } catch {}
      return next;
    });
  };

  // 🔎 New, purely UI filters (don’t alter backend data)
  const [searchQuery, setSearchQuery] = useState('');
  const [professionFilter, setProfessionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

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
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchJSON = (url) =>
    fetch(url).then(r => r.ok ? r.json() : Promise.reject(new Error(`${r.status} ${r.statusText}`)));

  const fetchSubmissions = () => {
    setLoading(true);

    // 1) Primary admin endpoint
    const primaryUrl = 'http://localhost:5050/api/admin-submissions';
    // 2) Fallbacks that often hold fresh “To Do” rows
    const fallbacks = [
      'http://localhost:5050/api/submissions',
      'http://localhost:5050/api/form-submissions',
      'http://localhost:5050/api/all-submissions',
    ];

    fetchJSON(primaryUrl)
      .then((primaryRaw) => {
        const primary = Array.isArray(primaryRaw) ? primaryRaw.map(normalize) : [];
        const toDoCountPrimary = primary.filter(r => r.status === 'To Do').length;

        const needFallbacks = toDoCountPrimary === 0;

        if (!needFallbacks) {
          applySoftDeleteAndSet(primary);
          return;
        }

        return Promise.allSettled(fallbacks.map(fetchJSON))
          .then(results => {
            const extra = results
              .filter(r => r.status === 'fulfilled' && Array.isArray(r.value))
              .flatMap(r => r.value.map(normalize));

            const merged = mergeByUID([primary, extra]);
            applySoftDeleteAndSet(merged);
          });
      })
      .catch(() => {
        return Promise.allSettled([
          fetchJSON('http://localhost:5050/api/submissions'),
          fetchJSON('http://localhost:5050/api/form-submissions'),
          fetchJSON('http://localhost:5050/api/all-submissions'),
        ])
        .then(results => {
          const extra = results
            .filter(r => r.status === 'fulfilled' && Array.isArray(r.value))
            .flatMap(r => r.value.map(normalize));
          applySoftDeleteAndSet(extra);
        })
        .catch(() => {
          setSubmissions([]);
          setLoading(false);
        });
      });
  };

  const applySoftDeleteAndSet = (rows) => {
    const deletedUIDs = new Set(JSON.parse(localStorage.getItem(SOFT_DELETE_KEY) || "[]"));
    const filtered = rows.filter(item => showDeleted || !deletedUIDs.has(item.uid));
    const sorted = [...filtered].sort((a, b) => {
      const da = parseDate(a.submitted);
      const db = parseDate(b.submitted);
      if (da && db) return db - da;
      if (db) return 1;
      if (da) return -1;
      return 0;
    });
    setSubmissions(sorted);
    setLoading(false);
  };

  // Re-apply when toggling "show soft-deleted"
  useEffect(() => {
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDeleted]);

  const handleCancel = (sub) => {
    if (!sub.id) {
      alert('This submission has no server id; cannot cancel from here.');
      return;
    }
    if (!window.confirm(`Are you sure you want to cancel the meeting for ${sub.name || 'this user'}?`)) return;

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
      .catch(() => {
        alert("❌ Failed to cancel meeting. Check backend logs.");
      });
  };

  const handleSoftDelete = (e, uid) => {
    e.stopPropagation();
    setSubmissions(prev => prev.filter(item => item.uid !== uid));
    const deleted = JSON.parse(localStorage.getItem(SOFT_DELETE_KEY) || "[]");
    if (!deleted.includes(uid)) {
      deleted.push(uid);
      localStorage.setItem(SOFT_DELETE_KEY, JSON.stringify(deleted));
    }
  };

  const handleRestoreAll = () => {
    localStorage.removeItem(SOFT_DELETE_KEY);
    fetchSubmissions();
  };

  // Build dropdown options from data
  const professionOptions = useMemo(() => {
    const set = new Set(submissions.map(s => (s.industry || '').trim()).filter(Boolean));
    return ['All', ...Array.from(set).sort((a,b)=>a.localeCompare(b))];
  }, [submissions]);

  // Derived, filtered list (client-only)
  const visibleSubmissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const norm = (s) => (s || '').toLowerCase().trim();
    return submissions.filter(s => {
      // status (robust, always canonicalize)
      const sStatus = canonicalStatus(s.status);
      const statusOk =
        statusFilter === 'All' ||
        sStatus === canonicalStatus(statusFilter);

      // profession
      const profOk = professionFilter === 'All' || (s.industry || '') === professionFilter;

      // search
      const searchOk = !q ||
        norm(s.name).includes(q) ||
        norm(s.email).includes(q) ||
        norm(s.industry).includes(q) ||
        norm(s.pickedBy).includes(q);

      return statusOk && profOk && searchOk;
    });
  }, [submissions, searchQuery, professionFilter, statusFilter]);

  return (
    <div className={`admin-page ${theme === 'dark' ? 'theme-dark' : ''}`}>
      {/* Hero header styled to match Figma vibe */}
      <header className="admin-header hero">
        <div className="admin-header-left">
          <img src={logo} alt="Ummah Professionals" className="admin-logo" />
        </div>

        <h1 className="hero-title">Admin Dashboard</h1>

        <div className="admin-header-right">
          {/* 🌙/☀️ theme toggle */}
          <button
            className="theme-toggle"
            aria-label="Toggle dark mode"
            aria-pressed={theme === 'dark'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <div className="menu-wrapper" ref={menuRef}>
            <button
              className="menu-toggle"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Open navigation menu"
            >
              ☰
            </button>

            {menuOpen && (
              <div className="dropdown-menu">
                <a href="/admin-dashboard">🏠 Dashboard</a>
                <a href="/admin-statistics">📊 Statistics</a>
                <a href="/">🔙 Exit Admin</a>
                <div className="menu-divider" />
                <label className="soft-toggle">
                  <input
                    type="checkbox"
                    checked={showDeleted}
                    onChange={() => setShowDeleted(v => !v)}
                  />
                  Show soft-deleted
                </label>
                <button className="message-btn" style={{ margin: 8 }} onClick={handleRestoreAll}>
                  Restore All
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Figma-style toolbar */}
      <div className="admin-toolbar">
        <div className="toolbar-left">
          <div className="search-chip">
            <span className="icon">🔎</span>
            <input
              className="search-input"
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-chip">
            <span className="icon">⛃</span>
            <select
              className="filter-select"
              value={professionFilter}
              onChange={(e) => setProfessionFilter(e.target.value)}
            >
              {professionOptions.map(opt => (
                <option key={opt} value={opt}>{opt === 'All' ? 'All Professions' : opt}</option>
              ))}
            </select>
            <span className="chev">▾</span>
          </div>
        </div>

        <div className="pill-bar">
          {[
            { label: 'ALL', value: 'All' },
            { label: 'TO DO', value: 'To Do' },
            { label: 'IN PROGRESS', value: 'In Progress' },
            { label: 'CANCELLED', value: 'Cancelled' }, // UI label, maps to 'Canceled'
          ].map(p => (
            <button
              key={p.value}
              className={`pill ${statusFilter === p.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-content">
        {loading ? (
          <p className="dashboard-status-text">Loading submissions...</p>
        ) : visibleSubmissions.length === 0 ? (
          <p className="dashboard-status-text">No submissions match your filters.</p>
        ) : (
          <>
            <p className="dashboard-hint">Submissions are shown from most recent to oldest.</p>
            <div className="submission-list">
              {visibleSubmissions.map((sub) => {
                const status = canonicalStatus(sub.status);
                return (
                  <div
                    key={sub.uid}
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
                        <div className="status-chip" data-status={status}>
                          {status}
                        </div>
                        <p className="picked-by">
                          <strong>Picked By:</strong> {sub.pickedBy || 'N/A'}
                        </p>
                        <p className="picked-by">
                          <strong>Event:</strong> {sub.event_id || 'None yet'}
                        </p>
                        <p className="submitted-time">
                          <strong>Submitted:</strong>{' '}
                          {sub.submitted ? new Date(sub.submitted).toLocaleString() : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="card-actions">
                      <button
                        className="btn message solid"
                        onClick={(e) => {
                          e.stopPropagation();
                          const recipient = encodeURIComponent(sub.email || '');
                          const subject = encodeURIComponent("Follow-up on your Ummah Professionals mentorship");
                          const body = encodeURIComponent(`Hi ${sub.name || ''},\n\nJust checking in to see how your mentorship is going.\n\n- UP Team`);
                          const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${subject}&body=${body}`;
                          window.open(gmailUrl, '_blank');
                        }}
                      >
                        ✉️ MESSAGE
                      </button>

                      <button
                        className="btn cancel ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancel(sub);
                        }}
                      >
                        CANCEL
                      </button>

                      <button
                        className="btn delete ghost"
                        onClick={(e) => handleSoftDelete(e, sub.uid)}
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                );
              })}
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
            <p><strong>Submitted:</strong> {selected.submitted ? new Date(selected.submitted).toLocaleString() : '—'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
