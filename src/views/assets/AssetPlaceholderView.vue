<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { PackageSearch } from 'lucide-vue-next'
import PageTransition from '@/components/common/PageTransition.vue'

const route = useRoute()
const title = computed(() => String(route.meta.title || '资产管理'))
</script>

<template>
  <PageTransition>
    <div class="page">
      <div class="placeholder">
        <PackageSearch :size="42" />
        <h1>{{ title }}</h1>
        <p>该功能入口已创建，下一阶段将继续完善导入导出、审批、库存流水和成本分析。</p>
      </div>
    </div>
  </PageTransition>
</template>

<style scoped>
.page { padding: 0; }
.placeholder {
  min-height: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: #fff;
  color: var(--text-secondary);
}
.placeholder h1 { margin: 0; color: var(--text-primary); font-size: 24px; }
.placeholder p { margin: 0; font-size: 14px; }
</style>
