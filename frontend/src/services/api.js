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

// Response interceptor — auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true });
        localStorage.setItem('accessToken', data.data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
