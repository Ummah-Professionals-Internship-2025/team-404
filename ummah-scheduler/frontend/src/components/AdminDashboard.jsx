import React, { useEffect, useState, useRef, useMemo } from 'react';
import './AdminDashboard.css';
import logo from '../assets/blue-horizontal.png';
import light_mode_icon from '../assets/light_mode_blue.svg';
import dark_mode_icon from '../assets/dark_mode_blue.svg';
import filter_icon from '../assets/filter_icon.svg';
import soft_delete_icon from '../assets/soft_delete.svg';
import restore_icon from '../assets/restore.svg';
import search_icon from '../assets/search_icon.svg';
import Sidebar from './Sidebar';

const SOFT_DELETE_KEY = 'softDeletedAdminSubmissions';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL;


/* =========================
   Helpers / Normalization
   ========================= */

// Canonicalize statuses
const CANON_MAP = {
  '': 'To Do',
  'to do': 'To Do',
  'todo': 'To Do',
  'to-do': 'To Do',
  pending: 'To Do',
  new: 'To Do',
  submitted: 'To Do',
  'in progress': 'In Progress',
  'in-progress': 'In Progress',
  working: 'In Progress',
  inprogress: 'In Progress',
  done: 'Done',
  complete: 'Done',
  completed: 'Done',
  canceled: 'Canceled',
  cancelled: 'Canceled',
  cancel: 'Canceled',
};
const canonicalStatus = (raw) => {
  const key = (raw ?? '').toString().trim().toLowerCase();
  return CANON_MAP[key] || 'To Do';
};

const parseDate = (v) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

const buildUID = (s) => {
  const primary = s.id ?? s._id ?? s.uuid ?? s.submission_id;
  if (primary) return String(primary);
  const submitted = s.submitted ?? s.created_at ?? s.timestamp ?? '';
  const email = (s.email || '').trim().toLowerCase();
  const name = (s.name || '').trim().toLowerCase();
  const phone = (s.phone || '').trim();
  return [email, name, submitted, phone].join('|') || Math.random().toString(36).slice(2);
};

// best-effort conversion to a readable string
const toDisplay = (v) => {
  if (v == null) return '';
  if (Array.isArray(v)) {
    return v
      .flatMap((item) =>
        typeof item === 'string'
          ? item
          : item?.label || item?.value || item?.name || item?.title || ''
      )
      .filter(Boolean)
      .join(', ');
  }
  if (typeof v === 'object') {
    return v.label || v.value || v.name || v.title || v.url || v.href || JSON.stringify(v);
  }
  return String(v);
};

// pick first non-empty among explicit keys; if none, try fuzzy match
const getField = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return toDisplay(v);
  }
  const norm = (s) => String(s).toLowerCase().replace(/[\s_\-]/g, '');
  const wanted = new Set(keys.map(norm));
  for (const [k, v] of Object.entries(obj || {})) {
    if (wanted.has(norm(k)) && v != null && String(v).trim() !== '') return toDisplay(v);
  }
  return '';
};

