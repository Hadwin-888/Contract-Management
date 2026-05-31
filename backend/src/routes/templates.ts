import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// GET /api/templates — list all templates (admin + super_admin)
router.get('/', requireRole('admin', 'super_admin'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const templates = db.prepare(`
    SELECT t.*, u.name as updated_by_name
    FROM audit_templates t
    LEFT JOIN users u ON t.updated_by = u.id
    ORDER BY t.contract_type ASC
  `).all();
  res.json(templates);
});

// GET /api/templates/:contractType — get single template
router.get('/:contractType', requireRole('admin', 'super_admin'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const template = db.prepare(`
    SELECT t.*, u.name as updated_by_name
    FROM audit_templates t
    LEFT JOIN users u ON t.updated_by = u.id
    WHERE t.contract_type = ?
  `).get(req.params.contractType);

  if (!template) {
    res.status(404).json({ error: '模板不存在' });
    return;
  }
  res.json(template);
});

// POST /api/templates — create template
router.post('/', requireRole('admin', 'super_admin'), (req: AuthRequest, res: Response) => {
  const { contractType, name, content, summaryContent } = req.body;

  if (!contractType || !name || !content) {
    res.status(400).json({ error: '请提供合同类型、名称和内容' });
    return;
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM audit_templates WHERE contract_type = ?').get(contractType);
  if (existing) {
    res.status(409).json({ error: '该合同类型的模板已存在' });
    return;
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO audit_templates (id, contract_type, name, content, summary_content, version, updated_by)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `).run(id, contractType, name, content, summaryContent || '', req.userId);

  const template = db.prepare('SELECT * FROM audit_templates WHERE id = ?').get(id);
  res.status(201).json(template);
});

// PUT /api/templates/:contractType — update template (bumps version)
router.put('/:contractType', requireRole('admin', 'super_admin'), (req: AuthRequest, res: Response) => {
  const { name, content, summaryContent } = req.body;

  const db = getDb();
  const existing = db.prepare('SELECT id, version FROM audit_templates WHERE contract_type = ?').get(req.params.contractType) as { id: string; version: number } | undefined;

  if (!existing) {
    res.status(404).json({ error: '模板不存在' });
    return;
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (content !== undefined) { updates.push('content = ?'); params.push(content); }
  if (summaryContent !== undefined) { updates.push('summary_content = ?'); params.push(summaryContent); }

  if (updates.length > 0) {
    updates.push('version = ?');
    params.push(existing.version + 1);
    updates.push('updated_by = ?');
    params.push(req.userId);
    updates.push("updated_at = datetime('now')");
    params.push(existing.id);

    db.prepare(`UPDATE audit_templates SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const template = db.prepare(`
    SELECT t.*, u.name as updated_by_name
    FROM audit_templates t
    LEFT JOIN users u ON t.updated_by = u.id
    WHERE t.id = ?
  `).get(existing.id);

  res.json(template);
});

// DELETE /api/templates/:contractType — delete template (admin + super_admin)
router.delete('/:contractType', requireRole('admin', 'super_admin'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM audit_templates WHERE contract_type = ?').get(req.params.contractType);

  if (!existing) {
    res.status(404).json({ error: '模板不存在' });
    return;
  }

  db.prepare('DELETE FROM audit_templates WHERE contract_type = ?').run(req.params.contractType);
  res.json({ message: '模板已删除' });
});

export default router;
