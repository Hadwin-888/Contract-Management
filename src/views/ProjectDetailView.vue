<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import {
  Plus,
  ArrowLeft,
  LayoutGrid,
  List,
  CalendarRange,
  UploadCloud,
  CheckCircle2,
  FileText,
  Download,
  Trash2,
  Edit3,
} from 'lucide-vue-next'
import PageTransition from '@/components/common/PageTransition.vue'
import { fetchUsers } from '@/api/users'
import { fetchDepartments } from '@/api/departments'
import {
  fetchProject,
  fetchKanban,
  fetchProjectStats,
  fetchProjectGantt,
  fetchProjectFiles,
  fetchProjectApprovalProgress,
  fetchTask,
  fetchTaskFiles,
  fetchTaskApprovalProgress,
  updateTask,
  createTask,
  downloadTaskImportTemplate,
  importTasksFromExcel,
  deleteTask,
  uploadTaskFile,
  deleteTaskFile,
  downloadTaskFile,
  uploadProjectFile,
  deleteProjectFile,
  downloadProjectFile,
  submitProjectCompletion,
  submitTaskCompletion,
} from '@/api/projects'
import type { Project, Task, ProjectFile, TaskFile, ProjectApprovalProgress, TaskApprovalProgress } from '@/api/projects'
import type { User } from '@/types/user'
import type { Department } from '@/api/departments'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const projectId = route.params.id as string

const project = ref<Project | null>(null)
const kanbanData = ref<Record<string, Task[]>>({})
const stats = ref<any>(null)
const ganttTasks = ref<Task[]>([])
const files = ref<ProjectFile[]>([])
const users = ref<User[]>([])
const departments = ref<Department[]>([])
const approvalProgress = ref<ProjectApprovalProgress | null>(null)
const loading = ref(false)
const viewMode = ref<'kanban' | 'list' | 'gantt' | 'files' | 'approval'>('kanban')
const taskDialogVisible = ref(false)
const editingTask = ref<Task | null>(null)
const completionDialogVisible = ref(false)
const completionNote = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const taskFileInput = ref<HTMLInputElement | null>(null)
const taskImportInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const taskUploading = ref(false)
const importingTasks = ref(false)
const taskDetailVisible = ref(false)
const selectedTask = ref<Task | null>(null)
const selectedTaskFiles = ref<TaskFile[]>([])
const selectedTaskApproval = ref<TaskApprovalProgress | null>(null)
const taskCompletionNote = ref('')
const taskForm = ref({
  title: '',
  description: '',
  priority: 'medium',
  assigneeId: '',
  startDate: '',
  dueDate: '',
  progress: 0,
  relativeToTarget: false,
  startOffsetValue: 8,
  startOffsetUnit: 'week',
  dueOffsetValue: 4,
  dueOffsetUnit: 'week',
  startOffsetDays: -56,
  dueOffsetDays: -28,
})

const columns = [
  { key: 'todo', label: '待办', color: '#64748b' },
  { key: 'in_progress', label: '进行中', color: '#2f7df6' },
  { key: 'review', label: '验收中', color: '#f59e0b' },
  { key: 'done', label: '已完成', color: '#22c55e' },
]

