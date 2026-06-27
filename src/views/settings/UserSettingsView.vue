<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  ElTable, ElTableColumn, ElButton, ElDialog, ElForm, ElFormItem,
  ElInput, ElSelect, ElOption, ElMessage, ElPopconfirm, ElTag,
} from 'element-plus'
import { Plus, Shield, Key, Building2 } from 'lucide-vue-next'
import { fetchUsers, createUser, updateUser, deleteUser, resetUserPassword } from '@/api/users'
import { fetchDepartments } from '@/api/departments'
import { fetchRoles } from '@/api/roles'
import type { User, Role } from '@/types/user'
import { ROLE_LABELS } from '@/types/user'
import type { Department } from '@/api/departments'
import type { CustomRole } from '@/api/roles'

interface DisplayRole {
  id: string
  name: string
}

const users = ref<User[]>([])
const departments = ref<Department[]>([])
const customRoles = ref<CustomRole[]>([])
const loading = ref(false)

// Create/Edit dialog
const dialogVisible = ref(false)
const dialogTitle = ref('新增用户')
const editingId = ref<string | null>(null)
const form = ref({
  username: '',
  password: '',
  name: '',
  email: '',
  department: '',
  departmentCode: '',
  role: 'clerk' as string,
  roleIds: [] as string[],
  customRoleNames: [] as string[],
})

// Password reset dialog
const passwordDialogVisible = ref(false)
const resetUserId = ref<string>('')
const resetUserName = ref('')
const newPassword = ref('')

const roleOptions = [
  { value: 'clerk', label: '部门文员', color: '#8e8e93' },
  { value: 'head', label: '部门负责人', color: '#ff9500' },
  { value: 'admin', label: '合同管理员', color: '#007aff' },
  { value: 'super_admin', label: '系统管理员', color: '#af52de' },
]

// Combined role options: system roles + custom roles
const allRoleOptions = computed(() => {
  const systemRoles = [...roleOptions]
  const custom = customRoles.value.map((r) => ({
    value: r.name,
    label: r.name,
    color: '#8e8e93',
    isCustom: true,
  }))
  return [...systemRoles, ...custom]
})

onMounted(() => {
  loadUsers()
  loadDepartments()
  loadCustomRoles()
})

async function loadCustomRoles() {
  try {
    customRoles.value = await fetchRoles()
  } catch {
    // ignore
  }
}

async function loadDepartments() {
  try {
    departments.value = await fetchDepartments()
  } catch {
    // ignore
  }
}

