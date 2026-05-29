<template>
  <header class="app-header">
    <div class="container">
      <router-link to="/profile" class="logo">🔭 Stargazer</router-link>
      
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
}
.logo {
  font-size: 1.25rem;
  font-weight: 700;
  color: #60a5fa;
  text-decoration: none;
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
</style>