// Normalize raw rows into our shape, but keep originals too
const normalize = (raw) => {
  const submittedISO = raw.submitted ?? raw.created_at ?? raw.timestamp ?? null;
  const submitted = parseDate(submittedISO)?.toISOString() || null;

  const name = getField(raw, ['name', 'fullName', 'full_name']);
  const email = getField(raw, ['email', 'emailAddress', 'email_address']);
  const phone = getField(raw, ['phone', 'phoneNumber', 'phone_number', 'mobile']);

  const industry = getField(raw, ['industry', 'profession', 'field', 'major', 'track']);
  const academicStanding = getField(raw, ['academicStanding','academic_standing','standing','classStanding','class_standing']);
  const lookingFor = getField(raw, [
    'lookingFor','looking_for','looking','help','request','topic','service','goal','need','interest','mentorshipArea','mentorship_area','what_are_you_looking_for',
  ]);
  const resume = getField(raw, [
    'resume','resumeUrl','resumeURL','resume_link','resumeLink','cv','cvLink','cv_url','file','fileUrl','attachment',
  ]);
  const howTheyHeard = getField(raw, [
    'howTheyHeard','how_they_heard','heard','heardFrom','referral','referralSource','source','howdidyouhear','where_heard',
  ]);
  const availability = getField(raw, [
    'availability','availabilityText','availability_text','weeklyAvailability','weekly_availability','studentAvailability',
  ]);
  const timeline = getField(raw, ['timeline','dateRange','availabilityDates','range','dates']);
  // 🔒 Comments ONLY from comment-y fields — do NOT pull from "description/details" (often hold dates)
  const otherInfo = getField(raw, [
    'otherInfo','other_info','comments','comment','notes','message','additionalInfo',
  ]);

  return {
    ...raw,
    id: raw.id ?? raw._id ?? raw.uuid ?? raw.submission_id ?? null,
    uid: buildUID(raw),
    name: name || '',
    email: email || '',
    phone: phone || '',
    industry: industry || '',
    academicStanding: academicStanding || '',
    lookingFor: lookingFor || '',
    resume: resume || '',
    howTheyHeard: howTheyHeard || '',
    availability: availability || '',
    timeline: timeline || '',
    otherInfo: otherInfo || '',
    pickedBy: raw.pickedBy ?? raw.picked_by ?? '',
    event_id: raw.event_id ?? raw.eventId ?? '',
    submitted,
    status: canonicalStatus(raw.status),
  };
};

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

