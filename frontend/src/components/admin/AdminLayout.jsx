import { 
  LayoutDashboard, 
  Users, 
  ListTodo, 
  CheckSquare, 
  Megaphone, 
  LogOut, 
  Settings, 
  Bell,
  Menu,
  X
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const AdminLayout = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { id: 'users', label: 'User Directory', icon: <Users size={20} /> },
    { id: 'tasks', label: 'Campaign Manager', icon: <ListTodo size={20} /> },
    { id: 'submissions', label: 'Review Center', icon: <CheckSquare size={20} /> },
    { id: 'announcements', label: 'Broadcasting', icon: <Megaphone size={20} /> },
  ];

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const handleLogout = () => {
    // Basic logout logic - in real app, clear tokens
    localStorage.removeItem('token');
    navigate('/admin/login');
  };

  return (
    <div className="admin-layout-new">
      {/* Sidebar */}
      <aside className={`admin-sidebar-new ${!isSidebarOpen ? 'collapsed' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="logo-icon">
            <LayoutDashboard size={24} color="white" />
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>EARNITIX <span style={{ color: '#3b82f6', fontSize: '0.7rem', display: 'block' }}>ADMIN SUITE</span></h1>
        </div>

        <nav className="admin-nav">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className={`admin-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleTabChange(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer" style={{ padding: '24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="admin-nav-item" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-content-new">
        <header className="flex-between" style={{ marginBottom: '40px' }}>
          <div>
            <h2 className="fade-in-right">Welcome back, Administrator</h2>
            <p className="subtitle">System Health: <span className="text-success">Optimal</span></p>
          </div>
          <div className="flex-gap">
            <button className="btn-icon"><Bell size={18} /></button>
            <button className="btn-icon"><Settings size={18} /></button>
            <div className="admin-profile" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '6px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
               <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>A</div>
               <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Main Admin</span>
            </div>
          </div>
        </header>

        <div className="fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
