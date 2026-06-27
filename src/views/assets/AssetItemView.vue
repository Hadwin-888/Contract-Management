<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, UploadCloud, Download, Edit3, Trash2, RefreshCw, Search } from 'lucide-vue-next'
import PageTransition from '@/components/common/PageTransition.vue'
import {
  fetchAssetItems,
  fetchAssetSettings,
  submitAssetItemChange,
  setAssetItemStatus,
  deleteAssetItem,
  downloadAssetItemImportTemplate,
  importAssetItemChangeRequests,
  exportAssetItems,
} from '@/api/assets'
import type { AssetItem, AssetSetting } from '@/api/assets'

const items = ref<AssetItem[]>([])
const loading = ref(false)
const filters = ref({
  q: '',
  itemUnit: '',
  bsstype: '',
  assettype: '',
  status: '',
  approvalStatus: '',
})
const dialogVisible = ref(false)
const editing = ref<AssetItem | null>(null)
const importInput = ref<HTMLInputElement | null>(null)
const itemUnits = ref<AssetSetting[]>([])
const itemCategories = ref<AssetSetting[]>([])
const assetTypes = ref<AssetSetting[]>([])
const form = ref({
  itemNo: '',
  itemName: '',
  itemDec: '',
  itemBrand: '',
  itemUnit: '',
  bsstype: '',
  assettype: '',
  status: 'active',
  remark: '',
  submitNote: '',
})

onMounted(loadAll)

async function loadAll() {
  await Promise.all([loadItems(), loadSettings()])
}

async function loadItems() {
  loading.value = true
  try {
    const result = await fetchAssetItems(filters.value)
    items.value = result.items
  } finally {
    loading.value = false
  }
}

async function handleExport() {
  await exportAssetItems(filters.value)
}

function resetFilters() {
  filters.value = { q: '', itemUnit: '', bsstype: '', assettype: '', status: '', approvalStatus: '' }
  loadItems()
}

async function loadSettings() {
  const [units, categories, types] = await Promise.all([
    fetchAssetSettings('item_unit'),
    fetchAssetSettings('item_category'),
    fetchAssetSettings('asset_type'),
  ])
  itemUnits.value = units.filter((item) => item.status === 'active')
  itemCategories.value = categories.filter((item) => item.status === 'active')
  assetTypes.value = types.filter((item) => item.status === 'active')
}

function openCreate() {
  editing.value = null
  form.value = { itemNo: '', itemName: '', itemDec: '', itemBrand: '', itemUnit: '', bsstype: '', assettype: '', status: 'active', remark: '', submitNote: '' }
  dialogVisible.value = true
}

function openEdit(row: AssetItem) {
  editing.value = row
  form.value = {
    itemNo: row.itemNo,
    itemName: row.itemName,
    itemDec: row.itemDec || '',
    itemBrand: row.itemBrand || '',
    itemUnit: row.itemUnit || '',
    bsstype: row.bsstype || '',
    assettype: row.assettype || '',
    status: row.status,
    remark: row.remark || '',
    submitNote: '',
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.itemNo.trim() || !form.value.itemName.trim()) {
    ElMessage.warning('请填写品项代码和品项名称')
    return
  }
  try {
    await submitAssetItemChange({ ...(form.value as any), id: editing.value?.id })
    ElMessage.success('已提交审批，审批通过后生效')
    dialogVisible.value = false
    await loadItems()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '提交失败')
  }
}

async function toggleStatus(row: AssetItem) {
  if (row.isPendingCreate) {
    ElMessage.info('该品项正在新增审批中，审批通过后才能启停')
    return
  }
  const status = row.status === 'active' ? 'inactive' : 'active'
  await setAssetItemStatus(row.id, status)
  ElMessage.success(status === 'active' ? '已启用' : '已停用')
  await loadItems()
}

async function handleDelete(row: AssetItem) {
  if (row.isPendingCreate) {
    ElMessage.info('该品项正在新增审批中，暂不能删除正式档案')
    return
  }
  try {
    await ElMessageBox.confirm(`确定删除"${row.itemName}"？`, '确认删除', { type: 'warning' })
    await deleteAssetItem(row.id)
    ElMessage.success('已删除')
    await loadItems()
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
    const result = await importAssetItemChangeRequests(file)
    ElMessage.success(result.message)
    await loadItems()
  } catch (error: any) {
    const details = error?.response?.data?.details
    if (Array.isArray(details) && details.length) {
      ElMessageBox.alert(details.join('\n'), error?.response?.data?.error || '导入失败', { confirmButtonText: '我知道了' })
    } else {
      ElMessage.error(error?.response?.data?.error || '导入失败')
    }
  } finally {
    target.value = ''
  }
}

function approvalTagType(status?: string) {
  if (status === 'pending') return 'warning'
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  return 'info'
}
</script>

