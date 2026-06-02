import api from './api';

export default {
  /**
   * Получить список деталей с пагинацией и фильтрами
   */
  async getAll(params = {}) {
    const defaultParams = {
      page: 0,
      size: 10,
      ...params
    };
    const response = await api.get('/details-info', { params: defaultParams });
    return response.data;
  },

  /**
   * Получить полную информацию о детали по ID
   */
  async getById(id) {
    const response = await api.get(`/details-info/${id}`);
    return response.data;
  }
};