import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/common/Sidebar';
import Loader from './components/common/Loader';

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


// Protected route wrapper
const ProtectedRoute = ({ children, adminOnly = false, isOnboarding = false }) => {
  const { user, loading, isAdmin, isRefreshing, isProfileComplete } = useAuth();
  if (loading || isRefreshing) return <Loader text="Verifying access..." />;
  
  if (!user) {
    if (adminOnly) return <AdminLoginPage />;
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if profile is incomplete (and not already on onboarding page)
  if (!isProfileComplete && !isOnboarding && user.role !== 'admin') {
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
const AppLayout = ({ children }) => (
  <div className="app-layout">
    <Sidebar />
    <main className="app-main">{children}</main>
  </div>
);

const AppRoutes = () => (
  <Suspense fallback={<Loader text="Loading module..." />}>
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute isOnboarding><OnboardingPage /></ProtectedRoute>} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><AppLayout><TasksPage /></AppLayout></ProtectedRoute>} />
      <Route path="/announcements" element={<ProtectedRoute><AppLayout><AnnouncementsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />

      {/* Admin only */}
      <Route path="/admin" element={<ProtectedRoute adminOnly><AppLayout><AdminPage /></AppLayout></ProtectedRoute>} />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Suspense>
);


const App = () => (
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <BrowserRouter>
      <AuthProvider>
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
  </GoogleOAuthProvider>
);

export default App;
