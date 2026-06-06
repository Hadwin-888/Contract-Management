<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import PageTransition from '@/components/common/PageTransition.vue'

const { t } = useI18n()
const route = useRoute()
</script>

<template>
  <PageTransition>
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">{{ t('project.title') }}</h1>
      </div>
    </div>
  </PageTransition>
</template>
