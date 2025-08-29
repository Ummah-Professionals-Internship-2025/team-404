import React, { useEffect, useMemo, useState } from 'react';
import './DashboardModal.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import alarm_icon from '../assets/alarm.svg';
import alarm_dark_icon from '../assets/alarm_dark.svg';
import copy_icon from '../assets/copy.svg';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL;

export default function DashboardSchedulerModal({
  student,
  onClose,
  statusValue,
  theme,
  onChangeStatus,
}) {
  const [scheduleDate, setScheduleDate] = useState(null);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [scheduleTimeLabel, setScheduleTimeLabel] = useState('');
  const [showCommentsPopup, setShowCommentsPopup] = useState(false);

  const availabilityMap = useMemo(() => {
    if (!student?.availability) return {};
    const raw = String(student.availability)
      .replace(/[\n\t]+/g, ' ')
      .replace(/,\s*/g, ',')
      .trim()
      .toLowerCase();
    if (raw.includes('anytime')) {
      const all = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
      const map = {};
      all.forEach((d) => (map[d] = ['morning','afternoon','evening']));
      return map;
    }
    const map = {};
    raw.split(',').forEach((item) => {
      const parts = item.trim().split(/[\s:]+/);
      const [day, part] = parts;
      if (!day || !part) return;
      if (!map[day]) map[day] = [];
      if (!map[day].includes(part)) map[day].push(part);
    });
    return map;
  }, [student]);

  const timelineRange = useMemo(() => {
    if (!student?.timeline) return null;
    const normalised = String(student.timeline).replace(/[—–−]/g, '-');
    const m = normalised.match(/\s*(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/);
    if (!m) return null;
    const start = new Date(m[1] + 'T00:00:00');
    const end = new Date(m[2] + 'T23:59:59');
    if (isNaN(start) || isNaN(end)) return null;
    return { start, end };
  }, [student]);

  useEffect(() => {
    if (timelineRange?.start) setCalendarViewDate(timelineRange.start);
  }, [timelineRange]);

  const isAvailableDay = (date) => {
    const day = date.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    return Boolean(availabilityMap[day]);
  };

  const tileDisabled = ({ date, view }) => {

    // Disable past dates
    // remove if you wanna keep idk -- message feature for gone students?
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for comparison
    if (date < today) return true;

    if (view !== 'month') return false;
    if (timelineRange) {
      const { start, end } = timelineRange;
      if (date < start || date > end) return true;
    }
    return !isAvailableDay(date);
  };

  const generateTimeOptions = (date) => {
    if (!date) return { morning: [], afternoon: [], evening: [] };
    const day = date.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    const blocks = availabilityMap[day] || [];
    
    const timesByPeriod = { morning: [], afternoon: [], evening: [] };
    
    const addRange = (period, startHour, endHour) => {
      if (!blocks.includes(period)) return;
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

  const timeOptionsByPeriod = useMemo(() => generateTimeOptions(scheduleDate), [scheduleDate, availabilityMap]);

  const formatTimeLabel = (dateObj) => dateObj.toLocaleTimeString([], { hour: 'numeric' });

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here if desired
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleSend = async () => {
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
  
    // Create the final datetime by combining the selected date with the selected time's hours/minutes
    const dt = new Date(scheduleDate);
    dt.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    
    if (isNaN(dt.getTime())) {
      alert('Error: Invalid datetime created. Please try again.');
      return;
    }
  
    sessionStorage.setItem('studentId', student.id);
    sessionStorage.setItem('meetingTime', dt.toISOString());
    sessionStorage.removeItem('fromFollowUp');
  
    const mentorEmail = sessionStorage.getItem('mentorEmail');
    if (!mentorEmail) {
      window.location.href = `${BACKEND_URL}/auth/login`;
      return;
    }
  
    // Verify that this mentor actually has Google tokens on the backend
    try {
      const res = await fetch(`${BACKEND_URL}/auth/token?email=${encodeURIComponent(mentorEmail)}`);
      if (!res.ok) {
         window.location.href = `${BACKEND_URL}/auth/login`;
        return;
      }
    } catch (_err) {
      window.location.href = `${BACKEND_URL}/auth/login`;
      return;
    }
  
  window.location.href = `${FRONTEND_URL}/schedule-confirm?email=${mentorEmail}`;
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
    <div className="modal-content modal-scheduler" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <div className="modal-header-left">
          {/* Back arrow:  <button className="back-arrow" onClick={onClose}>←</button>*/}
          <h1 className="modal-student-name">
            {student.name}
            {/* Overdue icon */}
            {(() => {
              // Use same logic as student cards
              const parseTimelineEnd = (timeline) => {
                if (!timeline) return null;
                const normalized = String(timeline).replace(/[—–−]/g, '-');
                const m = normalized.match(/\b(\d{4}-\d{2}-\d{2})\b\s*-\s*\b(\d{4}-\d{2}-\d{2})\b/);
                if (!m) return null;
                const end = new Date(`${m[2]}T23:59:59`);
                return isNaN(end.getTime()) ? null : end;
              };

              const isOverdue = (item) => {
                const end = parseTimelineEnd(item.timeline);
                if (!end) return false;
                return new Date() > end;
              };

              if (!isOverdue(student)) return null;
              
              return (
                <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  animation: 'overduePulse 1.9s infinite',
                  marginLeft: '15px',
                }}
                >
                <img src={theme === 'dark' ? alarm_dark_icon : alarm_icon} 
                    alt="Overdue" 
                    width="28" 
                    height="25"
                    style={{ flexShrink: 0 }} 
                  />
              </span>
              );
            })()}
          </h1>
        </div>
        <div className={`status-dropdown status-dropdown-${(statusValue || 'To Do').toLowerCase().replace(/\s+/g, '-')}`}>
          <select
            value={statusValue || ''}
            onChange={(e) => onChangeStatus?.(e.target.value)}
            className={`status-select status-select-${(statusValue || 'To Do').toLowerCase().replace(/\s+/g, '-')}`}
          >
            <option value="To Do">TO DO</option>
            <option value="In Progress">IN PROGRESS</option>
            <option value="Done">DONE</option>
          </select>
          <span className="status-chevron" aria-hidden="true" />
        </div>
      </div>
      <div className="modal-grid">
        <div className="modal-left">
          {/* Student header with pills only */}
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

          {/* Contact section - no title */}
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
                <div className="info-value-text">{student.phone || '–'}</div>
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

          {/* Info section - no title */}
          <div className="info-section">
            <div className="info-row">
              <div className="info-label">Looking For</div>
              <div className="info-value">{student.lookingFor || '−'}</div>
            </div>
            <div className="info-row">
              <div className="info-label">Resume</div>
              <div className="info-value">
                {student.resume ? (
                  <a href={student.resume} target="_blank" rel="noreferrer">
                    View Resume
                  </a>
                ) : '−'}
              </div>
            </div>
            <div className="info-row">
              <div className="info-label">Found Via</div>
              <div className="info-value">{student.howTheyHeard || '−'}</div>
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



          {/* Student Availability section - Grid Layout */}
            <div className="avail-card">
              <div className="label big">Student Availability</div>
              <div className="avail-matrix">
                {/* Day headers */}
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map((dayShort) => (
                  <div className="avail-day-header" key={dayShort}>{dayShort}</div>
                ))}
                
                {/* Morning row */}
                {['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].map((dayKey) => {
                  const blocks = availabilityMap[dayKey] || [];
                  const hasBlock = blocks.includes('morning');
                  return (
                    <span key={`${dayKey}-morning`} className={`avail-chip ${hasBlock ? 'on' : 'off'}`}>
                      Morning
                    </span>
                  );
                })}
                
                {/* Afternoon row */}
                {['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].map((dayKey) => {
                  const blocks = availabilityMap[dayKey] || [];
                  const hasBlock = blocks.includes('afternoon');
                  return (
                    <span key={`${dayKey}-afternoon`} className={`avail-chip ${hasBlock ? 'on' : 'off'}`}>
                      Afternoon
                    </span>
                  );
                })}
                
                {/* Evening row */}
                {['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].map((dayKey) => {
                  const blocks = availabilityMap[dayKey] || [];
                  const hasBlock = blocks.includes('evening');
                  return (
                    <span key={`${dayKey}-evening`} className={`avail-chip ${hasBlock ? 'on' : 'off'}`}>
                      Evening
                    </span>
                  );
                })}
              </div>
            </div>

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
          {/* Add available (previously preferred) dates section here */}
          {student.timeline && (
            <div className="available-dates-card">
              <div className="available-dates-label">Available Dates:</div>
              <div className="available-dates-value">
                {(() => {
                  const timelineStr = String(student.timeline).replace(/[−—-]/g, '-');
                  const match = timelineStr.match(/\s*(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/);
                  if (match) {
                    const startDate = new Date(match[1] + 'T12:00:00');
                    const endDate = new Date(match[2] + 'T12:00:00');
                    const formatDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
                  }
                  return student.timeline;
                })()}
              </div>
            </div>
          )}

          <div className="calendar-card">
            <Calendar
              onChange={(d) => { setScheduleDate(d); setScheduleTimeLabel(''); }}
              value={scheduleDate || calendarViewDate}
              tileDisabled={tileDisabled}
              minDetail="month"
              locale="en-US"
            />
          </div>

          <div className="times-card">
            {!scheduleDate ? (
              // Show inline message when no date selected
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', justifyContent: 'center', padding: '20px' }}>
                <div className="no-times" style={{ paddingLeft: 0, fontStyle: 'italic' }}>Please select a date first</div>
              </div>
            ) : (
              // Show times without title when date is selected
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
                {scheduleDate ? scheduleDate.toLocaleDateString() : '−/−/−'}
              </span>
              <span className="selected-time-pill">
                {scheduleTimeLabel || '−:−'}
              </span>
              {scheduleDate && (
                <span className="selected-time-pill tz">
                  {new Intl.DateTimeFormat([], { timeZoneName: 'short' }).format(scheduleDate).split(' ').pop()}
                </span>
              )}
            </div>
          </div>

          <div className="bottom-section">
            <button className="propose-meeting-btn" onClick={handleSend}>
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
