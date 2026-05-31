import apiClient from './client'
import type { LoginRequest, LoginResponse } from '@/types'

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post('/auth/login', data)
  return response.data
}

export async function register(data: LoginRequest & { name?: string; email?: string }): Promise<LoginResponse> {
  const response = await apiClient.post('/auth/register', data)
  return response.data
}
