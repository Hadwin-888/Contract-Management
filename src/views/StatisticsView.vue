<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElRadioGroup, ElRadioButton, ElEmpty } from 'element-plus'
import { BarChart3, TrendingUp, Calendar, DollarSign, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-vue-next'
import PageTransition from '@/components/common/PageTransition.vue'
import { fetchStatistics } from '@/api/statistics'
import type { StatisticsData } from '@/api/statistics'

const loading = ref(false)
const dateRange = ref('year')
const stats = ref<StatisticsData | null>(null)

const typeColors: Record<string, string> = {
  '采购': '#007aff',
  '服务': '#34c759',
  '租赁': '#ff9500',
  '技术': '#af52de',
  '营销': '#ff3b30',
  '咨询': '#5ac8fa',
  '人力资源': '#ff6482',
  '物流': '#ffd60a',
}

const statusLabels: Record<string, string> = {
  active: '进行中',
  expired: '已过期',
  draft: '草稿',
  terminated: '已终止',
}

const statusColors: Record<string, string> = {
  active: '#34c759',
  expired: '#8e8e93',
  draft: '#ff9500',
  terminated: '#ff3b30',
}

const riskLabels: Record<string, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
}

const riskColors: Record<string, string> = {
  low: '#34c759',
  medium: '#ff9500',
  high: '#ff3b30',
}

async function loadStatistics() {
  loading.value = true
  try {
    stats.value = await fetchStatistics(dateRange.value)
  } catch (error) {
    console.error('Failed to load statistics:', error)
    stats.value = null
  } finally {
    loading.value = false
  }
}

watch(dateRange, () => {
  loadStatistics()
})

onMounted(() => {
  loadStatistics()
})

function formatMoney(amount: number) {
  if (amount >= 100000000) {
    return '¥' + (amount / 100000000).toFixed(2) + '亿'
  }
  if (amount >= 10000) {
    return '¥' + (amount / 10000).toFixed(0) + '万'
  }
  return '¥' + amount.toLocaleString()
}

function getMaxMonthlyValue(): number {
  if (!stats.value) return 1
  return Math.max(...stats.value.monthlyData, 1)
}

function getMaxTypeCount(): number {
  if (!stats.value?.typeDistribution.length) return 1
  return Math.max(...stats.value.typeDistribution.map((t) => t.count), 1)
}

function getMaxDeptCount(): number {
  if (!stats.value?.deptStats.length) return 1
  return Math.max(...stats.value.deptStats.map((d) => d.count), 1)
}

function getMaxMonthlyAmount(): number {
  if (!stats.value) return 1
  return Math.max(...stats.value.monthlyAmount, 1)
}

function getDeptColor(index: number): string {
  const colors = ['#007aff', '#34c759', '#ff9500', '#af52de', '#ff3b30', '#5ac8fa', '#ff6482', '#ffd60a']
  return colors[index % colors.length]
}
</script>

