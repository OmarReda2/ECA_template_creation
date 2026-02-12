import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * Axios instance for the Template Creation Service API.
 * - Uses VITE_API_BASE_URL when set (e.g. production or direct API).
 * - When empty (e.g. dev with proxy), requests are same-origin and Vite proxies /api to the backend.
 */
export const http = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const ACCESS_TOKEN_KEY = 'access_token';

http.interceptors.request.use((config) => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    config.headers.set('X-Trace-Id', crypto.randomUUID());
  }
  return config;
});
