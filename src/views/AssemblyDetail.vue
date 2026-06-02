<template>
  <div class="page">
    <div class="page-header">
      <button @click="$router.back()" class="btn btn-back">← Назад</button>
      <h1>{{ assembly?.name || 'Загрузка...' }}</h1>
    </div>

    <!-- Состояния загрузки сборки -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Загрузка...</p>
    </div>
    
    <div v-else-if="error" class="error-state">
      <p>⚠️ {{ error }}</p>
      <button @click="fetchAssembly" class="btn">Повторить</button>
    </div>

    <!-- Карточка сборки -->
    <div v-else-if="assembly" class="card detail-card">
      <div class="detail-row">
        <label>ID</label>
        <span class="value">#{{ assembly.id }}</span>
      </div>
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

    <!-- ===== СЕКЦИЯ: Добавить деталь в сборку ===== -->
    <div v-if="assembly" class="section">
      <div class="section-header">
        <h2>🔧 Добавить деталь в сборку</h2>
        <button @click="toggleAllGroups" class="btn btn-outline btn-sm">
          {{ allGroupsExpanded ? 'Свернуть все' : 'Развернуть все' }}
        </button>
      </div>

      <!-- Загрузка типов деталей -->
      <div v-if="typesLoading" class="loading-state small">
        <div class="spinner-small"></div>
        <p>Загрузка каталога...</p>
      </div>
      
      <div v-else-if="typesError" class="error-state small">
        <p>⚠️ {{ typesError }}</p>
        <button @click="loadDetailTypes" class="btn btn-sm">Повторить</button>
      </div>

      <!-- Группы деталей -->
      <div v-else class="groups-container">
        <div v-for="(types, groupName) in groupedTypes" :key="groupName" class="group-card">
          <button @click="toggleGroup(groupName)" class="group-header">
            <span class="group-name">{{ groupName }}</span>
            <span class="group-toggle">{{ expandedGroups[groupName] ? '−' : '+' }}</span>
          </button>
          
          <div v-show="expandedGroups[groupName]" class="group-content">
            <div class="types-grid">
              <button v-for="type in types" :key="type.id" @click="openAddDetailModal(type)" class="type-btn">
                <span class="type-icon">🔹</span>
                <span class="type-name">{{ type.name }}</span>
                <span class="type-desc">{{ truncate(type.description, 80) }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== СЕКЦИЯ: Детали в сборке ===== -->
    <div v-if="assembly" class="section">
      <div class="section-header">
        <h2>📋 Детали в этой сборке</h2>
        <button @click="fetchAssemblyDetails" class="btn btn-outline btn-sm">🔄 Обновить</button>
      </div>

      <div v-if="detailsLoading" class="loading-state small">
        <div class="spinner-small"></div>
        <p>Загрузка деталей...</p>
      </div>
      
      <div v-else-if="detailsError" class="error-state small">
        <p>⚠️ {{ detailsError }}</p>
      </div>

      <div v-else-if="assemblyDetails.length === 0" class="card">
        <div class="empty-state">
          <p>📭 В этой сборке пока нет деталей</p>
          <p class="hint">Добавьте первую деталь выше</p>
        </div>
      </div>

      <div v-else class="details-list">
        <div v-for="item in assemblyDetails" :key="item.id" class="detail-item">
          <div class="detail-header">
            <h4>{{ item.detailInfo?.nameDetail || 'Загрузка...' }}</h4>
            <div class="detail-actions">
              <button @click="openEditDetailModal(item)" class="btn-icon" title="Редактировать">✏️</button>
              <button @click="handleRemoveDetail(item.id)" class="btn-icon danger" title="Удалить">🗑️</button>
            </div>
          </div>
          
          <div class="detail-meta">
            <span class="badge">{{ item.detailInfo?.nameType }}</span>
            <span class="badge">{{ item.detailInfo?.nameBrand }}</span>
          </div>
          
          <p v-if="item.description" class="detail-desc">{{ item.description }}</p>
          
          <!-- Краткие характеристики -->
          <div v-if="item.detailInfo?.attribute?.length" class="detail-attrs">
            <span v-for="attr in item.detailInfo.attribute.slice(0, 3)" :key="attr.id" class="attr-tag">
              {{ attr.attributeName }}: <strong>{{ attr.value || '—' }}</strong>
            </span>
            <span v-if="item.detailInfo.attribute.length > 3" class="attr-more">+{{ item.detailInfo.attribute.length - 3 }} ещё</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== Модальное окно: Выбор детали из каталога ===== -->
    <div v-if="showAddDetailModal" class="modal-overlay" @click.self="closeAddDetailModal">
      <div class="modal modal-xl">
        <div class="modal-header">
          <h2>Добавить: {{ selectedType?.name }}</h2>
          <button @click="closeAddDetailModal" class="close-btn">×</button>
        </div>
        
        <div class="modal-body">
          <!-- Фильтры -->
          <div class="filters-bar">
            <div class="filter-group">
              <label>Бренд</label>
              <select v-model="filters.brandId" @change="fetchCatalogDetails" class="form-select">
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
                @keyup.enter="fetchCatalogDetails"
                placeholder="Название детали..." 
                class="form-input"
              >
            </div>
            
            <button @click="fetchCatalogDetails" class="btn btn-primary">🔍 Найти</button>
            <button @click="resetFilters" class="btn btn-outline">Сбросить</button>
          </div>

          <!-- Список деталей -->
          <div v-if="catalogLoading" class="loading-state small">
            <div class="spinner-small"></div>
            <p>Поиск деталей...</p>
          </div>
          
          <div v-else-if="catalogError" class="error-state small">
            <p>⚠️ {{ catalogError }}</p>
          </div>
          
          <div v-else class="catalog-grid">
            <div v-for="detail in catalogDetails" :key="detail.id" class="catalog-card">
              <div class="catalog-header">
                <h4>{{ detail.nameDetail }}</h4>
                <span class="catalog-brand">{{ detail.nameBrand }}</span>
              </div>
              
              <p class="catalog-desc">{{ truncate(detail.description, 120) }}</p>
              
              <!-- Краткие атрибуты -->
              <div v-if="detail.attribute?.length" class="catalog-attrs">
                <span v-for="attr in detail.attribute.slice(0, 2)" :key="attr.id" class="attr-mini">
                  {{ attr.attributeName }}: {{ attr.value || '—' }}
                </span>
              </div>
              
              <button @click="selectDetail(detail)" class="btn btn-primary btn-sm">
                ✅ Выбрать
              </button>
            </div>
          </div>

          <!-- Пагинация -->
          <div v-if="catalogDetails.length > 0" class="catalog-pagination">
            <button @click="prevCatalogPage" :disabled="catalogPage === 0" class="btn-icon">←</button>
            <span>Стр. {{ catalogPage + 1 }} из {{ catalogTotalPages }}</span>
            <button @click="nextCatalogPage" :disabled="catalogPage >= catalogTotalPages - 1" class="btn-icon">→</button>
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" @click="closeAddDetailModal" class="btn">Закрыть</button>
        </div>
      </div>
    </div>

    <!-- ===== Модальное окно: Редактирование детали в сборке ===== -->
    <div v-if="showEditDetailModal" class="modal-overlay" @click.self="closeEditDetailModal">
      <div class="modal">
        <div class="modal-header">
          <h2>Редактировать деталь</h2>
          <button @click="closeEditDetailModal" class="close-btn">×</button>
        </div>
        
        <form @submit.prevent="submitEditDetail" class="modal-body">
          <div class="form-group">
            <label>Примечание к детали</label>
            <textarea v-model="editDetailForm.description" rows="3" placeholder="Например: Главное зеркало, установлено 2024"></textarea>
          </div>
          
          <div class="form-group">
            <label>Деталь</label>
            <div class="readonly-field">{{ selectedAssemblyDetail?.detailInfo?.nameDetail }}</div>
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
import userAssembliesApi from '@/services/userAssemblies';
import detailTypesApi from '@/services/detailTypes';
import detailsInfoApi from '@/services/detailsInfo';
import brandsApi from '@/services/brands';
import assemblyDetailsApi from '@/services/assemblyDetails';

const route = useRoute();
const router = useRouter();

// ===== Состояния сборки =====
const assembly = ref(null);
const loading = ref(false);
const error = ref(null);
const showEditModal = ref(false);
const submitting = ref(false);
const form = ref({ name: '', description: '' });

// ===== Состояния типов деталей =====
const detailTypes = ref([]);
const groupedTypes = ref({});
const typesLoading = ref(false);
const typesError = ref(null);
const expandedGroups = ref({});
const allGroupsExpanded = ref(true);

// ===== Состояния каталога деталей (модальное окно) =====
const showAddDetailModal = ref(false);
const selectedType = ref(null);
const catalogDetails = ref([]);
const catalogLoading = ref(false);
const catalogError = ref(null);
const catalogPage = ref(0);
const catalogTotalPages = ref(1);
const catalogPageSize = ref(8);

const filters = ref({ brandId: '', search: '' });
const brands = ref([]);

// ===== Состояния деталей в сборке =====
const assemblyDetails = ref([]);
const detailsLoading = ref(false);
const detailsError = ref(null);

// ===== Состояния редактирования детали в сборке =====
const showEditDetailModal = ref(false);
const submittingDetail = ref(false);
const editDetailForm = ref({ description: '' });
const selectedAssemblyDetail = ref(null);

const assemblyId = ref(parseInt(route.params.id, 10));

// ===== Загрузка сборки =====
const fetchAssembly = async () => {
  loading.value = true;
  error.value = null;
  try {
    assembly.value = await userAssembliesApi.getById(assemblyId.value);
  } catch (err) {
    error.value = err.response?.data?.message || 'Не удалось загрузить сборку';
    console.error(err);
  } finally {
    loading.value = false;
  }
};

// ===== Загрузка типов деталей =====
const loadDetailTypes = async () => {
  typesLoading.value = true;
  typesError.value = null;
  try {
    const types = await detailTypesApi.getAll();
    detailTypes.value = types;
    groupedTypes.value = detailTypesApi.groupByFunctionalGroup(types);
    expandedGroups.value = {};
    Object.keys(groupedTypes.value).forEach(group => {
      expandedGroups.value[group] = true;
    });
  } catch (err) {
    typesError.value = 'Не удалось загрузить каталог деталей';
    console.error(err);
  } finally {
    typesLoading.value = false;
  }
};

// ===== Управление группами =====
const toggleGroup = (groupName) => {
  expandedGroups.value[groupName] = !expandedGroups.value[groupName];
};

const toggleAllGroups = () => {
  allGroupsExpanded.value = !allGroupsExpanded.value;
  Object.keys(groupedTypes.value).forEach(group => {
    expandedGroups.value[group] = allGroupsExpanded.value;
  });
};

// ===== Утилиты =====
const truncate = (text, length) => {
  if (!text) return '';
  return text.length > length ? text.slice(0, length) + '…' : text;
};

// ===== Загрузка брендов для фильтра =====
const loadBrands = async () => {
  try {
    brands.value = await brandsApi.getAll();
  } catch (err) {
    console.warn('⚠️ Не удалось загрузить бренды:', err);
  }
};

// ===== Загрузка деталей каталога (с фильтрами) =====
const fetchCatalogDetails = async () => {
  catalogLoading.value = true;
  catalogError.value = null;
  
  try {
    const params = {
      page: catalogPage.value,
      size: catalogPageSize.value,
      idTypeDetail: selectedType.value?.id,
    };
    
    if (filters.value.brandId) {
      params.idBrandDetail = filters.value.brandId;
    }
    if (filters.value.search) {
      params.search = filters.value.search;
    }
    
    const data = await detailsInfoApi.getAll(params);
    catalogDetails.value = data.content || [];
    catalogTotalPages.value = data.totalPages || 1;
    
  } catch (err) {
    catalogError.value = 'Не удалось загрузить детали';
    console.error(err);
  } finally {
    catalogLoading.value = false;
  }
};

const prevCatalogPage = () => {
  if (catalogPage.value > 0) {
    catalogPage.value--;
    fetchCatalogDetails();
  }
};

const nextCatalogPage = () => {
  if (catalogPage.value < catalogTotalPages.value - 1) {
    catalogPage.value++;
    fetchCatalogDetails();
  }
};

const resetFilters = () => {
  filters.value = { brandId: '', search: '' };
  catalogPage.value = 0;
  fetchCatalogDetails();
};

// ===== Загрузка деталей в сборке =====
const fetchAssemblyDetails = async () => {
  detailsLoading.value = true;
  detailsError.value = null;
  
  try {
    const items = await assemblyDetailsApi.getByAssemblyId(assemblyId.value);
    
    // Загружаем полную информацию о каждой детали
    const enriched = await Promise.all(
      items.map(async (item) => {
        try {
          const info = await detailsInfoApi.getById(item.idTelescopeDetail);
          return { ...item, detailInfo: info };
        } catch (err) {
          console.warn(`⚠️ Не удалось загрузить инфо о детали #${item.idTelescopeDetail}`);
          return { ...item, detailInfo: null };
        }
      })
    );
    
    assemblyDetails.value = enriched;
    
  } catch (err) {
    detailsError.value = 'Не удалось загрузить детали сборки';
    console.error(err);
  } finally {
    detailsLoading.value = false;
  }
};

// ===== Модальные окна =====
const openEditModal = () => {
  form.value = { name: assembly.value.name, description: assembly.value.description };
  showEditModal.value = true;
};

const closeEditModal = () => { showEditModal.value = false; };

const submitEdit = async () => {
  submitting.value = true;
  try {
    await userAssembliesApi.update(assemblyId.value, form.value);
    closeEditModal();
    await fetchAssembly();
  } catch (err) {
    alert('❌ Ошибка: ' + (err.response?.data?.message || err.message));
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async () => {
  if (!confirm(`Удалить сборку "${assembly.value.name}"?`)) return;
  try {
    await userAssembliesApi.delete(assemblyId.value);
    router.replace('/assemblies');
  } catch (err) {
    alert('❌ Ошибка удаления: ' + (err.response?.data?.message || err.message));
  }
};

// ===== Модальное окно добавления детали =====
const openAddDetailModal = async (type) => {
  selectedType.value = type;
  showAddDetailModal.value = true;
  catalogPage.value = 0;
  filters.value = { brandId: '', search: '' };
  
  if (brands.value.length === 0) {
    await loadBrands();
  }
  
  await fetchCatalogDetails();
};

const closeAddDetailModal = () => {
  showAddDetailModal.value = false;
  selectedType.value = null;
};

const selectDetail = async (detail) => {
  try {
    await assemblyDetailsApi.addToAssembly(assemblyId.value, {
      idTelescopeDetail: detail.id,
      description: `Деталь: ${detail.nameDetail}`
    });
    
    closeAddDetailModal();
    await fetchAssemblyDetails(); // Обновить список
    alert('✅ Деталь добавлена в сборку');
    
  } catch (err) {
    alert('❌ Ошибка добавления: ' + (err.response?.data?.message || err.message));
  }
};

// ===== Редактирование детали в сборке =====
const openEditDetailModal = (item) => {
  selectedAssemblyDetail.value = item;
  editDetailForm.value = { description: item.description || '' };
  showEditDetailModal.value = true;
};

const closeEditDetailModal = () => {
  showEditDetailModal.value = false;
  selectedAssemblyDetail.value = null;
};

const submitEditDetail = async () => {
  if (!selectedAssemblyDetail.value) return;
  
  submittingDetail.value = true;
  try {
    await assemblyDetailsApi.updateInAssembly(
      assemblyId.value,
      selectedAssemblyDetail.value.id,
      { description: editDetailForm.value.description }
    );
    
    closeEditDetailModal();
    await fetchAssemblyDetails();
    
  } catch (err) {
    alert('❌ Ошибка: ' + (err.response?.data?.message || err.message));
  } finally {
    submittingDetail.value = false;
  }
};

const handleRemoveDetail = async (detailId) => {
  if (!confirm('Удалить эту деталь из сборки?')) return;
  
  try {
    await assemblyDetailsApi.removeFromAssembly(assemblyId.value, detailId);
    await fetchAssemblyDetails();
  } catch (err) {
    alert('❌ Ошибка удаления: ' + (err.response?.data?.message || err.message));
  }
};

// ===== Инициализация =====
onMounted(async () => {
  await Promise.all([
    fetchAssembly(),
    loadDetailTypes(),
    fetchAssemblyDetails()
  ]);
});
</script>

<style scoped>
/* ===== Базовые стили (как в админке) ===== */
.page { max-width: 1200px; margin: 0 auto; }
.page-header { margin-bottom: 2rem; display: flex; align-items: center; gap: 1rem; }
.btn-back {
  background: transparent; border: 1px solid rgba(255,255,255,0.2);
  color: #94a3b8; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer;
}
.btn-back:hover { border-color: #60a5fa; color: #fff; }

.card { background: #111827; border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 1.5rem; }
.detail-card { margin-bottom: 2rem; }

.detail-row { display: flex; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.detail-row:last-child { border-bottom: none; }
.detail-row.full { flex-direction: column; }
.detail-row label { min-width: 100px; color: #94a3b8; font-size: 0.9rem; }
.detail-row .value { color: #e0e7ff; font-weight: 500; }
.detail-row .description { margin: 0.5rem 0 0; color: #cbd5e1; line-height: 1.6; white-space: pre-wrap; }

.actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); }

/* ===== Секции ===== */
.section { margin-top: 2rem; }
.section-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;
}
.section-header h2 { margin: 0; font-size: 1.3rem; color: #e0e7ff; }
.btn-sm { padding: 0.4rem 0.8rem; font-size: 0.85rem; }

/* ===== Группы типов деталей ===== */
.groups-container { display: flex; flex-direction: column; gap: 1rem; }
.group-card { background: #111827; border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; overflow: hidden; }
.group-header {
  width: 100%; display: flex; justify-content: space-between; align-items: center;
  padding: 1rem 1.25rem; background: rgba(59, 130, 246, 0.1);
  border: none; cursor: pointer; color: #e0e7ff; font-weight: 600; font-size: 1.05rem;
  transition: background 0.2s;
}
.group-header:hover { background: rgba(59, 130, 246, 0.15); }
.group-name { flex: 1; text-align: left; }
.group-toggle {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  background: rgba(59, 130, 246, 0.3); border-radius: 6px; font-weight: bold;
}
.group-content { padding: 1rem 1.25rem; }
.types-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.75rem; }
.type-btn {
  display: flex; flex-direction: column; align-items: flex-start;
  padding: 1rem; background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px;
  cursor: pointer; transition: all 0.2s; text-align: left; color: #cbd5e1;
}
.type-btn:hover {
  background: rgba(59, 130, 246, 0.15); border-color: #60a5fa;
  transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.type-icon { font-size: 1.2rem; margin-bottom: 0.5rem; }
.type-name { font-weight: 600; color: #e0e7ff; margin-bottom: 0.25rem; }
.type-desc { font-size: 0.85rem; color: #94a3b8; line-height: 1.4; }

/* ===== Детали в сборке ===== */
.details-list { display: flex; flex-direction: column; gap: 1rem; }
.detail-item {
  background: #111827; border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px; padding: 1.25rem;
}
.detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
.detail-header h4 { margin: 0; color: #e0e7ff; font-size: 1.1rem; }
.detail-actions { display: flex; gap: 0.5rem; }
.detail-meta { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
.badge {
  display: inline-block; padding: 0.25rem 0.6rem;
  background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 20px; font-size: 0.8rem; color: #93c5fd;
}
.detail-desc { color: #cbd5e1; margin: 0 0 0.75rem; font-size: 0.95rem; }
.detail-attrs { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.attr-tag {
  font-size: 0.85rem; color: #94a3b8;
  background: rgba(59, 130, 246, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px;
}
.attr-tag strong { color: #60a5fa; }
.attr-more { font-size: 0.85rem; color: #64748b; }

/* ===== Фильтры в модалке ===== */
.filters-bar {
  display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; align-items: flex-end;
  padding: 1rem; background: rgba(59, 130, 246, 0.1); border-radius: 8px;
}
.filter-group { display: flex; flex-direction: column; gap: 0.3rem; }
.filter-group label { font-size: 0.85rem; color: #94a3b8; }
.form-select, .form-input {
  padding: 0.5rem 0.75rem; background: #0b1120; border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px; color: #e0e7ff; font-size: 0.9rem; min-width: 150px;
}
.form-input { min-width: 200px; }
.form-select:focus, .form-input:focus {
  outline: none; border-color: #60a5fa; box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
}

/* ===== Каталог деталей ===== */
.catalog-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem; max-height: 400px; overflow-y: auto; padding-right: 0.5rem;
}
.catalog-card {
  background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;
}
.catalog-header { display: flex; justify-content: space-between; align-items: flex-start; }
.catalog-header h4 { margin: 0; color: #e0e7ff; font-size: 1rem; }
.catalog-brand { font-size: 0.8rem; color: #94a3b8; }
.catalog-desc { margin: 0; color: #cbd5e1; font-size: 0.9rem; line-height: 1.4; }
.catalog-attrs { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.attr-mini {
  font-size: 0.75rem; color: #94a3b8; background: rgba(59, 130, 246, 0.1);
  padding: 0.2rem 0.4rem; border-radius: 3px;
}

/* ===== Пагинация каталога ===== */
.catalog-pagination {
  display: flex; justify-content: center; align-items: center; gap: 0.75rem;
  margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);
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
.modal-xl { max-width: 900px; width: 95%; }
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}
.modal-header h2 { margin: 0; font-size: 1.2rem; color: #e0e7ff; }
.close-btn { background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; }
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
.readonly-field {
  padding: 0.6rem 0.8rem; background: rgba(59, 130, 246, 0.1);
  border-radius: 6px; color: #cbd5e1; font-size: 0.95rem;
}

/* ===== Кнопки ===== */
.btn {
  position: relative; z-index: 1;
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.625rem 1.25rem; border: 1px solid rgba(59, 130, 246, 0.5);
  border-radius: 8px; background: rgba(59, 130, 246, 0.15);
  color: #93c5fd; cursor: pointer; transition: all 0.2s;
  font-weight: 500; font-size: 0.9rem; text-decoration: none;
}
.btn:hover { background: rgba(59, 130, 246, 0.25); border-color: #60a5fa; color: #bfdbfe; }
.btn-primary { background: #2563eb; border-color: #2563eb; color: white; }
.btn-primary:hover { background: #1d4ed8; box-shadow: 0 0 15px rgba(37, 99, 235, 0.4); }
.btn-outline { background: transparent; border-color: rgba(59, 130, 246, 0.5); }
.btn-danger { background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.5); color: #fca5a5; }
.btn-danger:hover { background: rgba(239, 68, 68, 0.25); border-color: #ef4444; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-icon {
  background: transparent; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px; padding: 0.4rem 0.6rem; cursor: pointer;
  transition: all 0.2s; font-size: 1rem;
}
.btn-icon:hover { background: rgba(255,255,255,0.1); border-color: #60a5fa; }
.btn-icon.danger:hover { background: rgba(239, 68, 68, 0.2); border-color: #ef4444; }

/* ===== Состояния загрузки/ошибки ===== */
.loading-state, .error-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 2rem; color: #94a3b8; gap: 1rem;
}
.loading-state.small, .error-state.small { padding: 1rem; }
.spinner {
  width: 32px; height: 32px; border: 3px solid rgba(96, 165, 250, 0.2);
  border-top-color: #60a5fa; border-radius: 50%; animation: spin 1s linear infinite;
}
.spinner-small {
  width: 24px; height: 24px; border: 2px solid rgba(96, 165, 250, 0.2);
  border-top-color: #60a5fa; border-radius: 50%; animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state { text-align: center; padding: 2rem; color: #64748b; }
.empty-state .hint { font-size: 0.9rem; margin-top: 0.5rem; }

/* ===== Скроллбар ===== */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #1e3a8a; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #2563eb; }
</style>