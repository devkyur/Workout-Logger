import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/calendar',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/features/auth/views/LoginView.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/features/auth/views/RegisterView.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('@/features/calendar/views/CalendarView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/features/settings/views/SettingsView.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Navigation guard
router.beforeEach(async (to, _from, next) => {
  const { isAuthenticated, loading } = useAuth()

  // 로딩 중이면 대기
  while (loading.value) {
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next('/login')
  } else if (to.meta.requiresGuest && isAuthenticated.value) {
    next('/calendar')
  } else {
    next()
  }
})

export default router
