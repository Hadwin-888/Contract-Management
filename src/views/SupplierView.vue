<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from 'lucide-vue-next'
import PageTransition from '@/components/common/PageTransition.vue'
import { fetchSuppliers, createSupplier, updateSupplier, deleteSupplier } from '@/api/procurement'
import type { Supplier } from '@/api/procurement'

const { t } = useI18n()

const suppliers = ref<Supplier[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const editingSupplier = ref<Supplier | null>(null)
const form = ref({ name: '', code: '', contact: '', phone: '', email: '', address: '', category: '' })

onMounted(() => { loadSuppliers() })

async function loadSuppliers() {
  loading.value = true
  try {
    const result = await fetchSuppliers({ pageSize: 100 })
    suppliers.value = result.items
  } catch (error) {
    console.error('Failed to load suppliers:', error)
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  editingSupplier.value = null
  form.value = { name: '', code: '', contact: '', phone: '', email: '', address: '', category: '' }
  dialogVisible.value = true
}

function openEditDialog(supplier: Supplier) {
  editingSupplier.value = supplier
  form.value = {
    name: supplier.name, code: supplier.code, contact: supplier.contact,
    phone: supplier.phone, email: supplier.email, address: supplier.address, category: supplier.category,
  }
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入供应商名称')
    return
  }
  try {
    if (editingSupplier.value) {
      await updateSupplier(editingSupplier.value.id, form.value)
      ElMessage.success('已更新')
    } else {
      await createSupplier(form.value)
      ElMessage.success('已创建')
    }
    dialogVisible.value = false
    await loadSuppliers()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '操作失败')
  }
}

async function handleDelete(supplier: Supplier) {
  try {
    await ElMessageBox.confirm(`确定删除"${supplier.name}"？`, '确认', {
      confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning',
    })
    await deleteSupplier(supplier.id)
    ElMessage.success('已删除')
    await loadSuppliers()
  } catch { /* cancelled */ }
}
</script>

<template>
  <PageTransition>
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ t('procurement.suppliers') }}</h1>
        </div>
        <el-button type="primary" @click="openCreateDialog">
          <Plus :size="18" />
          {{ t('procurement.createSupplier') }}
        </el-button>
      </div>

      <div class="supplier-list" v-loading="loading">
        <div v-for="supplier in suppliers" :key="supplier.id" class="supplier-card">
          <div class="supplier-info">
            <h3>{{ supplier.name }}</h3>
            <p v-if="supplier.contact">{{ t('procurement.contact') }}: {{ supplier.contact }}</p>
            <p v-if="supplier.phone">{{ t('procurement.phone') }}: {{ supplier.phone }}</p>
          </div>
          <div class="supplier-actions">
            <el-button text size="small" @click="openEditDialog(supplier)">{{ t('common.edit') }}</el-button>
            <el-button text size="small" type="danger" @click="handleDelete(supplier)">{{ t('common.delete') }}</el-button>
          </div>
        </div>
        <el-empty v-if="!loading && suppliers.length === 0" :description="t('common.noData')" />
      </div>

      <el-dialog v-model="dialogVisible" :title="editingSupplier ? t('common.edit') : t('procurement.createSupplier')" width="500px">
        <el-form :model="form" label-position="top">
          <el-form-item :label="t('procurement.supplierName')" required>
            <el-input v-model="form.name" />
          </el-form-item>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item :label="t('procurement.contact')">
                <el-input v-model="form.contact" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="t('procurement.phone')">
                <el-input v-model="form.phone" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item :label="t('procurement.email')">
            <el-input v-model="form.email" />
          </el-form-item>
          <el-form-item :label="t('procurement.address')">
            <el-input v-model="form.address" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" @click="handleSave">{{ t('common.save') }}</el-button>
        </template>
      </el-dialog>
    </div>
  </PageTransition>
</template>

<style scoped>
.page { padding: 0; }
.page-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px;
}
.page-title { font-size: 24px; font-weight: 700; margin: 0; }
.supplier-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
.supplier-card {
  padding: 16px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 10px;
  display: flex; justify-content: space-between; align-items: flex-start;
}
.supplier-info h3 { margin: 0 0 8px; font-size: 15px; font-weight: 600; }
.supplier-info p { margin: 2px 0; font-size: 13px; color: var(--text-secondary); }
.supplier-actions { display: flex; gap: 4px; flex-shrink: 0; }
</style>
