<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  ElTable, ElTableColumn, ElButton, ElDrawer, ElTag,
  ElDescriptions, ElDescriptionsItem, ElMessage, ElDialog,
  ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElUpload,
  ElDatePicker, ElInputNumber,
} from 'element-plus'
import { Sparkles, Upload, FileText, X, Download, FileSpreadsheet } from 'lucide-vue-next'
import PageTransition from '@/components/common/PageTransition.vue'
import { fetchAuditRecords, analyzeContract as apiAnalyzeContract } from '@/api/audit'
import { createContract } from '@/api/contracts'
import { uploadFile } from '@/api/upload'
import { fetchTemplates } from '@/api/templates'
import type { AuditRecord } from '@/api/audit'

const records = ref<AuditRecord[]>([])
const loading = ref(false)
const analyzing = ref(false)
const selectedRecord = ref<AuditRecord | null>(null)
const drawerVisible = ref(false)
const total = ref(0)
const page = ref(1)

// File types from audit config
interface FileTypeOption {
  label: string
  value: string
}
const fileTypes = ref<FileTypeOption[]>([])

// Upload & analyze dialog
const dialogVisible = ref(false)
const uploadFileRef = ref<File | null>(null)
const uploading = ref(false)
const form = ref({
  name: '',
  partyA: '',
  partyB: '',
  type: '',
  amount: 0,
  startDate: '',
  endDate: '',
})

onMounted(async () => {
  loadRecords()
  loadFileTypes()
})

async function loadFileTypes() {
  try {
    const templates = await fetchTemplates()
    fileTypes.value = templates.map((t) => ({ label: t.name, value: t.contract_type }))
  } catch {
    // Fallback to default types
    fileTypes.value = [
      { label: '采购合同审核规则', value: '采购' },
      { label: '服务合同审核规则', value: '服务' },
      { label: '租赁合同审核规则', value: '租赁' },
      { label: '营销合同审核规则', value: '营销' },
      { label: '技术合同审核规则', value: '技术' },
      { label: '咨询合同审核规则', value: '咨询' },
      { label: '人力资源合同审核规则', value: '人力资源' },
      { label: '物流合同审核规则', value: '物流' },
    ]
  }
}

async function loadRecords() {
  loading.value = true
  try {
    const result = await fetchAuditRecords({ page: page.value, pageSize: 20 })
    records.value = result.items
    total.value = result.total
  } catch (error) {
    console.error('Failed to load audit records:', error)
  } finally {
    loading.value = false
  }
}

function openUploadDialog() {
  uploadFileRef.value = null
  form.value = { name: '', partyA: '', partyB: '', type: '', amount: 0, startDate: '', endDate: '' }
  dialogVisible.value = true
}

async function handleUploadAndAnalyze() {
  if (!uploadFileRef.value) {
    ElMessage.warning('请先选择要上传的合同文件')
    return
  }
  if (!form.value.type) {
    ElMessage.warning('请选择文件类型')
    return
  }

  analyzing.value = true
  uploading.value = true
  const fileName = uploadFileRef.value.name.replace(/\.[^/.]+$/, '')

  try {
    // 1. Create contract as audit draft (won't appear in contract list)
    const contract = await createContract({
      name: fileName,
      partyA: '待提取',
      partyB: '待提取',
      type: form.value.type,
      status: 'draft',
      amount: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      riskLevel: 'low',
      isAuditDraft: true,
    })

    // 2. Upload file and associate with contract
    await uploadFile(uploadFileRef.value, contract.id)

    // 3. Trigger AI analysis (will extract contract info + generate summary + analyze)
    ElMessage.info('正在调用 AI 进行合同审核...')
    const result = await apiAnalyzeContract(contract.id)
    ElMessage.success(`"${fileName}" 审核完成！`)

    dialogVisible.value = false
    await loadRecords()

    // Auto-open detail drawer
    selectedRecord.value = result as unknown as AuditRecord
    drawerVisible.value = true
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '操作失败')
  } finally {
    analyzing.value = false
    uploading.value = false
  }
}

async function triggerAnalysis() {
  analyzing.value = true
  try {
    const contracts = await (await import('@/api/contracts')).fetchContracts({ page: 1, pageSize: 100 })
    const unaudited = contracts.items.filter(
      (c) => !records.value.some((r) => r.contract_id === c.id)
    )

    if (unaudited.length === 0) {
      ElMessage.info('所有合同均已审核')
      return
    }

    const result = await apiAnalyzeContract(unaudited[0].id)
    ElMessage.success(`"${unaudited[0].name}" 审核完成`)
    await loadRecords()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || 'AI分析失败')
  } finally {
    analyzing.value = false
  }
}

