import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

const Layout = () => {
  const { user, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Close mobile menu when route changes
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <Link to="/dashboard">Expense Tracker</Link>
          </div>
          
          <button 
            className="mobile-menu-toggle" 
            onClick={toggleMobileMenu}
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
          
          <nav className={`main-nav ${mobileMenuOpen ? 'open' : ''}`}>
            <ul className="nav-links">
              <li className={location.pathname === '/dashboard' ? 'active' : ''}>
                <Link to="/dashboard">Dashboard</Link>
              </li>
              <li className={location.pathname.startsWith('/expenses') ? 'active' : ''}>
                <Link to="/expenses">My Expenses</Link>
              </li>
              
              {isAdmin && (
                <>
                  <li className={location.pathname === '/analytics' ? 'active' : ''}>
                    <Link to="/analytics">Analytics</Link>
                  </li>
                  <li className={location.pathname === '/audit-logs' ? 'active' : ''}>
                    <Link to="/audit-logs">Audit Logs</Link>
                  </li>
                </>
              )}
            </ul>
            
            <div className="user-menu">
              <div className="user-info">
                <span className="user-name">{user?.name}</span>
                <span className="user-role">{isAdmin ? 'Admin' : 'Employee'}</span>
              </div>
              <div className="dropdown">
                <button className="dropdown-toggle">
                  <span className="user-avatar">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </button>
                <div className="dropdown-menu">
                  <Link to="/profile" className="dropdown-item">Profile</Link>
                  <button onClick={handleLogout} className="dropdown-item">Logout</button>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        <div className="container">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Expense Tracker. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
