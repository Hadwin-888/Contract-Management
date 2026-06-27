<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PageTransition from '@/components/common/PageTransition.vue'
import { fetchInventoryBalances, fetchInventoryTransactions } from '@/api/assets'
import type { InventoryBalance, InventoryTransaction } from '@/api/assets'

const loading = ref(false)
const balances = ref<InventoryBalance[]>([])
const transactions = ref<InventoryTransaction[]>([])
const activeTab = ref<'balance' | 'transactions'>('balance')

onMounted(loadAll)

async function loadAll() {
  loading.value = true
  try {
    const [balanceResult, transactionResult] = await Promise.all([fetchInventoryBalances(), fetchInventoryTransactions()])
    balances.value = balanceResult.items
    transactions.value = transactionResult.items
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <PageTransition>
    <div class="page" v-loading="loading">
      <div class="page-header">
        <div>
          <h1 class="page-title">库存管理</h1>
          <p class="page-desc">查看物资当前库存和收货入库流水，后续可扩展出库、转货、报损和盘点。</p>
        </div>
        <el-button @click="loadAll">刷新</el-button>
      </div>

      <div class="tabs">
        <button :class="{ active: activeTab === 'balance' }" @click="activeTab = 'balance'">当前库存</button>
        <button :class="{ active: activeTab === 'transactions' }" @click="activeTab = 'transactions'">库存流水</button>
      </div>

      <el-table v-if="activeTab === 'balance'" :data="balances" border>
        <el-table-column prop="warehouse" label="仓库" width="140" />
        <el-table-column prop="item.itemNo" label="品项代码" min-width="130" />
        <el-table-column prop="item.itemName" label="品项名称" min-width="200" />
        <el-table-column prop="item.itemUnit" label="单位" width="100" />
        <el-table-column prop="quantity" label="库存数量" width="130" />
      </el-table>

      <el-table v-else :data="transactions" border>
        <el-table-column prop="createdAt" label="时间" min-width="170">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString('zh-CN') }}</template>
        </el-table-column>
        <el-table-column prop="warehouse" label="仓库" width="120" />
        <el-table-column prop="operationType" label="操作类型" width="110" />
        <el-table-column prop="item.itemNo" label="品项代码" min-width="130" />
        <el-table-column prop="item.itemName" label="品项名称" min-width="200" />
        <el-table-column prop="quantity" label="数量" width="110" />
        <el-table-column prop="unit" label="单位" width="90" />
      </el-table>
    </div>
  </PageTransition>
</template>

<style scoped>
.page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 18px; }
.page-title { margin: 0; font-size: 24px; font-weight: 700; }
.page-desc { margin: 6px 0 0; color: var(--text-secondary); font-size: 13px; }
.tabs { display: flex; gap: 4px; margin-bottom: 14px; background: #f3f4f6; padding: 4px; border-radius: 8px; width: fit-content; }
.tabs button { border: 0; border-radius: 6px; padding: 7px 14px; background: transparent; cursor: pointer; color: var(--text-secondary); }
.tabs button.active { background: #fff; color: var(--text-primary); font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
</style>
