<script setup lang="ts">
</script>

<template>
  <div class="page-transition">
    <slot />
  </div>
</template>

<style scoped>
.page-transition {
  animation: pageIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

@keyframes pageIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
