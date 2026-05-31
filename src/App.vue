<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()
const isLoginPage = computed(() => route.path === '/login')

onMounted(() => {
  // Refresh user profile from API on app start
  authStore.init()
})
</script>

<template>
  <AppLayout v-if="!isLoginPage" />
  <router-view v-else />
</template>
