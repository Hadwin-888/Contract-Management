<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Trash2, Shield, CheckSquare } from 'lucide-vue-next'
import { fetchRoles, createRole, updateRole, deleteRole, fetchPermissions, setRolePermissions, seedPermissions } from '@/api/roles'
import type { CustomRole, Permission } from '@/api/roles'

const { t } = useI18n()

const roles = ref<CustomRole[]>([])
const allPermissions = ref<Permission[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const permDialogVisible = ref(false)
const editingRole = ref<CustomRole | null>(null)
const selectedRoleForPerms = ref<CustomRole | null>(null)

const form = ref({
  name: '',
  description: '',
})

const MODULE_META: Record<string, { label: string; desc: string; order: number }> = {
  dashboard: { label: '工作台', desc: '首页概览、待办和风险摘要', order: 10 },
  projects: { label: '项目管理', desc: '项目、任务和成员协作', order: 20 },
  procurement: { label: '采购管理（旧）', desc: '旧采购申请、供应商和采购订单', order: 30 },
  assets: { label: '资产管理', desc: '采购、收货、库存、成本、物资和供应商', order: 35 },
  contracts: { label: '合同管理', desc: '合同台账、扫描件、导出和审批提交', order: 40 },
  audit: { label: 'AI 审核', desc: '文件上传、AI 审核、报告下载和记录管理', order: 50 },
  approvals: { label: '审批中心', desc: '合同/采购审批查看与处理', order: 60 },
  notifications: { label: '通知中心', desc: '系统通知和审批提醒', order: 70 },
  reminders: { label: '提醒管理', desc: '合同到期和履约提醒', order: 80 },
  statistics: { label: '数据统计', desc: '统计报表和数据分析', order: 90 },
  settings: { label: '系统设置', desc: '用户、角色、审核配置、审批流、部门和存储', order: 100 },
}

const ACTION_LABELS: Record<string, string> = {
  view: '查看',
  create: '新增',
  edit: '编辑',
  delete: '删除',
  export: '导出',
  analyze: '审核',
  download: '下载',
  clear: '清除',
  approve: '审批',
  submit_approval: '提交审批',
  manage_files: '文件管理',
  manage_members: '成员管理',
  manage_suppliers: '供应商管理',
  manage_users: '用户管理',
  manage_roles: '角色权限',
  manage_departments: '部门管理',
  manage_storage: '存储配置',
  manage_audit_config: '审核配置',
  manage_approval_flows: '审批流',
  purchase: '采购',
  receiving: '收货',
  inventory: '库存',
  cost: '成本',
  manage_items: '物资管理',
  reports: '报表',
  import_export: '导入导出',
  manage_asset_settings: '资产规则',
}

const permissionModules = computed(() => {
  const modules = new Map<string, Permission[]>()
  for (const perm of allPermissions.value) {
    if (!modules.has(perm.module)) modules.set(perm.module, [])
    modules.get(perm.module)!.push(perm)
  }

  return Array.from(modules.entries())
    .map(([module, permissions]) => ({
      module,
      label: MODULE_META[module]?.label || module,
      desc: MODULE_META[module]?.desc || '',
      order: MODULE_META[module]?.order ?? 999,
      permissions: permissions.sort((a, b) => actionOrder(a.action) - actionOrder(b.action)),
    }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
})

const selectedPermIds = ref<string[]>([])

onMounted(async () => {
  await Promise.all([loadRoles(), loadPermissions()])
})

async function loadRoles() {
  loading.value = true
  try {
    roles.value = await fetchRoles()
  } catch (error) {
    console.error('Failed to load roles:', error)
  } finally {
    loading.value = false
  }
}

async function loadPermissions() {
  try {
    await seedPermissions()
    allPermissions.value = await fetchPermissions()
  } catch {
    // Permissions may not be seeded yet
    try {
      await seedPermissions()
      allPermissions.value = await fetchPermissions()
    } catch {
      console.error('Failed to load permissions')
    }
  }
}

function actionOrder(action: string) {
  const order = ['view', 'create', 'edit', 'delete', 'export', 'analyze', 'download', 'clear', 'approve']
  const idx = order.indexOf(action)
  return idx >= 0 ? idx : 99
}

function actionLabel(action: string) {
  return ACTION_LABELS[action] || action
}

function openCreateDialog() {
  editingRole.value = null
  form.value = { name: '', description: '' }
  dialogVisible.value = true
}

function openEditDialog(role: CustomRole) {
  editingRole.value = role
  form.value = { name: role.name, description: role.description }
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入角色名称')
    return
  }

  try {
    if (editingRole.value) {
      await updateRole(editingRole.value.id, form.value)
      ElMessage.success('角色已更新')
    } else {
      await createRole(form.value)
      ElMessage.success('角色已创建')
    }
    dialogVisible.value = false
    await loadRoles()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '操作失败')
  }
}

async function handleDelete(role: CustomRole) {
  try {
    await ElMessageBox.confirm(`确定要删除角色"${role.name}"吗？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteRole(role.id)
    ElMessage.success('角色已删除')
    await loadRoles()
  } catch {
    // cancelled
  }
}

function openPermissionDialog(role: CustomRole) {
  selectedRoleForPerms.value = role
  selectedPermIds.value = role.permissions.map((p) => p.id)
  permDialogVisible.value = true
}

function togglePermission(permId: string) {
  const idx = selectedPermIds.value.indexOf(permId)
  if (idx >= 0) {
    selectedPermIds.value.splice(idx, 1)
  } else {
    selectedPermIds.value.push(permId)
  }
}

function toggleModulePermissions(module: string, checked: boolean) {
  const modulePerms = allPermissions.value.filter((p) => p.module === module)
  for (const perm of modulePerms) {
    const idx = selectedPermIds.value.indexOf(perm.id)
    if (checked && idx < 0) {
      selectedPermIds.value.push(perm.id)
    } else if (!checked && idx >= 0) {
      selectedPermIds.value.splice(idx, 1)
    }
  }
}

function isModuleAllSelected(module: string): boolean {
  const modulePerms = allPermissions.value.filter((p) => p.module === module)
  return modulePerms.length > 0 && modulePerms.every((p) => selectedPermIds.value.includes(p.id))
}

function isModulePartiallySelected(module: string): boolean {
  const modulePerms = allPermissions.value.filter((p) => p.module === module)
  return modulePerms.some((p) => selectedPermIds.value.includes(p.id)) && !isModuleAllSelected(module)
}

function selectedCount(module: string): number {
  return allPermissions.value.filter((p) => p.module === module && selectedPermIds.value.includes(p.id)).length
}

async function handleSavePermissions() {
  if (!selectedRoleForPerms.value) return

  try {
    await setRolePermissions(selectedRoleForPerms.value.id, selectedPermIds.value)
    ElMessage.success('权限已更新')
    permDialogVisible.value = false
    await loadRoles()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '保存权限失败')
  }
}
</script>

<template>
  <div class="role-settings">
    <div class="section-header">
      <div>
        <h3>{{ t('role.title') }}</h3>
        <p>按平台功能模块配置角色权限，用户分配角色后自动继承对应菜单和页面权限。</p>
      </div>
      <el-button type="primary" size="small" @click="openCreateDialog">
        <Plus :size="16" />
        {{ t('role.createRole') }}
      </el-button>
    </div>

    <div class="role-list" v-loading="loading">
      <div v-for="role in roles" :key="role.id" class="role-card">
        <div class="role-info">
          <div class="role-icon">
            <Shield :size="20" />
          </div>
          <div class="role-details">
            <span class="role-name">
              {{ role.name }}
              <el-tag v-if="role.isSystem" size="small" type="info">{{ t('role.isSystem') }}</el-tag>
            </span>
            <span class="role-desc">{{ role.description || '-' }}</span>
            <span class="role-count">
              {{ role.userCount }} {{ t('project.member') }} · {{ role.permissions.length }} 项权限
            </span>
          </div>
        </div>
        <div class="role-actions">
          <el-button text size="small" type="primary" @click="openPermissionDialog(role)">
            <Shield :size="14" />
            {{ t('role.permissions') }}
          </el-button>
          <el-button v-if="!role.isSystem" text size="small" @click="openEditDialog(role)">
            <Edit :size="14" />
          </el-button>
          <el-button v-if="!role.isSystem" text size="small" type="danger" @click="handleDelete(role)">
            <Trash2 :size="14" />
          </el-button>
        </div>
      </div>
      <el-empty v-if="!loading && roles.length === 0" :description="t('common.noData')" />
    </div>

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingRole ? t('common.edit') : t('role.createRole')"
      width="420px"
    >
      <el-form :model="form" label-position="top">
        <el-form-item :label="t('role.roleName')" required>
          <el-input v-model="form.name" :placeholder="t('role.roleName')" />
        </el-form-item>
        <el-form-item :label="t('role.roleDesc')">
          <el-input v-model="form.description" type="textarea" :rows="3" :placeholder="t('role.roleDesc')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleSave">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- Permission Dialog -->
    <el-dialog
      v-model="permDialogVisible"
      :title="`${t('role.permissions')} - ${selectedRoleForPerms?.name || ''}`"
      width="760px"
    >
      <div class="permission-matrix">
        <div v-for="group in permissionModules" :key="group.module" class="perm-module">
          <div class="perm-module-header">
            <el-checkbox
              :model-value="isModuleAllSelected(group.module)"
              :indeterminate="isModulePartiallySelected(group.module)"
              @change="(val: boolean) => toggleModulePermissions(group.module, val)"
            >
              <span class="module-title">
                <strong>{{ group.label }}</strong>
                <span>{{ selectedCount(group.module) }}/{{ group.permissions.length }}</span>
              </span>
            </el-checkbox>
            <p>{{ group.desc }}</p>
          </div>
          <div class="perm-items">
            <button
              v-for="perm in group.permissions"
              :key="perm.id"
              type="button"
              class="perm-item"
              :class="{ selected: selectedPermIds.includes(perm.id) }"
              @click="togglePermission(perm.id)"
            >
              <CheckSquare :size="15" />
              <span class="perm-action">{{ actionLabel(perm.action) }}</span>
              <span class="perm-desc">{{ perm.description }}</span>
            </button>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="permDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleSavePermissions">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.role-settings { padding: 0; }
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 16px;
}
.section-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
.section-header p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
}
.role-list { display: flex; flex-direction: column; gap: 8px; }
.role-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 10px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.role-card:hover { border-color: #c9d8ee; box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04); }
.role-info { display: flex; align-items: center; gap: 12px; }
.role-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(0, 122, 255, 0.1);
  color: var(--apple-blue, #007aff);
  display: flex;
  align-items: center;
  justify-content: center;
}
.role-details { display: flex; flex-direction: column; gap: 2px; }
.role-name { font-size: 14px; font-weight: 600; color: var(--text-primary, #111); display: flex; align-items: center; gap: 6px; }
.role-desc { font-size: 12px; color: var(--text-secondary, #6b7280); }
.role-count { font-size: 11px; color: var(--text-tertiary, #9ca3af); }
.role-actions { display: flex; align-items: center; gap: 4px; }
.permission-matrix {
  max-height: 62vh;
  overflow-y: auto;
  display: grid;
  gap: 12px;
}
.perm-module {
  padding: 14px;
  background: #f8fafc;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
}
.perm-module-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}
.perm-module-header p {
  margin: 0;
  padding-left: 24px;
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
}
.module-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.module-title span {
  font-size: 12px;
  color: var(--text-tertiary, #98a2b3);
  font-weight: 500;
}
.perm-items {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding-left: 24px;
}
.perm-item {
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  background: #fff;
  color: var(--text-secondary, #6b7280);
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: center;
  gap: 7px;
  text-align: left;
  cursor: pointer;
}
.perm-item:hover {
  border-color: #bdd3f0;
  background: #f7fbff;
}
.perm-item.selected {
  border-color: var(--apple-blue, #006edb);
  background: #eef6ff;
  color: var(--apple-blue, #006edb);
}
.perm-action {
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.perm-desc {
  min-width: 0;
  font-size: 12px;
  color: var(--text-primary, #111827);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .role-card,
  .section-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .role-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .perm-items {
    grid-template-columns: 1fr;
  }
}
</style>
