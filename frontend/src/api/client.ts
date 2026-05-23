import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';
export const api = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('access_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    } else if (status === 403) {
      const msg =
        err?.response?.data?.message ||
        'Bạn không có quyền thực hiện thao tác này.';
      try {
        window.dispatchEvent(
          new CustomEvent('app:toast', { detail: { type: 'error', text: msg } })
        );
      } catch {
        // ignore — environments without CustomEvent fall through
      }
    }
    return Promise.reject(err);
  }
);

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  warnings?: string[];
  errorCode?: string;
};
