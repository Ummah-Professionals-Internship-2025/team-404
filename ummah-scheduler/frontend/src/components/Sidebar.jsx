// src/components/Sidebar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';
import logoutIcon from '../assets/logout.svg';

export default function Sidebar({ isAdmin }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const sidebarRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="header-menu-wrapper" ref={sidebarRef}>
      <button 
        className={`hamburger hamburger--minus ${open ? 'is-active' : ''}`}
        type="button" 
        aria-label="Menu"
        onClick={() => setOpen(!open)}
      >
        <span className="hamburger-box">
          <span className="hamburger-inner"></span>
        </span>
      </button>

      <div className={`sidebar ${open ? 'open' : ''}`}>
        {isAdmin ? (
          <>
            <button onClick={() => { setOpen(false); navigate('/admin-dashboard'); }}>Dashboard</button>
            <button onClick={() => { setOpen(false); navigate('/admin-statistics'); }}>Statistics</button>
            <button onClick={() => { setOpen(false); navigate('/'); }}>
              <img src={logoutIcon} alt="" aria-hidden="true" className="exit-admin-icon" />
              Exit Admin
            </button>
          </>
        ) : (
          <>
            <button onClick={() => { setOpen(false); navigate('/'); }}>Dashboard</button>
            <button onClick={() => { setOpen(false); navigate('/followup'); }}>Follow-Up</button>
            <button onClick={() => { setOpen(false); navigate('/admin-login'); }}>Admin Login</button>
            <button
              onClick={() => {
                sessionStorage.removeItem("mentorEmail");
                window.location.href = "/login";
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
