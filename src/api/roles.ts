import apiClient from './client'

export interface CustomRole {
  id: string
  name: string
  description: string
  isSystem: boolean
  userCount: number
  permissions: Permission[]
  createdAt: string
}

export interface Permission {
  id: string
  module: string
  action: string
  description: string
}

export async function fetchRoles(): Promise<CustomRole[]> {
  const response = await apiClient.get('/settings/roles')
  return response.data
}

export async function createRole(data: { name: string; description?: string }): Promise<CustomRole> {
  const response = await apiClient.post('/settings/roles', data)
  return response.data
}

export async function updateRole(id: string, data: { name?: string; description?: string }): Promise<CustomRole> {
  const response = await apiClient.put(`/settings/roles/${id}`, data)
  return response.data
}

export async function deleteRole(id: string): Promise<void> {
  await apiClient.delete(`/settings/roles/${id}`)
}

export async function fetchPermissions(): Promise<Permission[]> {
  const response = await apiClient.get('/settings/permissions')
  return response.data
}

export async function seedPermissions(): Promise<void> {
  await apiClient.post('/settings/permissions/seed')
}

export async function fetchRolePermissions(roleId: string): Promise<Permission[]> {
  const response = await apiClient.get(`/settings/roles/${roleId}/permissions`)
  return response.data
}

export async function setRolePermissions(roleId: string, permissionIds: string[]): Promise<Permission[]> {
  const response = await apiClient.put(`/settings/roles/${roleId}/permissions`, { permissionIds })
  return response.data
}

export async function fetchUserRoles(userId: string): Promise<CustomRole[]> {
  const response = await apiClient.get(`/settings/permissions/users/${userId}/roles`)
  return response.data
}

export async function setUserRoles(userId: string, roleIds: string[]): Promise<CustomRole[]> {
  const response = await apiClient.put(`/settings/permissions/users/${userId}/roles`, { roleIds })
  return response.data
}