<template>
  <PageTransition>
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">物资管理</h1>
          <p class="page-desc">维护物资品项代码、分类、单位和资产类型，新增或变更需审批。</p>
        </div>
        <div class="actions">
          <el-button @click="downloadAssetItemImportTemplate"><Download :size="16" />下载新增模板</el-button>
          <el-button @click="triggerImport"><UploadCloud :size="16" />导入并提交审批</el-button>
          <input ref="importInput" class="hidden-input" type="file" accept=".xlsx,.xls,.csv" @change="handleImport" />
          <el-button @click="handleExport"><Download :size="16" />导出筛选结果</el-button>
          <el-button type="primary" @click="openCreate"><Plus :size="16" />新增品项</el-button>
        </div>
      </div>

      <div class="filter-panel">
        <el-input
          v-model="filters.q"
          placeholder="搜索代码/名称/品牌/摘要"
          clearable
          @keyup.enter="loadItems"
        >
          <template #prefix><Search :size="15" /></template>
        </el-input>
        <el-select v-model="filters.itemUnit" placeholder="单位" clearable filterable>
          <el-option v-for="unit in itemUnits" :key="unit.id" :label="`${unit.code} · ${unit.name}`" :value="unit.code" />
        </el-select>
        <el-select v-model="filters.bsstype" placeholder="品项分类" clearable filterable>
          <el-option v-for="category in itemCategories" :key="category.id" :label="`${category.code} · ${category.name}`" :value="category.name" />
        </el-select>
        <el-select v-model="filters.assettype" placeholder="资产类型" clearable filterable>
          <el-option v-for="type in assetTypes" :key="type.id" :label="type.name" :value="type.name" />
        </el-select>
        <el-select v-model="filters.status" placeholder="品项状态" clearable>
          <el-option label="启用" value="active" />
          <el-option label="停用" value="inactive" />
        </el-select>
        <el-select v-model="filters.approvalStatus" placeholder="审批状态" clearable>
          <el-option label="审批中" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已驳回" value="rejected" />
          <el-option label="无审批" value="none" />
        </el-select>
        <div class="filter-actions">
          <el-button type="primary" @click="loadItems"><Search :size="15" />筛选</el-button>
          <el-button @click="resetFilters"><RefreshCw :size="15" />重置</el-button>
        </div>
      </div>

      <el-table :data="items" v-loading="loading" border>
        <el-table-column prop="itemNo" label="品项代码" min-width="130" />
        <el-table-column prop="itemName" label="品项名称" min-width="180" />
        <el-table-column prop="itemDec" label="品项摘要" min-width="180" />
        <el-table-column prop="itemBrand" label="品牌" min-width="120" />
        <el-table-column prop="itemUnit" label="单位" width="100" />
        <el-table-column prop="bsstype" label="品项分类" min-width="150" />
        <el-table-column prop="assettype" label="资产类型" min-width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }"><el-tag :type="row.status === 'active' ? 'success' : 'info'">{{ row.status === 'active' ? '启用' : '停用' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="审批状态" width="120">
          <template #default="{ row }">
            <el-tag :type="approvalTagType(row.approvalStatus)" effect="light">
              {{ row.approvalStatusLabel || '无审批' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前待审批人" min-width="160">
          <template #default="{ row }">
            <span v-if="row.pendingApprovers?.length" class="approver-list">{{ row.pendingApprovers.join('、') }}</span>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button text size="small" :disabled="row.isPendingCreate" @click="openEdit(row)"><Edit3 :size="14" />编辑</el-button>
            <el-button text size="small" :disabled="row.isPendingCreate" @click="toggleStatus(row)">{{ row.status === 'active' ? '停用' : '启用' }}</el-button>
            <el-button text size="small" type="danger" :disabled="row.isPendingCreate" @click="handleDelete(row)"><Trash2 :size="14" />删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="dialogVisible" :title="editing ? '编辑物资品项' : '新增物资品项'" width="760px">
        <el-form :model="form" label-position="top" class="grid-form">
          <el-form-item label="品项代码" required><el-input v-model="form.itemNo" /></el-form-item>
          <el-form-item label="品项名称" required><el-input v-model="form.itemName" /></el-form-item>
          <el-form-item label="品项摘要" class="span-2"><el-input v-model="form.itemDec" /></el-form-item>
          <el-form-item label="品牌"><el-input v-model="form.itemBrand" /></el-form-item>
          <el-form-item label="单位">
            <el-select v-model="form.itemUnit" filterable clearable allow-create default-first-option style="width:100%" placeholder="选择品项单位">
              <el-option v-for="unit in itemUnits" :key="unit.id" :label="`${unit.code} · ${unit.name}`" :value="unit.code" />
            </el-select>
          </el-form-item>
          <el-form-item label="品项分类">
            <el-select v-model="form.bsstype" filterable clearable allow-create default-first-option style="width:100%" placeholder="选择品项分类">
              <el-option v-for="category in itemCategories" :key="category.id" :label="`${category.code} · ${category.name}`" :value="category.name" />
            </el-select>
          </el-form-item>
          <el-form-item label="资产类型">
            <el-select v-model="form.assettype" filterable clearable allow-create default-first-option style="width:100%" placeholder="选择资产类型">
              <el-option v-for="type in assetTypes" :key="type.id" :label="type.name" :value="type.name" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态"><el-select v-model="form.status" style="width:100%"><el-option label="启用" value="active" /><el-option label="停用" value="inactive" /></el-select></el-form-item>
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
.filter-panel {
  display: grid;
  grid-template-columns: minmax(220px, 1.3fr) repeat(5, minmax(140px, 1fr)) auto;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
  padding: 12px;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  background: var(--bg-card, #fff);
}
.filter-actions { display: flex; gap: 8px; justify-content: flex-end; }
.approver-list { color: var(--text-primary, #111827); font-size: 13px; }
.muted { color: var(--text-tertiary, #9ca3af); }
.hidden-input { display: none; }
.grid-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
.span-2 { grid-column: span 2; }
@media (max-width: 1200px) {
  .filter-panel { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .filter-actions { justify-content: flex-start; }
}
@media (max-width: 720px) {
  .filter-panel { grid-template-columns: 1fr; }
}
</style>
