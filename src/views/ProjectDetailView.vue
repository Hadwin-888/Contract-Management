<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowLeft, LayoutGrid, List, Calendar, BarChart3 } from 'lucide-vue-next'
import PageTransition from '@/components/common/PageTransition.vue'
import { fetchProject, fetchKanban, fetchProjectStats, updateTask, createTask, deleteTask } from '@/api/projects'
import type { Project, Task } from '@/api/projects'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const projectId = route.params.id as string

const project = ref<Project | null>(null)
const kanbanData = ref<Record<string, Task[]>>({})
const stats = ref<any>(null)
const loading = ref(false)
const viewMode = ref<'kanban' | 'list'>('kanban')
const taskDialogVisible = ref(false)
const editingTask = ref<Partial<Task> | null>(null)
const taskForm = ref({ title: '', description: '', priority: 'medium', assigneeId: '', dueDate: '' })

const columns = [
  { key: 'todo', label: '待办', color: '#6b7280' },
  { key: 'in_progress', label: '进行中', color: '#007aff' },
  { key: 'review', label: '审核中', color: '#ff9500' },
  { key: 'done', label: '已完成', color: '#34c759' },
]

onMounted(async () => {
  await Promise.all([loadProject(), loadKanban(), loadStats()])
})

async function loadProject() {
  try {
    project.value = await fetchProject(projectId)
  } catch { router.push('/projects') }
}

async function loadKanban() {
  try {
    kanbanData.value = await fetchKanban(projectId)
  } catch { console.error('Failed to load kanban') }
}

async function loadStats() {
  try {
    stats.value = await fetchProjectStats(projectId)
  } catch { /* ignore */ }
}

function openCreateTask() {
  editingTask.value = null
  taskForm.value = { title: '', description: '', priority: 'medium', assigneeId: '', dueDate: '' }
  taskDialogVisible.value = true
}

async function handleCreateTask() {
  if (!taskForm.value.title.trim()) {
    ElMessage.warning('请输入任务标题')
    return
  }
  try {
    await createTask({
      projectId,
      title: taskForm.value.title,
      description: taskForm.value.description,
      priority: taskForm.value.priority,
      assigneeId: taskForm.value.assigneeId || undefined,
      dueDate: taskForm.value.dueDate || undefined,
    })
    ElMessage.success('任务已创建')
    taskDialogVisible.value = false
    await loadKanban()
    await loadStats()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '创建失败')
  }
}

async function handleDragTask(taskId: string, newStatus: string) {
  try {
    await updateTask(taskId, { status: newStatus } as any)
    await loadKanban()
    await loadStats()
  } catch { /* ignore */ }
}

function goBack() { router.push('/projects') }

function getColumnTasks(key: string): Task[] {
  return kanbanData.value[key] || []
}

function priorityColor(p: string): string {
  const map: Record<string, string> = { high: '#ff3b30', medium: '#ff9500', low: '#34c759' }
  return map[p] || '#6b7280'
}
</script>

