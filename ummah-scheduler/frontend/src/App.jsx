import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5050/api/submissions') // Flask route to fetch submissions
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
            <div className="submission-card" key={item.id}>
              <h3>{item.name}</h3>
              <p><strong>Email:</strong> {item.email}</p>
              <p><strong>Phone:</strong> {item.phone}</p>
              <p><strong>Industry:</strong> {item.industry}</p>
              <p><strong>Academic Standing:</strong> {item.academicStanding}</p>
              <p><strong>Looking For:</strong> {item.lookingFor}</p>
              <p><strong>Resume:</strong> <a href={item.resume} target="_blank">View Resume</a></p>
              <p><strong>How They Heard:</strong> {item.howTheyHeard}</p>
              <p><strong>Weekly Availability:</strong> {item.availability}</p>
              <p><strong>Preferred Times:</strong> {item.timeline}</p>
              <p><strong>Other Info:</strong> {item.otherInfo}</p>
              <p><strong>Submitted:</strong> {item.submitted}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
