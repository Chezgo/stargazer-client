import api from './api';

export default {
  /**
   * Получить список сборок текущего пользователя (с пагинацией)
   */
  async getAll(params = {}) {
    const defaultParams = {
      page: 0,
      size: 10,
      sortBy: 'name',
      sortDir: 'asc',
      ...params
    };
    const response = await api.get('/assembly-user', { params: defaultParams });
    return response.data;
  },

  /**
   * Получить сборку по ID
   */
  async getById(id) {
    const response = await api.get(`/assembly-user/${id}`);
    return response.data;
  },

  /**
   * Создать новую сборку
   */
  async create(data) {
    const response = await api.post('/assembly-user', data);
    return response.data;
  },

  /**
   * Обновить сборку
   */
  async update(id, data) {
    const response = await api.put(`/assembly-user/${id}`, data);
    return response.data;
  },

  /**
   * Удалить сборку
   */
  async delete(id) {
    await api.delete(`/assembly-user/${id}`);
  }
};