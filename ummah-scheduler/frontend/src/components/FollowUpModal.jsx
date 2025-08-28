import React, { useEffect, useMemo, useState } from 'react';
import './FollowUpModal.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import copy_icon from '../assets/copy.svg';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL;

export default function FollowUpModal({
  student,
  onClose,
  theme,
  onProposeMeeting
}) {
  const [scheduleDate, setScheduleDate] = useState(null);
  const [scheduleTimeLabel, setScheduleTimeLabel] = useState('');
  const [showCommentsPopup, setShowCommentsPopup] = useState(false);

  // For follow-up, we allow any day (no availability restrictions)
  // Just generate standard time options for any selected date
  const generateTimeOptions = (date) => {
    if (!date) return { morning: [], afternoon: [], evening: [] };
    
    const timesByPeriod = { morning: [], afternoon: [], evening: [] };
    
    // Standard business hours for any day
    const addRange = (period, startHour, endHour) => {
      for (let h = startHour; h <= endHour; h += 1) {
        const d = new Date(date);
        d.setHours(h, 0, 0, 0);
        timesByPeriod[period].push(d);
      }
    };

    addRange('morning', 7, 11);
    addRange('afternoon', 12, 16);
    addRange('evening', 17, 19);
    
    return timesByPeriod;
  };

  const timeOptionsByPeriod = useMemo(() => generateTimeOptions(scheduleDate), [scheduleDate]);

  const formatTimeLabel = (dateObj) => dateObj.toLocaleTimeString([], { hour: 'numeric' });

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Only disable past dates (no availability restrictions for follow-up)
  const tileDisabled = ({ date, view }) => {
    if (view !== 'month') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleProposeMeeting = () => {
    if (!scheduleDate || !scheduleTimeLabel) {
      alert('Please select a date and a time.');
      return;
    }

    // Find the actual time object that matches the selected label
    const allTimes = Object.values(timeOptionsByPeriod).flat();
    const selectedTime = allTimes.find(timeObj => formatTimeLabel(timeObj) === scheduleTimeLabel);
    
    if (!selectedTime) {
      alert('Error: Could not parse selected time. Please try selecting the time again.');
      return;
    }

    // Create the final datetime
    const dt = new Date(scheduleDate);
    dt.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    
    if (isNaN(dt.getTime())) {
      alert('Error: Invalid datetime created. Please try again.');
      return;
    }

    onProposeMeeting(dt);
  };

  const renderTimePeriod = (periodName, times) => {
    if (times.length === 0) return null;

    return (
      <div className="time-period-group" key={periodName}>
        <div className="time-period-row">
          <span className="time-period-label">
            {periodName.charAt(0).toUpperCase() + periodName.slice(1)}:
          </span>
          <div className="time-period-chips">
            {times.map((dt) => {
              const lbl = formatTimeLabel(dt);
              const isActive = scheduleTimeLabel === lbl;
              return (
                <button
                  key={dt.toISOString()}
                  className={`time-chip ${isActive ? 'active' : ''}`}
                  onClick={() => setScheduleTimeLabel(lbl)}
                >
                  {lbl}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const hasAnyTimes = Object.values(timeOptionsByPeriod).some(times => times.length > 0);

  return (
    <div className={`modal-content modal-scheduler followup-modal ${theme === 'dark' ? 'theme-dark' : ''}`} onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <div className="modal-header-left">
          <h1 className="modal-student-name">
            {student.name}
          </h1>
        </div>
        <div className="status-dropdown">
          <div className="status-tag" style={theme === 'dark' ? 
            { backgroundColor: '#0f2f22', color: '#86efac', padding: '8px 16px', borderRadius: '12px', fontWeight: '600', fontSize: '14px' } : 
            { backgroundColor: '#DCFEE7', color: '#17803D', padding: '8px 16px', borderRadius: '12px', fontWeight: '600', fontSize: '14px' }
          }>
            DONE
          </div>
        </div>
      </div>
      
      <div className="modal-grid">
        <div className="modal-left">
          {/* Student header with pills */}
          <div className="student-header">
            <div className="student-pills">
              {student.academicStanding && (
                <span className="pill-academic">{student.academicStanding}</span>
              )}
              {student.industry && (
                <span className="pill-industry">{student.industry}</span>
              )}
            </div>
          </div>

          {/* Contact section */}
          <div className="info-section">
            <div className="info-row">
              <div className="info-label">Email</div>
              <div className="info-value">
                <div className="info-value-text">{student.email}</div>
                <button 
                  className="copy-btn" 
                  onClick={() => copyToClipboard(student.email)}
                  title="Copy email"
                >
                  <img src={copy_icon} alt="Copy" width="14" height="14" />
                </button>
              </div>
            </div>
            <div className="info-row">
              <div className="info-label">Phone</div>
              <div className="info-value">
                <div className="info-value-text">{student.phone || '—'}</div>
                {student.phone && (
                  <button 
                    className="copy-btn" 
                    onClick={() => copyToClipboard(student.phone)}
                    title="Copy phone"
                  >
                    <img src={copy_icon} alt="Copy" width="14" height="14" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Info section */}
          <div className="info-section">
            <div className="info-row">
              <div className="info-label">Looking For</div>
              <div className="info-value">{student.lookingFor || '—'}</div>
            </div>
            <div className="info-row">
              <div className="info-label">Resume</div>
              <div className="info-value">
                {student.resume ? (
                  <a href={student.resume} target="_blank" rel="noreferrer">
                    View Resume
                  </a>
                ) : '—'}
              </div>
            </div>
            <div className="info-row">
              <div className="info-label">Found Via</div>
              <div className="info-value">{student.howTheyHeard || '—'}</div>
            </div>
          </div>

          {/* Comments section */}
          {student.otherInfo && (
            <div className="comments-section">
              <div 
                className="info-value comments-clickable" 
                onClick={() => setShowCommentsPopup(true)}
                title="Click to view full comment"
              >
                {student.otherInfo}
              </div>
            </div>
          )}

          {student.submitted && (
            <div className="submitted-note">
              Submitted: {new Date(student.submitted).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric', 
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </div>
          )}
        </div>

        <div className="modal-right">
          <div className="calendar-card">
            <Calendar
              onChange={(d) => { setScheduleDate(d); setScheduleTimeLabel(''); }}
              value={scheduleDate}
              tileDisabled={tileDisabled}
              minDetail="month"
              locale="en-US"
            />
          </div>

          <div className="times-card">
            {!scheduleDate ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', justifyContent: 'center', padding: '20px' }}>
                <div className="no-times" style={{ paddingLeft: 0, fontStyle: 'italic' }}>Please select a date first</div>
              </div>
            ) : (
              <>
                {!hasAnyTimes ? (
                  <div className="no-times" style={{ textAlign: 'center', padding: '20px' }}>No available times for this date</div>
                ) : (
                  <>
                    {renderTimePeriod('morning', timeOptionsByPeriod.morning)}
                    {renderTimePeriod('afternoon', timeOptionsByPeriod.afternoon)}
                    {renderTimePeriod('evening', timeOptionsByPeriod.evening)}
                  </>
                )}
              </>
            )}
          </div>

          <div className="selected-row">
            <div className="sel-label">Selected Time:</div>
            <div className="selected-time-pills">
              <span className="selected-time-pill">
                {scheduleDate ? scheduleDate.toLocaleDateString() : '—/—/—'}
              </span>
              <span className="selected-time-pill">
                {scheduleTimeLabel || '—:—'}
              </span>
              {scheduleDate && (
                <span className="selected-time-pill tz">
                  {new Intl.DateTimeFormat([], { timeZoneName: 'short' }).format(scheduleDate).split(' ').pop()}
                </span>
              )}
            </div>
          </div>

          <div className="bottom-section" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button className="propose-meeting-btn" onClick={handleProposeMeeting}>
              PROPOSE MEETING
            </button>
            
            <div className="google-signin-note">
              You will be prompted to sign in with Google before sending.
            </div>
          </div>
        </div>
      </div>

      {/* Comments Popup Modal */}
      {showCommentsPopup && (
        <div className="comments-popup-overlay" onClick={() => setShowCommentsPopup(false)}>
          <div className="comments-popup" onClick={(e) => e.stopPropagation()}>
            <div className="comments-popup-header">
              <h3>Full Comment</h3>
              <button 
                className="comments-popup-close" 
                onClick={() => setShowCommentsPopup(false)}
              >
                ✕
              </button>
            </div>
            <div className="comments-popup-content">
              {student.otherInfo}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}