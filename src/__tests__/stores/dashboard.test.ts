import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDashboardStore } from '@/stores/dashboard'

// Mock the API module
vi.mock('@/api/dashboard', () => ({
  fetchDashboardStats: vi.fn(),
}))

import { fetchDashboardStats as apiFetchDashboard } from '@/api/dashboard'

describe('Dashboard Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should initialize with null data', () => {
    const store = useDashboardStore()
    expect(store.data).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('should fetch dashboard data and update state', async () => {
    const mockData = {
      stats: {
        totalContracts: 10,
        activeContracts: 5,
        expiringSoon: 2,
        draftContracts: 3,
        riskScore: 75,
      },
      expiringContracts: [],
      recentUploads: [],
      auditStatus: { passed: 3, failed: 1, pending: 2 },
    }
    vi.mocked(apiFetchDashboard).mockResolvedValue(mockData)

    const store = useDashboardStore()
    await store.fetchDashboard()

    expect(store.loading).toBe(false)
    expect(store.data).toEqual(mockData)
    expect(store.data?.stats.totalContracts).toBe(10)
    expect(store.data?.auditStatus.passed).toBe(3)
  })

  it('should handle fetch error gracefully', async () => {
    vi.mocked(apiFetchDashboard).mockRejectedValue(new Error('Network error'))

    const store = useDashboardStore()
    await store.fetchDashboard()

    expect(store.loading).toBe(false)
    expect(store.data).toBeNull()
  })
})