const allTasks = computed(() => columns.flatMap((col) => kanbanData.value[col.key] || []))
const projectMembers = computed(() => project.value?.members || [])
const assigneeOptions = computed(() => {
  const map = new Map<string, { id: string; name: string; department?: string; source: string }>()
  if (project.value?.owner) {
    map.set(project.value.owner.id, {
      id: project.value.owner.id,
      name: project.value.owner.name,
      department: project.value.owner.department,
      source: '项目负责人',
    })
  }
  for (const member of projectMembers.value) {
    map.set(member.userId, {
      id: member.userId,
      name: member.user.name,
      department: member.user.department,
      source: member.role === 'owner' ? '项目负责人' : '项目成员',
    })
  }
  for (const dept of departments.value) {
    const headName = dept.head_name?.trim()
    if (!headName) continue
    const matchedUser = users.value.find((user) => user.name === headName || (user.department === dept.name && user.role === 'head'))
    if (matchedUser && !map.has(matchedUser.id)) {
      map.set(matchedUser.id, {
        id: matchedUser.id,
        name: matchedUser.name,
        department: dept.name,
        source: '部门负责人',
      })
    }
  }
  for (const user of users.value.filter((item) => item.role === 'head')) {
    if (!map.has(user.id)) {
      map.set(user.id, {
        id: user.id,
        name: user.name,
        department: user.department,
        source: '部门负责人',
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.source.localeCompare(b.source, 'zh-CN') || a.name.localeCompare(b.name, 'zh-CN'))
})

const ganttRange = computed(() => {
  const dates: number[] = []
  if (project.value?.startDate) dates.push(new Date(project.value.startDate).getTime())
  if (project.value?.targetDate) dates.push(new Date(project.value.targetDate).getTime())
  if (project.value?.endDate) dates.push(new Date(project.value.endDate).getTime())
  for (const task of ganttTasks.value) {
    if (task.startDate) dates.push(new Date(task.startDate).getTime())
    if (task.dueDate) dates.push(new Date(task.dueDate).getTime())
  }
  if (dates.length === 0) {
    const now = Date.now()
    return { start: now, end: now + 30 * 86400000, days: 30 }
  }
  const start = Math.min(...dates) - 3 * 86400000
  const end = Math.max(...dates) + 3 * 86400000
  return { start, end, days: Math.max(1, Math.ceil((end - start) / 86400000)) }
})

const ganttMonthMarks = computed(() => {
  const marks: { label: string; left: number }[] = []
  const start = new Date(ganttRange.value.start)
  const end = new Date(ganttRange.value.end)
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cursor <= end) {
    marks.push({
      label: `${cursor.getMonth() + 1}月`,
      left: ((cursor.getTime() - ganttRange.value.start) / (ganttRange.value.end - ganttRange.value.start)) * 100,
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return marks
})

const ganttDateMarks = computed(() => {
  const marks: { label: string; left: number }[] = []
  const range = ganttRange.value.end - ganttRange.value.start
  const stepDays = ganttRange.value.days > 120 ? 30 : ganttRange.value.days > 60 ? 14 : 7
  const cursor = new Date(ganttRange.value.start)
  cursor.setHours(0, 0, 0, 0)
  while (cursor.getTime() <= ganttRange.value.end) {
    marks.push({
      label: `${cursor.getMonth() + 1}/${cursor.getDate()}`,
      left: ((cursor.getTime() - ganttRange.value.start) / range) * 100,
    })
    cursor.setDate(cursor.getDate() + stepDays)
  }
  return marks
})

onMounted(async () => {
  await loadAll()
})

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadProject(), loadKanban(), loadStats(), loadGantt(), loadFiles(), loadApprovalProgress(), loadUsers(), loadDepartments()])
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

async function loadProject() {
  try {
    project.value = await fetchProject(projectId)
  } catch {
    router.push('/projects')
  }
}

async function loadKanban() {
  try {
    kanbanData.value = await fetchKanban(projectId)
  } catch {
    console.error('Failed to load kanban')
  }
}

async function loadStats() {
  try {
    stats.value = await fetchProjectStats(projectId)
  } catch {
    // ignore
  }
}

async function loadGantt() {
  try {
    const result = await fetchProjectGantt(projectId)
    ganttTasks.value = result.tasks
  } catch {
    ganttTasks.value = []
  }
}

async function loadFiles() {
  try {
    files.value = await fetchProjectFiles(projectId)
  } catch {
    files.value = []
  }
}

async function loadApprovalProgress() {
  try {
    approvalProgress.value = await fetchProjectApprovalProgress(projectId)
  } catch {
    approvalProgress.value = null
  }
}

function openCreateTask() {
  editingTask.value = null
  taskForm.value = {
    title: '',
    description: '',
    priority: 'medium',
    assigneeId: '',
    startDate: '',
    dueDate: '',
    progress: 0,
    relativeToTarget: Boolean(project.value?.targetDate || project.value?.endDate),
    startOffsetValue: 8,
    startOffsetUnit: 'week',
    dueOffsetValue: 4,
    dueOffsetUnit: 'week',
    startOffsetDays: -56,
    dueOffsetDays: -28,
  }
  taskDialogVisible.value = true
}

function dateInput(date?: string | null) {
  if (!date) return ''
  return new Date(date).toISOString().slice(0, 10)
}

function offsetParts(days?: number | null) {
  const positive = Math.abs(days ?? 0)
  if (positive > 0 && positive % 7 === 0) return { value: positive / 7, unit: 'week' }
  return { value: positive || 1, unit: 'day' }
}

function openEditTask(task: Task) {
  taskDetailVisible.value = false
  editingTask.value = task
  const start = offsetParts(task.startOffsetDays)
  const due = offsetParts(task.dueOffsetDays)
  taskForm.value = {
    title: task.title || '',
    description: task.description || '',
    priority: task.priority || 'medium',
    assigneeId: task.assigneeId || '',
    startDate: dateInput(task.startDate),
    dueDate: dateInput(task.dueDate),
    progress: task.progress || 0,
    relativeToTarget: Boolean(task.relativeToTarget),
    startOffsetValue: start.value,
    startOffsetUnit: start.unit,
    dueOffsetValue: due.value,
    dueOffsetUnit: due.unit,
    startOffsetDays: task.startOffsetDays ?? -start.value,
    dueOffsetDays: task.dueOffsetDays ?? -due.value,
  }
  taskDialogVisible.value = true
}

function offsetToDays(value: number, unit: string) {
  const days = Math.max(0, Number(value) || 0) * (unit === 'week' ? 7 : 1)
  return -days
}

async function handleSaveTask() {
  if (!taskForm.value.title.trim()) {
    ElMessage.warning('请输入任务标题')
    return
  }
  try {
    const payload = {
      projectId,
      title: taskForm.value.title,
      description: taskForm.value.description,
      priority: taskForm.value.priority,
      assigneeId: taskForm.value.assigneeId || undefined,
      startDate: taskForm.value.relativeToTarget ? undefined : taskForm.value.startDate || undefined,
      dueDate: taskForm.value.relativeToTarget ? undefined : taskForm.value.dueDate || undefined,
      progress: taskForm.value.progress,
      relativeToTarget: taskForm.value.relativeToTarget,
      startOffsetDays: taskForm.value.relativeToTarget ? offsetToDays(taskForm.value.startOffsetValue, taskForm.value.startOffsetUnit) : null,
      dueOffsetDays: taskForm.value.relativeToTarget ? offsetToDays(taskForm.value.dueOffsetValue, taskForm.value.dueOffsetUnit) : null,
    }
    if (editingTask.value) {
      await updateTask(editingTask.value.id, payload as any)
      ElMessage.success('任务已更新')
    } else {
      await createTask(payload)
      ElMessage.success('任务已创建')
    }
    taskDialogVisible.value = false
    editingTask.value = null
    await Promise.all([loadProject(), loadKanban(), loadStats(), loadGantt()])
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '保存失败')
  }
}

async function handleDragTask(taskId: string, newStatus: string) {
  try {
    await updateTask(taskId, { status: newStatus } as any)
    await Promise.all([loadProject(), loadKanban(), loadStats(), loadGantt()])
  } catch {
    ElMessage.error('更新任务状态失败')
  }
}

async function handleDownloadTaskTemplate() {
  try {
    await downloadTaskImportTemplate()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '下载任务导入模板失败')
  }
}

function triggerTaskImport() {
  taskImportInput.value?.click()
}

async function handleTaskImportPicked(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  importingTasks.value = true
  try {
    const result = await importTasksFromExcel(projectId, file)
    ElMessage.success(result.message || `成功导入 ${result.importedCount || 0} 个任务`)
    await Promise.all([loadProject(), loadKanban(), loadStats(), loadGantt()])
  } catch (error: any) {
    const details = error?.response?.data?.details
    const message = error?.response?.data?.error || '导入任务失败'
    if (Array.isArray(details) && details.length) {
      ElMessageBox.alert(details.join('\n'), message, {
        confirmButtonText: '我知道了',
        customClass: 'task-import-error-dialog',
      })
    } else {
      ElMessage.error(message)
    }
  } finally {
    importingTasks.value = false
    target.value = ''
  }
}

async function handleDeleteTask(task: Task) {
  try {
    await ElMessageBox.confirm(`确定删除任务"${task.title}"？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteTask(task.id)
    await Promise.all([loadProject(), loadKanban(), loadStats(), loadGantt()])
  } catch {
    // cancelled
  }
}

async function openTaskDetail(task: Task) {
  try {
    selectedTask.value = await fetchTask(task.id)
    taskCompletionNote.value = selectedTask.value.completionNote || ''
    taskDetailVisible.value = true
    await Promise.all([loadSelectedTaskFiles(task.id), loadSelectedTaskApproval(task.id)])
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '打开任务失败')
  }
}

async function loadSelectedTaskFiles(taskId: string) {
  try {
    selectedTaskFiles.value = await fetchTaskFiles(taskId)
  } catch {
    selectedTaskFiles.value = []
  }
}

async function loadSelectedTaskApproval(taskId: string) {
  try {
    selectedTaskApproval.value = await fetchTaskApprovalProgress(taskId)
  } catch {
    selectedTaskApproval.value = null
  }
}

function goBack() {
  router.push('/projects')
}

function getColumnTasks(key: string): Task[] {
  return kanbanData.value[key] || []
}

function priorityColor(p: string): string {
  const map: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }
  return map[p] || '#64748b'
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function countdownText(): string {
  const days = project.value?.timing?.daysRemaining
  if (days === null || days === undefined) return '未设置目标日期'
  if (days < 0) return `已超过目标 ${Math.abs(days)} 天`
  if (days === 0) return '今天到期'
  return `距离目标还有 ${days} 天`
}

function isTaskDone(task: Task) {
  return task.status === 'done' || Boolean(task.completedAt) || Number(task.progress || 0) >= 100
}

function isTaskOverdue(task: Task) {
  if (isTaskDone(task) || !task.dueDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(task.dueDate)
  due.setHours(0, 0, 0, 0)
  return due.getTime() < today.getTime()
}

function ganttTaskColor(task: Task) {
  if (isTaskDone(task)) return '#16a34a'
  if (isTaskOverdue(task)) return '#dc2626'
  return priorityColor(task.priority)
}

function ganttTaskTone(task: Task) {
  if (isTaskDone(task)) return 'done'
  if (isTaskOverdue(task)) return 'overdue'
  return 'active'
}

function taskBarStyle(task: Task) {
  const start = task.startDate ? new Date(task.startDate).getTime() : task.dueDate ? new Date(task.dueDate).getTime() - 86400000 : ganttRange.value.start
  const end = task.dueDate ? new Date(task.dueDate).getTime() : start + 86400000
  const widthBase = ganttRange.value.end - ganttRange.value.start
  const left = Math.max(0, ((start - ganttRange.value.start) / widthBase) * 100)
  const width = Math.max(2, ((Math.max(end, start + 86400000) - start) / widthBase) * 100)
  return { left: `${left}%`, width: `${Math.min(100 - left, width)}%`, background: ganttTaskColor(task) }
}

function targetLineLeft(): string | null {
  if (!project.value?.targetDate) return null
  const target = new Date(project.value.targetDate).getTime()
  const left = ((target - ganttRange.value.start) / (ganttRange.value.end - ganttRange.value.start)) * 100
  if (left < 0 || left > 100) return null
  return `${left}%`
}

function fileSize(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function displayFileName(name: string) {
  try {
    const bytes = new Uint8Array(Array.from(name).map((char) => char.charCodeAt(0) & 0xff))
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    const originalCjk = (name.match(/[\u4e00-\u9fa5]/g) || []).length
    const decodedCjk = (decoded.match(/[\u4e00-\u9fa5]/g) || []).length
    return decodedCjk > originalCjk && !decoded.includes('�') ? decoded : name
  } catch {
    return name
  }
}

function triggerUpload() {
  fileInput.value?.click()
}

function triggerTaskUpload() {
  taskFileInput.value?.click()
}

async function handleFilePicked(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    await uploadProjectFile(projectId, file, 'support')
    ElMessage.success('支持文件已上传')
    await Promise.all([loadProject(), loadFiles()])
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '上传失败')
  } finally {
    uploading.value = false
    target.value = ''
  }
}

async function handleTaskFilePicked(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file || !selectedTask.value) return
  taskUploading.value = true
  try {
    await uploadTaskFile(selectedTask.value.id, file, 'completion')
    ElMessage.success('任务支持文件已上传')
    await loadSelectedTaskFiles(selectedTask.value.id)
    await Promise.all([loadKanban(), loadGantt()])
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '上传失败')
  } finally {
    taskUploading.value = false
    target.value = ''
  }
}

async function handleDownload(file: ProjectFile) {
  try {
    await downloadProjectFile(file.id, file.originalName)
  } catch {
    ElMessage.error('下载失败')
  }
}

async function handleDownloadTaskFile(file: TaskFile) {
  try {
    await downloadTaskFile(file.id, displayFileName(file.originalName))
  } catch {
    ElMessage.error('下载失败')
  }
}

async function handleDeleteFile(file: ProjectFile) {
  try {
    await ElMessageBox.confirm(`确定删除文件"${file.originalName}"？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteProjectFile(projectId, file.id)
    ElMessage.success('文件已删除')
    await Promise.all([loadProject(), loadFiles()])
  } catch {
    // cancelled
  }
}

async function handleDeleteTaskFile(file: TaskFile) {
  if (!selectedTask.value) return
  try {
    await ElMessageBox.confirm(`确定删除文件"${file.originalName}"？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteTaskFile(selectedTask.value.id, file.id)
    ElMessage.success('文件已删除')
    await loadSelectedTaskFiles(selectedTask.value.id)
  } catch {
    // cancelled
  }
}

async function handleSubmitCompletion() {
  if (files.value.length === 0) {
    ElMessage.warning('请先上传项目完成支持文件')
    viewMode.value = 'files'
    return
  }
  try {
    await submitProjectCompletion(projectId, completionNote.value)
    ElMessage.success('项目完成申请已提交')
    completionDialogVisible.value = false
    completionNote.value = ''
    await Promise.all([loadProject(), loadApprovalProgress()])
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '提交失败')
  }
}

async function handleSubmitTaskCompletion() {
  if (!selectedTask.value) return
  if (selectedTaskFiles.value.length === 0) {
    ElMessage.warning('请先上传任务完成支持文件')
    return
  }
  try {
    await submitTaskCompletion(selectedTask.value.id, taskCompletionNote.value)
    ElMessage.success('任务完成申请已提交')
    selectedTask.value = await fetchTask(selectedTask.value.id)
    await Promise.all([
      loadSelectedTaskApproval(selectedTask.value.id),
      loadProject(),
      loadKanban(),
      loadStats(),
      loadGantt(),
    ])
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '提交失败')
  }
}

function approvalStatusLabel(status: string): string {
  const map: Record<string, string> = {
    not_submitted: '未提交',
    pending_completion_approval: '完成审批中',
    approved: '已通过',
    completed: '已完成',
    rejected: '已驳回',
  }
  return map[status] || status
}

function taskStatusLabel(status: string): string {
  return columns.find((col) => col.key === status)?.label || status
}

function exportRows(source: 'list' | 'gantt') {
  const tasks = source === 'gantt' ? ganttTasks.value : allTasks.value
  return tasks.map((task, index) => ({
    序号: index + 1,
    任务名称: task.title,
    负责人: task.assignee?.name || '',
    状态: taskStatusLabel(task.status),
    优先级: task.priority === 'high' ? '高' : task.priority === 'low' ? '低' : '中',
    进度: `${task.progress || (task.status === 'done' ? 100 : 0)}%`,
    开始日期: formatDate(task.startDate),
    截止日期: formatDate(task.dueDate),
    倒推计划: task.relativeToTarget ? `开始 ${task.startOffsetDays ?? '-'} 天，截止 ${task.dueOffsetDays ?? '-'} 天` : '',
    任务说明: task.description || '',
  }))
}

function getTaskStartTime(task: Task) {
  return task.startDate
    ? new Date(task.startDate).getTime()
    : task.dueDate
      ? new Date(task.dueDate).getTime()
      : ganttRange.value.start
}

function getTaskEndTime(task: Task) {
  const start = getTaskStartTime(task)
  return task.dueDate ? new Date(task.dueDate).getTime() : start
}

function getGanttDateColumns() {
  const dates: { label: string; time: number }[] = []
  const stepDays = ganttRange.value.days > 120 ? 14 : ganttRange.value.days > 60 ? 7 : 3
  const cursor = new Date(ganttRange.value.start)
  cursor.setHours(0, 0, 0, 0)
  while (cursor.getTime() <= ganttRange.value.end) {
    dates.push({ label: `${cursor.getMonth() + 1}/${cursor.getDate()}`, time: cursor.getTime() })
    cursor.setDate(cursor.getDate() + stepDays)
  }
  return dates
}

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function exportExcel(source: 'list' | 'gantt') {
  const rows = exportRows(source)
  if (rows.length === 0) {
    ElMessage.warning('暂无可导出的任务')
    return
  }

  if (source === 'gantt') {
    const dateColumns = getGanttDateColumns()
    const headers = ['序号', '任务名称', '负责人', '状态', '开始日期', '截止日期', ...dateColumns.map((item) => item.label)]
    const body = ganttTasks.value.map((task, index) => {
      const start = getTaskStartTime(task)
      const end = getTaskEndTime(task)
      return [
        index + 1,
        task.title,
        task.assignee?.name || '',
        taskStatusLabel(task.status),
        formatDate(task.startDate),
        formatDate(task.dueDate),
        ...dateColumns.map((column) => (column.time >= start && column.time <= end ? '■' : '')),
      ]
    })
    const html = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            table { border-collapse: collapse; font-family: Arial, "Microsoft YaHei", sans-serif; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; white-space: nowrap; }
            th { background: #eaf2ff; color: #1d4ed8; }
            td.timeline { text-align: center; font-weight: 700; }
            td.timeline.active { color: #2563eb; background: #eff6ff; }
            td.timeline.done { color: #16a34a; background: #dcfce7; }
            td.timeline.overdue { color: #dc2626; background: #fee2e2; }
          </style>
        </head>
        <body>
          <table>
            <caption>${escapeHtml(project.value?.name || '项目任务')} - 甘特图</caption>
            <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
            <tbody>
              ${body.map((row, rowIndex) => {
                const tone = ganttTaskTone(ganttTasks.value[rowIndex])
                return `<tr>${row.map((cell, index) => `<td class="${index >= 6 && cell ? `timeline ${tone}` : ''}">${escapeHtml(cell)}</td>`).join('')}</tr>`
              }).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `
    downloadBlob(`\ufeff${html}`, `${project.value?.name || '项目'}-甘特图.xls`, 'application/vnd.ms-excel;charset=utf-8')
    return
  }

  const headers = Object.keys(rows[0])
  const html = `
    <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <table border="1">
          <caption>${escapeHtml(project.value?.name || '项目任务')} - 任务列表</caption>
          <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml((row as any)[header])}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `
  downloadBlob(`\ufeff${html}`, `${project.value?.name || '项目'}-任务列表.xls`, 'application/vnd.ms-excel;charset=utf-8')
}

function buildListExportHtml(rows: ReturnType<typeof exportRows>) {
  const headers = ['序号', '任务名称', '负责人', '状态', '优先级', '进度', '开始日期', '截止日期']
  return `
    <div class="pdf-report">
      <h1>${escapeHtml(project.value?.name || '项目')} - 任务列表</h1>
      <p>导出日期：${escapeHtml(new Date().toLocaleString('zh-CN'))}</p>
      <table>
        <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
        <tbody>
          ${rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml((row as any)[header])}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>
  `
}

function buildGanttExportHtml() {
  const dateColumns = getGanttDateColumns()
  return `
    <div class="pdf-report gantt-pdf-report">
      <h1>${escapeHtml(project.value?.name || '项目')} - 任务甘特图</h1>
      <p>导出日期：${escapeHtml(new Date().toLocaleString('zh-CN'))}　范围：${escapeHtml(formatDate(new Date(ganttRange.value.start).toISOString()))} 至 ${escapeHtml(formatDate(new Date(ganttRange.value.end).toISOString()))}</p>
      <div class="gantt-export" style="--gantt-columns: ${dateColumns.length}">
        <div class="gantt-export-head task-name">任务</div>
        ${dateColumns.map((column) => `<div class="gantt-export-head date">${escapeHtml(column.label)}</div>`).join('')}
        ${ganttTasks.value.map((task) => {
          const start = getTaskStartTime(task)
          const end = getTaskEndTime(task)
          return `
            <div class="task-name row-name">
              <strong>${escapeHtml(task.title)}</strong>
              <span>${escapeHtml(task.assignee?.name || '未分配')} · ${escapeHtml(taskStatusLabel(task.status))}</span>
            </div>
            ${dateColumns.map((column) => `<div class="date-cell ${column.time >= start && column.time <= end ? ganttTaskTone(task) : ''}"></div>`).join('')}
          `
        }).join('')}
      </div>
    </div>
  `
}

async function renderHtmlToPdf(html: string, filename: string, orientation: 'portrait' | 'landscape' = 'landscape') {
  const wrapper = document.createElement('div')
  wrapper.className = 'pdf-render-root'
  wrapper.innerHTML = html
  document.body.appendChild(wrapper)
  try {
    const canvas = await html2canvas(wrapper, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    })
    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const imgWidth = pageWidth - 16
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    let position = 8
    const image = canvas.toDataURL('image/png')
    doc.addImage(image, 'PNG', 8, position, imgWidth, imgHeight)
    heightLeft -= pageHeight - 16
    while (heightLeft > 0) {
      doc.addPage()
      position = heightLeft - imgHeight + 8
      doc.addImage(image, 'PNG', 8, position, imgWidth, imgHeight)
      heightLeft -= pageHeight - 16
    }
    doc.save(filename)
  } finally {
    wrapper.remove()
  }
}

async function exportPdf(source: 'list' | 'gantt') {
  const rows = exportRows(source)
  if (rows.length === 0) {
    ElMessage.warning('暂无可导出的任务')
    return
  }
  const html = source === 'gantt' ? buildGanttExportHtml() : buildListExportHtml(rows)
  await renderHtmlToPdf(html, `${project.value?.name || '项目'}-${source === 'gantt' ? '甘特图' : '任务列表'}.pdf`, 'landscape')
}
</script>

<template>
  <PageTransition>
    <div class="page" v-if="project" v-loading="loading">
      <div class="page-header">
        <div class="header-left">
          <button class="back-btn" type="button" @click="goBack"><ArrowLeft :size="20" /></button>
          <div>
            <h1 class="page-title">{{ project.name }}</h1>
            <p class="page-desc" v-if="project.description">{{ project.description }}</p>
            <div class="header-meta">
              <span>负责人：{{ project.owner?.name || '未指定' }}</span>
              <span>部门：{{ project.department || '-' }}</span>
              <span>目标：{{ formatDate(project.targetDate || project.endDate) }}</span>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <div class="view-switcher">
            <button :class="{ active: viewMode === 'kanban' }" title="看板" @click="viewMode = 'kanban'"><LayoutGrid :size="16" /></button>
            <button :class="{ active: viewMode === 'list' }" title="列表" @click="viewMode = 'list'"><List :size="16" /></button>
            <button :class="{ active: viewMode === 'gantt' }" title="甘特图" @click="viewMode = 'gantt'"><CalendarRange :size="16" /></button>
            <button :class="{ active: viewMode === 'files' }" title="支持文件" @click="viewMode = 'files'"><FileText :size="16" /></button>
            <button :class="{ active: viewMode === 'approval' }" title="完成审批" @click="viewMode = 'approval'"><CheckCircle2 :size="16" /></button>
          </div>
          <el-button @click="handleDownloadTaskTemplate">
            <Download :size="16" />
            下载导入模板
          </el-button>
          <el-button :loading="importingTasks" @click="triggerTaskImport">
            <UploadCloud :size="16" />
            导入任务
          </el-button>
          <input
            ref="taskImportInput"
            class="hidden-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            @change="handleTaskImportPicked"
          />
          <el-button type="primary" @click="openCreateTask">
            <Plus :size="16" />
            {{ t('project.createTask') }}
          </el-button>
        </div>
      </div>

      <div class="project-summary">
        <div class="summary-main">
          <span class="summary-label">{{ project.countdownLabel || project.timing?.targetName || '目标倒计时' }}</span>
          <strong>{{ countdownText() }}</strong>
          <el-progress :percentage="project.timing?.timeProgress || 0" :stroke-width="8" :show-text="false" />
        </div>
        <div class="summary-stat">
          <span>任务进度</span>
          <b>{{ project.progress || stats?.progress || 0 }}%</b>
        </div>
        <div class="summary-stat">
          <span>已完成/总任务</span>
          <b>{{ stats?.done || 0 }}/{{ stats?.total || 0 }}</b>
        </div>
        <div class="summary-stat danger">
          <span>逾期任务</span>
          <b>{{ stats?.overdue || 0 }}</b>
        </div>
        <div class="summary-stat">
          <span>支持文件</span>
          <b>{{ files.length }}</b>
        </div>
      </div>

      <div v-if="viewMode === 'kanban'" class="kanban-board">
        <div
          v-for="col in columns"
          :key="col.key"
          class="kanban-column"
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
              @click="openTaskDetail(task)"
              @dragstart="($event) => $event.dataTransfer?.setData('text/plain', task.id)"
            >
              <div class="card-top">
                <span class="priority-dot" :style="{ background: priorityColor(task.priority) }"></span>
                <span class="card-title-text">{{ task.title }}</span>
                <button class="mini-icon" type="button" title="编辑任务" @click.stop="openEditTask(task)"><Edit3 :size="13" /></button>
                <button class="mini-icon danger" type="button" title="删除任务" @click.stop="handleDeleteTask(task)"><Trash2 :size="13" /></button>
              </div>
              <p class="task-desc" v-if="task.description">{{ task.description }}</p>
              <div class="card-meta">
                <span>{{ task.assignee?.name || '未分配' }}</span>
                <span>{{ formatDate(task.dueDate) }}</span>
                <span>附件 {{ task._count?.files || 0 }}</span>
              </div>
              <el-progress :percentage="task.progress || (task.status === 'done' ? 100 : 0)" :stroke-width="5" :show-text="false" />
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="viewMode === 'list'" class="list-view">
        <div class="export-toolbar">
          <div>
            <strong>任务列表</strong>
            <span>共 {{ allTasks.length }} 项任务</span>
          </div>
          <div class="export-actions">
            <el-button size="small" @click="exportExcel('list')"><Download :size="14" />Excel</el-button>
            <el-button size="small" @click="exportPdf('list')"><Download :size="14" />PDF</el-button>
          </div>
        </div>
        <div class="list-item header">
          <span>任务</span><span>负责人</span><span>开始</span><span>截止</span><span>状态</span>
        </div>
        <div v-for="task in allTasks" :key="task.id" class="list-item">
          <span><i class="priority-dot" :style="{ background: priorityColor(task.priority) }"></i>{{ task.title }}</span>
          <span>{{ task.assignee?.name || '-' }}</span>
          <span>{{ formatDate(task.startDate) }}</span>
          <span>{{ formatDate(task.dueDate) }}</span>
          <span>{{ columns.find((col) => col.key === task.status)?.label || task.status }}</span>
        </div>
        <el-empty v-if="allTasks.length === 0" description="暂无任务" />
      </div>

      <div v-else-if="viewMode === 'gantt'" class="gantt-view">
        <div class="export-toolbar">
          <div>
            <strong>任务甘特图</strong>
            <span>{{ formatDate(new Date(ganttRange.start).toISOString()) }} 至 {{ formatDate(new Date(ganttRange.end).toISOString()) }}</span>
          </div>
          <div class="export-actions">
            <el-button size="small" @click="exportExcel('gantt')"><Download :size="14" />Excel</el-button>
            <el-button size="small" @click="exportPdf('gantt')"><Download :size="14" />PDF</el-button>
          </div>
        </div>
        <div class="gantt-head">
          <div class="gantt-title">任务甘特图</div>
          <div class="gantt-scale">
            <span v-for="mark in ganttMonthMarks" :key="mark.label + mark.left" :style="{ left: mark.left + '%' }">{{ mark.label }}</span>
            <b v-for="mark in ganttDateMarks" :key="'d' + mark.label + mark.left" :style="{ left: mark.left + '%' }">{{ mark.label }}</b>
          </div>
        </div>
        <div class="gantt-body">
          <div v-if="targetLineLeft()" class="target-line" :style="{ left: targetLineLeft()! }">
            <span>{{ project.targetName || '目标日' }}</span>
          </div>
          <div v-for="task in ganttTasks" :key="task.id" class="gantt-row">
            <div class="gantt-task-name">
              <strong>{{ task.title }}</strong>
              <small>{{ task.assignee?.name || '未分配' }}</small>
            </div>
            <div class="gantt-track">
              <span v-for="mark in ganttDateMarks" :key="'tick' + task.id + mark.left" class="gantt-tick" :style="{ left: mark.left + '%' }"></span>
              <div class="gantt-bar" :style="taskBarStyle(task)">
                <span>{{ formatShortDate(task.startDate) }} - {{ formatShortDate(task.dueDate) }}</span>
              </div>
            </div>
          </div>
          <el-empty v-if="ganttTasks.length === 0" description="暂无可展示的任务日期" />
        </div>
      </div>

      <div v-else-if="viewMode === 'files'" class="files-view">
        <div class="section-toolbar">
          <div>
            <h3>完成支持文件</h3>
            <p>上传验收单、照片、表格、扫描件或压缩包，作为项目完成审批依据。</p>
          </div>
          <el-button type="primary" :loading="uploading" @click="triggerUpload">
            <UploadCloud :size="16" />
            上传文件
          </el-button>
          <input ref="fileInput" class="hidden-input" type="file" @change="handleFilePicked" />
        </div>
        <div class="file-list">
          <div v-for="file in files" :key="file.id" class="file-row">
            <FileText :size="18" />
            <div class="file-main">
              <strong>{{ file.originalName }}</strong>
              <span>{{ fileSize(file.size) }} · {{ file.uploader?.name || '未知上传人' }} · {{ formatDate(file.uploadedAt) }}</span>
            </div>
            <button class="icon-btn" type="button" title="下载" @click="handleDownload(file)"><Download :size="16" /></button>
            <button class="icon-btn danger" type="button" title="删除" @click="handleDeleteFile(file)"><Trash2 :size="16" /></button>
          </div>
          <el-empty v-if="files.length === 0" description="暂无支持文件" />
        </div>
      </div>

      <div v-else class="approval-view">
        <div class="section-toolbar">
          <div>
            <h3>项目完成审批</h3>
            <p>当前状态：{{ approvalStatusLabel(approvalProgress?.status || 'not_submitted') }}</p>
          </div>
          <el-button type="success" :disabled="approvalProgress?.status === 'pending_completion_approval' || project.status === 'completed'" @click="completionDialogVisible = true">
            <CheckCircle2 :size="16" />
            提交完成审批
          </el-button>
        </div>
        <div class="approval-summary">
          <div><span>已审批</span><b>{{ approvalProgress?.approvedCount || 0 }}</b></div>
          <div><span>待审批</span><b>{{ approvalProgress?.pendingCount || 0 }}</b></div>
          <div><span>驳回</span><b>{{ approvalProgress?.rejectedCount || 0 }}</b></div>
        </div>
        <el-timeline>
          <el-timeline-item
            v-for="record in approvalProgress?.records || []"
            :key="record.id"
            :type="record.status === 'approved' ? 'success' : record.status === 'rejected' ? 'danger' : 'warning'"
            :timestamp="formatDate(record.createdAt)"
          >
            <div class="approval-record">
              <strong>{{ record.approver.name }}</strong>
              <span>{{ record.status === 'approved' ? '已通过' : record.status === 'rejected' ? '已驳回' : '待审批' }}</span>
              <p v-if="record.comment">{{ record.comment }}</p>
            </div>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-if="!approvalProgress?.records?.length" description="尚未提交完成审批" />
      </div>

      <el-dialog v-model="taskDialogVisible" :title="editingTask ? '编辑任务' : '创建任务'" width="680px">
        <el-form :model="taskForm" label-position="top" class="task-form">
          <el-form-item label="任务标题" required class="span-2">
            <el-input v-model="taskForm.title" />
          </el-form-item>
          <el-form-item label="任务说明" class="span-2">
            <el-input v-model="taskForm.description" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="负责人">
            <el-select v-model="taskForm.assigneeId" filterable clearable placeholder="选择负责人">
              <el-option
                v-for="user in assigneeOptions"
                :key="user.id"
                :label="`${user.name}${user.department ? ' · ' + user.department : ''} · ${user.source}`"
                :value="user.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="优先级">
            <el-select v-model="taskForm.priority">
              <el-option label="高" value="high" />
              <el-option label="中" value="medium" />
              <el-option label="低" value="low" />
            </el-select>
          </el-form-item>
          <el-form-item label="按目标日期倒推" class="span-2">
            <el-switch v-model="taskForm.relativeToTarget" :disabled="!(project.targetDate || project.endDate)" active-text="开启" inactive-text="关闭" />
          </el-form-item>
          <template v-if="taskForm.relativeToTarget">
            <el-form-item label="开始时间">
              <div class="offset-control">
                <span>目标日前</span>
                <el-input-number v-model="taskForm.startOffsetValue" :min="0" :max="2000" style="width:120px" />
                <el-select v-model="taskForm.startOffsetUnit" style="width:90px">
                  <el-option label="天" value="day" />
                  <el-option label="周" value="week" />
                </el-select>
              </div>
            </el-form-item>
            <el-form-item label="截止时间">
              <div class="offset-control">
                <span>目标日前</span>
                <el-input-number v-model="taskForm.dueOffsetValue" :min="0" :max="2000" style="width:120px" />
                <el-select v-model="taskForm.dueOffsetUnit" style="width:90px">
                  <el-option label="天" value="day" />
                  <el-option label="周" value="week" />
                </el-select>
              </div>
            </el-form-item>
          </template>
          <template v-else>
            <el-form-item label="开始日期">
              <el-date-picker v-model="taskForm.startDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
            <el-form-item label="截止日期">
              <el-date-picker v-model="taskForm.dueDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </template>
        </el-form>
        <template #footer>
          <el-button @click="taskDialogVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" @click="handleSaveTask">{{ editingTask ? '保存' : t('common.create') }}</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="taskDetailVisible" title="任务完成" width="720px" class="task-detail-dialog">
        <div v-if="selectedTask" class="task-detail">
          <div class="task-detail-head">
            <div>
              <h3>{{ selectedTask.title }}</h3>
              <p v-if="selectedTask.description">{{ selectedTask.description }}</p>
            </div>
            <div class="task-detail-actions">
              <el-button size="small" @click="openEditTask(selectedTask)">
                <Edit3 :size="14" />
                编辑任务
              </el-button>
              <el-tag :type="selectedTask.status === 'done' ? 'success' : selectedTask.status === 'review' ? 'warning' : 'info'">
                {{ taskStatusLabel(selectedTask.status) }}
              </el-tag>
            </div>
          </div>

          <div class="task-detail-meta">
            <span>负责人：{{ selectedTask.assignee?.name || '未分配' }}</span>
            <span>开始：{{ formatDate(selectedTask.startDate) }}</span>
            <span>截止：{{ formatDate(selectedTask.dueDate) }}</span>
            <span>进度：{{ selectedTask.progress || 0 }}%</span>
          </div>

          <div class="section-toolbar compact">
            <div>
              <h3>任务完成支持文件</h3>
              <p>上传照片、验收单、表格、报告或压缩包作为完成依据。</p>
            </div>
            <el-button type="primary" :loading="taskUploading" @click="triggerTaskUpload">
              <UploadCloud :size="16" />
              上传文件
            </el-button>
            <input ref="taskFileInput" class="hidden-input" type="file" @change="handleTaskFilePicked" />
          </div>

          <div class="file-list task-file-list">
            <div v-for="file in selectedTaskFiles" :key="file.id" class="file-row">
              <FileText :size="18" />
              <div class="file-main">
                <strong>{{ displayFileName(file.originalName) }}</strong>
                <span>{{ fileSize(file.size) }} · {{ file.uploader?.name || '未知上传人' }} · {{ formatDate(file.uploadedAt) }}</span>
              </div>
              <button class="icon-btn" type="button" title="下载" @click="handleDownloadTaskFile(file)"><Download :size="16" /></button>
              <button class="icon-btn danger" type="button" title="删除" @click="handleDeleteTaskFile(file)"><Trash2 :size="16" /></button>
            </div>
            <el-empty v-if="selectedTaskFiles.length === 0" description="暂无任务支持文件" />
          </div>

          <el-form label-position="top" class="task-completion-form">
            <el-form-item label="完成说明">
              <el-input v-model="taskCompletionNote" type="textarea" :rows="3" placeholder="说明任务完成内容、验收情况和需审批人关注的事项" />
            </el-form-item>
          </el-form>

          <div class="approval-summary task-approval-summary">
            <div><span>已审批</span><b>{{ selectedTaskApproval?.approvedCount || 0 }}</b></div>
            <div><span>待审批</span><b>{{ selectedTaskApproval?.pendingCount || 0 }}</b></div>
            <div><span>驳回</span><b>{{ selectedTaskApproval?.rejectedCount || 0 }}</b></div>
          </div>
        </div>
        <template #footer>
          <el-button @click="taskDetailVisible = false">关闭</el-button>
          <el-button
            type="success"
            :disabled="selectedTask?.status === 'done' || selectedTaskApproval?.status === 'pending_completion_approval'"
            @click="handleSubmitTaskCompletion"
          >
            提交完成审批
          </el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="completionDialogVisible" title="提交项目完成审批" width="520px">
        <el-alert v-if="files.length === 0" type="warning" show-icon title="请先上传完成支持文件" />
        <el-form label-position="top" style="margin-top: 14px">
          <el-form-item label="提交说明">
            <el-input v-model="completionNote" type="textarea" :rows="4" placeholder="说明已完成内容、验收情况和需要审批人关注的事项" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="completionDialogVisible = false">取消</el-button>
          <el-button type="success" @click="handleSubmitCompletion">提交审批</el-button>
        </template>
      </el-dialog>
    </div>
  </PageTransition>
</template>

<style scoped>
.page { padding: 0; }
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
.header-left { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  color: var(--text-secondary);
  margin-top: 4px;
}
.back-btn:hover { background: var(--hover-bg); }
.page-title { font-size: 22px; font-weight: 700; margin: 0; color: var(--text-primary); }
.page-desc { font-size: 13px; color: var(--text-secondary); margin: 4px 0 0; }
.header-meta { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; color: var(--text-tertiary); font-size: 12px; }
.header-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.view-switcher {
  display: flex;
  gap: 2px;
  background: var(--bg-secondary, #f3f4f6);
  border-radius: 8px;
  padding: 3px;
}
.view-switcher button {
  width: 32px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  color: var(--text-secondary);
}
.view-switcher button.active { background: white; color: var(--text-primary); box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.project-summary {
  display: grid;
  grid-template-columns: minmax(260px, 1.5fr) repeat(4, minmax(110px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}
.summary-main, .summary-stat {
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 10px;
  padding: 14px;
}
.summary-main strong { display: block; font-size: 22px; margin: 4px 0 10px; color: #1f4f8f; }
.summary-label, .summary-stat span { font-size: 12px; color: var(--text-tertiary); }
.summary-stat { display: flex; flex-direction: column; gap: 6px; justify-content: center; }
.summary-stat b { font-size: 22px; color: var(--text-primary); }
.summary-stat.danger b { color: #ef4444; }
.kanban-board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  min-height: 400px;
}
.kanban-column { background: var(--bg-secondary, #f9fafb); border-radius: 10px; padding: 12px; }
.column-header { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
.column-dot, .priority-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.priority-dot { display: inline-block; margin-right: 6px; }
.column-title { font-size: 13px; font-weight: 600; }
.column-count {
  font-size: 11px;
  color: var(--text-tertiary);
  background: var(--bg-card, #fff);
  padding: 1px 6px;
  border-radius: 8px;
  margin-left: auto;
}
.column-body { display: flex; flex-direction: column; gap: 8px; min-height: 60px; }
.kanban-card {
  padding: 11px 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  cursor: grab;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.kanban-card:hover { border-color: #2f7df6; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.card-top { display: flex; align-items: flex-start; gap: 6px; margin-bottom: 6px; }
.card-title-text { flex: 1; font-size: 13px; font-weight: 600; line-height: 1.4; }
.task-desc { margin: 0 0 8px 14px; color: var(--text-secondary); font-size: 12px; line-height: 1.45; }
.card-meta { display: flex; justify-content: space-between; gap: 8px; color: var(--text-tertiary); font-size: 11px; margin-bottom: 8px; }
.mini-icon, .icon-btn {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}
.mini-icon:hover, .icon-btn:hover { background: var(--hover-bg, #f3f4f6); }
.danger { color: #ef4444; }
.list-view, .files-view, .approval-view, .gantt-view {
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 10px;
  overflow: hidden;
}
.export-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: #fbfdff;
  border-bottom: 1px solid #e5e7eb;
}
.export-toolbar div:first-child {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.export-toolbar strong { font-size: 14px; color: var(--text-primary); }
.export-toolbar span { font-size: 12px; color: var(--text-tertiary); }
.export-actions { display: flex; align-items: center; gap: 8px; }
.list-item {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 90px;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
}
.list-item.header { color: var(--text-tertiary); font-size: 12px; font-weight: 600; background: #f8fafc; }
.gantt-head { display: grid; grid-template-columns: 230px 1fr; border-bottom: 1px solid #dbeafe; background: #f8fbff; }
.gantt-title { padding: 17px 14px; font-weight: 700; font-size: 13px; }
.gantt-scale { position: relative; min-height: 58px; }
.gantt-scale span {
  position: absolute;
  top: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #1d4ed8;
}
.gantt-scale b {
  position: absolute;
  bottom: 9px;
  transform: translateX(-50%);
  padding: 2px 5px;
  border-radius: 4px;
  background: #eef4ff;
  color: #475569;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.gantt-body { position: relative; }
.target-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ef4444;
  z-index: 2;
}
.target-line span {
  position: absolute;
  top: 8px;
  left: 6px;
  white-space: nowrap;
  color: #ef4444;
  font-size: 12px;
  font-weight: 600;
}
.gantt-row { display: grid; grid-template-columns: 230px 1fr; min-height: 54px; border-bottom: 1px solid #f1f5f9; }
.gantt-task-name { padding: 10px 14px; display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.gantt-task-name small { color: var(--text-tertiary); }
.gantt-track { position: relative; background-image: linear-gradient(to right, rgba(148, 163, 184, 0.12) 1px, transparent 1px); background-size: 8.333% 100%; }
.gantt-tick {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(37, 99, 235, 0.15);
}
.gantt-bar {
  position: absolute;
  top: 13px;
  height: 26px;
  border-radius: 6px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  padding: 0 8px;
  overflow: hidden;
  white-space: nowrap;
}
.section-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}
.section-toolbar h3 { margin: 0; font-size: 16px; }
.section-toolbar p { margin: 4px 0 0; color: var(--text-secondary); font-size: 13px; }
.hidden-input { display: none; }
.file-list { display: flex; flex-direction: column; }
.file-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
}
.file-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.file-main strong { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-main span { color: var(--text-tertiary); font-size: 12px; }
.approval-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 16px;
}
.approval-summary div { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
.approval-summary span { display: block; color: var(--text-tertiary); font-size: 12px; }
.approval-summary b { font-size: 22px; }
.approval-record { display: flex; flex-direction: column; gap: 4px; }
.approval-record span { color: var(--text-secondary); font-size: 12px; }
.approval-record p { margin: 0; color: var(--text-secondary); font-size: 13px; }
.task-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
.span-2 { grid-column: span 2; }
.offset-control {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.offset-control span {
  color: var(--text-secondary);
  font-size: 13px;
  white-space: nowrap;
}
.task-detail { display: flex; flex-direction: column; gap: 14px; }
.task-detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}
.task-detail-head h3 { margin: 0; font-size: 18px; }
.task-detail-head p { margin: 6px 0 0; color: var(--text-secondary); font-size: 13px; line-height: 1.5; }
.task-detail-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.task-detail-meta {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.task-detail-meta span {
  padding: 8px 10px;
  border-radius: 8px;
  background: #f8fafc;
  color: var(--text-secondary);
  font-size: 12px;
}
.section-toolbar.compact {
  margin-top: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
.task-file-list {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}
.task-completion-form { margin-top: 4px; }
.task-approval-summary { padding: 0; }

:global(.pdf-render-root) {
  position: fixed;
  left: -10000px;
  top: 0;
  width: 1280px;
  padding: 28px;
  background: #fff;
  color: #0f172a;
  font-family: Arial, "Microsoft YaHei", "PingFang SC", sans-serif;
}
:global(.pdf-report h1) {
  margin: 0 0 8px;
  font-size: 24px;
  color: #0f172a;
}
:global(.pdf-report p) {
  margin: 0 0 16px;
  color: #475569;
  font-size: 13px;
}
:global(.pdf-report table) {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
:global(.pdf-report th),
:global(.pdf-report td) {
  border: 1px solid #cbd5e1;
  padding: 9px 10px;
  font-size: 13px;
  line-height: 1.4;
  word-break: break-word;
}
:global(.pdf-report th) {
  background: #eaf2ff;
  color: #1d4ed8;
  font-weight: 700;
}
:global(.gantt-pdf-report) {
  width: max-content;
  min-width: 1200px;
}
:global(.gantt-export) {
  display: grid;
  grid-template-columns: 220px repeat(var(--gantt-columns, 12), 48px);
  border: 1px solid #cbd5e1;
}
:global(.gantt-export-head),
:global(.date-cell),
:global(.row-name) {
  min-height: 38px;
  border-right: 1px solid #dbe3ef;
  border-bottom: 1px solid #dbe3ef;
}
:global(.gantt-export-head) {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eaf2ff;
  color: #1d4ed8;
  font-weight: 700;
  font-size: 12px;
}
:global(.row-name) {
  padding: 8px 10px;
  background: #f8fafc;
}
:global(.row-name strong) {
  display: block;
  font-size: 13px;
}
:global(.row-name span) {
  display: block;
  margin-top: 3px;
  color: #64748b;
  font-size: 11px;
}
:global(.date-cell) {
  background: #fff;
}
:global(.date-cell.active) {
  background: #2f7df6;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.4);
}
:global(.date-cell.done) {
  background: #16a34a;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.42);
}
:global(.date-cell.overdue) {
  background: #dc2626;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.42);
}

@media (max-width: 1200px) {
  .kanban-board { grid-template-columns: repeat(2, 1fr); }
  .project-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .summary-main { grid-column: span 2; }
}
@media (max-width: 768px) {
  .page-header, .header-actions { flex-direction: column; align-items: stretch; }
  .kanban-board, .project-summary { grid-template-columns: 1fr; }
  .summary-main { grid-column: span 1; }
  .task-form { grid-template-columns: 1fr; }
  .span-2 { grid-column: span 1; }
  .list-item { grid-template-columns: 1fr; }
  .gantt-head, .gantt-row { grid-template-columns: 170px 1fr; }
}
</style>
