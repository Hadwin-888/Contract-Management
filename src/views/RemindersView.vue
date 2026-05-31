<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElButton, ElRadioGroup, ElRadioButton } from 'element-plus'
import { Bell, AlertTriangle, RefreshCw, Eye } from 'lucide-vue-next'
import PageTransition from '@/components/common/PageTransition.vue'
import { fetchContracts } from '@/api/contracts'
import type { Contract } from '@/types'

interface Reminder {
  id: string
  contractName: string
  daysRemaining: number
  type: 'expiration' | 'review' | 'renewal'
  priority: 'high' | 'medium' | 'low'
  description: string
}

const reminders = ref<Reminder[]>([])
const loading = ref(false)
const filterTab = ref<'all' | 'expiring' | 'overdue'>('all')

const filteredReminders = computed(() => {
  switch (filterTab.value) {
    case 'expiring':
      return reminders.value.filter((r) => r.daysRemaining > 0 && r.daysRemaining <= 30)
    case 'overdue':
      return reminders.value.filter((r) => r.daysRemaining <= 0)
    default:
      return reminders.value
  }
})

onMounted(async () => {
  loading.value = true
  try {
    // Fetch active contracts to generate reminders
    const result = await fetchContracts({ page: 1, pageSize: 100 })
    const now = new Date()

    const generated: Reminder[] = result.items
      .filter((c: Contract) => c.status === 'active')
      .map((c: Contract) => {
        const endDate = new Date((c as any).end_date || c.endDate)
        const diffMs = endDate.getTime() - now.getTime()
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

        let type: 'expiration' | 'review' | 'renewal' = 'expiration'
        let priority: 'high' | 'medium' | 'low' = 'medium'
        let description = ''

        if (daysRemaining <= 0) {
          type = 'expiration'
          priority = 'high'
          description = `合同"${c.name}"已过期 ${Math.abs(daysRemaining)} 天，请尽快处理`
        } else if (daysRemaining <= 7) {
          type = 'expiration'
          priority = 'high'
          description = `合同"${c.name}"将在 ${daysRemaining} 天后到期，请及时处理续约事宜`
        } else if (daysRemaining <= 30) {
          type = 'expiration'
          priority = 'high'
          description = `合同"${c.name}"将在 ${daysRemaining} 天后到期`
        } else if (daysRemaining <= 60) {
          type = 'renewal'
          priority = 'medium'
          description = `合同"${c.name}"即将到期，建议提前协商续约条件`
        } else if (daysRemaining <= 90) {
          type = 'review'
          priority = 'low'
          description = `建议对"${c.name}"进行季度履约情况评估`
        } else {
          type = 'review'
          priority = 'low'
          description = `建议对"${c.name}"进行半年度履约情况评估`
        }

        return {
          id: c.id,
          contractName: c.name,
          daysRemaining,
          type,
          priority,
          description,
        }
      })
      .sort((a: Reminder, b: Reminder) => a.daysRemaining - b.daysRemaining)

    reminders.value = generated
  } catch (error) {
    console.error('Failed to load reminders:', error)
  } finally {
    loading.value = false
  }
})

function getPriorityClass(days: number) {
  if (days <= 0) return 'overdue'
  if (days <= 7) return 'urgent'
  if (days <= 30) return 'warning'
  return 'normal'
}

function getTypeLabel(type: string) {
  const map: Record<string, string> = {
    expiration: '到期提醒',
    review: '评估提醒',
    renewal: '续约提醒',
  }
  return map[type] || type
}

function getTypeIcon(type: string) {
  const map: Record<string, string> = {
    expiration: '⏰',
    review: '📋',
    renewal: '🔄',
  }
  return map[type] || '🔔'
}
</script>

<template>
  <PageTransition>
    <div class="reminders-page">
      <div class="page-header">
        <h1 class="page-title">合同提醒</h1>
        <p class="page-desc">合同到期与履约提醒</p>
      </div>

      <!-- Filter tabs -->
      <div class="filters glass-card">
        <el-radio-group v-model="filterTab" class="filter-tabs">
          <el-radio-button value="all">全部 ({{ reminders.length }})</el-radio-button>
          <el-radio-button value="expiring">即将到期 ({{ reminders.filter(r => r.daysRemaining > 0 && r.daysRemaining <= 30).length }})</el-radio-button>
          <el-radio-button value="overdue">已逾期 ({{ reminders.filter(r => r.daysRemaining <= 0).length }})</el-radio-button>
        </el-radio-group>
      </div>

      <!-- Reminder list -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
      </div>

      <div v-else class="reminder-list">
        <div
          v-for="reminder in filteredReminders"
          :key="reminder.id"
          class="reminder-item glass-card"
          :class="getPriorityClass(reminder.daysRemaining)"
        >
          <div class="reminder-icon">
            {{ getTypeIcon(reminder.type) }}
          </div>

          <div class="reminder-content">
            <div class="reminder-header">
              <span class="reminder-name">{{ reminder.contractName }}</span>
              <span class="reminder-type">{{ getTypeLabel(reminder.type) }}</span>
            </div>
            <p class="reminder-desc">{{ reminder.description }}</p>
          </div>

          <div class="reminder-days">
            <template v-if="reminder.daysRemaining > 0">
              <span class="days-number">{{ reminder.daysRemaining }}</span>
              <span class="days-text">天后</span>
            </template>
            <template v-else>
              <span class="days-number overdue-text">{{ Math.abs(reminder.daysRemaining) }}</span>
              <span class="days-text overdue-text">天前过期</span>
            </template>
          </div>

          <div class="reminder-actions">
            <el-button text size="small" type="primary">
              <Eye :size="14" /> 查看
            </el-button>
          </div>
        </div>

        <div v-if="filteredReminders.length === 0" class="empty-state glass-card">
          <Bell :size="40" color="#86868b" />
          <p>暂无提醒</p>
        </div>
      </div>
    </div>
  </PageTransition>
</template>

<style scoped>
.reminders-page {
  width: 100%;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
  letter-spacing: -0.5px;
}

.page-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.filters {
  padding: 16px;
  margin-bottom: 16px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(0, 122, 255, 0.1);
  border-top-color: var(--apple-blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.reminder-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reminder-item {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s ease;
}

.reminder-item:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-hover);
}

.reminder-item.overdue {
  border-left: 3px solid #ff3b30;
}

.reminder-item.urgent {
  border-left: 3px solid #ff9500;
}

.reminder-item.warning {
  border-left: 3px solid #ffcc00;
}

.reminder-item.normal {
  border-left: 3px solid #34c759;
}

.reminder-icon {
  font-size: 24px;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.03);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.reminder-content {
  flex: 1;
  min-width: 0;
}

.reminder-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.reminder-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.reminder-type {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(0, 122, 255, 0.08);
  color: var(--apple-blue);
}

.reminder-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reminder-days {
  text-align: center;
  padding: 0 16px;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  min-width: 60px;
}

.days-number {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.days-text {
  font-size: 11px;
  color: var(--text-secondary);
}

.overdue-text {
  color: #ff3b30 !important;
}

.reminder-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.empty-state {
  padding: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 14px;
}

@media (max-width: 768px) {
  .reminder-item {
    flex-wrap: wrap;
  }

  .reminder-days {
    border-right: none;
    padding: 0;
  }

  .reminder-actions {
    flex-direction: row;
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