function viewDetail(record: AuditRecord) {
  selectedRecord.value = record
  drawerVisible.value = true
}

function downloadTxtReport(record: AuditRecord) {
  const suggestions = typeof record.suggestions === 'string'
    ? JSON.parse(record.suggestions)
    : record.suggestions

  const lines = [
    '═══════════════════════════════════════',
    '        AI 合同审核报告',
    '═══════════════════════════════════════',
    '',
    `合同名称：${record.contract_name || '-'}`,
    `审核日期：${record.created_at || '-'}`,
    '',
    '─────────────────────────────────────',
    '  审核结果',
    '─────────────────────────────────────',
    '',
    `风险评分：${record.risk_score}分`,
    `发现问题：${record.issues_count}个`,
    `审核状态：${getStatusTag(record.status).label}`,
    '',
    '─────────────────────────────────────',
    '  AI 分析报告',
    '─────────────────────────────────────',
    '',
    record.analysis || '暂无分析报告',
    '',
    '─────────────────────────────────────',
    '  改进建议',
    '─────────────────────────────────────',
    '',
  ]

  if (Array.isArray(suggestions) && suggestions.length > 0) {
    suggestions.forEach((s: string, i: number) => {
      lines.push(`${i + 1}. ${s}`)
    })
  } else {
    lines.push('暂无改进建议')
  }

  lines.push('')
  lines.push('═══════════════════════════════════════')
  lines.push(`报告生成时间：${new Date().toLocaleString('zh-CN')}`)
  lines.push('═══════════════════════════════════════')

  const content = lines.join('\n')
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `审核报告_${record.contract_name || '合同'}_${record.created_at?.slice(0, 10) || '未知'}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function downloadSummary(record: any) {
  const summary = record.summary || '暂无文件概况'

  const lines = [
    '═══════════════════════════════════════',
    '        合同文件概况',
    '═══════════════════════════════════════',
    '',
    `合同名称：${record.contract_name || '-'}`,
    `审核日期：${record.created_at || '-'}`,
    '',
    '─────────────────────────────────────',
    '  文件概况',
    '─────────────────────────────────────',
    '',
    summary,
    '',
    '═══════════════════════════════════════',
    `报告生成时间：${new Date().toLocaleString('zh-CN')}`,
    '═══════════════════════════════════════',
  ]

  const content = lines.join('\n')
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `文件概况_${record.contract_name || '合同'}_${record.created_at?.slice(0, 10) || '未知'}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function getScoreColor(score: number) {
  if (score >= 70) return '#34c759'
  if (score >= 50) return '#ff9500'
  return '#ff3b30'
}

function getStatusTag(status: string) {
  const map: Record<string, { label: string; type: 'success' | 'warning' | 'danger' | 'info' }> = {
    pass: { label: '通过', type: 'success' },
    warning: { label: '警告', type: 'warning' },
    fail: { label: '未通过', type: 'danger' },
    pending: { label: '待审核', type: 'info' },
  }
  return map[status] || { label: status, type: 'info' }
}

const summaryStats = computed(() => {
  const passed = records.value.filter((r) => r.status === 'pass').length
  const failed = records.value.filter((r) => r.status === 'fail').length
  const pending = records.value.filter((r) => r.status === 'pending').length
  const totalIssues = records.value.reduce((sum, r) => sum + r.issues_count, 0)
  const avgScore = records.value.length
    ? Math.round(records.value.reduce((sum, r) => sum + r.risk_score, 0) / records.value.length)
    : 0
  const passRate = records.value.length
    ? Math.round((passed / records.value.length) * 100)
    : 0

  return { totalAudited: records.value.length, issuesFound: totalIssues, passRate, avgScore, passed, failed, pending }
})

function onFileChange(file: File) {
  uploadFileRef.value = file
  return false // prevent auto upload
}

function triggerFileInput() {
  const el = document.getElementById('audit-file-input') as HTMLInputElement
  el?.click()
}

function removeFile() {
  uploadFileRef.value = null
}
</script>

<template>
  <PageTransition>
    <div class="audit-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">AI审核</h1>
          <p class="page-desc">上传合同文件，AI 智能审核与风险分析</p>
        </div>
        <div class="header-actions">
          <el-button size="large" class="action-btn" @click="triggerAnalysis" :loading="analyzing">
            <Sparkles :size="18" />
            <span>审核已有合同</span>
          </el-button>
          <el-button type="primary" size="large" class="action-btn" @click="openUploadDialog">
            <Upload :size="18" />
            <span>上传并审核</span>
          </el-button>
        </div>
      </div>

      <!-- Quick upload card -->
      <div class="quick-upload glass-card" @click="openUploadDialog">
        <div class="upload-placeholder">
          <Upload :size="32" color="#007aff" />
          <span class="upload-text">点击上传合同文件，AI 自动审核</span>
          <span class="upload-hint">支持 PDF、DOCX、TXT 格式</span>
        </div>
      </div>

      <!-- Summary cards -->
      <div class="summary-grid">
        <div class="summary-card glass-card">
          <div class="summary-icon" style="background: rgba(0,122,255,0.1); color: #007aff">📋</div>
          <div class="summary-info">
            <div class="summary-value">{{ summaryStats.totalAudited }}</div>
            <div class="summary-label">已审核</div>
          </div>
        </div>
        <div class="summary-card glass-card">
          <div class="summary-icon" style="background: rgba(255,59,48,0.1); color: #ff3b30">⚠️</div>
          <div class="summary-info">
            <div class="summary-value">{{ summaryStats.issuesFound }}</div>
            <div class="summary-label">发现问题</div>
          </div>
        </div>
        <div class="summary-card glass-card">
          <div class="summary-icon" style="background: rgba(52,199,89,0.1); color: #34c759">✅</div>
          <div class="summary-info">
            <div class="summary-value">{{ summaryStats.passRate }}%</div>
            <div class="summary-label">通过率</div>
          </div>
        </div>
        <div class="summary-card glass-card">
          <div class="summary-icon" style="background: rgba(175,82,222,0.1); color: #af52de">📊</div>
          <div class="summary-info">
            <div class="summary-value">{{ summaryStats.avgScore }}</div>
            <div class="summary-label">平均风险分</div>
          </div>
        </div>
      </div>

      <!-- Audit table -->
      <div class="table-container glass-card">
        <el-table
          :data="records"
          v-loading="loading"
          border
          style="width: 100%"
        >
          <el-table-column prop="contract_name" label="合同名称" min-width="180" />
          <el-table-column prop="created_at" label="审核日期" width="120" />
          <el-table-column label="风险评分" width="120">
            <template #default="{ row }">
              <span class="score-cell" :style="{ color: getScoreColor(row.risk_score) }">
                {{ row.risk_score }}分
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="issues_count" label="问题数" width="80" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusTag(row.status).type" size="small" round>
                {{ getStatusTag(row.status).label }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="240" fixed="right">
            <template #default="{ row }">
              <el-button text size="small" type="primary" @click="viewDetail(row as unknown as AuditRecord)">
                查看详情
              </el-button>
              <el-button text size="small" type="success" @click="downloadTxtReport(row as unknown as AuditRecord)">
                .txt
              </el-button>
              <el-button v-if="(row as any).summary" text size="small" type="warning" @click="downloadSummary(row as any)">
                文件概况
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- Upload & Analyze Dialog -->
      <el-dialog
        v-model="dialogVisible"
        title="上传合同并 AI 审核"
        width="640px"
        :close-on-click-modal="false"
      >
        <div class="upload-area" @dragover.prevent @drop.prevent="onFileChange($event.dataTransfer?.files[0] as File)">
          <div v-if="!uploadFileRef" class="drop-zone" @click="triggerFileInput">
            <Upload :size="36" color="#007aff" />
            <span class="drop-text">拖拽文件到此处，或点击选择文件</span>
            <span class="drop-hint">支持 PDF、DOCX、TXT（最大 20MB）</span>
          </div>
          <div v-else class="file-preview">
            <FileText :size="24" color="#007aff" />
            <div class="file-info">
              <span class="file-name">{{ uploadFileRef.name }}</span>
              <span class="file-size">{{ (uploadFileRef.size / 1024 / 1024).toFixed(1) }} MB</span>
            </div>
            <el-button text type="danger" @click="removeFile">
              <X :size="16" />
            </el-button>
          </div>
          <input
            id="audit-file-input"
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            style="display:none"
            @change="onFileChange(($event.target as HTMLInputElement).files?.[0] as File)"
          />
        </div>

        <el-form label-position="top" size="large" class="audit-form">
          <div class="form-row">
            <el-form-item label="文件类型" required>
              <el-select v-model="form.type" placeholder="选择文件类型" style="width:100%">
                <el-option
                  v-for="opt in fileTypes"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </div>
          <div class="form-hint">
            <Sparkles :size="14" color="#af52de" />
            <span>AI 将自动从合同文件中提取合同名称、双方主体、金额、期限等信息</span>
          </div>
        </el-form>

        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="analyzing"
            @click="handleUploadAndAnalyze"
            class="analyze-submit-btn"
          >
            <Sparkles :size="16" />
            <span>{{ analyzing ? 'AI 审核中...' : '提交 AI 审核' }}</span>
          </el-button>
        </template>
      </el-dialog>

      <!-- Detail drawer -->
      <el-drawer
        v-model="drawerVisible"
        title="审核详情"
        size="500px"
      >
        <template v-if="selectedRecord">
          <div class="drawer-section">
            <h4 class="drawer-title">合同信息</h4>
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="合同名称">{{ selectedRecord.contract_name }}</el-descriptions-item>
              <el-descriptions-item label="审核日期">{{ selectedRecord.created_at }}</el-descriptions-item>
              <el-descriptions-item label="风险评分">
                <span :style="{ color: getScoreColor(selectedRecord.risk_score), fontWeight: 600 }">
                  {{ selectedRecord.risk_score }}分
                </span>
              </el-descriptions-item>
              <el-descriptions-item label="发现问题">{{ selectedRecord.issues_count }}个</el-descriptions-item>
              <el-descriptions-item label="审核状态">
                <el-tag :type="getStatusTag(selectedRecord.status).type" size="small" round>
                  {{ getStatusTag(selectedRecord.status).label }}
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="drawer-section">
            <h4 class="drawer-title">AI分析结果</h4>
            <p class="analysis-text">{{ selectedRecord.analysis }}</p>
          </div>

          <div class="drawer-section">
            <h4 class="drawer-title">改进建议</h4>
            <ul class="suggestion-list">
              <li
                v-for="(s, i) in (typeof selectedRecord.suggestions === 'string' ? JSON.parse(selectedRecord.suggestions) : selectedRecord.suggestions)"
                :key="i"
                class="suggestion-item"
              >
                {{ s }}
              </li>
            </ul>
          </div>
        </template>
      </el-drawer>
    </div>
  </PageTransition>
</template>

<style scoped>
.audit-page {
  width: 100%;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
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

.header-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  border-radius: var(--radius-button) !important;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Quick upload card */
.quick-upload {
  padding: 32px;
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  border: 2px dashed rgba(0, 122, 255, 0.2);
}

.quick-upload:hover {
  border-color: var(--apple-blue);
  background: rgba(0, 122, 255, 0.03);
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.upload-hint {
  font-size: 12px;
  color: var(--text-secondary);
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
  font-size: 20px;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.summary-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* Table */
.table-container {
  padding: 0;
  overflow: hidden;
}

.score-cell {
  font-weight: 600;
}

/* Upload dialog */
.upload-area {
  margin-bottom: 20px;
}

.drop-zone {
  border: 2px dashed rgba(0, 122, 255, 0.25);
  border-radius: 16px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(0, 122, 255, 0.02);
}

.drop-zone:hover {
  border-color: var(--apple-blue);
  background: rgba(0, 122, 255, 0.05);
}

.drop-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.drop-hint {
  font-size: 12px;
  color: var(--text-secondary);
}

.file-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(0, 122, 255, 0.05);
  border: 1px solid rgba(0, 122, 255, 0.15);
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.file-size {
  font-size: 12px;
  color: var(--text-secondary);
}

.audit-form {
  margin-top: 8px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .el-form-item {
  flex: 1;
}

.analyze-submit-btn {
  display: flex;
  align-items: center;
  gap: 6px;
}

.form-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(175, 82, 222, 0.06);
  border-radius: 10px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* Drawer */
.drawer-section {
  margin-bottom: 24px;
}

.drawer-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px;
}

.analysis-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0;
}

.suggestion-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.suggestion-item {
  padding: 10px 12px;
  margin-bottom: 8px;
  background: rgba(0, 122, 255, 0.05);
  border-radius: 10px;
  font-size: 13px;
  color: var(--text-primary);
  border-left: 3px solid var(--apple-blue);
}

/* Responsive */
@media (max-width: 1024px) {
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .header-actions {
    flex-direction: column;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>
