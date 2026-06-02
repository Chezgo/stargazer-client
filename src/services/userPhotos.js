import api from './api';
import axios from 'axios';
import userAssembliesApi from '@/services/userAssemblies';

export default {
  /**
   * Получить список фото пользователя (с пагинацией)
   */
  async getMyPhotos(params = {}) {
    const defaultParams = { page: 0, size: 12, ...params };
    const response = await api.get('/photos/my', { params: defaultParams });
    return response.data;
  },

  /**
   * Получить presigned URL для отображения фото
   */
  async getPhotoUrl(photoId) {
    const response = await api.get(`/photos/${photoId}/url`);
    return response.data.url;
  },

  /**
   * Загрузить новое фото (multipart/form-data) с прогрессом
   */
  async uploadPhoto(file, assemblyId, onProgress) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Получаем токен из auth store
    const authStore = await import('@/stores/auth');
    const token = authStore.useAuthStore().token;
    
    // Создаём отдельный axios инстанс для upload с отслеживанием прогресса
    const uploadApi = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL,
      headers: { 
        'Content-Type': 'multipart/form-data',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    
    const url = assemblyId 
      ? `/photos/upload?assemblyId=${assemblyId}`
      : '/photos/upload';
    
    return uploadApi.post(url, formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      }
    });
  },

  /**
   * Удалить фото
   */
  async deletePhoto(photoId) {
    await api.delete(`/photos/${photoId}`);
  },

  /**
   * Получить информацию о сборке для фото
   */
  async getAssemblyForPhoto(assemblyId) {
    return userAssembliesApi.getById(assemblyId);
  },

  /**
   * Получить список сборок пользователя (для dropdown при загрузке)
   */
  async getUserAssemblies() {
    return userAssembliesApi.getAll({ size: 100 });
  }
};