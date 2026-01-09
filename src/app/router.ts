import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import TabsLayout from './TabsLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/tabs/home',
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
    path: '/tabs/',
    component: TabsLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/tabs/home',
      },
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/features/calendar/views/CalendarView.vue'),
      },
      {
        path: 'stats',
        name: 'Stats',
        component: () => import('@/features/stats/views/StatsView.vue'),
      },
      {
        path: 'menu',
        name: 'Menu',
        component: () => import('@/features/menu/views/MenuView.vue'),
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/features/settings/views/SettingsView.vue'),
      },
      {
        path: 'routines',
        name: 'Routines',
        component: () => import('@/features/routines/views/RoutinesView.vue'),
      },
    ],
  },
  // 기존 경로 호환성 유지
  {
    path: '/calendar',
    redirect: '/tabs/home',
  },
  {
    path: '/settings',
    redirect: '/tabs/settings',
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

  // 부모 라우트의 meta도 확인
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresGuest = to.meta.requiresGuest

  if (requiresAuth && !isAuthenticated.value) {
    next('/login')
  } else if (requiresGuest && isAuthenticated.value) {
    next('/tabs/home')
  } else {
    next()
  }
})

export default router
