import { Router, Response } from 'express';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = Router();

router.use(authenticateToken);

// GET /api/settings/permissions — list all available permissions
router.get('/', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
    res.json(permissions);
  } catch (error) {
    console.error('Failed to fetch permissions:', error);
    res.status(500).json({ error: '获取权限列表失败' });
  }
});

// POST /api/settings/permissions/seed — seed default permissions (run once)
router.post('/seed', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const defaultPermissions = [
      { module: 'dashboard', action: 'view', description: '查看工作台' },
      { module: 'contracts', action: 'view', description: '查看合同' },
      { module: 'contracts', action: 'create', description: '新建合同' },
      { module: 'contracts', action: 'edit', description: '编辑合同' },
      { module: 'contracts', action: 'delete', description: '删除合同' },
      { module: 'audit', action: 'view', description: '查看AI审核' },
      { module: 'audit', action: 'analyze', description: '执行AI审核' },
      { module: 'projects', action: 'view', description: '查看项目' },
      { module: 'projects', action: 'create', description: '新建项目' },
      { module: 'projects', action: 'edit', description: '编辑项目' },
      { module: 'projects', action: 'delete', description: '删除项目' },
      { module: 'projects', action: 'manage_members', description: '管理项目成员' },
      { module: 'procurement', action: 'view', description: '查看采购' },
      { module: 'procurement', action: 'create', description: '新建采购申请' },
      { module: 'procurement', action: 'edit', description: '编辑采购申请' },
      { module: 'procurement', action: 'delete', description: '删除采购申请' },
      { module: 'procurement', action: 'approve', description: '审批采购' },
      { module: 'procurement', action: 'manage_suppliers', description: '管理供应商' },
      { module: 'approvals', action: 'view', description: '查看待审批' },
      { module: 'approvals', action: 'approve', description: '执行审批' },
      { module: 'reminders', action: 'view', description: '查看提醒' },
      { module: 'statistics', action: 'view', description: '查看统计' },
      { module: 'settings', action: 'view', description: '查看系统设置' },
      { module: 'settings', action: 'manage_users', description: '管理用户' },
      { module: 'settings', action: 'manage_roles', description: '管理角色' },
      { module: 'settings', action: 'manage_departments', description: '管理部门' },
      { module: 'settings', action: 'manage_storage', description: '管理存储' },
      { module: 'settings', action: 'manage_audit_config', description: '管理审核配置' },
      { module: 'settings', action: 'manage_approval_flows', description: '管理审批流' },
      { module: 'notifications', action: 'view', description: '查看通知' },
    ];

    let created = 0;
    for (const perm of defaultPermissions) {
      const existing = await prisma.permission.findUnique({
        where: { module_action: { module: perm.module, action: perm.action } },
      });
      if (!existing) {
        await prisma.permission.create({ data: perm });
        created++;
      }
    }

    res.json({ message: `已创建 ${created} 个默认权限` });
  } catch (error) {
    console.error('Failed to seed permissions:', error);
    res.status(500).json({ error: '初始化权限失败' });
  }
});

// GET /api/settings/users/:id/roles — get roles for a user
router.get('/users/:id/roles', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  try {
    const userRoles = await prisma.userRole.findMany({
      where: { userId: id },
      include: { role: true },
    });
    res.json(userRoles.map((ur) => ur.role));
  } catch (error) {
    console.error('Failed to fetch user roles:', error);
    res.status(500).json({ error: '获取用户角色失败' });
  }
});

// PUT /api/settings/users/:id/roles — set roles for a user
router.put('/users/:id/roles', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { roleIds } = req.body as { roleIds: string[] };

  try {
    // Delete existing roles
    await prisma.userRole.deleteMany({ where: { userId: id } });

    // Add new roles
    if (roleIds && roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({
          userId: id,
          roleId,
        })),
      });
    }

    const userRoles = await prisma.userRole.findMany({
      where: { userId: id },
      include: { role: true },
    });

    res.json(userRoles.map((ur) => ur.role));
  } catch (error) {
    console.error('Failed to set user roles:', error);
    res.status(500).json({ error: '设置用户角色失败' });
  }
});

export default router;
