export type Role = 'clerk' | 'head' | 'admin' | 'super_admin'

export interface User {
  id: string
  name: string
  email: string
  username?: string
  department?: string
  department_code?: string
  role?: Role
  permissions?: Permission[]
  customRoles?: Array<{ id: string; name: string; description?: string; isSystem?: boolean }>
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
  | 'projects'
  | 'procurement'
  | 'assets'
  | 'asset-purchase'
  | 'asset-receiving'
  | 'asset-inventory'
  | 'asset-cost'
  | 'asset-suppliers'
  | 'asset-items'
  | 'asset-reports'
  | 'approvals'
  | 'notifications'
  | 'roles'
  | 'approval-flows'
  | 'asset-settings'

// Role → permissions mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  clerk: ['audit', 'projects', 'procurement', 'assets', 'asset-purchase', 'asset-items', 'asset-suppliers'],
  head: ['audit', 'dashboard', 'reminders', 'projects', 'procurement', 'assets', 'asset-purchase', 'asset-receiving', 'asset-inventory', 'asset-items', 'asset-suppliers', 'approvals', 'notifications'],
  admin: [
    'audit', 'dashboard', 'reminders', 'contracts',
    'statistics', 'settings', 'audit-config',
    'projects', 'procurement', 'assets', 'asset-purchase', 'asset-receiving', 'asset-inventory', 'asset-cost', 'asset-items', 'asset-suppliers', 'asset-reports', 'approvals', 'notifications',
  ],
  super_admin: [
    'audit', 'dashboard', 'reminders', 'contracts',
    'statistics', 'settings', 'users', 'audit-config',
    'departments', 'storage', 'projects', 'procurement',
    'assets', 'asset-purchase', 'asset-receiving', 'asset-inventory', 'asset-cost', 'asset-items', 'asset-suppliers', 'asset-reports',
    'approvals', 'notifications', 'roles', 'approval-flows', 'asset-settings',
  ],
}

// Route path → permission key
export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  '/dashboard': 'dashboard',
  '/projects': 'projects',
  '/my-workspace': 'projects',
  '/contracts': 'contracts',
  '/audit': 'audit',
  '/procurement': 'procurement',
  '/procurement/suppliers': 'procurement',
  '/procurement/purchase-orders': 'procurement',
  '/assets': 'assets',
  '/assets/purchase': 'asset-purchase',
  '/assets/receiving': 'asset-receiving',
  '/assets/inventory': 'asset-inventory',
  '/assets/cost': 'asset-cost',
  '/assets/suppliers': 'asset-suppliers',
  '/assets/items': 'asset-items',
  '/assets/reports': 'asset-reports',
  '/approvals': 'approvals',
  '/notifications': 'notifications',
  '/reminders': 'reminders',
  '/statistics': 'statistics',
  '/settings': 'settings',
  '/settings/users': 'users',
  '/settings/roles': 'roles',
  '/settings/audit-config': 'audit-config',
  '/settings/approval-flows': 'approval-flows',
  '/settings/departments': 'departments',
  '/settings/storage': 'storage',
  '/settings/asset-settings': 'asset-settings',
}
