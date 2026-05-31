import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Contract, ContractStatus, RiskLevel } from '@/types'
import { fetchContracts as apiFetchContracts } from '@/api/contracts'

export const useContractsStore = defineStore('contracts', () => {
  const contracts = ref<Contract[]>([])
  const total = ref(0)
  const loading = ref(false)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const searchQuery = ref('')
  const statusFilter = ref<ContractStatus | ''>('')
  const riskFilter = ref<RiskLevel | ''>('')
  const followDeptFilter = ref('')
  const costDeptFilter = ref('')
  const amountMinFilter = ref<number | undefined>(undefined)
  const amountMaxFilter = ref<number | undefined>(undefined)

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

  async function fetchContracts() {
    loading.value = true
    try {
      const result = await apiFetchContracts({
        page: currentPage.value,
        pageSize: pageSize.value,
        search: searchQuery.value || undefined,
        status: statusFilter.value || undefined,
        riskLevel: riskFilter.value || undefined,
        followDept: followDeptFilter.value || undefined,
        costDept: costDeptFilter.value || undefined,
        amountMin: amountMinFilter.value,
        amountMax: amountMaxFilter.value,
      })
      contracts.value = result.items
      total.value = result.total
    } catch (error) {
      console.error('Failed to fetch contracts:', error)
      contracts.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  function setPage(page: number) {
    currentPage.value = page
    fetchContracts()
  }

  function setSearch(query: string) {
    searchQuery.value = query
    currentPage.value = 1
    fetchContracts()
  }

  function setStatusFilter(status: ContractStatus | '') {
    statusFilter.value = status
    currentPage.value = 1
    fetchContracts()
  }

  function setRiskFilter(risk: RiskLevel | '') {
    riskFilter.value = risk
    currentPage.value = 1
    fetchContracts()
  }

  function setFollowDeptFilter(dept: string) {
    followDeptFilter.value = dept
    currentPage.value = 1
    fetchContracts()
  }

  function setCostDeptFilter(dept: string) {
    costDeptFilter.value = dept
    currentPage.value = 1
    fetchContracts()
  }

  function setAmountRange(min?: number, max?: number) {
    amountMinFilter.value = min
    amountMaxFilter.value = max
    currentPage.value = 1
    fetchContracts()
  }

  return {
    contracts, total, loading, currentPage, pageSize,
    searchQuery, statusFilter, riskFilter,
    followDeptFilter, costDeptFilter, amountMinFilter, amountMaxFilter,
    totalPages,
    fetchContracts, setPage, setSearch, setStatusFilter, setRiskFilter,
    setFollowDeptFilter, setCostDeptFilter, setAmountRange,
  }
})
