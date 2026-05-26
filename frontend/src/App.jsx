import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/common/Sidebar';
import BottomNav from './components/common/BottomNav';
import MobileHeader from './components/common/MobileHeader';
import Loader from './components/common/Loader';
import KeepAlive from './components/common/KeepAlive';
import ErrorBoundaryFallback from './components/common/ErrorBoundary';

// Lazy loaded pages to optimize bundle size
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));
const MissionsPage = lazy(() => import('./pages/MissionsPage'));
const WithdrawalPage = lazy(() => import('./pages/WithdrawalPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogEditorPage = lazy(() => import('./pages/BlogEditorPage'));
const MorePage = lazy(() => import('./pages/MorePage'));
const PatchNotesPage = lazy(() => import('./pages/PatchNotesPage'));
const RulesPage = lazy(() => import('./pages/RulesPage'));
import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';


// Protected route wrapper
const ProtectedRoute = ({ children, adminOnly = false, isOnboarding = false }) => {
  const { user, loading, isAdmin, isRefreshing, isProfileComplete } = useAuth();
  if (loading) return <Loader text="Verifying access..." />;

  if (!user) {
    if (adminOnly) return <AdminLoginPage />;
    return <Navigate to="/login" replace />;
  }

  // Force blocked users to logout
  if (user.isBlocked) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if user is in processing stage (Profile or KYC incomplete)
  if (!isOnboarding && user.role !== 'admin' && (user.accountStatus === 'processing' || !isProfileComplete || user.kycStatus === 'none')) {
    return <Navigate to="/onboarding" replace />;
  }

  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};


// Guest-only route (redirect logged-in users)
const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader text="Loading..." />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

// Layout with sidebar
const AppLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <div style={{
        background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
        color: '#60a5fa',
        textAlign: 'center',
        padding: '0 16px',
        fontWeight: 600,
        fontSize: '0.75rem',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        zIndex: 99999,
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: '32px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}>
        <span style={{ fontSize: '0.9rem', color: '#3b82f6' }}>✨</span>
        <span style={{ textShadow: '0 0 10px rgba(96, 165, 250, 0.3)' }}>System Update: Earnetix is Now Live!</span>
        <span style={{ fontSize: '0.9rem', color: '#3b82f6' }}>✨</span>
      </div>
      <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="app-main">
        <div className="fade-in">
          {children}
        </div>
      </main>
      <BottomNav />

      {/* Floating Report Trigger */}
      <Link to="/reports" className="report-popup-trigger">
        <ShieldAlert size={28} />
      </Link>
    </div>
  );
};



const UnifiedDashboard = () => {
  const { user } = useAuth();
  if (user && user.role === 'admin') {
    return <AdminPage />;
  }
  return <AppLayout><DashboardPage /></AppLayout>;
};

const AppRoutes = () => (
  <Suspense fallback={null}>
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
      <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute isOnboarding><OnboardingPage /></ProtectedRoute>} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><UnifiedDashboard /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><AppLayout><TasksPage /></AppLayout></ProtectedRoute>} />
      <Route path="/announcements" element={<ProtectedRoute><AppLayout><AnnouncementsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><AppLayout><LeaderboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />
      <Route path="/more" element={<ProtectedRoute><AppLayout><MorePage /></AppLayout></ProtectedRoute>} />
      <Route path="/updates" element={<ProtectedRoute><AppLayout><PatchNotesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/rules" element={<ProtectedRoute><AppLayout><RulesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><AppLayout><ReportPage /></AppLayout></ProtectedRoute>} />
      <Route path="/missions" element={<ProtectedRoute><AppLayout><MissionsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/withdraw" element={<ProtectedRoute><AppLayout><WithdrawalPage /></AppLayout></ProtectedRoute>} />
      <Route path="/blog" element={<ProtectedRoute><AppLayout><BlogPage /></AppLayout></ProtectedRoute>} />
      <Route path="/blog/create" element={<ProtectedRoute><BlogEditorPage /></ProtectedRoute>} />
      <Route path="/blog/create/:taskId" element={<ProtectedRoute><BlogEditorPage /></ProtectedRoute>} />
      <Route path="/blog/edit/:blogId" element={<ProtectedRoute><BlogEditorPage /></ProtectedRoute>} />

      {/* Admin only (redirect to unified dashboard) */}
      <Route path="/admin" element={<Navigate to="/dashboard" replace />} />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Suspense>
);


const App = () => (
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <ErrorBoundaryFallback>
      <BrowserRouter>
        <AuthProvider>
          <KeepAlive />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1A1A1A',
                color: '#fff',
                border: '1px solid #2A2A2A',
                borderRadius: '10px',
                fontSize: '0.9rem',
              },
              success: { iconTheme: { primary: '#00D166', secondary: '#fff' } },
              error: { iconTheme: { primary: '#FF4D4F', secondary: '#fff' } },
            }}
          />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundaryFallback>
  </GoogleOAuthProvider>
);

export default App;
