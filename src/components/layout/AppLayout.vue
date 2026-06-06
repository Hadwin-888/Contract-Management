<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppSidebar from './AppSidebar.vue'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'
import NotificationBell from '@/components/common/NotificationBell.vue'

const { t } = useI18n()
</script>

<template>
  <div class="app-layout">
    <AppSidebar />
    <div class="main-area">
      <header class="top-header">
        <div class="header-left">
          <span class="platform-name">{{ t('platform.name') }}</span>
        </div>
        <div class="header-right">
          <NotificationBell />
          <LanguageSwitcher />
        </div>
      </header>
      <main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background: var(--bg-primary);
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.top-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 24px;
  background: var(--bg-card, #fff);
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
}

.platform-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary, #111827);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.main-content {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
}
</style>
