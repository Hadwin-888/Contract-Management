<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <div class="page">
    <h2>{{ t('role.title') }}</h2>
  </div>
</template>
