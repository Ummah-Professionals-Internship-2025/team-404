// src/components/ScheduleConfirm.jsx
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
      alert("❌ Missing meeting info. Returning to dashboard.");
      navigate("/");
      return;
    }

    // 1️⃣ Fetch live student info from internal dashboard API
    fetch('http://localhost:5050/api/submissions')
      .then(res => res.json())
      .then(data => {
        const student = data.find((s) => s.id === studentId);
        if (!student) {
          alert("❌ Student not found in submissions.");
          navigate("/");
          return;
        }

        // 2️⃣ Schedule Google Calendar meeting
        fetch("http://localhost:5050/api/schedule-meeting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: studentId, // ✅ used for SQLite update
            studentEmail: student.email,
            mentorEmail,
            time: meetingTime
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (!data.eventLink) {
              alert(`❌ Error scheduling meeting: ${data.error || "Unknown error"}`);
              navigate("/");
              return;
            }

            // 3️⃣ Save status to internal dash JSON + SQLite for admin
            return fetch('http://localhost:5050/api/save-status', {
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
                alert(`✅ Invite sent!\nGoogle Meet: ${data.eventLink}`);
                navigate("/"); // back to dashboard
              })
              .catch((err) => {
                console.error("Failed to save status:", err);
                alert(`Meeting sent!\nGoogle Meet: ${data.eventLink}\n⚠️ Status not saved.`);
                navigate("/");
              });
          })
          .catch((err) => {
            console.error("❌ Error scheduling meeting:", err);
            alert("Failed to schedule meeting. Check backend logs.");
            navigate("/");
          });
      })
      .catch((err) => {
        console.error("❌ Failed to fetch student data:", err);
        alert("Failed to fetch student data.");
        navigate("/");
      });
  }, [location, navigate]);

  return <p className="text-center mt-10">Sending meeting invite...</p>;
}
