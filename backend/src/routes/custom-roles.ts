import { Router, Response } from 'express';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = Router();

router.use(authenticateToken);

// GET /api/settings/roles — list all custom roles
router.get('/', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const roles = await prisma.customRole.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { userRoles: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const result = roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.userRoles,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        module: rp.permission.module,
        action: rp.permission.action,
      })),
      createdAt: role.createdAt,
    }));

    res.json(result);
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    res.status(500).json({ error: '获取角色列表失败' });
  }
});

// POST /api/settings/roles — create a new role
router.post('/', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: '角色名称不能为空' });
    return;
  }

  try {
    const existing = await prisma.customRole.findUnique({ where: { name: name.trim() } });
    if (existing) {
      res.status(409).json({ error: '角色名称已存在' });
      return;
    }

    const role = await prisma.customRole.create({
      data: {
        name: name.trim(),
        description: description || '',
        isSystem: false,
      },
    });

    res.status(201).json(role);
  } catch (error) {
    console.error('Failed to create role:', error);
    res.status(500).json({ error: '创建角色失败' });
  }
});

// PUT /api/settings/roles/:id — update a role
router.put('/:id', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const role = await prisma.customRole.findUnique({ where: { id } });
    if (!role) {
      res.status(404).json({ error: '角色不存在' });
      return;
    }

    if (role.isSystem && name && name !== role.name) {
      res.status(400).json({ error: '系统角色不能重命名' });
      return;
    }

    const updated = await prisma.customRole.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update role:', error);
    res.status(500).json({ error: '更新角色失败' });
  }
});

// DELETE /api/settings/roles/:id — delete a role
router.delete('/:id', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const role = await prisma.customRole.findUnique({ where: { id } });
    if (!role) {
      res.status(404).json({ error: '角色不存在' });
      return;
    }

    if (role.isSystem) {
      res.status(400).json({ error: '系统角色不能删除' });
      return;
    }

    await prisma.customRole.delete({ where: { id } });
    res.json({ message: '角色已删除' });
  } catch (error) {
    console.error('Failed to delete role:', error);
    res.status(500).json({ error: '删除角色失败' });
  }
});

// GET /api/settings/roles/:id/permissions — get permissions for a role
router.get('/:id/permissions', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const role = await prisma.customRole.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) {
      res.status(404).json({ error: '角色不存在' });
      return;
    }

    res.json(role.rolePermissions.map((rp) => rp.permission));
  } catch (error) {
    console.error('Failed to fetch permissions:', error);
    res.status(500).json({ error: '获取权限失败' });
  }
});

// PUT /api/settings/roles/:id/permissions — set permissions for a role
router.put('/:id/permissions', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { permissionIds } = req.body as { permissionIds: string[] };

  try {
    const role = await prisma.customRole.findUnique({ where: { id } });
    if (!role) {
      res.status(404).json({ error: '角色不存在' });
      return;
    }

    // Delete existing permissions
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });

    // Add new permissions
    if (permissionIds && permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: id,
          permissionId,
        })),
      });
    }

    const updated = await prisma.customRole.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    res.json(updated?.rolePermissions.map((rp) => rp.permission) || []);
  } catch (error) {
    console.error('Failed to set permissions:', error);
    res.status(500).json({ error: '设置权限失败' });
  }
});

export default router;
