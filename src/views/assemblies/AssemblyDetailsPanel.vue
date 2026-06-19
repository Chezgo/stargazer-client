<template>
  <div class="section">
    <div class="section-header">
      <h2>📋 Детали в сборке</h2>
      <button @click="$emit('reload')" class="btn btn-outline btn-sm">🔄 Обновить</button>
    </div>

    <!-- Загрузка -->
    <div v-if="loading" class="loading-state small">
      <div class="spinner-small"></div>
      <p>Загрузка...</p>
    </div>
    
    <!-- Ошибка -->
    <div v-else-if="error" class="error-state small">
      <p>⚠️ {{ error }}</p>
    </div>

    <!-- Пусто -->
    <div v-else-if="!details || details.length === 0" class="card">
      <div class="empty-state">
        <p>📭 В этой сборке пока нет деталей</p>
        <p class="hint">Добавьте первую деталь слева</p>
      </div>
    </div>

    <!-- Группы деталей -->
    <div v-else class="assembly-details-grouped">
      <div 
        v-for="(items, typeName) in groupedDetails" 
        :key="typeName" 
        class="type-group"
      >
        <div class="type-group-header">
          <h3>{{ typeName }}</h3>
          <span class="type-count">{{ items.length }}</span>
        </div>
        
        <div class="details-list">
          <div v-for="item in items" :key="item.id" class="detail-item">
            <div class="detail-header">
              <h4>{{ item.detailInfo?.nameDetail || 'Загрузка...' }}</h4>
              <div class="detail-actions">
                <button 
                  @click="$emit('edit-detail', item)" 
                  class="btn-icon" 
                  title="Редактировать"
                >
                  ✏️
                </button>
                <button 
                  @click="$emit('remove-detail', item.id)" 
                  class="btn-icon danger" 
                  title="Удалить"
                >
                  🗑️
                </button>
              </div>
            </div>
            
            <div class="detail-meta">
              <span class="badge">{{ item.detailInfo?.nameBrand }}</span>
            </div>
            
            <p v-if="item.description" class="detail-desc">{{ item.description }}</p>
            
            <!-- Характеристики -->
            <div v-if="item.detailInfo?.attribute?.length" class="detail-attrs">
              <span 
                v-for="attr in item.detailInfo.attribute.slice(0, 3)" 
                :key="attr.id" 
                class="attr-tag"
              >
                {{ attr.attributeName }}: <strong>{{ attr.value || '—' }}</strong>
              </span>
              <span v-if="item.detailInfo.attribute.length > 3" class="attr-more">
                +{{ item.detailInfo.attribute.length - 3 }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  details: Array,
  loading: Boolean,
  error: String,
  groupedDetails: Object
});

const emit = defineEmits(['reload', 'edit-detail', 'remove-detail']);
</script>

<style scoped>
.section { margin-bottom: 2rem; }
.section-header {
  display: flex; justify-content: space-between; align-items: center; 
  margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;
}
.section-header h2 { margin: 0; font-size: 1.3rem; color: #e0e7ff; }

.card { 
  background: #111827; 
  border: 1px solid rgba(59, 130, 246, 0.3); 
  border-radius: 12px; 
  padding: 1.5rem; 
}

.empty-state { text-align: center; padding: 2rem; color: #64748b; }
.empty-state .hint { font-size: 0.9rem; margin-top: 0.5rem; }

.assembly-details-grouped {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.type-group {
  background: #111827;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  overflow: hidden;
}

.type-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: rgba(59, 130, 246, 0.1);
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}

.type-group-header h3 {
  margin: 0;
  color: #e0e7ff;
  font-size: 1.1rem;
}

.type-count {
  background: rgba(59, 130, 246, 0.3);
  color: #93c5fd;
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.details-list {
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-item {
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  padding: 1rem;
}

.detail-header { 
  display: flex; justify-content: space-between; align-items: flex-start; 
  margin-bottom: 0.5rem; 
}
.detail-header h4 { margin: 0; color: #e0e7ff; font-size: 1rem; }
.detail-actions { display: flex; gap: 0.5rem; }

.detail-meta { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
.badge {
  display: inline-block; padding: 0.2rem 0.5rem;
  background: rgba(59, 130, 246, 0.15); 
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 20px; font-size: 0.75rem; color: #93c5fd;
}

.detail-desc { color: #cbd5e1; margin: 0 0 0.5rem; font-size: 0.9rem; }

.detail-attrs { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.attr-tag {
  font-size: 0.8rem; color: #94a3b8;
  background: rgba(59, 130, 246, 0.1); 
  padding: 0.2rem 0.4rem; border-radius: 4px;
}
.attr-tag strong { color: #60a5fa; }
.attr-more { font-size: 0.8rem; color: #64748b; }

.btn-icon {
  background: transparent; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px; padding: 0.4rem 0.6rem; cursor: pointer;
  transition: all 0.2s; font-size: 1rem;
}
.btn-icon:hover { background: rgba(255,255,255,0.1); border-color: #60a5fa; }
.btn-icon.danger:hover { background: rgba(239, 68, 68, 0.2); border-color: #ef4444; }

.loading-state, .error-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 1rem; color: #94a3b8; gap: 1rem;
}
.spinner-small {
  width: 24px; height: 24px; border: 2px solid rgba(96, 165, 250, 0.2);
  border-top-color: #60a5fa; border-radius: 50%; animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>