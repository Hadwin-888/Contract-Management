import apiClient from './client'

export interface TypeDistributionItem {
  type: string
  count: number
}

export interface TopContractItem {
  name: string
  amount: number
  party: string
}

export interface StatusDistributionItem {
  status: string
  count: number
}

export interface RiskDistributionItem {
  risk_level: string
  count: number
}

export interface DeptStatItem {
  follow_dept: string
  count: number
  total_amount: number
}

export interface AuditStats {
  passed: number
  failed: number
  warnings: number
  total: number
}

export interface StatisticsData {
  totalValue: number
  avgDuration: number
  monthlyGrowth: number
  totalCount: number
  monthlyData: number[]
  monthlyAmount: number[]
  typeDistribution: TypeDistributionItem[]
  topContracts: TopContractItem[]
  statusDistribution: StatusDistributionItem[]
  riskDistribution: RiskDistributionItem[]
  deptStats: DeptStatItem[]
  expiringCount: number
  auditStats: AuditStats
}

export async function fetchStatistics(range?: string): Promise<StatisticsData> {
  const response = await apiClient.get('/dashboard/statistics', {
    params: { range: range || 'year' },
  })
  return response.data
}
