import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ListTodo, Award, User, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const BottomNav = () => {
  const { isAdmin } = useAuth();

  const navItems = isAdmin ? [
    { to: '/admin?tab=dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/admin?tab=assignments', label: 'Missions', icon: Award },
    { to: '/admin?tab=submissions', label: 'Subs', icon: Shield },
    { to: '/admin?tab=users', label: 'Users', icon: User },
  ] : [
    { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/missions', label: 'Missions', icon: Award },
    { to: '/tasks', label: 'Campaigns', icon: ListTodo },
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
