<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  value: number
  icon: string
  color?: string
  suffix?: string
  trend?: { value: number; isUp: boolean }
}>(), {
  color: '#007aff',
  suffix: '',
})

const displayValue = ref(0)

onMounted(() => {
  // Animate number counting up
  const duration = 1000
  const steps = 30
  const increment = props.value / steps
  let current = 0
  const timer = setInterval(() => {
    current += increment
    if (current >= props.value) {
      displayValue.value = props.value
      clearInterval(timer)
    } else {
      displayValue.value = Math.floor(current)
    }
  }, duration / steps)
})
</script>

<template>
  <div class="stat-card glass-card">
    <div class="stat-icon" :style="{ background: color + '15', color }">
      <span class="icon-emoji">{{ icon }}</span>
    </div>
    <div class="stat-info">
      <div class="stat-value">
        {{ displayValue.toLocaleString() }}<span v-if="suffix" class="stat-suffix">{{ suffix }}</span>
      </div>
      <div class="stat-title">{{ title }}</div>
    </div>
    <div v-if="trend" class="stat-trend" :class="{ up: trend.isUp, down: !trend.isUp }">
      {{ trend.isUp ? '↑' : '↓' }} {{ trend.value }}%
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
  overflow: hidden;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-emoji {
  font-size: 20px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.5px;
  line-height: 1.2;
}

.stat-suffix {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-left: 2px;
}

.stat-title {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.stat-trend {
  position: absolute;
  top: 20px;
  right: 20px;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
}

.stat-trend.up {
  color: #34c759;
  background: rgba(52, 199, 89, 0.1);
}

.stat-trend.down {
  color: #ff3b30;
  background: rgba(255, 59, 48, 0.1);
}
</style>
