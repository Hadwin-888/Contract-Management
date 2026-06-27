<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, MoreHorizontal, CalendarDays, Users, Clock3, Flag, FileCheck2, Edit3 } from 'lucide-vue-next'
import PageTransition from '@/components/common/PageTransition.vue'
import { fetchProjects, createProject, updateProject, deleteProject } from '@/api/projects'
import { fetchUsers } from '@/api/users'
import { fetchDepartments } from '@/api/departments'
import type { Project } from '@/api/projects'
import type { User } from '@/types/user'
import type { Department } from '@/api/departments'

const { t } = useI18n()
const router = useRouter()

const projects = ref<Project[]>([])
const users = ref<User[]>([])
const departments = ref<Department[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const editingProject = ref<Project | null>(null)
const activeMenuProjectId = ref('')
const statusFilter = ref('')
const form = ref({
  name: '',
  description: '',
  ownerId: '',
  department: '',
  priority: 'medium',
  type: 'hotel_preopening',
  targetName: '深圳美高梅酒店开业',
  targetDate: '',
  countdownMode: true,
  countdownLabel: '距离开业',
  startDate: '',
  endDate: '',
})

const filteredProjects = computed(() => {
  if (!statusFilter.value) return projects.value
  return projects.value.filter((project) => project.status === statusFilter.value)
})

onMounted(async () => {
  await Promise.all([loadProjects(), loadUsers(), loadDepartments()])
})

async function loadProjects() {
  loading.value = true
  try {
    const result = await fetchProjects({ pageSize: 100 })
    projects.value = result.items
  } catch (error) {
    console.error('Failed to load projects:', error)
  } finally {
    loading.value = false
  }
}

async function loadUsers() {
  try {
    users.value = await fetchUsers()
  } catch {
    users.value = []
  }
}

async function loadDepartments() {
  try {
    departments.value = await fetchDepartments()
  } catch {
    departments.value = []
  }
}

function openCreateDialog() {
  editingProject.value = null
  form.value = {
    name: '',
    description: '',
    ownerId: '',
    department: '',
    priority: 'medium',
    type: 'hotel_preopening',
    targetName: '深圳美高梅酒店开业',
    targetDate: '',
    countdownMode: true,
    countdownLabel: '距离开业',
    startDate: '',
    endDate: '',
  }
  dialogVisible.value = true
}

function toDateInput(date?: string | null): string {
  if (!date) return ''
  return new Date(date).toISOString().slice(0, 10)
}

function openEditDialog(project: Project) {
  activeMenuProjectId.value = ''
  editingProject.value = project
  form.value = {
    name: project.name || '',
    description: project.description || '',
    ownerId: project.ownerId || '',
    department: project.department || '',
    priority: project.priority || 'medium',
    type: project.type || 'hotel_preopening',
    targetName: project.targetName || '',
    targetDate: toDateInput(project.targetDate),
    countdownMode: Boolean(project.countdownMode),
    countdownLabel: project.countdownLabel || '',
    startDate: toDateInput(project.startDate),
    endDate: toDateInput(project.endDate),
  }
  dialogVisible.value = true
}

function toggleProjectMenu(projectId: string) {
  activeMenuProjectId.value = activeMenuProjectId.value === projectId ? '' : projectId
}

async function handleSave() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入项目名称')
    return
  }
  try {
    const payload = {
      ...form.value,
      ownerId: form.value.ownerId || undefined,
      department: form.value.department || undefined,
      targetDate: form.value.targetDate || undefined,
      startDate: form.value.startDate || undefined,
      endDate: form.value.endDate || undefined,
    }
    if (editingProject.value) {
      await updateProject(editingProject.value.id, payload as any)
      ElMessage.success('项目已更新')
    } else {
      await createProject(payload)
      ElMessage.success('项目已创建')
    }
    dialogVisible.value = false
    await loadProjects()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '创建失败')
  }
}

