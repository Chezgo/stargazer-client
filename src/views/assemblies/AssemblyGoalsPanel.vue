<template>
  <div class="section goal-section">
    <div class="section-header">
      <h2>
        <Target class="section-icon" />
        Цель сборки
      </h2>
    </div>
    
    <div class="goal-selector">
      <select 
        :value="selectedGoalId"
        @change="onGoalChange"
        class="form-select goal-select"
      >
        <option value="">Свободная сборка (без цели)</option>
        <option v-for="goal in assemblyGoals" :key="goal.id" :value="goal.id">
          {{ goal.name }}
        </option>
      </select>
      
      <div v-if="selectedGoal" class="goal-description">
        <p>{{ selectedGoal.description }}</p>
      </div>
    </div>

    <div v-if="evaluation && selectedGoalId" class="evaluation-summary">
      <div class="evaluation-header">
        <h3>Оценка сборки</h3>
        <div :class="['score-badge', `score-${statusClass}`]">
          {{ evaluation.overallScore }}%
        </div>
      </div>
      
      <div class="progress-bar-container">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :class="`progress-${statusClass}`"
            :style="{ width: evaluation.overallScore + '%' }"
          ></div>
        </div>
        <div class="progress-status">
          <span :class="`status-${statusClass}`">
            {{ statusText }}
          </span>
        </div>
      </div>

      <button @click="$emit('show-checklist')" class="btn btn-sm btn-outline">
        <ListChecks class="btn-icon" />
        Показать детальный чек-лист
      </button>
    </div>
  </div>
</template>

<script setup>
import { Target, ListChecks } from 'lucide-vue-next';
import { computed } from 'vue';

const props = defineProps({
  assemblyGoals: { type: Array, default: () => [] },
  selectedGoalId: { type: String, default: '' },
  evaluation: { type: Object, default: null }
});

const emit = defineEmits(['update:selectedGoalId', 'show-checklist']);

const selectedGoal = computed(() => {
  return props.assemblyGoals?.find(g => g.id === props.selectedGoalId);
});

const statusClass = computed(() => {
  if (!props.evaluation) return '';
  const score = props.evaluation.overallScore;
  if (score === 100) return 'success';
  if (score >= 50) return 'warning';
  return 'danger';
});

const statusText = computed(() => {
  if (!props.evaluation) return '';
  switch (props.evaluation.overallStatus) {
    case 'OK': return '✓ Готово';
    case 'NEEDS_IMPROVEMENT': return '⚠ Требует доработки';
    case 'CRITICAL_MISSING': return '✗ Критические недостатки';
    default: return '';
  }
});

const onGoalChange = (event) => {
  emit('update:selectedGoalId', event.target.value);
};
</script>

<style scoped>
.section-icon {
  width: 20px;
  height: 20px;
  margin-right: 0.5rem;
  vertical-align: middle;
}

.btn-icon {
  width: 16px;
  height: 16px;
}
.goal-section {
  margin-bottom: 1.5rem;
}

.goal-selector {
  margin-bottom: 1rem;
}

.goal-select {
  width: 100%;
  padding: 0.75rem 1rem;
  background: #0b1120;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #e0e7ff;
  font-size: 1rem;
  cursor: pointer;
}

.goal-description {
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 6px;
  color: #94a3b8;
  font-size: 0.9rem;
}

.evaluation-summary {
  margin-top: 1.5rem;
  padding: 1.25rem;
  background: #111827;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
}

.evaluation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.evaluation-header h3 {
  margin: 0;
  color: #e0e7ff;
  font-size: 1.1rem;
}

.score-badge {
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-weight: 700;
  font-size: 1rem;
}

.score-success {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.5);
}

.score-warning {
  background: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
  border: 1px solid rgba(245, 158, 11, 0.5);
}

.score-danger {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.5);
}

.progress-bar-container {
  margin-bottom: 1rem;
}

.progress-bar {
  width: 100%;
  height: 10px;
  background: rgba(59, 130, 246, 0.15);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  transition: width 0.5s ease;
  border-radius: 6px;
}

.progress-success {
  background: linear-gradient(90deg, #22c55e, #4ade80);
}

.progress-warning {
  background: linear-gradient(90deg, #f59e0b, #fcd34d);
}

.progress-danger {
  background: linear-gradient(90deg, #ef4444, #fca5a5);
}

.progress-status {
  text-align: center;
  font-size: 0.9rem;
  font-weight: 600;
}

.status-success { color: #4ade80; }
.status-warning { color: #fcd34d; }
.status-danger { color: #fca5a5; }
</style>