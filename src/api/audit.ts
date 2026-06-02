import apiClient from './client'

export interface AuditRecord {
  id: string
  contract_id: string
  contract_name: string
  risk_score: number
  issues_count: number
  status: 'pass' | 'warning' | 'fail' | 'pending'
  analysis: string
  suggestions: string[]
  created_at: string
}

export interface AuditListResponse {
  items: AuditRecord[]
  total: number
  page: number
  pageSize: number
}

export async function fetchAuditRecords(params: { page?: number; pageSize?: number } = {}): Promise<AuditListResponse> {
  const response = await apiClient.get('/audit', { params })
  return response.data
}

export async function fetchAuditRecord(id: string): Promise<AuditRecord> {
  const response = await apiClient.get(`/audit/${id}`)
  return response.data
}

export async function analyzeContract(contractId: string): Promise<AuditRecord> {
  // AI analysis can take 60-120s for complex contracts. Override the default 15s timeout.
  const response = await apiClient.post('/audit/analyze', { contractId }, {
    timeout: 180000, // 3 minutes
  })
  return response.data
}
