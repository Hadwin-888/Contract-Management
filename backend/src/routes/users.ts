import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

const USER_FIELDS = 'id, username, name, email, department, department_code, role, created_at';

// GET /api/users — list all users (super_admin only)
router.get('/', requireRole('super_admin'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const users = db.prepare(
    `SELECT ${USER_FIELDS} FROM users ORDER BY created_at DESC`
  ).all();
  res.json(users);
});

// GET /api/users/me — current user profile
router.get('/me', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = db.prepare(
    `SELECT ${USER_FIELDS} FROM users WHERE id = ?`
  ).get(req.userId);

  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  res.json(user);
});

// PUT /api/users/me — update own profile
router.put('/me', (req: AuthRequest, res: Response) => {
  const { name, email, department, departmentCode } = req.body;
  const db = getDb();
  const updates: string[] = [];
  const params: unknown[] = [];
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (email !== undefined) { updates.push('email = ?'); params.push(email); }
  if (department !== undefined) { updates.push('department = ?'); params.push(department); }
  if (departmentCode !== undefined) { updates.push('department_code = ?'); params.push(departmentCode); }
  if (updates.length > 0) {
    params.push(req.userId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }
  const user = db.prepare(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`).get(req.userId);
  res.json(user);
});

// PUT /api/users/me/password — change own password
router.put('/me/password', (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: '请提供当前密码和新密码' });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: '新密码至少6位' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.userId) as { password_hash: string } | undefined;

  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    res.status(400).json({ error: '当前密码错误' });
    return;
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.userId);
  res.json({ message: '密码已修改' });
});

// GET /api/users/:id (super_admin only)
router.get('/:id', requireRole('super_admin'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = db.prepare(
    `SELECT ${USER_FIELDS} FROM users WHERE id = ?`
  ).get(req.params.id as string);

  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  res.json(user);
});

// POST /api/users — create user (super_admin only)
router.post('/', requireRole('super_admin'), (req: AuthRequest, res: Response) => {
  const { username, password, name, email, department, departmentCode, role } = req.body;

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
  const userRole = ['clerk', 'head', 'admin', 'super_admin'].includes(role) ? role : 'clerk';

  db.prepare(
    'INSERT INTO users (id, username, password_hash, name, email, department, department_code, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, username, passwordHash, name || username, email || null, department || null, departmentCode || null, userRole);

  const user = db.prepare(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`).get(id);
  res.status(201).json(user);
});

// PUT /api/users/:id — update user (super_admin only)
router.put('/:id', requireRole('super_admin'), (req: AuthRequest, res: Response) => {
  const { name, email, department, departmentCode, role } = req.body;

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id as string);
  if (!existing) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (email !== undefined) { updates.push('email = ?'); params.push(email); }
  if (department !== undefined) { updates.push('department = ?'); params.push(department); }
  if (departmentCode !== undefined) { updates.push('department_code = ?'); params.push(departmentCode); }
  if (role !== undefined && ['clerk', 'head', 'admin', 'super_admin'].includes(role)) {
    updates.push('role = ?');
    params.push(role);
  }

  if (updates.length > 0) {
    params.push(req.params.id as string);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const user = db.prepare(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`).get(req.params.id as string);
  res.json(user);
});

// DELETE /api/users/:id — delete user (super_admin only)
router.delete('/:id', requireRole('super_admin'), (req: AuthRequest, res: Response) => {
  const db = getDb();

  if (req.params.id as string === req.userId) {
    res.status(400).json({ error: '不能删除自己的账号' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id as string);
  if (!existing) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id as string);
  res.json({ message: '用户已删除' });
});

// PUT /api/users/:id/password — reset password (super_admin only)
router.put('/:id/password', requireRole('super_admin'), (req: AuthRequest, res: Response) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: '密码至少6位' });
    return;
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id as string);
  if (!existing) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id as string);
  res.json({ message: '密码已重置' });
});

export default router;
