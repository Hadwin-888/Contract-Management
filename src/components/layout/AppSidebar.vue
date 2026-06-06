<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  LayoutDashboard,
  FileText,
  ShieldCheck,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  ClipboardList,
  ShoppingCart,
  CheckCircle,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

interface MenuItem {
  key: string
  path: string
  icon: any
  permission: string
}

const allMenuItems: MenuItem[] = [
  { key: 'nav.dashboard', path: '/dashboard', icon: LayoutDashboard, permission: 'dashboard' },
  { key: 'nav.projects', path: '/projects', icon: ClipboardList, permission: 'projects' },
  { key: 'nav.contracts', path: '/contracts', icon: FileText, permission: 'contracts' },
  { key: 'nav.audit', path: '/audit', icon: ShieldCheck, permission: 'audit' },
  { key: 'nav.procurement', path: '/procurement', icon: ShoppingCart, permission: 'procurement' },
  { key: 'nav.reminders', path: '/reminders', icon: Bell, permission: 'reminders' },
  { key: 'nav.statistics', path: '/statistics', icon: BarChart3, permission: 'statistics' },
  { key: 'nav.approvals', path: '/approvals', icon: CheckCircle, permission: 'approvals' },
  { key: 'nav.settings', path: '/settings', icon: Settings, permission: 'settings' },
]

const role = computed(() => authStore.role)

const menuItems = computed(() => {
  const r = role.value
  if (!r) return []
  return allMenuItems.filter((item) => authStore.hasPermission(item.permission as any))
})

const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/')
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo">
        <ShieldCheck :size="24" :stroke-width="2" />
      </div>
      <span class="logo-text">{{ t('platform.shortName') }}</span>
    </div>

    <nav class="sidebar-nav">
      <router-link
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
      >
        <component :is="item.icon" :size="20" :stroke-width="1.5" />
        <span>{{ t(item.key) }}</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <div class="user-info" v-if="authStore.user">
        <span class="user-name">{{ authStore.user.name }}</span>
        <span class="user-role">{{ authStore.user.role }}</span>
      </div>
      <button class="nav-item logout-btn" @click="handleLogout">
        <LogOut :size="20" :stroke-width="1.5" />
        <span>{{ t('nav.logout') }}</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 240px;
  min-height: 100vh;
  background: var(--card-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  padding: 20px 12px;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}

.logo {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--apple-blue);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-button);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
}

.nav-item:hover {
  background: rgba(0, 122, 255, 0.08);
  color: var(--apple-blue);
}

.nav-item.active {
  background: rgba(0, 122, 255, 0.1);
  color: var(--apple-blue);
  font-weight: 600;
}

.sidebar-footer {
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  margin-top: auto;
}

.user-info {
  padding: 0 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.user-role {
  font-size: 11px;
  color: var(--text-secondary);
}

.logout-btn:hover {
  background: rgba(255, 59, 48, 0.08) !important;
  color: #ff3b30 !important;
}
</style>
