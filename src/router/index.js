import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes = [
  { 
    path: '/callback', 
    name: 'Callback', 
    component: () => import('@/views/Callback.vue'), 
    meta: { requiresAuth: false } 
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: { title: 'Профиль', requiresAuth: true }
  },
  {
    path: '/assemblies',
    name: 'Assemblies',
    component: () => import('@/views/Assemblies.vue'),
    meta: { title: 'Мои сборки', requiresAuth: true }
  },
  {
    path: '/assemblies/:id',
    name: 'AssemblyDetail',
    component: () => import('@/views/AssemblyDetail.vue'),
    meta: { title: 'Сборка', requiresAuth: true },
    props: true
  },
  {
    path: '/my-observations',
    name: 'MyObservations',
    component: () => import('@/views/MyObservations.vue'),
    meta: { title: 'Мои наблюдения', requiresAuth: true }
  },
  {
    path: '/feed',
    name: 'Feed',
    component: () => import('@/views/Feed.vue'),
    meta: { title: 'Лента наблюдений', requiresAuth: true }
  },
  { path: '/', redirect: '/profile' },
  { path: '/:pathMatch(.*)*', redirect: '/profile' }
];

const router = createRouter({ 
  history: createWebHistory(), 
  routes 
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  
  if (to.meta.title) {
    document.title = `${to.meta.title} | Stargazer`;
  }
  
  if (to.name === 'Callback') return true;
  if (!auth.isInitialized) return true;
  
  if (to.meta.requiresAuth && !auth.authenticated) {
    auth.login();
    return false;
  }
  
  return true;
});

export default router;