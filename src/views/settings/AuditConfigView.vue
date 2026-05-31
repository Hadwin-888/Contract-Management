<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  ElButton, ElDialog, ElForm, ElFormItem, ElInput, ElTabs, ElTabPane,
  ElMessage, ElPopconfirm, ElTag,
} from 'element-plus'
import { Plus, Edit, Trash2, FileText, Sparkles, FileSpreadsheet } from 'lucide-vue-next'
import { fetchTemplates, createTemplate, updateTemplate, deleteTemplate } from '@/api/templates'
import type { AuditTemplate } from '@/api/templates'

const CONTRACT_TYPES = ['采购', '服务', '租赁', '营销', '技术', '咨询', '人力资源', '物流']

interface TemplateEntry {
  contractType: string
  template: AuditTemplate | null
}

const loading = ref(false)
const entries = ref<TemplateEntry[]>([])

// Create/Edit dialog
const dialogVisible = ref(false)
const dialogTitle = ref('')
const editingType = ref('')
const activeTab = ref('audit-rule')
const form = ref({
  name: '',
  content: '',
  summaryContent: '',
})

// New type dialog
const newTypeDialogVisible = ref(false)
const newTypeForm = ref({
  contractType: '',
})

// Preview dialog
const previewVisible = ref(false)
const previewContent = ref('')
const previewTitle = ref('')

onMounted(() => {
  loadTemplates()
})

async function loadTemplates() {
  loading.value = true
  try {
    const templates = await fetchTemplates()
    // Only show types that have a configured template
    entries.value = templates.map((t) => ({
      contractType: t.contract_type,
      template: t,
    }))
  } catch (error) {
    console.error('Failed to load templates:', error)
    entries.value = []
  } finally {
    loading.value = false
  }
}

function openCreate(contractType: string) {
  editingType.value = contractType
  activeTab.value = 'audit-rule'
  dialogTitle.value = `新建审核规则 — ${contractType}`
  form.value = {
    name: `${contractType}合同审核规则`,
    content: `# ${contractType}合同审核规则\n\n## 1. 基本条款审核\n\n## 2. 风险点检查\n\n## 3. 合规性审查\n\n## 4. 改进建议`,
    summaryContent: `# ${contractType}合同文件概况规则\n\n## 1. 基本信息\n- 提取合同名称、双方主体信息\n- 合同类型和编号\n\n## 2. 核心条款\n- 合同金额及支付方式\n- 合同期限和生效条件\n- 主要权利义务\n\n## 3. 风险提示\n- 关键风险点\n- 需要关注的事项`,
  }
  dialogVisible.value = true
}

function openCreateNewType() {
  newTypeForm.value = { contractType: '' }
  newTypeDialogVisible.value = true
}

function handleNewTypeSubmit() {
  const type = newTypeForm.value.contractType.trim()
  if (!type) {
    ElMessage.warning('请输入合同类型名称')
    return
  }
  if (entries.value.some((e) => e.contractType === type)) {
    ElMessage.warning('该合同类型已存在')
    return
  }
  newTypeDialogVisible.value = false
  openCreate(type)
}

function openEdit(entry: TemplateEntry) {
  if (!entry.template) return
  editingType.value = entry.contractType
  activeTab.value = 'audit-rule'
  dialogTitle.value = `编辑审核规则 — ${entry.contractType}`
  form.value = {
    name: entry.template.name,
    content: entry.template.content,
    summaryContent: entry.template.summary_content || '',
  }
  dialogVisible.value = true
}

function openPreview(content: string, title: string) {
  previewContent.value = content
  previewTitle.value = title
  previewVisible.value = true
}

async function handleSave() {
  if (!form.value.name || !form.value.content) {
    ElMessage.warning('请填写模板名称和审核规则内容')
    return
  }

  try {
    const existing = entries.value.find((e) => e.contractType === editingType.value)?.template
    if (existing) {
      await updateTemplate(editingType.value, {
        name: form.value.name,
        content: form.value.content,
        summaryContent: form.value.summaryContent,
      })
      ElMessage.success('审核规则已更新')
    } else {
      await createTemplate({
        contractType: editingType.value,
        name: form.value.name,
        content: form.value.content,
        summaryContent: form.value.summaryContent,
      })
      ElMessage.success('审核规则已创建')
    }
    dialogVisible.value = false
    loadTemplates()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '保存失败')
  }
}

