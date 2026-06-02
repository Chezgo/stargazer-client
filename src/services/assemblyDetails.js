import api from './api';

export default {
  /**
   * Получить список деталей в сборке
   */
  async getByAssemblyId(assemblyId) {
    const response = await api.get(`/assembly-user/${assemblyId}/details`);
    return response.data;
  },

  /**
   * Добавить деталь в сборку
   */
  async addToAssembly(assemblyId, data) {
    const response = await api.post(`/assembly-user/${assemblyId}/details`, data);
    return response.data;
  },

  /**
   * Обновить деталь в сборке (описание)
   */
  async updateInAssembly(assemblyId, detailId, data) {
    const response = await api.put(`/assembly-user/${assemblyId}/details/${detailId}`, data);
    return response.data;
  },

  /**
   * Удалить деталь из сборки
   */
  async removeFromAssembly(assemblyId, detailId) {
    await api.delete(`/assembly-user/${assemblyId}/details/${detailId}`);
  }
};