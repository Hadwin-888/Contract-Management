export type Role = 'clerk' | 'head' | 'admin' | 'super_admin'

export interface User {
  id: string
  name: string
  email: string
  username?: string
  department?: string
  department_code?: string
  role?: Role
  avatar?: string
  created_at?: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

// Role display labels
export const ROLE_LABELS: Record<Role, string> = {
  clerk: '部门文员',
  head: '部门负责人',
  admin: '合同管理员',
  super_admin: '系统管理员',
}

// Permission keys for each menu/page
export type Permission =
  | 'dashboard'
  | 'contracts'
  | 'audit'
  | 'reminders'
  | 'statistics'
  | 'settings'
  | 'users'
  | 'audit-config'
  | 'departments'
  | 'storage'

// Role → permissions mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  clerk: ['audit'],
  head: ['audit', 'dashboard', 'reminders'],
  admin: ['audit', 'dashboard', 'reminders', 'contracts', 'statistics', 'settings', 'audit-config'],
  super_admin: [
    'audit',
    'dashboard',
    'reminders',
    'contracts',
    'statistics',
    'settings',
    'users',
    'audit-config',
    'departments',
    'storage',
  ],
}

// Route path → permission key
export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  '/dashboard': 'dashboard',
  '/contracts': 'contracts',
  '/audit': 'audit',
  '/reminders': 'reminders',
  '/statistics': 'statistics',
  '/settings': 'settings',
  '/settings/users': 'users',
  '/settings/audit-config': 'audit-config',
  '/settings/departments': 'departments',
  '/settings/storage': 'storage',
}
