<template>
  <div class="page" data-testid="page-assemblies">
    <div class="page-header">
      <div class="header-content">
        <h1>
          <Telescope class="page-icon" />
          Мои сборки
        </h1>
        <p class="page-subtitle">Управление конфигурациями телескопов</p>
      </div>
      <button v-if="activeSection === 'mine'" @click="openCreateModal" class="btn btn-primary" data-testid="btn-create-assembly">
        Создать сборку
      </button>
    </div>

    <nav class="section-tabs" aria-label="Разделы сборок">
      <button :class="{ active: activeSection === 'mine' }" @click="switchSection('mine')">Мои сборки</button>
      <button :class="{ active: activeSection === 'liked' }" @click="switchSection('liked')"><Heart /> Лайкнутые / сохранённые</button>
    </nav>

    <!-- Пагинация и сортировка -->
    <div v-if="activeSection === 'mine'" class="controls-bar">
      <div class="sort-control">
        <label>Сортировка:</label>
        <select v-model="sortBy" @change="fetchAssemblies" data-testid="select-assemblies-sort">
          <option value="name,asc">Название (А-Я)</option>
          <option value="name,desc">Название (Я-А)</option>
          <option value="id,asc">ID (по возрастанию)</option>
          <option value="id,desc">ID (по убыванию)</option>
        </select>
      </div>
      
      <div class="page-control">
        <button @click="prevPage" :disabled="currentPage === 0" class="btn-icon">
          <ChevronLeft class="icon" />
        </button>
        <span class="page-info">Стр. {{ currentPage + 1 }} из {{ totalPages }}</span>
        <button @click="nextPage" :disabled="currentPage >= totalPages - 1" class="btn-icon">
          <ChevronRight class="icon" />
        </button>
      </div>
    </div>

    <!-- Состояния -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Загрузка сборок...</p>
    </div>
    
    <div v-else-if="error" class="error-state">
      <AlertTriangle class="error-icon" />
      <p>{{ error }}</p>
      <button @click="loadSection" class="btn">Повторить</button>
    </div>

    <!-- Таблица сборок -->
    <div v-else class="card">
      <table class="data-table">
        <thead>
          <tr>
            <th width="60">ID</th>
            <th>Название</th>
            <th>Описание</th>
            <th width="140">{{ activeSection === 'mine' ? 'Действия' : 'Сохранено' }}</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="assembly in assemblies" 
            :key="assembly.id"
            @click="openAssembly(assembly)"
            class="clickable-row"
            data-testid="assembly-row"
            :data-assembly-id="assembly.id"
          >
            <td>#{{ assembly.id }}</td>
            <td class="fw-medium">{{ assembly.name }}</td>
            <td class="text-truncate">{{ assembly.description || '—' }}</td>
            <td @click.stop>
              <div class="action-buttons">
                <button v-if="activeSection === 'mine'" @click.stop="openEditModal(assembly)" class="btn-icon" title="Редактировать">
                  <Pencil class="icon" />
                </button>
                <button v-if="activeSection === 'mine'" @click.stop="handleDelete(assembly.id)" class="btn-icon danger" title="Удалить">
                  <Trash2 class="icon" />
                </button>
                <button v-else @click.stop="removeSavedAssembly(assembly)" class="btn-icon liked" :disabled="assembly._busy" title="Убрать из сохранённых">
                  <Heart class="icon" fill="currentColor" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="assemblies.length === 0">
            <td colspan="4" class="empty-state">{{ activeSection === 'mine' ? 'Нет сборок. Создайте первую!' : 'Нет сохранённых сборок' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <button v-if="activeSection === 'liked' && likedNextCursor" class="btn load-more" :disabled="loadingMore" @click="fetchLikedAssemblies(false)">
      {{ loadingMore ? 'Загрузка...' : 'Показать ещё' }}
    </button>

    <Teleport to="body">
    <div v-if="publicAssembly" class="modal-overlay" @click.self="publicAssembly = null">
      <div class="modal public-assembly-modal">
        <div class="modal-header"><h2>{{ publicAssembly.name }}</h2><button class="close-btn" @click="publicAssembly = null"><X class="icon" /></button></div>
        <div class="modal-body">
          <p class="public-description">{{ publicAssembly.description || 'Описание не указано' }}</p>
          <p v-if="publicAssembly.owner?.username" class="public-owner">Автор: {{ publicAssembly.owner.username }}</p>
          <h3>Компоненты</h3>
          <div v-if="publicAssemblyComponents.length" class="public-components">
            <div v-for="component in publicAssemblyComponents" :key="component.assemblyDetailId || component.id" class="public-component">
              <strong>{{ component.detail?.name || component.detailInfo?.nameDetail || component.name || 'Деталь' }}</strong>
              <span>{{ component.detail?.type?.name || component.detailInfo?.nameType || '' }}</span>
              <small v-if="component.description">{{ component.description }}</small>
            </div>
          </div>
          <p v-else class="empty-state">Компоненты не указаны</p>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- Модальное окно: Создание/Редактирование -->
    <Teleport to="body">
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal" data-testid="assembly-modal">
        <div class="modal-header">
          <h2>{{ editingId ? 'Редактировать' : 'Создать' }} сборку</h2>
          <button @click="closeModal" class="close-btn">
            <X class="icon" />
          </button>
        </div>
        
        <form @submit.prevent="submitForm" class="modal-body">
          <div class="form-group">
            <label>Название *</label>
            <input v-model="form.name" required placeholder="Например: Основная сборка">
          </div>

          <div class="form-group">
            <label>Описание</label>
            <textarea v-model="form.description" rows="3" placeholder="Для каких наблюдений..."></textarea>
          </div>

          <div class="modal-footer">
            <button type="button" @click="closeModal" class="btn">Отмена</button>
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
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import userAssembliesApi from '@/services/userAssemblies';
import { 
  Telescope, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  Heart,
  Pencil, 
  Trash2, 
  X 
} from 'lucide-vue-next';

const router = useRouter();
const assemblies = ref([]);
const loading = ref(false);
const error = ref(null);
const showModal = ref(false);
const editingId = ref(null);
const submitting = ref(false);
const activeSection = ref('mine');
const likedNextCursor = ref(null);
const loadingMore = ref(false);
const publicAssembly = ref(null);
const publicAssemblyComponents = computed(() => publicAssembly.value?.components || publicAssembly.value?.assemblyDetails || publicAssembly.value?.details || []);

// Пагинация
const currentPage = ref(0);
const totalPages = ref(1);
const pageSize = ref(10);
const sortBy = ref('name,asc');

const form = ref({ name: '', description: '' });

const fetchAssemblies = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const [sortField, sortDir] = sortBy.value.split(',');
    const data = await userAssembliesApi.getAll({
      page: currentPage.value,
      size: pageSize.value,
      sortBy: sortField,
      sortDir: sortDir
    });
    
    if (activeSection.value === 'mine') {
      assemblies.value = data.content || [];
      totalPages.value = data.totalPages || 1;
    }
    
  } catch (err) {
    error.value = err.response?.data?.message || 'Не удалось загрузить сборки';
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const normalizeAssembly = (item) => {
  const assembly = item?.assembly || item;
  return { ...item, ...assembly, id: assembly?.id ?? assembly?.assemblyId };
};

const fetchLikedAssemblies = async (reset = true) => {
  if (reset) loading.value = true;
  else loadingMore.value = true;
  error.value = null;
  try {
    const data = await userAssembliesApi.getLiked({ limit: 20, cursor: reset ? null : likedNextCursor.value });
    const items = (data?.items || data?.content || (Array.isArray(data) ? data : [])).map(normalizeAssembly);
    if (activeSection.value === 'liked') {
      assemblies.value = reset ? items : [...assemblies.value, ...items];
      likedNextCursor.value = data?.nextCursor ?? null;
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'Не удалось загрузить сохранённые сборки';
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

const loadSection = () => activeSection.value === 'mine' ? fetchAssemblies() : fetchLikedAssemblies();
const switchSection = (section) => {
  if (activeSection.value === section) return;
  activeSection.value = section;
  assemblies.value = [];
  error.value = null;
  loadSection();
};

const prevPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--;
    fetchAssemblies();
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value - 1) {
    currentPage.value++;
    fetchAssemblies();
  }
};

const goToDetail = (id) => {
  router.push(`/assemblies/${id}`);
};

const openAssembly = async (assembly) => {
  if (activeSection.value === 'mine') return goToDetail(assembly.id);
  try {
    const response = await userAssembliesApi.getPublicById(assembly.id);
    publicAssembly.value = response?.assembly || response;
  } catch (err) {
    alert('❌ ' + (err.response?.data?.message || 'Не удалось открыть публичную сборку'));
  }
};

const removeSavedAssembly = async (assembly) => {
  if (assembly._busy) return;
  assembly._busy = true;
  try {
    await userAssembliesApi.unlike(assembly.id);
    assemblies.value = assemblies.value.filter(item => item.id !== assembly.id);
  } catch (err) {
    alert('❌ ' + (err.response?.data?.message || 'Не удалось убрать сборку из сохранённых'));
  } finally {
    assembly._busy = false;
  }
};

const openCreateModal = () => {
  editingId.value = null;
  form.value = { name: '', description: '' };
  showModal.value = true;
};

const openEditModal = (assembly) => {
  editingId.value = assembly.id;
  form.value = { 
    name: assembly.name, 
    description: assembly.description 
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingId.value = null;
};

const submitForm = async () => {
  submitting.value = true;
  try {
    if (editingId.value) {
      await userAssembliesApi.update(editingId.value, form.value);
    } else {
      await userAssembliesApi.create(form.value);
    }
    closeModal();
    fetchAssemblies();
  } catch (err) {
    alert('❌ Ошибка: ' + (err.response?.data?.message || err.message));
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (id) => {
  if (!confirm('Удалить эту сборку? Фотографии сохранятся вместе с историческим снимком сборки.')) return;
  
  try {
    await userAssembliesApi.delete(id);
    fetchAssemblies();
  } catch (err) {
    alert('❌ Ошибка удаления: ' + (err.response?.data?.message || err.message));
  }
};

onMounted(fetchAssemblies);
</script>

<style scoped>
/* ===== Иконки Lucide ===== */
:deep(svg.lucide) {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}

.page-icon {
  width: 28px !important;
  height: 28px !important;
  color: #60a5fa;
}

.error-icon {
  width: 24px !important;
  height: 24px !important;
  color: #fca5a5;
  margin-right: 0.5rem;
}

.btn-icon {
  background: transparent; 
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px; 
  padding: 0.4rem; 
  cursor: pointer;
  transition: all 0.2s; 
  color: #cbd5e1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.btn-icon :deep(svg) {
  width: 16px !important;
  height: 16px !important;
}

.btn-icon:hover { 
  background: rgba(255,255,255,0.1); 
  border-color: #60a5fa; 
}
.btn-icon.danger:hover { 
  background: rgba(239, 68, 68, 0.2); 
  border-color: #ef4444; 
}

.close-btn :deep(svg) {
  width: 20px !important;
  height: 20px !important;
}

.btn :deep(svg) {
  width: 16px !important;
  height: 16px !important;
}

/* ===== Базовые стили ===== */
.page { max-width: 1200px; margin: 0 auto; }

.page-header { 
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 2rem;
  flex-wrap: wrap;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.page-header h1 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
}

.page-subtitle { 
  color: #94a3b8; 
  margin: 0;
  font-size: 0.95rem;
}
.section-tabs { display: flex; gap: .5rem; margin: 0 0 1.25rem; padding: .35rem; width: fit-content; max-width: 100%; background: #0b1120; border: 1px solid rgba(59,130,246,.3); border-radius: 10px; }
.section-tabs button { display: inline-flex; align-items: center; gap: .45rem; padding: .65rem .9rem; color: #94a3b8; background: transparent; border: 0; border-radius: 7px; cursor: pointer; font-weight: 600; white-space: nowrap; }
.section-tabs button svg { width: 16px; height: 16px; }
.section-tabs button.active { color: #fff; background: #2563eb; }
.load-more { display: flex; margin: 1rem auto 0; }
.btn-icon.liked { color: #fb7185; }
.public-assembly-modal { max-width: 700px; max-height: 85vh; overflow: auto; }
.public-description { color: #cbd5e1; white-space: pre-wrap; }
.public-owner { color: #94a3b8; }
.public-components { display: grid; gap: .65rem; }
.public-component { display: grid; gap: .2rem; padding: .75rem; background: #0b1120; border: 1px solid rgba(59,130,246,.2); border-radius: 8px; }
.public-component span, .public-component small { color: #94a3b8; }

.controls-bar {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 1.5rem; padding: 0.75rem 1rem;
  background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px; flex-wrap: wrap; gap: 1rem;
}
.sort-control, .page-control { display: flex; align-items: center; gap: 0.5rem; }
.sort-control label { color: #94a3b8; font-size: 0.9rem; }
.sort-control select {
  padding: 0.4rem 0.6rem; background: #0b1120; border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px; color: #e0e7ff; cursor: pointer;
}
.page-info { color: #94a3b8; font-size: 0.9rem; }

.card { background: #111827; border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; overflow: hidden; }

.data-table { width: 100%; border-collapse: collapse; }
.data-table th {
  background: rgba(59, 130, 246, 0.1); padding: 1rem; text-align: left;
  font-weight: 600; color: #93c5fd; border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}
.data-table td {
  padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1;
}

.clickable-row { cursor: pointer; transition: background 0.2s; }
.clickable-row:hover td { background: rgba(59, 130, 246, 0.1); }

.text-truncate {
  max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* ===== Кнопки действий ===== */
.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.empty-state { text-align: center; color: #64748b; padding: 2rem !important; }

/* Модальное окно */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 10000; backdrop-filter: blur(4px);
}
.modal {
  background: #111827; border: 1px solid rgba(59, 130, 246, 0.4);
  border-radius: 12px; width: 90%; max-width: 500px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  max-height: min(90dvh, 760px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}
.modal-header h2 { margin: 0; font-size: 1.2rem; color: #e0e7ff; }
.close-btn {
  background: none; border: none; color: #94a3b8; cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
}
.close-btn:hover { color: #fff; }
.modal-body { min-height: 0; padding: 1.5rem; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 0.75rem;
  padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);
}

.form-group { margin-bottom: 1.25rem; }
.form-group label { display: block; margin-bottom: 0.4rem; color: #94a3b8; font-size: 0.9rem; }
.form-group input, .form-group textarea {
  width: 100%; padding: 0.6rem 0.8rem;
  background: #0b1120; border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px; color: #e0e7ff; font-size: 0.95rem;
}
.form-group input:focus, .form-group textarea:focus {
  outline: none; border-color: #60a5fa; box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
}

.loading-state, .error-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 3rem; color: #94a3b8; gap: 1rem;
}
.spinner {
  width: 32px; height: 32px; border: 3px solid rgba(96, 165, 250, 0.2);
  border-top-color: #60a5fa; border-radius: 50%; animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== Адаптив ===== */
@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-content {
    width: 100%;
  }
  
  .btn-primary {
    width: 100%;
    justify-content: center;
  }
  .section-tabs { width: 100%; overflow-x: auto; }
  .card { overflow-x: hidden; }
  .modal-overlay { align-items: flex-end; }
  .modal { width: 100%; max-height: calc(100dvh - env(safe-area-inset-top) - .5rem); border-radius: 14px 14px 0 0; }
  .modal-header { padding: 1rem; }
  .modal-body { padding: 1rem; padding-bottom: calc(1rem + env(safe-area-inset-bottom)); }
  .modal-footer { position: sticky; bottom: calc(-1rem - env(safe-area-inset-bottom)); z-index: 2; margin: 1rem -1rem calc(-1rem - env(safe-area-inset-bottom)); padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom)); background: #111827; }
  .modal-footer .btn { min-height: 44px; }
  .public-assembly-modal .modal-body { padding-bottom: calc(1.5rem + env(safe-area-inset-bottom)); }
}
</style>
