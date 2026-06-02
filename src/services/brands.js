import api from './api';

export default {
  /**
   * Получить все бренды
   */
  async getAll() {
    const response = await api.get('/brand-detail');
    return response.data;
  }
};