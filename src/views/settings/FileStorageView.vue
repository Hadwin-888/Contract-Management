<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElButton, ElInput, ElMessage, ElTag } from 'element-plus'
import { Save, FolderOpen, FileText, Info } from 'lucide-vue-next'
import { fetchStorageConfig, updateStorageConfig } from '@/api/storage-config'
import type { StorageConfig } from '@/api/storage-config'

const config = ref<StorageConfig>({
  contractPath: 'contract',
  insurancePath: 'insurance',
  namingRule: '{contractNo}{name}{partyB}',
})
const loading = ref(false)
const saving = ref(false)

const namingHelpItems = [
  { token: '{contractNo}', label: '合同编号' },
  { token: '{name}', label: '合同名称' },
  { token: '{partyA}', label: '甲方名称' },
  { token: '{partyB}', label: '乙方名称' },
]

onMounted(() => loadConfig())

async function loadConfig() {
  loading.value = true
  try {
    config.value = await fetchStorageConfig()
  } catch (error) {
    console.error('Failed to load storage config:', error)
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    const updated = await updateStorageConfig({
      contractPath: config.value.contractPath,
      insurancePath: config.value.insurancePath,
      namingRule: config.value.namingRule,
    })
    config.value = updated
    ElMessage.success('存储配置已保存')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '保存失败')
  } finally {
    saving.value = false
  }
}

function insertToken(token: string) {
  config.value.namingRule += token
}
</script>

<template>
  <div class="storage-settings">
    <div class="page-header">
      <h1 class="page-title">文件存储设置</h1>
      <p class="page-desc">配置合同扫描件和保险扫描件的存储路径及命名规则</p>
    </div>

    <!-- Storage Paths -->
    <div class="settings-section glass-card">
      <div class="section-header">
        <div class="section-icon" style="background: rgba(0,122,255,0.1)">
          <FolderOpen :size="20" color="#007aff" />
        </div>
        <div>
          <h3 class="section-title">存储路径配置</h3>
          <p class="section-desc">文件将存储在服务器的 uploads 目录下的子文件夹中</p>
        </div>
      </div>
      <div class="section-body">
        <div class="form-row">
          <label class="form-label">合同扫描件</label>
          <div class="path-input-wrapper">
            <el-input v-model="config.contractPath" placeholder="contract" class="form-input">
              <template #prepend>uploads/</template>
            </el-input>
          </div>
        </div>
        <div class="form-row">
          <label class="form-label">保险扫描件</label>
          <div class="path-input-wrapper">
            <el-input v-model="config.insurancePath" placeholder="insurance" class="form-input">
              <template #prepend>uploads/</template>
            </el-input>
          </div>
        </div>
      </div>
    </div>

    <!-- Naming Rule -->
    <div class="settings-section glass-card">
      <div class="section-header">
        <div class="section-icon" style="background: rgba(52,199,89,0.1)">
          <FileText :size="20" color="#34c759" />
        </div>
        <div>
          <h3 class="section-title">文件命名规则</h3>
          <p class="section-desc">上传文件时将按此规则自动重命名</p>
        </div>
      </div>
      <div class="section-body">
        <div class="form-row">
          <label class="form-label">命名规则</label>
          <div class="naming-wrapper">
            <el-input v-model="config.namingRule" placeholder="{contractNo}{name}{partyB}" class="form-input" />
            <div class="naming-hint">
              <Info :size="13" color="#86868b" />
              <span>可用变量（点击插入）：</span>
            </div>
            <div class="naming-tokens">
              <el-tag
                v-for="item in namingHelpItems"
                :key="item.token"
                size="small"
                color="#007aff"
                effect="plain"
                style="cursor:pointer; margin-right:6px; margin-bottom:4px"
                @click="insertToken(item.token)"
              >
                {{ item.label }}
              </el-tag>
            </div>
            <div class="naming-preview">
              <span class="preview-label">示例输出：</span>
              <code class="preview-value">{{ config.namingRule.replace(/\{contractNo\}/g, 'HT-2024-001').replace(/\{name\}/g, '采购合同').replace(/\{partyA\}/g, '甲方公司').replace(/\{partyB\}/g, '乙方公司').replace(/\{contractId\}/g, 'uuid') }}.pdf</code>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="form-actions">
      <el-button type="primary" size="large" @click="handleSave" :loading="saving">
        <Save :size="16" /> 保存配置
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.storage-settings {
  width: 100%;
}

.page-header {
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

.settings-section {
  padding: 24px;
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.section-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 2px;
}

.section-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

.section-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.form-label {
  width: 100px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  padding-top: 8px;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
}

.form-input :deep(.el-input__wrapper) {
  border-radius: var(--radius-input) !important;
}

.path-input-wrapper {
  flex: 1;
}

.naming-wrapper {
  flex: 1;
}

.naming-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.naming-tokens {
  margin-top: 8px;
}

.naming-preview {
  margin-top: 12px;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
  font-size: 12px;
}

.preview-label {
  color: var(--text-secondary);
  margin-right: 8px;
}

.preview-value {
  color: var(--text-primary);
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 12px;
  word-break: break-all;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}
</style>
