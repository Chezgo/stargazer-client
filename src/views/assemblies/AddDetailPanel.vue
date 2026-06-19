<template>
  <div class="section">
    <div class="section-header">
      <h2>🔧 Добавить деталь</h2>
      <button @click="$emit('toggle-all')" class="btn btn-outline btn-sm">
        {{ allExpanded ? 'Свернуть' : 'Развернуть' }}
      </button>
    </div>

    <!-- Загрузка -->
    <div v-if="loading" class="loading-state small">
      <div class="spinner-small"></div>
      <p>Загрузка...</p>
    </div>
    
    <!-- Ошибка -->
    <div v-else-if="error" class="error-state small">
      <p>⚠️ {{ error }}</p>
      <button @click="$emit('reload')" class="btn btn-sm">Повторить</button>
    </div>

    <!-- Группы типов -->
    <div v-else class="groups-container">
      <div 
        v-for="(types, groupName) in types" 
        :key="groupName" 
        class="group-card"
      >
        <button @click="$emit('toggle-group', groupName)" class="group-header">
          <span class="group-name">{{ groupName }}</span>
          <span class="group-toggle">{{ expandedGroups[groupName] ? '−' : '+' }}</span>
        </button>
        
        <div v-show="expandedGroups[groupName]" class="group-content">
          <div class="types-grid">
            <button 
              v-for="type in types" 
              :key="type.id" 
              @click="$emit('add-detail', type)"
              :class="['type-btn', { 
                'type-incompatible': !type.isCompatible && hasGoal,
                'type-free': !hasGoal
              }]"
              :disabled="!hasGoal ? false : !type.isCompatible"
              :title="getTypeTitle(type)"
            >
              <span class="type-icon">{{ getTypeIcon(type) }}</span>
              <span class="type-name">{{ type.name }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  types: Object,
  expandedGroups: Object,
  loading: Boolean,
  error: String,
  allExpanded: Boolean,
  hasGoal: Boolean
});

const emit = defineEmits(['toggle-group', 'toggle-all', 'reload', 'add-detail']);

const getTypeIcon = (type) => {
  if (!props.hasGoal) return '✓';
  return type.isCompatible ? '✓' : '✗';
};

const getTypeTitle = (type) => {
  if (!props.hasGoal) return 'Добавить деталь';
  return type.isCompatible ? 'Добавить деталь' : 'Несовместимо с текущей сборкой';
};
</script>

<style scoped>
.section { margin-bottom: 2rem; }
.section-header {
  display: flex; justify-content: space-between; align-items: center; 
  margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;
}
.section-header h2 { margin: 0; font-size: 1.3rem; color: #e0e7ff; }
.btn-sm { padding: 0.4rem 0.8rem; font-size: 0.85rem; }

.groups-container { display: flex; flex-direction: column; gap: 0.75rem; }
.group-card { 
  background: #111827; 
  border: 1px solid rgba(59, 130, 246, 0.3); 
  border-radius: 12px; 
  overflow: hidden; 
}
.group-header {
  width: 100%; 
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.75rem 1rem; 
  background: rgba(59, 130, 246, 0.1);
  border: none; 
  cursor: pointer; 
  color: #e0e7ff; 
  font-weight: 600; 
  font-size: 1rem;
  transition: background 0.2s;
}
.group-header:hover { background: rgba(59, 130, 246, 0.15); }
.group-name { flex: 1; text-align: left; }
.group-toggle {
  width: 24px; height: 24px; 
  display: flex; align-items: center; justify-content: center;
  background: rgba(59, 130, 246, 0.3); 
  border-radius: 6px; 
  font-weight: bold; 
  font-size: 0.9rem;
}
.group-content { padding: 0.75rem 1rem; }
.types-grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); 
  gap: 0.5rem; 
}

.type-btn {
  display: flex; flex-direction: column; align-items: center;
  padding: 0.75rem; 
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3); 
  border-radius: 8px;
  cursor: pointer; 
  transition: all 0.2s; 
  text-align: center; 
  color: #cbd5e1;
}
.type-btn:hover:not(:disabled) {
  background: rgba(34, 197, 94, 0.2); 
  border-color: #4ade80;
  transform: translateY(-2px); 
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.type-btn.type-incompatible {
  background: rgba(100, 116, 139, 0.1);
  border-color: rgba(100, 116, 139, 0.3);
  color: #64748b;
  cursor: not-allowed;
  opacity: 0.6;
}

.type-icon { font-size: 1rem; margin-bottom: 0.25rem; font-weight: 700; }
.type-btn:not(.type-incompatible) .type-icon { color: #4ade80; }
.type-btn.type-incompatible .type-icon { color: #ef4444; }
.type-name { font-size: 0.85rem; font-weight: 500; color: #e0e7ff; }

.loading-state, .error-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 1rem; color: #94a3b8; gap: 1rem;
}
.spinner-small {
  width: 24px; height: 24px; 
  border: 2px solid rgba(96, 165, 250, 0.2);
  border-top-color: #60a5fa; 
  border-radius: 50%; 
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>