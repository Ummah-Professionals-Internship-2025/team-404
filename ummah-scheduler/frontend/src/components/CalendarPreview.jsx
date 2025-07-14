// src/components/CalendarPreview.jsx
import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './CalendarPreview.css';

export default function CalendarPreview({ availability = '', timeline = '', onSelect }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());

  const availabilityMap = parseAvailability(availability);   
  const timelineDates   = parseTimeline(timeline);  

  useEffect(() => {
    if (selectedDate) {
      onSelect(new Date(selectedDate).toISOString());
    }
  }, [selectedDate, onSelect]);

  // 👇 New: shift calendar view to start of timeline if available
  useEffect(() => {
    if (timelineDates?.start) {
      setCalendarViewDate(timelineDates.start);
    }
  }, [timelineDates]);

  function parseAvailability(raw) {
    if (!raw) return {};

    const cleaned = raw
      .replace(/[\n\t]+/g, ' ')
      .replace(/,\s*/g, ',')
      .trim()
      .toLowerCase();

    if (cleaned.includes('anytime')) {
      const allDays = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
      const map = {};
      allDays.forEach((d) => (map[d] = ['morning','afternoon','evening']));
      return map;
    }

    const map = {};
    cleaned.split(',').forEach((item) => {
      const parts = item.trim().split(/[\s:]+/);
      const [day, part] = parts;
      if (!day || !part) return;
      if (!map[day]) map[day] = [];
      if (!map[day].includes(part)) map[day].push(part);
    });
    return map;
  }

  function parseTimeline(raw) {
    if (!raw) return null;
    const normalised = raw.replace(/[–—−]/g, '-');
    const m = normalised.match(/\s*(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/);
    if (!m) return null;
    const start = new Date(m[1] + 'T00:00:00');
    const end   = new Date(m[2] + 'T23:59:59');
    return isNaN(start) || isNaN(end) ? null : { start, end };
  }

  function isAvailableDay(date) {
    const day = date.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    return Boolean(availabilityMap[day]);
  }

  function tileDisabled({ date, view }) {
    if (view !== 'month') return false;
    if (timelineDates) {
      const { start, end } = timelineDates;
      if (date < start || date > end) return true;
    }
    return !isAvailableDay(date);
  }

  function generateTimeOptions(date) {
    const day = date.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    const blocks = availabilityMap[day] || [];
    const times = [];
    if (blocks.includes('morning'))   times.push(...['07:00','08:00','09:00','10:00','11:00']);
    if (blocks.includes('afternoon')) times.push(...['12:00','13:00','14:00','15:00']);
    if (blocks.includes('evening'))   times.push(...['16:00','17:00','18:00','19:00']);
    return times;
  }

  const handleDateChange = (date) => setSelectedDate(date);

  return (
    <div className="calendar-wrapper">
      <Calendar
        onChange={handleDateChange}
        value={selectedDate || calendarViewDate}
        tileDisabled={tileDisabled}
        minDetail="month"
      />

      {selectedDate && (
        <div className="time-selector mt-3">
          <label className="block mb-1 font-medium">Select Time:</label>
          <select
            className="border rounded px-2 py-1"
            defaultValue=""
            onChange={(e) => {
              const [hh, mm] = e.target.value.split(':');
              const d = new Date(selectedDate);
              d.setHours(+hh, +mm, 0, 0);
              setSelectedDate(d);
            }}
          >
            <option value="" disabled>--</option>
            {generateTimeOptions(selectedDate).map((t) => (
              <option key={t} value={t}>{formatTimeLabel(t)}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function formatTimeLabel(timeStr) {
  const [hour, minute] = timeStr.split(':');
  const d = new Date();
  d.setHours(+hour, +minute);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
