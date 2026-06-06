import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Permission, Role } from '@/types/user'

const ROLE_DEFAULT_ROUTES: Record<Role, string> = {
  clerk: '/audit',
  head: '/dashboard',
  admin: '/dashboard',
  super_admin: '/dashboard',
}

function getDefaultRoute() {
  const authStore = useAuthStore()
  const role = authStore.user?.role
  if (role) return ROLE_DEFAULT_ROUTES[role]
  return '/login'
}

function redirectSafely(next: (path?: string) => void, fallback: string, currentPath: string) {
  if (fallback === currentPath) {
    next('/audit')
    return
  }
  next(fallback)
}

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
    path: '/projects',
    name: 'Projects',
    component: () => import('@/views/ProjectView.vue'),
    meta: { requiresAuth: true, permission: 'projects' as Permission },
  },
  {
    path: '/projects/:id',
    name: 'ProjectDetail',
    component: () => import('@/views/ProjectDetailView.vue'),
    meta: { requiresAuth: true, permission: 'projects' as Permission },
  },
  {
    path: '/my-workspace',
    name: 'MyWorkspace',
    component: () => import('@/views/MyWorkspaceView.vue'),
    meta: { requiresAuth: true, permission: 'projects' as Permission },
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
    path: '/procurement',
    name: 'Procurement',
    component: () => import('@/views/ProcurementView.vue'),
    meta: { requiresAuth: true, permission: 'procurement' as Permission },
  },
  {
    path: '/procurement/suppliers',
    name: 'Suppliers',
    component: () => import('@/views/SupplierView.vue'),
    meta: { requiresAuth: true, permission: 'procurement' as Permission },
  },
  {
    path: '/procurement/purchase-orders',
    name: 'PurchaseOrders',
    component: () => import('@/views/PurchaseOrderView.vue'),
    meta: { requiresAuth: true, permission: 'procurement' as Permission },
  },
  {
    path: '/approvals',
    name: 'Approvals',
    component: () => import('@/views/ApprovalView.vue'),
    meta: { requiresAuth: true, permission: 'approvals' as Permission },
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: () => import('@/views/NotificationsView.vue'),
    meta: { requiresAuth: true, permission: 'notifications' as Permission },
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
        path: 'roles',
        name: 'RoleSettings',
        component: () => import('@/views/settings/CustomRoleSettingsView.vue'),
        meta: { requiresAuth: true, permission: 'roles' as Permission },
      },
      {
        path: 'audit-config',
        name: 'AuditConfig',
        component: () => import('@/views/settings/AuditConfigView.vue'),
        meta: { requiresAuth: true, permission: 'audit-config' as Permission },
      },
      {
        path: 'approval-flows',
        name: 'ApprovalFlowSettings',
        component: () => import('@/views/settings/ApprovalFlowSettingsView.vue'),
        meta: { requiresAuth: true, permission: 'approval-flows' as Permission },
      },
      {
        path: 'departments',
        name: 'DepartmentSettings',
        component: () => import('@/views/settings/DepartmentSettingsView.vue'),
        meta: { requiresAuth: true, permission: 'departments' as Permission },
      },
      {
        path: 'storage',
        name: 'FileStorage',
        component: () => import('@/views/settings/FileStorageView.vue'),
        meta: { requiresAuth: true, permission: 'storage' as Permission },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, _from, next) => {
  const token = sessionStorage.getItem('token')

  // If token exists, ensure auth is initialized
  if (token) {
    const authStore = useAuthStore()
    if (!authStore.initialized) {
      try {
        await authStore.init()
      } catch {
        // init failed, token is invalid
        next('/login')
        return
      }
    }
  }

  // Auth check
  if (to.meta.requiresAuth && !token) {
    next('/login')
    return
  }

  if (to.path === '/login' && token) {
    next(getDefaultRoute())
    return
  }

  // Permission check
  if (to.meta.requiresAuth && token) {
    const authStore = useAuthStore()
    const permission = to.meta.permission as Permission | undefined
    if (permission && !authStore.hasPermission(permission)) {
      redirectSafely(next, getDefaultRoute(), to.path)
      return
    }
  }

  next()
})

export default router
