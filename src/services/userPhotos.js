import api from './api';
import userAssembliesApi from '@/services/userAssemblies';

export default {
  async getMyPhotos(params = {}) {
    const defaultParams = { page: 0, size: 12, ...params };
    const response = await api.get('/photos/my', { params: defaultParams });
    return response.data;
  },

  async getPhotoUrl(photoId) {
    const response = await api.get(`/photos/${photoId}/url`);
    return response.data.url;
  },

  async uploadPhoto(file, assemblyId, onProgress) {
    if (!(file instanceof File)) throw new TypeError('Не выбран файл для загрузки');
    if (!assemblyId) throw new TypeError('Для загрузки фотографии необходимо выбрать сборку');

    const formData = new FormData();
    formData.append('file', file, file.name);

    return api.post('/photos/upload', formData, {
      params: { assemblyId },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      }
    });
  },

  async updatePhoto(photoId, data) {
    const response = await api.patch(`/photos/${photoId}`, data);
    return response.data;
  },

  async deletePhoto(photoId) {
    await api.delete(`/photos/${photoId}`);
  },

  async getAssemblySnapshot(photoId) {
    const response = await api.get(`/photos/${photoId}/assembly`);
    return response.data;
  },

  async getUserAssemblies() {
    return userAssembliesApi.getAll({ size: 100 });
  }
};
