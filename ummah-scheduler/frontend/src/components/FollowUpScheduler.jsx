// src/components/FollowUpScheduler.jsx
import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import './SchedulePage.css';

export default function FollowUpScheduler() {
  const { id } = useParams();
  const [selectedDate, setSelectedDate] = useState(null);
  const navigate = useNavigate();
  

  const handleSchedule = () => {
    const mentorEmail = sessionStorage.getItem("mentorEmail");
    if (!mentorEmail) {
      alert("Please sign in to your Google Calendar account first.");
      return;
    }

    if (!selectedDate) {
      alert("Please select a date and time.");
      return;
    }

    // ✅ Save to session and redirect to confirmation logic
    sessionStorage.setItem("studentId", id);
    sessionStorage.setItem("meetingTime", selectedDate.toISOString());
    navigate(`/schedule-confirm?email=${encodeURIComponent(mentorEmail)}`);
  };

  return (
    <div className="schedule-container">
      <h2>Propose Follow-Up Meeting</h2>
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

      <button onClick={handleSchedule} className="propose-btn">
        Send Invite
      </button>
    </div>
  );
}
