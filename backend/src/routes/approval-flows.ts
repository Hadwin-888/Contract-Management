import { Router, Response } from 'express';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = Router();

router.use(authenticateToken);

// GET /api/approvals/flows — list all approval flows
router.get('/', requireRole('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const flows = await prisma.approvalFlow.findMany({
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(flows);
  } catch (error) {
    console.error('Failed to fetch approval flows:', error);
    res.status(500).json({ error: '获取审批流失败' });
  }
});

// GET /api/approvals/flows/:id
router.get('/:id', requireRole('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const flow = await prisma.approvalFlow.findUnique({
      where: { id: req.params.id as string as string },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    });
    if (!flow) {
      res.status(404).json({ error: '审批流不存在' });
      return;
    }
    res.json(flow);
  } catch (error) {
    console.error('Failed to fetch approval flow:', error);
    res.status(500).json({ error: '获取审批流失败' });
  }
});

// POST /api/approvals/flows — create a new approval flow
router.post('/', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { name, module, description, steps } = req.body;

  if (!name || !module) {
    res.status(400).json({ error: '名称和模块不能为空' });
    return;
  }

  try {
    const flow = await prisma.approvalFlow.create({
      data: {
        name,
        module,
        description: description || '',
        isActive: true,
        steps: {
          create: (steps || []).map((step: any, index: number) => ({
            stepOrder: step.stepOrder || index + 1,
            roleName: step.roleName,
            actionType: step.actionType || 'approve',
            required: step.required !== false,
          })),
        },
      },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    });

    res.status(201).json(flow);
  } catch (error) {
    console.error('Failed to create approval flow:', error);
    res.status(500).json({ error: '创建审批流失败' });
  }
});

// PUT /api/approvals/flows/:id — update an approval flow
router.put('/:id', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { name, module, description, isActive, steps } = req.body;

  try {
    // Delete existing steps
    await prisma.approvalFlowStep.deleteMany({ where: { flowId: id } });

    const flow = await prisma.approvalFlow.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(module ? { module } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        steps: {
          create: (steps || []).map((step: any, index: number) => ({
            stepOrder: step.stepOrder || index + 1,
            roleName: step.roleName,
            actionType: step.actionType || 'approve',
            required: step.required !== false,
          })),
        },
      },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    });

    res.json(flow);
  } catch (error) {
    console.error('Failed to update approval flow:', error);
    res.status(500).json({ error: '更新审批流失败' });
  }
});

// DELETE /api/approvals/flows/:id
router.delete('/:id', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.approvalFlow.delete({ where: { id: req.params.id as string as string } });
    res.json({ message: '审批流已删除' });
  } catch (error) {
    console.error('Failed to delete approval flow:', error);
    res.status(500).json({ error: '删除审批流失败' });
  }
});

export default router;
