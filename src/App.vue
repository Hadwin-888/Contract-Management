<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()
const shouldUseAppLayout = computed(() => route.meta.layout !== 'blank' && authStore.isAuthenticated)

onMounted(() => {
  // Refresh user profile from API on app start
  // Router guard already handles this, but call it here as fallback
  if (!authStore.initialized) {
    authStore.init()
  }
})
</script>

<template>
  <AppLayout v-if="shouldUseAppLayout" />
  <router-view v-else />
</template>
