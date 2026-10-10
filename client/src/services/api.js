import axios from 'axios';

function getApiBaseUrl() {
  if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost')) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // If user opens from mobile on local Wi-Fi, point to host PC on port 5000
    const isPrivateIp = /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(host);
    if (isPrivateIp) {
      return `${window.location.protocol}//${host}:5000/api`;
    }
    // If hosted on a live domain (e.g. production cloud/VPS)
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return `${window.location.origin}/api`;
    }
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
}

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Catch 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // If token expired while navigating, gently redirect to login page
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Health check service function
 */
export const checkHealth = async () => {
  try {
    const startTime = performance.now();
    const response = await api.get('/health');
    const endTime = performance.now();
    return {
      success: true,
      latencyMs: Math.round(endTime - startTime),
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Cannot reach API server',
    };
  }
};

export default api;
