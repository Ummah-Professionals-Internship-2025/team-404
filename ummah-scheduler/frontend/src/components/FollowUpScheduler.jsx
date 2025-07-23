// src/components/FollowUpScheduler.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import './SchedulePage.css';

export default function FollowUpScheduler() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(null);
  const mentorEmail = sessionStorage.getItem("mentorEmail");

  useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email");
  if (email) {
    sessionStorage.setItem("mentorEmail", email);
  }
}, []);


  const handleSchedule = () => {
  if (!selectedDate) {
    alert("Please select a date and time.");
    return;
  }

  // Save meeting info to sessionStorage
  sessionStorage.setItem("meetingTime", selectedDate.toISOString());
  sessionStorage.setItem("studentId", id);

  const mentorEmail = sessionStorage.getItem("mentorEmail");

  // Redirect if not signed in
  if (!mentorEmail) {
    // Save that we’re in a follow-up flow
    sessionStorage.setItem("fromFollowUp", "true");
    window.location.href = "http://localhost:5050/auth/login";
  } else {
    navigate(`/schedule-confirm?email=${encodeURIComponent(mentorEmail)}`);
  }
};



  return (
    <div className="schedule-container">
      <h2 className="schedule-title">Propose Follow-Up Meeting</h2>
      <p>Select any date and time to send a follow-up invite.</p>

      <div style={{ margin: "20px 0" }}>
        <DatePicker
          selected={selectedDate}
          onChange={(date) => setSelectedDate(date)}
          showTimeSelect
          timeIntervals={15}
          timeFormat="HH:mm"
          dateFormat="MMMM d, yyyy h:mm aa"
          placeholderText="Pick a date and time"
          className="datepicker-input"
        />
      </div>

      <p className="login-info">
        {mentorEmail
          ? <>You are logged in as <strong>{mentorEmail}</strong></>
          : <>You will be prompted to sign in with Google before sending.</>}
      </p>

      <button onClick={handleSchedule} className="propose-btn">
        Send Invite
      </button>

      {selectedDate && (
        <p className="selected-time">
          Selected Time: <strong>{selectedDate.toLocaleString()}</strong>
        </p>
      )}
    </div>
  );
}
