import api from './api';

export default {
  /**
   * Получить профиль текущего пользователя
   */
  async getProfile() {
    try {
      const response = await api.get('/user-profile/profile');
      return { success: true, data: response.data };
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: false, error: 'NOT_FOUND', data: error.response.data };
      }
      throw error;
    }
  },

  /**
   * Создать профиль для текущего пользователя
   */
  async createProfile() {
    const response = await api.post('/user-profile/profile');
    return response.data;
  }
};