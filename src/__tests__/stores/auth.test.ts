import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] || null,
  }
})()

Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock })

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
  })

  it('should initialize with no auth state', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
  })

  it('should set auth state', () => {
    const store = useAuthStore()
    store.setAuth('test-token', { id: '1', name: 'Test', email: 'test@test.com' })

    expect(store.isAuthenticated).toBe(true)
    expect(store.token).toBe('test-token')
    expect(store.user?.name).toBe('Test')
    expect(sessionStorage.getItem('token')).toBe('test-token')
  })

  it('should clear auth state on logout', () => {
    const store = useAuthStore()
    store.setAuth('test-token', { id: '1', name: 'Test', email: 'test@test.com' })
    store.logout()

    expect(store.isAuthenticated).toBe(false)
    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(sessionStorage.getItem('token')).toBeNull()
  })

  it('should restore token from sessionStorage', () => {
    sessionStorage.setItem('token', 'saved-token')
    const store = useAuthStore()
    expect(store.token).toBe('saved-token')
    expect(store.isAuthenticated).toBe(true)
  })
})
