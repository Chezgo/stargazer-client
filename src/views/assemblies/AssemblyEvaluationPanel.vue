<template>
  <div class="evaluation-panel">
    <div class="panel-header">
      <h3>
        <ClipboardList class="section-icon" />
        Детальный чек-лист
      </h3>
      <button @click="$emit('close')" class="btn btn-sm btn-outline">
        <X class="btn-icon" />
        Свернуть
      </button>
    </div>

    <div class="checklist">
      <div 
        v-for="(item, index) in evaluation.details" 
        :key="index"
        :class="['checklist-item', `item-${item.itemStatus.toLowerCase()}`]"
      >
        <div class="checklist-header">
          <span class="checklist-icon">
            <component :is="getStatusIconComponent(item.itemStatus)" class="icon" />
          </span>
          <div class="checklist-info">
            <strong>{{ item.typeName }}</strong>
            <span :class="['requirement-badge', `req-${item.requirementType.toLowerCase()}`]">
              {{ getRequirementText(item.requirementType) }}
            </span>
          </div>
          <div class="checklist-quantity">
            {{ item.currentQuantity }} / {{ item.minQuantity }}-{{ item.maxQuantity }}
          </div>
        </div>
        
        <p v-if="item.adviceText" class="checklist-advice">
          <Lightbulb class="advice-icon" />
          {{ item.adviceText }}
        </p>
        
        <button 
          v-if="item.itemStatus === 'MISSING'"
          @click="$emit('add-missing-type', item.typeName)"
          class="btn btn-sm btn-primary"
        >
          <Plus class="btn-icon" />
          Добавить {{ item.typeName }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>

import { 
  ClipboardList, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Lightbulb, 
  Plus 
} from 'lucide-vue-next';

const getStatusIconComponent = (status) => {
  switch (status) {
    case 'OK': return CheckCircle;
    case 'PARTIAL': return AlertTriangle;
    case 'MISSING': return XCircle;
    default: return XCircle;
  }
};

const props = defineProps({
  evaluation: Object
});

const emit = defineEmits(['add-missing-type', 'close']);

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
</script>

<style scoped>
.section-icon, .btn-icon, .advice-icon {
  width: 16px;
  height: 16px;
}

.checklist-icon .icon {
  width: 20px;
  height: 20px;
}

.item-ok .checklist-icon .icon { color: #22c55e; }
.item-partial .checklist-icon .icon { color: #f59e0b; }
.item-missing .checklist-icon .icon { color: #ef4444; }

.advice-icon {
  display: inline-block;
  vertical-align: middle;
  margin-right: 0.25rem;
  color: #94a3b8;
}
.evaluation-panel {
  margin-top: 1.5rem;
  background: #111827;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.panel-header h3 {
  margin: 0;
  color: #e0e7ff;
  font-size: 1.2rem;
}

.checklist {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checklist-item {
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  padding: 1rem;
  border-left: 4px solid;
}

.item-ok { border-left-color: #22c55e; }
.item-partial { border-left-color: #f59e0b; }
.item-missing { border-left-color: #ef4444; }

.checklist-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.checklist-icon {
  font-size: 1.2rem;
  font-weight: 700;
  width: 24px;
}

.item-ok .checklist-icon { color: #22c55e; }
.item-partial .checklist-icon { color: #f59e0b; }
.item-missing .checklist-icon { color: #ef4444; }

.checklist-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.checklist-info strong {
  color: #e0e7ff;
  font-size: 1rem;
}

.requirement-badge {
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.req-required {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.5);
}

.req-recommended {
  background: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
  border: 1px solid rgba(245, 158, 11, 0.5);
}

.req-optional {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.5);
}

.checklist-quantity {
  color: #94a3b8;
  font-size: 0.9rem;
  font-weight: 600;
}

.checklist-advice {
  margin: 0.5rem 0;
  color: #94a3b8;
  font-size: 0.9rem;
  font-style: italic;
}
</style>