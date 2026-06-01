import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { getDb } from '../db.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import { requireContractAccess, canAccessContract } from '../middleware/permissions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUploadDir = path.join(__dirname, '..', '..', 'uploads');

// Ensure base upload dir exists
if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}

/**
 * Get configured storage path for a given field type.
 */
function getStoragePath(field: string): string {
  const db = getDb();
  const config = db.prepare('SELECT value FROM storage_config WHERE key = ?').get(field === 'insurance' ? 'insurancePath' : 'contractPath') as { value: string } | undefined;
  const relativePath = config?.value || (field === 'insurance' ? 'insurance' : 'contract');
  const safePath = relativePath.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '');
  return path.join(baseUploadDir, safePath);
}

/**
 * Generate filename based on naming rule.
 */
function generateFileName(contract: Record<string, unknown> | null, ext: string, namingRule: string): string {
  if (!contract) return uuidv4() + ext;

  let name = namingRule || '{contractNo}{name}{partyB}';
  name = name.replace(/\{contractNo\}/g, (contract.contract_no as string) || '');
  name = name.replace(/\{name\}/g, (contract.name as string) || '');
  name = name.replace(/\{partyB\}/g, (contract.party_b as string) || '');
  name = name.replace(/\{partyA\}/g, (contract.party_a as string) || '');
  name = name.replace(/\{contractId\}/g, (contract.id as string) || '');

  name = name.replace(/[<>:"/\\|?*]/g, '_').trim();
  if (!name) name = uuidv4();

  return `${name}${ext}`;
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const field = (req.body?.field as string) || 'contract';
    const dir = getStoragePath(field);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const field = (req.body?.field as string) || 'contract';
    const contractId = req.body?.contractId || null;

    if (contractId) {
      const db = getDb();
      const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(contractId) as Record<string, unknown> | null;
      if (contract) {
        const namingConfig = db.prepare('SELECT value FROM storage_config WHERE key = ?').get('namingRule') as { value: string } | undefined;
        const namingRule = namingConfig?.value || '{contractNo}{name}{partyB}';
        const fileName = generateFileName(contract, ext, namingRule);
        cb(null, fileName);
        return;
      }
    }

    cb(null, uuidv4() + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型，请上传 PDF、DOCX、TXT、JPG 或 PNG 文件'));
    }
  },
});

const router = Router();

router.use(authenticateToken);

// POST /api/upload - Upload a file
router.post('/', upload.single('file'), (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: '请选择要上传的文件' });
    return;
  }

  const contractId = req.body.contractId || null;

  // Validate contract access if contractId is provided
  if (contractId) {
    const db = getDb();
    const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(contractId) as Record<string, unknown> | undefined;
    if (!contract) {
      // Clean up uploaded file
      fs.unlink(req.file.path, () => {});
      res.status(404).json({ error: '合同不存在' });
      return;
    }
    if (!canAccessContract(req, contract)) {
      fs.unlink(req.file.path, () => {});
      res.status(403).json({ error: '无权为该合同上传文件' });
      return;
    }
  }

  const db = getDb();
  const id = uuidv4();
  const field = req.body.field || 'contract';

  let originalName = req.file.originalname;
  try {
    const reencoded = Buffer.from(originalName, 'latin1').toString('utf-8');
    if (reencoded !== originalName && /[一-鿿]/.test(reencoded)) {
      originalName = reencoded;
    }
  } catch {
    // keep original
  }

  const relativePath = path.relative(baseUploadDir, req.file.path);

  db.prepare(`
    INSERT INTO uploads (id, contract_id, filename, original_name, size, mime_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, contractId, relativePath, originalName, req.file.size, req.file.mimetype);

  if (contractId) {
    if (field === 'insurance') {
      db.prepare('UPDATE contracts SET insurance_file_path = ? WHERE id = ?').run(relativePath, contractId);
    } else {
      db.prepare('UPDATE contracts SET file_path = ? WHERE id = ?').run(relativePath, contractId);
    }
  }

  const uploadRecord = db.prepare('SELECT * FROM uploads WHERE id = ?').get(id);

  res.status(201).json({
    ...uploadRecord as object,
    url: `/api/upload/file/${relativePath}`,
  });
});

// GET /api/upload/file/* — Authenticated file download (replaces public static /uploads)
router.get('/file/*', (req: AuthRequest, res: Response) => {
  // Extract the relative path from the wildcard
  const relativePath = req.params[0] || '';
  if (!relativePath) {
    res.status(400).json({ error: '文件路径无效' });
    return;
  }

  // Sanitize: prevent directory traversal
  const safePath = relativePath.replace(/\.\./g, '');
  const fullPath = path.join(baseUploadDir, safePath);

  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: '文件不存在' });
    return;
  }

  // Check if user has access to the contract associated with this file
  const db = getDb();
  const upload = db.prepare('SELECT * FROM uploads WHERE filename = ?').get(safePath) as Record<string, unknown> | undefined;

  if (upload?.contract_id) {
    const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(upload.contract_id) as Record<string, unknown> | undefined;
    if (contract) {
      if (!canAccessContract(req, contract)) {
        res.status(403).json({ error: '无权访问该文件' });
        return;
      }
    }
  }

  res.sendFile(fullPath);
});

// Error handling for multer
router.use((err: Error, _req: AuthRequest, res: Response, _next: () => void) => {
  console.error('Upload error:', err.message);
  if (err.message?.includes('不支持的文件类型')) {
    res.status(400).json({ error: err.message });
  } else if (err.message?.includes('File too large')) {
    res.status(400).json({ error: '文件大小不能超过 20MB' });
  } else {
    res.status(500).json({ error: '文件上传失败' });
  }
});

export default router;
