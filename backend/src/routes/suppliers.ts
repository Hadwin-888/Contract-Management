import { Router, Response } from 'express';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = Router();

router.use(authenticateToken);

// GET /api/procurement/suppliers
router.get('/', async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));

  try {
    const [total, items] = await Promise.all([
      prisma.supplier.count(),
      prisma.supplier.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({ items, total, page, pageSize });
  } catch (error) {
    console.error('Failed to fetch suppliers:', error);
    res.status(500).json({ error: '获取供应商失败' });
  }
});

// POST /api/procurement/suppliers
router.post('/', requireRole('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const { name, code, contact, phone, email, address, category } = req.body;

  if (!name) {
    res.status(400).json({ error: '供应商名称不能为空' });
    return;
  }

  try {
    const supplier = await prisma.supplier.create({
      data: {
        name,
        code: code || '',
        contact: contact || '',
        phone: phone || '',
        email: email || '',
        address: address || '',
        category: category || '',
        status: 'active',
      },
    });

    res.status(201).json(supplier);
  } catch (error) {
    console.error('Failed to create supplier:', error);
    res.status(500).json({ error: '创建供应商失败' });
  }
});

// PUT /api/procurement/suppliers/:id
router.put('/:id', requireRole('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const { name, code, contact, phone, email, address, category, status } = req.body;

  try {
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id as string },
      data: {
        ...(name ? { name } : {}),
        ...(code !== undefined ? { code } : {}),
        ...(contact !== undefined ? { contact } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(category ? { category } : {}),
        ...(status ? { status } : {}),
      },
    });

    res.json(supplier);
  } catch (error) {
    console.error('Failed to update supplier:', error);
    res.status(500).json({ error: '更新供应商失败' });
  }
});

// DELETE /api/procurement/suppliers/:id
router.delete('/:id', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.supplier.delete({ where: { id: req.params.id as string } });
    res.json({ message: '供应商已删除' });
  } catch (error) {
    console.error('Failed to delete supplier:', error);
    res.status(500).json({ error: '删除供应商失败' });
  }
});

export default router;
