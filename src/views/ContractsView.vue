<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import {
  ElTable, ElTableColumn, ElPagination, ElSelect, ElOption,
  ElButton, ElInput, ElInputNumber, ElEmpty, ElDialog,
  ElForm, ElFormItem, ElDatePicker, ElMessage, ElPopconfirm, ElTag,
} from 'element-plus'
import {
  Plus, Search, Upload, Edit, Delete, Download, Eye, FileText,
  FileSpreadsheet, Filter, Sparkles,
} from 'lucide-vue-next'
import { useContractsStore } from '@/stores/contracts'
import { createContract, updateContract, deleteContract, fetchContract, aiExtractContract } from '@/api/contracts'
import { uploadFile } from '@/api/upload'
import { fetchDepartments } from '@/api/departments'
import PageTransition from '@/components/common/PageTransition.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useAuthStore } from '@/stores/auth'
import type { ContractStatus, RiskLevel } from '@/types'
import type { Role } from '@/types/user'
import type { Department } from '@/api/departments'
import apiClient from '@/api/client'

const store = useContractsStore()
const authStore = useAuthStore()

// Role-based visibility: clerk/head only see contracts matching their department
const isRestrictedRole = computed(() => {
  const r = authStore.user?.role
  return r === 'clerk' || r === 'head'
})

const userDepartment = computed(() => authStore.user?.department || '')

const dialogVisible = ref(false)
const dialogTitle = ref('新建合同')
const editingId = ref<string | null>(null)
const formRef = ref()

const form = ref({
  name: '',
  partyA: '',
  partyB: '',
  type: '',
  status: 'draft' as string,
  amount: 0,
  amountExcludingTax: 0,
  taxRate: 0,
  qualityDeposit: '',
  contractNo: '',
  startDate: '',
  endDate: '',
  contractTerm: '',
  riskLevel: 'low' as string,
  insuranceInfo: '',
  insuranceDate: '',
  followDept: '',
  costDept: '',
  costCode: '',
})

// Department options
const departments = ref<Department[]>([])

// Upload states
const uploadContractLoading = ref<Record<string, boolean>>({})
const uploadInsuranceLoading = ref<Record<string, boolean>>({})

// AI extract state
const aiExtractLoading = ref(false)
const aiExtractFile = ref<File | null>(null)

async function loadDepartments() {
  try {
    departments.value = await fetchDepartments()
  } catch {
    // ignore
  }
}

onMounted(() => {
  loadDepartments()
  // For restricted roles, pre-set the follow department filter
  // For restricted roles, pre-set the follow department filter
  if (isRestrictedRole.value && userDepartment.value) {
    store.followDeptFilter = userDepartment.value
  }
  store.fetchContracts()
})

const riskColors: Record<string, string> = {
  low: '#34c759',
  medium: '#ff9500',
  high: '#ff3b30',
}

const riskLabels: Record<string, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
}

function getRiskColor(level: string): string {
  return riskColors[level] || '#8e8e93'
}

function getRiskLabel(level: string): string {
  return riskLabels[level] || level
}

function formatAmount(amount: number) {
  if (amount >= 10000) return '¥' + (amount / 10000).toFixed(2) + '万'
  return '¥' + amount.toLocaleString()
}

function resetForm() {
  form.value = {
    name: '', partyA: '', partyB: '', type: '', status: 'draft',
    amount: 0, amountExcludingTax: 0, taxRate: 0,
    qualityDeposit: '', contractNo: '',
    startDate: '', endDate: '', contractTerm: '',
    riskLevel: 'low',
    insuranceInfo: '', insuranceDate: '',
    followDept: '', costDept: '', costCode: '',
  }
  editingId.value = null
}

function openCreate() {
  resetForm()
  dialogTitle.value = '新建合同'
  dialogVisible.value = true
}

