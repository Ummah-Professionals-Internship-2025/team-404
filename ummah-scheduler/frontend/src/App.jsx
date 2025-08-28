// src/App.jsx
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './App.css';
import DashboardModal from './components/DashboardModal';
import ScheduleConfirm from "./components/ScheduleConfirm";
import FollowUp from "./components/FollowUp";
import Sidebar from './components/Sidebar';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import LoginCallback from './components/LoginCallback';
import AdminStatistics from './components/AdminStatistics';

//Logos and SVGs
import logo from './assets/white-horizontal.png'; 
import filter_icon from './assets/filter_icon.svg';
import search_icon from './assets/search_icon.svg';
import alarm_icon from './assets/alarm.svg';
import alarm_dark_icon from './assets/alarm_dark.svg';
import light_mode_icon from './assets/light_mode.svg';
import dark_mode_icon from './assets/dark_mode.svg';



function RequireAuth({ children }) {
  const navigate = useNavigate();
  useEffect(() => {
    const email = sessionStorage.getItem("mentorEmail");
    if (!email) navigate("/login");
  }, [navigate]);

  return children;
}

function Dashboard() {
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');
  const [pendingItemId, setPendingItemId] = useState(null);
  const [advisorNameInput, setAdvisorNameInput] = useState('');

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfession, setSelectedProfession] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Theme (light/dark) — persist + respect system preference on first load
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
    console.log('toggleTheme called, current theme:', theme);
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      console.log('Setting theme from', t, 'to', next);
      try { localStorage.setItem('dashboardTheme', next); } catch {}
      return next;
    });
  };

  // ⭐ NEW: UI tick every 60s so cards can become overdue while page is open
  const [, setTick] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setTick(Date.now()), 60_000);
    return () => clearInterval(i);
  }, []);

  // Keep your original fetch logic, but as a function so we can reuse it for the 5-min refresh
  const loadSubmissions = () => {
    fetch(`${BACKEND_URL}/api/submissions`) 
      .then((res) => res.json())
      .then((data) => {
        const submissionsWithDefaultStatus = data
          .map((item) => ({
            ...item,
            status: item.status || 'To Do',
          }))
          .filter((item) => item.status !== 'Done'); // ✅ Remove done items from Dashboard

        setSubmissions(submissionsWithDefaultStatus);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching submissions:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  // ⭐ NEW: background re-fetch every 5 minutes (does not change any other flow)
  useEffect(() => {
    const i = setInterval(() => {
      loadSubmissions();
    }, 300_000); // 5 minutes
    return () => clearInterval(i);
  }, []);

  // ⭐ NEW: helpers to compute overdue based ONLY on Preferred Times end date
  const parseTimelineEnd = (timeline) => {
    if (!timeline) return null;
    // normalize dashes and capture YYYY-MM-DD - YYYY-MM-DD
    const normalized = String(timeline).replace(/[–—−]/g, '-');
    const m = normalized.match(/\b(\d{4}-\d{2}-\d{2})\b\s*-\s*\b(\d{4}-\d{2}-\d{2})\b/);
    if (!m) return null;
    const end = new Date(`${m[2]}T23:59:59`); // local EOD is fine for comparison
    return isNaN(end.getTime()) ? null : end;
  };

  const isOverdue = (item) => {

        // Only flag cards that are still To Do
    // OVERDUE condition - only IF still TO DO
    /*
    const status = (item.status || 'To Do').trim().toLowerCase();
    if (status !== 'to do') return false;
    */

    // Flag ALL cards whose preferred days have passed, regardless of status
    const end = parseTimelineEnd(item.timeline);
    if (!end) return false;
    
    return new Date() > end; // overdue if current time is after preferred window end
  };
  // ─────────────────────────────────────────────────────────────

  // Escape modal by clicking escape instead of having to click X or outside
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        if (showNameModal) {
          setShowNameModal(false);
          setAdvisorNameInput('');
          setPendingItemId(null);
          setPendingStatus('');
        } else if (selected) {
          setSelected(null);
        }
      }
    };

    //event listener when either modal is open
    if (selected || showNameModal) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    //remove event listener
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [selected, showNameModal]); 

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

  
  // ── UI helpers for card formatting (matching Follow-Up style) ─────────────
  const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const renderAvailabilityChips = (value) => {
    const raw = Array.isArray(value) ? value.join(',') : String(value || '');
    const isAnytime = raw.toLowerCase().includes('anytime');
    
    return (
      <div className="wkdays wkdays--dash">
        {DAYS.map((d) => {
          const on = isAnytime || raw.toLowerCase().includes(d.toLowerCase());
          return (
            <span key={d} className={`day ${on ? 'on' : 'off'}`}>{d}</span>
          );
        })}
      </div>
    );
  };

  const splitIndustry = (val) => {
    if (!val) return { primary: '—', extra: 0 };
    if (Array.isArray(val)) return { primary: val[0] || '—', extra: Math.max(0, val.length - 1) };
    const parts = String(val).split(',').map((s) => s.trim()).filter(Boolean);
    return { primary: parts[0] || '—', extra: Math.max(0, parts.length - 1) };
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

  const initials = (name = '') => (name.trim()[0] || '').toUpperCase();

  return (
    <div className={`app-container ${theme === 'dark' ? 'theme-dark' : ''}`}>

    <header className="app-header">
      <div className="main-header">
        <div className="admin-header-left">
          <img src={logo} alt="Ummah Professionals" className="logo" />
        </div>

        <h1>Internal Scheduler Tool</h1>

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
            <Sidebar />
          </div>
        </div>
      </div>
    </header>

 
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
            onClick={() => {
              document.querySelector('.filter-pill select').click();
            }}
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
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


      <div className="content-container">
        
        {/* Column headers using same structure as cards */}
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
            <div className="header-text">PICKED BY</div>
          </div>
          <div className="dash-col-status">
            <div className="header-text">STATUS</div>
          </div>
        </div>
      </div>
      
        {loading ? (
          <p className="status-text">Loading submissions...</p>
        ) : submissions.length === 0 ? (
          <p className="status-text">No submissions found.</p>
        ) : (
          <>
            <div className="submissions-grid">

{(() => {
  // Filter submissions
  const filteredSubmissions = submissions.filter(item =>
    (!searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.industry.toLowerCase().includes(searchQuery.toLowerCase()))
    && (!selectedProfession || 
        item.industry.split(',').map(i => i.trim()).includes(selectedProfession))
    && (statusFilter === 'All' || item.status === statusFilter)
  );
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSubmissions = filteredSubmissions.slice(startIndex, endIndex);
  
  return paginatedSubmissions.map((item) => (
    <div
      key={item.id}
      className="dash-card"
      onClick={() => setSelected(item)}
      style={{ position: 'relative' }}
    >
      <div className="card-content">
        {/* Left column: Name, Email, and Overdue badge */}
        <div className="dash-col-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
            <div>
              <div className="dash-name">{item.name}</div>
              <div className="dash-email">{item.email}</div>
            </div>

            {/* Overdue badge positioned next to name/email */}
            {isOverdue(item) && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  animation: 'overduePulse 1.9s infinite',
                  marginLeft: '1px',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <img src={theme === 'dark' ? alarm_dark_icon :alarm_icon} 
                  alt="Alarm" 
                  width="34" 
                  height="34" 
                  style={{ flexShrink: 0 }} 
                  />
                
              </div>
            )}
          </div>
        </div>

        {/* Availability column */}
        <div className="dash-col-avail">
          {renderAvailabilityChips(item.availability)}
        </div>

        {/* Industry column */}
        <div className="dash-col-industry">{renderIndustryPills(item.industry)}</div>

        {/* Picked by column */}
        <div className="dash-col-picked">
          {item.pickedBy ? (
            <div className="picker-name">{item.pickedBy}</div>
          ) : (
            <div className="picker-name-empty"> </div>
          )}
        </div>

        {/* Status column */}
        <div className="dash-col-status">
          {(() => {
            console.log('Current theme:', theme, 'Status:', item.status, 'Theme class:', theme === 'dark' ? 'theme-dark' : 'theme-light');
            const statusStyles = theme === 'dark' ? {
              'Done': { backgroundColor: '#0f2f22', color: '#86efac' },
              'In Progress': { backgroundColor: '#20190b', color: '#f8d473' },
              'To Do': { backgroundColor: '#172a3a', color: '#7dd3fc' },
              'Canceled': { backgroundColor: '#2b2f36', color: '#a9b1ba' },
            } : {
              'Done': { backgroundColor: '#DCFEE7', color: '#17803D' },
              'In Progress': { backgroundColor: '#FEF9C3', color: '#92400D' },
              'To Do': { backgroundColor: '#DBE9FE', color: '#1D40B0' },
              'Canceled': { backgroundColor: '#EDF2F6', color: '#595F69' },
            };
            const currentStyle = statusStyles[item.status] || statusStyles['To Do'];
            return (
              <div 
                className={`status-tag ${theme === 'dark' ? 'theme-dark' : ''}`}
                style={theme === 'dark' ? {} : { backgroundColor: currentStyle.backgroundColor, color: currentStyle.color }}
                data-status={item.status || 'To Do'}
                title={`Theme: ${theme}, Status: ${item.status}`}
              >
                {item.status || 'No Status'}
              </div>
            );
          })()}
        </div>


      </div>
    </div>
  ));
})()}
            </div>
            
            {/* Pagination */}
            {(() => {
              const filteredSubmissions = submissions.filter(item =>
                (!searchQuery ||
                  item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.industry.toLowerCase().includes(searchQuery.toLowerCase()))
                && (!selectedProfession || item.industry === selectedProfession)
                && (statusFilter === 'All' || item.status === statusFilter)
              );
              const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
              
              if (totalPages <= 1) return null;
              
              return (
                <div className="pagination">
                  <button 
                    className="pagination-btn"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    First
                  </button>
                                     <button 
                     className="pagination-btn pagination-nav"
                     onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                     disabled={currentPage === 1}
                   >
                     <span className="arrow left">←</span>
                   </button>
                  
                                     {(() => {
                     // Calculate the sliding window of 5 pages
                     let startPage = Math.max(1, currentPage - 2);
                     let endPage = Math.min(totalPages, startPage + 4);
                     
                     // Adjust if we're near the end
                     if (endPage - startPage < 4) {
                       startPage = Math.max(1, endPage - 4);
                     }
                     
                     const pages = [];
                     for (let i = startPage; i <= endPage; i++) {
                       pages.push(i);
                     }
                     
                     return pages.map(page => (
                       <button
                         key={page}
                         className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                         onClick={() => setCurrentPage(page)}
                       >
                         {page}
                       </button>
                     ));
                   })()}
                  
                                     <button 
                     className="pagination-btn pagination-nav"
                     onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                     disabled={currentPage === totalPages}
                   >
                     <span className="arrow right">→</span>
                   </button>
                  <button 
                    className="pagination-btn"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Last
                  </button>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {selected && (
        <div className="dashboard-modal-overlay" onClick={() => setSelected(null)}>
          <DashboardModal
            student={selected}
            onClose={() => setSelected(null)}
            statusValue={selected.status || ''}
            theme={theme}
            onChangeStatus={(newStatus) => {
              if (newStatus === 'In Progress' || newStatus === 'Done') {
                setPendingStatus(newStatus);
                setPendingItemId(selected.id);
                setShowNameModal(true);
              } else {
                setSelected((prev) => ({ ...prev, status: newStatus }));
                setSubmissions((prev) => prev.map((s) => s.id === selected.id ? { ...s, status: newStatus } : s));
              }
            }}
          />
        </div>
      )}

      {showNameModal && (
        <div className="dashboard-modal-overlay" onClick={() => setShowNameModal(false)}>
          <div className={`modal-content name-modal ${theme === 'dark' ? 'theme-dark' : ''}`} onClick={(e) => e.stopPropagation()}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!advisorNameInput.trim()) return;

                const pickedByName = advisorNameInput.trim();

                setSubmissions((prev) =>
                  prev.map((s) =>
                    s.id === pendingItemId
                      ? { ...s, status: pendingStatus, pickedBy: pickedByName }
                      : s
                  )
                );

                setSelected((prev) =>
                  prev && prev.id === pendingItemId
                    ? { ...prev, status: pendingStatus, pickedBy: pickedByName }
                    : prev
                );

                // ✅ Save to backend
                const fullStudent = submissions.find(s => s.id === pendingItemId);

                fetch(`${BACKEND_URL}/api/save-status`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: pendingItemId,
                    status: pendingStatus,
                    pickedBy: pickedByName,
                    name: fullStudent?.name || "",
                    email: fullStudent?.email || "",
                    phone: fullStudent?.phone || "",
                    industry: fullStudent?.industry || "",
                    academicStanding: fullStudent?.academicStanding || "",
                    lookingFor: fullStudent?.lookingFor || "",
                    resume: fullStudent?.resume || "",
                    howTheyHeard: fullStudent?.howTheyHeard || "",
                    availability: fullStudent?.availability || "",
                    timeline: fullStudent?.timeline || "",
                    otherInfo: fullStudent?.otherInfo || "",
                    submitted: fullStudent?.submitted || ""
                  }),
                }).catch(err => console.error("Error saving status:", err));

                setShowNameModal(false);
                setAdvisorNameInput('');
                setPendingItemId(null);
                setPendingStatus('');
              }}
            >
              <h3>Enter Your Name</h3>
              <input
                type="text"
                value={advisorNameInput}
                onChange={(e) => setAdvisorNameInput(e.target.value)}
                placeholder="Advisor name"
                className="name-input"
                autoFocus
              />
              <div className="name-modal-buttons">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowNameModal(false);
                    setAdvisorNameInput('');
                    setPendingItemId(null);
                    setPendingStatus('');
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="confirm-btn">
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const location = useLocation();
  

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/login/callback" element={<LoginCallback />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route path="/schedule-confirm" element={<ScheduleConfirm />} />
        <Route
          path="/followup"
          element={
            <RequireAuth>
              <FollowUp />
            </RequireAuth>
          }
        />
        
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/admin-statistics" element={<AdminStatistics />} />
      </Routes>
    </>
  );
}
