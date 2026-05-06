import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) { setLoading(false); setIsRefreshing(false); return; }
      const { data } = await api.get('/users/profile');
      setUser(data.data);
      localStorage.setItem('user', JSON.stringify(data.data));
    } catch {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const login = (accessToken, userData) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isProfileComplete = user?.isProfileComplete;

  return (
    <AuthContext.Provider value={{ user, setUser, loading, isRefreshing, login, logout, isAdmin, isProfileComplete, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
