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
    pending_approval: { label: '审批中', color: '#af52de', bg: 'rgba(175,82,222,0.12)' },
    approved: { label: '审批通过', color: '#0f766e', bg: 'rgba(15,118,110,0.12)' },
    pending_archive: { label: '待归档', color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
    archived: { label: '已归档', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
    rejected: { label: '已驳回', color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
  }
  return map[props.status] || { label: props.status, color: '#64748b', bg: 'rgba(100,116,139,0.12)' }
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
