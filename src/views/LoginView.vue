<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { User, Lock, Eye, EyeOff, LogIn, Image } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import CartoonCharacter from '@/components/login/CartoonCharacter.vue'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const focusedField = ref<'none' | 'username' | 'password'>('none')
const bgFileInput = ref<HTMLInputElement | null>(null)

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

  // Clear any stale auth state and form defaults
  // This prevents browser autofill from using previous user's credentials
  username.value = ''
  password.value = ''
  setTimeout(() => {
    username.value = ''
    password.value = ''
  }, 100)
})

function handleBgChange() {
  bgFileInput.value?.click()
}

function handleBgFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    input.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = (ev) => {
    const dataUrl = ev.target?.result as string
    customBgImage.value = dataUrl
    bgType.value = 'image'
    try {
      localStorage.setItem('loginBgImage', dataUrl)
    } catch {
      ElMessage.warning('图片较大，已临时预览但无法保存到本地')
    }
    ElMessage.success('背景已更换')
    input.value = ''
  }
  reader.readAsDataURL(file)
}

function resetBg() {
  bgType.value = 'gradient'
  customBgImage.value = ''
  localStorage.removeItem('loginBgImage')
}

async function handleLogin() {
  const cleanUsername = username.value.trim()

  if (!cleanUsername || !password.value) {
    ElMessage.warning(t('auth.loginFail'))
    return
  }

  loading.value = true

  try {
    await authStore.login(cleanUsername, password.value)
    ElMessage.success(t('auth.loginSuccess'))
    router.push('/dashboard')
  } catch (error: any) {
    console.error('Login failed:', error)
    const message = error?.response?.data?.error
      || (error?.request ? '无法连接后端服务，请确认 API 服务已启动' : t('auth.loginFail'))
    ElMessage.error(message)
  } finally {
    loading.value = false
  }
}

function onUsernameFocus() {
  focusedField.value = 'username'
}

function onUsernameBlur(event?: FocusEvent) {
  const current = event?.currentTarget as HTMLElement | undefined
  const next = event?.relatedTarget as Node | null | undefined
  if (current && next && current.contains(next)) return

  if (focusedField.value === 'username') {
    focusedField.value = 'none'
  }
}

function onPasswordFocus() {
  focusedField.value = 'password'
}

function onPasswordBlur(event?: FocusEvent) {
  const current = event?.currentTarget as HTMLElement | undefined
  const next = event?.relatedTarget as Node | null | undefined
  if (current && next && current.contains(next)) return

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
      <LanguageSwitcher />
      <button class="bg-btn" type="button" title="更换背景图片" @click="handleBgChange">
        <Image :size="16" />
      </button>
      <button v-if="bgType === 'image'" class="bg-reset-btn" type="button" title="恢复默认背景" @click="resetBg">
        {{ t('common.reset') }}
      </button>
      <input
        ref="bgFileInput"
        class="bg-file-input"
        type="file"
        accept="image/*"
        @change="handleBgFileChange"
      />
    </div>

    <!-- Login scene -->
    <div class="login-scene">
      <!-- Cartoon character -->
      <div class="character-area" :class="characterPos">
        <CartoonCharacter :state="characterState" />
      </div>

      <!-- Login card -->
      <div class="login-card glass">
        <h1 class="welcome-title">{{ t('platform.name') }}</h1>
        <p class="welcome-subtitle">{{ t('auth.login') }}</p>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="input-group" @click="onUsernameFocus" @focusin="onUsernameFocus" @focusout="onUsernameBlur">
            <div class="input-icon">
              <User :size="18" />
            </div>
            <el-input
              v-model="username"
              :placeholder="t('auth.username')"
              :prefix-icon="null"
              size="large"
              class="login-input"
              autocomplete="off"
              name="username"
            />
          </div>

          <div class="input-group" @click="onPasswordFocus" @focusin="onPasswordFocus" @focusout="onPasswordBlur">
            <div class="input-icon">
              <Lock :size="18" />
            </div>
            <el-input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              :placeholder="t('auth.password')"
              :prefix-icon="null"
              size="large"
              class="login-input"
              autocomplete="new-password"
              name="password"
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
            <span>{{ t('auth.login') }}</span>
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
  background:
    linear-gradient(90deg, rgba(246, 249, 252, 0.34), rgba(246, 249, 252, 0.08)),
    rgba(0, 0, 0, 0.04);
}

/* === Background controls === */
.bg-controls {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
}

.bg-btn,
.bg-reset-btn {
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

.bg-reset-btn {
  width: auto;
  min-width: 52px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
}

.bg-btn:hover,
.bg-reset-btn:hover {
  background: white;
  color: var(--apple-blue);
  transform: scale(1.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.bg-file-input {
  display: none;
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
  width: 230px;
  height: 260px;
  margin-right: -38px;
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
  width: 460px;
  max-width: 100%;
  padding: 40px;
  text-align: center;
  position: relative;
  z-index: 5;
  background: rgba(255, 255, 255, 0.46);
  border: 1px solid rgba(255, 255, 255, 0.58);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(18px) saturate(1.18);
  -webkit-backdrop-filter: blur(18px) saturate(1.18);
}

.has-image-bg .login-card {
  background: rgba(255, 255, 255, 0.38);
  border-color: rgba(255, 255, 255, 0.72);
}

.welcome-title {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--text-primary);
  margin: 0 0 8px;
  letter-spacing: 0;
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
  background: rgba(255, 255, 255, 0.52);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5), 0 2px 10px rgba(15, 23, 42, 0.04);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.login-input :deep(.el-input__wrapper.is-focus) {
  background: rgba(255, 255, 255, 0.68);
  box-shadow: 0 0 0 1px rgba(0, 110, 219, 0.28), 0 6px 16px rgba(0, 110, 219, 0.08);
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
    margin-bottom: -44px;
    width: 160px;
    height: 190px;
    transform: scale(0.78);
    transform-origin: bottom center;
  }
}
</style>
