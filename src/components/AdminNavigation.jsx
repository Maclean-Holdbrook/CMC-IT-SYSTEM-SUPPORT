import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth';
import './AdminNavigation.css';

const AdminNavigation = ({ title, subtitle }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const isActive = (path) => location.pathname === path;

  const navigateTo = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <>
      <div className="dashboard-header">
        <div className="header-content">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="header-actions">
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
          <button
            className="hamburger-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      {/* Desktop Navigation */}
      <div className="dashboard-nav">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className={`nav-btn ${isActive('/admin/dashboard') ? 'active' : ''}`}
        >
          Dashboard
        </button>
        <button
          onClick={() => navigate('/admin/complaints')}
          className={`nav-btn ${isActive('/admin/complaints') ? 'active' : ''}`}
        >
          Complaints
        </button>
        <button
          onClick={() => navigate('/admin/workers')}
          className={`nav-btn ${isActive('/admin/workers') ? 'active' : ''}`}
        >
          Workers
        </button>
        <button
          onClick={() => navigate('/admin/settings')}
          className={`nav-btn ${isActive('/admin/settings') ? 'active' : ''}`}
        >
          Settings
        </button>
      </div>

      {/* Mobile Slide Drawer */}
      <div className={`mobile-drawer ${menuOpen ? 'open' : ''}`}>
        <div className="drawer-overlay" onClick={() => setMenuOpen(false)}></div>
        <div className="drawer-content">
          <div className="drawer-header">
            <h3>Menu</h3>
            <span className="drawer-hint">Tap outside to close</span>
          </div>
          <nav className="drawer-nav">
            <button
              onClick={() => navigateTo('/admin/dashboard')}
              className={`drawer-nav-btn ${isActive('/admin/dashboard') ? 'active' : ''}`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => navigateTo('/admin/complaints')}
              className={`drawer-nav-btn ${isActive('/admin/complaints') ? 'active' : ''}`}
            >
              📋 Complaints
            </button>
            <button
              onClick={() => navigateTo('/admin/workers')}
              className={`drawer-nav-btn ${isActive('/admin/workers') ? 'active' : ''}`}
            >
              👷 Workers
            </button>
            <button
              onClick={() => navigateTo('/admin/settings')}
              className={`drawer-nav-btn ${isActive('/admin/settings') ? 'active' : ''}`}
            >
              ⚙️ Settings
            </button>
            <button
              onClick={() => {
                handleLogout();
                setMenuOpen(false);
              }}
              className="drawer-nav-btn logout"
            >
              🚪 Logout
            </button>
          </nav>
        </div>
      </div>
    </>
  );
};

export default AdminNavigation;
