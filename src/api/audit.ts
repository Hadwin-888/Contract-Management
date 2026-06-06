import apiClient from './client'

export interface AuditRecord {
  id: string
  contract_id: string
  contract_name: string
  contract_type?: string
  risk_score: number
  issues_count: number
  status: 'pass' | 'warning' | 'fail' | 'pending'
  analysis: string
  suggestions: string[]
  summary?: string
  template_id?: string | null
  template_version?: number | null
  template_content_snapshot?: string
  extracted_fields?: Record<string, unknown>
  rule_issues?: AuditIssue[]
  ai_issues?: AuditIssue[]
  reviewed_issues?: AuditIssue[]
  need_human_review_count?: number
  audit_version?: string
  created_at: string
}

export interface AuditIssue {
  title: string
  severity: 'high' | 'medium' | 'low'
  source: 'rule' | 'ai'
  checkItemId?: string
  evidence: string
  reason: string
  suggestion: string
  confidence: number
  needHumanReview: boolean
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

export async function clearAuditRecords(): Promise<void> {
  await apiClient.delete('/audit/clear')
}

export async function deleteAuditRecord(id: string): Promise<void> {
  await apiClient.delete(`/audit/${id}`)
}
