<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { Contract } from '@/types'

defineProps<{
  contracts: Contract[]
}>()

const router = useRouter()

function goToContracts() {
  router.push('/contracts')
}
</script>

<template>
  <div class="widget glass-card">
    <div class="widget-header">
      <h3 class="widget-title">即将到期合同</h3>
      <button class="view-all" @click="goToContracts">查看全部</button>
    </div>
    <div class="contract-list">
      <div v-for="contract in contracts" :key="contract.id" class="contract-item">
        <div class="contract-info">
          <div class="contract-name">{{ contract.name }}</div>
          <div class="contract-date">到期: {{ contract.endDate }}</div>
        </div>
        <div class="contract-days" :class="{ urgent: contract.riskLevel === 'high' }">
          <span class="days-count">{{ Math.ceil((new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) }}</span>
          <span class="days-label">天</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.widget {
  padding: 20px;
}

.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.widget-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.view-all {
  font-size: 12px;
  color: var(--apple-blue);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.view-all:hover {
  background: rgba(0, 122, 255, 0.08);
}

.contract-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.contract-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.contract-item:last-child {
  border-bottom: none;
}

.contract-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.contract-date {
  font-size: 11px;
  color: var(--text-secondary);
}

.contract-days {
  text-align: center;
  padding: 4px 12px;
  border-radius: 8px;
  background: rgba(52, 199, 89, 0.1);
  color: #34c759;
}

.contract-days.urgent {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

.days-count {
  font-size: 18px;
  font-weight: 700;
  display: block;
  line-height: 1.2;
}

.days-label {
  font-size: 10px;
  display: block;
}
</style>
