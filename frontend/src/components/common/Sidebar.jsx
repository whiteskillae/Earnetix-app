import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Menu, X, LayoutDashboard, ListTodo, User, Shield, LogOut, Zap, Bell, Clock, Users, Trophy, Award, Target, Wallet, FileText, BadgeCheck, Mic } from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();

  let navItems = [];

  if (isAdmin) {
    navItems = [
      { to: '/admin?tab=dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/admin?tab=kyc', label: 'KYC Review', icon: BadgeCheck },
      { to: '/admin?tab=assignments', label: 'Direct Tasks', icon: Award },
      { to: '/admin?tab=tasks', label: 'Tasks', icon: ListTodo },
      { to: '/admin?tab=submissions', label: 'Submissions', icon: FileText },
      { to: '/admin?tab=withdrawals', label: 'Payments', icon: Wallet },
      { to: '/admin?tab=users', label: 'Users', icon: Users },
      { to: '/admin?tab=skills', label: 'Skills', icon: Target },
      { to: '/admin?tab=announcements', label: 'Announcements', icon: Mic },
    ];
  } else {
    navItems = [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/missions', label: 'My Missions', icon: Award },
      { to: '/tasks', label: 'Tasks', icon: ListTodo },
      { to: '/withdraw', label: 'Withdraw', icon: Wallet },
      { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
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
      {/* Overlay */}
      <div 
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(false)} 
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-logo">
          <Link to="/dashboard" onClick={() => setIsOpen(false)} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="logo-icon">
              <Zap size={24} fill="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--white)', margin: 0 }}>EARNETIX</h2>
              <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Premium Rewards</span>
            </div>
          </Link>

          <button 
            className="sidebar-close-btn" 
            onClick={() => setIsOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label" style={{ padding: '0 18px', marginBottom: '12px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Main Menu</div>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`sidebar-link ${isActive(item.to) ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User info + logout */}
        <div style={{ marginTop: 'auto', padding: '10px 0' }}>
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
            background: 'var(--dark-900)', border: '1px solid var(--glass-border)', borderRadius: '20px',
            marginBottom: '12px'
          }}>
            <div className="user-avatar-wrap">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', margin: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.name}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--gray-500)', margin: 0, fontWeight: 600 }}>{isAdmin ? 'Admin' : 'Member'}</p>
            </div>
          </div>
          <button className="btn btn-outline btn-block" onClick={logout} style={{ justifyContent: 'flex-start', gap: '12px', borderRadius: '16px' }}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
