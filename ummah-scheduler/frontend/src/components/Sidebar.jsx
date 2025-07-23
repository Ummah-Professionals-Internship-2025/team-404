// src/components/Sidebar.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="header-menu-wrapper">
      <div className="sidebar-toggle white" onClick={() => setOpen(!open)}>
        <div className="bar" />
        <div className="bar" />
        <div className="bar" />
      </div>

      <div className={`sidebar ${open ? 'open' : ''}`}>
        <button onClick={() => { setOpen(false); navigate('/'); }}>Dashboard</button>
        <button onClick={() => { setOpen(false); navigate('/followup'); }}>Follow-Up</button>
        <button onClick={() => { setOpen(false); navigate('/admin-login'); }}>Admin Login</button>
      </div>
    </div>
  );
}
