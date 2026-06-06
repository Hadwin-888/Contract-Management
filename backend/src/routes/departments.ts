import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// GET /api/departments — list all departments (any authenticated user)
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const departments = db.prepare('SELECT * FROM departments ORDER BY code ASC').all();
  res.json(departments);
});

// GET /api/departments/:id
router.get('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id as string);
  if (!dept) {
    res.status(404).json({ error: '部门不存在' });
    return;
  }
  res.json(dept);
});

// POST /api/departments — create (super_admin only)
router.post('/', requireRole('super_admin'), (req: AuthRequest, res: Response) => {
  const { code, shortName, name, headName } = req.body;

  if (!code || !shortName || !name) {
    res.status(400).json({ error: '请提供部门代码、简称和名称' });
    return;
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM departments WHERE code = ?').get(code);
  if (existing) {
    res.status(409).json({ error: '部门代码已存在' });
    return;
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO departments (id, code, short_name, name, head_name)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, code, shortName, name, headName || '');

  const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
  res.status(201).json(dept);
});

// PUT /api/departments/:id — update (super_admin only)
router.put('/:id', requireRole('super_admin'), (req: AuthRequest, res: Response) => {
  const { code, shortName, name, headName } = req.body;

  const db = getDb();
  const existing = db.prepare('SELECT id FROM departments WHERE id = ?').get(req.params.id as string);
  if (!existing) {
    res.status(404).json({ error: '部门不存在' });
    return;
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (code !== undefined) { updates.push('code = ?'); params.push(code); }
  if (shortName !== undefined) { updates.push('short_name = ?'); params.push(shortName); }
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (headName !== undefined) { updates.push('head_name = ?'); params.push(headName); }

  if (updates.length > 0) {
    params.push(req.params.id as string);
    db.prepare(`UPDATE departments SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id as string);
  res.json(dept);
});

// DELETE /api/departments/:id — delete (super_admin only)
router.delete('/:id', requireRole('super_admin'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM departments WHERE id = ?').get(req.params.id as string);
  if (!existing) {
    res.status(404).json({ error: '部门不存在' });
    return;
  }
  db.prepare('DELETE FROM departments WHERE id = ?').run(req.params.id as string);
  res.json({ message: '部门已删除' });
});

export default router;
