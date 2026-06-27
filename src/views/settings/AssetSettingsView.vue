<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, UploadCloud, Edit3, Trash2 } from 'lucide-vue-next'
import {
  fetchAssetSettings,
  createAssetSetting,
  updateAssetSetting,
  deleteAssetSetting,
  importAssetSettingsCsv,
} from '@/api/assets'
import type { AssetSetting } from '@/api/assets'

const categories = [
  { key: 'cost_center', label: '成本中心' },
  { key: 'warehouse', label: '仓库' },
  { key: 'item_category', label: '品项分类' },
  { key: 'item_unit', label: '品项单位' },
  { key: 'asset_type', label: '品项资产类型' },
  { key: 'tax_rate', label: '税率' },
  { key: 'operation_type', label: '物资操作类型' },
  { key: 'invoice_type', label: '发票类型' },
]

const activeCategory = ref('cost_center')
const items = ref<AssetSetting[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const editing = ref<AssetSetting | null>(null)
const importInput = ref<HTMLInputElement | null>(null)
const form = ref({ code: '', name: '', description: '', status: 'active', sortOrder: 0, remark: '' })

const activeLabel = computed(() => categories.find((item) => item.key === activeCategory.value)?.label || '设置')

onMounted(loadItems)

async function loadItems() {
  loading.value = true
  try {
    items.value = await fetchAssetSettings(activeCategory.value)
  } finally {
    loading.value = false
  }
}

function switchCategory(category: string) {
  activeCategory.value = category
  loadItems()
}

function openCreate() {
  editing.value = null
  form.value = { code: '', name: '', description: '', status: 'active', sortOrder: items.value.length + 1, remark: '' }
  dialogVisible.value = true
}

function openEdit(row: AssetSetting) {
  editing.value = row
  form.value = {
    code: row.code,
    name: row.name,
    description: row.description || '',
    status: row.status,
    sortOrder: row.sortOrder || 0,
    remark: row.remark || '',
  }
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.value.code.trim() || !form.value.name.trim()) {
    ElMessage.warning('请填写代码和名称')
    return
  }
  try {
    if (editing.value) {
      await updateAssetSetting(editing.value.id, form.value)
      ElMessage.success('设置已更新')
    } else {
      await createAssetSetting({ ...form.value, category: activeCategory.value })
      ElMessage.success('设置已新增')
    }
    dialogVisible.value = false
    await loadItems()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '保存失败')
  }
}

async function handleDelete(row: AssetSetting) {
  try {
    await ElMessageBox.confirm(`确定删除"${row.name}"？`, '确认删除', { type: 'warning' })
    await deleteAssetSetting(row.id)
    ElMessage.success('已删除')
    await loadItems()
  } catch {
    // cancelled
  }
}

function triggerImport() {
  importInput.value?.click()
}

async function handleImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  try {
    const result = await importAssetSettingsCsv(file)
    ElMessage.success(result.message)
    await loadItems()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '导入失败')
  } finally {
    target.value = ''
  }
}
</script>

<template>
  <div class="asset-settings">
    <div class="section-header">
      <div>
        <h3>资产管理规则设置</h3>
        <p>维护成本中心、仓库、品项分类、单位、资产类型、税率和物资操作类型。</p>
      </div>
      <div class="header-actions">
        <el-button @click="triggerImport"><UploadCloud :size="16" />导入设置 CSV</el-button>
        <input ref="importInput" class="hidden-input" type="file" accept=".csv,.xlsx,.xls" @change="handleImport" />
        <el-button type="primary" @click="openCreate"><Plus :size="16" />新增{{ activeLabel }}</el-button>
      </div>
    </div>

    <div class="category-tabs">
      <button v-for="category in categories" :key="category.key" :class="{ active: activeCategory === category.key }" @click="switchCategory(category.key)">
        {{ category.label }}
      </button>
    </div>

    <el-table :data="items" v-loading="loading" border>
      <el-table-column prop="code" label="代码" min-width="130" />
      <el-table-column prop="name" label="名称" min-width="180" />
      <el-table-column prop="description" label="说明" min-width="180" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'">{{ row.status === 'active' ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="sortOrder" label="排序" width="90" />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button text size="small" @click="openEdit(row)"><Edit3 :size="14" />编辑</el-button>
          <el-button text size="small" type="danger" @click="handleDelete(row)"><Trash2 :size="14" />删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑设置' : '新增设置'" width="520px">
      <el-form :model="form" label-position="top">
        <el-form-item label="代码" required><el-input v-model="form.code" /></el-form-item>
        <el-form-item label="名称" required><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="form.description" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width:100%">
            <el-option label="启用" value="active" />
            <el-option label="停用" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.asset-settings { display: flex; flex-direction: column; gap: 16px; }
.section-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.section-header h3 { margin: 0; font-size: 18px; }
.section-header p { margin: 4px 0 0; color: var(--text-secondary); font-size: 13px; }
.header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.category-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.category-tabs button {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: #fff;
  padding: 7px 12px;
  color: var(--text-secondary);
  cursor: pointer;
}
.category-tabs button.active { border-color: #007aff; background: #e8f2ff; color: #005eb8; font-weight: 600; }
.hidden-input { display: none; }
</style>