<template>
  <PageTransition>
    <div class="statistics-page">
      <div class="page-header">
        <h1 class="page-title">统计分析</h1>
        <p class="page-desc">合同数据统计与分析</p>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
      </div>

      <template v-else-if="stats">
        <!-- Summary cards -->
        <div class="summary-grid">
          <div class="summary-card glass-card">
            <div class="summary-icon" style="background: rgba(0,122,255,0.1)">
              <DollarSign :size="20" color="#007aff" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ formatMoney(stats.totalValue) }}</div>
              <div class="summary-label">合同总金额</div>
            </div>
          </div>
          <div class="summary-card glass-card">
            <div class="summary-icon" style="background: rgba(52,199,89,0.1)">
              <Calendar :size="20" color="#34c759" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ stats.avgDuration }}个月</div>
              <div class="summary-label">平均合同期限</div>
            </div>
          </div>
          <div class="summary-card glass-card">
            <div class="summary-icon" style="background: rgba(255,149,0,0.1)">
              <TrendingUp :size="20" color="#ff9500" />
            </div>
            <div class="summary-info">
              <div class="summary-value" :class="{ negative: stats.monthlyGrowth < 0 }">
                {{ stats.monthlyGrowth > 0 ? '+' : '' }}{{ stats.monthlyGrowth }}%
              </div>
              <div class="summary-label">月度增长率</div>
            </div>
          </div>
          <div class="summary-card glass-card">
            <div class="summary-icon" style="background: rgba(175,82,222,0.1)">
              <BarChart3 :size="20" color="#af52de" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ stats.totalCount }}</div>
              <div class="summary-label">合同总数</div>
            </div>
          </div>
        </div>

        <!-- Date range selector -->
        <div class="range-selector glass-card">
          <el-radio-group v-model="dateRange" class="range-tabs">
            <el-radio-button value="week">近7天</el-radio-button>
            <el-radio-button value="month">近30天</el-radio-button>
            <el-radio-button value="quarter">近90天</el-radio-button>
            <el-radio-button value="year">近1年</el-radio-button>
          </el-radio-group>
        </div>

        <!-- Charts row 1: Monthly contract count + amount -->
        <div class="charts-grid">
          <div class="chart-card glass-card">
            <h3 class="chart-title">月度合同数量</h3>
            <div class="bar-chart">
              <div v-if="stats.monthlyData.every(v => v === 0)" class="chart-empty">
                <ElEmpty description="暂无数据" />
              </div>
              <div v-else class="bar-container">
                <div
                  v-for="(value, index) in stats.monthlyData"
                  :key="index"
                  class="bar-item"
                >
                  <span class="bar-value" v-if="value > 0">{{ value }}</span>
                  <div
                    class="bar"
                    :style="{
                      height: (value / getMaxMonthlyValue()) * 100 + '%',
                      transitionDelay: index * 0.05 + 's',
                    }"
                  ></div>
                  <span class="bar-label">{{ index + 1 }}月</span>
                </div>
              </div>
            </div>
          </div>

          <div class="chart-card glass-card">
            <h3 class="chart-title">月度合同金额</h3>
            <div class="bar-chart">
              <div v-if="stats.monthlyAmount.every(v => v === 0)" class="chart-empty">
                <ElEmpty description="暂无数据" />
              </div>
              <div v-else class="bar-container">
                <div
                  v-for="(value, index) in stats.monthlyAmount"
                  :key="index"
                  class="bar-item"
                >
                  <span class="bar-value" v-if="value > 0">{{ formatMoney(value) }}</span>
                  <div
                    class="bar bar-amount"
                    :style="{
                      height: (value / getMaxMonthlyAmount()) * 100 + '%',
                      transitionDelay: index * 0.05 + 's',
                    }"
                  ></div>
                  <span class="bar-label">{{ index + 1 }}月</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts row 2: Type distribution + Status distribution -->
        <div class="charts-grid">
          <div class="chart-card glass-card">
            <h3 class="chart-title">合同类型分布</h3>
            <div v-if="stats.typeDistribution.length === 0" class="chart-empty">
              <ElEmpty description="暂无数据" />
            </div>
            <div v-else class="type-list">
              <div v-for="item in stats.typeDistribution" :key="item.type" class="type-item">
                <div class="type-header">
                  <span class="type-name">{{ item.type }}</span>
                  <span class="type-count">{{ item.count }}</span>
                </div>
                <div class="type-bar-bg">
                  <div
                    class="type-bar"
                    :style="{
                      width: (item.count / getMaxTypeCount()) * 100 + '%',
                      background: typeColors[item.type] || '#007aff',
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div class="chart-card glass-card">
            <h3 class="chart-title">合同状态分布</h3>
            <div v-if="stats.statusDistribution.length === 0" class="chart-empty">
              <ElEmpty description="暂无数据" />
            </div>
            <div v-else class="status-list">
              <div v-for="item in stats.statusDistribution" :key="item.status" class="status-item">
                <div class="status-dot" :style="{ background: statusColors[item.status] || '#8e8e93' }"></div>
                <span class="status-name">{{ statusLabels[item.status] || item.status }}</span>
                <span class="status-count">{{ item.count }}</span>
                <div class="status-bar-bg">
                  <div
                    class="status-bar"
                    :style="{
                      width: (item.count / stats.totalCount) * 100 + '%',
                      background: statusColors[item.status] || '#8e8e93',
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts row 3: Risk distribution + Department stats -->
        <div class="charts-grid">
          <div class="chart-card glass-card">
            <h3 class="chart-title">风险等级分布</h3>
            <div v-if="stats.riskDistribution.length === 0" class="chart-empty">
              <ElEmpty description="暂无数据" />
            </div>
            <div v-else class="risk-grid">
              <div
                v-for="item in stats.riskDistribution"
                :key="item.risk_level"
                class="risk-card-mini"
                :style="{ borderLeftColor: riskColors[item.risk_level] }"
              >
                <div class="risk-value" :style="{ color: riskColors[item.risk_level] }">{{ item.count }}</div>
                <div class="risk-label">{{ riskLabels[item.risk_level] || item.risk_level }}</div>
              </div>
            </div>
          </div>

          <div class="chart-card glass-card">
            <h3 class="chart-title">部门合同统计</h3>
            <div v-if="stats.deptStats.length === 0" class="chart-empty">
              <ElEmpty description="暂无数据" />
            </div>
            <div v-else class="dept-list">
              <div v-for="(item, index) in stats.deptStats" :key="item.follow_dept" class="dept-item">
                <div class="dept-header">
                  <span class="dept-name">{{ item.follow_dept }}</span>
                  <span class="dept-count">{{ item.count }}份 / {{ formatMoney(item.total_amount) }}</span>
                </div>
                <div class="type-bar-bg">
                  <div
                    class="type-bar"
                    :style="{
                      width: (item.count / getMaxDeptCount()) * 100 + '%',
                      background: getDeptColor(index),
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Audit stats card -->
        <div class="charts-grid">
          <div class="chart-card glass-card">
            <h3 class="chart-title">AI 审核统计</h3>
            <div v-if="stats.auditStats.total === 0" class="chart-empty">
              <ElEmpty description="暂无审核记录" />
            </div>
            <div v-else class="audit-grid">
              <div class="audit-stat-item">
                <div class="audit-stat-icon" style="background: rgba(52,199,89,0.1)">
                  <CheckCircle :size="20" color="#34c759" />
                </div>
                <div class="audit-stat-info">
                  <div class="audit-stat-value">{{ stats.auditStats.passed }}</div>
                  <div class="audit-stat-label">已通过</div>
                </div>
              </div>
              <div class="audit-stat-item">
                <div class="audit-stat-icon" style="background: rgba(255,149,0,0.1)">
                  <AlertTriangle :size="20" color="#ff9500" />
                </div>
                <div class="audit-stat-info">
                  <div class="audit-stat-value">{{ stats.auditStats.warnings }}</div>
                  <div class="audit-stat-label">警告</div>
                </div>
              </div>
              <div class="audit-stat-item">
                <div class="audit-stat-icon" style="background: rgba(255,59,48,0.1)">
                  <XCircle :size="20" color="#ff3b30" />
                </div>
                <div class="audit-stat-info">
                  <div class="audit-stat-value">{{ stats.auditStats.failed }}</div>
                  <div class="audit-stat-label">未通过</div>
                </div>
              </div>
              <div class="audit-stat-item">
                <div class="audit-stat-icon" style="background: rgba(90,200,250,0.1)">
                  <Clock :size="20" color="#5ac8fa" />
                </div>
                <div class="audit-stat-info">
                  <div class="audit-stat-value">{{ stats.auditStats.total }}</div>
                  <div class="audit-stat-label">总审核次数</div>
                </div>
              </div>
            </div>
          </div>

          <div class="chart-card glass-card">
            <h3 class="chart-title">到期合同预警</h3>
            <div class="expiring-content">
              <div class="expiring-big-number">{{ stats.expiringCount }}</div>
              <div class="expiring-label">份合同即将到期</div>
              <div class="expiring-hint">在所选时间范围内到期的进行中合同</div>
            </div>
          </div>
        </div>

        <!-- Top contracts table -->
        <div class="top-contracts glass-card">
          <h3 class="chart-title">合同金额 Top 10</h3>
          <div v-if="stats.topContracts.length === 0" class="chart-empty" style="padding: 20px">
            <ElEmpty description="暂无数据" />
          </div>
          <div v-else class="top-list">
            <div
              v-for="(item, index) in stats.topContracts"
              :key="item.name + index"
              class="top-item"
            >
              <div class="top-rank" :class="{ 'top-three': index < 3 }">
                {{ index + 1 }}
              </div>
              <div class="top-info">
                <div class="top-name">{{ item.name }}</div>
                <div class="top-party">{{ item.party }}</div>
              </div>
              <div class="top-amount">{{ formatMoney(item.amount) }}</div>
            </div>
          </div>
        </div>
      </template>

      <ElEmpty v-else description="加载统计数据失败" />
    </div>
  </PageTransition>
