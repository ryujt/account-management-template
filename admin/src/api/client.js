import axios from 'axios';
import useAuthStore from '../stores/authStore';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  withCredentials: true,
});

let refreshPromise = null;

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const url = original.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh');
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;

      if (!refreshPromise) {
        refreshPromise = useAuthStore
          .getState()
          .refresh()
          .finally(() => {
            refreshPromise = null;
          });
      }

      try {
        await refreshPromise;
        const token = useAuthStore.getState().accessToken;
        original.headers.Authorization = `Bearer ${token}`;
        return client(original);
      } catch {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export default client;
