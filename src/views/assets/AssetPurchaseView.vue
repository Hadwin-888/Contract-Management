<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Download, ShoppingCart } from 'lucide-vue-next'
import PageTransition from '@/components/common/PageTransition.vue'
import {
  fetchAssetItems,
  fetchAssetSuppliers,
  fetchAssetPurchaseRequests,
  fetchAssetPurchaseOrders,
  createAssetPurchaseRequest,
  submitAssetPurchaseRequest,
  generateAssetPurchaseOrder,
  exportAssetPurchaseRequests,
} from '@/api/assets'
import type { AssetItem, AssetSupplier, AssetPurchaseRequest, AssetPurchaseOrder } from '@/api/assets'

const loading = ref(false)
const requests = ref<AssetPurchaseRequest[]>([])
const orders = ref<AssetPurchaseOrder[]>([])
const items = ref<AssetItem[]>([])
const suppliers = ref<AssetSupplier[]>([])
const dialogVisible = ref(false)
const form = ref<any>({ title: '', department: '', costCenter: '', reason: '', items: [] })

const statusLabel: Record<string, string> = {
  draft: '草稿',
  pending: '待审批',
  approved: '已审批',
  rejected: '已驳回',
  ordered: '已下单',
}

const total = computed(() => form.value.items.reduce((sum: number, row: any) => sum + Number(row.quantity || 0) * Number(row.unitPrice || 0), 0))

onMounted(loadAll)

async function loadAll() {
  loading.value = true
  try {
    const [requestResult, orderResult, itemResult, supplierResult] = await Promise.all([
      fetchAssetPurchaseRequests(),
      fetchAssetPurchaseOrders(),
      fetchAssetItems(),
      fetchAssetSuppliers(),
    ])
    requests.value = requestResult.items
    orders.value = orderResult.items
    items.value = itemResult.items
    suppliers.value = supplierResult.items
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.value = { title: '', department: '', costCenter: '', reason: '', items: [{ itemId: '', supplierId: '', quantity: 1, unit: '', unitPrice: 0, taxRate: 0, remark: '' }] }
  dialogVisible.value = true
}

function addRow() {
  form.value.items.push({ itemId: '', supplierId: '', quantity: 1, unit: '', unitPrice: 0, taxRate: 0, remark: '' })
}

function removeRow(index: number) {
  form.value.items.splice(index, 1)
}

function fillUnit(row: any) {
  const item = items.value.find((entry) => entry.id === row.itemId)
  if (item && !row.unit) row.unit = item.itemUnit || ''
}

async function handleCreate() {
  if (!form.value.title.trim()) {
    ElMessage.warning('请填写采购申请标题')
    return
  }
  if (form.value.items.some((row: any) => !row.itemId)) {
    ElMessage.warning('请选择采购物资')
    return
  }
  try {
    await createAssetPurchaseRequest(form.value)
    ElMessage.success('采购申请已创建')
    dialogVisible.value = false
    await loadAll()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '创建失败')
  }
}

async function handleSubmit(row: AssetPurchaseRequest) {
  try {
    await submitAssetPurchaseRequest(row.id)
    ElMessage.success('已提交审批')
    await loadAll()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '提交失败')
  }
}

async function handleGenerateOrder(row: AssetPurchaseRequest) {
  try {
    await generateAssetPurchaseOrder(row.id)
    ElMessage.success('采购订单已生成')
    await loadAll()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '生成失败')
  }
}
</script>

<template>
  <PageTransition>
    <div class="page" v-loading="loading">
      <div class="page-header">
        <div>
          <h1 class="page-title">资产采购</h1>
          <p class="page-desc">采购申请审批通过后可生成采购订单，后续在收货模块完成入库。</p>
        </div>
        <div class="actions">
          <el-button @click="exportAssetPurchaseRequests"><Download :size="16" />导出申请</el-button>
          <el-button type="primary" @click="openCreate"><Plus :size="16" />新建采购申请</el-button>
        </div>
      </div>

      <h3 class="section-title">采购申请</h3>
      <el-table :data="requests" border>
        <el-table-column prop="requestNo" label="申请单号" min-width="150" />
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column prop="requester.name" label="申请人" width="120" />
        <el-table-column prop="totalAmount" label="金额" width="130">
          <template #default="{ row }">¥{{ row.totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }"><el-tag>{{ statusLabel[row.status] || row.status }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'draft'" text size="small" type="primary" @click="handleSubmit(row)">提交审批</el-button>
            <el-button v-if="row.status === 'approved'" text size="small" @click="handleGenerateOrder(row)"><ShoppingCart :size="14" />生成订单</el-button>
          </template>
        </el-table-column>
      </el-table>

      <h3 class="section-title">采购订单</h3>
      <el-table :data="orders" border>
        <el-table-column prop="orderNo" label="订单号" min-width="150" />
        <el-table-column prop="supplier.suppliersNameCn" label="供应商" min-width="180" />
        <el-table-column prop="totalAmount" label="金额" width="130">
          <template #default="{ row }">¥{{ row.totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="110" />
        <el-table-column label="明细数" width="100"><template #default="{ row }">{{ row.items?.length || 0 }}</template></el-table-column>
      </el-table>

      <el-dialog v-model="dialogVisible" title="新建采购申请" width="920px">
        <el-form :model="form" label-position="top">
          <el-form-item label="标题" required><el-input v-model="form.title" /></el-form-item>
          <el-row :gutter="16">
            <el-col :span="12"><el-form-item label="部门"><el-input v-model="form.department" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="成本中心"><el-input v-model="form.costCenter" /></el-form-item></el-col>
          </el-row>
          <el-form-item label="采购原因"><el-input v-model="form.reason" type="textarea" :rows="2" /></el-form-item>
        </el-form>
        <div class="detail-toolbar">
          <strong>采购明细</strong>
          <el-button size="small" @click="addRow">添加明细</el-button>
        </div>
        <div v-for="(row, index) in form.items" :key="index" class="detail-row">
          <el-select v-model="row.itemId" filterable placeholder="物资" @change="fillUnit(row)">
            <el-option v-for="item in items" :key="item.id" :label="`${item.itemNo} · ${item.itemName}`" :value="item.id" />
          </el-select>
          <el-select v-model="row.supplierId" filterable clearable placeholder="供应商">
            <el-option v-for="supplier in suppliers" :key="supplier.id" :label="supplier.suppliersNameCn" :value="supplier.id" />
          </el-select>
          <el-input-number v-model="row.quantity" :min="0" placeholder="数量" />
          <el-input v-model="row.unit" placeholder="单位" />
          <el-input-number v-model="row.unitPrice" :min="0" placeholder="单价" />
          <el-button text type="danger" @click="removeRow(Number(index))">删除</el-button>
        </div>
        <p class="total-line">合计：¥{{ total.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</p>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleCreate">保存草稿</el-button>
        </template>
      </el-dialog>
    </div>
  </PageTransition>
</template>

<style scoped>
.page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 18px; }
.page-title { margin: 0; font-size: 24px; font-weight: 700; }
.page-desc { margin: 6px 0 0; color: var(--text-secondary); font-size: 13px; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.section-title { margin: 22px 0 10px; font-size: 16px; }
.detail-toolbar { display: flex; justify-content: space-between; align-items: center; margin: 8px 0; }
.detail-row { display: grid; grid-template-columns: 1.5fr 1.3fr 120px 100px 130px 70px; gap: 8px; margin-bottom: 8px; }
.total-line { text-align: right; font-weight: 700; }
</style>
