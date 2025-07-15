// src/components/FollowUp.jsx
import React, { useState, useEffect } from 'react';
import '../App.css';
import './SchedulePage.css';
import logo from '../assets/white-horizontal.png';
import Sidebar from './Sidebar';

export default function FollowUp() {
  const [doneSubmissions, setDoneSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);

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

      <div className="content-container">
        {doneSubmissions.length === 0 ? (
          <p className="status-text">No completed meetings yet.</p>
        ) : (
          <div className="submissions-grid">
            {doneSubmissions.map((item) => (
              <div key={item.id} className="submission-card" onClick={() => setSelected(item)}>
                <div className="card-content">
                  <div className="student-info">
                    <p className="student-name">{item.name}</p>
                    <p className="student-industry">{item.industry}</p>
                    <p className="student-email">{item.email}</p>
                    <div className="availability">
                      <p><strong>Availability:</strong> {item.availability}</p>
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
          </div>
        </div>
      )}
    </div>
  );
}
