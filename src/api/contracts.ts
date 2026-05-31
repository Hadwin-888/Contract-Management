import apiClient from './client'
import type { Contract, ContractListParams, PaginatedResponse } from '@/types'

export interface CreateContractData {
  name: string
  partyA: string
  partyB: string
  type: string
  status: string
  amount: number
  amountExcludingTax?: number
  taxRate?: number
  qualityDeposit?: string
  contractNo?: string
  startDate: string
  endDate: string
  contractTerm?: string
  riskLevel: string
  insuranceInfo?: string
  insuranceDate?: string
  followDept?: string
  costDept?: string
  costCode?: string
  isAuditDraft?: boolean
}

export async function fetchContracts(params: ContractListParams): Promise<PaginatedResponse<Contract>> {
  const response = await apiClient.get('/contracts', { params })
  return response.data
}

export async function fetchContract(id: string): Promise<Contract> {
  const response = await apiClient.get(`/contracts/${id}`)
  return response.data
}

export async function createContract(data: CreateContractData): Promise<Contract> {
  const response = await apiClient.post('/contracts', data)
  return response.data
}

export async function updateContract(id: string, data: Partial<CreateContractData>): Promise<Contract> {
  const response = await apiClient.put(`/contracts/${id}`, data)
  return response.data
}

export async function deleteContract(id: string): Promise<void> {
  await apiClient.delete(`/contracts/${id}`)
}

export interface AiExtractResult {
  name: string
  partyA: string
  partyB: string
  amount: number
  amountExcludingTax?: number
  taxRate?: number
  qualityDeposit?: string
  contractNo?: string
  startDate: string
  endDate: string
  contractTerm?: string
  insuranceInfo?: string
  insuranceDate?: string
}

export async function aiExtractContract(contractId: string): Promise<AiExtractResult> {
  // OCR + AI extraction can take 60-120s for scanned PDFs. Override the default 15s timeout.
  const response = await apiClient.post('/contracts/ai-extract', { contractId }, {
    timeout: 180000, // 3 minutes
  })
  return response.data
}
