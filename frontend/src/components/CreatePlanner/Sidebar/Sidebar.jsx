import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';
import { logout } from '../../../api';

export default function Sidebar({ isCollapsed, onToggle, activeTab = 'planner' }) {
  const navigate = useNavigate();

  return (
    <div className={`sidebar-container ${isCollapsed ? 'collapsed' : ''}`}>
      <button className="sidebar-toggle" onClick={onToggle}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {isCollapsed ? <path d="M9 18l6-6-6-6"/> : <path d="M15 18l-6-6 6-6"/>}
        </svg>
      </button>

      <div className="sidebar-header">
        <svg className="sidebar-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
        </svg>
        {!isCollapsed && <span className="sidebar-title">AUI Planner</span>}
      </div>

      {!isCollapsed && <div className="sidebar-label">GENERAL</div>}
      
      <button 
        className={`sidebar-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => navigate('/dashboard')} 
        title="Dashboard"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
        {!isCollapsed && <span>Dashboard</span>}
      </button>

      <button 
        className={`sidebar-btn ${activeTab === 'planner' ? 'active' : ''}`}
        onClick={() => navigate('/create-planner')} 
        title="Degree Planner"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        {!isCollapsed && <span>Degree Planner</span>}
      </button>

      <button 
        className="sidebar-btn logout" 
        onClick={async () => { await logout(); navigate('/login'); }} 
        title="Log out"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        {!isCollapsed && <span>Log out</span>}
      </button>
    </div>
  );
}