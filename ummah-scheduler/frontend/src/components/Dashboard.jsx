import { useEffect, useState } from 'react';

function Dashboard() {
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/submissions')
      .then(res => res.json())
      .then(data => setSubmissions(data));
  }, []);

  return (
    <div>
      <h1>Monday.com Form Submissions</h1>
      <ul>
        {submissions.map(item => (
          <li key={item.id}>
            <strong>{item.name}</strong> — Submitted on {item.created_at}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Dashboard;
