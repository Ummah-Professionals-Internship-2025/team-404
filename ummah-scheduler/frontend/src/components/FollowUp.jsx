// src/components/FollowUp.jsx
import React, { useState, useEffect } from 'react';
import '../App.css';
import './SchedulePage.css';
import logo from '../assets/white-horizontal.png';
import Sidebar from './Sidebar';
import { useNavigate } from 'react-router-dom';

export default function FollowUp() {
  const [doneSubmissions, setDoneSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfession, setSelectedProfession] = useState('');
  const navigate = useNavigate();



  useEffect(() => {
    fetch('http://localhost:5050/api/followup')
      .then(res => res.json())
      .then(data => setDoneSubmissions(data))
      .catch(err => console.error("Error fetching follow-ups:", err));
  }, []);

  return (
    <div className="app-container">
       <header className="app-header">
        <img src={logo} alt="Ummah Professionals" className="logo" />
        <h1>Follow Up With a Student</h1>
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
            {[...new Set(doneSubmissions.map((s) => s.industry).filter(Boolean))].map((industry) => (
            <option key={industry} value={industry}>
                {industry}
            </option>
            ))}
        </select>
        </div>


      <div className="content-container">
        {doneSubmissions.length === 0 ? (
          <p className="status-text">No completed meetings yet.</p>
        ) : (
          <div className="submissions-grid">
            {doneSubmissions
                .filter(item =>
                    (!searchQuery ||
                    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.industry.toLowerCase().includes(searchQuery.toLowerCase()))
                    && (!selectedProfession || item.industry === selectedProfession)
                )
                .map((item) => (

              <div key={item.id} className="submission-card" onClick={() => setSelected(item)}>
                <div className="card-content">
                  <div className="student-info">
  <p className="student-name">{item.name}</p>
  <p className="student-industry">{item.industry}</p>
  <p className="student-email">{item.email}</p>
  <div className="availability">
    <p><strong>Availability:</strong> {item.availability}</p>
  </div>
  <div style={{ marginTop: '8px' }}>
    <span
      style={{
        backgroundColor: '#dcfce7',
        color: '#15803d',
        padding: '4px 8px',
        borderRadius: '8px',
        fontWeight: '500'
      }}
    >
      Done
    </span>
    {item.pickedBy && (
      <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '4px' }}>
        Picked by: {item.pickedBy}
      </div>
    )}
  </div>
</div>

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
            <button
            className="propose-btn"
            onClick={() => {
                sessionStorage.setItem("studentId", selected.id);
                navigate(`/followup-schedule/${selected.id}`);
            }}
            >
            Propose Follow-Up
            </button>


            <button className="message-btn" onClick={() => alert("Coming soon!")}>
                Send a Message
            </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
