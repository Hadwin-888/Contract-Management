import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Contract } from '@/types'
import { fetchDashboardStats as apiFetchDashboard } from '@/api/dashboard'

export interface DashboardStats {
  totalContracts: number
  activeContracts: number
  expiringSoon: number
  draftContracts: number
  riskScore: number
}

export interface DashboardData {
  stats: DashboardStats
  expiringContracts: Contract[]
  recentUploads: { id: string; name: string; uploadTime: string; size: string }[]
  auditStatus: { passed: number; failed: number; pending: number }
}

export const useDashboardStore = defineStore('dashboard', () => {
  const data = ref<DashboardData | null>(null)
  const loading = ref(false)

  async function fetchDashboard() {
    loading.value = true
    try {
      data.value = await apiFetchDashboard()
    } catch (error) {
      console.error('Failed to fetch dashboard:', error)
    } finally {
      loading.value = false
    }
  }

  return { data, loading, fetchDashboard }
})
