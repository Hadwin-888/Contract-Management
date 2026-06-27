<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDashboardStore } from '@/stores/dashboard'
import apiClient from '@/api/client'
import PageTransition from '@/components/common/PageTransition.vue'
import StatCard from '@/components/dashboard/StatCard.vue'
import RiskWidget from '@/components/dashboard/RiskWidget.vue'
import ExpiringContracts from '@/components/dashboard/ExpiringContracts.vue'
import RecentUploads from '@/components/dashboard/RecentUploads.vue'
import { CheckCircle, Clock, XCircle } from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const dashboardStore = useDashboardStore()

const pendingApprovals = ref<any[]>([])

onMounted(async () => {
  await dashboardStore.fetchDashboard()
  loadPendingApprovals()
})

async function loadPendingApprovals() {
  try {
    const result = await apiClient.get('/approvals/pending', { params: { pageSize: 5 } })
    pendingApprovals.value = result.data.items
  } catch {
    // ignore
  }
}

function goToApprovals() {
  router.push('/approvals')
}

function openApprovalItem() {
  router.push('/approvals')
}
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

        <!-- Pending approvals -->
        <div class="approvals-section glass-card">
          <div class="approvals-header">
            <h3 class="widget-title">{{ t('approval.pendingApprovals') }}</h3>
            <button class="view-all-btn" @click="goToApprovals">{{ t('common.more') }}</button>
          </div>
          <div class="approvals-list">
            <div
              v-for="item in pendingApprovals"
              :key="item.id"
              class="approval-item"
              role="button"
              tabindex="0"
              @click="openApprovalItem"
              @keydown.enter="openApprovalItem"
            >
              <div class="approval-icon" :class="item.requestType">
                <Clock :size="16" />
              </div>
              <div class="approval-info">
                <span class="approval-title">
                  <span class="approval-type">{{ item.requestType === 'contract' ? '合同' : '采购' }}</span>
                  {{ item.title }}
                </span>
                <span class="approval-meta">{{ item.requester?.name || '-' }} · {{ new Date(item.createdAt).toLocaleDateString('zh-CN') }}</span>
                <span v-if="item.requestType === 'contract' && typeof item.riskScore === 'number'" class="approval-risk">
                  AI风险 {{ item.riskScore }}分
                  <template v-if="typeof item.criticalIssueCount === 'number'"> · 严重问题 {{ item.criticalIssueCount }}项</template>
                </span>
              </div>
              <el-tag size="small" type="warning">{{ t('approval.pendingApprovals') }}</el-tag>
            </div>
            <div v-if="pendingApprovals.length === 0" class="empty-approvals">
              <CheckCircle :size="20" />
              <span>{{ t('common.noData') }}</span>
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

/* Approvals section */
.approvals-section {
  padding: 20px;
  margin-bottom: 16px;
}
.approvals-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.view-all-btn {
  font-size: 12px;
  color: var(--apple-blue, #007aff);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}
.view-all-btn:hover { background: rgba(0,122,255,0.08); }
.approvals-list { display: flex; flex-direction: column; gap: 8px; }
.approval-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--bg-secondary, #f9fafb);
  cursor: pointer;
  transition: background 0.16s ease, transform 0.16s ease;
}
.approval-item:hover,
.approval-item:focus-visible {
  background: rgba(0, 122, 255, 0.06);
  outline: none;
  transform: translateY(-1px);
}
.approval-icon {
  width: 32px; height: 32px;
  border-radius: 8px;
  background: rgba(255,149,0,0.1);
  color: #ff9500;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.approval-icon.contract { background: rgba(0, 122, 255, 0.1); color: #007aff; }
.approval-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.approval-title { overflow: hidden; font-size: 13px; font-weight: 500; color: var(--text-primary, #111); text-overflow: ellipsis; white-space: nowrap; }
.approval-type {
  display: inline-flex;
  margin-right: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(100, 116, 139, 0.12);
  color: #475569;
  font-size: 11px;
  font-weight: 600;
}
.approval-meta { overflow: hidden; font-size: 11px; color: var(--text-tertiary, #9ca3af); text-overflow: ellipsis; white-space: nowrap; }
.approval-risk {
  width: fit-content;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(217, 119, 6, 0.1);
  color: #b45309;
  font-size: 11px;
  font-weight: 500;
}
.empty-approvals {
  display: flex; align-items: center; gap: 8px;
  padding: 16px; color: var(--text-tertiary, #9ca3af);
  justify-content: center; font-size: 13px;
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
