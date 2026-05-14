import axios from 'axios';

// Ensure baseURL ends with a slash to prevent path dropping when using relative URLs
const baseURL = import.meta.env.VITE_API_URL || '/api';
const normalizedBaseURL = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;

const api = axios.create({
  baseURL: normalizedBaseURL,
  withCredentials: true,
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

// Response interceptor — auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
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
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
