// src/components/ScheduleConfirm.jsx
// src/components/ScheduleConfirm.jsx
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL;

export default function ScheduleConfirm() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mentorEmail = params.get("email") || sessionStorage.getItem("mentorEmail");
    const studentId = sessionStorage.getItem("studentId");
    const meetingTime = sessionStorage.getItem("meetingTime");
    const fromFollowUp = sessionStorage.getItem("fromFollowUp") === "true";

    console.log("Confirm page loaded with:", {
      studentId,
      mentorEmail,
      meetingTime,
      fromFollowUp
    });

    if (!mentorEmail || !studentId || !meetingTime) {
      alert("❌ Missing meeting info. Returning to dashboard.");
      navigate("/");
      return;
    }

    // 1️⃣ Fetch live student info
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
            id: studentId,
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

            // 3️⃣ Save status to JSON + SQLite
            return fetch('http://localhost:5050/api/save-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: studentId,
                status: fromFollowUp ? 'Done' : 'In Progress', // ✅ stay Done if follow-up
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
                sessionStorage.removeItem("fromFollowUp");
                navigate(fromFollowUp ? "/followup" : "/"); // ✅ redirect appropriately
              })
              .catch((err) => {
                console.error("Failed to save status:", err);
                alert(`Meeting sent!\nGoogle Meet: ${data.eventLink}\n⚠️ Status not saved.`);
                navigate(fromFollowUp ? "/followup" : "/");
              });
          })
          .catch((err) => {
            console.error("❌ Error scheduling meeting:", err);
            alert("Failed to schedule meeting. Check backend logs.");
            navigate(fromFollowUp ? "/followup" : "/");
          });
      })
      .catch((err) => {
        console.error("❌ Failed to fetch student data:", err);
        alert("Failed to fetch student data.");
        navigate(fromFollowUp ? "/followup" : "/");
      });
  }, [location, navigate]);

  return <p className="text-center mt-10">Sending meeting invite...</p>;
}
