<template>
  <div class="page">
    <div class="page-header">
      <h1>🌟 Лента наблюдений</h1>
      <p class="page-subtitle">Фотографии всех пользователей</p>
    </div>
    
    <div class="card">
      <div class="empty-state">
        <p>📭 Здесь будет лента наблюдений</p>
        <p class="hint">Раздел в разработке</p>
      </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.page { max-width: 1200px; margin: 0 auto; }
.page-header { margin-bottom: 2rem; }
.page-subtitle { color: #94a3b8; margin-top: 0.25rem; }
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #94a3b8;
}
.hint {
  font-size: 0.9rem;
  color: #64748b;
  margin-top: 0.5rem;
}
</style>