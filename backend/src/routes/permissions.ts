import { Router, Response } from 'express';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth.js';
import prisma from '../prisma.js';
import { seedPermissionCatalog } from '../services/permissions.js';

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
    const { created, updated } = await seedPermissionCatalog();
    res.json({ message: `权限已同步，新增 ${created} 个，更新 ${updated} 个` });
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
