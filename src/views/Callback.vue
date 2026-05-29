<template>
  <div class="callback-container">
    <div class="spinner"></div>
    <p>Завершение авторизации...</p>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

onMounted(async () => {
  try {
    await authStore.handleCallback();
    router.replace('/profile');
  } catch (err) {
    console.error('❌ Callback failed:', err);
    router.replace('/profile');
  }
});
</script>

<style scoped>
.callback-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 1rem;
  background: #0b1120;
  color: #60a5fa;
}
.spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(96, 165, 250, 0.2);
  border-top-color: #60a5fa;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>