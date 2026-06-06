import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth.js';
import prisma from '../prisma.js';
import { toSnakeArray, toSnakeRecord } from '../serializers.js';

const router = Router();

router.use(authenticateToken);

// GET /api/users — list all users (super_admin only)
router.get('/', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(toSnakeArray(users.map(({ passwordHash, ...user }) => user)));
});

// GET /api/users/me — current user profile
router.get('/me', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });

  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  const { passwordHash, ...safeUser } = user;
  res.json(toSnakeRecord(safeUser));
});

// PUT /api/users/me — update own profile
router.put('/me', async (req: AuthRequest, res: Response) => {
  const { name, email, department, departmentCode } = req.body;
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(department !== undefined ? { department } : {}),
      ...(departmentCode !== undefined ? { departmentCode } : {}),
    },
  });
  const { passwordHash, ...safeUser } = user;
  res.json(toSnakeRecord(safeUser));
});

// PUT /api/users/me/password — change own password
router.put('/me/password', async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: '请提供当前密码和新密码' });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: '新密码至少6位' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } });

  if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
    res.status(400).json({ error: '当前密码错误' });
    return;
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  await prisma.user.update({ where: { id: req.userId }, data: { passwordHash: hash } });
  res.json({ message: '密码已修改' });
});

// GET /api/users/:id (super_admin only)
router.get('/:id', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id as string } });

  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  const { passwordHash, ...safeUser } = user;
  res.json(toSnakeRecord(safeUser));
});

// POST /api/users — create user (super_admin only)
router.post('/', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { username, password, name, email, department, departmentCode, role } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    res.status(409).json({ error: '用户名已存在' });
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const userRole = ['clerk', 'head', 'admin', 'super_admin'].includes(role) ? role : 'clerk';

  const user = await prisma.user.create({
    data: { username, passwordHash, name: name || username, email: email || null, department: department || null, departmentCode: departmentCode || null, role: userRole },
  });
  const { passwordHash: _, ...safeUser } = user;
  res.status(201).json(toSnakeRecord(safeUser));
});

// PUT /api/users/:id — update user (super_admin only)
router.put('/:id', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { name, email, department, departmentCode, role } = req.body;

  const existing = await prisma.user.findUnique({ where: { id: req.params.id as string } });
  if (!existing) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.params.id as string },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(department !== undefined ? { department } : {}),
      ...(departmentCode !== undefined ? { departmentCode } : {}),
      ...(role !== undefined && ['clerk', 'head', 'admin', 'super_admin'].includes(role) ? { role } : {}),
    },
  });
  const { passwordHash, ...safeUser } = user;
  res.json(toSnakeRecord(safeUser));
});

// DELETE /api/users/:id — delete user (super_admin only)
router.delete('/:id', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  if (req.params.id as string === req.userId) {
    res.status(400).json({ error: '不能删除自己的账号' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { id: req.params.id as string } });
  if (!existing) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  await prisma.user.delete({ where: { id: req.params.id as string } });
  res.json({ message: '用户已删除' });
});

// PUT /api/users/:id/password — reset password (super_admin only)
router.put('/:id/password', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: '密码至少6位' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { id: req.params.id as string } });
  if (!existing) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  await prisma.user.update({ where: { id: req.params.id as string }, data: { passwordHash: hash } });
  res.json({ message: '密码已重置' });
});

export default router;
