import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = Router();

router.use(authenticateToken);

// GET /api/procurement/purchase-orders
router.get('/', async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));

  try {
    const [total, items] = await Promise.all([
      prisma.purchaseOrder.count(),
      prisma.purchaseOrder.findMany({
        include: {
          supplier: { select: { id: true, name: true } },
          procurementRequests: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({ items, total, page, pageSize });
  } catch (error) {
    console.error('Failed to fetch purchase orders:', error);
    res.status(500).json({ error: '获取采购订单失败' });
  }
});

// POST /api/procurement/purchase-orders
router.post('/', requireRole('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const { supplierId, totalAmount, remark, requestIds } = req.body;

  if (!supplierId) {
    res.status(400).json({ error: '供应商不能为空' });
    return;
  }

  try {
    const orderNo = `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${uuidv4().slice(0, 6).toUpperCase()}`;

    const order = await prisma.purchaseOrder.create({
      data: {
        orderNo,
        supplierId,
        totalAmount: totalAmount || 0,
        status: 'pending',
        remark: remark || '',
        procurementRequests: requestIds
          ? { connect: requestIds.map((id: string) => ({ id })) }
          : undefined,
      },
      include: {
        supplier: { select: { id: true, name: true } },
      },
    });

    // Update linked procurement requests
    if (requestIds) {
      await prisma.procurementRequest.updateMany({
        where: { id: { in: requestIds } },
        data: { status: 'ordered', purchaseOrderId: order.id },
      });
    }

    res.status(201).json(order);
  } catch (error) {
    console.error('Failed to create purchase order:', error);
    res.status(500).json({ error: '创建采购订单失败' });
  }
});

// PUT /api/procurement/purchase-orders/:id
router.put('/:id', requireRole('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const { status, totalAmount, remark, receivedDate } = req.body;

  try {
    const order = await prisma.purchaseOrder.update({
      where: { id: req.params.id as string as string },
      data: {
        ...(status ? { status } : {}),
        ...(totalAmount !== undefined ? { totalAmount } : {}),
        ...(remark !== undefined ? { remark } : {}),
        ...(receivedDate ? { receivedDate: new Date(receivedDate) } : {}),
      },
      include: {
        supplier: { select: { id: true, name: true } },
      },
    });

    // If received, update linked procurement requests
    if (status === 'received') {
      await prisma.procurementRequest.updateMany({
        where: { purchaseOrderId: req.params.id as string as string },
        data: { status: 'received' },
      });
    }

    res.json(order);
  } catch (error) {
    console.error('Failed to update purchase order:', error);
    res.status(500).json({ error: '更新采购订单失败' });
  }
});

export default router;