function openEdit(row: any) {
  dialogTitle.value = '编辑合同'
  editingId.value = row.id
  form.value = {
    name: row.name,
    partyA: row.party_a,
    partyB: row.party_b,
    type: row.type,
    status: row.status,
    amount: row.amount,
    amountExcludingTax: row.amount_excluding_tax || 0,
    taxRate: row.tax_rate || 0,
    qualityDeposit: row.quality_deposit || '',
    contractNo: row.contract_no || '',
    startDate: row.start_date,
    endDate: row.end_date,
    contractTerm: row.contract_term || '',
    riskLevel: row.risk_level,
    insuranceInfo: row.insurance_info || '',
    insuranceDate: row.insurance_date || '',
    followDept: row.follow_dept || '',
    costDept: row.cost_dept || '',
    costCode: row.cost_code || '',
  }
  dialogVisible.value = true
}

async function handleSave() {
  // Validate all required fields
  const required = [
    { key: 'contractNo', label: '合同编号' },
    { key: 'name', label: '合同名称' },
    { key: 'partyA', label: '甲方' },
    { key: 'partyB', label: '乙方' },
    { key: 'type', label: '合同类型' },
    { key: 'startDate', label: '起始日期' },
    { key: 'endDate', label: '结束日期' },
    { key: 'contractTerm', label: '合同期限' },
    { key: 'qualityDeposit', label: '质保金情况' },
    { key: 'insuranceInfo', label: '保险情况' },
    { key: 'insuranceDate', label: '保险日期' },
    { key: 'followDept', label: '跟进部门' },
    { key: 'costDept', label: '费用部门' },
    { key: 'costCode', label: '费用代码' },
  ]

  for (const field of required) {
    const val = form.value[field.key as keyof typeof form.value]
    if (!val && val !== 0) {
      ElMessage.warning(`请填写「${field.label}」`)
      return
    }
  }

  try {
    if (editingId.value) {
      await updateContract(editingId.value, form.value)
      ElMessage.success('合同已更新')
    } else {
      await createContract(form.value)
      ElMessage.success('合同已创建')
    }
    dialogVisible.value = false
    store.fetchContracts()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '操作失败')
  }
}

async function handleDelete(id: string) {
  try {
    await deleteContract(id)
    ElMessage.success('合同已删除')
    store.fetchContracts()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '删除失败')
  }
}

async function handleAiExtract() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.pdf,.docx,.doc,.txt,.jpg,.jpeg,.png'
  input.onchange = async (e: any) => {
    const file = e.target?.files?.[0]
    if (!file) return
    aiExtractLoading.value = true
    aiExtractFile.value = file
    try {
      // Create a temp contract to associate the file
      const tempContract: any = await createContract({
        name: file.name.replace(/\.[^/.]+$/, ''),
        partyA: '待提取',
        partyB: '待提取',
        type: form.value.type || '采购',
        status: 'draft',
        amount: 0,
        amountExcludingTax: 0,
        taxRate: 0,
        qualityDeposit: '',
        contractNo: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
        contractTerm: '',
        riskLevel: 'low',
        insuranceInfo: '',
        insuranceDate: '',
        followDept: '',
        costDept: '',
        costCode: '',
        isAuditDraft: true,
      })
      const contractId = tempContract?.id || tempContract?._id
      console.log('Contract created, ID:', contractId)
      if (!contractId) {
        throw new Error('创建临时合同失败')
      }
      // Upload file and associate with contract
      await uploadFile(file, contractId)

      // Call the dedicated AI extract endpoint
      const extracted = await aiExtractContract(contractId)

      // Fill the form with extracted data
      form.value.name = extracted.name || form.value.name
      form.value.partyA = extracted.partyA || form.value.partyA
      form.value.partyB = extracted.partyB || form.value.partyB
      form.value.amount = extracted.amount || 0
      form.value.startDate = extracted.startDate || form.value.startDate
      form.value.endDate = extracted.endDate || form.value.endDate
      // Optional fields - only fill if AI returns them
      if (extracted.amountExcludingTax !== undefined && extracted.amountExcludingTax !== null) {
        form.value.amountExcludingTax = extracted.amountExcludingTax
      }
      if (extracted.taxRate !== undefined && extracted.taxRate !== null) {
        form.value.taxRate = extracted.taxRate
      }
      if (extracted.qualityDeposit) form.value.qualityDeposit = extracted.qualityDeposit
      if (extracted.contractNo) form.value.contractNo = extracted.contractNo
      if (extracted.contractTerm) form.value.contractTerm = extracted.contractTerm
      if (extracted.insuranceInfo) form.value.insuranceInfo = extracted.insuranceInfo
      if (extracted.insuranceDate) form.value.insuranceDate = extracted.insuranceDate

      ElMessage.success('AI 已提取合同内容，请确认后保存')
    } catch (error: any) {
      console.error('AI extract error:', error)
      const errMsg = error?.response?.data?.error || error?.message || 'AI 提取失败'
      ElMessage.error(errMsg)
    } finally {
      aiExtractLoading.value = false
    }
  }
  input.click()
}

