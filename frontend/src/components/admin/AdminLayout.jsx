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
  X,
  Shield
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const AdminLayout = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

  // Close sidebar on mobile when tab changes
  useEffect(() => {
    if (window.innerWidth <= 1024) {
      setIsSidebarOpen(false);
    }
  }, [activeTab]);

  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { id: 'users', label: 'User Directory', icon: <Users size={20} /> },
    { id: 'tasks', label: 'Campaign Manager', icon: <ListTodo size={20} /> },
    { id: 'submissions', label: 'Review Center', icon: <CheckSquare size={20} /> },
    { id: 'reports', label: 'Intelligence', icon: <Shield size={20} /> },
    { id: 'announcements', label: 'Broadcasting', icon: <Megaphone size={20} /> },
  ];

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/admin/login');
  };

  return (
    <div className="admin-layout-new">
      {/* Mobile Toggle */}
      <button 
        className="admin-mobile-toggle" 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isSidebarOpen && window.innerWidth <= 1024 && (
        <div className="admin-sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}

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
        <header className="flex-between admin-main-header" style={{ marginBottom: '40px' }}>
          <div>
            <h2 className="fade-in-right">Welcome back, Administrator</h2>
            <p className="subtitle">System Health: <span className="text-success">Optimal</span></p>
          </div>
          <div className="flex-gap admin-header-actions">
            <button className="btn-icon"><Bell size={18} /></button>
            <button className="btn-icon"><Settings size={18} /></button>
            <div className="admin-profile">
               <div className="avatar-small">A</div>
               <span className="profile-name">Main Admin</span>
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
