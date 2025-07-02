import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5050/api/submissions')
      .then((res) => res.json())
      .then((data) => {
        setSubmissions(data);
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
        <img src="/logo.png" alt="Ummah Professionals" className="logo" />
        <h1>Internal Scheduler Tool</h1>
      </header>

      <div className="content-container">
        {loading ? (
          <p className="status-text">Loading submissions...</p>
        ) : submissions.length === 0 ? (
          <p className="status-text">No submissions found.</p>
        ) : (
          <div className="submissions-grid">
            {submissions.map((item) => (
              <div
                key={item.id}
                className="submission-card"
                onClick={() => setSelected(item)}
              >
                <div className="student-info">
                  <p className="student-name">{item.name}</p>
                  <p className="student-industry">{item.industry}</p>
                  <p className="student-email">{item.email}</p>
                </div>
                <div className="availability">
                  <p><strong>Availability:</strong> {item.availability}</p>
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
            <button className="propose-btn">Propose Meeting</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
