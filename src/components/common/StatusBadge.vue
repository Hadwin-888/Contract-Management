<script setup lang="ts">
import { computed } from 'vue'
import type { ContractStatus } from '@/types'

const props = defineProps<{
  status: ContractStatus
}>()

const statusConfig = computed(() => {
  const map: Record<ContractStatus, { label: string; color: string; bg: string }> = {
    active: { label: '进行中', color: '#34c759', bg: 'rgba(52,199,89,0.1)' },
    expired: { label: '已过期', color: '#8e8e93', bg: 'rgba(142,142,147,0.1)' },
    draft: { label: '草稿', color: '#007aff', bg: 'rgba(0,122,255,0.1)' },
    terminated: { label: '已终止', color: '#ff3b30', bg: 'rgba(255,59,48,0.1)' },
  }
  return map[props.status]
})
</script>

<template>
  <span
    class="status-badge"
    :style="{ color: statusConfig.color, background: statusConfig.bg }"
  >
    <span class="status-dot" :style="{ background: statusConfig.color }"></span>
    {{ statusConfig.label }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
</style>
