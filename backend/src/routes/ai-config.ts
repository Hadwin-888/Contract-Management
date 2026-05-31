import { Router, Response } from 'express';
import { getDb } from '../db.js';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// GET /api/ai-config — get AI configuration (admin+ can read)
router.get('/', requireRole('admin', 'super_admin'), (req: AuthRequest, res: Response) => {
  const db = getDb();

  // Check if ai_config table exists, create if not
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      updated_by TEXT,
      FOREIGN KEY (updated_by) REFERENCES users(id)
    )
  `);

  const configs = db.prepare('SELECT key, value FROM ai_config').all() as { key: string; value: string }[];

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
router.put('/', requireRole('super_admin'), (req: AuthRequest, res: Response) => {
  const { model, deepseekApiKey, minimaxApiKey, qwenApiKey } = req.body;

  const db = getDb();

  // Ensure table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      updated_by TEXT,
      FOREIGN KEY (updated_by) REFERENCES users(id)
    )
  `);

  const upsert = db.prepare(`
    INSERT INTO ai_config (key, value, updated_by, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = datetime('now')
  `);

  const upsertMany = db.transaction((entries: { key: string; value: string }[]) => {
    for (const entry of entries) {
      upsert.run(entry.key, entry.value, req.userId);
    }
  });

  const entries: { key: string; value: string }[] = [];

  if (model !== undefined) entries.push({ key: 'model', value: model });
  if (deepseekApiKey !== undefined) entries.push({ key: 'deepseekApiKey', value: deepseekApiKey });
  if (minimaxApiKey !== undefined) entries.push({ key: 'minimaxApiKey', value: minimaxApiKey });
  if (qwenApiKey !== undefined) entries.push({ key: 'qwenApiKey', value: qwenApiKey });

  if (entries.length > 0) {
    upsertMany(entries);
  }

  const configs = db.prepare('SELECT key, value FROM ai_config').all() as { key: string; value: string }[];
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
