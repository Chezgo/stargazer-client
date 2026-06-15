import api from './api';

export default {
  /**
   * Получить список целей сборки
   */
  async getAssemblyGoals() {
    const response = await api.get('/assembly-goals');
    return response.data;
  },

  /**
   * Оценить сборку по выбранной цели
   */
  async evaluateAssembly(assemblyId, goalId) {
    const response = await api.get(`/assemblies/${assemblyId}/evaluate`, {
      params: { goalId }
    });
    return response.data;
  },

  /**
   * Получить доступные типы деталей для сборки с флагом совместимости
   */
  async getAvailableTypes(assemblyId) {
    const response = await api.get('/assembly-types/available', {
      params: { assemblyId }
    });
    return response.data;
  }
};