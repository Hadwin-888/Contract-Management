import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = Router();

router.use(authenticateToken);

// GET /api/procurement/requests
router.get('/', async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));
  const status = req.query.status as string | undefined;

  try {
    const where: any = {};
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      prisma.procurementRequest.count({ where }),
      prisma.procurementRequest.findMany({
        where,
        include: {
          requester: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          approvals: {
            include: { approver: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({ items, total, page, pageSize });
  } catch (error) {
    console.error('Failed to fetch procurement requests:', error);
    res.status(500).json({ error: '获取采购申请失败' });
  }
});

// POST /api/procurement/requests
router.post('/', async (req: AuthRequest, res: Response) => {
  const { title, description, category, amount, quantity, unit, urgency, reason, supplierId } = req.body;

  if (!title) {
    res.status(400).json({ error: '采购标题不能为空' });
    return;
  }

  try {
    const request = await prisma.procurementRequest.create({
      data: {
        title,
        description: description || '',
        category: category || '',
        amount: amount || 0,
        quantity: quantity || 1,
        unit: unit || '',
        requesterId: req.userId!,
        department: '', // Will be filled from user profile
        status: 'draft',
        urgency: urgency || 'normal',
        reason: reason || '',
        supplierId: supplierId || null,
      },
      include: {
        requester: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(request);
  } catch (error) {
    console.error('Failed to create procurement request:', error);
    res.status(500).json({ error: '创建采购申请失败' });
  }
});

// GET /api/procurement/requests/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const request = await prisma.procurementRequest.findUnique({
      where: { id: req.params.id as string },
      include: {
        requester: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true, contact: true, phone: true } },
        approvals: {
          include: { approver: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!request) {
      res.status(404).json({ error: '采购申请不存在' });
      return;
    }

    res.json(request);
  } catch (error) {
    console.error('Failed to fetch procurement request:', error);
    res.status(500).json({ error: '获取采购申请失败' });
  }
});

// PUT /api/procurement/requests/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { title, description, category, amount, quantity, unit, urgency, reason, supplierId, status } = req.body;

  try {
    const request = await prisma.procurementRequest.update({
      where: { id: req.params.id as string },
      data: {
        ...(title ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(category ? { category } : {}),
        ...(amount !== undefined ? { amount } : {}),
        ...(quantity ? { quantity } : {}),
        ...(unit ? { unit } : {}),
        ...(urgency ? { urgency } : {}),
        ...(reason !== undefined ? { reason } : {}),
        ...(supplierId !== undefined ? { supplierId: supplierId || null } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        requester: { select: { id: true, name: true } },
      },
    });

    res.json(request);
  } catch (error) {
    console.error('Failed to update procurement request:', error);
    res.status(500).json({ error: '更新采购申请失败' });
  }
});

// DELETE /api/procurement/requests/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.procurementRequest.delete({ where: { id: req.params.id as string } });
    res.json({ message: '采购申请已删除' });
  } catch (error) {
    console.error('Failed to delete procurement request:', error);
    res.status(500).json({ error: '删除采购申请失败' });
  }
});

// POST /api/procurement/requests/:id/submit — submit for approval
router.post('/:id/submit', async (req: AuthRequest, res: Response) => {
  try {
    const request = await prisma.procurementRequest.findUnique({ where: { id: req.params.id as string } });
    if (!request) {
      res.status(404).json({ error: '采购申请不存在' });
      return;
    }

    // Find approval flow for procurement module
    const flow = await prisma.approvalFlow.findFirst({
      where: { module: 'procurement', isActive: true },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    if (!flow || flow.steps.length === 0) {
      // No approval flow configured, auto-approve
      await prisma.procurementRequest.update({
        where: { id: req.params.id as string },
        data: { status: 'approved' },
      });
      res.json({ message: '无需审批，已自动通过' });
      return;
    }

    // Update status to pending
    await prisma.procurementRequest.update({
      where: { id: req.params.id as string },
      data: { status: 'pending' },
    });

    // Create approval records for each step
    for (const step of flow.steps) {
      // Find users with matching role
      const role = await prisma.customRole.findFirst({
        where: { name: step.roleName },
        include: { userRoles: { include: { user: true } } },
      });

      if (role) {
        for (const userRole of role.userRoles) {
          await prisma.approvalRecord.create({
            data: {
              flowId: flow.id,
              stepId: step.id,
              requestId: req.params.id as string,
              requestType: 'procurement',
              approverId: userRole.userId,
              status: 'pending',
            },
          });

          // Notify approver
          await prisma.notification.create({
            data: {
              userId: userRole.userId,
              type: 'approval',
              title: `有新的采购申请需要审批: ${request.title}`,
              module: 'procurement',
              refId: req.params.id as string,
            },
          });
        }
      }
    }

    res.json({ message: '已提交审批' });
  } catch (error) {
    console.error('Failed to submit for approval:', error);
    res.status(500).json({ error: '提交审批失败' });
  }
});

export default router;