/* Availability → map like { sunday:['morning','evening'], ... } */
const availabilityToMap = (txt) => {
  const map = {
    sunday: [], monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [],
  };
  if (!txt) return map;
  const raw = String(txt).toLowerCase();

  if (raw.includes('anytime')) {
    Object.keys(map).forEach((d) => (map[d] = ['morning', 'afternoon', 'evening']));
    return map;
  }

  // Try "Su: Morning; Mo: Morning" style
  if (/:/.test(raw)) {
    const chunks = raw
      .replace(/\r?\n/g, ';')
      .split(/;+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const dayKey = (s) =>
      /sun/.test(s) ? 'sunday' :
      /mon/.test(s) ? 'monday' :
      /tue/.test(s) ? 'tuesday' :
      /wed/.test(s) ? 'wednesday' :
      /thu/.test(s) ? 'thursday' :
      /fri/.test(s) ? 'friday' :
      /sat/.test(s) ? 'saturday' : null;

    for (const c of chunks) {
      const [left, right] = c.split(':').map((x) => (x || '').trim());
      const dk = dayKey(left);
      if (!dk || !right) continue;
      const parts = right.split(/[, ]+/).filter(Boolean);
      if (parts.some((p) => /morning/.test(p))) map[dk].push('morning');
      if (parts.some((p) => /afternoon/.test(p))) map[dk].push('afternoon');
      if (parts.some((p) => /evening/.test(p))) map[dk].push('evening');
    }
    return map;
  }

  // Free-text like "sunday morning, evening, monday afternoon"
  let current = null;
  const tokens = raw.replace(/\r?\n/g, ' ').replace(/[;,]+/g, ' ').split(/\s+/).filter(Boolean);
  const toDay = (t) => (
    /sunday/.test(t) ? 'sunday' :
    /monday/.test(t) ? 'monday' :
    /tuesday/.test(t) ? 'tuesday' :
    /wednesday/.test(t) ? 'wednesday' :
    /thursday/.test(t) ? 'thursday' :
    /friday/.test(t) ? 'friday' :
    /saturday/.test(t) ? 'saturday' : null
  );

  for (const t of tokens) {
    const d = toDay(t);
    if (d) { current = d; if (!map[current]) map[current] = []; continue; }
    if (!current) continue;
    if (/morning/.test(t) && !map[current].includes('morning')) map[current].push('morning');
    if (/afternoon/.test(t) && !map[current].includes('afternoon')) map[current].push('afternoon');
    if (/evening/.test(t) && !map[current].includes('evening')) map[current].push('evening');
  }
  return map;
};

// uniform “N/A” display
const displayNA = (v) => {
  const s = (v ?? '').toString().trim();
  return s ? s : 'N/A';
};

/* =========================
   Component
   ========================= */

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  // menu / soft-delete
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const menuRef = useRef();

  // Theme
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

  // UI filters
  const [searchQuery, setSearchQuery] = useState('');
  const [professionFilter, setProfessionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [restoreFlash, setRestoreFlash] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isFromLogin = params.get('loggedIn') === 'true';
    if (isFromLogin) {
      sessionStorage.setItem('adminLoggedIn', 'true');
      window.history.replaceState(null, '', '/admin-dashboard');
    }

    const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
    if (!isLoggedIn) {
      window.location.href = '/admin-login';
      return;
    }

    fetchSubmissions();
  }, []);

  // Header scroll behavior
  useEffect(() => {
    let lastScrollY = window.scrollY;
    
    const handleScroll = () => {
      const header = document.querySelector('.app-header');
      if (!header) return;
      
      if (window.scrollY > lastScrollY && window.scrollY > 100) {
        // Scrolling down
        header.classList.add('hidden');
      } else {
        // Scrolling up
        header.classList.remove('hidden');
      }
      
      lastScrollY = window.scrollY;
    };
  
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const fetchJSON = (url) =>
    fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status} ${r.statusText}`))));

  const fetchSubmissions = () => {
    setLoading(true);

   
const primaryUrl = `${BACKEND_URL}/api/admin-submissions`;
const fallbacks = [
  `${BACKEND_URL}/api/submissions`,
  `${BACKEND_URL}/api/form-submissions`,
  `${BACKEND_URL}/api/all-submissions`,
];


    fetchJSON(primaryUrl)
      .then((primaryRaw) => {
        const primary = Array.isArray(primaryRaw) ? primaryRaw.map(normalize) : [];
        const toDoCountPrimary = primary.filter((r) => r.status === 'To Do').length;
        const needFallbacks = toDoCountPrimary === 0;

        if (!needFallbacks) { applySoftDeleteAndSet(primary); return; }

        return Promise.allSettled(fallbacks.map(fetchJSON)).then((results) => {
          const extra = results
            .filter((r) => r.status === 'fulfilled' && Array.isArray(r.value))
            .flatMap((r) => r.value.map(normalize));
          const merged = mergeByUID([primary, extra]);
          applySoftDeleteAndSet(merged);
        });
      })
      .catch(() => {
  return Promise.allSettled([
    fetchJSON(`${BACKEND_URL}/api/submissions`),
    fetchJSON(`${BACKEND_URL}/api/form-submissions`),
    fetchJSON(`${BACKEND_URL}/api/all-submissions`),
  ])

          .then((results) => {
            const extra = results
              .filter((r) => r.status === 'fulfilled' && Array.isArray(r.value))
              .flatMap((r) => r.value.map(normalize));
            applySoftDeleteAndSet(extra);
          })
          .catch(() => {
            setSubmissions([]);
            setLoading(false);
          });
      });
  };

  const applySoftDeleteAndSet = (rows) => {
    const deletedUIDs = new Set(JSON.parse(localStorage.getItem(SOFT_DELETE_KEY) || '[]'));
    const filtered = rows.filter((item) => showDeleted || !deletedUIDs.has(item.uid));
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

    fetch(`${BACKEND_URL}/api/cancel-meeting`, {
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
        alert('❌ Failed to cancel meeting. Check backend logs.');
      });
  };

  const handleSoftDelete = (e, uid) => {
    e.stopPropagation();
    setSubmissions((prev) => prev.filter((item) => item.uid !== uid));
    const deleted = JSON.parse(localStorage.getItem(SOFT_DELETE_KEY) || '[]');
    if (!deleted.includes(uid)) {
      deleted.push(uid);
      localStorage.setItem(SOFT_DELETE_KEY, JSON.stringify(deleted));
    }
  };

  const handleRestoreAll = () => {
    localStorage.removeItem(SOFT_DELETE_KEY);
    fetchSubmissions();
    setRestoreFlash(true);
    setTimeout(() => setRestoreFlash(false), 600); // Flash for 0.6 seconds to match CSS animation
  };

  const professionOptions = useMemo(() => {
    const set = new Set(submissions.map((s) => (s.industry || '').trim()).filter(Boolean));
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [submissions]);

  const visibleSubmissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const norm = (s) => (s || '').toLowerCase().trim();
    return submissions.filter((s) => {
      const sStatus = canonicalStatus(s.status);
      const statusOk = statusFilter === 'All' || sStatus === canonicalStatus(statusFilter);
      const profOk = professionFilter === 'All' || (s.industry || '') === professionFilter;
      const searchOk =
        !q ||
        norm(s.name).includes(q) ||
        norm(s.email).includes(q) ||
        norm(s.industry).includes(q) ||
        norm(s.pickedBy).includes(q);
      return statusOk && profOk && searchOk;
    });
  }, [submissions, searchQuery, professionFilter, statusFilter]);

  /* =========================
     Render
     ========================= */

  return (
    <div className={`admin-page ${theme === 'dark' ? 'theme-dark' : ''}`}>
      {/* Header */}
      <header className="app-header">
        <div className="main-header">
          <div className="admin-header-left">
            <img src={logo} alt="Ummah Professionals" className="logo" />
          </div>

          <h1>Admin Dashboard</h1>

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
              <Sidebar isAdmin={true} />
            </div>
          </div>
        </div>
      </header>

      {/* Filter controls */}
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
          <div 
            className="filter-pill"
            onClick={() => {
              document.querySelector('.filter-pill select').click();
            }}
          >
            <img 
              src={filter_icon} 
              alt="Filter" 
              className="filter-icon"
            />
            <select
              value={professionFilter}
              onChange={(e) => setProfessionFilter(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="All">Filter by Profession</option>
              {(() => {
                // Extract individual industries from comma-separated strings
                const allIndustries = submissions
                  .map(s => s.industry)
                  .filter(Boolean)
                  .flatMap(industry => 
                    industry.split(',').map(i => i.trim())
                  )
                  .filter(Boolean);
                
                // Get unique industries and sort them
                return [...new Set(allIndustries)]
                  .sort()
                  .map(industry => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ));
              })()}
            </select>
            <svg 
              className="chevron-icon" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>

          {/* Soft-delete toggle pill */}
          <div 
            className={`soft-delete-pill ${showDeleted ? 'active' : ''}`}
            onClick={() => setShowDeleted(v => !v)}
          >
            <img src={soft_delete_icon} alt="Show soft-deleted" />
            <span className="soft-delete-text">Show Soft-Deleted</span>
          </div>

          {/* Restore all pill */}
          <div 
            className={`restore-pill ${restoreFlash ? 'flash' : ''}`}
            onClick={handleRestoreAll}
          >
            <img src={restore_icon} alt="Restore all" />
            <span className="restore-text">Restore All</span>
          </div>
        </div>

        {/* Status filter pills */}
        <div className="status-filter-pills">
          {['ALL', 'TO DO', 'IN PROGRESS', 'CANCELED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status === 'ALL' ? 'All' : status === 'TO DO' ? 'To Do' : status === 'IN PROGRESS' ? 'In Progress' : 'Canceled')}
              className={`status-pill status-pill-${status.toLowerCase().replace(/\s+/g, '-')} ${
                (statusFilter === 'All' && status === 'ALL') ||
                (statusFilter === 'To Do' && status === 'TO DO') ||
                (statusFilter === 'In Progress' && status === 'IN PROGRESS') ||
                (statusFilter === 'Canceled' && status === 'CANCELED')
                  ? 'active'
                  : ''
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
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
                          <strong>Picked By:</strong> {displayNA(sub.pickedBy) }
                        </p>
                        <p className="picked-by">
                          <strong>Event:</strong> {displayNA(sub.event_id)}
                        </p>
                        <p className="submitted-time">
                          <strong>Submitted:</strong>{' '}
                          {sub.submitted ? new Date(sub.submitted).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="card-actions">
                      <button
                        className="btn message solid"
                        onClick={(e) => {
                          e.stopPropagation();
                          const recipient = encodeURIComponent(sub.email || '');
                          const subject = encodeURIComponent('Follow-up on your Ummah Professionals mentorship');
                          const body = encodeURIComponent(
                            `Hi ${sub.name || ''},\n\nJust checking in to see how your mentorship is going.\n\n- UP Team`
                          );
                          const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${subject}&body=${body}`;
                          window.open(gmailUrl, '_blank');
                        }}
                      >
                        MESSAGE
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

                      <button className="btn delete ghost" onClick={(e) => handleSoftDelete(e, sub.uid)}>
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

      {/* Centered single-column modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div
            className="modal-content admin-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close-btn" onClick={() => setSelected(null)}>
              &times;
            </button>

            <div className="admin-modal-body">
              {/* Header */}
              <div className="student-header">
                <h2 className="student-name-title">{displayNA(selected.name)}</h2>
                <div className="student-pills">
                  {selected.academicStanding && <span className="pill-academic">{selected.academicStanding}</span>}
                  {selected.industry && <span className="pill-industry">{selected.industry}</span>}
                </div>
              </div>

              {/* Contact */}
              <div className="info-section">
                <div className="info-row">
                  <div className="info-label">Email</div>
                  <div className="info-value">{displayNA(selected.email)}</div>
                </div>
                <div className="info-row">
                  <div className="info-label">Phone</div>
                  <div className="info-value">{displayNA(selected.phone)}</div>
                </div>
              </div>

              {/* Info */}
              <div className="info-section">
                <div className="info-row">
                  <div className="info-label">Looking For</div>
                  <div className="info-value">{displayNA(selected.lookingFor)}</div>
                </div>
                <div className="info-row">
                  <div className="info-label">Resume</div>
                  <div className="info-value">
                    {(() => {
                      const v = selected.resume;
                      const href =
                        typeof v === 'string'
                          ? v
                          : v && typeof v === 'object'
                          ? v.url || v.href || v.link || v.src || ''
                          : '';
                      if (href) {
                        const label = href.split('/').pop() || 'View Resume';
                        return (
                          <a href={href} target="_blank" rel="noreferrer">
                            {label}
                          </a>
                        );
                      }
                      return 'N/A';
                    })()}
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-label">How They Heard</div>
                  <div className="info-value">{displayNA(selected.howTheyHeard)}</div>
                </div>
              </div>

              {/* Comments — never fall back to timeline */}
              <div className="comments-section">
                <div className="info-value">{displayNA(selected.otherInfo)}</div>
              </div>

              {/* Availability */}
              <div className="avail-card">
                <div className="label big">Student Availability</div>
                <div className="avail-matrix">
                  {(() => {
                    const map = availabilityToMap(selected.availability || '');
                    const days = [
                      ['Su', 'sunday'],
                      ['Mo', 'monday'],
                      ['Tu', 'tuesday'],
                      ['We', 'wednesday'],
                      ['Th', 'thursday'],
                      ['Fr', 'friday'],
                      ['Sa', 'saturday'],
                    ];
                    return days.map(([short, key]) => {
                      const blocks = map[key] || [];
                      const has = (p) => blocks.includes(p);
                      return (
                        <div className="avail-row" key={key}>
                          <div className="avail-day">{short}</div>
                          <div className="avail-chips">
                            <span className={`avail-chip ${has('morning') ? 'on' : 'off'}`}>Morning</span>
                            <span className={`avail-chip ${has('afternoon') ? 'on' : 'off'}`}>Afternoon</span>
                            <span className={`avail-chip ${has('evening') ? 'on' : 'off'}`}>Evening</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="submitted-note">
                Submitted:{' '}
                {selected.submitted
                  ? new Date(selected.submitted).toISOString().replace('T', ' ').replace('.000Z', ' UTC')
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
