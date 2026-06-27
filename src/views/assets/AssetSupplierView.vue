<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, UploadCloud, Download, Edit3, Trash2 } from 'lucide-vue-next'
import PageTransition from '@/components/common/PageTransition.vue'
import {
  fetchAssetSuppliers,
  submitAssetSupplierChange,
  setAssetSupplierStatus,
  deleteAssetSupplier,
  importAssetSuppliers,
  exportAssetSuppliers,
} from '@/api/assets'
import type { AssetSupplier } from '@/api/assets'

const suppliers = ref<AssetSupplier[]>([])
const loading = ref(false)
const q = ref('')
const dialogVisible = ref(false)
const editing = ref<AssetSupplier | null>(null)
const importInput = ref<HTMLInputElement | null>(null)
const form = ref<any>({})

const emptyForm = () => ({
  suppliersId: '',
  suppliersNameCn: '',
  suppliersNameEn: '',
  suppliersCity: '',
  contactPerson: '',
  contactTitle: '',
  contactNumber: '',
  email: '',
  invoiceName: '',
  taxId: '',
  invoiceAdd: '',
  bank: '',
  bankAccountNo: '',
  status: 'active',
  remark: '',
  submitNote: '',
})

onMounted(loadSuppliers)

async function loadSuppliers() {
  loading.value = true
  try {
    const result = await fetchAssetSuppliers(q.value)
    suppliers.value = result.items
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = emptyForm()
  dialogVisible.value = true
}

function openEdit(row: AssetSupplier) {
  editing.value = row
  form.value = { ...emptyForm(), ...row, submitNote: '' }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.suppliersId?.trim() || !form.value.suppliersNameCn?.trim()) {
    ElMessage.warning('请填写供应商ID和供应商中文名')
    return
  }
  try {
    await submitAssetSupplierChange({ ...form.value, id: editing.value?.id })
    ElMessage.success('已提交审批，审批通过后生效')
    dialogVisible.value = false
    await loadSuppliers()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '提交失败')
  }
}

async function toggleStatus(row: AssetSupplier) {
  const status = row.status === 'active' ? 'inactive' : 'active'
  await setAssetSupplierStatus(row.id, status)
  ElMessage.success(status === 'active' ? '已启用' : '已停用')
  await loadSuppliers()
}

async function handleDelete(row: AssetSupplier) {
  try {
    await ElMessageBox.confirm(`确定删除"${row.suppliersNameCn}"？`, '确认删除', { type: 'warning' })
    await deleteAssetSupplier(row.id)
    ElMessage.success('已删除')
    await loadSuppliers()
  } catch {
    // cancelled
  }
}

function triggerImport() { importInput.value?.click() }

async function handleImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  try {
    const result = await importAssetSuppliers(file)
    ElMessage.success(result.message)
    await loadSuppliers()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '导入失败')
  } finally {
    target.value = ''
  }
}
</script>

<template>
  <PageTransition>
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">供应商管理</h1>
          <p class="page-desc">维护供应商资料、发票信息与银行账号，新增或变更需审批。</p>
        </div>
        <div class="actions">
          <el-input v-model="q" placeholder="搜索供应商ID/名称" clearable style="width:220px" @keyup.enter="loadSuppliers" />
          <el-button @click="loadSuppliers">搜索</el-button>
          <el-button @click="triggerImport"><UploadCloud :size="16" />导入</el-button>
          <input ref="importInput" class="hidden-input" type="file" accept=".xlsx,.xls,.csv" @change="handleImport" />
          <el-button @click="exportAssetSuppliers"><Download :size="16" />导出</el-button>
          <el-button type="primary" @click="openCreate"><Plus :size="16" />新增供应商</el-button>
        </div>
      </div>

      <el-table :data="suppliers" v-loading="loading" border>
        <el-table-column prop="suppliersId" label="供应商ID" min-width="120" />
        <el-table-column prop="suppliersNameCn" label="供应商中文名" min-width="190" />
        <el-table-column prop="suppliersCity" label="城市" width="110" />
        <el-table-column prop="contactPerson" label="联系人" width="120" />
        <el-table-column prop="contactNumber" label="联系电话" min-width="140" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="invoiceName" label="发票名称" min-width="180" />
        <el-table-column prop="taxId" label="纳税识别号" min-width="160" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }"><el-tag :type="row.status === 'active' ? 'success' : 'info'">{{ row.status === 'active' ? '启用' : '停用' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button text size="small" @click="openEdit(row)"><Edit3 :size="14" />编辑</el-button>
            <el-button text size="small" @click="toggleStatus(row)">{{ row.status === 'active' ? '停用' : '启用' }}</el-button>
            <el-button text size="small" type="danger" @click="handleDelete(row)"><Trash2 :size="14" />删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="dialogVisible" :title="editing ? '编辑供应商' : '新增供应商'" width="860px">
        <el-form :model="form" label-position="top" class="grid-form">
          <el-form-item label="供应商ID" required><el-input v-model="form.suppliersId" /></el-form-item>
          <el-form-item label="供应商中文名" required><el-input v-model="form.suppliersNameCn" /></el-form-item>
          <el-form-item label="供应商英文名"><el-input v-model="form.suppliersNameEn" /></el-form-item>
          <el-form-item label="供应商城市"><el-input v-model="form.suppliersCity" /></el-form-item>
          <el-form-item label="联系人"><el-input v-model="form.contactPerson" /></el-form-item>
          <el-form-item label="联系人职务"><el-input v-model="form.contactTitle" /></el-form-item>
          <el-form-item label="联系电话"><el-input v-model="form.contactNumber" /></el-form-item>
          <el-form-item label="邮箱"><el-input v-model="form.email" /></el-form-item>
          <el-form-item label="发票名称"><el-input v-model="form.invoiceName" /></el-form-item>
          <el-form-item label="纳税识别号"><el-input v-model="form.taxId" /></el-form-item>
          <el-form-item label="发票地址" class="span-2"><el-input v-model="form.invoiceAdd" /></el-form-item>
          <el-form-item label="开户行信息"><el-input v-model="form.bank" /></el-form-item>
          <el-form-item label="银行账号"><el-input v-model="form.bankAccountNo" /></el-form-item>
          <el-form-item label="状态"><el-select v-model="form.status" style="width:100%"><el-option label="启用" value="active" /><el-option label="停用" value="inactive" /></el-select></el-form-item>
          <el-form-item label="备注"><el-input v-model="form.remark" /></el-form-item>
          <el-form-item label="审批说明" class="span-2"><el-input v-model="form.submitNote" type="textarea" :rows="3" /></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">提交审批</el-button>
        </template>
      </el-dialog>
    </div>
  </PageTransition>
</template>

<style scoped>
.page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 18px; }
.page-title { margin: 0; font-size: 24px; font-weight: 700; }
.page-desc { margin: 6px 0 0; color: var(--text-secondary); font-size: 13px; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.hidden-input { display: none; }
.grid-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
.span-2 { grid-column: span 2; }
</style>
