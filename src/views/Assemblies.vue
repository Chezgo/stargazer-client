<template>
  <div class="page">
    <div class="page-header">
      <h1>🔭 Мои сборки</h1>
      <p class="page-subtitle">Управление конфигурациями телескопов</p>
      <button @click="openCreateModal" class="btn btn-primary">
        <span>+</span> Создать сборку
      </button>
    </div>

    <!-- Пагинация и сортировка -->
    <div class="controls-bar">
      <div class="sort-control">
        <label>Сортировка:</label>
        <select v-model="sortBy" @change="fetchAssemblies">
          <option value="name,asc">Название (А-Я)</option>
          <option value="name,desc">Название (Я-А)</option>
          <option value="id,asc">ID (по возрастанию)</option>
          <option value="id,desc">ID (по убыванию)</option>
        </select>
      </div>
      
      <div class="page-control">
        <button @click="prevPage" :disabled="currentPage === 0" class="btn-icon">←</button>
        <span class="page-info">Стр. {{ currentPage + 1 }} из {{ totalPages }}</span>
        <button @click="nextPage" :disabled="currentPage >= totalPages - 1" class="btn-icon">→</button>
      </div>
    </div>

    <!-- Состояния -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Загрузка сборок...</p>
    </div>
    
    <div v-else-if="error" class="error-state">
      <p>⚠️ {{ error }}</p>
      <button @click="fetchAssemblies" class="btn">Повторить</button>
    </div>

    <!-- Таблица сборок -->
    <div v-else class="card">
      <table class="data-table">
        <thead>
          <tr>
            <th width="60">ID</th>
            <th>Название</th>
            <th>Описание</th>
            <th width="140">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="assembly in assemblies" 
            :key="assembly.id"
            @click="goToDetail(assembly.id)"
            class="clickable-row"
          >
            <td>#{{ assembly.id }}</td>
            <td class="fw-medium">{{ assembly.name }}</td>
            <td class="text-truncate">{{ assembly.description || '—' }}</td>
            <td @click.stop>
              <button @click.stop="openEditModal(assembly)" class="btn-icon" title="Редактировать">✏️</button>
              <button @click.stop="handleDelete(assembly.id)" class="btn-icon danger" title="Удалить">🗑️</button>
            </td>
          </tr>
          <tr v-if="assemblies.length === 0">
            <td colspan="4" class="empty-state">Нет сборок. Создайте первую!</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Модальное окно: Создание/Редактирование -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingId ? 'Редактировать' : 'Создать' }} сборку</h2>
          <button @click="closeModal" class="close-btn">×</button>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import userAssembliesApi from '@/services/userAssemblies';

const router = useRouter();
const assemblies = ref([]);
const loading = ref(false);
const error = ref(null);
const showModal = ref(false);
const editingId = ref(null);
const submitting = ref(false);

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
    
    assemblies.value = data.content || [];
    totalPages.value = data.totalPages || 1;
    
  } catch (err) {
    error.value = err.response?.data?.message || 'Не удалось загрузить сборки';
    console.error(err);
  } finally {
    loading.value = false;
  }
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
  if (!confirm('Удалить эту сборку? Это действие необратимо.')) return;
  
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
.page { max-width: 1200px; margin: 0 auto; }
.page-header { margin-bottom: 2rem; }
.page-subtitle { color: #94a3b8; margin: 0.25rem 0 1rem; }

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

.actions { display: flex; gap: 0.5rem; }
.btn-icon {
  background: transparent; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px; padding: 0.4rem 0.6rem; cursor: pointer;
  transition: all 0.2s; font-size: 1rem;
}
.btn-icon:hover { background: rgba(255,255,255,0.1); border-color: #60a5fa; }
.btn-icon.danger:hover { background: rgba(239, 68, 68, 0.2); border-color: #ef4444; }

.empty-state { text-align: center; color: #64748b; padding: 2rem !important; }

/* Модальное окно */
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
  background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer;
}
.close-btn:hover { color: #fff; }
.modal-body { padding: 1.5rem; }
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
</style>