<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Trash2, ArrowRight } from 'lucide-vue-next'
import { fetchApprovalFlows, createApprovalFlow, updateApprovalFlow, deleteApprovalFlow } from '@/api/approvals'
import type { ApprovalFlow, ApprovalFlowStep } from '@/api/approvals'

const { t } = useI18n()

const flows = ref<ApprovalFlow[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const editingFlow = ref<ApprovalFlow | null>(null)

const form = ref({
  name: '',
  module: 'procurement',
  description: '',
  steps: [] as { roleName: string; actionType: string; required: boolean }[],
})

const moduleOptions = [
  { value: 'procurement', label: '采购' },
  { value: 'contract', label: '合同' },
  { value: 'project', label: '项目' },
  { value: 'other', label: '其他' },
]

onMounted(() => {
  loadFlows()
})

async function loadFlows() {
  loading.value = true
  try {
    flows.value = await fetchApprovalFlows()
  } catch (error) {
    console.error('Failed to load approval flows:', error)
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  editingFlow.value = null
  form.value = {
    name: '',
    module: 'procurement',
    description: '',
    steps: [{ roleName: '', actionType: 'approve', required: true }],
  }
  dialogVisible.value = true
}

function openEditDialog(flow: ApprovalFlow) {
  editingFlow.value = flow
  form.value = {
    name: flow.name,
    module: flow.module,
    description: flow.description,
    steps: flow.steps.map((s) => ({
      roleName: s.roleName,
      actionType: s.actionType,
      required: s.required,
    })),
  }
  dialogVisible.value = true
}

function addStep() {
  form.value.steps.push({ roleName: '', actionType: 'approve', required: true })
}

function removeStep(index: number) {
  form.value.steps.splice(index, 1)
}

async function handleSave() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入审批流名称')
    return
  }

  const validSteps = form.value.steps.filter((s) => s.roleName.trim())
  if (validSteps.length === 0) {
    ElMessage.warning('请至少添加一个审批步骤')
    return
  }

  try {
    const data: any = {
      name: form.value.name,
      module: form.value.module,
      description: form.value.description,
      steps: validSteps.map((s, i) => ({
        roleName: s.roleName,
        actionType: s.actionType,
        required: s.required,
        stepOrder: i + 1,
      })),
    }

    if (editingFlow.value) {
      await updateApprovalFlow(editingFlow.value.id, data)
      ElMessage.success('审批流已更新')
    } else {
      await createApprovalFlow(data)
      ElMessage.success('审批流已创建')
    }

    dialogVisible.value = false
    await loadFlows()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '操作失败')
  }
}

async function handleDelete(flow: ApprovalFlow) {
  try {
    await ElMessageBox.confirm(`确定要删除审批流"${flow.name}"吗？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteApprovalFlow(flow.id)
    ElMessage.success('审批流已删除')
    await loadFlows()
  } catch {
    // cancelled
  }
}
</script>

<template>
  <div class="approval-flow-settings">
    <div class="section-header">
      <h3>{{ t('approval.flowName') }}</h3>
      <el-button type="primary" size="small" @click="openCreateDialog">
        <Plus :size="16" />
        {{ t('approval.createFlow') }}
      </el-button>
    </div>

    <div class="flow-list" v-loading="loading">
      <div v-for="flow in flows" :key="flow.id" class="flow-card">
        <div class="flow-header">
          <div class="flow-info">
            <span class="flow-name">{{ flow.name }}</span>
            <el-tag size="small" :type="flow.isActive ? 'success' : 'info'">
              {{ flow.isActive ? '启用' : '停用' }}
            </el-tag>
            <el-tag size="small">{{ flow.module }}</el-tag>
          </div>
          <div class="flow-actions">
            <el-button text size="small" @click="openEditDialog(flow)">
              <Edit :size="14" />
            </el-button>
            <el-button text size="small" type="danger" @click="handleDelete(flow)">
              <Trash2 :size="14" />
            </el-button>
          </div>
        </div>
        <div class="flow-steps" v-if="flow.steps.length > 0">
          <div v-for="(step, idx) in flow.steps" :key="step.id" class="step-item">
            <span class="step-badge">{{ idx + 1 }}</span>
            <span class="step-role">{{ step.roleName }}</span>
            <span class="step-action">({{ step.actionType }})</span>
            <ArrowRight v-if="idx < flow.steps.length - 1" :size="14" class="step-arrow" />
          </div>
        </div>
        <div v-else class="no-steps">{{ t('common.noData') }}</div>
      </div>
      <el-empty v-if="!loading && flows.length === 0" :description="t('common.noData')" />
    </div>

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingFlow ? t('approval.editFlow') : t('approval.createFlow')"
      width="600px"
    >
      <el-form :model="form" label-position="top">
        <el-form-item :label="t('approval.flowName')" required>
          <el-input v-model="form.name" :placeholder="t('approval.flowName')" />
        </el-form-item>
        <el-form-item :label="t('approval.module')">
          <el-select v-model="form.module">
            <el-option v-for="opt in moduleOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('common.desc')">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>

        <div class="steps-section">
          <div class="steps-header">
            <strong>{{ t('approval.stepOrder') }}</strong>
            <el-button text size="small" @click="addStep">
              <Plus :size="14" /> {{ t('approval.addStep') }}
            </el-button>
          </div>
          <div v-for="(step, idx) in form.steps" :key="idx" class="step-form-item">
            <span class="step-num">{{ idx + 1 }}</span>
            <el-input v-model="step.roleName" :placeholder="t('approval.roleName')" size="small" style="flex:1" />
            <el-select v-model="step.actionType" size="small" style="width:100px">
              <el-option label="审批" value="approve" />
              <el-option label="会签" value="review" />
              <el-option label="确认" value="confirm" />
            </el-select>
            <el-button text size="small" type="danger" @click="removeStep(idx)" :disabled="form.steps.length <= 1">
              <Trash2 :size="14" />
            </el-button>
          </div>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleSave">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.approval-flow-settings { padding: 0; }
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.section-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
.flow-list { display: flex; flex-direction: column; gap: 12px; }
.flow-card {
  padding: 16px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 10px;
}
.flow-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.flow-info { display: flex; align-items: center; gap: 8px; }
.flow-name { font-size: 15px; font-weight: 600; }
.flow-actions { display: flex; gap: 4px; }
.flow-steps { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.step-item { display: flex; align-items: center; gap: 4px; }
.step-badge {
  width: 22px; height: 22px;
  border-radius: 50%;
  background: var(--apple-blue, #007aff);
  color: white;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.step-role { font-size: 13px; font-weight: 500; }
.step-action { font-size: 12px; color: var(--text-secondary); }
.step-arrow { color: var(--text-tertiary); }
.no-steps { font-size: 13px; color: var(--text-secondary); padding: 8px 0; }
.steps-section { margin-top: 16px; }
.steps-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.step-form-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.step-num {
  width: 24px; height: 24px;
  border-radius: 50%;
  background: var(--apple-blue, #007aff);
  color: white;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