async function loadUsers() {
  loading.value = true
  try {
    users.value = await fetchUsers()
  } catch (error) {
    console.error('Failed to load users:', error)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  dialogTitle.value = '新增用户'
  form.value = { username: '', password: '', name: '', email: '', department: '', departmentCode: '', role: 'clerk', roleIds: [], customRoleNames: [] }
  dialogVisible.value = true
}

async function openEdit(row: any) {
  editingId.value = row.id
  // Load user's custom roles
  let userRoleNames: string[] = []
  try {
    const { fetchUserRoles } = await import('@/api/roles')
    const roles = await fetchUserRoles(row.id)
    userRoleNames = roles.map((r: any) => r.name)
  } catch { /* ignore */ }

  dialogTitle.value = '编辑用户'
  form.value = {
    username: row.username || '',
    password: '',
    name: row.name || '',
    email: row.email || '',
    department: row.department || '',
    departmentCode: row.department_code || '',
    role: row.role || 'clerk',
    roleIds: [],
    customRoleNames: userRoleNames,
  }
  dialogVisible.value = true
}

function openResetPassword(row: any) {
  resetUserId.value = row.id
  resetUserName.value = row.name
  newPassword.value = ''
  passwordDialogVisible.value = true
}

async function saveUserRoles(userId: string) {
  try {
    const { setUserRoles } = await import('@/api/roles')
    const selectedCustomRoles = customRoles.value
      .filter((r) => form.value.customRoleNames.includes(r.name))
      .map((r) => r.id)
    await setUserRoles(userId, selectedCustomRoles)
  } catch { /* ignore */ }
}

async function handleSave() {
  if (editingId.value) {
    try {
      await updateUser(editingId.value, {
        name: form.value.name,
        email: form.value.email,
        department: form.value.department,
        departmentCode: form.value.departmentCode,
        role: form.value.role,
      })
      await saveUserRoles(editingId.value)
      ElMessage.success('用户已更新')
      dialogVisible.value = false
      loadUsers()
    } catch (error: any) {
      ElMessage.error(error?.response?.data?.error || '更新失败')
    }
  } else {
    if (!form.value.username || !form.value.password) {
      ElMessage.warning('用户名和密码不能为空')
      return
    }
    try {
      const newUser = await createUser({
        username: form.value.username,
        password: form.value.password,
        name: form.value.name,
        email: form.value.email,
        department: form.value.department,
        departmentCode: form.value.departmentCode,
        role: form.value.role,
      })
      await saveUserRoles((newUser as any).id || newUser.id)
      ElMessage.success('用户已创建')
      dialogVisible.value = false
      loadUsers()
    } catch (error: any) {
      ElMessage.error(error?.response?.data?.error || '创建失败')
    }
  }
}

async function handleDelete(id: string) {
  try {
    await deleteUser(id)
    ElMessage.success('用户已删除')
    loadUsers()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '删除失败')
  }
}

async function handleResetPassword() {
  if (!newPassword.value || newPassword.value.length < 6) {
    ElMessage.warning('密码至少6位')
    return
  }
  try {
    await resetUserPassword(resetUserId.value, newPassword.value)
    ElMessage.success('密码已重置')
    passwordDialogVisible.value = false
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '重置失败')
  }
}

function onDeptChange(deptName: string) {
  const dept = departments.value.find((d) => d.name === deptName)
  if (dept) {
    form.value.departmentCode = dept.code
  }
}

function getRoleTag(role: string) {
  const opt = allRoleOptions.value.find((r) => r.value === role)
  return opt || { label: role, color: '#8e8e93' }
}

