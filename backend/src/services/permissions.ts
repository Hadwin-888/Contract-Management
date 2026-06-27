import prisma from '../prisma.js';
import { toSnakeRecord } from '../serializers.js';

export const PERMISSION_CATALOG = [
  { module: 'dashboard', action: 'view', description: '查看工作台' },
  { module: 'projects', action: 'view', description: '查看项目管理' },
  { module: 'projects', action: 'create', description: '新建项目' },
  { module: 'projects', action: 'edit', description: '编辑项目' },
  { module: 'projects', action: 'delete', description: '删除项目' },
  { module: 'projects', action: 'manage_members', description: '管理项目成员' },
  { module: 'projects', action: 'manage_files', description: '管理项目支持文件' },
  { module: 'projects', action: 'submit_completion', description: '提交项目完成审批' },
  { module: 'procurement', action: 'view', description: '查看采购管理' },
  { module: 'procurement', action: 'create', description: '新建采购申请' },
  { module: 'procurement', action: 'edit', description: '编辑采购申请' },
  { module: 'procurement', action: 'delete', description: '删除采购申请' },
  { module: 'procurement', action: 'approve', description: '审批采购申请' },
  { module: 'procurement', action: 'manage_suppliers', description: '管理供应商' },
  { module: 'assets', action: 'view', description: '查看资产管理' },
  { module: 'assets', action: 'purchase', description: '资产采购' },
  { module: 'assets', action: 'receiving', description: '收货管理' },
  { module: 'assets', action: 'inventory', description: '库存管理' },
  { module: 'assets', action: 'cost', description: '成本管理' },
  { module: 'assets', action: 'manage_items', description: '物资管理' },
  { module: 'assets', action: 'manage_suppliers', description: '供应商管理' },
  { module: 'assets', action: 'reports', description: '资产报表' },
  { module: 'assets', action: 'import_export', description: '资产数据导入导出' },
  { module: 'settings', action: 'manage_asset_settings', description: '管理资产规则设置' },
  { module: 'contracts', action: 'view', description: '查看合同管理' },
  { module: 'contracts', action: 'create', description: '新建合同' },
  { module: 'contracts', action: 'edit', description: '编辑合同' },
  { module: 'contracts', action: 'delete', description: '删除合同' },
  { module: 'contracts', action: 'export', description: '导出合同台账' },
  { module: 'contracts', action: 'submit_approval', description: '提交合同审批' },
  { module: 'contracts', action: 'manage_files', description: '管理合同/保单扫描件' },
  { module: 'audit', action: 'view', description: '查看 AI 审核' },
  { module: 'audit', action: 'analyze', description: '执行 AI 审核' },
  { module: 'audit', action: 'download', description: '下载审核报告' },
  { module: 'audit', action: 'clear', description: '清除审核记录' },
  { module: 'approvals', action: 'view', description: '查看审批中心' },
  { module: 'approvals', action: 'approve', description: '批准/驳回审批' },
  { module: 'notifications', action: 'view', description: '查看通知' },
  { module: 'reminders', action: 'view', description: '查看提醒' },
  { module: 'statistics', action: 'view', description: '查看数据统计' },
  { module: 'settings', action: 'view', description: '查看系统设置' },
  { module: 'settings', action: 'manage_users', description: '管理用户' },
  { module: 'settings', action: 'manage_roles', description: '管理角色与权限' },
  { module: 'settings', action: 'manage_audit_config', description: '管理审核配置' },
  { module: 'settings', action: 'manage_approval_flows', description: '管理审批流' },
  { module: 'settings', action: 'manage_departments', description: '管理部门' },
  { module: 'settings', action: 'manage_storage', description: '管理存储配置' },
] as const;

const PERMISSION_TO_ROUTE_KEY: Record<string, string> = {
  'dashboard:view': 'dashboard',
  'projects:view': 'projects',
  'procurement:view': 'procurement',
  'assets:view': 'assets',
  'assets:purchase': 'asset-purchase',
  'assets:receiving': 'asset-receiving',
  'assets:inventory': 'asset-inventory',
  'assets:cost': 'asset-cost',
  'assets:manage_items': 'asset-items',
  'assets:manage_suppliers': 'asset-suppliers',
  'assets:reports': 'asset-reports',
  'contracts:view': 'contracts',
  'audit:view': 'audit',
  'approvals:view': 'approvals',
  'notifications:view': 'notifications',
  'reminders:view': 'reminders',
  'statistics:view': 'statistics',
  'settings:view': 'settings',
  'settings:manage_users': 'users',
  'settings:manage_roles': 'roles',
  'settings:manage_audit_config': 'audit-config',
  'settings:manage_approval_flows': 'approval-flows',
  'settings:manage_departments': 'departments',
  'settings:manage_storage': 'storage',
  'settings:manage_asset_settings': 'asset-settings',
};

export async function seedPermissionCatalog() {
  let created = 0;
  let updated = 0;

  for (const permission of PERMISSION_CATALOG) {
    const existing = await prisma.permission.findUnique({
      where: { module_action: { module: permission.module, action: permission.action } },
    });

    if (existing) {
      if (existing.description !== permission.description) {
        await prisma.permission.update({
          where: { id: existing.id },
          data: { description: permission.description },
        });
        updated++;
      }
      continue;
    }

    await prisma.permission.create({ data: permission });
    created++;
  }

  return { created, updated };
}

function routePermissionKey(module: string, action: string) {
  return PERMISSION_TO_ROUTE_KEY[`${module}:${action}`] || module;
}

export async function buildUserAuthPayload(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  const permissions = new Set<string>();
  const assignedRoles = Array.isArray((user as any).userRoles) ? (user as any).userRoles : [];
  const customRoles = assignedRoles.map((userRole: any) => {
    for (const rolePermission of userRole.role.rolePermissions) {
      permissions.add(routePermissionKey(rolePermission.permission.module, rolePermission.permission.action));
    }

    return {
      id: userRole.role.id,
      name: userRole.role.name,
      description: userRole.role.description,
      isSystem: userRole.role.isSystem,
    };
  });

  const { passwordHash, userRoles, ...safeUser } = user as any;
  return {
    ...toSnakeRecord(safeUser),
    permissions: Array.from(permissions).sort(),
    customRoles,
  };
}
