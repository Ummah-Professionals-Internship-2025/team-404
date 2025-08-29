// src/components/Header.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/white-horizontal.png';
import './Header.css';


export default function Header() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="custom-header">
      <div className="header-left" onClick={() => navigate('/')}>
        <img src={logo} alt="Ummah Professionals" className="header-logo" />
      </div>

      <div className="header-right">
        <div className="hamburger" onClick={() => setOpen(!open)}>
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>

        {open && (
          <div className="dropdown-menu">
            <button onClick={() => navigate('/')}>Dashboard</button>
            <button onClick={() => navigate('/followup')}>Follow Up</button>
            <button onClick={() => navigate('/admin-dashboard')}>Admin</button>
          </div>
        )}
      </div>
    </header>
  );
}
