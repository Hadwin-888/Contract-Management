<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Eye, EyeOff, LogIn, Image } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import CartoonCharacter from '@/components/login/CartoonCharacter.vue'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const focusedField = ref<'none' | 'username' | 'password'>('none')

// Background state
const bgType = ref<'gradient' | 'image'>('gradient')
const customBgImage = ref('')

// Character position state
const characterPos = computed(() => {
  switch (focusedField.value) {
    case 'username': return 'left'
    case 'password': return 'peek'
    default: return 'top'
  }
})

const characterState = computed(() => {
  switch (focusedField.value) {
    case 'username': return 'looking'
    case 'password': return 'peeking'
    default: return 'idle'
  }
})

// Saved background from localStorage
onMounted(() => {
  const saved = localStorage.getItem('loginBgImage')
  if (saved) {
    customBgImage.value = saved
    bgType.value = 'image'
  }
})

function handleBgChange() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e: any) => {
    const file = e.target?.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      customBgImage.value = dataUrl
      bgType.value = 'image'
      localStorage.setItem('loginBgImage', dataUrl)
      ElMessage.success('背景已更换')
    }
    reader.readAsDataURL(file)
  }
  input.click()
}

function resetBg() {
  bgType.value = 'gradient'
  customBgImage.value = ''
  localStorage.removeItem('loginBgImage')
}

async function handleLogin() {
  if (!username.value || !password.value) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  loading.value = true

  try {
    await authStore.login(username.value, password.value)
    ElMessage.success('登录成功！')
    router.push('/dashboard')
  } catch (error: any) {
    const message = error?.response?.data?.error || '登录失败，请检查用户名和密码'
    ElMessage.error(message)
  } finally {
    loading.value = false
  }
}

function onUsernameFocus() {
  focusedField.value = 'username'
}

function onUsernameBlur() {
  if (focusedField.value === 'username') {
    focusedField.value = 'none'
  }
}

function onPasswordFocus() {
  focusedField.value = 'password'
}

function onPasswordBlur() {
  if (focusedField.value === 'password') {
    focusedField.value = 'none'
  }
}
</script>

<template>
  <div class="login-page" :class="{ 'has-image-bg': bgType === 'image' }">
    <!-- Background layers — use v-show so both are rendered, just one shown -->
    <div class="gradient-bg" v-show="bgType === 'gradient'">
      <div class="gradient-sphere sphere-1"></div>
      <div class="gradient-sphere sphere-2"></div>
      <div class="gradient-sphere sphere-3"></div>
    </div>
    <div class="custom-bg" v-show="bgType === 'image'">
      <div class="custom-bg-img" :style="{ backgroundImage: 'url(' + customBgImage + ')' }"></div>
      <div class="custom-bg-overlay"></div>
    </div>

    <!-- Background control button -->
    <div class="bg-controls">
      <el-dropdown trigger="click" placement="top-end">
        <button class="bg-btn" title="更换背景">
          <Image :size="16" />
        </button>
        <template #dropdown>
          <div class="bg-dropdown">
            <button class="bg-dropdown-item" @click="handleBgChange">
              <span class="bg-dropdown-icon">🖼️</span>
              <span>选择本地图片</span>
            </button>
            <button v-if="bgType === 'image'" class="bg-dropdown-item" @click="resetBg">
              <span class="bg-dropdown-icon">🎨</span>
              <span>恢复默认渐变</span>
            </button>
          </div>
        </template>
      </el-dropdown>
    </div>

    <!-- Login scene -->
    <div class="login-scene">
      <!-- Cartoon character -->
      <div class="character-area" :class="characterPos">
        <CartoonCharacter :state="characterState" />
      </div>

      <!-- Login card -->
      <div class="login-card glass">
        <h1 class="welcome-title">欢迎使用AI合同管理平台</h1>
        <p class="welcome-subtitle">请登录您的账号</p>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="input-group">
            <div class="input-icon">
              <User :size="18" />
            </div>
            <el-input
              v-model="username"
              placeholder="用户名"
              :prefix-icon="null"
              size="large"
              class="login-input"
              @focus="onUsernameFocus"
              @blur="onUsernameBlur"
            />
          </div>

          <div class="input-group">
            <div class="input-icon">
              <Lock :size="18" />
            </div>
            <el-input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="密码"
              :prefix-icon="null"
              size="large"
              class="login-input"
              @focus="onPasswordFocus"
              @blur="onPasswordBlur"
            >
              <template #suffix>
                <button
                  type="button"
                  class="password-toggle"
                  @click="showPassword = !showPassword"
                  tabindex="-1"
                >
                  <Eye v-if="!showPassword" :size="18" />
                  <EyeOff v-else :size="18" />
                </button>
              </template>
            </el-input>
          </div>

          <el-button
            type="primary"
            size="large"
            class="login-button"
            :loading="loading"
            native-type="submit"
          >
            <LogIn :size="18" />
            <span>登录</span>
          </el-button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: #f5f5f7;
}

/* === Animated gradient background === */
.gradient-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.gradient-sphere {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: float 8s ease-in-out infinite;
}

.sphere-1 {
  width: 400px;
  height: 400px;
  background: #007aff;
  top: -10%;
  left: -5%;
  animation-delay: 0s;
}

.sphere-2 {
  width: 350px;
  height: 350px;
  background: #af52de;
  bottom: -10%;
  right: -5%;
  animation-delay: 2s;
}

.sphere-3 {
  width: 300px;
  height: 300px;
  background: #34c759;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: 4s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -30px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

/* === Custom background image === */
.custom-bg {
  position: absolute;
  inset: 0;
}

.custom-bg-img {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.custom-bg-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(4px);
}

/* === Background controls === */
.bg-controls {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 100;
}

.bg-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.bg-btn:hover {
  background: white;
  color: var(--apple-blue);
  transform: scale(1.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.bg-dropdown {
  padding: 6px;
  min-width: 180px;
}

.bg-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
  transition: all 0.15s ease;
  text-align: left;
}

.bg-dropdown-item:hover {
  background: rgba(0, 122, 255, 0.08);
  color: var(--apple-blue);
}

.bg-dropdown-icon {
  font-size: 16px;
}

/* === Login scene === */
.login-scene {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0;
  width: auto;
  max-width: 95vw;
}

/* === Cartoon character area (always on the left) === */
.character-area {
  flex-shrink: 0;
  width: 190px;
  height: 220px;
  margin-right: -30px;
  z-index: 10;
  transition: none;
}

.character-area.top,
.character-area.left,
.character-area.peek {
  transform: none;
}

/* === Login card === */
.login-card {
  width: 420px;
  max-width: 100%;
  padding: 40px;
  text-align: center;
  position: relative;
  z-index: 5;
}

.welcome-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
  letter-spacing: -0.3px;
}

.welcome-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 32px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-group {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  z-index: 2;
  pointer-events: none;
}

.login-input :deep(.el-input__wrapper) {
  padding-left: 42px !important;
  height: 48px;
  border-radius: var(--radius-input) !important;
}

.password-toggle {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.password-toggle:hover {
  color: var(--text-primary);
}

.login-button {
  width: 100%;
  height: 48px;
  border-radius: var(--radius-button) !important;
  font-size: 15px;
  font-weight: 500;
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.login-button :deep(.el-button__inner) {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Responsive: on small screens, stack vertically */
@media (max-width: 700px) {
  .login-scene {
    flex-direction: column;
  }

  .character-area {
    margin-right: 0;
    margin-bottom: -40px;
    width: 140px;
    height: 160px;
  }
}
</style>
