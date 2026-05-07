import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Menu, X, LayoutDashboard, ListTodo, User, Shield, LogOut, Zap, Bell, Clock, Users } from 'lucide-react';

const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();

  let navItems = [];

  if (isAdmin) {
    navItems = [
      { to: '/admin?tab=dashboard', label: 'Overview', icon: Shield },
      { to: '/admin?tab=submissions', label: 'Submissions', icon: Clock },
      { to: '/admin?tab=tasks', label: 'Tasks Mgmt', icon: ListTodo },
      { to: '/admin?tab=users', label: 'User Directory', icon: Users },
      { to: '/admin?tab=announcements', label: 'Announcements', icon: Bell },
    ];
  } else {
    navItems = [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/tasks', label: 'Tasks', icon: ListTodo },
      { to: '/announcements', label: 'Updates', icon: Bell },
      { to: '/profile', label: 'Profile', icon: User },
    ];
  }

  const isActive = (path) => {
    const [pathname, search] = path.split('?');
    return location.pathname === pathname && (!search || location.search.includes(search));
  };

  return (
    <>
      {/* Mobile toggle */}
      <button className="sidebar-toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu">
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <Link to="/dashboard" onClick={() => setOpen(false)}>
            <div className="sidebar-logo">
              <Zap size={22} fill="white" />
            </div>
            <div>
              <h2>EARNETIX</h2>
              <span>Premium Rewards</span>
            </div>
          </Link>
          <button className="sidebar-mobile-close" onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main Menu</div>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`sidebar-link ${isActive(item.to) ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <item.icon size={20} className="sidebar-icon" />
              <span>{item.label}</span>
              {isActive(item.to) && <div className="sidebar-active-pill" />}
            </Link>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{user?.name}</p>
              <p className="sidebar-user-role">{isAdmin ? 'Administrator' : 'Verified User'}</p>
            </div>
          </div>
          <button className="sidebar-logout-btn" onClick={logout}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <style>{`
        .sidebar-toggle {
          position: fixed; top: 12px; left: 12px; z-index: 950;
          background: var(--dark-800); border: 1px solid var(--dark-700);
          color: var(--white); width: 40px; height: 40px; border-radius: 12px;
          cursor: pointer; display: none; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        @media (max-width: 1024px) { .sidebar-toggle { display: none; } } /* Hide toggle on mobile because we have BottomNav */

        .sidebar-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px); z-index: 999; display: none;
          animation: fadeIn 0.3s ease;
        }
        @media (max-width: 1024px) { 
          .sidebar-overlay.open { display: block; } 
        }

        .sidebar {
          position: fixed; left: 0; top: 0; bottom: 0; width: 280px;
          background: var(--dark-950); border-right: 1px solid var(--dark-800);
          display: flex; flex-direction: column; z-index: 1000;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @media (max-width: 1024px) {
          .sidebar { transform: translateX(-100%); box-shadow: 20px 0 50px rgba(0,0,0,0.5); }
          .sidebar.sidebar-open { transform: translateX(0); }
        }

        .sidebar-brand {
          padding: 32px 24px; display: flex; align-items: center; justify-content: space-between;
        }
        .sidebar-brand a { display: flex; align-items: center; gap: 14px; text-decoration: none; }
        .sidebar-logo {
          width: 42px; height: 42px; border-radius: 12px;
          background: linear-gradient(135deg, var(--blue), var(--blue-dark));
          display: flex; align-items: center; justify-content: center;
          color: var(--white); box-shadow: 0 4px 12px var(--blue-glow);
        }
        .sidebar-brand h2 { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.02em; margin: 0; line-height: 1; }
        .sidebar-brand span { font-size: 0.75rem; color: var(--gray-500); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        
        .sidebar-mobile-close {
          display: none; background: var(--dark-800); border: none; color: var(--gray-400);
          width: 32px; height: 32px; border-radius: 8px; cursor: pointer;
        }
        @media (max-width: 1024px) { .sidebar-mobile-close { display: flex; align-items: center; justify-content: center; } }

        .sidebar-nav { flex: 1; padding: 0 16px; display: flex; flex-direction: column; gap: 6px; }
        .sidebar-section-label { 
          padding: 0 16px; margin: 20px 0 10px; font-size: 0.7rem; 
          font-weight: 700; color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.1em;
        }

        .sidebar-link {
          display: flex; align-items: center; gap: 14px; padding: 14px 16px;
          border-radius: 14px; color: var(--gray-400); font-size: 0.95rem; font-weight: 600;
          text-decoration: none; transition: all 0.2s ease; position: relative;
        }
        .sidebar-link:hover { background: var(--dark-800); color: var(--white); }
        .sidebar-link.active { background: var(--blue-glow); color: var(--blue-light); }
        .sidebar-active-pill {
          position: absolute; left: 0; width: 4px; height: 20px; 
          background: var(--blue); border-radius: 0 4px 4px 0;
        }

        .sidebar-footer { padding: 24px; border-top: 1px solid var(--dark-800); background: var(--black); }
        .sidebar-user-card { 
          display: flex; align-items: center; gap: 12px; padding: 12px;
          background: var(--dark-900); border-radius: 16px; border: 1px solid var(--dark-800);
          margin-bottom: 16px;
        }
        .sidebar-avatar {
          width: 40px; height: 40px; border-radius: 12px;
          background: linear-gradient(135deg, var(--blue-light), var(--blue));
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 1.1rem; color: var(--white);
        }
        .sidebar-user-name { font-size: 0.9rem; font-weight: 700; color: var(--white); margin: 0; }
        .sidebar-user-role { font-size: 0.75rem; color: var(--gray-500); margin: 2px 0 0; }

        .sidebar-logout-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
          padding: 14px; background: transparent; border: 1px solid var(--dark-700);
          border-radius: 12px; color: var(--gray-400); cursor: pointer; font-size: 0.9rem;
          font-weight: 600; transition: all 0.2s ease;
        }
        .sidebar-logout-btn:hover { border-color: var(--rejected); color: var(--rejected); background: rgba(239,68,68,0.05); }
      `}</style>
    </>
  );
};

export default Sidebar;
