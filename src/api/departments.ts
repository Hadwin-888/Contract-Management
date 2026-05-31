import apiClient from './client'

export interface Department {
  id: string
  code: string
  short_name: string
  name: string
  head_name: string
  created_at: string
}

export async function fetchDepartments(): Promise<Department[]> {
  const response = await apiClient.get('/departments')
  return response.data
}

export async function createDepartment(data: { code: string; shortName: string; name: string; headName?: string }): Promise<Department> {
  const response = await apiClient.post('/departments', data)
  return response.data
}

export async function updateDepartment(id: string, data: { code?: string; shortName?: string; name?: string; headName?: string }): Promise<Department> {
  const response = await apiClient.put(`/departments/${id}`, data)
  return response.data
}

export async function deleteDepartment(id: string): Promise<void> {
  await apiClient.delete(`/departments/${id}`)
}
