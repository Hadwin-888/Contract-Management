import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Permission } from '@/types/user'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { layout: 'blank' },
  },
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true, permission: 'dashboard' as Permission },
  },
  {
    path: '/contracts',
    name: 'Contracts',
    component: () => import('@/views/ContractsView.vue'),
    meta: { requiresAuth: true, permission: 'contracts' as Permission },
  },
  {
    path: '/audit',
    name: 'Audit',
    component: () => import('@/views/AuditView.vue'),
    meta: { requiresAuth: true, permission: 'audit' as Permission },
  },
  {
    path: '/reminders',
    name: 'Reminders',
    component: () => import('@/views/RemindersView.vue'),
    meta: { requiresAuth: true, permission: 'reminders' as Permission },
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: () => import('@/views/StatisticsView.vue'),
    meta: { requiresAuth: true, permission: 'statistics' as Permission },
  },
  {
    path: '/settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { requiresAuth: true, permission: 'settings' as Permission },
    children: [
      {
        path: 'users',
        name: 'UserSettings',
        component: () => import('@/views/settings/UserSettingsView.vue'),
        meta: { requiresAuth: true, permission: 'users' as Permission },
      },
      {
        path: 'audit-config',
        name: 'AuditConfig',
        component: () => import('@/views/settings/AuditConfigView.vue'),
        meta: { requiresAuth: true, permission: 'audit-config' as Permission },
      },
      {
        path: 'departments',
        name: 'DepartmentSettings',
        component: () => import('@/views/settings/DepartmentSettingsView.vue'),
        meta: { requiresAuth: true, permission: 'settings' as Permission },
      },
      {
        path: 'storage',
        name: 'FileStorage',
        component: () => import('@/views/settings/FileStorageView.vue'),
        meta: { requiresAuth: true, permission: 'settings' as Permission },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')

  // Auth check
  if (to.meta.requiresAuth && !token) {
    next('/login')
    return
  }

  if (to.path === '/login' && token) {
    next('/dashboard')
    return
  }

  // Permission check
  if (to.meta.requiresAuth && token) {
    const authStore = useAuthStore()
    const permission = to.meta.permission as Permission | undefined
    if (permission && !authStore.hasPermission(permission)) {
      next('/dashboard')
      return
    }
  }

  next()
})

export default router
