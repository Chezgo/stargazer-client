<template>
  <div class="page">
    <div class="page-header">
      <button @click="$router.back()" class="btn btn-back">← Назад</button>
      <h1>{{ assembly?.name || 'Загрузка...' }}</h1>
    </div>

    <!-- Состояния загрузки -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Загрузка...</p>
    </div>
    
    <div v-else-if="error" class="error-state">
      <p>⚠️ {{ error }}</p>
      <button @click="fetchAssembly" class="btn">Повторить</button>
    </div>

    <template v-else-if="assembly">
      <!-- Карточка сборки -->
      <div class="card detail-card">
        <div class="detail-row">
          <label>Название</label>
          <span class="value">{{ assembly.name }}</span>
        </div>
        <div class="detail-row full">
          <label>Описание</label>
          <p class="description">{{ assembly.description || '—' }}</p>
        </div>
        <div class="actions">
          <button @click="openEditModal" class="btn">✏️ Редактировать</button>
          <button @click="handleDelete" class="btn btn-danger">🗑️ Удалить</button>
        </div>
      </div>

      <AssemblyGoalsPanel
  :assembly-goals="assemblyGoals"
  v-model:selectedGoalId="selectedGoalId"
  :evaluation="evaluation"
  @show-checklist="showChecklist = !showChecklist"