async function handleDelete(project: Project) {
  try {
    await ElMessageBox.confirm(`确定删除项目"${project.name}"？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteProject(project.id)
    ElMessage.success('已删除')
    await loadProjects()
  } catch {
    // cancelled
  }
}

function goToProject(id: string) {
  activeMenuProjectId.value = ''
  router.push(`/projects/${id}`)
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: '进行中',
    pending_completion_approval: '完成审批中',
    completed: '已完成',
    archived: '已归档',
    rejected: '已驳回',
  }
  return map[status] || status
}

function statusType(status: string): 'success' | 'warning' | 'info' | 'danger' {
  if (status === 'completed') return 'success'
  if (status === 'pending_completion_approval') return 'warning'
  if (status === 'rejected') return 'danger'
  return 'info'
}

function priorityLabel(priority: string): string {
  const map: Record<string, string> = { high: '高', medium: '中', low: '低' }
  return map[priority] || priority
}

function countdownText(project: Project): string {
  const days = project.timing?.daysRemaining
  if (days === null || days === undefined) return '未设置目标日期'
  if (days < 0) return `已超过 ${Math.abs(days)} 天`
  if (days === 0) return '今天到期'
  return `还剩 ${days} 天`
}
</script>

<template>
  <PageTransition>
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ t('project.title') }}</h1>
          <p class="page-subtitle">围绕酒店筹备、开业节点和跨部门任务推进项目</p>
        </div>
        <div class="header-actions">
          <el-segmented
            v-model="statusFilter"
            :options="[
              { label: '全部', value: '' },
              { label: '进行中', value: 'active' },
              { label: '审批中', value: 'pending_completion_approval' },
              { label: '已完成', value: 'completed' },
            ]"
          />
          <el-button type="primary" size="large" @click="openCreateDialog">
            <Plus :size="18" />
            {{ t('project.createProject') }}
          </el-button>
        </div>
      </div>

      <div class="project-grid" v-loading="loading">
        <div v-for="project in filteredProjects" :key="project.id" class="project-card" @click="goToProject(project.id)">
          <div class="card-header">
            <div>
              <div class="card-kicker">
                <Flag :size="14" />
                <span>{{ project.type === 'hotel_preopening' ? '酒店筹备' : project.type || '项目' }}</span>
              </div>
              <h3 class="card-title">{{ project.name }}</h3>
            </div>
            <div class="card-menu" @click.stop>
              <button class="card-more" type="button" title="更多操作" @click="toggleProjectMenu(project.id)">
                <MoreHorizontal :size="16" />
              </button>
              <div v-if="activeMenuProjectId === project.id" class="card-menu-popover">
                <button type="button" @click="openEditDialog(project)">
                  <Edit3 :size="14" />
                  编辑
                </button>
                <button type="button" class="danger" @click="handleDelete(project)">
                  删除
                </button>
              </div>
            </div>
          </div>

          <div class="countdown-panel" :class="{ overdue: project.timing?.overdue }">
            <div>
              <span class="countdown-label">{{ project.countdownLabel || project.timing?.targetName || '目标倒计时' }}</span>
              <strong>{{ countdownText(project) }}</strong>
            </div>
            <Clock3 :size="22" />
          </div>

          <p class="card-desc">{{ project.description || '暂无项目说明' }}</p>

          <div class="progress-block">
            <div class="progress-head">
              <span>任务进度</span>
              <b>{{ project.progress || 0 }}%</b>
            </div>
            <el-progress :percentage="project.progress || 0" :stroke-width="8" :show-text="false" />
          </div>

          <div class="card-meta">
            <span><Users :size="14" /> {{ project.owner?.name || '未指定负责人' }}</span>
            <span><CalendarDays :size="14" /> {{ formatDate(project.targetDate || project.endDate) }}</span>
          </div>

          <div class="card-footer">
            <div class="footer-tags">
              <el-tag size="small" :type="statusType(project.status)">{{ statusLabel(project.status) }}</el-tag>
              <el-tag size="small" effect="plain">{{ priorityLabel(project.priority) }}优先级</el-tag>
            </div>
            <span class="task-count">
              {{ project.completedTasks || 0 }}/{{ project.totalTasks || project._count?.tasks || 0 }} 任务
              <FileCheck2 :size="13" />
              {{ project._count?.files || 0 }}
            </span>
          </div>
        </div>
        <el-empty v-if="!loading && filteredProjects.length === 0" description="暂无项目" />
      </div>

      <el-dialog v-model="dialogVisible" :title="editingProject ? '编辑项目' : '创建项目'" width="720px" class="project-dialog">
        <el-form :model="form" label-position="top" class="project-form">
          <el-form-item label="项目名称" required class="span-2">
            <el-input v-model="form.name" placeholder="例如：深圳美高梅酒店筹备项目" />
          </el-form-item>
          <el-form-item label="项目说明" class="span-2">
            <el-input v-model="form.description" type="textarea" :rows="3" placeholder="项目目标、范围、重点交付物" />
          </el-form-item>
          <el-form-item label="项目负责人">
            <el-select v-model="form.ownerId" filterable clearable placeholder="选择负责人">
              <el-option v-for="user in users" :key="user.id" :label="user.name" :value="user.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="归属部门">
            <el-select v-model="form.department" filterable clearable placeholder="选择部门">
              <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.name" />
            </el-select>
          </el-form-item>
          <el-form-item label="项目类型">
            <el-select v-model="form.type">
              <el-option label="酒店筹备" value="hotel_preopening" />
              <el-option label="工程改造" value="renovation" />
              <el-option label="采购落地" value="procurement" />
              <el-option label="运营专项" value="operation" />
            </el-select>
          </el-form-item>
          <el-form-item label="优先级">
            <el-select v-model="form.priority">
              <el-option label="高" value="high" />
              <el-option label="中" value="medium" />
              <el-option label="低" value="low" />
            </el-select>
          </el-form-item>
          <el-form-item label="目标名称">
            <el-input v-model="form.targetName" placeholder="例如：深圳美高梅酒店开业" />
          </el-form-item>
          <el-form-item label="目标日期/开业日期">
            <el-date-picker v-model="form.targetDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
          </el-form-item>
          <el-form-item label="开始日期">
            <el-date-picker v-model="form.startDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
          </el-form-item>
          <el-form-item label="结束日期">
            <el-date-picker v-model="form.endDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
          </el-form-item>
          <el-form-item label="启用倒计时">
            <el-switch v-model="form.countdownMode" active-text="开启" inactive-text="关闭" />
          </el-form-item>
          <el-form-item label="倒计时标签">
            <el-input v-model="form.countdownLabel" placeholder="例如：距离开业" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" @click="handleSave">{{ editingProject ? '保存' : t('common.create') }}</el-button>
        </template>
      </el-dialog>
    </div>
  </PageTransition>
</template>

<style scoped>
.page { padding: 0; }
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}
.page-title { font-size: 24px; font-weight: 700; margin: 0; color: var(--text-primary); }
.page-subtitle { margin: 6px 0 0; font-size: 13px; color: var(--text-secondary); }
.header-actions { display: flex; align-items: center; gap: 12px; }
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: 16px;
}
.project-card {
  position: relative;
  padding: 18px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}
.project-card:hover {
  border-color: #2f7df6;
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}
.card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
.card-kicker { display: flex; align-items: center; gap: 5px; color: #64748b; font-size: 12px; margin-bottom: 6px; }
.card-title { font-size: 16px; font-weight: 700; line-height: 1.35; margin: 0; color: var(--text-primary); }
.card-menu { position: relative; flex-shrink: 0; }
.card-more { background: transparent; border: none; cursor: pointer; color: var(--text-secondary); padding: 6px; border-radius: 6px; }
.card-more:hover { background: var(--hover-bg); }
.card-menu-popover {
  position: absolute;
  top: 34px;
  right: 0;
  z-index: 30;
  min-width: 118px;
  padding: 6px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
}
.card-menu-popover button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 13px;
  text-align: left;
}
.card-menu-popover button:hover { background: #f8fafc; }
.card-menu-popover button.danger { color: #dc2626; }
.countdown-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  margin-bottom: 12px;
  border: 1px solid #c7ddff;
  border-radius: 8px;
  background: linear-gradient(135deg, #f4f8ff, #eef7f5);
  color: #1f4f8f;
}
.countdown-panel.overdue { border-color: #fecaca; background: #fff5f5; color: #b42318; }
.countdown-label { display: block; font-size: 12px; opacity: 0.8; margin-bottom: 2px; }
.countdown-panel strong { font-size: 20px; line-height: 1.2; }
.card-desc {
  min-height: 38px;
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.progress-block { margin-bottom: 14px; }
.progress-head { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; }
.progress-head b { color: var(--text-primary); }
.card-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; color: var(--text-tertiary); margin-bottom: 14px; }
.card-meta span { display: flex; align-items: center; gap: 5px; min-width: 0; }
.card-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.footer-tags { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.task-count { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-tertiary); white-space: nowrap; }
.project-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}
.span-2 { grid-column: span 2; }

@media (max-width: 900px) {
  .page-header { align-items: flex-start; flex-direction: column; }
  .header-actions { width: 100%; justify-content: space-between; flex-wrap: wrap; }
  .project-form { grid-template-columns: 1fr; }
  .span-2 { grid-column: span 1; }
}
</style>