async function handleDelete(contractType: string) {
  try {
    await deleteTemplate(contractType)
    ElMessage.success('审核规则已删除')
    // Remove the entry from local list immediately
    entries.value = entries.value.filter((e) => e.contractType !== contractType)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '删除失败')
  }
}

const templateCount = computed(() => entries.value.length)

function renderMarkdown(md: string): string {
  // Simple MD to HTML conversion
  return md
    .split('\n')
    .map((line) => {
      if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`
      if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`
      if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`
      if (line.startsWith('- ')) return `<li>${line.slice(2)}</li>`
      if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ') ||
          line.startsWith('4. ') || line.startsWith('5. ')) {
        return `<li>${line.slice(3)}</li>`
      }
      if (line.trim() === '') return '<br/>'
      return `<p>${line}</p>`
    })
    .join('\n')
}
</script>

<template>
  <div class="audit-config">
    <div class="page-header">
      <div>
        <h1 class="page-title">审核配置</h1>
        <p class="page-desc">
          为各类型合同设置 AI 审核规则和文件概况规则（Markdown 格式）
          <span v-if="entries.length > 0" class="template-badge">已配置 {{ entries.length }} 个类型</span>
        </p>
      </div>
      <el-button type="primary" size="large" class="add-btn" @click="openCreateNewType">
        <Plus :size="18" />
        <span>新增类型</span>
      </el-button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
    </div>

    <!-- Template list -->
    <div v-else class="template-grid">
      <div
        v-for="entry in entries"
        :key="entry.contractType"
        class="template-card glass-card has-template"
      >
        <div class="card-header">
          <div class="card-type-icon">
            <FileText :size="20" />
          </div>
          <div class="card-info">
            <span class="card-type">{{ entry.template!.name }}</span>
            <span class="card-status">
              <span class="status-dot configured"></span>
              已配置 (v{{ entry.template!.version }})
            </span>
            <span v-if="entry.template!.summary_content" class="card-summary-badge">
              <FileSpreadsheet :size="11" /> 已配置概况
            </span>
          </div>
        </div>

        <div class="card-actions">
          <el-button text size="small" type="primary" @click="openPreview(entry.template!.content, entry.template!.name)">
            <Sparkles :size="14" /> 预览
          </el-button>
          <el-button text size="small" type="primary" @click="openEdit(entry)">
            <Edit :size="14" /> 编辑
          </el-button>
          <el-popconfirm
            title="确定删除此审核规则？"
            confirm-button-text="删除"
            cancel-button-text="取消"
            @confirm="handleDelete(entry.contractType)"
          >
            <template #reference>
              <el-button text size="small" type="danger">
                <Trash2 :size="14" /> 删除
              </el-button>
            </template>
          </el-popconfirm>
        </div>
      </div>
    </div>

    <!-- Info card -->
    <div class="info-card glass-card">
      <div class="info-header">
        <Sparkles :size="20" color="#007aff" />
        <span class="info-title">AI 审核规则说明</span>
      </div>
      <ul class="info-list">
        <li>每个合同类型可以配置独立的 Markdown 审核规则和文件概况规则</li>
        <li>AI 审核时，系统会根据合同类型自动加载对应的审核规则和概况规则</li>
        <li>审核规则用于风险分析和评分，概况规则用于生成文件概况</li>
        <li>更新规则后，新的 AI 审核将使用最新版本</li>
      </ul>
    </div>

    <!-- Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form label-position="top" size="large">
        <el-form-item label="规则名称">
          <el-input v-model="form.name" placeholder="审核规则名称" />
        </el-form-item>

        <el-tabs v-model="activeTab" class="rule-tabs">
          <el-tab-pane label="审核规则" name="audit-rule">
            <el-form-item label="Markdown 内容">
              <div class="editor-hint">
                使用 Markdown 格式编写审核规则，AI 将根据这些规则对合同进行分析
              </div>
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="14"
                placeholder="输入 Markdown 格式的审核规则..."
                class="md-editor"
              />
            </el-form-item>
            <el-form-item label="预览">
              <div class="md-preview" v-html="renderMarkdown(form.content)"></div>
            </el-form-item>
          </el-tab-pane>

          <el-tab-pane label="文件概况规则" name="summary-rule">
            <el-form-item label="Markdown 内容">
              <div class="editor-hint">
                使用 Markdown 格式编写文件概况规则，AI 将根据这些规则生成合同文件概况
              </div>
              <el-input
                v-model="form.summaryContent"
                type="textarea"
                :rows="14"
                placeholder="输入 Markdown 格式的文件概况规则..."
                class="md-editor"
              />
            </el-form-item>
            <el-form-item label="预览">
              <div class="md-preview" v-html="renderMarkdown(form.summaryContent || '')"></div>
            </el-form-item>
          </el-tab-pane>
        </el-tabs>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">
          <Sparkles :size="16" /> 保存规则
        </el-button>
      </template>
    </el-dialog>

    <!-- Preview Dialog -->
    <el-dialog
      v-model="previewVisible"
      :title="previewTitle"
      width="600px"
    >
      <div class="md-preview md-preview-full" v-html="renderMarkdown(previewContent)"></div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- New Type Dialog -->
    <el-dialog
      v-model="newTypeDialogVisible"
      title="新增合同类型"
      width="420px"
      :close-on-click-modal="false"
    >
      <el-form label-position="top" size="large">
        <el-form-item label="合同类型名称" required>
          <el-input
            v-model="newTypeForm.contractType"
            placeholder="如：外包、分包、框架协议..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="newTypeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleNewTypeSubmit">
          <Plus :size="16" /> 下一步：配置审核规则
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.audit-config {
  width: 100%;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(0, 122, 255, 0.1);
  color: var(--apple-blue);
  font-size: 12px;
  font-weight: 500;
}

.add-btn {
  border-radius: var(--radius-button) !important;
  display: flex;
  align-items: center;
  gap: 6px;
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

/* Template grid */
.template-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.template-card {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s ease;
}

.template-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-hover);
}

.template-card.has-template {
  border-left: 3px solid var(--apple-blue);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-type-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(0, 122, 255, 0.08);
  color: var(--apple-blue);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-type {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.card-status {
  font-size: 11px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-summary-badge {
  font-size: 10px;
  color: #34c759;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-weight: 500;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-dot.configured {
  background: #34c759;
}

.status-dot.missing {
  background: #8e8e93;
}

.card-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* Info card */
.info-card {
  padding: 20px;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.info-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.info-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.info-list li {
  position: relative;
  padding: 6px 0 6px 16px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.info-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--apple-blue);
}

/* Editor */
.editor-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.md-editor :deep(.el-textarea__inner) {
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  border-radius: var(--radius-input) !important;
}

.md-preview {
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: var(--radius-input);
  font-size: 13px;
  line-height: 1.6;
  max-height: 300px;
  overflow-y: auto;
}

.md-preview-full {
  max-height: 500px;
}

.md-preview :deep(h1) {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--text-primary);
}

.md-preview :deep(h2) {
  font-size: 15px;
  font-weight: 600;
  margin: 16px 0 8px;
  color: var(--text-primary);
}

.md-preview :deep(h3) {
  font-size: 13px;
  font-weight: 600;
  margin: 12px 0 6px;
  color: var(--text-primary);
}

.md-preview :deep(p) {
  margin: 4px 0;
  color: var(--text-secondary);
}

.md-preview :deep(li) {
  margin: 2px 0;
  color: var(--text-secondary);
  padding-left: 4px;
}

.md-preview :deep(br) {
  display: block;
  content: '';
  margin: 4px 0;
}

/* Rule tabs */
.rule-tabs {
  margin-top: 8px;
}

.rule-tabs :deep(.el-tabs__item) {
  font-size: 14px;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 768px) {
  .template-grid {
    grid-template-columns: 1fr;
  }
}
</style>
