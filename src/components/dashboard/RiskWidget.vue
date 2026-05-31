<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  score: number
}>()

const scoreColor = computed(() => {
  if (props.score >= 80) return '#34c759'
  if (props.score >= 60) return '#ff9500'
  return '#ff3b30'
})

const scoreLabel = computed(() => {
  if (props.score >= 80) return '良好'
  if (props.score >= 60) return '一般'
  return '需要关注'
})

const circumference = 2 * Math.PI * 54
const offset = computed(() => {
  return circumference - (props.score / 100) * circumference
})
</script>

<template>
  <div class="risk-widget glass-card">
    <h3 class="widget-title">AI风险评分</h3>
    <div class="risk-content">
      <div class="gauge-wrapper">
        <svg viewBox="0 0 120 120" class="gauge">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#f0f0f0" stroke-width="8" />
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            :stroke="scoreColor"
            stroke-width="8"
            stroke-linecap="round"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="offset"
            transform="rotate(-90 60 60)"
            class="gauge-progress"
          />
        </svg>
        <div class="gauge-text">
          <span class="gauge-score">{{ score }}</span>
          <span class="gauge-label">分</span>
        </div>
      </div>
      <div class="risk-info">
        <div class="risk-status" :style="{ color: scoreColor }">{{ scoreLabel }}</div>
        <p class="risk-desc">
          基于AI对合同条款、履约记录和风险因子的综合评估，当前合同组合整体风险可控。
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.risk-widget {
  padding: 20px;
}

.widget-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px;
}

.risk-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.gauge-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
  flex-shrink: 0;
}

.gauge {
  width: 100%;
  height: 100%;
}

.gauge-progress {
  transition: stroke-dashoffset 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.gauge-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.gauge-score {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.gauge-label {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.risk-info {
  flex: 1;
}

.risk-status {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
}

.risk-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}
</style>
