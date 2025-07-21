// src/App.jsx
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SchedulePage from './components/SchedulePage';
import './App.css';
import ScheduleConfirm from "./components/ScheduleConfirm";
import logo from './assets/white-horizontal.png'; 
import FollowUp from "./components/FollowUp";
import Sidebar from './components/Sidebar';

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


  useEffect(() => {
    fetch('http://localhost:5050/api/submissions')
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
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
  <img src={logo} alt="Ummah Professionals" className="logo" />
  <h1>Internal Scheduler Tool</h1>
  <Sidebar />
</header>

  <div className="filter-controls">
    <input
      type="text"
      placeholder="Search by name or profession..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="search-bar"
    />
    <select
      value={selectedProfession}
      onChange={(e) => setSelectedProfession(e.target.value)}
      className="dropdown-filter"
    >
      <option value="">All Professions</option>
      {[...new Set(submissions.map((s) => s.industry).filter(Boolean))].map((industry) => (
        <option key={industry} value={industry}>
          {industry}
        </option>
      ))}
    </select>
  </div>


      <div className="content-container">
        {loading ? (
          <p className="status-text">Loading submissions...</p>
        ) : submissions.length === 0 ? (
          <p className="status-text">No submissions found.</p>
        ) : (
          <div className="submissions-grid">
            {submissions
              .filter(item =>
                (!searchQuery ||
                  item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.industry.toLowerCase().includes(searchQuery.toLowerCase()))
                && (!selectedProfession || item.industry === selectedProfession)
              )
              .map((item) => (

              <div
                key={item.id}
                className="submission-card"
                onClick={() => setSelected(item)}
              >
                <div className="card-content">
                  <div className="student-info">
                    <p className="student-name">{item.name}</p>
                    <p className="student-industry">{item.industry}</p>
                    <p className="student-email">{item.email}</p>
                    <div className="availability">
                      <p><strong>Availability:</strong> {item.availability}</p>
                    </div>
                  </div>

                  {(() => {
                    const statusStyles = {
                      'Done': {
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                      },
                      'In Progress': {
                        backgroundColor: '#fef9c3',
                        color: '#92400e',
                      },
                      'To Do': {
                        backgroundColor: '#e0e7ff',
                        color: '#1e40af',
                      },
                    };

                    const currentStyle = statusStyles[item.status] || statusStyles['To Do'];

                    return (
                      <div style={{ width: '100px', textAlign: 'center' }}>
                        <div
                          className="status-tag"
                          style={{
                            backgroundColor: currentStyle.backgroundColor,
                            color: currentStyle.color,
                            padding: '4px 8px',
                            borderRadius: '8px',
                            fontWeight: '500',
                            marginBottom: '4px',
                          }}
                        >
                          {item.status || 'No Status'}
                        </div>

                        {item.pickedBy && (
                          <div style={{ fontSize: '0.8rem', color: '#555' }}>
                            Picked by: {item.pickedBy}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelected(null)}>&times;</button>
            <h2>{selected.name}</h2>
            <p><strong>Email:</strong> {selected.email}</p>
            <p><strong>Phone:</strong> {selected.phone}</p>
            <p><strong>Industry:</strong> {selected.industry}</p>
            <p><strong>Academic Standing:</strong> {selected.academicStanding}</p>
            <p><strong>Looking For:</strong> {selected.lookingFor}</p>
            <p><strong>Resume:</strong> <a href={selected.resume} target="_blank" rel="noreferrer">View Resume</a></p>
            <p><strong>How They Heard:</strong> {selected.howTheyHeard}</p>
            <p><strong>Weekly Availability:</strong> {selected.availability}</p>
            <p><strong>Preferred Times:</strong> {selected.timeline}</p>
            <p><strong>Other Info:</strong> {selected.otherInfo}</p>
            <p><strong>Submitted:</strong> {selected.submitted}</p>

            <div className="modal-buttons">
              <div className="status-dropdown">
                <label htmlFor="status-select">Status:</label>
                <select
                  id="status-select"
                  value={selected.status || ''}
                  onChange={(e) => {
                    const newStatus = e.target.value;

                    if (newStatus === 'In Progress' || newStatus === 'Done') {
                      setPendingStatus(newStatus);
                      setPendingItemId(selected.id);
                      setShowNameModal(true); // show modal to collect advisor name
                    } else {
                      setSelected((prev) => ({ ...prev, status: newStatus }));
                      setSubmissions((prev) =>
                        prev.map((s) =>
                          s.id === selected.id ? { ...s, status: newStatus } : s
                        )
                      );
                    }
                  }}
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              <button
                className="propose-btn"
                onClick={() => {
                  setSelected(null);
                  navigate(`/schedule/${selected.id}`);
                }}
              >
                Propose Meeting
              </button>
            </div>
          </div>
        </div>
      )}

      {showNameModal && (
        <div className="modal-overlay" onClick={() => setShowNameModal(false)}>
          <div className="modal-content name-modal" onClick={(e) => e.stopPropagation()}>
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

                  fetch('http://localhost:5050/api/save-status', {
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
              <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Enter Your Name</h3>
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
  return (
    <>
    <Sidebar />
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/schedule/:id" element={<SchedulePage />} />
      <Route path="/schedule-confirm" element={<ScheduleConfirm />} />
      <Route path="/followup" element={<FollowUp />} />
    </Routes>
    </>
  );
}
