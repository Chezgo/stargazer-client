<template>
  <div class="page">
    <div class="page-header">
      <h1>
        <Camera class="page-icon" />
        Мои наблюдения
      </h1>
      <p class="page-subtitle">Твои астрофотографии</p>
      <button @click="openUploadModal" class="btn btn-primary">
        <Upload class="btn-icon" />
        Загрузить фото
      </button>
    </div>

    <!-- Пагинация -->
    <div class="controls-bar">
      <div class="page-control">
        <button @click="prevPage" :disabled="currentPage === 0" class="btn-icon">
          <ChevronLeft class="icon" />
        </button>
        <span class="page-info">Стр. {{ currentPage + 1 }} из {{ totalPages }}</span>
        <button @click="nextPage" :disabled="currentPage >= totalPages - 1" class="btn-icon">
          <ChevronRight class="icon" />
        </button>
      </div>
      <span class="total-count">Всего: {{ totalElements }}</span>
    </div>

    <!-- Состояния -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Загрузка фото...</p>
    </div>
    
    <div v-else-if="error" class="error-state">
      <AlertTriangle class="error-icon" />
      <p>{{ error }}</p>
      <button @click="fetchPhotos" class="btn">Повторить</button>
    </div>

    <!-- Галерея -->
    <div v-else class="gallery-grid">
      <div 
        v-for="photo in photos" 
        :key="photo.idPhoto"
        class="gallery-item"
        @click="openPhotoDetail(photo)"
      >
        <div class="photo-preview">
          <img 
            :src="photo.previewUrl || '/placeholder-photo.svg'" 
            :alt="photo.originalFilename"
            @error="(e) => handleImageError(e, photo)"
            @load="(e) => handleImageLoad(e, photo)"
          >
          <div class="photo-overlay">
            <span class="photo-name">{{ photo.originalFilename }}</span>
            <span class="photo-meta">{{ formatFileSize(photo.fileSize) }}</span>
          </div>
        </div>
        
        <div class="photo-info">
          <span class="assembly-badge" v-if="photo.telescopeAssemblyId">
            <Telescope class="badge-icon" />
            Сборка #{{ photo.telescopeAssemblyId }}
          </span>
          <span class="date">{{ formatDate(photo.createdAt) }}</span>
        </div>
        
        <div class="photo-actions" @click.stop>
          <button @click="openPhotoDetail(photo)" class="btn-icon" title="Открыть">
            <Eye class="icon" />
          </button>
          <button @click="handleDeletePhoto(photo.idPhoto)" class="btn-icon danger" title="Удалить">
            <Trash2 class="icon" />
          </button>
        </div>
      </div>
      
      <div v-if="photos.length === 0" class="empty-gallery">
        <Inbox class="empty-icon" />
        <p>Нет загруженных фотографий</p>
        <button @click="openUploadModal" class="btn btn-primary">Загрузить первое фото</button>
      </div>
    </div>

    <!-- ===== Модальное окно: Загрузка фото ===== -->
    <div v-if="showUploadModal" class="modal-overlay" @click.self="closeUploadModal">
      <div class="modal">
        <div class="modal-header">
          <h2>Загрузить фотографию</h2>
          <button @click="closeUploadModal" class="close-btn">
            <X class="icon" />
          </button>
        </div>
        
        <form @submit.prevent="submitUpload" class="modal-body">
          <!-- Drop zone с улучшенным drag-and-drop -->
          <div class="upload-area">
            <div 
              v-if="!selectedFile"
              ref="dropZoneRef"
              class="drop-zone" 
              :class="{ 'drop-zone-active': isDragOver, 'drop-zone-error': uploadError }"
              @dragover.prevent="onDragOver"
              @dragenter.prevent="onDragEnter"
              @dragleave.prevent="onDragLeave"
              @drop.prevent="onDrop"
            >
              <div class="drop-zone-content">
                <Upload class="drop-icon" :size="48" />
                <p class="drop-text">Перетащите фото сюда</p>
                <p class="drop-hint">или</p>
                <button type="button" @click="triggerFileInput" class="btn btn-outline btn-sm">
                  <Folder class="btn-icon" />
                  Выбрать файл
                </button>
              </div>
            </div>

            <div v-else class="file-preview">
              <img :src="uploadPreview" alt="Preview" class="preview-image">
              <p class="preview-name">{{ selectedFile?.name }}</p>
              <p class="preview-size">{{ formatFileSize(selectedFile?.size) }}</p>
              <button @click="clearSelectedFile" type="button" class="btn-remove">
                <Trash2 class="btn-icon" />
                Удалить
              </button>
            </div>

            <input 
              ref="fileInputRef"
              type="file" 
              @change="handleFileSelect" 
              accept="image/*"
              class="hidden-file-input"
              style="display: none;"
            >
          </div>

          <small class="hint">Поддерживаются: JPG, PNG, WEBP (макс. 50 МБ)</small>

          <!-- Привязка к сборке -->
          <div class="form-group">
            <label>Привязать к сборке (опционально)</label>
            <select v-model.number="uploadForm.assemblyId" class="form-select">
              <option value="">Не привязывать</option>
              <option v-for="assembly in userAssemblies" :key="assembly.id" :value="assembly.id">
                #{{ assembly.id }} — {{ assembly.name }}
              </option>
            </select>
          </div>

          <!-- Прогресс-бар -->
          <div v-if="uploading" class="upload-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
            </div>
            <span class="progress-text">{{ uploadProgress }}%</span>
          </div>

          <div class="modal-footer">
            <button type="button" @click="closeUploadModal" class="btn" :disabled="uploading">
              Отмена
            </button>
            <button 
              type="submit" 
              class="btn btn-primary" 
              :disabled="uploading || !selectedFile"
            >
              {{ uploading ? 'Загрузка...' : 'Загрузить' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ===== Модальное окно: Детали фото ===== -->
    <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
      <div class="modal modal-xl">
        <div class="modal-header">
          <h2>{{ selectedPhoto?.originalFilename }}</h2>
          <button @click="closeDetailModal" class="close-btn">
            <X class="icon" />
          </button>
        </div>
        
        <div class="modal-body modal-body-scroll">
          <div v-if="photoUrl" class="photo-detail-view">
            <img 
              :src="photoUrl" 
              :alt="selectedPhoto?.originalFilename"
              @error="handleDetailPhotoError"
            >
          </div>
          
          <div class="photo-meta-grid">
            <div class="meta-row">
              <label>ID фото</label>
              <span>#{{ selectedPhoto?.idPhoto }}</span>
            </div>
            <div class="meta-row">
              <label>Размер файла</label>
              <span>{{ formatFileSize(selectedPhoto?.fileSize) }}</span>
            </div>
            <div class="meta-row">
              <label>Тип</label>
              <span>{{ selectedPhoto?.contentTYpe || selectedPhoto?.contentType }}</span>
            </div>
            <div class="meta-row">
              <label>Загружено</label>
              <span>{{ formatDate(selectedPhoto?.createdAt) }}</span>
            </div>
            <div class="meta-row full" v-if="selectedPhoto?.telescopeAssemblyId">
              <label>Сборка</label>
              <div v-if="assemblyInfo" class="assembly-preview">
                <h4>{{ assemblyInfo.name }}</h4>
                <p v-if="assemblyInfo.description">{{ assemblyInfo.description }}</p>
                
                <div v-if="assemblyDetails.length" class="assembly-details-list">
                  <h5>Детали в сборке:</h5>
                  <div v-for="item in assemblyDetails" :key="item.id" class="assembly-detail-item">
                    <strong>{{ item.detailInfo?.nameDetail || 'Загрузка...' }}</strong>
                    <span class="badge">{{ item.detailInfo?.nameType }}</span>
                    <span v-if="item.description" class="detail-note">— {{ item.description }}</span>
                  </div>
                </div>
              </div>
              <div v-else-if="assemblyLoading" class="loading-small">Загрузка...</div>
              <div v-else class="error-small">Не удалось загрузить сборку</div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="handleDeletePhoto(selectedPhoto?.idPhoto)" class="btn btn-danger">
            <Trash2 class="btn-icon" />
            Удалить фото
          </button>
          <button @click="closeDetailModal" class="btn">Закрыть</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import userPhotosApi from '@/services/userPhotos';
import assemblyDetailsApi from '@/services/assemblyDetails';
import detailsInfoApi from '@/services/detailsInfo';
import { 
  Camera, 
  Upload, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  Telescope, 
  Eye, 
  Trash2, 
  Inbox, 
  Folder, 
  X 
} from 'lucide-vue-next';

const photos = ref([]);
const retriedPhotos = ref(new Set());
const userAssemblies = ref([]);
const loading = ref(false);
const error = ref(null);
const showUploadModal = ref(false);
const showDetailModal = ref(false);
const uploading = ref(false);
const uploadProgress = ref(0);
const uploadError = ref(null);

// Drag-and-drop
const dropZoneRef = ref(null);
const isDragOver = ref(false);

// Пагинация
const currentPage = ref(0);
const totalPages = ref(1);
const totalElements = ref(0);
const pageSize = ref(12);

// Загрузка файла
const selectedFile = ref(null);
const uploadPreview = ref(null);
const uploadForm = ref({ assemblyId: null });

// Детали фото
const selectedPhoto = ref(null);
const photoUrl = ref(null);
const assemblyInfo = ref(null);
const assemblyDetails = ref([]);
const assemblyLoading = ref(false);

// Форматирование
const formatDate = (iso) => new Date(iso).toLocaleDateString('ru-RU', {
  day: '2-digit', month: '2-digit', year: 'numeric'
});

const formatFileSize = (bytes) => {
  if (!bytes) return '—';
  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(1)} ${units[i]}`;
};

// Toast уведомления
const toast = {
  success: (message, title) => window.$toast?.success(message, title),
  error: (message, title) => window.$toast?.error(message, title),
  warning: (message, title) => window.$toast?.warning(message, title),
  info: (message, title) => window.$toast?.info(message, title)
};

// Drag-and-drop handlers
const fileInputRef = ref(null);

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const onDragOver = (e) => {
  e.preventDefault();
  isDragOver.value = true;
};

const onDragEnter = (e) => {
  e.preventDefault();
  isDragOver.value = true;
};

const onDragLeave = (e) => {
  e.preventDefault();
  if (!e.relatedTarget || !dropZoneRef.value?.contains(e.relatedTarget)) {
    isDragOver.value = false;
  }
};

const onDrop = (e) => {
  e.preventDefault();
  isDragOver.value = false;
  uploadError.value = null;
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
};

const handleFileSelect = (event) => {
  const files = event.target.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
  event.target.value = '';
};

const processFile = (file) => {
  uploadError.value = null;
  
  if (!file.type.startsWith('image/')) {
    uploadError.value = 'Пожалуйста, выберите изображение (JPG, PNG, WEBP)';
    toast.error('Файл должен быть изображением', 'Неверный тип файла');
    return;
  }
  
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    uploadError.value = 'Файл слишком большой (макс. 50 МБ)';
    toast.error(`Размер файла: ${formatFileSize(file.size)}. Максимум: 50 МБ`, 'Превышен размер');
    return;
  }
  
  selectedFile.value = file;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    uploadPreview.value = e.target.result;
  };
  reader.readAsDataURL(file);
  
  toast.success(`${file.name} готов к загрузке`, 'Файл выбран');
};

const clearSelectedFile = () => {
  selectedFile.value = null;
  uploadPreview.value = null;
  uploadError.value = null;
  const fileInput = document.querySelector('.file-input');
  if (fileInput) fileInput.value = '';
};

// Загрузка данных
const loadUserAssemblies = async () => {
  try {
    const data = await userPhotosApi.getUserAssemblies();
    userAssemblies.value = data.content || data || [];
  } catch (err) {
    console.warn('⚠️ Не удалось загрузить сборки:', err);
    toast.warning('Не удалось загрузить список сборок', 'Внимание');
  }
};

const fetchPhotos = async () => {
  retriedPhotos.value.clear();
  loading.value = true;
  error.value = null;
  
  try {
    const data = await userPhotosApi.getMyPhotos({
      page: currentPage.value,
      size: pageSize.value
    });
    
    photos.value = data.content || [];
    totalPages.value = data.totalPages || 1;
    totalElements.value = data.totalElements || 0;
    
    loadVisiblePhotoUrls();
    
  } catch (err) {
    error.value = err.response?.data?.message || 'Не удалось загрузить фотографии';
    console.error(err);
    toast.error(error.value, 'Ошибка загрузки');
  } finally {
    loading.value = false;
  }
};

const loadVisiblePhotoUrls = async () => {
  const photosToLoad = photos.value.slice(0, 6);
  for (const photo of photosToLoad) {
    if (!photo.previewUrl) {
      try {
        photo.previewUrl = await userPhotosApi.getPhotoUrl(photo.idPhoto);
      } catch (err) {
        console.warn('⚠️ Не удалось получить URL фото:', err);
      }
    }
  }
};

const handleImageLoad = async (event, photo) => {
  if (!photo.previewUrl) {
    try {
      photo.previewUrl = await userPhotosApi.getPhotoUrl(photo.idPhoto);
      event.target.src = photo.previewUrl;
    } catch (err) {
      console.warn('⚠️ Не удалось загрузить превью:', err);
    }
  }
};

const handleImageError = async (event, photo) => {
  if (retriedPhotos.value.has(photo.idPhoto)) {
    event.target.src = '/placeholder-photo.svg';
    return;
  }

  retriedPhotos.value.add(photo.idPhoto);
  
  try {
    const newUrl = await userPhotosApi.getPhotoUrl(photo.idPhoto);
    photo.previewUrl = newUrl;
    event.target.src = newUrl;
  } catch (err) {
    console.warn('Не удалось обновить URL для фото', photo.idPhoto);
    event.target.src = '/placeholder-photo.svg';
  }
};

const handleDetailPhotoError = async () => {
  if (!selectedPhoto.value || retriedPhotos.value.has(selectedPhoto.value.idPhoto)) {
    toast.error('Не удалось загрузить фото. Попробуйте позже.', 'Ошибка');
    return;
  }
  
  retriedPhotos.value.add(selectedPhoto.value.idPhoto);
  
  try {
    const newUrl = await userPhotosApi.getPhotoUrl(selectedPhoto.value.idPhoto);
    photoUrl.value = newUrl;
  } catch (err) {
    console.error('Ошибка обновления URL деталей:', err);
    toast.error('Не удалось загрузить фото.', 'Ошибка');
  }
};

const prevPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--;
    fetchPhotos();
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value - 1) {
    currentPage.value++;
    fetchPhotos();
  }
};

const openUploadModal = async () => {
  if (userAssemblies.value.length === 0) {
    await loadUserAssemblies();
  }
  showUploadModal.value = true;
  uploadError.value = null;
};

const closeUploadModal = () => {
  showUploadModal.value = false;
  selectedFile.value = null;
  uploadPreview.value = null;
  uploadForm.value = { assemblyId: null };
  uploadProgress.value = 0;
  uploading.value = false;
  uploadError.value = null;
};

const submitUpload = async () => {
  if (!selectedFile.value) {
    toast.error('Выберите файл для загрузки', 'Ошибка');
    return;
  }

  uploading.value = true;
  uploadProgress.value = 0;
  uploadError.value = null;

  try {
    await userPhotosApi.uploadPhoto(
      selectedFile.value,
      uploadForm.value.assemblyId,
      (progress) => {
        uploadProgress.value = progress;
      }
    );

    closeUploadModal();
    fetchPhotos();
    toast.success('Фотография успешно загружена!', 'Загрузка завершена');
    
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message || 'Неизвестная ошибка';
    console.error('Upload error:', err);
    toast.error(errorMsg, 'Ошибка загрузки');
  } finally {
    uploading.value = false;
  }
};

const openPhotoDetail = async (photo) => {
  selectedPhoto.value = photo;
  showDetailModal.value = true;
  
  try {
    photoUrl.value = await userPhotosApi.getPhotoUrl(photo.idPhoto);
  } catch (err) {
    console.warn('⚠️ Не удалось получить URL:', err);
    toast.warning('Не удалось загрузить фото в полном качестве', 'Внимание');
  }
  
  if (photo.telescopeAssemblyId) {
    await loadAssemblyInfo(photo.telescopeAssemblyId);
  }
};

const loadAssemblyInfo = async (assemblyId) => {
  assemblyLoading.value = true;
  assemblyInfo.value = null;
  assemblyDetails.value = [];
  
  try {
    assemblyInfo.value = await userPhotosApi.getAssemblyForPhoto(assemblyId);
    
    const items = await assemblyDetailsApi.getByAssemblyId(assemblyId);
    
    const enriched = await Promise.all(
      items.map(async (item) => {
        try {
          const info = await detailsInfoApi.getById(item.idTelescopeDetail);
          return { ...item, detailInfo: info };
        } catch {
          return { ...item, detailInfo: null };
        }
      })
    );
    
    assemblyDetails.value = enriched;
    
  } catch (err) {
    console.warn('⚠️ Не удалось загрузить инфо о сборке:', err);
  } finally {
    assemblyLoading.value = false;
  }
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  selectedPhoto.value = null;
  photoUrl.value = null;
  assemblyInfo.value = null;
  assemblyDetails.value = [];
};

const handleDeletePhoto = async (photoId) => {
  if (!photoId) return;
  
  if (!confirm('Удалить это фото? Это действие необратимо.')) return;
  
  try {
    await userPhotosApi.deletePhoto(photoId);
    
    if (showDetailModal.value) {
      closeDetailModal();
    }
    fetchPhotos();
    toast.success('Фотография удалена', 'Удалено');
    
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message;
    console.error(err);
    toast.error(errorMsg, 'Ошибка удаления');
  }
};

onMounted(() => {
  fetchPhotos();
});
</script>

<style scoped>
/* ===== Иконки Lucide ===== */
/* Пробрасываем стили внутрь SVG */
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
}

.empty-icon {
  width: 48px !important;
  height: 48px !important;
  color: #64748b;
  margin-bottom: 1rem;
}

.badge-icon {
  width: 14px !important;
  height: 14px !important;
  margin-right: 0.25rem;
}

.drop-icon {
  width: 48px !important;
  height: 48px !important;
  color: #60a5fa;
  transition: transform 0.3s ease;
}

.drop-zone-active .drop-icon {
  transform: scale(1.1);
  color: #93c5fd;
}

/* ===== Базовые стили ===== */
.page { max-width: 1400px; margin: 0 auto; }
.page-header { 
  display: flex; justify-content: space-between; align-items: center; 
  margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;
}
.page-header h1 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.page-subtitle { color: #94a3b8; margin: 0.25rem 0 0; }

.controls-bar {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 1.5rem; padding: 0.75rem 1rem;
  background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px; flex-wrap: wrap; gap: 1rem;
}
.page-control { display: flex; align-items: center; gap: 0.5rem; }
.page-info, .total-count { color: #94a3b8; font-size: 0.9rem; }

/* ===== Кнопки-иконки (стрелки, действия) ===== */
.btn-icon {
  background: rgba(0,0,0,0.7); 
  border: 1px solid rgba(255,255,255,0.2);
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
  width: 18px !important;
  height: 18px !important;
}

.btn-icon:hover { 
  background: rgba(59, 130, 246, 0.8); 
  border-color: #60a5fa; 
  color: white; 
}
.btn-icon.danger:hover { 
  background: rgba(239, 68, 68, 0.9); 
  border-color: #ef4444; 
}

/* ===== Drop zone ===== */
.upload-area {
  margin-bottom: 1.5rem;
}

.drop-zone {
  border: 2px dashed rgba(59, 130, 246, 0.4);
  border-radius: 12px;
  padding: 3rem 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
  background: rgba(11, 17, 32, 0.6);
  cursor: pointer;
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drop-zone-active {
  border-color: #60a5fa;
  border-style: solid;
  background: rgba(59, 130, 246, 0.15);
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
  transform: scale(1.01);
}

.drop-zone-error {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.drop-text {
  font-size: 1.1rem;
  color: #e0e7ff;
  font-weight: 600;
  margin: 0;
}

.drop-hint {
  font-size: 0.9rem;
  color: #94a3b8;
  margin: 0.25rem 0;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
}

.file-preview {
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  background: rgba(11, 17, 32, 0.6);
}

.preview-image {
  max-width: 100%;
  max-height: 250px;
  border-radius: 8px;
  border: 2px solid rgba(59, 130, 246, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.preview-name {
  margin: 0.75rem 0 0.25rem;
  font-size: 0.95rem;
  color: #e0e7ff;
  font-weight: 500;
  word-break: break-all;
}

.preview-size {
  font-size: 0.85rem;
  color: #94a3b8;
  margin-bottom: 0.75rem;
}

.btn-remove {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #fca5a5;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-remove:hover {
  background: rgba(239, 68, 68, 0.25);
  transform: translateY(-1px);
}

.hidden-file-input {
  display: none;
}

.hint {
  display: block;
  margin-top: 0.75rem;
  color: #64748b;
  font-size: 0.85rem;
  text-align: center;
}

/* ===== Прогресс-бар ===== */
.upload-progress {
  margin: 1.25rem 0;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.progress-bar {
  flex: 1;
  height: 10px;
  background: rgba(59, 130, 246, 0.15);
  border-radius: 5px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #60a5fa);
  border-radius: 5px;
  transition: width 0.3s ease;
  box-shadow: 0 0 10px rgba(96, 165, 250, 0.5);
}

.progress-text {
  font-size: 0.95rem;
  color: #93c5fd;
  font-weight: 600;
  min-width: 50px;
  text-align: right;
}

/* ===== Галерея ===== */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.25rem;
}

.gallery-item {
  background: #111827; border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px; overflow: hidden; cursor: pointer;
  transition: all 0.2s; position: relative;
}
.gallery-item:hover {
  border-color: #60a5fa; transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
}

.photo-preview {
  position: relative; aspect-ratio: 4/3; background: #0b1120;
  overflow: hidden;
}
.photo-preview img {
  width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s;
}
.gallery-item:hover .photo-preview img { transform: scale(1.05); }

.photo-overlay {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 0.75rem;
  background: linear-gradient(to top, rgba(0,0,0,0.85), transparent);
  color: white;
}
.photo-name {
  display: block; font-size: 0.85rem; font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.photo-meta { font-size: 0.75rem; color: #94a3b8; }

.photo-info {
  padding: 0.75rem; display: flex; justify-content: space-between;
  align-items: center; font-size: 0.8rem; gap: 0.5rem; flex-wrap: wrap;
}
.assembly-badge {
  color: #93c5fd; background: rgba(59, 130, 246, 0.15);
  padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
}
.date { color: #64748b; }

.photo-actions {
  position: absolute; top: 0.5rem; right: 0.5rem;
  display: flex; gap: 0.3rem; opacity: 0; transition: opacity 0.2s;
}
.gallery-item:hover .photo-actions { opacity: 1; }

.empty-gallery {
  grid-column: 1 / -1; text-align: center; padding: 4rem 2rem;
  color: #64748b;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-gallery p { margin-bottom: 1rem; }

/* ===== Модальные окна ===== */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.75);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; backdrop-filter: blur(4px); padding: 1rem;
}
.modal {
  background: #111827; border: 1px solid rgba(59, 130, 246, 0.4);
  border-radius: 12px; width: 100%; max-width: 500px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  max-height: 90vh; display: flex; flex-direction: column;
}
.modal-xl { max-width: 900px; }
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  flex-shrink: 0;
}
.modal-header h2 { margin: 0; font-size: 1.2rem; color: #e0e7ff; }
.close-btn {
  background: none; border: none; color: #94a3b8; cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
}
.close-btn :deep(svg) {
  width: 20px !important;
  height: 20px !important;
}
.close-btn:hover { color: #fff; }
.modal-body { padding: 1.5rem; overflow-y: auto; flex: 1; }
.modal-body-scroll { max-height: 60vh; overflow-y: auto; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 0.75rem;
  padding: 1rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.1);
  flex-shrink: 0;
}

/* ===== Форма ===== */
.form-group { margin-bottom: 1.25rem; }
.form-group label { display: block; margin-bottom: 0.4rem; color: #94a3b8; font-size: 0.9rem; }
.form-group input, .form-group select, .form-group textarea {
  width: 100%; padding: 0.6rem 0.8rem;
  background: #0b1120; border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px; color: #e0e7ff; font-size: 0.95rem;
}
.form-group input:focus, .form-group select:focus, .form-group textarea:focus {
  outline: none; border-color: #60a5fa; box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
}
.form-select {
  cursor: pointer; appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}

/* ===== Детали фото ===== */
.photo-detail-view {
  text-align: center; margin-bottom: 1.5rem;
  background: #0b1120; border-radius: 8px; padding: 1rem;
}
.photo-detail-view img {
  max-width: 100%; max-height: 400px; border-radius: 6px;
}

.photo-meta-grid {
  display: grid; gap: 0.75rem;
}
.meta-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);
}
.meta-row:last-child { border-bottom: none; }
.meta-row.full { flex-direction: column; align-items: flex-start; }
.meta-row label { color: #94a3b8; font-size: 0.9rem; }
.meta-row span { color: #e0e7ff; font-weight: 500; }

.assembly-preview {
  margin-top: 0.5rem; padding: 0.75rem;
  background: rgba(59, 130, 246, 0.1); border-radius: 6px;
}
.assembly-preview h4 { margin: 0 0 0.25rem; color: #e0e7ff; }
.assembly-preview p { margin: 0 0 0.75rem; color: #cbd5e1; font-size: 0.9rem; }

.assembly-details-list { margin-top: 0.75rem; }
.assembly-details-list h5 {
  margin: 0 0 0.5rem; color: #94a3b8; font-size: 0.9rem;
}
.assembly-detail-item {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.4rem 0; font-size: 0.9rem; color: #cbd5e1;
}
.assembly-detail-item .badge { font-size: 0.75rem; }
.assembly-detail-item .detail-note { color: #94a3b8; font-size: 0.85rem; }

.loading-small, .error-small {
  font-size: 0.9rem; color: #94a3b8;
}
.error-small { color: #fca5a5; }

/* ===== Кнопки ===== */
.btn {
  position: relative; z-index: 1;
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.625rem 1.25rem; border: 1px solid rgba(59, 130, 246, 0.5);
  border-radius: 8px; background: rgba(59, 130, 246, 0.15);
  color: #93c5fd; cursor: pointer; transition: all 0.2s;
  font-weight: 500; font-size: 0.9rem; text-decoration: none;
}
.btn :deep(svg) {
  width: 16px !important;
  height: 16px !important;
}
.btn:hover { background: rgba(59, 130, 246, 0.25); border-color: #60a5fa; color: #bfdbfe; }
.btn-primary { background: #2563eb; border-color: #2563eb; color: white; }
.btn-primary:hover { background: #1d4ed8; box-shadow: 0 0 15px rgba(37, 99, 235, 0.4); }
.btn-outline { background: transparent; border-color: rgba(59, 130, 246, 0.5); }
.btn-danger { background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.5); color: #fca5a5; }
.btn-danger:hover { background: rgba(239, 68, 68, 0.25); border-color: #ef4444; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* ===== Состояния загрузки ===== */
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