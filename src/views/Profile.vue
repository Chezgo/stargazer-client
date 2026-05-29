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
        <h1>👤 Профиль пользователя</h1>
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
            <label>ID профиля:</label>
            <span>#{{ authStore.userProfile.id }}</span>
          </div>
          <div class="detail-row">
            <label>Имя пользователя:</label>
            <span>{{ authStore.userProfile.name }}</span>
          </div>
          <div class="detail-row">
            <label>Email:</label>
            <span>{{ authStore.userInfo?.email }}</span>
          </div>
          <div class="detail-row" v-if="authStore.userProfile.description">
            <label>Описание:</label>
            <span>{{ authStore.userProfile.description }}</span>
          </div>
          <div class="detail-row" v-if="authStore.userInfo?.email_verified">
            <label>Email подтверждён:</label>
            <span class="badge-success">✓ Да</span>
          </div>
        </div>
      </div>

      <div class="quick-links">
        <h3>Быстрый доступ</h3>
        <div class="links-grid">
          <router-link to="/assemblies" class="quick-link">
            <span class="icon">🔭</span>
            <span>Мои сборки</span>
          </router-link>
          <router-link to="/my-observations" class="quick-link">
            <span class="icon">📸</span>
            <span>Наблюдения</span>
          </router-link>
          <router-link to="/feed" class="quick-link">
            <span class="icon">🌟</span>
            <span>Лента</span>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Ошибка загрузки -->
    <div v-else-if="profileError" class="error-state">
      <div class="card">
        <h2>⚠️ Ошибка загрузки профиля</h2>
        <p>{{ profileError }}</p>
        <button @click="retryLoadProfile" class="btn btn-primary">Повторить</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

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
.page-subtitle {
  color: #94a3b8;
  margin-top: 0.25rem;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  margin-bottom: 1.5rem;
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
  gap: 1rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.detail-row label {
  color: #94a3b8;
}

.detail-row span {
  color: #e0e7ff;
  font-weight: 500;
}

.badge-success {
  color: #4ade80;
}

.quick-links {
  margin-top: 2rem;
}

.quick-links h3 {
  margin-bottom: 1rem;
  color: #e0e7ff;
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
  padding: 1rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #93c5fd;
  text-decoration: none;
  transition: all 0.2s;
}

.quick-link:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: #60a5fa;
  transform: translateY(-2px);
}

.quick-link .icon {
  font-size: 1.5rem;
}

.error-state {
  padding: 2rem;
  text-align: center;
}

.error-state h2 {
  margin-bottom: 1rem;
  color: #fca5a5;
}

.error-state p {
  margin-bottom: 1.5rem;
  color: #94a3b8;
}
</style>