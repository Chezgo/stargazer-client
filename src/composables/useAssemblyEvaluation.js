import { ref, computed, watch } from 'vue';
import assemblyEvaluationApi from '@/services/assemblyEvaluation';

export function useAssemblyEvaluation(assemblyId) {
  const assemblyGoals = ref([]);
  const selectedGoalId = ref('');
  const evaluation = ref(null);
  const evaluationLoading = ref(false);

  const selectedGoal = computed(() => {
    return assemblyGoals.value.find(g => g.id === selectedGoalId.value);
  });

  const evaluationStatusClass = computed(() => {
    if (!evaluation.value) return '';
    const score = evaluation.value.overallScore;
    if (score === 100) return 'success';
    if (score >= 50) return 'warning';
    return 'danger';
  });

  const evaluationStatusText = computed(() => {
    if (!evaluation.value) return '';
    switch (evaluation.value.overallStatus) {
      case 'OK': return '✓ Готово';
      case 'NEEDS_IMPROVEMENT': return '⚠ Требует доработки';
      case 'CRITICAL_MISSING': return '✗ Критические недостатки';
      default: return '';
    }
  });

  const loadAssemblyGoals = async () => {
    try {
      const data = await assemblyEvaluationApi.getAssemblyGoals();
      assemblyGoals.value = data.goals || [];
    } catch (err) {
      console.warn('⚠️ Не удалось загрузить цели сборки:', err);
    }
  };

  const loadEvaluation = async () => {
    if (!selectedGoalId.value) {
      evaluation.value = null;
      return;
    }
    
    evaluationLoading.value = true;
    try {
      evaluation.value = await assemblyEvaluationApi.evaluateAssembly(
        assemblyId.value,
        selectedGoalId.value
      );
    } catch (err) {
      console.error('❌ Не удалось загрузить оценку:', err);
      evaluation.value = null;
    } finally {
      evaluationLoading.value = false;
    }
  };

    watch(selectedGoalId, async (newGoalId) => {
    if (newGoalId) {
      await loadEvaluation();
    }
  });

  const onGoalChange = async () => {
  await loadEvaluation();
};

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OK': return '✓';
      case 'PARTIAL': return '⚠';
      case 'MISSING': return '✗';
      default: return '?';
    }
  };

  const getRequirementText = (type) => {
    switch (type) {
      case 'REQUIRED': return 'Обязательно';
      case 'RECOMMENDED': return 'Рекомендуется';
      case 'OPTIONAL': return 'Опционально';
      default: return type;
    }
  };

  watch(selectedGoalId, async (newGoalId, oldGoalId) => {
    console.log('👀 Watch: selectedGoalId изменился с', oldGoalId, 'на', newGoalId);
    if (newGoalId) {
      await loadEvaluation();
    }
  });

  return {
    assemblyGoals,
    selectedGoalId,
    selectedGoal,
    evaluation,
    evaluationLoading,
    evaluationStatusClass,
    evaluationStatusText,
    loadAssemblyGoals,
    loadEvaluation,
    onGoalChange,
    getStatusIcon,
    getRequirementText
  };
}