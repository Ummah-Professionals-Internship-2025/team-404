import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // for modal

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
    <div className="container">
      <h1>Monday.com Submissions</h1>

      {loading ? (
        <p>Loading...</p>
      ) : submissions.length === 0 ? (
        <p>No submissions found.</p>
      ) : (
        <div className="submissions-list">
          {submissions.map((item) => (
            <div
              key={item.id}
              className="submission-card"
              onClick={() => setSelected(item)}
              style={{ cursor: 'pointer' }}
            >
              <h3>{item.name}</h3>
              <p><strong>Availability:</strong> {item.availability}</p>
              <p><strong>Interest:</strong> {item.lookingFor}</p>
            </div>
          ))}
        </div>
      )}

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
            <p><strong>Resume:</strong> <a href={selected.resume} target="_blank">View Resume</a></p>
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
