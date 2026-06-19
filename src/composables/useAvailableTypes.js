import { ref, computed } from 'vue';
import assemblyEvaluationApi from '@/services/assemblyEvaluation';

export function useAvailableTypes(assemblyId, selectedGoalId) {
  const availableTypes = ref({});
  const typesLoading = ref(false);
  const typesError = ref(null);
  const expandedGroups = ref({});
  const allGroupsExpanded = ref(true);

  const displayAvailableTypes = computed(() => {
    // Если свободная сборка — делаем все типы совместимыми
    if (!selectedGoalId.value) {
      const modified = {};
      for (const [group, types] of Object.entries(availableTypes.value)) {
        modified[group] = types.map(type => ({
          ...type,
          isCompatible: true
        }));
      }
      return modified;
    }
    return availableTypes.value;
  });

  const loadAvailableTypes = async () => {
    typesLoading.value = true;
    typesError.value = null;
    try {
      const data = await assemblyEvaluationApi.getAvailableTypes(assemblyId.value);
      availableTypes.value = data.groupedByFunctionalGroup || {};
      
      expandedGroups.value = {};
      Object.keys(availableTypes.value).forEach(group => {
        expandedGroups.value[group] = true;
      });
    } catch (err) {
      typesError.value = 'Не удалось загрузить доступные типы';
      console.error(err);
    } finally {
      typesLoading.value = false;
    }
  };

  const toggleGroup = (groupName) => {
    expandedGroups.value[groupName] = !expandedGroups.value[groupName];
  };

  const toggleAllGroups = () => {
    allGroupsExpanded.value = !allGroupsExpanded.value;
    Object.keys(displayAvailableTypes.value).forEach(group => {
      expandedGroups.value[group] = allGroupsExpanded.value;
    });
  };

  const getTypeIcon = (type) => {
    if (!selectedGoalId.value) return '✓';
    return type.isCompatible ? '✓' : '✗';
  };

  const getButtonTypeTitle = (type) => {
    if (!selectedGoalId.value) return 'Добавить деталь';
    return type.isCompatible ? 'Добавить деталь' : 'Несовместимо с текущей сборкой';
  };

  return {
    availableTypes,
    displayAvailableTypes,
    typesLoading,
    typesError,
    expandedGroups,
    allGroupsExpanded,
    loadAvailableTypes,
    toggleGroup,
    toggleAllGroups,
    getTypeIcon,
    getButtonTypeTitle
  };
}