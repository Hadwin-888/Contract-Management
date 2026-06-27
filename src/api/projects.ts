import apiClient from './client'

export interface Project {
  id: string
  name: string
  description: string
  status: string
  department?: string | null
  priority: string
  type?: string | null
  ownerId?: string | null
  owner?: { id: string; name: string; department?: string; avatar?: string } | null
  targetName?: string | null
  targetDate?: string | null
  countdownMode?: boolean
  countdownLabel?: string | null
  completionNote?: string | null
  completionSubmittedAt?: string | null
  completionApprovedAt?: string | null
  startDate: string
  endDate: string
  totalTasks: number
  completedTasks: number
  overdueTasks?: number
  progress: number
  timing?: ProjectTiming
  files?: ProjectFile[]
  members: { id: string; userId: string; role: string; user: { id: string; name: string; department?: string; avatar?: string } }[]
  _count: { tasks: number; members: number; files?: number }
  createdAt: string
}

export interface ProjectTiming {
  targetName: string
  targetDate: string | null
  daysRemaining: number | null
  elapsedDays: number | null
  totalDays: number | null
  overdue: boolean
  timeProgress: number | null
}

export interface ProjectFile {
  id: string
  projectId: string
  filename: string
  originalName: string
  size: number
  mimeType: string
  fileType: string
  uploadedBy?: string | null
  uploader?: { id: string; name: string } | null
  uploadedAt: string
}

export interface Task {
  id: string
  projectId: string
  parentId: string | null
  title: string
  description: string
  status: string
  priority: string
  assigneeId: string | null
  assignee?: { id: string; name: string; avatar?: string }
  startDate: string | null
  dueDate: string | null
  completedAt: string | null
  completionNote?: string | null
  completionSubmittedAt?: string | null
  completionApprovedAt?: string | null
  progress: number
  relativeToTarget: boolean
  startOffsetDays: number | null
  dueOffsetDays: number | null
  sortOrder: number
  subtasks?: Task[]
  dependencies?: { id: string; dependsOn: { id: string; title: string; status: string } }[]
  dependents?: { id: string; task: { id: string; title: string; status: string } }[]
  comments?: TaskComment[]
  changeLogs?: TaskChangeLog[]
  files?: TaskFile[]
  project?: { id: string; name: string }
  _count?: { files?: number }
  createdAt: string
}

export interface TaskFile {
  id: string
  taskId: string
  filename: string
  originalName: string
  size: number
  mimeType: string
  fileType: string
  uploadedBy?: string | null
  uploader?: { id: string; name: string } | null
  uploadedAt: string
}

export interface TaskComment {
  id: string
  taskId: string
  userId: string
  content: string
  mentions: string
  user: { id: string; name: string; avatar?: string }
  createdAt: string
}

export interface TaskChangeLog {
  id: string
  taskId: string
  userId: string
  action: string
  fieldName: string
  oldValue: string
  newValue: string
  user: { id: string; name: string }
  createdAt: string
}

export interface ProgressUpdate {
  id: string
  taskId: string
  userId: string
  progress: number
  note: string
  user: { id: string; name: string }
  createdAt: string
}

export interface ProjectApprovalProgress {
  status: string
  submitted: boolean
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  totalSteps: number
  completionSubmittedAt?: string | null
  completionApprovedAt?: string | null
  completionNote?: string | null
  records: {
    id: string
    status: string
    comment?: string | null
    submitNote?: string | null
    approver: { id: string; name: string }
    createdAt: string
  }[]
}

export type TaskApprovalProgress = ProjectApprovalProgress

export async function fetchProjects(params: { page?: number; pageSize?: number; status?: string } = {}): Promise<{ items: Project[]; total: number; page: number; pageSize: number }> {
  const response = await apiClient.get('/projects', { params })
  return response.data
}

export async function fetchProject(id: string): Promise<Project> {
  const response = await apiClient.get(`/projects/${id}`)
  return response.data
}

export async function createProject(data: {
  name: string
  description?: string
  startDate?: string
  endDate?: string
  ownerId?: string
  department?: string
  priority?: string
  type?: string
  targetName?: string
  targetDate?: string
  countdownMode?: boolean
  countdownLabel?: string
}): Promise<Project> {
  const response = await apiClient.post('/projects', data)
  return response.data
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project> {
  const response = await apiClient.put(`/projects/${id}`, data)
  return response.data
}

export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(`/projects/${id}`)
}

export async function fetchKanban(projectId: string): Promise<Record<string, Task[]>> {
  const response = await apiClient.get(`/projects/${projectId}/kanban`)
  return response.data
}

export async function fetchProjectStats(projectId: string): Promise<{ total: number; todo: number; inProgress: number; review: number; done: number; overdue: number }> {
  const response = await apiClient.get(`/projects/${projectId}/stats`)
  return response.data
}

export async function fetchProjectGantt(projectId: string): Promise<{ project: Project; tasks: Task[] }> {
  const response = await apiClient.get(`/projects/${projectId}/gantt`)
  return response.data
}

export async function fetchProjectMembers(projectId: string): Promise<{ id: string; userId: string; role: string; user: { id: string; name: string; department?: string; avatar?: string } }[]> {
  const response = await apiClient.get(`/projects/${projectId}/members`)
  return response.data
}

