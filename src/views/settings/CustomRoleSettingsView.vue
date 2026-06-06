<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Trash2, Shield } from 'lucide-vue-next'
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

// Permission matrix
const permissionModules = computed(() => {
  const modules = new Map<string, Permission[]>()
  for (const perm of allPermissions.value) {
    if (!modules.has(perm.module)) {
      modules.set(perm.module, [])
    }
    modules.get(perm.module)!.push(perm)
  }
  return Array.from(modules.entries())
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
      <h3>{{ t('role.title') }}</h3>
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
            <span class="role-count">{{ t('common.status') }}: {{ role.userCount }} {{ t('project.member') }}</span>
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
      width="600px"
    >
      <div class="permission-matrix">
        <div v-for="[module, perms] in permissionModules" :key="module" class="perm-module">
          <div class="perm-module-header">
            <el-checkbox
              :model-value="isModuleAllSelected(module)"
              :indeterminate="perms.some(p => selectedPermIds.includes(p.id)) && !isModuleAllSelected(module)"
              @change="(val: boolean) => toggleModulePermissions(module, val)"
            >
              <strong>{{ module }}</strong>
            </el-checkbox>
          </div>
          <div class="perm-items">
            <el-checkbox
              v-for="perm in perms"
              :key="perm.id"
              :model-value="selectedPermIds.includes(perm.id)"
              @change="() => togglePermission(perm.id)"
            >
              {{ perm.description }}
            </el-checkbox>
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
}
.section-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
.role-list { display: flex; flex-direction: column; gap: 8px; }
.role-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 10px;
  transition: all 0.2s;
}
.role-card:hover { border-color: var(--apple-blue, #007aff); }
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
.permission-matrix { max-height: 500px; overflow-y: auto; }
.perm-module {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--bg-secondary, #f9fafb);
  border-radius: 8px;
}
.perm-module-header { margin-bottom: 8px; }
.perm-items { display: flex; flex-wrap: wrap; gap: 8px; padding-left: 24px; }
</style>
