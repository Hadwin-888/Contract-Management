<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, CheckCircle2 } from 'lucide-vue-next'
import PageTransition from '@/components/common/PageTransition.vue'
import {
  fetchAssetPurchaseOrders,
  fetchAssetReceivingRecords,
  createAssetReceiving,
  submitAssetReceiving,
} from '@/api/assets'
import type { AssetPurchaseOrder, AssetReceivingRecord } from '@/api/assets'

const loading = ref(false)
const orders = ref<AssetPurchaseOrder[]>([])
const receipts = ref<AssetReceivingRecord[]>([])
const dialogVisible = ref(false)
const form = ref({ orderId: '', warehouse: 'DEFAULT', remark: '' })

const statusLabel: Record<string, string> = { draft: '草稿', pending: '待审批', approved: '已入库', rejected: '已驳回' }

onMounted(loadAll)

async function loadAll() {
  loading.value = true
  try {
    const [orderResult, receiptResult] = await Promise.all([fetchAssetPurchaseOrders(), fetchAssetReceivingRecords()])
    orders.value = orderResult.items
    receipts.value = receiptResult.items
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.value = { orderId: '', warehouse: 'DEFAULT', remark: '' }
  dialogVisible.value = true
}

async function handleCreate() {
  if (!form.value.orderId) {
    ElMessage.warning('请选择采购订单')
    return
  }
  try {
    await createAssetReceiving(form.value)
    ElMessage.success('收货单已创建')
    dialogVisible.value = false
    await loadAll()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '创建失败')
  }
}

async function handleSubmit(row: AssetReceivingRecord) {
  try {
    await submitAssetReceiving(row.id)
    ElMessage.success('已提交审批')
    await loadAll()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '提交失败')
  }
}
</script>

<template>
  <PageTransition>
    <div class="page" v-loading="loading">
      <div class="page-header">
        <div>
          <h1 class="page-title">收货</h1>
          <p class="page-desc">按采购订单生成收货单，审批通过后自动写入库存余额和库存流水。</p>
        </div>
        <el-button type="primary" @click="openCreate"><Plus :size="16" />新建收货单</el-button>
      </div>

      <el-table :data="receipts" border>
        <el-table-column prop="receiptNo" label="收货单号" min-width="150" />
        <el-table-column prop="order.orderNo" label="采购订单" min-width="150" />
        <el-table-column prop="warehouse" label="仓库" width="120" />
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }"><el-tag>{{ statusLabel[row.status] || row.status }}</el-tag></template>
        </el-table-column>
        <el-table-column label="明细数" width="100"><template #default="{ row }">{{ row.items?.length || 0 }}</template></el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'draft'" text size="small" type="primary" @click="handleSubmit(row)">
              <CheckCircle2 :size="14" />提交审批
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="dialogVisible" title="新建收货单" width="560px">
        <el-form :model="form" label-position="top">
          <el-form-item label="采购订单" required>
            <el-select v-model="form.orderId" filterable style="width:100%" placeholder="选择采购订单">
              <el-option v-for="order in orders" :key="order.id" :label="`${order.orderNo} · ${order.supplier?.suppliersNameCn || ''}`" :value="order.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="仓库">
            <el-input v-model="form.warehouse" placeholder="如 DEFAULT / 主仓 / 工程仓" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="form.remark" type="textarea" :rows="3" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleCreate">创建收货单</el-button>
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
</style>
