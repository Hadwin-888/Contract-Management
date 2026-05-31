<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElButton, ElInput, ElSelect, ElOption, ElMessage } from 'element-plus'
import { Brain, Key, Save, Users, FileText, Shield, CheckCircle2, Eye, EyeOff, Building2, FolderOpen } from 'lucide-vue-next'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import PageTransition from '@/components/common/PageTransition.vue'
import { fetchAiConfig, updateAiConfig } from '@/api/ai-config'
import { changeMyPassword } from '@/api/users'
import type { AiConfig } from '@/api/ai-config'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Active tab based on current route
const activeTab = ref(route.path)

watch(() => route.path, (path) => {
  activeTab.value = path
})

function switchTab(path: string) {
  router.push(path)
}

// AI config
const aiConfig = ref<AiConfig>({
  model: 'deepseek',
  deepseekApiKey: '',
  minimaxApiKey: '',
  qwenApiKey: '',
})
const loading = ref(false)
const saving = ref(false)
const showKeys = ref<Record<string, boolean>>({
  deepseek: false,
  minimax: false,
  qwen: false,
})

const modelOptions = [
  { value: 'deepseek', label: 'DeepSeek', desc: 'DeepSeek Chat / DeepSeek Reasoner' },
  { value: 'minimax', label: 'MiniMax', desc: 'MiniMax abab 系列模型' },
  { value: 'qwen', label: '千问', desc: '通义千问 Qwen 系列模型' },
]

const selectedModelInfo = computed(() => {
  return modelOptions.find((m) => m.value === aiConfig.value.model)
})

// Password form
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const savingPassword = ref(false)

onMounted(async () => {
  await loadConfig()
})

async function loadConfig() {
  loading.value = true
  try {
    const config = await fetchAiConfig()
    aiConfig.value = config
  } catch (error: any) {
    console.error('Failed to load AI config:', error)
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    const updated = await updateAiConfig({
      model: aiConfig.value.model,
      deepseekApiKey: aiConfig.value.deepseekApiKey,
      minimaxApiKey: aiConfig.value.minimaxApiKey,
      qwenApiKey: aiConfig.value.qwenApiKey,
    })
    aiConfig.value = updated
    ElMessage.success('AI 配置已保存')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '保存失败')
  } finally {
    saving.value = false
  }
}

function toggleKeyVisibility(provider: string) {
  showKeys.value[provider] = !showKeys.value[provider]
}

async function changePassword() {
  if (!passwordForm.value.currentPassword || !passwordForm.value.newPassword) {
    ElMessage.warning('请填写完整信息')
    return
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    ElMessage.error('两次输入的密码不一致')
    return
  }
  if (passwordForm.value.newPassword.length < 6) {
    ElMessage.error('密码至少6位')
    return
  }

  savingPassword.value = true
  try {
    await changeMyPassword(passwordForm.value.currentPassword, passwordForm.value.newPassword)
    ElMessage.success('密码已修改')
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '修改失败')
  } finally {
    savingPassword.value = false
  }
}

// Check permissions for sub-page tabs
const canManageUsers = computed(() => authStore.hasPermission('users'))
const canManageAuditConfig = computed(() => authStore.hasPermission('audit-config'))
const canManageDepartments = computed(() => authStore.hasPermission('departments'))
const canManageStorage = computed(() => authStore.hasPermission('storage'))
</script>

