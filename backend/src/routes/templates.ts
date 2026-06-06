import { Router, Response } from 'express';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth.js';
import prisma from '../prisma.js';
import { toSnakeRecord } from '../serializers.js';

const router = Router();

router.use(authenticateToken);

// GET /api/templates — list all templates (admin + super_admin)
router.get('/', requireRole('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const templates = await prisma.auditTemplate.findMany({
    include: { updater: { select: { name: true } } },
    orderBy: { contractType: 'asc' },
  });
  res.json(templates.map((t) => ({ ...toSnakeRecord(t), updated_by_name: t.updater?.name || null, updater: undefined })));
});

// GET /api/templates/:contractType — get single template
router.get('/:contractType', requireRole('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const template = await prisma.auditTemplate.findUnique({
    where: { contractType: req.params.contractType as string },
    include: { updater: { select: { name: true } } },
  });

  if (!template) {
    res.status(404).json({ error: '模板不存在' });
    return;
  }
  res.json({ ...toSnakeRecord(template), updated_by_name: template.updater?.name || null, updater: undefined });
});

// POST /api/templates — create template
router.post('/', requireRole('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const { contractType, name, content, summaryContent } = req.body;

  if (!contractType || !name || !content) {
    res.status(400).json({ error: '请提供合同类型、名称和内容' });
    return;
  }

  const existing = await prisma.auditTemplate.findUnique({ where: { contractType } });
  if (existing) {
    res.status(409).json({ error: '该合同类型的模板已存在' });
    return;
  }

  const template = await prisma.auditTemplate.create({
    data: { contractType, name, content, summaryContent: summaryContent || '', version: 1, updatedBy: req.userId },
  });
  res.status(201).json(toSnakeRecord(template));
});

// PUT /api/templates/:contractType — update template (bumps version)
router.put('/:contractType', requireRole('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const { name, content, summaryContent } = req.body;

  const existing = await prisma.auditTemplate.findUnique({ where: { contractType: req.params.contractType as string } });

  if (!existing) {
    res.status(404).json({ error: '模板不存在' });
    return;
  }

  const template = await prisma.auditTemplate.update({
    where: { id: existing.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(summaryContent !== undefined ? { summaryContent } : {}),
      version: existing.version + 1,
      updatedBy: req.userId,
    },
    include: { updater: { select: { name: true } } },
  });

  res.json({ ...toSnakeRecord(template), updated_by_name: template.updater?.name || null, updater: undefined });
});

// DELETE /api/templates/:contractType — delete template (admin + super_admin)
router.delete('/:contractType', requireRole('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const existing = await prisma.auditTemplate.findUnique({ where: { contractType: req.params.contractType as string } });

  if (!existing) {
    res.status(404).json({ error: '模板不存在' });
    return;
  }

  await prisma.auditTemplate.delete({ where: { contractType: req.params.contractType as string } });
  res.json({ message: '模板已删除' });
});

export default router;
