<template>
  <div class="profile-page">
    <!-- Загрузка профиля -->
    <div v-if="authStore.isProfileLoading" class="loading-profile">
      <div class="spinner"></div>
      <p>Загрузка профиля...</p>
    </div>

    <!-- Профиль загружен -->
    <div v-else-if="authStore.userProfile" class="profile-content">
      <div class="page-header">
        <h1>
          <User class="page-icon" />
          Профиль
        </h1>
        <p class="page-subtitle">Твоя личная информация</p>
      </div>

      <div class="card">
        <div class="profile-header">
          <div class="avatar">
            {{ avatarLetter }}
          </div>
          <div class="user-info">
            <h2>{{ authStore.userProfile.name || authStore.getUsername }}</h2>
            <p class="email">{{ authStore.userInfo?.email }}</p>
          </div>
        </div>

        <div class="profile-details">
          <div class="detail-row">
            <label>Имя пользователя:</label>
            <span>{{ authStore.userProfile.name }}</span>
          </div>
          <div class="detail-row">
            <label>Email:</label>
            <span>{{ authStore.userInfo?.email }}</span>
          </div>
          <div class="detail-row" v-if="authStore.userInfo?.email_verified">
            <label>Email подтверждён:</label>
            <span class="badge-success">
              <CheckCircle class="badge-icon" />
              Да
            </span>
          </div>
        </div>
      </div>

      <div class="quick-links">
        <h3>Быстрый доступ</h3>
        <div class="links-grid">
          <router-link to="/assemblies" class="quick-link">
            <Telescope class="link-icon" />
            <span>Мои сборки</span>
          </router-link>
          <router-link to="/my-observations" class="quick-link">
            <Camera class="link-icon" />
            <span>Наблюдения</span>
          </router-link>
          <router-link to="/feed" class="quick-link">
            <Star class="link-icon" />
            <span>Лента</span>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Ошибка загрузки -->
    <div v-else-if="profileError" class="error-state">
      <div class="card">
        <h2>
          <AlertTriangle class="error-icon" />
          Ошибка загрузки профиля
        </h2>
        <p>{{ profileError }}</p>
        <button @click="retryLoadProfile" class="btn btn-primary">Повторить</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { User, Telescope, Camera, Star, CheckCircle, AlertTriangle } from 'lucide-vue-next';

const authStore = useAuthStore();
const profileError = ref(null);

const avatarLetter = computed(() => {
  const name = authStore.userProfile?.name || authStore.getUsername;
  return name.charAt(0).toUpperCase();
});

const retryLoadProfile = async () => {
  profileError.value = null;
  try {
    await authStore.loadOrCreateProfile();
  } catch (err) {
    profileError.value = 'Не удалось загрузить профиль. Попробуйте позже.';
  }
};

onMounted(async () => {
  try {
    await authStore.loadOrCreateProfile();
  } catch (err) {
    console.error('Failed to load profile:', err);
    profileError.value = 'Не удалось загрузить профиль. Попробуйте позже.';
  }
});
</script>

<style scoped>
.profile-page {
  max-width: 900px;
  margin: 0 auto;
}

.loading-profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1rem;
  color: #94a3b8;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.page-icon {
  width: 28px;
  height: 28px;
  color: #60a5fa;
}

.page-subtitle {
  color: #94a3b8;
  margin-top: 0.25rem;
}

.card {
  background: #111827;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding-bottom: 1.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2563eb, #60a5fa);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  color: white;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.user-info h2 {
  margin: 0 0 0.25rem;
  color: #e0e7ff;
}

.email {
  color: #94a3b8;
  margin: 0;
}

.profile-details {
  display: grid;
  gap: 0.5rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row label {
  color: #94a3b8;
  font-size: 0.95rem;
}

.detail-row span {
  color: #e0e7ff;
  font-weight: 500;
}

.badge-success {
  color: #4ade80;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.badge-icon {
  width: 18px;
  height: 18px;
}

.quick-links {
  margin-top: 2rem;
}

.quick-links h3 {
  margin-bottom: 1.25rem;
  color: #e0e7ff;
  font-size: 1.2rem;
}

.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.quick-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #93c5fd;
  text-decoration: none;
  transition: all 0.2s;
  font-weight: 500;
}

.quick-link:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: #60a5fa;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.link-icon {
  width: 24px;
  height: 24px;
  color: #60a5fa;
}

.error-state {
  padding: 2rem;
  text-align: center;
}

.error-state h2 {
  margin-bottom: 1rem;
  color: #fca5a5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.error-icon {
  width: 24px;
  height: 24px;
}

.error-state p {
  margin-bottom: 1.5rem;
  color: #94a3b8;
}

/* Адаптив */
@media (max-width: 640px) {
  .profile-header {
    flex-direction: column;
    text-align: center;
  }
  
  .detail-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style>