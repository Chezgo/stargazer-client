<template>
  <div class="page">
    <div class="page-header">
      <button @click="$router.back()" class="btn btn-back">
        <ArrowLeft class="btn-icon" />
        Назад
      </button>
      <h1>{{ assembly?.name || 'Загрузка...' }}</h1>
    </div>

    <!-- Состояния загрузки -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Загрузка сборки...</p>
    </div>
    
    <div v-else-if="error" class="error-state">
      <p>⚠️ {{ error }}</p>
      <button @click="fetchAssembly" class="btn">Повторить</button>
    </div>

    <template v-else-if="assembly">
      <!-- Основная информация о сборке -->
      <div class="card detail-card">
          <div class="card-top-actions">
            <button @click="openEditModal" class="btn">
              <Pencil class="btn-icon" />
              Редактировать
            </button>
            <button @click="handleDelete" class="btn btn-danger">
              <Trash2 class="btn-icon" />
              Удалить
            </button>
          </div>

          <div class="detail-card-content">
            <div class="detail-row">
              <label>Название</label>
              <span class="value">{{ assembly.name }}</span>
            </div>
            <div class="detail-row full">
              <label>Описание</label>
              <p class="description">{{ assembly.description || '—' }}</p>
            </div>
          </div>

          <div class="actions">
            <button
              class="btn btn-like"
              :class="{ liked: assembly.likedByMe }"
              :disabled="likeBusy"
              :aria-pressed="Boolean(assembly.likedByMe)"
              @click="toggleLike"
            >
              <Heart class="btn-icon" :fill="assembly.likedByMe ? 'currentColor' : 'none'" />
              {{ assembly.likedByMe ? 'Нравится' : 'Поставить лайк' }} · {{ Number(assembly.likesCount) || 0 }}
            </button>
          </div>
      </div>

      <aside class="goal-summary" aria-label="Цель и оценка сборки">
        <AssemblyGoalsPanel
          :assembly-goals="assemblyGoals"
          v-model:selectedGoalId="selectedGoalId"
          :evaluation="evaluation"
          @show-recommendations="scrollToEquipment"
        />
      </aside>

      <ObservationEquipmentPanel
        id="observation-equipment"
        :types="displayAvailableTypes"
        :details="assemblyDetails"
        :has-goal="!!selectedGoalId"
        :evaluation="evaluation"
        :types-loading="typesLoading"
        :details-loading="detailsLoading"
        :types-error="typesError"
        :details-error="detailsError"
        @reload="onDetailsChanged"
        @add-detail="openAddDetailModal"
        @remove-detail="handleRemoveDetail"
      />
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
      @search="searchCatalog"
      @reset="resetFilters"
      @select="selectDetail"
      @prev-page="prevCatalogPage"
      @next-page="nextCatalogPage"
    />

    <!-- Модальное окно редактирования сборки -->
    <Teleport to="body">
    <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
      <div class="modal">
        <div class="modal-header">
          <h2>Редактировать сборку</h2>
          <button @click="closeEditModal" class="close-btn">
            <X class="icon" />
          </button>
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
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Heart, Pencil, Trash2, X } from 'lucide-vue-next';

// Composables
import { useAssembly } from '@/composables/useAssembly';
import { useAssemblyEvaluation } from '@/composables/useAssemblyEvaluation';
import { useAssemblyDetails } from '@/composables/useAssemblyDetails';
import { useAvailableTypes } from '@/composables/useAvailableTypes';
import { useCatalogSearch } from '@/composables/useCatalogSearch';

// Child Components
import AssemblyGoalsPanel from './AssemblyGoalsPanel.vue';
import ObservationEquipmentPanel from './ObservationEquipmentPanel.vue';
import DetailCatalogModal from './DetailCatalogModal.vue';

// Services
import assemblyDetailsApi from '@/services/assemblyDetails';
import userAssembliesApi from '@/services/userAssemblies';
import { getApiErrorMessage } from '@/services/api';

const route = useRoute();
const router = useRouter();

const assemblyId = ref(parseInt(route.params.id, 10));
const likeBusy = ref(false);

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
  fetchAssemblyDetails,
  handleRemoveDetail: removeAssemblyDetail
} = useAssemblyDetails(assemblyId);

const {
  displayAvailableTypes, typesLoading, typesError,
  loadAvailableTypes
} = useAvailableTypes(assemblyId, selectedGoalId);

const {
  showAddDetailModal, selectedType,
  catalogDetails, catalogLoading, catalogError,
  catalogPage, catalogTotalPages, filters, brands,
  fetchCatalogDetails, searchCatalog, prevCatalogPage, nextCatalogPage,
  resetFilters, openAddDetailModal, closeAddDetailModal
} = useCatalogSearch();

// ===== Бизнес-логика =====

const onDetailsChanged = async () => {
  await fetchAssemblyDetails();
  if (selectedGoalId.value) {
    await loadEvaluation();
  }
  await loadAvailableTypes();
};

const scrollToEquipment = () => {
  document.getElementById('observation-equipment')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
};

