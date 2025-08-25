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
import './AdminStatistics.css';
import logo from '../assets/blue-horizontal.png';
import light_mode_icon from '../assets/light_mode_blue.svg';
import dark_mode_icon from '../assets/dark_mode_blue.svg';
import Sidebar from './Sidebar';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL;


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

// --- Inline SVG icons (stroke follows currentColor) ---
const IconUser = ({ className = '', size = 18 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
       xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M20 21a8 8 0 0 0-16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
);

const IconClock = ({ className = '', size = 18 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
       xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M12 7v6l4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconFilter = ({ className = '', size = 18 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
       xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M3 6h18M7 12h10M10 18h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const IconPie = ({ className = '', size = 18 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
       xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M12 3v9h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 12a9 9 0 1 1-9-9" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
);

const IconBars = ({ className = '', size = 18 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
       xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M5 12v7M12 5v14M19 9v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const IconTrend = ({ className = '', size = 18 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
       xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M3 17l6-6 4 4 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconMoon = ({ className = '', size = 18 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
       xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconSun = ({ className = '', size = 18 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
       xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const IconChevronLeft = ({ className = '', size = 18 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
       xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
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

// De-dupe by id helper (no ?? + || mixing)
const getStableId = (item) => {
  const primary = item?.id ?? item?._id ?? item?.submissionId;
  if (primary !== undefined && primary !== null && primary !== '') return primary;

  const email = item?.email ?? '';
  const submittedLike = item?.submitted ?? item?.created_at ?? item?.createdAt ?? '';
  const composite = `${email}|${submittedLike}`;
  return composite !== '' ? composite : JSON.stringify(item);
};

const dedupeById = (arr) => {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const id = getStableId(item);
    if (!seen.has(id)) {
      seen.add(id);
      out.push(item);
    }
  }
  return out;
};


// Prefer-first helper
const pickFirst = (...vals) => vals.find(v => v !== undefined && v !== null && v !== '');

// Ensure submissions have consistent fields + canonical status
const normalizeSubmission = (s) => {
  const statusRaw = pickFirst(s.status, s.state, s.currentStatus, s.progress, s.phase);
  const submitted = pickFirst(s.submitted, s.created_at, s.createdAt, s.created, s.timestamp, s.date);
  const updated_at = pickFirst(s.updated_at, s.updatedAt, s.scheduled_at, s.scheduledAt, s.lastUpdated, s.modifiedAt);
  const pickedBy = pickFirst(s.pickedBy, s.pickedByName, s.mentor, s.advisor, s.owner, s.assignedTo, s.pickedByEmail);
  const industry = pickFirst(s.industry, s.segment, s.category, s.vertical);
  return {
    ...s,
    status: canonicalStatus(statusRaw),
    submitted,
    updated_at,
    pickedBy,
    industry,
  };
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

  // Base presentation defaults (keep)
  useEffect(() => {
    const isDark = theme === 'dark';
    ChartJS.defaults.color = isDark ? '#e5e7eb' : '#0f172a';
    ChartJS.defaults.borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    ChartJS.defaults.font.family = "'Poppins', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ChartJS.defaults.plugins.legend.position = 'bottom';
    ChartJS.defaults.plugins.legend.labels.boxWidth = 10;
    ChartJS.defaults.plugins.legend.labels.usePointStyle = true;
    ChartJS.defaults.layout = { padding: { top: 6, left: 2, right: 2, bottom: 6 } };
    ChartJS.defaults.scales = ChartJS.defaults.scales || {};
    ['category','linear'].forEach(k => {
      const c = ChartJS.defaults.scales[k] = ChartJS.defaults.scales[k] || {};
      c.grid = { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' };
      c.ticks = { padding: 6 };
    });
    ChartJS.defaults.elements.bar.borderRadius = 10;
    ChartJS.defaults.elements.line.tension = 0.35;
    ChartJS.defaults.elements.point.radius = 2.5;
    ChartJS.defaults.elements.point.hoverRadius = 5;
  }, [theme]);

  // 🎨 Theme-aware options passed PER CHART + force remount on theme change
  const chartTheme = useMemo(() => {
    const isDark = theme === 'dark';
    return {
      text: isDark ? '#e5e7eb' : '#0f172a',
      muted: isDark ? '#cbd5e1' : '#475569',
      grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      border: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
      tooltipBg: isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.98)',
      tooltipText: isDark ? '#e5e7eb' : '#0f172a',
    };
  }, [theme]);

  const commonXYOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: chartTheme.text, usePointStyle: true, boxWidth: 10 },
        },
        tooltip: {
          backgroundColor: chartTheme.tooltipBg,
          titleColor: chartTheme.tooltipText,
          bodyColor: chartTheme.tooltipText,
          borderColor: chartTheme.border,
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          grid: { color: chartTheme.grid },
          ticks: { color: chartTheme.muted },
        },
        y: {
          grid: { color: chartTheme.grid },
          ticks: { color: chartTheme.muted },
        },
      },
    }),
    [chartTheme]
  );

  const pieOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: chartTheme.text, usePointStyle: true, boxWidth: 10 },
        },
        tooltip: {
          backgroundColor: chartTheme.tooltipBg,
          titleColor: chartTheme.tooltipText,
          bodyColor: chartTheme.tooltipText,
          borderColor: chartTheme.border,
          borderWidth: 1,
        },
      },
    }),
    [chartTheme]
  );

  const [chartKey, setChartKey] = useState(0);
  useEffect(() => setChartKey(k => k + 1), [theme]);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [advisor, setAdvisor] = useState('All');
  const [statusPill, setStatusPill] = useState('All');
  const [timePreset, setTimePreset] = useState('30d');   // 'all' | '<nd>'

  // Multi-select industries
  const [industryOpen, setIndustryOpen] = useState(false);
  const [industrySelected, setIndustrySelected] = useState(() => new Set()); // empty => All
  const industryMenuRef = useRef(null);

  // 🚀 Fetch ALL submissions (including "To Do" from alternate endpoints)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);

        // Primary sources first
const primaryUrls = [
  `${BACKEND_URL}/api/admin-submissions?all=true`,
  `${BACKEND_URL}/api/admin-submissions?limit=5000`,
];

// Additional likely sources for open/unscheduled leads
const todoUrls = [
  // generic pools
  `${BACKEND_URL}/api/submissions?all=true`,
  `${BACKEND_URL}/api/leads?all=true`,
  `${BACKEND_URL}/api/pending-submissions?all=true`,
  `${BACKEND_URL}/api/incoming-submissions?all=true`,
  // status-filtered variants
  `${BACKEND_URL}/api/admin-submissions?status=todo`,
  `${BACKEND_URL}/api/admin-submissions?status=pending`,
  `${BACKEND_URL}/api/submissions?status=todo`,
  `${BACKEND_URL}/api/submissions?status=pending`,
  `${BACKEND_URL}/api/submissions?status=new`,
  `${BACKEND_URL}/api/submissions?status=to-do`,
];


        let all = [];

        // Helper to try a list of URLs
        const tryUrls = async (urls) => {
          for (const url of urls) {
            try {
              const res = await fetch(url);
              if (!res.ok) continue;
              const data = await res.json();
              if (Array.isArray(data) && data.length) {
                all = all.concat(data);
              }
            } catch {}
          }
        };

        // A) Try to get giant dumps
        await tryUrls(primaryUrls);

        // B) Paginate if needed
        if (all.length === 0) {
          const LIMIT = 200;
          let offset = 0;
          while (true) {
           const url = `${BACKEND_URL}/api/admin-submissions?offset=${offset}&limit=${LIMIT}`;

            const res = await fetch(url);
            if (!res.ok) break;
            const data = await res.json();
            if (!Array.isArray(data) || data.length === 0) break;
            all = all.concat(data);
            if (data.length < LIMIT) break;
            offset += data.length;
          }
        }

        // C) Page/limit style as fallback
        if (all.length === 0) {
          const LIMIT = 200;
          for (let page = 1; page <= 50; page++) {
           const url = `${BACKEND_URL}/api/admin-submissions?page=${page}&limit=${LIMIT}`;

            const res = await fetch(url);
            if (!res.ok) break;
            const data = await res.json();
            if (!Array.isArray(data) || data.length === 0) break;
            all = all.concat(data);
            if (data.length < LIMIT) break;
          }
        }

        // D) Base endpoint as final fallback
        if (all.length === 0) {
          try {
            const res = await fetch(`${BACKEND_URL}/api/admin-submissions`);

            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data)) all = all.concat(data);
            }
          } catch {}
        }

        // E) Now aggressively try likely "To Do" pools and merge in
        await tryUrls(todoUrls);

        // Normalize + de-dupe
        let normalized = dedupeById(all).map(normalizeSubmission);

        if (isMounted) {
          setSubmissions(normalized);

          // Debug counts in console (helps confirm "To Do" presence)
          const counts = normalized.reduce((acc, s) => {
            const c = s.status || 'To Do';
            acc[c] = (acc[c] || 0) + 1;
            return acc;
          }, {});
          console.log('[AdminStatistics] Loaded submissions:', normalized.length, counts);
        }
      } catch (err) {
        console.error('[AdminStatistics] Failed to load submissions:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Fetch mentor activity
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const tryAllUrls = [
  `${BACKEND_URL}/api/mentor-activity?all=true`,
  `${BACKEND_URL}/api/mentor-activity?limit=5000`,
];

        let all = [];
        let gotAll = false;
        for (const url of tryAllUrls) {
          try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = await res.json();
            if (Array.isArray(data) && data.length >= 1) {
              all = all;
              all = all.concat(data);
              gotAll = true;
              break;
            }
          } catch {}
        }
        if (!gotAll) {
          const LIMIT = 500;
          let offset = 0;
          while (true) {
           const url = `${BACKEND_URL}/api/mentor-activity?offset=${offset}&limit=${LIMIT}`;
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
         const res = await fetch(`${BACKEND_URL}/api/mentor-activity`);
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

  // ⏱️ Time cutoff (supports '7d', '30d', and 'all')
  const cutoffDate = useMemo(() => {
    if (timePreset === 'all') return null;
    const days = parseInt(timePreset, 10);
    if (!Number.isFinite(days)) return null;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }, [timePreset]);

  const isAllIndustries = industrySelected.size === 0;

  // 🔑 Filters (NEVER time-exclude "To Do")
  const filtered = useMemo(() => {
    const subs = submissions.filter(s => {
      const sStatus = canonicalStatus(s.status);

      if (cutoffDate && sStatus !== 'To Do') {
        const subDate = s.submitted ? new Date(s.submitted) : null;
        if (!subDate || Number.isNaN(subDate.getTime()) || subDate < cutoffDate) return false;
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
      const k = (s.industry || '').trim() || 'Unknown';
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

    // Ensure all buckets exist so "To Do" shows even if 0 after filters
    ['To Do','In Progress','Done','Canceled'].forEach(k => { if (!(k in counts)) counts[k] = 0; });

    const labels = Object.keys(counts);
    return {
      labels,
      datasets: [{ label: 'Submission Status', data: labels.map(l => counts[l]), backgroundColor: '#10b981' }]
    };
  };

  const getSubmissionTrendData = () => {
    const dateCounts = filtered.subs.reduce((acc, s) => {
      if (!s.submitted) return acc;
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
          <button className="close-btn" onClick={() => setShowModal(false)} aria-label="Close modal">&times;</button>
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

  const industryLabel = industrySelected.size === 0
    ? 'All industries'
    : `${industrySelected.size} selected`;

  return (
    <div className={`admin-page stats-page ${theme === 'dark' ? 'theme-dark' : ''}`}>
      {/* Header */}
      <header className="app-header">
        <div className="main-header">
          <div className="admin-header-left">
            <img src={logo} alt="Ummah Professionals" className="logo" />
          </div>

          <h1>Admin Statistics</h1>

          <div className="admin-header-right">
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
                <div className="filter-pill">
                  <IconUser className="icon" />
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
                  <svg className="chevron-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>

                {/* Time select */}
                <div className="filter-pill">
                  <IconClock className="icon" />
                  <select
                    className="filter-select"
                    value={timePreset}
                    onChange={(e) => setTimePreset(e.target.value)}
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="all">All time</option>
                  </select>
                  <svg className="chevron-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>

                {/* Industry multi-select dropdown */}
                <div className="filter-pill" ref={industryMenuRef}>
                  <IconFilter className="icon" />
                  <button
                    type="button"
                    className="multi-toggle"
                    onClick={() => setIndustryOpen(v => !v)}
                    aria-haspopup="true"
                    aria-expanded={industryOpen}
                  >
                    {industryLabel}
                  </button>
                  <svg className="chevron-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>

                  {industryOpen && (
                    <div className="multi-menu">
                      <div className="multi-header">Filter by industry</div>
                      <label className="multi-item">
                        <input
                          type="checkbox"
                          checked={industrySelected.size === 0}
                          onChange={() => setIndustrySelected(new Set())}
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
                    className={`status-pill ${p.value === 'All' ? 'status-pill-all' : `status-pill-${p.value.toLowerCase().replace(' ', '-')}`} ${statusPill === p.value ? 'active' : ''}`}
                    onClick={() => setStatusPill(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  className="status-pill"
                  onClick={clearFilters}
                  title="Reset all filters"
                >
                  CLEAR ALL
                </button>
              </div>
            </div>

            {/* 3) Charts */}
            <div className="side-by-side-charts">
              <div className="chart-wrapper">
                <h3 className="chart-title"><IconPie className="svg-icon" /> Top Industries</h3>
                <Pie key={`pie-${chartKey}`} data={getIndustryChartData()} options={pieOptions} />
              </div>
              <div className="chart-wrapper">
                <h3 className="chart-title"><IconBars className="svg-icon" /> Status Distribution</h3>
                <Bar key={`bar-${chartKey}`} data={getStatusBarData()} options={commonXYOptions} />
              </div>
            </div>

            <div className="chart-wrapper">
              <h3 className="chart-title"><IconTrend className="svg-icon" /> Submission Trends</h3>
              <Line key={`line-${chartKey}`} data={getSubmissionTrendData()} options={commonXYOptions} />
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