async function handleUploadContract(row: any) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.pdf,.docx,.doc,.txt,.jpg,.jpeg,.png'
  input.onchange = async (e: any) => {
    const file = e.target?.files?.[0]
    if (!file) return
    uploadContractLoading.value[row.id] = true
    try {
      await uploadFile(file, row.id, 'contract')
      ElMessage.success('合同扫描件上传成功')
      store.fetchContracts()
    } catch (err: any) {
      ElMessage.error(err?.response?.data?.error || '上传失败')
    } finally {
      uploadContractLoading.value[row.id] = false
    }
  }
  input.click()
}

async function handleUploadInsurance(row: any) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.pdf,.docx,.doc,.txt,.jpg,.jpeg,.png'
  input.onchange = async (e: any) => {
    const file = e.target?.files?.[0]
    if (!file) return
    uploadInsuranceLoading.value[row.id] = true
    try {
      await uploadFile(file, row.id, 'insurance')
      ElMessage.success('保单扫描件上传成功')
      store.fetchContracts()
    } catch (err: any) {
      ElMessage.error(err?.response?.data?.error || '上传失败')
    } finally {
      uploadInsuranceLoading.value[row.id] = false
    }
  }
  input.click()
}

function openContractFile(row: any) {
  if (!row.file_path) {
    ElMessage.info('暂无合同扫描件')
    return
  }
  window.open(`/uploads/${row.file_path}`, '_blank')
}

function openInsuranceFile(row: any) {
  if (!row.insurance_file_path) {
    ElMessage.info('暂无保单扫描件')
    return
  }
  window.open(`/uploads/${row.insurance_file_path}`, '_blank')
}

async function deleteContractFile(row: any) {
  if (!row.file_path) return
  try {
    await updateContract(row.id, { file_path: '' } as any)
    ElMessage.success('合同扫描件已删除')
    store.fetchContracts()
  } catch (err: any) {
    ElMessage.error('删除失败')
  }
}

async function deleteInsuranceFile(row: any) {
  if (!row.insurance_file_path) return
  try {
    await updateContract(row.id, { insurance_file_path: '' } as any)
    ElMessage.success('保单扫描件已删除')
    store.fetchContracts()
  } catch (err: any) {
    ElMessage.error('删除失败')
  }
}

// Get unique department values for filter dropdowns
const followDeptOptions = computed(() => {
  const depts = new Set(store.contracts.map((c) => c.follow_dept).filter(Boolean))
  return Array.from(depts)
})

const costDeptOptions = computed(() => {
  const depts = new Set(store.contracts.map((c) => c.cost_dept).filter(Boolean))
  return Array.from(depts)
})

const exportLoading = ref(false)

