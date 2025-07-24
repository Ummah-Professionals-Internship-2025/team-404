// src/components/SchedulePage.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CalendarPreview from './CalendarPreview';
import './SchedulePage.css';
import Header from './Header';

export default function SchedulePage() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [mentorEmail, setMentorEmail] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  useEffect(() => {
    fetch('http://localhost:5050/api/submissions')
      .then(res => res.json())
      .then(data => {
        const match = data.find((s) => s.id === id);
        if (match) setStudent(match);
      });

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

    sessionStorage.setItem("studentId", id);
    sessionStorage.setItem("meetingTime", selectedTime);

    // ✅ Save status and pickedBy info
    if (student) {
      fetch("http://localhost:5050/api/save-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: student.id,
          status: "In Progress",
          pickedBy: mentorEmail,
          name: student.name,
          email: student.email,
          phone: student.phone,
          industry: student.industry,
          academicStanding: student.academicStanding,
          lookingFor: student.lookingFor,
          resume: student.resume,
          howTheyHeard: student.howTheyHeard,
          availability: student.availability,
          timeline: student.timeline,
          otherInfo: student.otherInfo,
          submitted: student.submitted
        })
      });
    }

    // Continue to Google auth or confirmation
    if (!mentorEmail) {
      window.location.href = "http://localhost:5050/auth/login";
    } else {
      window.location.href = `http://localhost:5173/schedule-confirm?email=${mentorEmail}`;
    }
  };

  if (!student) return <p className="text-center mt-10">Loading...</p>;

  return (
    <><Header /><div className="schedule-container">
      <div className="schedule-card">
        <h2 className="schedule-title">Propose a Meeting with {student.name}</h2>

        <p className="student-availability">
          <strong>Student Availability:</strong> {student.availability}
        </p>

        <div className="calendar-wrapper">
          <CalendarPreview
            availability={student.availability}
            timeline={student.timeline}
            onSelect={setSelectedTime} />
        </div>

        <p className="login-info">
          {mentorEmail
            ? <>You are logged in as <strong>{mentorEmail}</strong></>
            : <>You will be prompted to sign in with Google before sending.</>}
        </p>

        <button className="send-invite-btn" onClick={handleSendInvite}>
          Propose Meeting
        </button>

        {selectedTime && (
          <p className="selected-time">
            Selected Time: <strong>{new Date(selectedTime).toLocaleString()}</strong>
          </p>
        )}
      </div>
    </div></>
  );
}
