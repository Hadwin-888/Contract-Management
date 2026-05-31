<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  ElTable, ElTableColumn, ElButton, ElDialog, ElForm, ElFormItem,
  ElInput, ElMessage, ElPopconfirm,
} from 'element-plus'
import { Plus, Edit, Trash2, Building2 } from 'lucide-vue-next'
import { fetchDepartments, createDepartment, updateDepartment, deleteDepartment } from '@/api/departments'
import type { Department } from '@/api/departments'

const departments = ref<Department[]>([])
const loading = ref(false)

const dialogVisible = ref(false)
const dialogTitle = ref('')
const editingId = ref<string | null>(null)
const form = ref({
  code: '',
  shortName: '',
  name: '',
  headName: '',
})

onMounted(() => loadDepartments())

async function loadDepartments() {
  loading.value = true
  try {
    departments.value = await fetchDepartments()
  } catch (error) {
    console.error('Failed to load departments:', error)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  dialogTitle.value = '新增部门'
  form.value = { code: '', shortName: '', name: '', headName: '' }
  dialogVisible.value = true
}

function openEdit(row: Department) {
  editingId.value = row.id
  dialogTitle.value = '编辑部门'
  form.value = {
    code: row.code,
    shortName: row.short_name,
    name: row.name,
    headName: row.head_name,
  }
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.value.code || !form.value.shortName || !form.value.name) {
    ElMessage.warning('请填写部门代码、简称和名称')
    return
  }
  try {
    if (editingId.value) {
      await updateDepartment(editingId.value, form.value)
      ElMessage.success('部门已更新')
    } else {
      await createDepartment(form.value)
      ElMessage.success('部门已创建')
    }
    dialogVisible.value = false
    loadDepartments()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '操作失败')
  }
}

async function handleDelete(id: string) {
  try {
    await deleteDepartment(id)
    ElMessage.success('部门已删除')
    loadDepartments()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '删除失败')
  }
}
</script>

<template>
  <div class="dept-settings">
    <div class="page-header">
      <div>
        <h1 class="page-title">部门设置</h1>
        <p class="page-desc">管理部门列表，全系统的部门选择以此为准</p>
      </div>
      <el-button type="primary" size="large" class="add-btn" @click="openCreate">
        <Plus :size="18" />
        <span>新增部门</span>
      </el-button>
    </div>

    <div class="table-container glass-card">
      <div class="table-wrapper">
        <el-table :data="departments" v-loading="loading" border style="width: 100%">
          <el-table-column prop="code" label="部门代码" width="120" />
          <el-table-column prop="short_name" label="部门简称" width="140" />
          <el-table-column prop="name" label="部门名称" min-width="180" />
          <el-table-column prop="head_name" label="部门负责人" width="140">
            <template #default="{ row }">
              <span v-if="row.head_name">{{ row.head_name }}</span>
              <span v-else class="empty-cell">-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button text size="small" type="primary" @click="openEdit(row)">
                <Edit :size="13" /> 编辑
              </el-button>
              <el-popconfirm title="确定删除此部门？" @confirm="handleDelete(row.id)">
                <template #reference>
                  <el-button text size="small" type="danger">
                    <Trash2 :size="13" /> 删除
                  </el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px" :close-on-click-modal="false">
      <el-form label-position="top" size="large">
        <div class="form-row">
          <el-form-item label="部门代码" required>
            <el-input v-model="form.code" placeholder="如：PUR" style="text-transform:uppercase" />
          </el-form-item>
          <el-form-item label="部门简称" required>
            <el-input v-model="form.shortName" placeholder="如：采购部" />
          </el-form-item>
        </div>
        <el-form-item label="部门名称" required>
          <el-input v-model="form.name" placeholder="如：采购管理部" />
        </el-form-item>
        <el-form-item label="部门负责人">
          <el-input v-model="form.headName" placeholder="负责人姓名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.dept-settings {
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
}

.add-btn {
  border-radius: var(--radius-button) !important;
  display: flex;
  align-items: center;
  gap: 6px;
}

.table-container {
  padding: 0;
  overflow: hidden;
}

.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.empty-cell {
  color: var(--text-secondary);
  font-size: 12px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .el-form-item {
  flex: 1;
}
</style>
