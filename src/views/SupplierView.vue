<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PageTransition from '@/components/common/PageTransition.vue'

const { t } = useI18n()
</script>

<template>
  <PageTransition>
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">{{ t('procurement.suppliers') }}</h1>
      </div>
    </div>
  </PageTransition>
</template>
