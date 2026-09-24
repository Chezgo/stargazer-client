<template>
  <aside class="sidebar" data-testid="app-sidebar">
    <nav class="nav">
      <router-link to="/profile" class="nav-item" active-class="active" data-testid="nav-profile">
        <User class="icon" />
        <span class="text">Профиль</span>
      </router-link>
      
      <router-link to="/assemblies" class="nav-item" active-class="active" data-testid="nav-assemblies">
        <Telescope class="icon" />
        <span class="text">Мои сборки</span>
      </router-link>
      
      <router-link to="/my-observations" class="nav-item" active-class="active" data-testid="nav-observations">
        <Camera class="icon" />
        <span class="text">Мои наблюдения</span>
      </router-link>
      
      <router-link to="/feed" class="nav-item" active-class="active" data-testid="nav-feed">
        <Star class="icon" />
        <span class="text">Лента наблюдений</span>
      </router-link>
    </nav>
  </aside>
</template>

<script setup>
import { User, Telescope, Camera, Star } from 'lucide-vue-next';
</script>

<style scoped>
.icon {
  width: 20px;
  height: 20px;
  stroke-width: 2;
}
.sidebar {
  width: 260px;
  background: #111827;
  border-right: 1px solid rgba(96, 165, 250, 0.3);
  padding: 1.5rem 0;
  position: relative;
  z-index: 1;
}
.nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  color: #94a3b8;
  text-decoration: none;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}
.nav-item:hover {
  background: rgba(59, 130, 246, 0.1);
  color: #e0e7ff;
  border-left-color: rgba(59, 130, 246, 0.5);
}
.nav-item.active {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border-left-color: #60a5fa;
}
.icon {
  font-size: 1.2rem;
  width: 24px;
  text-align: center;
}
.text {
  font-size: 0.95rem;
  font-weight: 500;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed; z-index: 500; right: 0; bottom: 0; left: 0;
    width: auto; padding: .35rem max(.35rem, env(safe-area-inset-right)) calc(.35rem + env(safe-area-inset-bottom)) max(.35rem, env(safe-area-inset-left));
    border-top: 1px solid rgba(96, 165, 250, 0.35); border-right: 0;
    box-shadow: 0 -8px 30px rgba(0,0,0,.35);
  }
  .nav { flex-direction: row; gap: .2rem; }
  .nav-item { flex: 1; min-width: 0; flex-direction: column; gap: .15rem; padding: .4rem .15rem; border: 0; border-radius: 8px; text-align: center; }
  .nav-item:hover, .nav-item.active { border: 0; }
  .nav-item .icon { width: 21px; height: 21px; }
  .text { max-width: 100%; font-size: .66rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
}
</style>
