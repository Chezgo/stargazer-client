import axios from 'axios';
import { useAuthStore } from '@/stores/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// 🔑 Авто-подстановка токена
api.interceptors.request.use(async (config) => {
  const authStore = useAuthStore();
  
  if (authStore.authenticated && authStore.token) {
    // Проверяем, не истёк ли токен
    if (authStore.expiresAt && Date.now() >= authStore.expiresAt - 5000) {
      try {
        // Пытаемся обновить токен
        await authStore.refreshTokens();
      } catch (err) {
        // Если не удалось — разлогиниваем
        authStore.logout();
        return Promise.reject(err);
      }
    }
    
    config.headers.Authorization = `Bearer ${authStore.token}`;
  }
  
  return config;
});

// 🔄 Обработка 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const authStore = useAuthStore();
      authStore.logout();
    }
    return Promise.reject(err);
  }
);

export default api;