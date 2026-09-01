import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import { appConfig } from '@/config/appConfig';

const api = axios.create({
  baseURL: appConfig.apiBaseUrl
});

export const getApiErrorMessage = (err, fallback = 'Request failed') => {
  if (err.response?.data?.errorMessage?.message) return err.response.data.errorMessage.message;
  if (err.response?.data?.message) return err.response.data.message;
  if (err.response?.data?.error) return err.response.data.error;
  if (err.response?.status) return `${fallback} (${err.response.status})`;
  if (err.request) return 'Network error. Please check your connection.';
  return err.message || fallback;
};

api.interceptors.request.use(async (config) => {
  const authStore = useAuthStore();

  // Не задаём Content-Type вручную для FormData: браузер сам добавит
  // multipart/form-data с обязательным boundary. Иначе Axios может
  // сериализовать FormData как JSON и Spring не увидит параметр `file`.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (typeof config.headers?.delete === 'function') {
      config.headers.delete('Content-Type');
    } else if (config.headers) {
      delete config.headers['Content-Type'];
    }
  }

  if (authStore.authenticated && authStore.token) {
    await authStore.ensureValidToken();
    config.headers.Authorization = `Bearer ${authStore.token}`;
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const authStore = useAuthStore();

      try {
        await authStore.refreshTokens();
        originalRequest.headers.Authorization = `Bearer ${authStore.token}`;
        return api(originalRequest);
      } catch (refreshErr) {
        authStore.logout();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(err);
  }
);

export default api;
