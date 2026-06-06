<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  LayoutDashboard,
  FileText,
  ShieldCheck,
  BarChart3,
  Settings,
  LogOut,
  ClipboardList,
  ShoppingCart,
  ChevronDown,
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

interface SubMenuItem {
  key: string
  path: string
  permission: string
}

interface GroupMenuItem {
  key: string
  icon: any
  permission: string
  children: SubMenuItem[]
}

const contractMenuOpen = ref(false)

const topMenuItems: MenuItem[] = [
  { key: 'nav.dashboard', path: '/dashboard', icon: LayoutDashboard, permission: 'dashboard' },
  { key: 'nav.projects', path: '/projects', icon: ClipboardList, permission: 'projects' },
  { key: 'nav.procurement', path: '/procurement', icon: ShoppingCart, permission: 'procurement' },
]

// 合同管理分组（含 AI审核 子项）
const contractGroup: GroupMenuItem = {
  key: 'nav.contracts',
  icon: FileText,
  permission: 'contracts',
  children: [
    { key: 'nav.contracts', path: '/contracts', permission: 'contracts' },
    { key: 'nav.audit', path: '/audit', permission: 'audit' },
  ],
}

const bottomMenuItems: MenuItem[] = [
  { key: 'nav.statistics', path: '/statistics', icon: BarChart3, permission: 'statistics' },
  { key: 'nav.settings', path: '/settings', icon: Settings, permission: 'settings' },
]

const role = computed(() => authStore.role)

const visibleTopItems = computed(() => {
  const r = role.value
  if (!r) return []
  return topMenuItems.filter((item) => authStore.hasPermission(item.permission as any))
})

const visibleContractGroup = computed(() => {
  const r = role.value
  if (!r) return null
  if (!authStore.hasPermission(contractGroup.permission as any) &&
      !contractGroup.children.some((c) => authStore.hasPermission(c.permission as any))) {
    return null
  }
  return contractGroup
})

const visibleBottomItems = computed(() => {
  const r = role.value
  if (!r) return []
  return bottomMenuItems.filter((item) => authStore.hasPermission(item.permission as any))
})

const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/')
}

const isContractGroupActive = computed(() => {
  return contractGroup.children.some((c) => isActive(c.path))
})

// Auto-open contract group if a child is active
if (isContractGroupActive.value) {
  contractMenuOpen.value = true
}

function toggleContractMenu() {
  contractMenuOpen.value = !contractMenuOpen.value
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
      <!-- Top menu items -->
      <router-link
        v-for="item in visibleTopItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
      >
        <component :is="item.icon" :size="20" :stroke-width="1.5" />
        <span>{{ t(item.key) }}</span>
      </router-link>

      <!-- Contract group (collapsible) -->
      <div v-if="visibleContractGroup" class="nav-group">
        <button
          class="nav-item group-toggle"
          :class="{ active: isContractGroupActive }"
          @click="toggleContractMenu"
        >
          <component :is="visibleContractGroup.icon" :size="20" :stroke-width="1.5" />
          <span>{{ t(visibleContractGroup.key) }}</span>
          <ChevronDown :size="16" class="group-arrow" :class="{ open: contractMenuOpen }" />
        </button>
        <Transition name="slide">
          <div v-if="contractMenuOpen" class="sub-menu">
            <router-link
              v-for="child in visibleContractGroup.children"
              :key="child.path"
              :to="child.path"
              class="nav-item sub-item"
              :class="{ active: isActive(child.path) }"
            >
              <span>{{ t(child.key) }}</span>
            </router-link>
          </div>
        </Transition>
      </div>

      <!-- Bottom menu items -->
      <router-link
        v-for="item in visibleBottomItems"
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

/* Group toggle */
.nav-group {
  display: flex;
  flex-direction: column;
}

.group-toggle {
  width: 100%;
  justify-content: flex-start;
}

.group-arrow {
  margin-left: auto;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.group-arrow.open {
  transform: rotate(180deg);
}

/* Sub menu */
.sub-menu {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-left: 12px;
}

.sub-item {
  font-size: 13px;
  padding: 8px 12px;
}

/* Slide transition */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
}

.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 100px;
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
