<template>
  <header class="app-header">
    <div class="container">
      <router-link to="/profile" class="logo">
        <Telescope class="logo-icon" />
        <span>Stargazer</span>
      </router-link>
      
      <div class="user-menu">
        <span class="username">{{ authStore.getDisplayName }}</span>
        <button @click="authStore.logout" class="btn btn-outline">
          <LogOut class="btn-icon" />
          Выйти
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth';
import { Telescope, Sparkles, LogOut } from 'lucide-vue-next';
const authStore = useAuthStore();
</script>

<style scoped>
.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: #60a5fa;
  text-decoration: none;
}

.logo-icon {
  width: 24px;
  height: 24px;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.app-header {
  background: #111827;
  border-bottom: 1px solid rgba(59, 130, 246, 0.3);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
}
.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.logo {
  font-size: 1.25rem;
  font-weight: 700;
  color: #60a5fa;
  text-decoration: none;
}

@keyframes glow {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(251, 191, 36, 0.2);
  }
  50% {
    box-shadow: 0 2px 16px rgba(251, 191, 36, 0.4);
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.username {
  color: #94a3b8;
  font-size: 0.9rem;
}

/* Адаптив */
@media (max-width: 768px) {
  .credits-badge {
    display: none; /* Скрываем на мобильных, чтобы не загромождать */
  }
}
</style>