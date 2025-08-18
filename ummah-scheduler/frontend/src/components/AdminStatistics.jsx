// src/components/AdminStatistics.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pie, Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';
import './AdminStatistics.css';              // page-specific CSS
import logo from '../assets/blue-horizontal.png';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

// 🔧 Normalize status variants (same map as Dashboard)
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

// De-dupe by id helper
const dedupeById = (arr) => {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const id = item?.id ?? item?._id ?? JSON.stringify(item);
    if (!seen.has(id)) {
      seen.add(id);
      out.push(item);
    }
  }
  return out;
};

export default function AdminStatistics() {
  const [submissions, setSubmissions] = useState([]);
  const [mentorActivity, setMentorActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedMetric, setSelectedMetric] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // ── Theme (sync with dashboard) ─────────────────────────────────────────────
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
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('adminTheme', next); } catch {}
      return next;
    });
  };

  useEffect(() => {
    ChartJS.defaults.color = theme === 'dark' ? '#e5e7eb' : '#0f172a';
    ChartJS.defaults.borderColor = theme === 'dark'
      ? 'rgba(255,255,255,0.15)'
      : 'rgba(0,0,0,0.08)';
  }, [theme]);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [advisor, setAdvisor] = useState('All');
  const [statusPill, setStatusPill] = useState('All');
  const [timePreset, setTimePreset] = useState('30d');   // 'all' | '30d'

  // Multi-select industries
  const [industryOpen, setIndustryOpen] = useState(false);
  const [industrySelected, setIndustrySelected] = useState(() => new Set()); // empty => All
  const industryMenuRef = useRef(null);

  // 🚀 Fetch ALL submissions (work around any backend default limit)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);

        // Strategy A: ask backend for ALL explicitly
        // (common patterns: ?all=true, ?limit=5000)
        const tryAllUrls = [
          'http://localhost:5050/api/admin-submissions?all=true',
          'http://localhost:5050/api/admin-submissions?limit=5000',
        ];

        let all = [];
        let gotAll = false;

        for (const url of tryAllUrls) {
          try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = await res.json();
            if (Array.isArray(data) && data.length >= 1) {
              all = data;
              gotAll = true;
              break;
            }
          } catch {}
        }

        // Strategy B: paginate by offset/limit
        if (!gotAll) {
          const LIMIT = 200;
          let offset = 0;
          while (true) {
            const url = `http://localhost:5050/api/admin-submissions?offset=${offset}&limit=${LIMIT}`;
            const res = await fetch(url);
            if (!res.ok) break;
            const data = await res.json();
            if (!Array.isArray(data) || data.length === 0) break;
            all = all.concat(data);
            if (data.length < LIMIT) break; // last page
            offset += data.length;
          }
        }

        // Strategy C: paginate by page/limit
        if (all.length === 0) {
          const LIMIT = 200;
          for (let page = 1; page <= 50; page++) {
            const url = `http://localhost:5050/api/admin-submissions?page=${page}&limit=${LIMIT}`;
            const res = await fetch(url);
            if (!res.ok) break;
            const data = await res.json();
            if (!Array.isArray(data) || data.length === 0) break;
            all = all.concat(data);
            if (data.length < LIMIT) break;
          }
        }

        // Strategy D: final fallback to the base endpoint (maybe already returns all)
        if (all.length === 0) {
          const res = await fetch('http://localhost:5050/api/admin-submissions');
          const data = await res.json();
          if (Array.isArray(data)) all = data;
        }

        // De-dupe and set
        all = dedupeById(all);

        if (isMounted) {
          setSubmissions(all);
          // Debug: status counts & total
          const counts = all.reduce((acc, s) => {
            const c = canonicalStatus(s.status);
            acc[c] = (acc[c] || 0) + 1;
            return acc;
          }, {});
          console.log('[AdminStatistics] Loaded submissions:', all.length, counts);
        }
      } catch (err) {
        console.error('[AdminStatistics] Failed to load submissions:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // (Optional) Try to fetch all mentor activity, too (same idea)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const tryAllUrls = [
          'http://localhost:5050/api/mentor-activity?all=true',
          'http://localhost:5050/api/mentor-activity?limit=5000',
        ];
        let all = [];
        let gotAll = false;
        for (const url of tryAllUrls) {
          try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = await res.json();
            if (Array.isArray(data) && data.length >= 1) {
              all = data;
              gotAll = true;
              break;
            }
          } catch {}
        }
        if (!gotAll) {
          const LIMIT = 500;
          let offset = 0;
          while (true) {
            const url = `http://localhost:5050/api/mentor-activity?offset=${offset}&limit=${LIMIT}`;
            const res = await fetch(url);
            if (!res.ok) break;
            const data = await res.json();
            if (!Array.isArray(data) || data.length === 0) break;
            all = all.concat(data);
            if (data.length < LIMIT) break;
            offset += data.length;
          }
        }
        if (all.length === 0) {
          const res = await fetch('http://localhost:5050/api/mentor-activity');
          const data = await res.json();
          if (Array.isArray(data)) all = data;
        }
        all = dedupeById(all);
        if (isMounted) {
          setMentorActivity(all);
          console.log('[AdminStatistics] Loaded activity:', all.length);
        }
      } catch (err) {
        console.error('[AdminStatistics] Failed to load mentor activity:', err);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!industryMenuRef.current) return;
      if (!industryMenuRef.current.contains(e.target)) setIndustryOpen(false);
    };
    if (industryOpen) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [industryOpen]);

  const advisorOptions = useMemo(() => {
    const set = new Set(submissions.map(s => (s.pickedBy || '').trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [submissions]);

  const allIndustries = useMemo(() => {
    const set = new Set(submissions.map(s => (s.industry || '').trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [submissions]);

  const stringIncludes = (haystack, needle) =>
    (haystack || '').toLowerCase().includes((needle || '').toLowerCase());

  const cutoffDate = useMemo(() => {
    if (timePreset === 'all') return null;
    const d = new Date();
    if (timePreset === '30d') d.setDate(d.getDate() - 30);
    return d;
  }, [timePreset]);

  const isAllIndustries = industrySelected.size === 0;

  // 🔑 Ensure "All time" shows literally everything; time window never excludes "To Do"
  const filtered = useMemo(() => {
    const subs = submissions.filter(s => {
      const sStatus = canonicalStatus(s.status);

      if (cutoffDate && sStatus !== 'To Do') {
        if (s.submitted) {
          const d = new Date(s.submitted);
          if (!Number.isNaN(d.getTime()) && d < cutoffDate) return false;
        } else {
          return false;
        }
      }

      if (advisor !== 'All' && (s.pickedBy || '').trim() !== advisor) return false;

      if (statusPill !== 'All' && sStatus !== canonicalStatus(statusPill)) return false;

      const ind = (s.industry || '').trim();
      if (!isAllIndustries && !industrySelected.has(ind)) return false;

      if (search) {
        const fields = [
          s.name, s.email, s.phone, s.industry, s.howTheyHeard,
          s.availability, s.timeline, s.otherInfo, s.pickedBy
        ];
        if (!fields.some(f => stringIncludes(f, search))) return false;
      }
      return true;
    });

    const activity = mentorActivity.filter(a => {
      if (cutoffDate) {
        const d = a.timestamp ? new Date(a.timestamp) : null;
        if (!d || Number.isNaN(d.getTime()) || d < cutoffDate) return false;
      }
      if (advisor !== 'All' && (a.email || '').trim() !== advisor) return false;
      if (statusPill === 'In Progress' && a.action !== 'propose') return false;
      if (statusPill === 'Canceled' && a.action !== 'cancel') return false;
      if (search) {
        if (!['email', 'action', 'details'].some(k => stringIncludes(a[k], search))) return false;
      }
      return true;
    });

    return { subs, activity };
  }, [submissions, mentorActivity, advisor, statusPill, industrySelected, isAllIndustries, search, cutoffDate]);

  // Metrics
  const metrics = useMemo(() => {
    const total = filtered.subs.length;
    const scheduled = filtered.activity.filter(a => a.action === 'propose').length;
    const canceled = filtered.subs.filter(s => canonicalStatus(s.status) === 'Canceled').length;
    const advisors = new Set(filtered.subs.map(s => s.pickedBy).filter(Boolean)).size;

    const times = filtered.subs
      .filter(s => s.submitted && s.updated_at)
      .map(s => new Date(s.updated_at) - new Date(s.submitted))
      .filter(t => !Number.isNaN(t));

    const avgDays = times.length
      ? (times.reduce((a, b) => a + b, 0) / times.length / (1000 * 60 * 60 * 24)).toFixed(1)
      : 'N/A';

    return { total, scheduled, canceled, advisors, avgDays };
  }, [filtered]);

  // Charts
  const getIndustryChartData = () => {
    const counts = filtered.subs.reduce((acc, s) => {
      const k = (s.industry || '').trim();
      if (!k) return acc;
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top5 = entries.slice(0, 5);
    const other = entries.slice(5).reduce((sum, [, n]) => sum + n, 0);
    if (other > 0) top5.push(['Other', other]);

    return {
      labels: top5.map(([k]) => k),
      datasets: [{ data: top5.map(([, n]) => n), backgroundColor: ['#3b82f6','#10b981','#f59e0b','#ef4444','#6366f1','#9ca3af'] }]
    };
  };

  const getStatusBarData = () => {
    const counts = filtered.subs.reduce((acc, s) => {
      const c = canonicalStatus(s.status);
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {});
    const labels = Object.keys(counts);
    return {
      labels,
      datasets: [{ label: 'Submission Status', data: labels.map(l => counts[l]), backgroundColor: '#10b981' }]
    };
  };

  const getSubmissionTrendData = () => {
    const dateCounts = filtered.subs.reduce((acc, s) => {
      if (!s.submitted) return acc; // items without a date won't chart (intended)
      const d = new Date(s.submitted);
      if (Number.isNaN(d.getTime())) return acc;
      const key = d.toLocaleDateString();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const labels = Object.keys(dateCounts).sort((a, b) => new Date(a) - new Date(b));
    return {
      labels,
      datasets: [{ label: 'Submissions', data: labels.map(k => dateCounts[k]), fill: false, borderColor: '#3b82f6', backgroundColor: '#3b82f6', tension: 0.3 }]
    };
  };

  // Modal content
  const renderModalContent = () => {
    if (!selectedMetric) return null;
    let content = null;

    switch (selectedMetric) {
      case 'submissions':
        content = filtered.subs.map((s, i) => (
          <p key={i}>{s.name} – {s.email} – {s.phone}</p>
        ));
        break;
      case 'proposed':
        content = filtered.activity
          .filter(e => e.action === 'propose')
          .map((e, i) => (
            <p key={i}>
              {e.email} has proposed a meeting {e.details} – {new Date(e.timestamp).toLocaleString()}
            </p>
          ));
        break;
      case 'canceled':
        content = filtered.subs
          .filter(s => canonicalStatus(s.status) === 'Canceled')
          .map((s, i) => (
            <p key={i}>
              {(s.pickedByEmail || s.pickedBy || 'Unknown mentor')} canceled a meeting with {s.name} – {s.email} – {s.phone}
            </p>
          ));
        break;
      case 'advisors': {
        const uniq = [...new Set(filtered.subs.map(s => s.pickedBy).filter(Boolean))];
        content = uniq.map((a, i) => <p key={i}>{a}</p>);
        break;
      }
      case 'avgDays':
        content = filtered.subs
          .filter(s => s.submitted && s.updated_at)
          .map((s, i) => (
            <p key={i}>
              {s.name} – submitted: {new Date(s.submitted).toLocaleDateString()} → scheduled: {new Date(s.updated_at).toLocaleDateString()}
            </p>
          ));
        break;
      default:
        content = <p>No data available</p>;
    }

    return (
      <div className="modal-overlay" onClick={() => setShowModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
          <h2 style={{ marginBottom: '16px' }}>{selectedMetric.toUpperCase()}</h2>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>{content}</div>
        </div>
      </div>
    );
  };

  const clearFilters = () => {
    setSearch('');
    setAdvisor('All');
    setStatusPill('All');
    setTimePreset('30d');
    setIndustrySelected(new Set());
  };

  const industryLabel = isAllIndustries
    ? 'All industries'
    : `${industrySelected.size} selected`;

  return (
    <div className={`admin-page stats-page ${theme === 'dark' ? 'theme-dark' : ''}`}>
      {/* Header */}
      <header className="admin-header stats-hero">
        <div className="admin-header-left">
          <img src={logo} alt="Logo" className="admin-logo" />
        </div>
        <h1 className="stats-hero-title">ADMIN STATISTICS</h1>
        <div className="admin-header-right">
          <button
            className="theme-toggle"
            aria-label="Toggle dark mode"
            aria-pressed={theme === 'dark'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <a href="/admin-dashboard" className="stats-btn">← Back to Dashboard</a>
        </div>
      </header>

      <div className="dashboard-content">
        {loading ? (
          <p className="dashboard-status-text">Loading statistics...</p>
        ) : (
          <>
            {/* 1) KPI cards at the very top */}
            <div className="card-grid">
              <div className="stat-card" onClick={() => { setSelectedMetric('submissions'); setShowModal(true); }}>
                <strong>Total Submissions:</strong> {metrics.total}
              </div>
              <div className="stat-card" onClick={() => { setSelectedMetric('proposed'); setShowModal(true); }}>
                <strong>Meetings Proposed:</strong> {metrics.scheduled}
              </div>
              <div className="stat-card" onClick={() => { setSelectedMetric('canceled'); setShowModal(true); }}>
                <strong>Meetings Canceled:</strong> {metrics.canceled}
              </div>
              <div className="stat-card" onClick={() => { setSelectedMetric('advisors'); setShowModal(true); }}>
                <strong>Advisors:</strong> {metrics.advisors}
              </div>
              <div className="stat-card" onClick={() => { setSelectedMetric('avgDays'); setShowModal(true); }}>
                <strong>Avg Days to Schedule:</strong> {metrics.avgDays}
              </div>
            </div>

            {/* 2) Filters ABOVE the charts */}
            <div className="admin-toolbar stats-toolbar">
              <div className="toolbar-left">


                {/* Advisor type-ahead */}
                <div className="filter-chip">
                  <span className="icon">👤</span>
                  <input
                    list="advisor-list"
                    className="filter-select"
                    placeholder="Advisor (type to filter)"
                    value={advisor === 'All' ? '' : advisor}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      setAdvisor(v === '' ? 'All' : v);
                    }}
                    onBlur={(e) => { if (e.target.value.trim() === '') setAdvisor('All'); }}
                  />
                  <datalist id="advisor-list">
                    {advisorOptions.map(opt => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>

                {/* Time select */}
                <div className="filter-chip">
                  <span className="icon">🕒</span>
                  <select
                    className="filter-select"
                    value={timePreset}
                    onChange={(e) => setTimePreset(e.target.value)}
                  >
                    <option value="30d">Last 30 days</option>
                    <option value="all">All time</option>
                  </select>
                  <span className="chev">▾</span>
                </div>

                {/* Industry multi-select dropdown */}
                <div className="filter-chip" ref={industryMenuRef}>
                  <span className="icon">⛃</span>
                  <button
                    type="button"
                    className="multi-toggle"
                    onClick={() => setIndustryOpen(v => !v)}
                    aria-haspopup="true"
                    aria-expanded={industryOpen}
                  >
                    {industryLabel} <span className="chev">▾</span>
                  </button>

                  {industryOpen && (
                    <div className="multi-menu">
                      <div className="multi-header">Filter by industry</div>
                      <label className="multi-item">
                        <input
                          type="checkbox"
                          checked={isAllIndustries}
                          onChange={(e) => (e.target.checked
                            ? setIndustrySelected(new Set())
                            : setIndustrySelected(new Set())
                          )}
                        />
                        <span>All industries</span>
                      </label>

                      <div className="multi-scroll">
                        {allIndustries.length === 0 ? (
                          <div className="multi-empty">No industries found</div>
                        ) : (
                          allIndustries.map(ind => (
                            <label key={ind} className="multi-item">
                              <input
                                type="checkbox"
                                checked={industrySelected.has(ind)}
                                onChange={() => {
                                  setIndustrySelected(prev => {
                                    const next = new Set(prev);
                                    if (next.has(ind)) next.delete(ind);
                                    else next.add(ind);
                                    return next;
                                  });
                                }}
                              />
                              <span>{ind}</span>
                            </label>
                          ))
                        )}
                      </div>

                      <div className="multi-actions">
                        <button className="btn delete ghost" onClick={() => setIndustrySelected(new Set())}>Clear</button>
                        <button className="btn message solid" onClick={() => setIndustryOpen(false)}>Done</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status pill bar */}
              <div className="pill-bar">
                {[
                  { label: 'ALL', value: 'All' },
                  { label: 'TO DO', value: 'To Do' },
                  { label: 'IN PROGRESS', value: 'In Progress' },
                  { label: 'DONE', value: 'Done' },
                  { label: 'CANCELED', value: 'Canceled' },
                ].map(p => (
                  <button
                    key={p.value}
                    className={`pill ${statusPill === p.value ? 'active' : ''}`}
                    onClick={() => setStatusPill(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  className="pill clear"
                  onClick={clearFilters}
                  title="Reset all filters"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* 3) Charts */}
            <div className="side-by-side-charts">
              <div className="chart-wrapper">
                <h3>Top Industries</h3>
                <Pie data={getIndustryChartData()} />
              </div>
              <div className="chart-wrapper">
                <h3>Status Distribution</h3>
                <Bar data={getStatusBarData()} />
              </div>
            </div>

            <div className="chart-wrapper">
              <h3>Submission Trends</h3>
              <Line data={getSubmissionTrendData()} />
            </div>

            {/* 4) Activity Center */}
            <h2 className="section-title">Activity Center</h2>
            <div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.activity.map((entry, index) => {
                    const base = entry.email;
                    const action = entry.action;
                    const details = entry.details ? ` ${entry.details}` : '';
                    let description = '';
                    switch (action) {
                      case 'login': description = `${base} has logged in`; break;
                      case 'propose': description = `${base} has proposed a meeting${details}`; break;
                      case 'cancel': description = `${base} has canceled a meeting${details}`; break;
                      case 'message': description = `${base} has sent a message${details}`; break;
                      default: description = `${base} performed ${action}${details}`;
                    }
                    return (
                      <tr key={index}>
                        <td>{description}</td>
                        <td>{new Date(entry.timestamp).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {showModal && renderModalContent()}
          </>
        )}
      </div>
    </div>
  );
}
