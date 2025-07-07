// src/components/SchedulePage.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CalendarPreview from './CalendarPreview';

export default function SchedulePage() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [mentorEmail, setMentorEmail] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  useEffect(() => {
    fetch('http://localhost:5050/api/submissions')
      .then((res) => res.json())
      .then((data) => {
        const match = data.find((s) => s.id === id);
        if (match) setStudent(match);
      });
  }, [id]);

  

  const handleSendInvite = async () => {
    if (!mentorEmail || !selectedTime) {
      alert('Please select a time and enter your email.');
      return;
    }

    const res = await fetch('http://localhost:5050/api/schedule-meeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentEmail: student.email,
        mentorEmail,
        time: selectedTime,
      }),
    });

    if (res.ok) alert('Calendar invite sent!');
    else alert('Failed to send invite');
  };

  if (!student) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-xl bg-white p-6 rounded shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Propose a Meeting with {student.name}
        </h2>

        <p className="mb-4 text-center">
          <strong>Student Availability:</strong> {student.availability}
        </p>

        <CalendarPreview
          availability={student.availability}
          timeline={student.timeline}
          onSelect={setSelectedTime}
        />

        <div className="mb-4 mt-6">
          <label className="block mb-1 font-medium">Your Email</label>
          <input
            type="email"
            className="border rounded px-3 py-2 w-full"
            placeholder="mentor@example.com"
            value={mentorEmail}
            onChange={(e) => setMentorEmail(e.target.value)}
          />
        </div>

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
          onClick={handleSendInvite}
        >
          Send Invite
        </button>

        {selectedTime && (
          <p className="mt-4 text-sm text-gray-600 text-center">
            Selected Time:{' '}
            <strong>{new Date(selectedTime).toLocaleString()}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
