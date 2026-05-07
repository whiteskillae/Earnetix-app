import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ListTodo, Bell, User, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const BottomNav = () => {
  const { isAdmin } = useAuth();

  const navItems = isAdmin ? [
    { to: '/admin?tab=dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/admin?tab=submissions', label: 'Subs', icon: Shield },
    { to: '/admin?tab=tasks', label: 'Tasks', icon: ListTodo },
    { to: '/admin?tab=users', label: 'Users', icon: User },
  ] : [
    { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/tasks', label: 'Tasks', icon: ListTodo },
    { to: '/announcements', label: 'Updates', icon: Bell },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <NavLink 
          key={item.to} 
          to={item.to} 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <item.icon size={22} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
