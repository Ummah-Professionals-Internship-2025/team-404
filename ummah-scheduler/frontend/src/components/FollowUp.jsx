// src/components/FollowUp.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import "../App.css";
import "./FollowUpExact.css";           // keep filename
import logo from "../assets/white-horizontal.png";
import Sidebar from "./Sidebar";

export default function FollowUp() {
  const [doneSubmissions, setDoneSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProfession, setSelectedProfession] = useState("");
  const [mentorEmail, setMentorEmail] = useState("");
  const [pickedDate, setPickedDate] = useState(null);
  const [pickedTime, setPickedTime] = useState("");
  const navigate = useNavigate();

  // --- data fetch (unchanged) ---
  useEffect(() => {
    fetch("http://localhost:5050/api/followup")
      .then((res) => res.json())
      .then((data) => {
        const deletedIds = JSON.parse(
          localStorage.getItem("softDeletedFollowUps") || "[]"
        );
        const filtered = data.filter((item) => !deletedIds.includes(item.id));
        setDoneSubmissions(filtered);
      })
      .catch((err) => console.error("Error fetching follow-ups:", err));
  }, []);

  // store current mentor (if any)
  useEffect(() => {
    setMentorEmail(sessionStorage.getItem("mentorEmail") || "");
  }, []);

  // --- helpers (unchanged behavior) ---
  function getWebmailUrl(email, subject, body) {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    const domain = (email || "").split("@")[1]?.toLowerCase() || "";
    if (domain.includes("gmail.com"))
      return `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${encodedSubject}&body=${encodedBody}`;
    if (
      domain.includes("outlook.com") ||
      domain.includes("hotmail.com") ||
      domain.includes("live.com")
    )
      return `https://outlook.office.com/mail/deeplink/compose?to=${email}&subject=${encodedSubject}&body=${encodedBody}`;
    if (domain.includes("yahoo.com"))
      return `https://compose.mail.yahoo.com/?to=${email}&subject=${encodedSubject}&body=${encodedBody}`;
    return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
  }

  // Auto-resume after login (message flow)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loggedIn = params.get("loggedIn") === "true";
    const emailParam = params.get("email");

    if (emailParam) {
      sessionStorage.setItem("mentorEmail", emailParam);
      setMentorEmail(emailParam);
    }

    if (loggedIn && sessionStorage.getItem("messageIntent") === "true") {
      const studentEmail = sessionStorage.getItem("messageStudentEmail");
      const studentName = sessionStorage.getItem("messageStudentName");
      sessionStorage.removeItem("messageIntent");
      sessionStorage.removeItem("messageStudentEmail");
      sessionStorage.removeItem("messageStudentName");

      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      const subject =
        "Follow-Up on Your Ummah Professionals Mentorship";
      const body = `Hi ${studentName},\n\nI hope you're doing well! I'm following up to see if you'd like a second mentorship session.\nIf you're interested, let me know and we can schedule a new meeting.\n\n- ${
        emailParam || mentorEmail
      }`;
      const url = getWebmailUrl(studentEmail, subject, body);
      setTimeout(() => window.open(url, "_blank"), 400);
    }
  }, []); // run once

  // Soft delete (UI only)
  const handleSoftDelete = (id) => {
    setDoneSubmissions((prev) => prev.filter((item) => item.id !== id));
    const deletedIds = JSON.parse(
      localStorage.getItem("softDeletedFollowUps") || "[]"
    );
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem(
        "softDeletedFollowUps",
        JSON.stringify(deletedIds)
      );
    }
  };

  // ---------- presentation-only helpers ----------
  const DAYS = ["Su", "M", "Tu", "W", "Th", "F", "Sa"];
  const MORNING = ["7 AM", "8 AM", "9 AM", "10 AM", "11 AM"];
  const AFTERNOON = ["12 PM", "1 PM", "2 PM", "3 PM", "4 PM"];
  const EVENING = ["5 PM", "6 PM", "7 PM"];

  const initials = (name = "") => (name.trim()[0] || "").toUpperCase();

  const renderAvailabilityChips = (value) => {
    const raw = Array.isArray(value) ? value.join(",") : String(value || "");
    return (
      <div className="wkdays wkdays--sheet">
        {DAYS.map((d) => {
          const on = raw.toLowerCase().includes(d.toLowerCase());
          return (
            <span key={d} className={`dayChip ${on ? "on" : "off"}`}>
              {d}
            </span>
          );
        })}
      </div>
    );
  };

  // Show industry exactly like screenshot: first item + “+n”
  const splitIndustry = (val) => {
    if (!val) return { primary: "—", extra: 0 };
    if (Array.isArray(val))
      return { primary: val[0] || "—", extra: Math.max(0, val.length - 1) };
    const parts = String(val)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return { primary: parts[0] || "—", extra: Math.max(0, parts.length - 1) };
  };

  const visibleRows = doneSubmissions.filter(
    (item) =>
      (!searchQuery ||
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(item.industry || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())) &&
      (!selectedProfession || item.industry === selectedProfession)
  );

  function combineDateAndTime(date, label) {
    if (!date || !label) return null;
    const [num, ap] = label.split(" ");
    let h = parseInt(num, 10);
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    const d = new Date(date);
    d.setHours(h, 0, 0, 0);
    return d;
  }

  function handleProposeMeeting() {
    const dt = combineDateAndTime(pickedDate, pickedTime);
    if (!dt) {
      alert("Please select a date and a time.");
      return;
    }
    if (!selected) return;

    sessionStorage.setItem("studentId", selected.id);
    sessionStorage.setItem("meetingTime", dt.toISOString());
    sessionStorage.setItem("fromFollowUp", "true");

    const me = sessionStorage.getItem("mentorEmail") || mentorEmail;
    if (!me) {
      window.location.href = "http://localhost:5050/auth/login";
      return;
    }
    window.location.href = `http://localhost:5173/schedule-confirm?email=${me}`;
  }

  const resetSheetState = () => {
    setPickedDate(null);
    setPickedTime("");
  };

  return (
    <div className="followup-page">
      {/* Gradient header */}
      <header className="fu-header">
        <img src={logo} alt="Ummah Professionals" className="fu-logo" />
        <h1 className="fu-title">Follow-Up</h1>

        <div className="fu-sidebar-anchor">
          <Sidebar />
        </div>
      </header>

      {/* Search + Filter */}
      <div className="fu-filters">
        <div className="fu-search">
          <span className="icon-magnifier" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="fu-select">
          <svg className="icon-funnel" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" fill="currentColor" />
          </svg>
          <select
            value={selectedProfession}
            onChange={(e) => setSelectedProfession(e.target.value)}
            aria-label="Filter by Profession"
          >
            <option value="">Filter by Profession</option>
            {[...new Set(doneSubmissions.map((s) => s.industry).filter(Boolean))].map(
              (ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              )
            )}
          </select>
          <svg className="icon-chev" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M7 10l5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Column headers */}
      <div className="fu-columns">
        <div className="col name">
          NAME <i />
        </div>
        <div className="col avail">
          AVAILIBILITY <i />
        </div>
        <div className="col industry">
          INDUSTRY <i />
        </div>
      </div>

      {/* List */}
      <div className="fu-list">
        {visibleRows.length === 0 && (
          <div className="fu-empty">No completed meetings yet.</div>
        )}

        {visibleRows.map((item) => {
          const { primary, extra } = splitIndustry(item.industry);
          return (
            <div
              key={item.id}
              className="fu-row"
              onClick={() => {
                setSelected(item);
                resetSheetState();
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) =>
                e.key === "Enter" ? (setSelected(item), resetSheetState()) : null
              }
            >
              {/* Left */}
              <div className="fu-left">
                <div className="avatar">{initials(item.name)}</div>
                <div className="who">
                  <div className="who-name">{item.name}</div>
                  <div className="who-email">{item.email}</div>
                </div>
                <span className="done-pill">DONE</span>
              </div>

              {/* Middle */}
              <div className="fu-mid">
                <div className="wkdays">
                  {DAYS.map((d) => {
                    const on = String(item.availability || "")
                      .toLowerCase()
                      .includes(d.toLowerCase());
                    return (
                      <span key={d} className={`day ${on ? "on" : "off"}`}>
                        {d}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Right */}
              <div className="fu-right">
                <div className="industry-pill">{primary}</div>
                {extra > 0 && <div className="extra-count">+{extra}</div>}
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSoftDelete(item.id);
                  }}
                  aria-label={`Delete ${item.name}`}
                >
                  DELETE
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Big Scheduler Sheet */}
      {selected && (
        <div
          className="fu-sheet-backdrop"
          onClick={() => setSelected(null)}
        >
          <div className="fu-sheet" onClick={(e) => e.stopPropagation()}>
            <button className="fu-x" onClick={() => setSelected(null)} aria-label="Close">
              ×
            </button>

            {/* Sheet header */}
            <div className="fu-sheet-head">
              <h2 className="fu-student-name">
                {selected.name || "Student"}
              </h2>

              <div className="fu-status">
                <div className="status-box">
                  <span>IN PROGRESS</span>
                  <svg viewBox="0 0 24 24" className="chev">
                    <path
                      d="M7 10l5 5 5-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Body grid */}
            <div className="fu-sheet-body">
              {/* LEFT: student info */}
              <aside className="sheet-left">
                <div className="pill-row">
                  <div className="pill-lite">
                    {selected.academicStanding || "Graduated"}
                  </div>
                  {selected.industry && (
                    <div className="pill-wide">
                      {selected.industry}
                    </div>
                  )}
                </div>

                <section className="info-card">
                  <div className="label">Email</div>
                  <div className="value">{selected.email || "—"}</div>

                  <div className="label">Phone</div>
                  <div className="value">{selected.phone || "—"}</div>
                </section>

                <section className="info-card">
                  <div className="label">Looking For</div>
                  <div className="value">{selected.lookingFor || "—"}</div>

                  <div className="label">Resume</div>
                  <div className="value">
                    {selected.resume ? (
                      <a
                        className="linkish"
                        href={selected.resume}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View resume
                      </a>
                    ) : (
                      "—"
                    )}
                  </div>

                  <div className="label">How They Heard</div>
                  <div className="value">{selected.howTheyHeard || "—"}</div>
                </section>

                {selected.otherInfo && (
                  <section className="info-card">
                    <div className="label">Comments</div>
                    <div className="value">{selected.otherInfo}</div>
                  </section>
                )}

                <section className="avail-card">
                  <div className="label big">Student Availability:</div>
                  {renderAvailabilityChips(selected.availability)}

                  <div className="tod">
                    <span
                      className={`tod-chip ${
                        String(selected.timeline || "")
                          .toLowerCase()
                          .includes("morning")
                          ? "on"
                          : ""
                      }`}
                    >
                      Morning
                    </span>
                    <span
                      className={`tod-chip ${
                        String(selected.timeline || "")
                          .toLowerCase()
                          .includes("afternoon")
                          ? "on"
                          : ""
                      }`}
                    >
                      Afternoon
                    </span>
                    <span
                      className={`tod-chip ${
                        String(selected.timeline || "")
                          .toLowerCase()
                          .includes("evening")
                          ? "on"
                          : ""
                      }`}
                    >
                      Evening
                    </span>
                  </div>
                </section>

                {selected.submitted && (
                  <div className="submitted-note">
                    submitted: {selected.submitted}
                  </div>
                )}
              </aside>

              {/* RIGHT: calendar & time chips */}
              <section className="sheet-right">
                <h3 className="right-title">Select a Date &amp; Time:</h3>

                <div className="cal-card">
                  <DatePicker
                    selected={pickedDate}
                    onChange={(d) => setPickedDate(d)}
                    inline
                    calendarClassName="fu-datepicker"
                    nextMonthButtonLabel="›"
                    previousMonthButtonLabel="‹"
                  />
                </div>

                <div className="times-card">
                  <div className="times-row">
                    <div className="times-label">Morning:</div>
                    <div className="times-chips">
                      {MORNING.map((t) => (
                        <button
                          key={t}
                          className={`time-chip ${
                            pickedTime === t ? "active" : ""
                          }`}
                          onClick={() => setPickedTime(t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="times-row">
                    <div className="times-label">Afternoon:</div>
                    <div className="times-chips">
                      {AFTERNOON.map((t) => (
                        <button
                          key={t}
                          className={`time-chip ${
                            pickedTime === t ? "active" : ""
                          }`}
                          onClick={() => setPickedTime(t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="times-row">
                    <div className="times-label">Evening:</div>
                    <div className="times-chips">
                      {EVENING.map((t) => (
                        <button
                          key={t}
                          className={`time-chip ${
                            pickedTime === t ? "active" : ""
                          }`}
                          onClick={() => setPickedTime(t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="selected-row">
                  <div className="sel-label">Selected Time:</div>
                  <div className="sel-pills">
                    <span className="sel-pill">
                      {pickedDate ? pickedDate.toLocaleDateString() : "—/—/—"}
                    </span>
                    <span className="sel-pill">{pickedTime || "—:—"}</span>
                  </div>
                </div>

                <button className="propose-cta" onClick={handleProposeMeeting}>
                  PROPOSE MEETING
                </button>

                <div className="login-hint">
                  {mentorEmail ? (
                    <>
                      You are logged in as <strong>{mentorEmail}</strong>.
                    </>
                  ) : (
                    <>You will be prompted to sign in with Google before sending.</>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
