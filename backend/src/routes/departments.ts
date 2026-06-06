import { Router, Response } from 'express';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth.js';
import prisma from '../prisma.js';
import { toSnakeArray, toSnakeRecord } from '../serializers.js';

const router = Router();

router.use(authenticateToken);

// GET /api/departments — list all departments (any authenticated user)
router.get('/', async (req: AuthRequest, res: Response) => {
  const departments = await prisma.department.findMany({ orderBy: { code: 'asc' } });
  res.json(toSnakeArray(departments));
});

// GET /api/departments/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const dept = await prisma.department.findUnique({ where: { id: req.params.id as string } });
  if (!dept) {
    res.status(404).json({ error: '部门不存在' });
    return;
  }
  res.json(toSnakeRecord(dept));
});

// POST /api/departments — create (super_admin only)
router.post('/', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { code, shortName, name, headName } = req.body;

  if (!code || !shortName || !name) {
    res.status(400).json({ error: '请提供部门代码、简称和名称' });
    return;
  }

  const existing = await prisma.department.findUnique({ where: { code } });
  if (existing) {
    res.status(409).json({ error: '部门代码已存在' });
    return;
  }

  const dept = await prisma.department.create({ data: { code, shortName, name, headName: headName || '' } });
  res.status(201).json(toSnakeRecord(dept));
});

// PUT /api/departments/:id — update (super_admin only)
router.put('/:id', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { code, shortName, name, headName } = req.body;

  const existing = await prisma.department.findUnique({ where: { id: req.params.id as string } });
  if (!existing) {
    res.status(404).json({ error: '部门不存在' });
    return;
  }

  const dept = await prisma.department.update({
    where: { id: req.params.id as string },
    data: {
      ...(code !== undefined ? { code } : {}),
      ...(shortName !== undefined ? { shortName } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(headName !== undefined ? { headName } : {}),
    },
  });
  res.json(toSnakeRecord(dept));
});

// DELETE /api/departments/:id — delete (super_admin only)
router.delete('/:id', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const existing = await prisma.department.findUnique({ where: { id: req.params.id as string } });
  if (!existing) {
    res.status(404).json({ error: '部门不存在' });
    return;
  }
  await prisma.department.delete({ where: { id: req.params.id as string } });
  res.json({ message: '部门已删除' });
});

export default router;