export async function addProjectMember(projectId: string, userId: string, role?: string): Promise<any> {
  const response = await apiClient.post(`/projects/${projectId}/members`, { userId, role })
  return response.data
}

export async function removeProjectMember(projectId: string, userId: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/members/${userId}`)
}

export async function assignProjectOwner(projectId: string, ownerId: string): Promise<Project> {
  const response = await apiClient.put(`/projects/${projectId}/owner`, { ownerId })
  return response.data
}

export async function fetchProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const response = await apiClient.get(`/projects/${projectId}/files`)
  return response.data
}

export async function uploadProjectFile(projectId: string, file: File, fileType = 'support'): Promise<ProjectFile> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('fileType', fileType)
  const response = await apiClient.post(`/projects/${projectId}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function downloadProjectFile(fileId: string, filename: string): Promise<void> {
  const response = await apiClient.get(`/projects/files/${fileId}/download`, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export async function deleteProjectFile(projectId: string, fileId: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/files/${fileId}`)
}

export async function submitProjectCompletion(projectId: string, submitNote?: string): Promise<any> {
  const response = await apiClient.post(`/projects/${projectId}/submit-completion`, { submitNote })
  return response.data
}

export async function fetchProjectApprovalProgress(projectId: string): Promise<ProjectApprovalProgress> {
  const response = await apiClient.get(`/projects/${projectId}/approval-progress`)
  return response.data
}

export async function fetchMyTasks(): Promise<Task[]> {
  const response = await apiClient.get('/tasks/my')
  return response.data
}

export async function createTask(data: {
  projectId: string
  title: string
  description?: string
  priority?: string
  assigneeId?: string
  startDate?: string
  dueDate?: string
  parentId?: string
  progress?: number
  relativeToTarget?: boolean
  startOffsetDays?: number | null
  dueOffsetDays?: number | null
}): Promise<Task> {
  const response = await apiClient.post('/tasks', data)
  return response.data
}

export async function downloadTaskImportTemplate(): Promise<void> {
  const response = await apiClient.get('/tasks/import-template', { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.download = '任务导入模板.xlsx'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export async function importTasksFromExcel(projectId: string, file: File): Promise<{ message: string; importedCount: number; tasks: Task[] }> {
  const formData = new FormData()
  formData.append('projectId', projectId)
  formData.append('file', file)
  const response = await apiClient.post('/tasks/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function fetchTask(id: string): Promise<Task> {
  const response = await apiClient.get(`/tasks/${id}`)
  return response.data
}

export async function updateTask(id: string, data: Partial<Task>): Promise<Task> {
  const response = await apiClient.put(`/tasks/${id}`, data)
  return response.data
}

export async function deleteTask(id: string): Promise<void> {
  await apiClient.delete(`/tasks/${id}`)
}

export async function fetchTaskFiles(taskId: string): Promise<TaskFile[]> {
  const response = await apiClient.get(`/tasks/${taskId}/files`)
  return response.data
}

export async function uploadTaskFile(taskId: string, file: File, fileType = 'completion'): Promise<TaskFile> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('fileType', fileType)
  const response = await apiClient.post(`/tasks/${taskId}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function downloadTaskFile(fileId: string, filename: string): Promise<void> {
  const response = await apiClient.get(`/tasks/files/${fileId}/download`, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export async function deleteTaskFile(taskId: string, fileId: string): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}/files/${fileId}`)
}

export async function submitTaskCompletion(taskId: string, submitNote?: string): Promise<any> {
  const response = await apiClient.post(`/tasks/${taskId}/submit-completion`, { submitNote })
  return response.data
}

export async function fetchTaskApprovalProgress(taskId: string): Promise<TaskApprovalProgress> {
  const response = await apiClient.get(`/tasks/${taskId}/approval-progress`)
  return response.data
}

export async function addTaskDependency(taskId: string, dependsOnTaskId: string): Promise<any> {
  const response = await apiClient.post(`/tasks/${taskId}/dependencies`, { dependsOnTaskId })
  return response.data
}

export async function removeTaskDependency(taskId: string, depId: string): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}/dependencies/${depId}`)
}

export async function addTaskComment(taskId: string, content: string, mentions?: string[]): Promise<TaskComment> {
  const response = await apiClient.post(`/tasks/${taskId}/comments`, { content, mentions })
  return response.data
}

export async function fetchTaskComments(taskId: string): Promise<TaskComment[]> {
  const response = await apiClient.get(`/tasks/${taskId}/comments`)
  return response.data
}

export async function recordProgress(taskId: string, progress: number, note?: string): Promise<ProgressUpdate> {
  const response = await apiClient.post(`/tasks/${taskId}/progress`, { progress, note })
  return response.data
}

export async function fetchProgressHistory(taskId: string): Promise<ProgressUpdate[]> {
  const response = await apiClient.get(`/tasks/${taskId}/progress`)
  return response.data
}

export async function fetchTaskChangeLogs(taskId: string): Promise<TaskChangeLog[]> {
  const response = await apiClient.get(`/tasks/${taskId}/change-logs`)
  return response.data
}
