import apiClient from './client'

export interface ApprovalFlowStep {
  id: string
  flowId: string
  stepOrder: number
  roleName: string
  actionType: string
  required: boolean
}

export interface ApprovalFlow {
  id: string
  name: string
  module: string
  description: string
  isActive: boolean
  steps: ApprovalFlowStep[]
  createdAt: string
}

export async function fetchApprovalFlows(): Promise<ApprovalFlow[]> {
  const response = await apiClient.get('/approvals/flows')
  return response.data
}

export async function fetchApprovalFlow(id: string): Promise<ApprovalFlow> {
  const response = await apiClient.get(`/approvals/flows/${id}`)
  return response.data
}

export async function createApprovalFlow(data: {
  name: string
  module: string
  description?: string
  steps: { roleName: string; actionType?: string; required?: boolean }[]
}): Promise<ApprovalFlow> {
  const response = await apiClient.post('/approvals/flows', data)
  return response.data
}

export async function updateApprovalFlow(id: string, data: Partial<ApprovalFlow> & { steps?: any[] }): Promise<ApprovalFlow> {
  const response = await apiClient.put(`/approvals/flows/${id}`, data)
  return response.data
}

export async function deleteApprovalFlow(id: string): Promise<void> {
  await apiClient.delete(`/approvals/flows/${id}`)
}
