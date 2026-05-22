import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Menu, X, LayoutDashboard, ListTodo, User, Shield, LogOut, Zap, Bell, Clock, Users, Trophy, Award, Target, Wallet, FileText, BadgeCheck, Mic } from 'lucide-react';

import logo from '../../assets/logo.svg';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();

  let navItems = [];

  if (isAdmin) {
    navItems = [
      { to: '/dashboard?tab=dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/dashboard?tab=kyc', label: 'KYC Review', icon: BadgeCheck },
      { to: '/dashboard?tab=assignments', label: 'Direct Tasks', icon: Award },
      { to: '/dashboard?tab=tasks', label: 'Tasks', icon: ListTodo },
      { to: '/dashboard?tab=submissions', label: 'Submissions', icon: FileText },
      { to: '/dashboard?tab=withdrawals', label: 'Payments', icon: Wallet },
      { to: '/dashboard?tab=users', label: 'Users', icon: Users },
      { to: '/dashboard?tab=skills', label: 'Skills', icon: Target },
      { to: '/dashboard?tab=announcements', label: 'Announcements', icon: Mic },
    ];
  } else {
    navItems = [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/missions', label: 'My Missions', icon: Award, badgeKey: 'missions' },
      { to: '/tasks', label: 'Tasks', icon: ListTodo, badgeKey: 'tasks' },
      { to: '/withdraw', label: 'Withdraw', icon: Wallet },
      { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
      { to: '/announcements', label: 'Updates', icon: Bell },
      { to: '/profile', label: 'Profile', icon: User },
    ];
  }

  // --- Badge Logic ---
  const { request } = require('../../hooks/useApi')();
  const [badges, setBadges] = require('react').useState({ tasks: false, missions: false });

  require('react').useEffect(() => {
    if (!user || isAdmin) return;

    const checkNewItems = async () => {
      try {
        const [tasksRes, missionsRes] = await Promise.all([
          request('get', '/tasks/available'),
          request('get', '/assigned-tasks/my')
        ]);

        const tasksCount = tasksRes.data?.length || 0;
        const missionsCount = missionsRes.data?.filter(m => m.status === 'pending')?.length || 0;

        const seenTasks = parseInt(localStorage.getItem('seen_tasks_count') || '0', 10);
        const seenMissions = parseInt(localStorage.getItem('seen_missions_count') || '0', 10);

        setBadges({
          tasks: tasksCount > seenTasks,
          missions: missionsCount > seenMissions
        });

        // Store current counts for comparison later
        localStorage.setItem('current_tasks_count', tasksCount.toString());
        localStorage.setItem('current_missions_count', missionsCount.toString());
      } catch (err) {
        // Silent fail
      }
    };

    checkNewItems();
    const interval = setInterval(checkNewItems, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user, isAdmin]);

  const handleNavClick = (badgeKey) => {
    setIsOpen(false);
    if (badgeKey) {
      // Mark as seen
      const current = localStorage.getItem(`current_${badgeKey}_count`);
      if (current) localStorage.setItem(`seen_${badgeKey}_count`, current);
      setBadges(prev => ({ ...prev, [badgeKey]: false }));
    }
  };
  // --- End Badge Logic ---

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
            <div className="logo-icon" style={{ background: 'transparent', width: '32px', height: '32px' }}>
              <img src={logo} alt="Earnetix Logo" style={{ width: '100%', height: '100%' }} />
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
              onClick={() => handleNavClick(item.badgeKey)}
              style={{ position: 'relative' }}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {item.badgeKey && badges[item.badgeKey] && (
                <div style={{
                  position: 'absolute',
                  right: '16px',
                  width: '8px',
                  height: '8px',
                  background: '#ef4444',
                  borderRadius: '50%',
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
                }} />
              )}
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
