import apiClient from './client'
import type { DashboardData } from '@/stores/dashboard'

export async function fetchDashboardStats(): Promise<DashboardData> {
  const response = await apiClient.get('/dashboard/stats')
  return response.data
}
