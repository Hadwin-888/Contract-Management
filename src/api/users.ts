import apiClient from './client'
import type { User } from '@/types/user'

export interface CreateUserData {
  username: string
  password: string
  name?: string
  email?: string
  department?: string
  departmentCode?: string
  role?: string
}

export interface UpdateUserData {
  name?: string
  email?: string
  department?: string
  departmentCode?: string
  role?: string
}

export async function fetchUsers(): Promise<User[]> {
  const response = await apiClient.get('/users')
  return response.data
}

export async function fetchUser(id: string): Promise<User> {
  const response = await apiClient.get(`/users/${id}`)
  return response.data
}

export async function fetchMyProfile(): Promise<User> {
  const response = await apiClient.get('/users/me')
  return response.data
}

export async function updateMyProfile(data: { name?: string; email?: string; department?: string; departmentCode?: string }): Promise<User> {
  const response = await apiClient.put('/users/me', data)
  return response.data
}

export async function changeMyPassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.put('/users/me/password', { currentPassword, newPassword })
}

export async function createUser(data: CreateUserData): Promise<User> {
  const response = await apiClient.post('/users', data)
  return response.data
}

export async function updateUser(id: string, data: UpdateUserData): Promise<User> {
  const response = await apiClient.put(`/users/${id}`, data)
  return response.data
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`)
}

export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  await apiClient.put(`/users/${id}/password`, { newPassword })
}
