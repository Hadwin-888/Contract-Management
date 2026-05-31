import apiClient from './client'

export interface AuditTemplate {
  id: string
  contract_type: string
  name: string
  content: string
  summary_content?: string
  version: number
  updated_by: string
  updated_by_name?: string
  created_at: string
  updated_at: string
}

export async function fetchTemplates(): Promise<AuditTemplate[]> {
  const response = await apiClient.get('/templates')
  return response.data
}

export async function fetchTemplate(contractType: string): Promise<AuditTemplate> {
  const response = await apiClient.get(`/templates/${encodeURIComponent(contractType)}`)
  return response.data
}

export async function createTemplate(data: { contractType: string; name: string; content: string; summaryContent?: string }): Promise<AuditTemplate> {
  const response = await apiClient.post('/templates', data)
  return response.data
}

export async function updateTemplate(contractType: string, data: { name?: string; content?: string; summaryContent?: string }): Promise<AuditTemplate> {
  const response = await apiClient.put(`/templates/${encodeURIComponent(contractType)}`, data)
  return response.data
}

export async function deleteTemplate(contractType: string): Promise<void> {
  await apiClient.delete(`/templates/${encodeURIComponent(contractType)}`)
}
