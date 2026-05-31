<script setup lang="ts">
import { onMounted } from 'vue'
import { useDashboardStore } from '@/stores/dashboard'
import PageTransition from '@/components/common/PageTransition.vue'
import StatCard from '@/components/dashboard/StatCard.vue'
import RiskWidget from '@/components/dashboard/RiskWidget.vue'
import ExpiringContracts from '@/components/dashboard/ExpiringContracts.vue'
import RecentUploads from '@/components/dashboard/RecentUploads.vue'

const dashboardStore = useDashboardStore()

onMounted(() => {
  dashboardStore.fetchDashboard()
})
</script>

<template>
  <PageTransition>
    <div class="dashboard">
      <div class="page-header">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-desc">合同管理概览</p>
      </div>

      <!-- Loading state -->
      <div v-if="dashboardStore.loading" class="loading-state">
        <div class="loading-spinner"></div>
      </div>

      <template v-else-if="dashboardStore.data">
        <!-- Stat cards row -->
        <div class="stats-grid">
          <StatCard
            title="合同总数"
            :value="dashboardStore.data.stats.totalContracts"
            icon="📄"
            color="#007aff"
            :trend="{ value: 12, isUp: true }"
          />
          <StatCard
            title="进行中"
            :value="dashboardStore.data.stats.activeContracts"
            icon="✅"
            color="#34c759"
            :trend="{ value: 5, isUp: true }"
          />
          <StatCard
            title="即将到期"
            :value="dashboardStore.data.stats.expiringSoon"
            icon="⏰"
            color="#ff9500"
            :trend="{ value: 3, isUp: false }"
          />
          <StatCard
            title="草稿"
            :value="dashboardStore.data.stats.draftContracts"
            icon="📝"
            color="#af52de"
            :trend="{ value: 2, isUp: true }"
          />
        </div>

        <!-- Middle row -->
        <div class="middle-grid">
          <RiskWidget :score="dashboardStore.data.stats.riskScore" />
          <div class="audit-status glass-card">
            <h3 class="widget-title">AI审核状态</h3>
            <div class="audit-items">
              <div class="audit-item">
                <div class="audit-dot passed"></div>
                <span>已通过</span>
                <span class="audit-count">{{ dashboardStore.data.auditStatus.passed }}</span>
              </div>
              <div class="audit-item">
                <div class="audit-dot failed"></div>
                <span>未通过</span>
                <span class="audit-count">{{ dashboardStore.data.auditStatus.failed }}</span>
              </div>
              <div class="audit-item">
                <div class="audit-dot pending"></div>
                <span>待审核</span>
                <span class="audit-count">{{ dashboardStore.data.auditStatus.pending }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom row -->
        <div class="bottom-grid">
          <ExpiringContracts :contracts="dashboardStore.data.expiringContracts" />
          <RecentUploads :uploads="dashboardStore.data.recentUploads" />
        </div>
      </template>
    </div>
  </PageTransition>
</template>

<style scoped>
.dashboard {
  width: 100%;
}

.page-header {
  margin-bottom: 28px;
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

/* Grid layouts */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.middle-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Audit status widget */
.audit-status {
  padding: 20px;
}

.widget-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px;
}

.audit-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.audit-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--text-primary);
}

.audit-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.audit-dot.passed { background: #34c759; }
.audit-dot.failed { background: #ff3b30; }
.audit-dot.pending { background: #ff9500; }

.audit-count {
  margin-left: auto;
  font-weight: 600;
  color: var(--text-primary);
}

/* Responsive */
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .middle-grid,
  .bottom-grid {
    grid-template-columns: 1fr;
  }
}
</style>