<template>
  <PageTransition>
    <div class="page" v-if="project">
      <div class="page-header">
        <div class="header-left">
          <button class="back-btn" @click="goBack"><ArrowLeft :size="20" /></button>
          <div>
            <h1 class="page-title">{{ project.name }}</h1>
            <p class="page-desc" v-if="project.description">{{ project.description }}</p>
          </div>
        </div>
        <div class="header-actions">
          <div class="view-switcher">
            <button :class="{ active: viewMode === 'kanban' }" @click="viewMode = 'kanban'"><LayoutGrid :size="16" /></button>
            <button :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'"><List :size="16" /></button>
          </div>
          <el-button type="primary" size="default" @click="openCreateTask">
            <Plus :size="16" />
            {{ t('project.createTask') }}
          </el-button>
        </div>
      </div>

      <!-- Stats bar -->
      <div class="stats-bar" v-if="stats">
        <div class="stat-item">
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">总任务</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" style="color:#007aff">{{ stats.inProgress }}</span>
          <span class="stat-label">进行中</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" style="color:#34c759">{{ stats.done }}</span>
          <span class="stat-label">已完成</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" style="color:#ff3b30">{{ stats.overdue }}</span>
          <span class="stat-label">已逾期</span>
        </div>
      </div>

      <!-- Kanban View -->
      <div v-if="viewMode === 'kanban'" class="kanban-board">
        <div v-for="col in columns" :key="col.key" class="kanban-column"
          @dragover.prevent
          @drop.prevent="handleDragTask(($event as any).dataTransfer.getData('text/plain'), col.key)"
        >
          <div class="column-header">
            <span class="column-dot" :style="{ background: col.color }"></span>
            <span class="column-title">{{ col.label }}</span>
            <span class="column-count">{{ getColumnTasks(col.key).length }}</span>
          </div>
          <div class="column-body">
            <div
              v-for="task in getColumnTasks(col.key)"
              :key="task.id"
              class="kanban-card"
              draggable="true"
              @dragstart="($event) => $event.dataTransfer?.setData('text/plain', task.id)"
            >
              <div class="card-top">
                <span class="priority-dot" :style="{ background: priorityColor(task.priority) }"></span>
                <span class="card-title-text">{{ task.title }}</span>
              </div>
              <div class="card-meta" v-if="task.dueDate">
                <span class="due-date">{{ new Date(task.dueDate).toLocaleDateString('zh-CN') }}</span>
              </div>
              <div class="card-footer" v-if="task.assignee">
                <span class="assignee">{{ task.assignee.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div v-else class="list-view">
        <div v-for="col in columns" :key="col.key" class="list-group">
          <div class="list-group-header">
            <span class="column-dot" :style="{ background: col.color }"></span>
            <span>{{ col.label }}</span>
            <span class="list-count">{{ getColumnTasks(col.key).length }}</span>
          </div>
          <div v-for="task in getColumnTasks(col.key)" :key="task.id" class="list-item">
            <span class="priority-dot" :style="{ background: priorityColor(task.priority) }"></span>
            <span class="list-title">{{ task.title }}</span>
            <span class="list-assignee" v-if="task.assignee">{{ task.assignee.name }}</span>
          </div>
        </div>
      </div>

      <!-- Create Task Dialog -->
      <el-dialog v-model="taskDialogVisible" :title="t('project.createTask')" width="500px">
        <el-form :model="taskForm" label-position="top">
          <el-form-item :label="t('project.taskTitle')" required>
            <el-input v-model="taskForm.title" />
          </el-form-item>
          <el-form-item :label="t('project.taskDesc')">
            <el-input v-model="taskForm.description" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item :label="t('project.priority')">
            <el-select v-model="taskForm.priority">
              <el-option label="高" value="high" />
              <el-option label="中" value="medium" />
              <el-option label="低" value="low" />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('project.dueDate')">
            <el-date-picker v-model="taskForm.dueDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="taskDialogVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" @click="handleCreateTask">{{ t('common.create') }}</el-button>
        </template>
      </el-dialog>
    </div>
  </PageTransition>
</template>

<style scoped>
.page { padding: 0; }
.page-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 20px;
}
.header-left { display: flex; align-items: flex-start; gap: 12px; }
.back-btn {
  background: none; border: none; cursor: pointer; padding: 8px;
  border-radius: 8px; color: var(--text-secondary); margin-top: 4px;
}
.back-btn:hover { background: var(--hover-bg); }
.page-title { font-size: 22px; font-weight: 700; margin: 0; }
.page-desc { font-size: 13px; color: var(--text-secondary); margin: 4px 0 0; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.view-switcher {
  display: flex; gap: 2px;
  background: var(--bg-secondary, #f3f4f6); border-radius: 8px; padding: 3px;
}
.view-switcher button {
  padding: 6px 10px; border: none; border-radius: 6px;
  background: transparent; cursor: pointer; color: var(--text-secondary);
}
.view-switcher button.active { background: white; color: var(--text-primary); box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.stats-bar {
  display: flex; gap: 24px; padding: 16px 20px;
  background: var(--bg-card, #fff); border-radius: 12px;
  border: 1px solid var(--border-color); margin-bottom: 20px;
}
.stat-item { display: flex; flex-direction: column; gap: 2px; }
.stat-value { font-size: 20px; font-weight: 700; }
.stat-label { font-size: 12px; color: var(--text-tertiary); }

.kanban-board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  min-height: 400px;
}
.kanban-column {
  background: var(--bg-secondary, #f9fafb);
  border-radius: 12px;
  padding: 12px;
}
.column-header { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
.column-dot { width: 8px; height: 8px; border-radius: 50%; }
.column-title { font-size: 13px; font-weight: 600; }
.column-count {
  font-size: 11px; color: var(--text-tertiary);
  background: var(--bg-card, #fff); padding: 1px 6px; border-radius: 8px; margin-left: auto;
}
.column-body { display: flex; flex-direction: column; gap: 8px; min-height: 60px; }
.kanban-card {
  padding: 10px 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  cursor: grab;
  transition: all 0.15s;
}
.kanban-card:hover { border-color: var(--apple-blue); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.kanban-card:active { cursor: grabbing; }
.card-top { display: flex; align-items: flex-start; gap: 6px; margin-bottom: 4px; }
.priority-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
.card-title-text { font-size: 13px; font-weight: 500; line-height: 1.4; }
.card-meta { margin-bottom: 4px; }
.due-date { font-size: 11px; color: var(--text-tertiary); }
.card-footer { display: flex; align-items: center; gap: 4px; }
.assignee { font-size: 11px; color: var(--text-secondary); }

.list-view { display: flex; flex-direction: column; gap: 16px; }
.list-group { background: var(--bg-card, #fff); border-radius: 12px; border: 1px solid var(--border-color); overflow: hidden; }
.list-group-header { display: flex; align-items: center; gap: 6px; padding: 12px 16px; font-size: 14px; font-weight: 600; border-bottom: 1px solid #f3f4f6; }
.list-count { font-size: 12px; color: var(--text-tertiary); margin-left: auto; }
.list-item { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-bottom: 1px solid #f9fafb; }
.list-item:last-child { border-bottom: none; }
.list-title { flex: 1; font-size: 13px; }
.list-assignee { font-size: 12px; color: var(--text-secondary); }

@media (max-width: 1200px) { .kanban-board { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .kanban-board { grid-template-columns: 1fr; } }
</style>