/>

      <!-- Детальный чек-лист (раскрывается по кнопке) -->
      <AssemblyEvaluationPanel
        v-if="showChecklist && evaluation"
        :evaluation="evaluation"
        @add-missing-type="addMissingType"
        @close="showChecklist = false"
      />

      <!-- Двухколоночный layout -->
      <div class="two-column-layout">
        
        <!-- Левая колонка: Добавление деталей -->
        <div class="left-column">
          <AddDetailPanel
            :types="displayAvailableTypes"
            :expanded-groups="expandedGroups"
            :loading="typesLoading"
            :error="typesError"
            :all-expanded="allGroupsExpanded"
            :has-goal="!!selectedGoalId"
            @toggle-group="toggleGroup"
            @toggle-all="toggleAllGroups"
            @reload="loadAvailableTypes"
            @add-detail="openAddDetailModal"
          />
        </div>

        <!-- Правая колонка: Список деталей -->
        <div class="right-column">
          <AssemblyDetailsPanel
            :details="assemblyDetails"
            :loading="detailsLoading"
            :error="detailsError"
            :grouped-details="groupedAssemblyDetails"
            @reload="onDetailsChanged"
            @edit-detail="openEditDetailModal"
            @remove-detail="handleRemoveDetail"
          />
        </div>
      </div>
    </template>

    <!-- Модальное окно каталога деталей -->
    <DetailCatalogModal
      v-if="showAddDetailModal"
      :selected-type="selectedType"
      :details="catalogDetails"
      :brands="brands"
      :filters="filters"
      :loading="catalogLoading"
      :error="catalogError"
      :current-page="catalogPage"
      :total-pages="catalogTotalPages"
      @close="closeAddDetailModal"
      @search="fetchCatalogDetails"
      @reset="resetFilters"
      @select="selectDetail"
      @prev-page="prevCatalogPage"
      @next-page="nextCatalogPage"
    />

    <!-- Модальное окно редактирования детали в сборке -->
    <div v-if="showEditDetailModal" class="modal-overlay" @click.self="closeEditDetailModal">
      <div class="modal">
        <div class="modal-header">
          <h2>Редактировать деталь</h2>
          <button @click="closeEditDetailModal" class="close-btn">×</button>
        </div>
        
        <form @submit.prevent="submitEditDetail" class="modal-body">
          <div class="form-group">
            <label>Примечание к детали</label>
            <textarea 
              v-model="editDetailForm.description" 
              rows="3" 
              placeholder="Например: Главное зеркало, установлено 2024"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label>Деталь</label>
            <div class="readonly-field">
              {{ selectedAssemblyDetail?.detailInfo?.nameDetail }}
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="closeEditDetailModal" class="btn">Отмена</button>
            <button type="submit" class="btn btn-primary" :disabled="submittingDetail">
              {{ submittingDetail ? 'Сохранение...' : 'Сохранить' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Модальное окно редактирования сборки -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
      <div class="modal">
        <div class="modal-header">
          <h2>Редактировать сборку</h2>
          <button @click="closeEditModal" class="close-btn">×</button>
        </div>
        <form @submit.prevent="submitEdit" class="modal-body">
          <div class="form-group">
            <label>Название *</label>
            <input v-model="form.name" required>
          </div>
          <div class="form-group">
            <label>Описание</label>
            <textarea v-model="form.description" rows="3"></textarea>
          </div>
          <div class="modal-footer">
            <button type="button" @click="closeEditModal" class="btn">Отмена</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? 'Сохранение...' : 'Сохранить' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Composables
import { useAssembly } from '@/composables/useAssembly';
import { useAssemblyEvaluation } from '@/composables/useAssemblyEvaluation';
import { useAssemblyDetails } from '@/composables/useAssemblyDetails';
import { useAvailableTypes } from '@/composables/useAvailableTypes';
import { useCatalogSearch } from '@/composables/useCatalogSearch';

// Child Components
import AssemblyGoalsPanel from './AssemblyGoalsPanel.vue';
import AssemblyEvaluationPanel from './AssemblyEvaluationPanel.vue';
import AddDetailPanel from './AddDetailPanel.vue';
import AssemblyDetailsPanel from './AssemblyDetailsPanel.vue';
import DetailCatalogModal from './DetailCatalogModal.vue';

// Services (для добавления детали)
import assemblyDetailsApi from '@/services/assemblyDetails';

const route = useRoute();
const router = useRouter();

const assemblyId = ref(parseInt(route.params.id, 10));
const showChecklist = ref(false);

// ===== Инициализация composables =====
const {
  assembly, loading, error,
  showEditModal, submitting, form,
  fetchAssembly, openEditModal, closeEditModal,
  submitEdit, handleDelete
} = useAssembly(assemblyId);

const {
  assemblyGoals, selectedGoalId, evaluation,
  evaluationStatusClass, evaluationStatusText,
  loadAssemblyGoals, loadEvaluation, onGoalChange,
  getStatusIcon, getRequirementText
} = useAssemblyEvaluation(assemblyId);

const {
  assemblyDetails, detailsLoading, detailsError,
  showEditDetailModal, submittingDetail,
  editDetailForm, selectedAssemblyDetail,
  groupedAssemblyDetails,
  fetchAssemblyDetails,
  openEditDetailModal, closeEditDetailModal,
  submitEditDetail, handleRemoveDetail
} = useAssemblyDetails(assemblyId);

const {
  displayAvailableTypes, typesLoading, typesError,
  expandedGroups, allGroupsExpanded,
  loadAvailableTypes, toggleGroup, toggleAllGroups,
  getTypeIcon, getButtonTypeTitle
} = useAvailableTypes(assemblyId, selectedGoalId);

const {
  showAddDetailModal, selectedType,
  catalogDetails, catalogLoading, catalogError,
  catalogPage, catalogTotalPages, filters, brands,
  fetchCatalogDetails, prevCatalogPage, nextCatalogPage,
  resetFilters, openAddDetailModal, closeAddDetailModal
} = useCatalogSearch();

// ===== Бизнес-логика =====

// При изменении деталей — пересчитываем всё
const onDetailsChanged = async () => {
  await fetchAssemblyDetails();
  if (selectedGoalId.value) {
    await loadEvaluation();
  }
  await loadAvailableTypes();
};

// Добавление детали из каталога в сборку
const selectDetail = async (detail) => {
  try {
    await assemblyDetailsApi.addToAssembly(assemblyId.value, {
      idTelescopeDetail: detail.id,
      description: `Деталь: ${detail.nameDetail}`
    });
    
    closeAddDetailModal();
    await onDetailsChanged();
    
    // Toast-уведомление (если есть)
    if (window.$toast) {
      window.$toast.success('Деталь добавлена в сборку', 'Успешно');
    } else {
      alert('✅ Деталь добавлена в сборку');
    }
    
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    if (window.$toast) {
      window.$toast.error(msg, 'Ошибка добавления');
    } else {
      alert('❌ Ошибка добавления: ' + msg);
    }
  }
};

// Добавление недостающего типа из чек-листа
const addMissingType = async (typeName) => {
  let targetType = null;
  for (const group of Object.values(displayAvailableTypes.value)) {
    const found = group.find(t => t.name === typeName);
    if (found) {
      targetType = found;
      break;
    }
  }
  
  if (targetType) {
    await openAddDetailModal(targetType);
  } else {
    alert('Не удалось найти тип детали: ' + typeName);
  }
};

// ===== Инициализация =====
onMounted(async () => {
  await Promise.all([
    fetchAssembly(),
    loadAssemblyGoals(),
    loadAvailableTypes(),
    fetchAssemblyDetails()
  ]);
});

console.log('🔧 assemblyId:', assemblyId.value);
console.log('🔧 selectedGoalId:', selectedGoalId.value);
</script>

<style scoped>
/* ===== Базовые стили ===== */
.page { max-width: 1400px; margin: 0 auto; }
.page-header { margin-bottom: 2rem; display: flex; align-items: center; gap: 1rem; }
.btn-back {
  background: transparent; border: 1px solid rgba(255,255,255,0.2);
  color: #94a3b8; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer;
}
.btn-back:hover { border-color: #60a5fa; color: #fff; }

.card { 
  background: #111827; 
  border: 1px solid rgba(59, 130, 246, 0.3); 
  border-radius: 12px; 
  padding: 1.5rem; 
}
.detail-card { margin-bottom: 2rem; }

.detail-row { 
  display: flex; gap: 1rem; padding: 0.75rem 0; 
  border-bottom: 1px solid rgba(255,255,255,0.05); 
}
.detail-row:last-child { border-bottom: none; }
.detail-row.full { flex-direction: column; }
.detail-row label { min-width: 100px; color: #94a3b8; font-size: 0.9rem; }
.detail-row .value { color: #e0e7ff; font-weight: 500; }
.detail-row .description { 
  margin: 0.5rem 0 0; color: #cbd5e1; 
  line-height: 1.6; white-space: pre-wrap; 
}

.actions { 
  display: flex; gap: 0.75rem; 
  margin-top: 1.5rem; padding-top: 1rem; 
  border-top: 1px solid rgba(255,255,255,0.1); 
}

/* ===== Двухколоночный layout ===== */
.two-column-layout {
  display: grid;
  grid-template-columns: 35% 65%;
  gap: 2rem;
  margin-top: 2rem;
}

.left-column, .right-column {
  min-width: 0;
}

/* ===== Модальные окна ===== */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; backdrop-filter: blur(4px);
}
.modal {
  background: #111827; border: 1px solid rgba(59, 130, 246, 0.4);
  border-radius: 12px; width: 90%; max-width: 500px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}
.modal-header h2 { margin: 0; font-size: 1.2rem; color: #e0e7ff; }
.close-btn { 
  background: none; border: none; 
  color: #94a3b8; font-size: 1.5rem; cursor: pointer; 
}
.close-btn:hover { color: #fff; }
.modal-body { padding: 1.5rem; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 0.75rem;
  padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);
}

.form-group { margin-bottom: 1.25rem; }
.form-group label { 
  display: block; margin-bottom: 0.4rem; 
  color: #94a3b8; font-size: 0.9rem; 
}
.form-group input, .form-group textarea {
  width: 100%; padding: 0.6rem 0.8rem;
  background: #0b1120; border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px; color: #e0e7ff; font-size: 0.95rem;
}
.form-group input:focus, .form-group textarea:focus {
  outline: none; border-color: #60a5fa; 
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
}
.readonly-field {
  padding: 0.6rem 0.8rem; 
  background: rgba(59, 130, 246, 0.1);
  border-radius: 6px; color: #cbd5e1; font-size: 0.95rem;
}

/* ===== Кнопки ===== */
.btn {
  position: relative; z-index: 1;
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.625rem 1.25rem; 
  border: 1px solid rgba(59, 130, 246, 0.5);
  border-radius: 8px; 
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd; cursor: pointer; 
  transition: all 0.2s;
  font-weight: 500; font-size: 0.9rem; 
  text-decoration: none;
}
.btn:hover { 
  background: rgba(59, 130, 246, 0.25); 
  border-color: #60a5fa; color: #bfdbfe; 
}
.btn-primary { 
  background: #2563eb; border-color: #2563eb; color: white; 
}
.btn-primary:hover { 
  background: #1d4ed8; 
  box-shadow: 0 0 15px rgba(37, 99, 235, 0.4); 
}
.btn-outline { 
  background: transparent; 
  border-color: rgba(59, 130, 246, 0.5); 
}
.btn-danger { 
  background: rgba(239, 68, 68, 0.15); 
  border-color: rgba(239, 68, 68, 0.5); 
  color: #fca5a5; 
}
.btn-danger:hover { 
  background: rgba(239, 68, 68, 0.25); 
  border-color: #ef4444; 
}
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* ===== Состояния загрузки ===== */
.loading-state, .error-state {
  display: flex; flex-direction: column; 
  align-items: center; justify-content: center;
  padding: 3rem; color: #94a3b8; gap: 1rem;
}
.spinner {
  width: 32px; height: 32px; 
  border: 3px solid rgba(96, 165, 250, 0.2);
  border-top-color: #60a5fa; 
  border-radius: 50%; 
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== Адаптив ===== */
@media (max-width: 1024px) {
  .two-column-layout {
    grid-template-columns: 1fr;
  }
  .left-column, .right-column {
    width: 100%;
  }
}
</style>