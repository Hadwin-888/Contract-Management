import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = Router();

// POST /api/auth/register
// WARNING: This endpoint is open to the public. In production, consider:
// 1. Disabling it entirely (admin creates users via /api/users)
// 2. Adding invite-code validation
// 3. Rate limiting to prevent abuse
router.post('/register', async (req: Request, res: Response) => {
  const { username, password, name, email } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PUBLIC_REGISTER !== 'true') {
    res.status(403).json({ error: '生产环境已关闭公开注册，请联系管理员创建账号' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    res.status(409).json({ error: '用户名已存在' });
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const user = await prisma.user.create({
    data: { username, passwordHash, name: name || username, email: email || null, role: 'clerk' },
  });

  const token = generateToken(user.id, user.username, 'clerk');

  res.status(201).json({
    token,
    user: { id: user.id, username: user.username, name: user.name, email: user.email, role: 'clerk' },
  });
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: '请输入用户名和密码' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  const valid = bcrypt.compareSync(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  const role = user.role as 'clerk' | 'head' | 'admin' | 'super_admin';
  const token = generateToken(user.id, user.username, role);

  res.json({
    token,
    user: { id: user.id, username: user.username, name: user.name, email: user.email, role },
  });
});

export default router;