<template>
  <PageTransition>
    <div class="settings-page">
      <div class="page-header">
        <h1 class="page-title">系统设置</h1>
        <p class="page-desc">管理账户和系统配置</p>
      </div>

      <!-- Sub-navigation tabs -->
      <div class="settings-tabs glass-card">
        <button
          class="tab-item"
          :class="{ active: activeTab === '/settings/users' }"
          @click="switchTab('/settings/users')"
          v-if="canManageUsers"
        >
          <Users :size="18" />
          <span>用户管理</span>
        </button>
        <button
          class="tab-item"
          :class="{ active: activeTab === '/settings/audit-config' }"
          @click="switchTab('/settings/audit-config')"
          v-if="canManageAuditConfig"
        >
          <FileText :size="18" />
          <span>审核配置</span>
        </button>
        <button
          class="tab-item"
          :class="{ active: activeTab === '/settings/departments' }"
          @click="switchTab('/settings/departments')"
          v-if="canManageDepartments"
        >
          <Building2 :size="18" />
          <span>部门设置</span>
        </button>
        <button
          class="tab-item"
          :class="{ active: activeTab === '/settings/storage' }"
          @click="switchTab('/settings/storage')"
          v-if="canManageStorage"
        >
          <FolderOpen :size="18" />
          <span>存储设置</span>
        </button>
        <button
          class="tab-item"
          :class="{ active: activeTab === '/settings' || activeTab === '/settings/profile' }"
          @click="switchTab('/settings')"
        >
          <Brain :size="18" />
          <span>AI设置</span>
        </button>
      </div>

      <!-- Render child routes (UserSettings, AuditConfig) -->
      <div v-if="activeTab !== '/settings'" class="settings-child">
        <router-view />
      </div>

      <!-- AI Settings (shown when at /settings root) -->
      <div v-else class="settings-list settings-narrow">

        <!-- Model Selection -->
        <div class="settings-section glass-card">
          <div class="section-header">
            <div class="section-icon" style="background: rgba(175,82,222,0.1)">
              <Brain :size="20" color="#af52de" />
            </div>
            <div>
              <h3 class="section-title">AI 模型选择</h3>
              <p class="section-desc">选择 AI 审核使用的模型</p>
            </div>
          </div>
          <div class="section-body">
            <div class="form-row">
              <label class="form-label">AI 模型</label>
              <div class="model-select-wrapper">
                <el-select v-model="aiConfig.model" style="width:100%" placeholder="请选择 AI 模型">
                  <el-option
                    v-for="opt in modelOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
                <div class="model-info" v-if="selectedModelInfo">
                  <CheckCircle2 :size="14" color="#34c759" />
                  <span>{{ selectedModelInfo.desc }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- API Key Configuration -->
        <div class="settings-section glass-card">
          <div class="section-header">
            <div class="section-icon" style="background: rgba(255,149,0,0.1)">
              <Key :size="20" color="#ff9500" />
            </div>
            <div>
              <h3 class="section-title">API Key 配置</h3>
              <p class="section-desc">为各 AI 模型配置 API 密钥</p>
            </div>
          </div>
          <div class="section-body">
            <!-- DeepSeek -->
            <div class="api-key-card" :class="{ active: aiConfig.model === 'deepseek' }">
              <div class="api-key-header">
                <div class="api-key-provider">
                  <span class="provider-name">DeepSeek</span>
                  <span class="provider-badge" v-if="aiConfig.deepseekApiKey">已配置</span>
                  <span class="provider-badge missing" v-else>未配置</span>
                </div>
                <div class="api-key-status">
                  <span v-if="aiConfig.model === 'deepseek'" class="active-badge">当前使用</span>
                </div>
              </div>
              <div class="api-key-input-row">
                <el-input
                  v-model="aiConfig.deepseekApiKey"
                  :type="showKeys.deepseek ? 'text' : 'password'"
                  placeholder="输入 DeepSeek API Key (sk-...)"
                  class="form-input"
                />
                <el-button text @click="toggleKeyVisibility('deepseek')">
                  <Eye v-if="!showKeys.deepseek" :size="16" />
                  <EyeOff v-else :size="16" />
                </el-button>
              </div>
            </div>

            <!-- MiniMax -->
            <div class="api-key-card" :class="{ active: aiConfig.model === 'minimax' }">
              <div class="api-key-header">
                <div class="api-key-provider">
                  <span class="provider-name">MiniMax</span>
                  <span class="provider-badge" v-if="aiConfig.minimaxApiKey">已配置</span>
                  <span class="provider-badge missing" v-else>未配置</span>
                </div>
                <div class="api-key-status">
                  <span v-if="aiConfig.model === 'minimax'" class="active-badge">当前使用</span>
                </div>
              </div>
              <div class="api-key-input-row">
                <el-input
                  v-model="aiConfig.minimaxApiKey"
                  :type="showKeys.minimax ? 'text' : 'password'"
                  placeholder="输入 MiniMax API Key"
                  class="form-input"
                />
                <el-button text @click="toggleKeyVisibility('minimax')">
                  <Eye v-if="!showKeys.minimax" :size="16" />
                  <EyeOff v-else :size="16" />
                </el-button>
              </div>
            </div>

            <!-- 千问 -->
            <div class="api-key-card" :class="{ active: aiConfig.model === 'qwen' }">
              <div class="api-key-header">
                <div class="api-key-provider">
                  <span class="provider-name">千问 (Qwen)</span>
                  <span class="provider-badge" v-if="aiConfig.qwenApiKey">已配置</span>
                  <span class="provider-badge missing" v-else>未配置</span>
                </div>
                <div class="api-key-status">
                  <span v-if="aiConfig.model === 'qwen'" class="active-badge">当前使用</span>
                </div>
              </div>
              <div class="api-key-input-row">
                <el-input
                  v-model="aiConfig.qwenApiKey"
                  :type="showKeys.qwen ? 'text' : 'password'"
                  placeholder="输入通义千问 API Key"
                  class="form-input"
                />
                <el-button text @click="toggleKeyVisibility('qwen')">
                  <Eye v-if="!showKeys.qwen" :size="16" />
                  <EyeOff v-else :size="16" />
                </el-button>
              </div>
            </div>

            <div class="form-actions">
              <el-button type="primary" @click="handleSave" :loading="saving" size="large">
                <Save :size="16" /> 保存配置
              </el-button>
            </div>
          </div>
        </div>

        <!-- Account Security -->
        <div class="settings-section glass-card">
          <div class="section-header">
            <div class="section-icon" style="background: rgba(255,59,48,0.1)">
              <Shield :size="20" color="#ff3b30" />
            </div>
            <div>
              <h3 class="section-title">账户安全</h3>
              <p class="section-desc">修改密码</p>
            </div>
          </div>
          <div class="section-body">
            <div class="form-row">
              <label class="form-label">当前密码</label>
              <el-input
                v-model="passwordForm.currentPassword"
                type="password"
                show-password
                class="form-input"
              />
            </div>
            <div class="form-row">
              <label class="form-label">新密码</label>
              <el-input
                v-model="passwordForm.newPassword"
                type="password"
                show-password
                class="form-input"
                placeholder="至少6位字符"
              />
            </div>
            <div class="form-row">
              <label class="form-label">确认密码</label>
              <el-input
                v-model="passwordForm.confirmPassword"
                type="password"
                show-password
                class="form-input"
              />
            </div>
            <div class="form-actions">
              <el-button type="primary" @click="changePassword" :loading="savingPassword">
                <Save :size="16" /> 修改密码
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageTransition>
</template>

<style scoped>
.settings-page {
  width: 100%;
}

.page-header {
  margin-bottom: 20px;
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

/* Sub-navigation tabs */
.settings-tabs {
  padding: 6px;
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: var(--radius-button);
  border: none;
  background: none;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.tab-item:hover {
  background: rgba(0, 122, 255, 0.06);
  color: var(--apple-blue);
}

.tab-item.active {
  background: rgba(0, 122, 255, 0.1);
  color: var(--apple-blue);
  font-weight: 600;
}

/* Settings sections */
.settings-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-section {
  padding: 24px;
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

.form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}

/* Model select */
.model-select-wrapper {
  flex: 1;
}

.model-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-name {
  font-weight: 500;
}

.model-desc {
  font-size: 11px;
  color: var(--text-secondary);
}

.model-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* API Key cards */
.api-key-card {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(0, 0, 0, 0.02);
  transition: all 0.2s;
}

.api-key-card.active {
  border-color: var(--apple-blue);
  background: rgba(0, 122, 255, 0.03);
}

.api-key-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.api-key-provider {
  display: flex;
  align-items: center;
  gap: 8px;
}

.provider-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.provider-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(52, 199, 89, 0.1);
  color: #34c759;
  font-weight: 500;
}

.provider-badge.missing {
  background: rgba(142, 142, 147, 0.1);
  color: #8e8e93;
}

.active-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(0, 122, 255, 0.1);
  color: var(--apple-blue);
  font-weight: 500;
}

.api-key-input-row {
  display: flex;
  gap: 8px;
}

.settings-narrow {
  max-width: 900px;
}

.settings-child {
  width: 100%;
}

@media (max-width: 768px) {
  .settings-tabs {
    flex-wrap: wrap;
  }
}
</style>
