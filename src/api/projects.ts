import apiClient from './client'

export interface Project {
  id: string
  name: string
  description: string
  status: string
  startDate: string
  endDate: string
  totalTasks: number
  completedTasks: number
  progress: number
  members: { id: string; userId: string; role: string; user: { id: string; name: string; avatar?: string } }[]
  _count: { tasks: number; members: number }
  createdAt: string
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
  sortOrder: number
  subtasks?: Task[]
  dependencies?: { id: string; dependsOn: { id: string; title: string; status: string } }[]
  dependents?: { id: string; task: { id: string; title: string; status: string } }[]
  comments?: TaskComment[]
  changeLogs?: TaskChangeLog[]
  project?: { id: string; name: string }
  createdAt: string
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

export async function fetchProjects(params: { page?: number; pageSize?: number; status?: string } = {}): Promise<{ items: Project[]; total: number; page: number; pageSize: number }> {
  const response = await apiClient.get('/projects', { params })
  return response.data
}

export async function fetchProject(id: string): Promise<Project> {
  const response = await apiClient.get(`/projects/${id}`)
  return response.data
}

export async function createProject(data: { name: string; description?: string; startDate?: string; endDate?: string }): Promise<Project> {
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

export async function fetchProjectMembers(projectId: string): Promise<{ id: string; userId: string; role: string; user: { id: string; name: string; avatar?: string } }[]> {
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

export async function fetchMyTasks(): Promise<Task[]> {
  const response = await apiClient.get('/tasks/my')
  return response.data
}

export async function createTask(data: { projectId: string; title: string; description?: string; priority?: string; assigneeId?: string; startDate?: string; dueDate?: string; parentId?: string }): Promise<Task> {
  const response = await apiClient.post('/tasks', data)
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