</template>

<style scoped>
.statistics-page {
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

/* Summary */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.summary-card {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.summary-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.summary-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.summary-value.negative {
  color: #ff3b30;
}

.summary-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* Range selector */
.range-selector {
  padding: 16px;
  margin-bottom: 16px;
}

/* Charts */
.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.chart-card {
  padding: 24px;
}

.chart-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 20px;
}

.chart-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 120px;
}

/* Bar chart */
.bar-chart {
  height: 200px;
}

.bar-container {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 100%;
}

.bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
  position: relative;
}

.bar-value {
  font-size: 10px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  font-weight: 500;
}

.bar {
  width: 100%;
  max-width: 32px;
  background: linear-gradient(to top, #007aff, #5ac8fa);
  border-radius: 4px 4px 0 0;
  animation: barGrow 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

.bar-amount {
  background: linear-gradient(to top, #34c759, #30d158);
}

@keyframes barGrow {
  from { height: 0; }
}

.bar-label {
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 6px;
}

/* Type distribution */
.type-list,
.dept-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.type-item,
.dept-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.type-header,
.dept-header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.type-name,
.dept-name {
  color: var(--text-primary);
  font-weight: 500;
}

.type-count,
.dept-count {
  color: var(--text-secondary);
  font-weight: 600;
}

.type-bar-bg {
  height: 8px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 4px;
  overflow: hidden;
}

.type-bar {
  height: 100%;
  border-radius: 4px;
  animation: barGrow 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

/* Status distribution */
.status-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-name {
  color: var(--text-primary);
  font-weight: 500;
  width: 60px;
}

.status-count {
  color: var(--text-secondary);
  font-weight: 600;
  width: 30px;
  text-align: right;
}

.status-bar-bg {
  flex: 1;
  height: 8px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 4px;
  overflow: hidden;
}

.status-bar {
  height: 100%;
  border-radius: 4px;
  animation: barGrow 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

/* Risk distribution */
.risk-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

.risk-card-mini {
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  border-left: 4px solid;
  text-align: center;
}

.risk-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.risk-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* Audit stats */
.audit-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.audit-stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
}

.audit-stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.audit-stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.audit-stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* Expiring */
.expiring-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
}

.expiring-big-number {
  font-size: 56px;
  font-weight: 800;
  color: #ff9500;
  line-height: 1;
  margin-bottom: 8px;
}

.expiring-label {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.expiring-hint {
  font-size: 12px;
  color: var(--text-secondary);
}

/* Top contracts */
.top-contracts {
  padding: 24px;
}

.top-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.top-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.top-item:last-child {
  border-bottom: none;
}

.top-rank {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.03);
  flex-shrink: 0;
}

.top-rank.top-three {
  background: rgba(0, 122, 255, 0.1);
  color: var(--apple-blue);
}

.top-info {
  flex: 1;
  min-width: 0;
}

.top-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-party {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-amount {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  flex-shrink: 0;
}

/* Responsive */
@media (max-width: 1024px) {
  .summary-grid,
  .charts-grid {
    grid-template-columns: 1fr;
  }

  .risk-grid {
    grid-template-columns: 1fr;
  }

  .audit-grid {
    grid-template-columns: 1fr;
  }
}
</style>
