export type ContractStatus = 'active' | 'expired' | 'draft' | 'terminated'
export type RiskLevel = 'low' | 'medium' | 'high'

export interface Contract {
  id: string
  name: string
  partyA: string
  partyB: string
  type: string
  status: ContractStatus
  amount: number
  amount_excluding_tax?: number
  tax_rate?: number
  quality_deposit?: string
  contract_no?: string
  startDate: string
  endDate: string
  contract_term?: string
  riskLevel: RiskLevel
  insurance_info?: string
  insurance_date?: string
  file_path?: string
  insurance_file_path?: string
  follow_dept?: string
  cost_dept?: string
  cost_code?: string
  createdAt: string
}

export interface ContractListParams {
  page: number
  pageSize: number
  search?: string
  status?: ContractStatus
  riskLevel?: RiskLevel
  followDept?: string
  costDept?: string
  amountMin?: number
  amountMax?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