const handleRemoveDetail = async (detailId) => {
  await removeAssemblyDetail(detailId);
  await loadAvailableTypes();
  if (selectedGoalId.value) await loadEvaluation();
};

const toggleLike = async () => {
  if (!assembly.value || likeBusy.value) return;
  likeBusy.value = true;
  try {
    const state = assembly.value.likedByMe
      ? await userAssembliesApi.unlike(assemblyId.value)
      : await userAssembliesApi.like(assemblyId.value);
    assembly.value.likedByMe = Boolean(state.liked);
    assembly.value.likesCount = Number(state.likesCount) || 0;
  } catch (err) {
    window.$toast?.error(getApiErrorMessage(err, 'Не удалось изменить лайк'), 'Ошибка');
  } finally {
    likeBusy.value = false;
  }
};

const selectDetail = async (detail) => {
  try {
    await assemblyDetailsApi.addToAssembly(assemblyId.value, {
      idTelescopeDetail: detail.id,
      description: 'Деталь в сборке из пользовательского интерфейса'
    });
    
    closeAddDetailModal();
    await onDetailsChanged();
    
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

// ===== Инициализация =====
onMounted(async () => {
  await Promise.all([
    fetchAssembly(),
    loadAssemblyGoals(),
    loadAvailableTypes(),
    fetchAssemblyDetails()
  ]);
});
</script>

<style scoped>
/* ===== Базовые стили ===== */
.page { max-width: 1600px; margin: 0 auto; }
.page-header { margin-bottom: 2rem; display: flex; align-items: center; gap: 1rem; }
.btn-back {
  background: transparent; border: 1px solid rgba(255,255,255,0.2);
  color: #94a3b8; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.btn-back:hover { border-color: #60a5fa; color: #fff; }

.btn-icon {
  width: 16px;
  height: 16px;
}

.card { 
  background: #111827; 
  border: 1px solid rgba(59, 130, 246, 0.3); 
  border-radius: 12px; 
  padding: 1.5rem; 
}
.detail-card {
  position: relative;
  margin-bottom: 1.5rem;
}

.detail-card-content .detail-row:first-child {
  padding-right: 18rem;
}

.card-top-actions {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  display: flex;
  gap: 0.75rem;
}

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

/* ===== Цель и оценка ===== */
.goal-summary {
  min-width: 0;
  margin-bottom: 1.5rem;
}

.goal-summary :deep(.goal-section) {
  display: grid;
  grid-template-columns: 1fr;
  align-items: stretch;
  gap: 1.5rem;
}

.goal-summary :deep(.goal-section.has-evaluation) {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.goal-summary :deep(.goal-zone),
.goal-summary :deep(.evaluation-summary) {
  height: 100%;
}

/* ===== Модальные окна ===== */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 10000; backdrop-filter: blur(4px);
}
.modal {
  background: #111827; border: 1px solid rgba(59, 130, 246, 0.4);
  border-radius: 12px; width: 90%; max-width: 500px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  flex-shrink: 0;
}
.modal-header h2 { margin: 0; font-size: 1.2rem; color: #e0e7ff; }
.close-btn { 
  background: none; border: none; 
  color: #94a3b8; cursor: pointer;
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
.modal-body { min-height: 0; padding: 1.5rem; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; flex: 1; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 0.75rem;
  padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);
  flex-shrink: 0;
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
@media (max-width: 1050px) {
  .goal-summary :deep(.goal-section.has-evaluation) {
    grid-template-columns: 1fr;
  }
}

.btn-like.liked { color: #fb7185; border-color: rgba(251, 113, 133, 0.55); background: rgba(251, 113, 133, 0.12); }
@media (max-width: 640px) {
  .page-header { align-items: flex-start; flex-direction: column; }
  .card { padding: 1rem; }
  .detail-card-content .detail-row:first-child { padding-right: 0; }
  .card-top-actions { position: static; display: grid; grid-template-columns: 1fr; margin-bottom: .75rem; }
  .card-top-actions .btn { width: 100%; min-height: 44px; justify-content: center; }
  .detail-row { flex-direction: column; gap: .25rem; }
  .detail-row label { min-width: 0; }
  .actions { display: grid; grid-template-columns: 1fr; }
  .actions .btn { width: 100%; min-height: 44px; justify-content: center; }
  .modal-overlay { align-items: flex-end; }
  .modal { width: 100%; max-height: calc(100dvh - env(safe-area-inset-top) - .5rem); border-radius: 14px 14px 0 0; }
  .modal-header { padding: 1rem; }
  .modal-body { padding: 1rem; padding-bottom: calc(1rem + env(safe-area-inset-bottom)); }
  .modal-footer { flex-wrap: wrap; }
  .modal-footer { position: sticky; bottom: calc(-1rem - env(safe-area-inset-bottom)); z-index: 2; margin: 1rem -1rem calc(-1rem - env(safe-area-inset-bottom)); padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom)); background: #111827; }
  .modal-footer .btn { flex: 1; min-height: 44px; justify-content: center; }
}
</style>
