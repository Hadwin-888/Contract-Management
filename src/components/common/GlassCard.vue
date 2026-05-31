<script setup lang="ts">
withDefaults(defineProps<{
  padding?: string
}>(), {
  padding: '24px',
})
</script>

<template>
  <div class="glass-card" :style="{ padding }">
    <slot />
  </div>
</template>