const roleToneOptions = [
  { bg: '#eef6ff', border: '#bfdbfe', text: '#1d4ed8', icon: '#3b82f6' },
  { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', icon: '#22c55e' },
  { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', icon: '#f97316' },
  { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9', icon: '#8b5cf6' },
  { bg: '#fdf2f8', border: '#fbcfe8', text: '#be185d', icon: '#ec4899' },
]

function roleTone(value: string) {
  let hash = 0
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) % roleToneOptions.length
  }
  return roleToneOptions[hash]
}

function displayRoles(row: User | Record<string, any>) {
  if (row.customRoles?.length) {
    return row.customRoles.map((role: DisplayRole) => ({
      value: role.id,
      label: role.name,
      tone: roleTone(role.name),
      custom: true,
    }))
  }

  const baseRole = row.role || 'clerk'
  const tag = getRoleTag(baseRole)
  const label = ROLE_LABELS[baseRole as Role] || tag.label
  return [{
    value: baseRole,
    label,
    tone: roleTone(label),
    custom: false,
  }]
}
</script>

<template>
  <div class="user-settings">
    <div class="page-header">
      <div>
        <h1 class="page-title">用户设置</h1>
        <p class="page-desc">管理系统用户和权限</p>
      </div>
      <el-button type="primary" size="large" class="add-btn" @click="openCreate">
        <Plus :size="18" />
        <span>新增用户</span>
      </el-button>
    </div>

    <!-- Users table -->
    <div class="table-container glass-card">
      <div class="table-wrapper">
      <el-table
        :data="users"
        v-loading="loading"
        border
        style="width: 100%"
      >
        <el-table-column prop="username" label="用户名" width="110" />
        <el-table-column prop="name" label="姓名" width="110" />
        <el-table-column label="部门" min-width="140">
          <template #default="{ row }">
            <div class="dept-cell" v-if="row.department || row.department_code">
              <Building2 :size="13" />
              <span>{{ row.department || '-' }}</span>
              <span v-if="row.department_code" class="code-cell">{{ row.department_code }}</span>
            </div>
            <span v-else class="empty-cell">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="170" />
        <el-table-column label="角色" min-width="220">
          <template #default="{ row }">
            <div class="role-tags">
              <span
                v-for="role in displayRoles(row)"
                :key="role.value"
                class="role-pill"
                :style="{
                  '--role-bg': role.tone.bg,
                  '--role-border': role.tone.border,
                  '--role-text': role.tone.text,
                  '--role-icon': role.tone.icon,
                }"
              >
                <span class="role-pill__icon">
                  <Shield :size="12" />
                </span>
                <span class="role-pill__text">{{ role.label }}</span>
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160" />
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button text size="small" type="primary" @click="openEdit(row)">
              编辑
            </el-button>
            <el-button text size="small" type="warning" @click="openResetPassword(row)">
              <Key :size="12" /> 改密
            </el-button>
            <el-popconfirm
              title="确定删除此用户？"
              confirm-button-text="删除"
              cancel-button-text="取消"
              @confirm="handleDelete(row.id)"
            >
              <template #reference>
                <el-button text size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form label-position="top" size="large">
        <el-form-item label="用户名" required>
          <el-input
            v-model="form.username"
            placeholder="登录用户名"
            :disabled="!!editingId"
          />
        </el-form-item>
        <el-form-item v-if="!editingId" label="密码" required>
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="至少6位"
          />
        </el-form-item>
        <div class="form-row">
          <el-form-item label="姓名">
            <el-input v-model="form.name" placeholder="显示名称" />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="form.email" placeholder="邮箱地址" />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="部门">
            <el-select v-model="form.department" placeholder="选择部门" style="width:100%" filterable @change="onDeptChange">
              <el-option
                v-for="dept in departments"
                :key="dept.code"
                :label="dept.name"
                :value="dept.name"
              >
                <span>{{ dept.name }}</span>
                <span style="float:right;color:#86868b;font-size:12px">{{ dept.code }}</span>
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="部门代码">
            <el-input v-model="form.departmentCode" placeholder="自动填充" :readonly="true" />
          </el-form-item>
        </div>
        <el-form-item label="角色（可多选）">
          <el-select v-model="form.customRoleNames" multiple style="width:100%" placeholder="选择角色">
            <el-option
              v-for="role in customRoles"
              :key="role.id"
              :label="role.name"
              :value="role.name"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- Password Reset Dialog -->
    <el-dialog
      v-model="passwordDialogVisible"
      title="重置密码"
      width="400px"
    >
      <p style="margin-bottom:16px; color:var(--text-secondary); font-size:14px">
        正在重置用户 <strong>{{ resetUserName }}</strong> 的密码
      </p>
      <el-form label-position="top" size="large">
        <el-form-item label="新密码" required>
          <el-input
            v-model="newPassword"
            type="password"
            show-password
            placeholder="至少6位"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleResetPassword">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.user-settings {
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

.dept-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-primary);
}

.code-cell {
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 12px;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.04);
  padding: 2px 6px;
  border-radius: 4px;
}

.empty-cell {
  color: var(--text-secondary);
  font-size: 12px;
}

.role-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.role-pill {
  --role-bg: #eef6ff;
  --role-border: #bfdbfe;
  --role-text: #1d4ed8;
  --role-icon: #3b82f6;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-height: 28px;
  padding: 4px 10px 4px 7px;
  border: 1px solid var(--role-border);
  border-radius: 999px;
  background: var(--role-bg);
  color: var(--role-text);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.role-pill__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--role-icon);
  color: #fff;
}

.role-pill__text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .el-form-item {
  flex: 1;
}
</style>
