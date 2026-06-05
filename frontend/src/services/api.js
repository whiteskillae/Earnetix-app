import axios from 'axios';
import { toast } from 'react-hot-toast';

// Ensure baseURL ends with a slash to prevent path dropping when using relative URLs
const baseURL = import.meta.env.VITE_API_URL || '/api';
const normalizedBaseURL = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;

const api = axios.create({
  baseURL: normalizedBaseURL,
  withCredentials: true,
  timeout: 30000, // 30s — backend now responds in <500ms; this handles slow networks
});

// Request interceptor — attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  // Strip leading slash from the URL to ensure it's appended to the baseURL correctly
  if (config.url && config.url.startsWith('/')) {
    config.url = config.url.substring(1);
  }
  
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// Simple debounce for server error toasts to prevent spam
let lastServerErrorToast = 0;
const showServerErrorToast = (message) => {
  const now = Date.now();
  if (now - lastServerErrorToast > 3000) { // 3 seconds cooldown
    toast.error(message, { id: 'server-error-toast', duration: 5000 });
    lastServerErrorToast = now;
  }
};

// Response interceptor — auto-refresh on 401 and handle global errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    
    // Global Error Handling for Server Overload & High Traffic
    if (status === 429) {
      showServerErrorToast('High traffic detected. Please try again later.');
    } else if (status >= 500) {
      showServerErrorToast('Server is experiencing high traffic or is temporarily down. Please try again later.');
    }

    // If we get a 401, try to refresh the token regardless of the specific error code
    // (This handles cases where the token is missing from localStorage but a refresh cookie exists)
    if (status === 401 && !originalRequest._retry) {
      // Don't try to refresh if the request itself was to a public authentication endpoint
      const bypassRefreshUrls = ['auth/refresh', 'auth/login', 'auth/register', 'auth/google'];
      const shouldBypass = bypassRefreshUrls.some(url => originalRequest.url?.includes(url));
      
      if (shouldBypass) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshURL = `${normalizedBaseURL}auth/refresh`.replace(/([^:]\/)\/+/g, "$1");
        const { data } = await axios.post(refreshURL, {}, { withCredentials: true });
        const newToken = data.data.accessToken;
        
        localStorage.setItem('accessToken', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        
        // Prevent redirect loops: only redirect if we're not already on the login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Handle blocked users — force logout on 403
    if (status === 403) {
      const msg = error.response?.data?.message || '';
      if (msg.includes('blocked') || msg.includes('Account has been')) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
