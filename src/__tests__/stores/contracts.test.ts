import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useContractsStore } from '@/stores/contracts'
import type { ContractStatus, RiskLevel } from '@/types'

// Mock the API module
vi.mock('@/api/contracts', () => ({
  fetchContracts: vi.fn(),
}))

import { fetchContracts as apiFetchContracts } from '@/api/contracts'

describe('Contracts Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const store = useContractsStore()
    expect(store.contracts).toEqual([])
    expect(store.total).toBe(0)
    expect(store.loading).toBe(false)
    expect(store.currentPage).toBe(1)
    expect(store.totalPages).toBe(0)
  })

  it('should compute totalPages correctly', () => {
    const store = useContractsStore()
    store.total = 25
    store.pageSize = 10
    expect(store.totalPages).toBe(3)
  })

  it('should fetch contracts and update state', async () => {
    const mockData = {
      items: [
        { id: '1', name: '合同1', partyA: '甲方', partyB: '乙方', type: '采购', status: 'active' as ContractStatus, amount: 100000, startDate: '2024-01-01', endDate: '2024-12-31', riskLevel: 'low' as RiskLevel, createdAt: '2024-01-01' },
        { id: '2', name: '合同2', partyA: '甲方', partyB: '乙方', type: '服务', status: 'draft' as ContractStatus, amount: 200000, startDate: '2024-01-01', endDate: '2024-12-31', riskLevel: 'low' as RiskLevel, createdAt: '2024-01-01' },
      ],
      total: 2,
      page: 1,
      pageSize: 10,
    }
    vi.mocked(apiFetchContracts).mockResolvedValue(mockData)

    const store = useContractsStore()
    await store.fetchContracts()

    expect(store.loading).toBe(false)
    expect(store.contracts).toEqual(mockData.items)
    expect(store.total).toBe(2)
  })

  it('should handle fetch error gracefully', async () => {
    vi.mocked(apiFetchContracts).mockRejectedValue(new Error('Network error'))

    const store = useContractsStore()
    await store.fetchContracts()

    expect(store.loading).toBe(false)
    expect(store.contracts).toEqual([])
    expect(store.total).toBe(0)
  })

  it('should set page and refetch', async () => {
    const mockData = { items: [], total: 0, page: 2, pageSize: 10 }
    vi.mocked(apiFetchContracts).mockResolvedValue(mockData)

    const store = useContractsStore()
    store.setPage(2)

    expect(store.currentPage).toBe(2)
    expect(apiFetchContracts).toHaveBeenCalled()
  })

  it('should set search query and reset page', () => {
    const store = useContractsStore()
    store.currentPage = 3

    store.setSearch('测试合同')

    expect(store.searchQuery).toBe('测试合同')
    expect(store.currentPage).toBe(1)
  })

  it('should set status filter and reset page', () => {
    const store = useContractsStore()
    store.currentPage = 2

    store.setStatusFilter('active')

    expect(store.statusFilter).toBe('active')
    expect(store.currentPage).toBe(1)
  })

  it('should set risk filter and reset page', () => {
    const store = useContractsStore()
    store.currentPage = 3

    store.setRiskFilter('high')

    expect(store.riskFilter).toBe('high')
    expect(store.currentPage).toBe(1)
  })

  it('should clear filter when set to empty string', () => {
    const store = useContractsStore()
    store.statusFilter = 'active'

    store.setStatusFilter('')

    expect(store.statusFilter).toBe('')
  })
})
