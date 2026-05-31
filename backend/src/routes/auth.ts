import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';
import { generateToken } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
// WARNING: This endpoint is open to the public. In production, consider:
// 1. Disabling it entirely (admin creates users via /api/users)
// 2. Adding invite-code validation
// 3. Rate limiting to prevent abuse
router.post('/register', (req: Request, res: Response) => {
  const { username, password, name, email } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    res.status(409).json({ error: '用户名已存在' });
    return;
  }

  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);

  db.prepare(
    'INSERT INTO users (id, username, password_hash, name, email, role) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, username, passwordHash, name || username, email || null, 'clerk');

  const token = generateToken(id, username, 'clerk');

  res.status(201).json({
    token,
    user: { id, username, name: name || username, email: email || null, role: 'clerk' },
  });
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: '请输入用户名和密码' });
    return;
  }

  const db = getDb();
  const user = db.prepare(
    'SELECT id, username, password_hash, name, email, role FROM users WHERE username = ?'
  ).get(username) as { id: string; username: string; password_hash: string; name: string; email: string | null; role: string } | undefined;

  if (!user) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
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
