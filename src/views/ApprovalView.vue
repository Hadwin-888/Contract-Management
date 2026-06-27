<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, X, FileText, Download, Eye, Paperclip, FolderKanban } from 'lucide-vue-next'
import PageTransition from '@/components/common/PageTransition.vue'
import apiClient from '@/api/client'

const { t } = useI18n()
const router = useRouter()

const pendingItems = ref<any[]>([])
const historyItems = ref<any[]>([])
const loading = ref(false)
const activeTab = ref<'pending' | 'history'>('pending')
const commentDialogVisible = ref(false)
const currentAction = ref<'approve' | 'reject'>('approve')
const currentItemId = ref('')
const commentText = ref('')
const reportDialogVisible = ref(false)
const reportItem = ref<any | null>(null)
const detailDialogVisible = ref(false)
const detailItem = ref<any | null>(null)
const selectedApprovalIds = ref<string[]>([])
const batchMode = ref(false)

const allPendingSelected = computed(() => pendingItems.value.length > 0 && selectedApprovalIds.value.length === pendingItems.value.length)

onMounted(() => {
  loadPending()
})

async function loadPending() {
  loading.value = true
  try {
    const result = await apiClient.get('/approvals/pending', { params: { pageSize: 50 } })
    pendingItems.value = result.data.items
    selectedApprovalIds.value = selectedApprovalIds.value.filter((id) => pendingItems.value.some((item) => item.id === id))
  } catch {
    console.error('Failed to load pending approvals')
  } finally {
    loading.value = false
  }
}

async function loadHistory() {
  loading.value = true
  try {
    const result = await apiClient.get('/approvals/history', { params: { pageSize: 50 } })
    historyItems.value = result.data.items
  } catch {
    console.error('Failed to load history')
  } finally {
    loading.value = false
  }
}

function switchTab(tab: 'pending' | 'history') {
  activeTab.value = tab
  if (tab === 'history') loadHistory()
}

function openActionDialog(id: string, action: 'approve' | 'reject') {
  currentItemId.value = id
  currentAction.value = action
  commentText.value = ''
  batchMode.value = false
  commentDialogVisible.value = true
}

async function confirmAction() {
  try {
    if (batchMode.value) {
      const result = await apiClient.post('/approvals/batch', {
        ids: selectedApprovalIds.value,
        action: currentAction.value,
        comment: commentText.value || undefined,
      })
      ElMessage.success(result.data.message || '批量处理完成')
      selectedApprovalIds.value = []
    } else {
      const endpoint = currentAction.value === 'approve' ? 'approve' : 'reject'
      await apiClient.post(`/approvals/${currentItemId.value}/${endpoint}`, { comment: commentText.value || undefined })
      ElMessage.success(currentAction.value === 'approve' ? '已批准' : '已驳回')
    }
    commentDialogVisible.value = false
    detailDialogVisible.value = false
    await loadPending()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '操作失败')
  }
}

function toggleSelectAll(value: boolean) {
  selectedApprovalIds.value = value ? pendingItems.value.map((item) => item.id) : []
}

function openBatchAction(action: 'approve' | 'reject') {
  if (selectedApprovalIds.value.length === 0) {
    ElMessage.warning('请先选择需要处理的审批事项')
    return
  }
  currentItemId.value = ''
  currentAction.value = action
  commentText.value = ''
  batchMode.value = true
  commentDialogVisible.value = true
}

function openDetail(item: any) {
  detailItem.value = item
  detailDialogVisible.value = true
}

function goToProject(item: any) {
  const projectId = item.project?.id || item.task?.projectId || item.requestId
  if (!projectId) return
  router.push(`/projects/${projectId}`)
}

function requestTypeLabel(type: string) {
  const labels: Record<string, string> = {
    contract: '合同',
    procurement: '采购',
    project_completion: '项目完成',
    task_completion: '任务完成',
    asset_item: '物资品项',
    asset_supplier: '供应商资料',
    asset_purchase_request: '资产采购',
    asset_receiving: '收货入库',
  }
  return labels[type] || '审批'
}

