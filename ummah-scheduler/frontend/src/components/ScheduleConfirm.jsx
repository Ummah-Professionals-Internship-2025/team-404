// src/components/ScheduleConfirm.jsx
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function ScheduleConfirm() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mentorEmail = params.get("email") || sessionStorage.getItem("mentorEmail");
    const studentId = sessionStorage.getItem("studentId");
    const meetingTime = sessionStorage.getItem("meetingTime");

    console.log("Confirm page loaded with:", {
      studentId,
      mentorEmail,
      meetingTime
    });


    if (!mentorEmail || !studentId || !meetingTime) {
      alert("Missing meeting info.");
      navigate("/");
      return;
    }

    fetch('http://localhost:5050/api/submissions')
      .then(res => res.json())
      .then(data => {
        const student = data.find((s) => s.id === studentId);
        if (!student) {
          alert("Student not found");
          navigate("/");
          return;
        }

        // ⬇️ First: Send calendar invite
        fetch("http://localhost:5050/api/schedule-meeting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentEmail: student.email,
            mentorEmail,
            time: meetingTime
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.eventLink) {
              // ⬇️ Second: Save status as "In Progress" with pickedBy
              fetch('http://localhost:5050/api/save-status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
  id: studentId,
  status: 'In Progress',
  pickedBy: mentorEmail,
  name: student.name || "",
  email: student.email || "",
  phone: student.phone || "",
  industry: student.industry || "",
  academicStanding: student.academicStanding || "",
  lookingFor: student.lookingFor || "",
  resume: student.resume || "",
  howTheyHeard: student.howTheyHeard || "",
  availability: student.availability || "",
  timeline: student.timeline || "",
  otherInfo: student.otherInfo || "",
  submitted: student.submitted || ""
}),
})
  .then(() => {
    alert(`Invite sent!\nGoogle Meet: ${data.eventLink}`);
    navigate("/"); // go back to dashboard
  })
  .catch((err) => {
    console.error("Failed to save status:", err);
    alert("Meeting sent, but status not saved.");
    navigate("/");
  });


            } else {
              alert(`Error: ${data.error}`);
              navigate("/");
            }
          });
      });
  }, [location, navigate]);

  return <p className="text-center mt-10">Sending meeting invite...</p>;
}
