import { Router, Response } from 'express';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = Router();

router.use(authenticateToken);

// GET /api/storage-config — get storage configuration (super_admin only)
router.get('/', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const configs = await prisma.storageConfig.findMany({ select: { key: true, value: true } });

  const result: Record<string, string> = {
    contractPath: 'contract',
    insurancePath: 'insurance',
    namingRule: '{contractNo}{name}{partyB}',
  };

  for (const c of configs) {
    result[c.key] = c.value;
  }

  res.json(result);
});

// PUT /api/storage-config — update (super_admin only)
router.put('/', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { contractPath, insurancePath, namingRule } = req.body;

  const entries: { key: string; value: string }[] = [];
  if (contractPath !== undefined) entries.push({ key: 'contractPath', value: contractPath });
  if (insurancePath !== undefined) entries.push({ key: 'insurancePath', value: insurancePath });
  if (namingRule !== undefined) entries.push({ key: 'namingRule', value: namingRule });

  if (entries.length > 0) {
    await prisma.$transaction(entries.map((item) => prisma.storageConfig.upsert({
      where: { key: item.key },
      update: { value: item.value },
      create: { key: item.key, value: item.value },
    })));
  }

  const configs = await prisma.storageConfig.findMany({ select: { key: true, value: true } });
  const result: Record<string, string> = {
    contractPath: 'contract',
    insurancePath: 'insurance',
    namingRule: '{contractNo}{name}{partyB}',
  };
  for (const c of configs) {
    result[c.key] = c.value;
  }

  res.json(result);
});

export default router;
