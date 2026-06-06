import { Router, Response } from 'express';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = Router();

router.use(authenticateToken);

// GET /api/ai-config — get AI configuration (admin+ can read)
router.get('/', requireRole('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const configs = await prisma.aiConfig.findMany({ select: { key: true, value: true } });

  const result: Record<string, string> = {
    model: 'deepseek',
    deepseekApiKey: '',
    minimaxApiKey: '',
    qwenApiKey: '',
  };

  for (const c of configs) {
    // Mask API keys for non-super_admin users
    if (req.role !== 'super_admin' && (c.key === 'deepseekApiKey' || c.key === 'minimaxApiKey' || c.key === 'qwenApiKey')) {
      result[c.key] = c.value ? c.value.slice(0, 4) + '****' + c.value.slice(-4) : '';
    } else {
      result[c.key] = c.value;
    }
  }

  // Fallback to env vars (masked for non-super_admin)
  if (!result.deepseekApiKey && process.env.DEEPSEEK_API_KEY) {
    const key = process.env.DEEPSEEK_API_KEY;
    result.deepseekApiKey = req.role === 'super_admin' ? key : key.slice(0, 4) + '****' + key.slice(-4);
  }

  res.json(result);
});

// PUT /api/ai-config — update AI configuration (super_admin only)
router.put('/', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { model, deepseekApiKey, minimaxApiKey, qwenApiKey } = req.body;

  const entries: { key: string; value: string }[] = [];

  if (model !== undefined) entries.push({ key: 'model', value: model });

  // Helper: detect if a value looks like a masked API key (e.g. "sk****xxxx")
  function isMaskedKey(val: string): boolean {
    return val.length > 10 && val.includes('****');
  }

  // Only save API keys that are NOT masked (skip masked values to avoid overwriting real keys)
  if (deepseekApiKey !== undefined && !isMaskedKey(deepseekApiKey)) {
    entries.push({ key: 'deepseekApiKey', value: deepseekApiKey });
  }
  if (minimaxApiKey !== undefined && !isMaskedKey(minimaxApiKey)) {
    entries.push({ key: 'minimaxApiKey', value: minimaxApiKey });
  }
  if (qwenApiKey !== undefined && !isMaskedKey(qwenApiKey)) {
    entries.push({ key: 'qwenApiKey', value: qwenApiKey });
  }

  if (entries.length > 0) {
    await prisma.$transaction(entries.map((entry) => prisma.aiConfig.upsert({
      where: { key: entry.key },
      update: { value: entry.value, updatedBy: req.userId },
      create: { key: entry.key, value: entry.value, updatedBy: req.userId },
    })));
  }

  const configs = await prisma.aiConfig.findMany({ select: { key: true, value: true } });
  const result: Record<string, string> = {
    model: 'deepseek',
    deepseekApiKey: '',
    minimaxApiKey: '',
    qwenApiKey: '',
  };
  for (const c of configs) {
    result[c.key] = c.value;
  }

  res.json(result);
});

export default router;