async function handleExport() {
  exportLoading.value = true
  try {
    // Build the same query params as the current filters
    const params: Record<string, string> = {}
    if (store.searchQuery) params.search = store.searchQuery
    if (store.statusFilter) params.status = store.statusFilter
    if (store.riskFilter) params.riskLevel = store.riskFilter
    if (store.followDeptFilter) params.followDept = store.followDeptFilter
    if (store.costDeptFilter) params.costDept = store.costDeptFilter
    if (store.amountMinFilter !== undefined && store.amountMinFilter !== null) params.amountMin = String(store.amountMinFilter)
    if (store.amountMaxFilter !== undefined && store.amountMaxFilter !== null) params.amountMax = String(store.amountMaxFilter)

    const response = await apiClient.get('/contracts/export', {
      params,
      responseType: 'blob',
    })

    // Trigger file download
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `合同导出_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    ElMessage.success(`已导出 ${store.total} 条合同记录`)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '导出失败')
  } finally {
    exportLoading.value = false
  }
}
</script>

<template>
  <PageTransition>
    <div class="contracts-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">合同管理</h1>
          <p class="page-desc">管理所有合同文件</p>
        </div>
        <div class="header-actions">
          <el-button size="large" class="export-btn" @click="handleExport" :loading="exportLoading">
            <Download :size="18" />
            <span>导出CSV</span>
          </el-button>
          <el-button type="primary" size="large" class="add-btn" @click="openCreate">
            <Plus :size="18" />
            <span>新建合同</span>
          </el-button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters glass-card">
        <div class="search-wrapper">
          <el-input
            v-model="store.searchQuery"
            placeholder="搜索合同名称/编号..."
            clearable
            class="search-input"
            @input="store.setSearch(store.searchQuery)"
          />
        </div>

        <el-select
          v-model="store.statusFilter"
          placeholder="合同状态"
          clearable
          class="filter-select"
          @change="store.setStatusFilter(store.statusFilter as ContractStatus | '')"
        >
          <el-option label="进行中" value="active" />
          <el-option label="草稿" value="draft" />
          <el-option label="已过期" value="expired" />
          <el-option label="已终止" value="terminated" />
        </el-select>

        <el-select
          v-model="store.riskFilter"
          placeholder="风险等级"
          clearable
          class="filter-select"
          @change="store.setRiskFilter(store.riskFilter as RiskLevel | '')"
        >
          <el-option label="低风险" value="low" />
          <el-option label="中风险" value="medium" />
          <el-option label="高风险" value="high" />
        </el-select>

        <el-select
          v-model="store.followDeptFilter"
          placeholder="跟进部门"
          clearable
          class="filter-select"
          :disabled="isRestrictedRole"
          @change="store.setFollowDeptFilter(store.followDeptFilter)"
        >
          <el-option
            v-for="dept in departments"
            :key="dept.code"
            :label="dept.name"
            :value="dept.name"
          />
        </el-select>

        <el-select
          v-model="store.costDeptFilter"
          placeholder="费用部门"
          clearable
          class="filter-select"
          @change="store.setCostDeptFilter(store.costDeptFilter)"
        >
          <el-option
            v-for="dept in departments"
            :key="dept.code"
            :label="dept.name"
            :value="dept.name"
          />
        </el-select>

        <div class="amount-filter">
          <el-input-number
            v-model="store.amountMinFilter"
            :min="0"
            :step="10000"
            placeholder="金额起"
            class="amount-input"
            controls-position="right"
            @change="store.setAmountRange(store.amountMinFilter, store.amountMaxFilter)"
          />
          <span class="amount-sep">—</span>
          <el-input-number
            v-model="store.amountMaxFilter"
            :min="0"
            :step="10000"
            placeholder="金额止"
            class="amount-input"
            controls-position="right"
            @change="store.setAmountRange(store.amountMinFilter, store.amountMaxFilter)"
          />
        </div>
      </div>

      <!-- Table -->
      <div class="table-container glass-card">
        <div class="table-scroll">
        <el-table
          :data="store.contracts"
          v-loading="store.loading"
          border
          stripe
          style="width: 100%"
          :header-cell-style="{ background: 'transparent' }"
        >
          <el-table-column prop="contract_no" label="合同编号" width="130" show-overflow-tooltip />
          <el-table-column prop="name" label="合同名称" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="contract-name-cell">{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="party_a" label="甲方" width="110" show-overflow-tooltip />
          <el-table-column prop="party_b" label="乙方" width="110" show-overflow-tooltip />
          <el-table-column label="金额" width="110" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="amount-cell" :title="'¥' + row.amount.toLocaleString()">{{ formatAmount(row.amount) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="不含税金额" width="110" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="amount-cell">{{ formatAmount(row.amount_excluding_tax || 0) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="税率" width="70" show-overflow-tooltip>
            <template #default="{ row }">
              <span>{{ row.tax_rate ? row.tax_rate + '%' : '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="quality_deposit" label="质保金" width="100" show-overflow-tooltip />
          <el-table-column prop="start_date" label="起始日期" width="100" show-overflow-tooltip />
          <el-table-column prop="end_date" label="结束日期" width="100" show-overflow-tooltip />
          <el-table-column prop="contract_term" label="合同期限" width="100" show-overflow-tooltip />
          <el-table-column prop="insurance_info" label="保险情况" width="120" show-overflow-tooltip />
          <el-table-column prop="insurance_date" label="保险日期" width="100" show-overflow-tooltip />
          <el-table-column prop="follow_dept" label="跟进部门" width="100" show-overflow-tooltip />
          <el-table-column prop="cost_dept" label="费用部门" width="100" show-overflow-tooltip />
          <el-table-column prop="cost_code" label="费用代码" width="100" show-overflow-tooltip />
          <el-table-column label="状态" width="90" show-overflow-tooltip>
            <template #default="{ row }">
              <StatusBadge :status="row.status" />
            </template>
          </el-table-column>
          <el-table-column label="风险" width="80" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="risk-cell" :style="{ color: getRiskColor(row.risk_level) }">
                <span class="risk-dot" :style="{ background: getRiskColor(row.risk_level) }"></span>
                {{ getRiskLabel(row.risk_level) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="360" fixed="right" class-name="action-column">
            <template #default="{ row }">
              <div class="action-icons">
                <el-button text size="small" type="primary" @click="openEdit(row)">
                  <Edit :size="13" /> 编辑
                </el-button>
                <el-popconfirm title="确定删除此合同？" @confirm="handleDelete(row.id)">
                  <template #reference>
                    <el-button text size="small" type="danger">
                      <Delete :size="13" />
                    </el-button>
                  </template>
                </el-popconfirm>
                <span class="action-sep">|</span>
                <el-tooltip content="上传合同扫描件" placement="top">
                  <el-button text size="small" class="icon-btn" @click="handleUploadContract(row)" :loading="uploadContractLoading[row.id]">
                    <Upload :size="14" />
                  </el-button>
                </el-tooltip>
                <el-tooltip v-if="row.file_path" content="打开合同扫描件" placement="top">
                  <el-button text size="small" class="icon-btn" type="primary" @click="openContractFile(row)">
                    <Eye :size="14" />
                  </el-button>
                </el-tooltip>
                <el-popconfirm v-if="row.file_path" title="删除合同扫描件？" @confirm="deleteContractFile(row)">
                  <template #reference>
                    <el-button text size="small" class="icon-btn" type="danger">
                      <Delete :size="14" />
                    </el-button>
                  </template>
                </el-popconfirm>
                <span class="action-sep">|</span>
                <el-tooltip content="上传保单扫描件" placement="top">
                  <el-button text size="small" class="icon-btn" type="warning" @click="handleUploadInsurance(row)" :loading="uploadInsuranceLoading[row.id]">
                    <Upload :size="14" />
                  </el-button>
                </el-tooltip>
                <el-tooltip v-if="row.insurance_file_path" content="打开保单扫描件" placement="top">
                  <el-button text size="small" class="icon-btn" type="warning" @click="openInsuranceFile(row)">
                    <Eye :size="14" />
                  </el-button>
                </el-tooltip>
                <el-popconfirm v-if="row.insurance_file_path" title="删除保单扫描件？" @confirm="deleteInsuranceFile(row)">
                  <template #reference>
                    <el-button text size="small" class="icon-btn" type="danger">
                      <Delete :size="14" />
                    </el-button>
                  </template>
                </el-popconfirm>
              </div>
            </template>
          </el-table-column>
        </el-table>
        </div>

        <!-- Empty state -->
        <el-empty v-if="!store.loading && store.contracts.length === 0" description="暂无匹配的合同" />

        <!-- Pagination -->
        <div v-if="store.total > 0" class="pagination-wrapper">
          <el-pagination
            v-model:current-page="store.currentPage"
            :page-size="store.pageSize"
            :total="store.total"
            layout="prev, pager, next"
            @current-change="store.setPage"
          />
        </div>
      </div>

      <!-- Create/Edit Dialog -->
      <el-dialog
        v-model="dialogVisible"
        :title="dialogTitle"
        width="800px"
        top="5vh"
        :close-on-click-modal="false"
        class="contract-dialog"
      >
        <div class="dialog-ai-bar" v-if="!editingId">
          <el-button type="primary" size="small" @click="handleAiExtract" :loading="aiExtractLoading" class="ai-extract-btn">
            <Sparkles :size="14" />
            <span>AI 提取合同内容</span>
          </el-button>
          <span class="ai-bar-hint">上传合同扫描件，AI 自动识别合同名称、双方主体、金额、日期等信息</span>
        </div>
        <div class="dialog-scroll">
        <el-form ref="formRef" :model="form" label-position="top" size="large">
          <div class="dialog-section">
            <h4 class="dialog-section-title">基本信息</h4>
            <div class="form-row">
              <el-form-item label="合同编号" required>
                <el-input v-model="form.contractNo" placeholder="如：HT-2024-001" />
              </el-form-item>
              <el-form-item label="合同名称" required>
                <el-input v-model="form.name" placeholder="请输入合同名称" />
              </el-form-item>
            </div>
            <div class="form-row">
              <el-form-item label="甲方" required>
                <el-input v-model="form.partyA" placeholder="甲方名称" />
              </el-form-item>
              <el-form-item label="乙方" required>
                <el-input v-model="form.partyB" placeholder="乙方名称" />
              </el-form-item>
            </div>
            <div class="form-row">
              <el-form-item label="合同类型" required>
                <el-select v-model="form.type" placeholder="选择类型" style="width:100%">
                  <el-option label="采购" value="采购" />
                  <el-option label="服务" value="服务" />
                  <el-option label="租赁" value="租赁" />
                  <el-option label="营销" value="营销" />
                  <el-option label="技术" value="技术" />
                  <el-option label="咨询" value="咨询" />
                  <el-option label="人力资源" value="人力资源" />
                  <el-option label="物流" value="物流" />
                </el-select>
              </el-form-item>
              <el-form-item label="合同状态" required>
                <el-select v-model="form.status" style="width:100%">
                  <el-option label="进行中" value="active" />
                  <el-option label="草稿" value="draft" />
                  <el-option label="已过期" value="expired" />
                  <el-option label="已终止" value="terminated" />
                </el-select>
              </el-form-item>
            </div>
          </div>

          <div class="dialog-section">
            <h4 class="dialog-section-title">金额信息</h4>
            <div class="form-row">
              <el-form-item label="合同金额" required>
                <el-input-number v-model="form.amount" :min="0" :step="10000" style="width:100%" />
              </el-form-item>
              <el-form-item label="不含税金额" required>
                <el-input-number v-model="form.amountExcludingTax" :min="0" :step="10000" style="width:100%" />
              </el-form-item>
              <el-form-item label="税率(%)" required>
                <el-input-number v-model="form.taxRate" :min="0" :max="100" :step="1" style="width:100%" />
              </el-form-item>
            </div>
            <el-form-item label="质保金情况" required>
              <el-input v-model="form.qualityDeposit" placeholder="如：合同金额的5%" />
            </el-form-item>
          </div>

          <div class="dialog-section">
            <h4 class="dialog-section-title">时间信息</h4>
            <div class="form-row">
              <el-form-item label="起始日期" required>
                <el-date-picker v-model="form.startDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width:100%" />
              </el-form-item>
              <el-form-item label="结束日期" required>
                <el-date-picker v-model="form.endDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width:100%" />
              </el-form-item>
              <el-form-item label="合同期限" required>
                <el-input v-model="form.contractTerm" placeholder="如：1年" />
              </el-form-item>
            </div>
          </div>

          <div class="dialog-section">
            <h4 class="dialog-section-title">保险信息</h4>
            <div class="form-row">
              <el-form-item label="保险情况" required>
                <el-input v-model="form.insuranceInfo" placeholder="如：已购买工程一切险" />
              </el-form-item>
              <el-form-item label="保险日期" required>
                <el-date-picker v-model="form.insuranceDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width:100%" />
              </el-form-item>
            </div>
          </div>

          <div class="dialog-section">
            <h4 class="dialog-section-title">部门信息</h4>
            <div class="form-row">
              <el-form-item label="跟进部门" required>
                <el-select v-model="form.followDept" placeholder="选择跟进部门" style="width:100%" filterable>
                  <el-option
                    v-for="dept in departments"
                    :key="dept.code"
                    :label="dept.name"
                    :value="dept.name"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="费用部门" required>
                <el-select v-model="form.costDept" placeholder="选择费用部门" style="width:100%" filterable>
                  <el-option
                    v-for="dept in departments"
                    :key="dept.code"
                    :label="dept.name"
                    :value="dept.name"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="费用代码" required>
                <el-input v-model="form.costCode" placeholder="如：CG-001" />
              </el-form-item>
            </div>
          </div>

          <div class="form-row" style="margin-top:8px">
            <el-form-item label="风险等级" required>
              <el-select v-model="form.riskLevel" style="width:100%">
                <el-option label="低风险" value="low" />
                <el-option label="中风险" value="medium" />
                <el-option label="高风险" value="high" />
              </el-select>
            </el-form-item>
          </div>
        </el-form>
        </div>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSave">保存</el-button>
        </template>
      </el-dialog>
    </div>
  </PageTransition>
</template>

<style scoped>
.contracts-page {
  width: 100%;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
  letter-spacing: -0.5px;
}

.page-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.add-btn {
  border-radius: var(--radius-button) !important;
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.export-btn {
  border-radius: var(--radius-button) !important;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Filters */
.filters {
  padding: 16px;
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.search-input {
  width: 240px;
}

.search-input :deep(.el-input__wrapper) {
  height: 36px;
  border-radius: var(--radius-input) !important;
}

.filter-select {
  width: 130px;
}

.filter-select :deep(.el-input__wrapper) {
  border-radius: var(--radius-input) !important;
}

.amount-filter {
  display: flex;
  align-items: center;
  gap: 4px;
}

.amount-input {
  width: 110px;
}

.amount-input :deep(.el-input__wrapper) {
  border-radius: var(--radius-input) !important;
}

.amount-sep {
  color: var(--text-secondary);
  font-size: 12px;
}

/* Table */
.table-container {
  padding: 0;
  overflow: hidden;
}

.table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.contract-name-cell {
  font-weight: 500;
  color: var(--text-primary);
}

.amount-cell {
  font-weight: 600;
  color: var(--text-primary);
}

.risk-cell {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
}

.risk-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.pagination-wrapper {
  padding: 16px 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}

/* Action column background */
.action-column :deep(.el-table__cell) {
  background-color: #f8f9fa !important;
}

/* Action icons */
.action-icons {
  display: flex;
  align-items: center;
  gap: 1px;
  white-space: nowrap;
}

.action-icons .icon-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.action-icons .icon-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}

.action-sep {
  color: rgba(0, 0, 0, 0.12);
  font-size: 12px;
  margin: 0 4px;
  user-select: none;
}

/* Dialog */
.dialog-section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.dialog-section:last-of-type {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.dialog-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .el-form-item {
  flex: 1;
}

/* Dialog */
.contract-dialog :deep(.el-dialog__body) {
  padding-top: 12px;
  padding-bottom: 12px;
  max-height: 70vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-ai-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  margin-bottom: 12px;
  background: rgba(175, 82, 222, 0.06);
  border-radius: 10px;
  flex-shrink: 0;
}

.ai-extract-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.ai-bar-hint {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.3;
}

.dialog-scroll {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.dialog-scroll::-webkit-scrollbar {
  width: 4px;
}

.dialog-scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 2px;
}
</style>
