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
    // Load student info
    fetch('http://localhost:5050/api/submissions')
      .then(res => res.json())
      .then(data => {
        const match = data.find((s) => s.id === id);
        if (match) setStudent(match);
      });

    // Get ?email= from URL and set mentor email
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    if (email) {
      setMentorEmail(email);
    }
  }, [id]);

  const handleSendInvite = () => {
    if (!selectedTime) {
      alert("Please select a time.");
      return;
    }

    // Store meeting data in sessionStorage
    sessionStorage.setItem("studentId", id);
    sessionStorage.setItem("meetingTime", selectedTime);

    // Redirect to login if not already logged in
    if (!mentorEmail) {
      window.location.href = "http://localhost:5050/auth/login";
    } else {
      // Already logged in, skip login and go directly to schedule-confirm
      window.location.href = `http://localhost:5173/schedule-confirm?email=${mentorEmail}`;
    }
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

        <p className="text-sm text-center text-gray-600 mt-3">
          {mentorEmail
            ? <>You are logged in as <strong>{mentorEmail}</strong></>
            : <>You will be prompted to sign in with Google before sending.</>}
        </p>

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full mt-6"
          onClick={handleSendInvite}
        >
          Send Invite
        </button>

        {selectedTime && (
          <p className="mt-4 text-sm text-gray-600 text-center">
            Selected Time: <strong>{new Date(selectedTime).toLocaleString()}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
