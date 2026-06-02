import api from './api';

export default {
  /**
   * Получить все типы деталей (сгруппированные по functionalGroup)
   */
  async getAll() {
    const response = await api.get('/type-detail');
    return response.data;
  },

  /**
   * Сгруппировать типы по functionalGroup
   */
  groupByFunctionalGroup(types) {
    return types.reduce((groups, type) => {
      const group = type.functionalGroup || 'Другое';
      if (!groups[group]) groups[group] = [];
      groups[group].push(type);
      return groups;
    }, {});
  }
};