<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from 'lucide-vue-next'
import PageTransition from '@/components/common/PageTransition.vue'
import { fetchProcurementRequests, createProcurementRequest, deleteProcurementRequest, submitProcurementRequest } from '@/api/procurement'
import type { ProcurementRequest } from '@/api/procurement'

const { t } = useI18n()
const router = useRouter()

const requests = ref<ProcurementRequest[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const form = ref({ title: '', description: '', category: '', amount: 0, quantity: 1, unit: '', urgency: 'normal', reason: '' })

const statusLabels: Record<string, string> = {
  draft: '草稿', pending: '待审批', approved: '已批准',
  rejected: '已驳回', ordered: '已下单', received: '已收货',
}
const statusTypes: Record<string, string> = {
  draft: 'info', pending: 'warning', approved: 'success',
  rejected: 'danger', ordered: 'primary', received: 'success',
}

onMounted(() => { loadRequests() })

async function loadRequests() {
  loading.value = true
  try {
    const result = await fetchProcurementRequests({ pageSize: 50 })
    requests.value = result.items
  } catch (error) {
    console.error('Failed to load requests:', error)
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  form.value = { title: '', description: '', category: '', amount: 0, quantity: 1, unit: '', urgency: 'normal', reason: '' }
  dialogVisible.value = true
}

async function handleCreate() {
  if (!form.value.title.trim()) {
    ElMessage.warning('请输入采购标题')
    return
  }
  try {
    await createProcurementRequest(form.value)
    ElMessage.success('采购申请已创建')
    dialogVisible.value = false
    await loadRequests()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '创建失败')
  }
}

async function handleDelete(req: ProcurementRequest) {
  try {
    await ElMessageBox.confirm(`确定删除"${req.title}"？`, '确认', {
      confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning',
    })
    await deleteProcurementRequest(req.id)
    ElMessage.success('已删除')
    await loadRequests()
  } catch { /* cancelled */ }
}

async function handleSubmit(req: ProcurementRequest) {
  try {
    await submitProcurementRequest(req.id)
    ElMessage.success('已提交审批')
    await loadRequests()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '提交失败')
  }
}

function goToSuppliers() { router.push('/procurement/suppliers') }
function goToOrders() { router.push('/procurement/purchase-orders') }

function formatAmount(val: number): string {
  return `¥${val.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
}
</script>

<template>
  <PageTransition>
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ t('procurement.title') }}</h1>
        </div>
        <div class="header-actions">
          <el-button @click="goToSuppliers">{{ t('procurement.suppliers') }}</el-button>
          <el-button @click="goToOrders">{{ t('procurement.purchaseOrder') }}</el-button>
          <el-button type="primary" @click="openCreateDialog">
            <Plus :size="18" />
            {{ t('procurement.createRequest') }}
          </el-button>
        </div>
      </div>

      <div class="request-list" v-loading="loading">
        <div v-for="req in requests" :key="req.id" class="request-card">
          <div class="card-top">
            <div class="card-info">
              <h3 class="card-title">{{ req.title }}</h3>
              <p class="card-desc">{{ req.description || t('common.noData') }}</p>
            </div>
            <el-tag :type="statusTypes[req.status] || 'info'" size="small" round>
              {{ statusLabels[req.status] || req.status }}
            </el-tag>
          </div>
          <div class="card-meta">
            <span>{{ t('procurement.amount') }}: {{ formatAmount(req.amount) }}</span>
            <span>{{ t('procurement.quantity') }}: {{ req.quantity }} {{ req.unit }}</span>
            <span v-if="req.requester">{{ req.requester.name }}</span>
          </div>
          <div class="card-actions">
            <el-button v-if="req.status === 'draft'" size="small" type="primary" @click="handleSubmit(req)">
              提交审批
            </el-button>
            <el-button v-if="req.status === 'draft'" size="small" @click="handleDelete(req)">
              {{ t('common.delete') }}
            </el-button>
          </div>
        </div>
        <el-empty v-if="!loading && requests.length === 0" :description="t('common.noData')" />
      </div>

      <el-dialog v-model="dialogVisible" :title="t('procurement.createRequest')" width="500px">
        <el-form :model="form" label-position="top">
          <el-form-item :label="t('procurement.requestTitle')" required>
            <el-input v-model="form.title" />
          </el-form-item>
          <el-form-item :label="t('common.desc')">
            <el-input v-model="form.description" type="textarea" :rows="2" />
          </el-form-item>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item :label="t('procurement.amount')">
                <el-input-number v-model="form.amount" :min="0" style="width:100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="t('procurement.quantity')">
                <el-input-number v-model="form.quantity" :min="1" style="width:100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item :label="t('procurement.urgency')">
            <el-select v-model="form.urgency" style="width:100%">
              <el-option label="低" value="low" />
              <el-option label="普通" value="normal" />
              <el-option label="高" value="high" />
              <el-option label="紧急" value="urgent" />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('procurement.reason')">
            <el-input v-model="form.reason" type="textarea" :rows="2" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" @click="handleCreate">{{ t('common.create') }}</el-button>
        </template>
      </el-dialog>
    </div>
  </PageTransition>
</template>

<style scoped>
.page { padding: 0; }
.page-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px;
}
.page-title { font-size: 24px; font-weight: 700; margin: 0; }
.header-actions { display: flex; gap: 8px; }
.request-list { display: flex; flex-direction: column; gap: 12px; }
.request-card {
  padding: 16px 20px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 12px;
}
.card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
.card-title { font-size: 15px; font-weight: 600; margin: 0 0 4px; }
.card-desc { font-size: 13px; color: var(--text-secondary); margin: 0; }
.card-meta { display: flex; gap: 16px; font-size: 12px; color: var(--text-tertiary); margin-bottom: 12px; }
.card-actions { display: flex; gap: 8px; }
</style>
