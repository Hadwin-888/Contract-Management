import { Router, Response } from 'express';
import { getDb } from '../db.js';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// GET /api/storage-config — get storage configuration (super_admin only)
router.get('/', requireRole('super_admin'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const configs = db.prepare('SELECT key, value FROM storage_config').all() as { key: string; value: string }[];

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
router.put('/', requireRole('super_admin'), (req: AuthRequest, res: Response) => {
  const { contractPath, insurancePath, namingRule } = req.body;

  const db = getDb();

  const upsert = db.prepare(`
    INSERT INTO storage_config (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `);

  const entries: { key: string; value: string }[] = [];
  if (contractPath !== undefined) entries.push({ key: 'contractPath', value: contractPath });
  if (insurancePath !== undefined) entries.push({ key: 'insurancePath', value: insurancePath });
  if (namingRule !== undefined) entries.push({ key: 'namingRule', value: namingRule });

  const upsertMany = db.transaction((items: { key: string; value: string }[]) => {
    for (const item of items) {
      upsert.run(item.key, item.value);
    }
  });

  if (entries.length > 0) {
    upsertMany(entries);
  }

  const configs = db.prepare('SELECT key, value FROM storage_config').all() as { key: string; value: string }[];
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
