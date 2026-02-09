import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;

    if (response) {
      // Handle specific HTTP status codes
      switch (response.status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('token');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          break;
        case 403:
          // Forbidden - user doesn't have permission
          console.error('Access forbidden:', response.data?.message);
          break;
        case 404:
          // Not found
          console.error('Resource not found:', response.data?.message);
          break;
        case 422:
          // Validation error
          console.error('Validation error:', response.data?.errors);
          break;
        case 500:
          // Server error
          console.error('Server error:', response.data?.message);
          break;
        default:
          console.error('API error:', response.data?.message);
      }
    } else if (error.request) {
      // Network error - no response received
      console.error('Network error: No response received');
    } else {
      // Request setup error
      console.error('Request error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
