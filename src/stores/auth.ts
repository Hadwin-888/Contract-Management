import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, Role, Permission } from '@/types/user'
import { ROLE_PERMISSIONS } from '@/types/user'
import { login as apiLogin } from '@/api/auth'
import { fetchMyProfile } from '@/api/users'

export const useAuthStore = defineStore('auth', () => {
  // Use sessionStorage instead of localStorage so token is cleared when browser closes
  const token = ref<string | null>(sessionStorage.getItem('token'))
  const user = ref<User | null>(loadUserFromStorage())
  const initialized = ref(false)

  const isAuthenticated = computed(() => !!token.value)

  const role = computed<Role | undefined>(() => user.value?.role)

  const permissions = computed<Permission[]>(() => {
    if (!role.value) return []
    return ROLE_PERMISSIONS[role.value] || []
  })

  function hasPermission(perm: Permission): boolean {
    return permissions.value.includes(perm)
  }

  function loadUserFromStorage(): User | null {
    try {
      const stored = sessionStorage.getItem('user')
      if (!stored) return null
      return JSON.parse(stored) as User
    } catch {
      return null
    }
  }

  async function init() {
    if (initialized.value) return
    initialized.value = true
    if (!token.value) return
    try {
      const profile = await fetchMyProfile()
      user.value = profile
      localStorage.setItem('user', JSON.stringify(profile))
    } catch {
      logout()
    }
  }

  function setAuth(newToken: string, newUser: User) {
    token.value = newToken
    user.value = newUser
    sessionStorage.setItem('token', newToken)
    sessionStorage.setItem('user', JSON.stringify(newUser))
  }

  function setUser(newUser: User) {
    user.value = newUser
    sessionStorage.setItem('user', JSON.stringify(newUser))
  }

  function logout() {
    token.value = null
    user.value = null
    initialized.value = false
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
  }

  async function login(username: string, password: string) {
    const response = await apiLogin({ username, password })
    setAuth(response.token, response.user)
    return response.user
  }

  return {
    token, user, isAuthenticated, role, permissions, initialized,
    hasPermission, init,
    setAuth, setUser, logout, login,
  }
})
