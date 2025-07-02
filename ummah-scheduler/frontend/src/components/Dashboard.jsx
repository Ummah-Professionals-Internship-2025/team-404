// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5050/api/submissions')
      .then(res => res.json())
      .then(data => setSubmissions(data));
  }, []);

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Monday.com Submissions</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {submissions.map(sub => (
          <div
            key={sub.id}
            className="bg-white p-4 rounded-xl shadow cursor-pointer hover:ring-2"
            onClick={() => setSelected(sub)}
          >
            <h2 className="text-xl font-semibold mb-1">{sub.name}</h2>
            <p><strong>Availability:</strong> {sub.availability}</p>
            <p><strong>Interest:</strong> {sub.lookingFor}</p>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4">{selected.name}</h2>
            <p><strong>Email:</strong> {selected.email}</p>
            <p><strong>Phone:</strong> {selected.phone}</p>
            <p><strong>Industry:</strong> {selected.industry}</p>
            <p><strong>Academic Standing:</strong> {selected.academicStanding}</p>
            <p><strong>Looking For:</strong> {selected.lookingFor}</p>
            <p><strong>Resume:</strong> <a className="text-blue-600 underline" href={selected.resume} target="_blank" rel="noreferrer">View Resume</a></p>
            <p><strong>How They Heard:</strong> {selected.howTheyHeard}</p>
            <p><strong>Availability:</strong> {selected.availability}</p>
            <p><strong>Preferred Times:</strong> {selected.timeline}</p>
            <p><strong>Other Info:</strong> {selected.otherInfo}</p>
            <p><strong>Submitted:</strong> {selected.submitted}</p>
            <div className="mt-4">
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Propose Meeting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
