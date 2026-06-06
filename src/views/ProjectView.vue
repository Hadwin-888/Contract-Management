<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PageTransition from '@/components/common/PageTransition.vue'

const { t } = useI18n()
</script>

<template>
  <PageTransition>
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">{{ t('project.title') }}</h1>
      </div>
      <div class="empty-state">
        <p>{{ t('common.noData') }}</p>
      </div>
    </div>
  </PageTransition>
</template>

<style scoped>
.page { padding: 24px; }
.page-header { margin-bottom: 24px; }
.page-title { font-size: 24px; font-weight: 700; color: var(--text-primary); }
.empty-state { text-align: center; padding: 80px 0; color: var(--text-secondary); }
</style>
