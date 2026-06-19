<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal modal-xl">
      <div class="modal-header">
        <h2>
          <PlusCircle class="header-icon" />
          Добавить: {{ selectedType?.name }}
        </h2>
        <button @click="$emit('close')" class="close-btn">
          <X class="icon" />
        </button>
      </div>
      
      <div class="modal-body">
        <!-- Фильтры -->
        <div class="filters-bar">
          <div class="filter-group">
            <label>Бренд</label>
            <select 
              v-model="filters.brandId" 
              @change="$emit('search')" 
              class="form-select"
            >
              <option value="">Все бренды</option>
              <option v-for="brand in brands" :key="brand.id" :value="brand.id">
                {{ brand.name }}
              </option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Поиск</label>
            <input 
              v-model="filters.search" 
              @keyup.enter="$emit('search')"
              placeholder="Название детали..." 
              class="form-input"
            >
          </div>
          
          <button @click="$emit('search')" class="btn btn-primary">
            <Search class="btn-icon" />
            Найти
          </button>
          <button @click="$emit('reset')" class="btn btn-outline">
            <RotateCcw class="btn-icon" />
            Сбросить
          </button>
        </div>

        <!-- Загрузка -->
        <div v-if="loading" class="loading-state small">
          <div class="spinner-small"></div>
          <p>Поиск...</p>
        </div>
        
        <!-- Ошибка -->
        <div v-else-if="error" class="error-state small">
          <p>⚠️ {{ error }}</p>
        </div>
        
        <!-- Список деталей -->
        <div v-else class="catalog-grid">
          <div v-for="detail in details" :key="detail.id" class="catalog-card">
            <div class="catalog-header">
              <h4>{{ detail.nameDetail }}</h4>
              <span class="catalog-brand">{{ detail.nameBrand }}</span>
            </div>
            
            <p class="catalog-desc">{{ truncate(detail.description, 120) }}</p>
            
            <!-- Атрибуты -->
            <div v-if="detail.attribute?.length" class="catalog-attrs">
              <span v-for="attr in detail.attribute.slice(0, 2)" :key="attr.id" class="attr-mini">
                {{ attr.attributeName }}: {{ attr.value || '—' }}
              </span>
            </div>
            
            <button @click="$emit('select', detail)" class="btn btn-primary btn-sm">
              <CheckCircle class="btn-icon" />
              Выбрать
            </button>
          </div>
        </div>

        <!-- Пагинация -->
        <div v-if="details.length > 0 && totalPages > 1" class="catalog-pagination">
          <button @click="$emit('prev-page')" :disabled="currentPage === 0" class="btn-icon">
            <ChevronLeft class="icon" />
          </button>
          <span>Стр. {{ currentPage + 1 }} из {{ totalPages }}</span>
          <button 
            @click="$emit('next-page')" 
            :disabled="currentPage >= totalPages - 1" 
            class="btn-icon"
          >
            <ChevronRight class="icon" />
          </button>
        </div>
      </div>
      
      <div class="modal-footer">
        <button type="button" @click="$emit('close')" class="btn">
          <X class="btn-icon" />
          Закрыть
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { 
  PlusCircle, 
  X, 
  Search, 
  RotateCcw, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-vue-next';

const props = defineProps({
  selectedType: Object,
  details: Array,
  brands: Array,
  filters: Object,
  loading: Boolean,
  error: String,
  currentPage: Number,
  totalPages: Number
});

const emit = defineEmits(['close', 'search', 'reset', 'select', 'prev-page', 'next-page']);

const truncate = (text, length) => {
  if (!text) return '';
  return text.length > length ? text.slice(0, length) + '…' : text;
};
</script>

<style scoped>
.modal-overlay {
  position: fixed; 
  inset: 0; 
  background: rgba(0,0,0,0.7);
  display: flex; 
  align-items: center; 
  justify-content: center;
  z-index: 1000; 
  backdrop-filter: blur(4px);
}

.modal {
  background: #111827; 
  border: 1px solid rgba(59, 130, 246, 0.4);
  border-radius: 12px; 
  width: 90%; 
  max-width: 500px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-xl { 
  max-width: 900px; 
  width: 95%; 
}

.modal-header {
  display: flex; 
  justify-content: space-between; 
  align-items: center;
  padding: 1.25rem 1.5rem; 
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  flex-shrink: 0;
}

.modal-header h2 { 
  margin: 0; 
  font-size: 1.2rem; 
  color: #e0e7ff;
  display: flex;
  align-items: center;
}

.header-icon {
  width: 20px;
  height: 20px;
  margin-right: 0.5rem;
}

.close-btn {
  background: none; 
  border: none; 
  color: #94a3b8; 
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
}
.close-btn .icon {
  width: 20px;
  height: 20px;
}
.close-btn:hover { color: #fff; }

.modal-body { 
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex; 
  justify-content: flex-end; 
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid rgba(255,255,255,0.1);
  flex-shrink: 0;
}

/* ===== Фильтры ===== */
.filters-bar {
  display: grid;
  grid-template-columns: 1fr 1.5fr auto auto;
  gap: 0.75rem;
  align-items: end;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
}

.filter-group { 
  display: flex; 
  flex-direction: column; 
  gap: 0.4rem; 
}

.filter-group label { 
  font-size: 0.8rem; 
  color: #94a3b8;
  font-weight: 500;
}

.form-select,
.form-input {
  padding: 0.5rem 0.75rem; 
  background: #0b1120; 
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px; 
  color: #e0e7ff; 
  font-size: 0.9rem;
  width: 100%;
}

.form-select:focus,
.form-input:focus {
  outline: none; 
  border-color: #60a5fa; 
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
}

.form-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2rem;
}

/* ===== Каталог деталей ===== */
.catalog-grid {
  display: grid; 
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem; 
  max-height: 400px; 
  overflow-y: auto; 
  padding-right: 0.5rem;
}

.catalog-card {
  background: rgba(59, 130, 246, 0.05); 
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px; 
  padding: 1rem; 
  display: flex; 
  flex-direction: column; 
  gap: 0.75rem;
  transition: all 0.2s;
}

.catalog-card:hover {
  border-color: rgba(59, 130, 246, 0.4);
  background: rgba(59, 130, 246, 0.08);
}

.catalog-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: flex-start;
  gap: 0.5rem;
}

.catalog-header h4 { 
  margin: 0; 
  color: #e0e7ff; 
  font-size: 0.95rem; 
}

.catalog-brand { 
  font-size: 0.75rem; 
  color: #64748b;
  white-space: nowrap;
}

.catalog-desc { 
  margin: 0; 
  color: #cbd5e1; 
  font-size: 0.85rem; 
  line-height: 1.4; 
}

.catalog-attrs { 
  display: flex; 
  flex-wrap: wrap; 
  gap: 0.3rem; 
}

.attr-mini {
  font-size: 0.75rem; 
  color: #94a3b8; 
  background: rgba(59, 130, 246, 0.1);
  padding: 0.2rem 0.4rem; 
  border-radius: 3px;
}

/* ===== Пагинация ===== */
.catalog-pagination {
  display: flex; 
  justify-content: center; 
  align-items: center; 
  gap: 1rem;
  margin-top: 1.5rem; 
  padding: 1rem 0;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.catalog-pagination .btn-icon {
  background: rgba(96, 165, 250, 0.15);
  border: 1px solid rgba(96, 165, 250, 0.4);
  color: #93c5fd;
  font-size: 1.1rem;
  padding: 0.5rem 0.8rem;
  border-radius: 8px;
  transition: all 0.2s;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.catalog-pagination .btn-icon .icon {
  width: 18px;
  height: 18px;
}

.catalog-pagination .btn-icon:hover:not(:disabled) {
  background: rgba(96, 165, 250, 0.25);
  border-color: #60a5fa;
  color: #bfdbfe;
  box-shadow: 0 0 12px rgba(96, 165, 250, 0.3);
}

.catalog-pagination .btn-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  background: rgba(100, 116, 139, 0.1);
  border-color: rgba(100, 116, 139, 0.3);
  color: #64748b;
}

.catalog-pagination span {
  color: #94a3b8;
  font-size: 0.9rem;
  font-weight: 500;
  min-width: 100px;
  text-align: center;
}

/* ===== Состояния ===== */
.loading-state, .error-state {
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center;
  padding: 1rem; 
  color: #94a3b8; 
  gap: 1rem;
}

.spinner-small {
  width: 24px; 
  height: 24px; 
  border: 2px solid rgba(96, 165, 250, 0.2);
  border-top-color: #60a5fa; 
  border-radius: 50%; 
  animation: spin 1s linear infinite;
}

@keyframes spin { 
  to { transform: rotate(360deg); } 
}

/* ===== Кнопки ===== */
.btn {
  position: relative; 
  z-index: 1;
  display: inline-flex; 
  align-items: center; 
  gap: 0.5rem;
  padding: 0.625rem 1.25rem; 
  border: 1px solid rgba(59, 130, 246, 0.5);
  border-radius: 8px; 
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd; 
  cursor: pointer; 
  transition: all 0.2s;
  font-weight: 500; 
  font-size: 0.9rem; 
  text-decoration: none;
}

.btn:hover { 
  background: rgba(59, 130, 246, 0.25); 
  border-color: #60a5fa; 
  color: #bfdbfe; 
}

.btn-primary { 
  background: #2563eb; 
  border-color: #2563eb; 
  color: white; 
}

.btn-primary:hover { 
  background: #1d4ed8; 
  box-shadow: 0 0 15px rgba(37, 99, 235, 0.4); 
}

.btn-outline { 
  background: transparent; 
  border-color: rgba(59, 130, 246, 0.5); 
}

.btn:disabled { 
  opacity: 0.6; 
  cursor: not-allowed; 
}

.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

/* ===== Адаптив ===== */
@media (max-width: 768px) {
  .filters-bar {
    grid-template-columns: 1fr 1fr;
  }
  
  .catalog-grid {
    grid-template-columns: 1fr;
  }
}
</style>