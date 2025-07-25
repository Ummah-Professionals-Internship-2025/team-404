// src/components/FollowUpScheduler.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import './SchedulePage.css';
import Header from './Header';

export default function FollowUpScheduler() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(null);
  const [mentorEmail, setMentorEmail] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");
    if (email) {
      setMentorEmail(email);
      sessionStorage.setItem("mentorEmail", email);
    }
  }, []);

  const handleSendInvite = () => {
    if (!selectedDate) {
      alert("Please select a time.");
      return;
    }

    sessionStorage.setItem("studentId", id);
    sessionStorage.setItem("meetingTime", selectedDate.toISOString());
    sessionStorage.setItem("fromFollowUp", "true");

    if (!mentorEmail) {
      // ⬅️ This redirects to Google login, just like Dashboard
      window.location.href = "http://localhost:5050/auth/login";
    } else {
      window.location.href = `http://localhost:5173/schedule-confirm?email=${mentorEmail}`;
    }
  };

  return (
    <>
      <Header />
      <div className="schedule-container">
        <div className="schedule-card">
          <h2 className="schedule-title">Propose Follow-Up Meeting</h2>
          <p className="student-availability">
            Select any date and time to send a follow-up invite.
          </p>

          <div className="calendar-wrapper">
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              showTimeSelect
              inline
              timeIntervals={15}
              timeFormat="HH:mm"
              dateFormat="MMMM d, yyyy h:mm aa"
              className="datepicker-inline"
            />
          </div>

          <p className="login-info">
            {mentorEmail
              ? <>You are logged in as <strong>{mentorEmail}</strong></>
              : <>You will be prompted to sign in with Google before sending.</>}
          </p>

          <button onClick={handleSendInvite} className="send-invite-btn">
            Send Invite
          </button>

          {selectedDate && (
            <p className="selected-time">
              Selected Time: <strong>{selectedDate.toLocaleString()}</strong>
            </p>
          )}
        </div>
      </div>
    </>
  );
}
