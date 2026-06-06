<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { setLocale } from '@/i18n'
import { Languages } from 'lucide-vue-next'

const { locale } = useI18n()

function toggleLanguage() {
  const newLocale = locale.value === 'zh-CN' ? 'en' : 'zh-CN'
  setLocale(newLocale)
}
</script>

<template>
  <button class="lang-switcher" @click="toggleLanguage" :title="locale === 'zh-CN' ? 'Switch to English' : '切换到中文'">
    <Languages :size="16" />
    <span>{{ locale === 'zh-CN' ? 'EN' : '中' }}</span>
  </button>
</template>

<style scoped>
.lang-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
}
.lang-switcher:hover {
  background: var(--hover-bg, rgba(0,0,0,0.05));
  color: var(--text-primary, #111827);
}
</style>
