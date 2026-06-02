<template>
  <header class="app-header">
    <div class="container">
      <router-link to="/profile" class="logo">🔭 Stargazer</router-link>
      
      <!-- Бейдж благодарности -->
      <div class="credits-badge">
        <span class="credits-icon">⭐</span>
        <span class="credits-text">
          <strong>Михаил Гагушичев</strong> — красавчик!
        </span>
      </div>
      
      <div class="user-menu">
        <span class="username">{{ authStore.getDisplayName }}</span>
        <button @click="authStore.logout" class="btn btn-outline">Выйти</button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth';
const authStore = useAuthStore();
</script>

<style scoped>
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

/* Бейдж благодарности */
.credits-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.15));
  border: 1px solid rgba(251, 191, 36, 0.4);
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(251, 191, 36, 0.2);
  animation: glow 3s ease-in-out infinite;
}

.credits-icon {
  font-size: 1.2rem;
  animation: spin 4s linear infinite;
}

.credits-text {
  font-size: 0.9rem;
  color: #fcd34d;
}

.credits-text strong {
  color: #fbbf24;
  font-weight: 700;
  text-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
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