function priorityLabel(priority?: string) {
  const labels: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急',
  }
  return labels[priority || ''] || priority || '-'
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    todo: '待办',
    in_progress: '进行中',
    review: '待审批',
    done: '已完成',
    pending_completion_approval: '完成审批中',
  }
  return labels[status || ''] || status || '-'
}

function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function displayFileName(name: string) {
  try {
    const bytes = new Uint8Array(Array.from(name).map((char) => char.charCodeAt(0) & 0xff))
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    const originalCjk = (name.match(/[\u4e00-\u9fa5]/g) || []).length
    const decodedCjk = (decoded.match(/[\u4e00-\u9fa5]/g) || []).length
    return decodedCjk > originalCjk && !decoded.includes('�') ? decoded : name
  } catch {
    return name
  }
}

function formatFileSize(size?: number) {
  if (!size) return '0 KB'
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

async function downloadTaskSupportFile(file: any) {
  try {
    const filename = displayFileName(file.originalName || file.filename || '支持文件')
    const response = await apiClient.get(`/tasks/files/${file.id}/download`, { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '下载支持文件失败')
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function riskText(item: any) {
  if (item.requestType !== 'contract') return ''
  const parts = []
  if (typeof item.riskScore === 'number') parts.push(`AI风险 ${item.riskScore}分`)
  if (typeof item.criticalIssueCount === 'number') parts.push(`严重问题 ${item.criticalIssueCount}项`)
  return parts.join(' · ')
}

function parseAuditSnapshot(item: any) {
  if (!item.auditSnapshot) return null
  if (typeof item.auditSnapshot === 'object') return item.auditSnapshot
  try {
    return JSON.parse(item.auditSnapshot)
  } catch {
    return null
  }
}

async function openContractFile(item: any) {
  const filePath = item.contract?.filePath
  if (!filePath) {
    ElMessage.info('该审批未关联合同文件')
    return
  }
  try {
    const safePath = String(filePath).split('/').map(encodeURIComponent).join('/')
    const response = await apiClient.get(`/upload/file/${safePath}`, { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '打开合同文件失败')
  }
}

function downloadAuditReport(item: any) {
  const snapshot = parseAuditSnapshot(item)
  if (!snapshot) {
    ElMessage.info('该审批未关联 AI 审核报告')
    return
  }

  const suggestions = typeof snapshot.suggestions === 'string'
    ? JSON.parse(snapshot.suggestions || '[]')
    : snapshot.suggestions || []
  const lines = [
    '═══════════════════════════════════════',
    '        AI 合同审核报告',
    '═══════════════════════════════════════',
    '',
    `合同名称：${item.title || '-'}`,
    `提交时间：${formatDate(item.createdAt)}`,
    `风险评分：${snapshot.riskScore ?? '-'}分`,
    `问题数量：${snapshot.issuesCount ?? '-'}个`,
    `严重问题：${snapshot.criticalIssueCount ?? 0}项`,
    '',
    '─────────────────────────────────────',
    '  AI 分析报告',
    '─────────────────────────────────────',
    '',
    snapshot.analysis || '暂无分析报告',
    '',
    '─────────────────────────────────────',
    '  改进建议',
    '─────────────────────────────────────',
    '',
    ...(Array.isArray(suggestions) && suggestions.length ? suggestions.map((s: string, i: number) => `${i + 1}. ${s}`) : ['暂无改进建议']),
    '',
    '═══════════════════════════════════════',
    `报告生成时间：${new Date().toLocaleString('zh-CN')}`,
    '═══════════════════════════════════════',
  ]

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `AI审核报告_${item.title || '合同'}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function openAuditReport(item: any) {
  if (!parseAuditSnapshot(item)) {
    ElMessage.info('该审批未关联 AI 审核报告')
    return
  }
  reportItem.value = item
  reportDialogVisible.value = true
}

function reportMarkdown(item: any) {
  const snapshot = parseAuditSnapshot(item)
  return snapshot?.analysis || '暂无分析报告'
}
</script>

<template>
  <PageTransition>
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ t('approval.pendingApprovals') }}</h1>
          <p class="page-desc">集中处理合同与采购审批事项</p>
        </div>
      </div>

      <div class="tabs">
        <button :class="{ active: activeTab === 'pending' }" @click="switchTab('pending')">
          待审批 ({{ pendingItems.length }})
        </button>
        <button :class="{ active: activeTab === 'history' }" @click="switchTab('history')">
          审批历史
        </button>
      </div>

      <!-- Pending List -->
      <div v-if="activeTab === 'pending'" class="approval-list" v-loading="loading">
        <div v-if="pendingItems.length" class="batch-toolbar">
          <el-checkbox
            :model-value="allPendingSelected"
            :indeterminate="selectedApprovalIds.length > 0 && !allPendingSelected"
            @change="(value: any) => toggleSelectAll(Boolean(value))"
          >
            全选
          </el-checkbox>
          <span class="batch-count">已选择 {{ selectedApprovalIds.length }} 项</span>
          <div class="batch-actions">
            <el-button size="small" type="success" :disabled="selectedApprovalIds.length === 0" @click="openBatchAction('approve')">
              <Check :size="14" /> 批量通过
            </el-button>
            <el-button size="small" type="danger" :disabled="selectedApprovalIds.length === 0" @click="openBatchAction('reject')">
              <X :size="14" /> 批量驳回
            </el-button>
          </div>
        </div>
        <div
          v-for="item in pendingItems"
          :key="item.id"
          class="approval-card"
          :class="{ selected: selectedApprovalIds.includes(item.id) }"
          role="button"
          tabindex="0"
          @click="openDetail(item)"
          @keydown.enter="openDetail(item)"
        >
          <div class="card-left">
            <el-checkbox
              v-model="selectedApprovalIds"
              :value="item.id"
              class="approval-checkbox"
              @click.stop
            />
            <div class="type-badge" :class="item.requestType">
              {{ requestTypeLabel(item.requestType) }}
            </div>
            <div class="card-info">
              <span class="card-title">{{ item.title }}</span>
              <span class="card-meta">
                {{ item.requester?.name || '-' }} · {{ formatDate(item.createdAt) }}
              </span>
              <span v-if="riskText(item)" class="card-risk">
                {{ riskText(item) }}
              </span>
              <span v-if="item.submitNote" class="card-note">
                提交说明：{{ item.submitNote }}
              </span>
            </div>
          </div>
          <div class="card-actions" @click.stop>
            <el-button
              size="small"
              @click="openDetail(item)"
            >
              <Eye :size="14" /> 查看详情
            </el-button>
            <el-button
              v-if="item.requestType === 'contract'"
              size="small"
              @click="openContractFile(item)"
            >
              <FileText :size="14" /> 合同文件
            </el-button>
            <el-button
              v-if="item.requestType === 'contract'"
              size="small"
              @click="openAuditReport(item)"
            >
              <Download :size="14" /> 审核报告
            </el-button>
            <el-button type="success" size="small" @click="openActionDialog(item.id, 'approve')">
              <Check :size="14" /> {{ t('approval.approve') }}
            </el-button>
            <el-button type="danger" size="small" @click="openActionDialog(item.id, 'reject')">
              <X :size="14" /> {{ t('approval.reject') }}
            </el-button>
          </div>
        </div>
        <el-empty v-if="!loading && pendingItems.length === 0" :description="t('common.noData')" />
      </div>

      <!-- History List -->
      <div v-else class="approval-list" v-loading="loading">
        <div v-for="item in historyItems" :key="item.id" class="approval-card history">
          <div class="card-left">
            <div class="status-icon" :class="item.status">
              <Check v-if="item.status === 'approved'" :size="14" />
              <X v-else :size="14" />
            </div>
            <div class="card-info">
              <span class="card-title">{{ item.contract?.name || item.procurementRequest?.title || '-' }}</span>
              <span class="card-meta">
                {{ item.status === 'approved' ? '已批准' : '已驳回' }}
                · {{ formatDate(item.createdAt) }}
                <span v-if="item.comment"> · 备注: {{ item.comment }}</span>
              </span>
            </div>
          </div>
        </div>
        <el-empty v-if="!loading && historyItems.length === 0" :description="t('common.noData')" />
      </div>

      <!-- Comment Dialog -->
      <el-dialog
        v-model="commentDialogVisible"
        :title="batchMode ? (currentAction === 'approve' ? '批量通过' : '批量驳回') : (currentAction === 'approve' ? t('approval.approve') : t('approval.reject'))"
        width="400px"
      >
        <p v-if="batchMode" class="batch-dialog-tip">
          将处理 {{ selectedApprovalIds.length }} 项待审批事项。
        </p>
        <el-input
          v-model="commentText"
          type="textarea"
          :rows="3"
          :placeholder="t('approval.comment')"
        />
        <template #footer>
          <el-button @click="commentDialogVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button
            :type="currentAction === 'approve' ? 'success' : 'danger'"
            @click="confirmAction"
          >
            {{ currentAction === 'approve' ? t('approval.approve') : t('approval.reject') }}
          </el-button>
        </template>
      </el-dialog>

      <el-dialog
        v-model="reportDialogVisible"
        title="AI 审核报告"
        width="760px"
      >
        <div v-if="reportItem" class="report-panel">
          <div class="report-summary">
            <strong>{{ reportItem.title }}</strong>
            <span>{{ riskText(reportItem) || '暂无风险摘要' }}</span>
          </div>
          <pre class="report-content">{{ reportMarkdown(reportItem) }}</pre>
        </div>
        <template #footer>
          <el-button @click="reportDialogVisible = false">关闭</el-button>
          <el-button v-if="reportItem" type="primary" @click="downloadAuditReport(reportItem)">
            下载 TXT 报告
          </el-button>
        </template>
      </el-dialog>

      <el-dialog
        v-model="detailDialogVisible"
        title="审批详情"
        width="820px"
        class="approval-detail-dialog"
      >
        <div v-if="detailItem" class="detail-panel">
          <div class="detail-header">
            <div>
              <el-tag size="small" round>{{ requestTypeLabel(detailItem.requestType) }}</el-tag>
              <h3>{{ detailItem.title }}</h3>
              <p>{{ detailItem.requester?.name || '-' }} · {{ formatDate(detailItem.createdAt) }}</p>
            </div>
            <el-button
              v-if="detailItem.requestType === 'task_completion' && detailItem.project?.id"
              @click="goToProject(detailItem)"
            >
              <FolderKanban :size="14" /> 打开项目
            </el-button>
          </div>

          <template v-if="detailItem.requestType === 'task_completion' && detailItem.task">
            <div class="detail-grid">
              <div>
                <span>所属项目</span>
                <strong>{{ detailItem.project?.name || '-' }}</strong>
              </div>
              <div>
                <span>任务负责人</span>
                <strong>{{ detailItem.task.assignee?.name || detailItem.requester?.name || '-' }}</strong>
              </div>
              <div>
                <span>当前状态</span>
                <strong>{{ statusLabel(detailItem.task.status) }}</strong>
              </div>
              <div>
                <span>优先级</span>
                <strong>{{ priorityLabel(detailItem.task.priority) }}</strong>
              </div>
              <div>
                <span>开始日期</span>
                <strong>{{ formatShortDate(detailItem.task.startDate) }}</strong>
              </div>
              <div>
                <span>截止日期</span>
                <strong>{{ formatShortDate(detailItem.task.dueDate) }}</strong>
              </div>
              <div>
                <span>任务进度</span>
                <strong>{{ detailItem.task.progress ?? 0 }}%</strong>
              </div>
              <div>
                <span>提交时间</span>
                <strong>{{ formatShortDate(detailItem.task.completionSubmittedAt || detailItem.createdAt) }}</strong>
              </div>
            </div>

            <div class="detail-section">
              <h4>任务说明</h4>
              <p>{{ detailItem.task.description || '暂无任务说明' }}</p>
            </div>

            <div class="detail-section">
              <h4>完成提交说明</h4>
              <p>{{ detailItem.submitNote || detailItem.task.completionNote || '暂无提交说明' }}</p>
            </div>

            <div class="detail-section">
              <h4>支持文件</h4>
              <div v-if="detailItem.task.files?.length" class="support-file-list">
                <button
                  v-for="file in detailItem.task.files"
                  :key="file.id"
                  type="button"
                  class="support-file-item"
                  @click="downloadTaskSupportFile(file)"
                >
                  <Paperclip :size="16" />
                  <span>{{ displayFileName(file.originalName || file.filename) }}</span>
                  <small>{{ formatFileSize(file.size) }} · {{ file.uploader?.name || '上传人未知' }}</small>
                </button>
              </div>
              <el-empty v-else description="暂无支持文件" />
            </div>
          </template>

          <template v-else>
            <div v-if="detailItem.assetChange" class="detail-section">
              <h4>变更内容</h4>
              <div class="asset-change-grid">
                <div v-for="(value, key) in detailItem.assetChange.payload" :key="key">
                  <span>{{ key }}</span>
                  <strong>{{ value || '-' }}</strong>
                </div>
              </div>
            </div>
            <div class="detail-section">
              <h4>提交说明</h4>
              <p>{{ detailItem.submitNote || '暂无提交说明' }}</p>
            </div>
          </template>
        </div>
        <template #footer>
          <el-button @click="detailDialogVisible = false">关闭</el-button>
          <el-button
            v-if="detailItem"
            type="success"
            @click="openActionDialog(detailItem.id, 'approve')"
          >
            <Check :size="14" /> {{ t('approval.approve') }}
          </el-button>
          <el-button
            v-if="detailItem"
            type="danger"
            @click="openActionDialog(detailItem.id, 'reject')"
          >
            <X :size="14" /> {{ t('approval.reject') }}
          </el-button>
        </template>
      </el-dialog>
    </div>
  </PageTransition>
</template>

<style scoped>
.page { padding: 0; }
.page-header { margin-bottom: 20px; }
.tabs {
  display: flex; gap: 4px; margin-bottom: 16px;
  background: var(--bg-secondary, #f3f4f6);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px; padding: 4px; width: fit-content;
}
.tabs button {
  padding: 6px 16px; border: none; border-radius: 6px;
  background: transparent; font-size: 13px; cursor: pointer;
  color: var(--text-secondary, #6b7280);
  transition: background 0.2s ease, color 0.2s ease;
}
.tabs button.active { background: white; color: var(--text-primary); font-weight: 500; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.approval-list { display: flex; flex-direction: column; gap: 10px; }
.batch-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  background: var(--bg-card, #fff);
}
.batch-count {
  color: var(--text-secondary, #6b7280);
  font-size: 13px;
}
.batch-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
.batch-dialog-tip {
  margin: 0 0 10px;
  color: var(--text-secondary, #6b7280);
  font-size: 13px;
}
.approval-card {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px;
  padding: 16px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: var(--radius-card);
}
.approval-card.selected {
  border-color: rgba(0, 122, 255, 0.45);
  background: rgba(0, 122, 255, 0.04);
}
.approval-checkbox {
  flex-shrink: 0;
}
.approval-card.history { opacity: 0.8; }
.card-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.type-badge {
  padding: 4px 8px; border-radius: 6px;
  font-size: 11px; font-weight: 600;
  flex-shrink: 0;
}
.type-badge.contract { background: rgba(0,122,255,0.1); color: #007aff; }
.type-badge.procurement { background: rgba(255,149,0,0.1); color: #ff9500; }
.type-badge.project_completion { background: rgba(52,199,89,0.12); color: #15803d; }
.type-badge.task_completion { background: rgba(124,58,237,0.12); color: #6d28d9; }
.type-badge.asset_item,
.type-badge.asset_supplier { background: rgba(20, 184, 166, 0.12); color: #0f766e; }
.status-icon {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.status-icon.approved { background: rgba(52,199,89,0.1); color: #34c759; }
.status-icon.rejected { background: rgba(255,59,48,0.1); color: #ff3b30; }
.card-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.card-title { font-size: 14px; font-weight: 500; color: var(--text-primary, #111); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-meta { font-size: 12px; color: var(--text-tertiary, #9ca3af); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-risk {
  width: fit-content;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(217, 119, 6, 0.1);
  color: #b45309;
  font-size: 12px;
  font-weight: 500;
}
.card-note {
  max-width: 520px;
  overflow: hidden;
  color: var(--text-secondary, #6b7280);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-actions { display: flex; gap: 6px; flex-shrink: 0; }
.approval-card[role="button"] {
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}
.approval-card[role="button"]:hover,
.approval-card[role="button"]:focus-visible {
  border-color: rgba(0, 122, 255, 0.35);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
  outline: none;
}
.report-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.report-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  background: var(--bg-secondary, #f8fafc);
}
.report-summary span {
  color: var(--text-secondary, #6b7280);
  font-size: 13px;
}
.report-content {
  max-height: 58vh;
  overflow: auto;
  margin: 0;
  padding: 14px;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  background: #fff;
  color: var(--text-primary, #111);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}
.detail-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}
.detail-header h3 {
  margin: 8px 0 4px;
  color: var(--text-primary, #111827);
  font-size: 18px;
}
.detail-header p {
  margin: 0;
  color: var(--text-tertiary, #9ca3af);
  font-size: 13px;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.detail-grid div {
  min-height: 72px;
  padding: 12px;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  background: var(--bg-secondary, #f8fafc);
}
.detail-grid span {
  display: block;
  margin-bottom: 8px;
  color: var(--text-tertiary, #9ca3af);
  font-size: 12px;
}
.detail-grid strong {
  color: var(--text-primary, #111827);
  font-size: 14px;
}
.detail-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.detail-section h4 {
  margin: 0;
  color: var(--text-primary, #111827);
  font-size: 14px;
}
.detail-section p {
  margin: 0;
  padding: 12px;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  background: #fff;
  color: var(--text-secondary, #4b5563);
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}
.support-file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.support-file-item {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  background: #fff;
  color: var(--text-primary, #111827);
  cursor: pointer;
  text-align: left;
}
.support-file-item:hover {
  border-color: rgba(0, 122, 255, 0.35);
  background: rgba(0, 122, 255, 0.04);
}
.support-file-item span {
  overflow: hidden;
  font-size: 13px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.support-file-item small {
  color: var(--text-tertiary, #9ca3af);
  font-size: 12px;
}
.asset-change-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.asset-change-grid div {
  padding: 10px;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  background: #fff;
}
.asset-change-grid span {
  display: block;
  color: var(--text-tertiary, #9ca3af);
  font-size: 12px;
}
.asset-change-grid strong {
  display: block;
  margin-top: 4px;
  overflow-wrap: anywhere;
  color: var(--text-primary, #111827);
  font-size: 13px;
}

@media (max-width: 768px) {
  .approval-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .card-actions {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .support-file-item {
    grid-template-columns: 20px minmax(0, 1fr);
  }

  .support-file-item small {
    grid-column: 2;
  }

  .asset-change-grid {
    grid-template-columns: 1fr;
  }
}
</style>
