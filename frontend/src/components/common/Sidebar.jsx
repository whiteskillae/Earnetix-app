import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Menu, X, LayoutDashboard, ListTodo, User, Shield, LogOut, Zap, Bell } from 'lucide-react';

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
              <Zap size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h2>EARNETIX</h2>
              <span>Earn · Grow · Repeat</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`sidebar-link ${isActive(item.to) ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {isActive(item.to) && <div className="sidebar-active-indicator" />}
            </Link>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
            <div>
              <p className="sidebar-user-name">{user?.name}</p>
              <p className="sidebar-user-points"><Zap size={12} /> {user?.points || 0} pts</p>
            </div>
          </div>
          <button className="sidebar-logout" onClick={logout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <style>{`
        .sidebar-toggle {
          position: fixed; top: 16px; left: 16px; z-index: 1001;
          background: var(--dark-800); border: 1px solid var(--dark-600);
          color: var(--white); padding: 8px; border-radius: var(--radius-md);
          cursor: pointer; display: none;
        }
        @media (max-width: 768px) { .sidebar-toggle { display: flex; } }

        .sidebar-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          z-index: 999; display: none;
        }
        @media (max-width: 768px) { .sidebar-overlay { display: block; } }

        .sidebar {
          position: fixed; left: 0; top: 0; bottom: 0; width: 260px;
          background: var(--dark-900); border-right: 1px solid var(--dark-600);
          display: flex; flex-direction: column; z-index: 1000;
          transition: transform var(--transition-base);
        }
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.sidebar-open { transform: translateX(0); }
        }

        .sidebar-brand a {
          display: flex; align-items: center; gap: 12px;
          padding: 24px 20px; text-decoration: none;
        }
        .sidebar-logo {
          width: 40px; height: 40px; border-radius: var(--radius-md);
          background: linear-gradient(135deg, var(--blue), var(--green));
          display: flex; align-items: center; justify-content: center;
          color: var(--white);
        }
        .sidebar-brand h2 {
          font-family: var(--font-heading); font-size: 1.1rem;
          color: var(--white); letter-spacing: 1px;
        }
        .sidebar-brand span { font-size: 0.7rem; color: var(--gray-400); }

        .sidebar-nav {
          flex: 1; padding: 8px 12px; display: flex;
          flex-direction: column; gap: 4px;
        }

        .sidebar-link {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px; border-radius: var(--radius-md);
          color: var(--gray-300); font-size: 0.9rem; font-weight: 500;
          text-decoration: none; position: relative;
          transition: all var(--transition-fast);
        }
        .sidebar-link:hover { background: var(--dark-700); color: var(--white); }
        .sidebar-link.active {
          background: var(--blue-glow); color: var(--blue-light);
        }
        .sidebar-active-indicator {
          position: absolute; right: -12px; top: 50%; transform: translateY(-50%);
          width: 3px; height: 24px; background: var(--blue);
          border-radius: 3px 0 0 3px;
        }

        .sidebar-footer {
          padding: 16px; border-top: 1px solid var(--dark-600);
        }
        .sidebar-user {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 12px;
        }
        .sidebar-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, var(--blue), var(--green));
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 0.9rem; color: var(--white);
        }
        .sidebar-user-name { font-size: 0.85rem; font-weight: 600; color: var(--white); }
        .sidebar-user-points {
          font-size: 0.75rem; color: var(--green);
          display: flex; align-items: center; gap: 4px;
        }

        .sidebar-logout {
          width: 100%; display: flex; align-items: center; gap: 8px;
          padding: 10px 16px; background: transparent;
          border: 1px solid var(--dark-600); border-radius: var(--radius-md);
          color: var(--gray-300); cursor: pointer; font-size: 0.85rem;
          transition: all var(--transition-fast);
        }
        .sidebar-logout:hover {
          border-color: var(--rejected); color: var(--rejected);
          background: rgba(255,77,79,0.1);
        }
      `}</style>
    </>
  );
};

export default Sidebar;
