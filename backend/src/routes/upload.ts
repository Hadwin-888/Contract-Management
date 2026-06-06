import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import { canAccessContract } from '../middleware/permissions.js';
import prisma from '../prisma.js';
import { toSnakeRecord } from '../serializers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUploadDir = path.join(__dirname, '..', '..', 'uploads');

// Ensure base upload dir exists
if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}

/**
 * Get configured storage path for a given field type.
 */
async function getStoragePath(field: string): Promise<string> {
  const config = await prisma.storageConfig.findUnique({ where: { key: field === 'insurance' ? 'insurancePath' : 'contractPath' } });
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/tab-separated-values',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'image/bmp',
      'image/tiff',
    ];
    const allowedExts = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.tsv', '.txt', '.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型，请上传 PDF、DOC、DOCX、XLS、XLSX、CSV、TXT、JPG、PNG、WEBP 或 TIFF 文件'));
    }
  },
});

const router = Router();

router.use(authenticateToken);

// POST /api/upload - Upload a file
router.post('/', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: '请选择要上传的文件' });
    return;
  }

  const contractId = req.body.contractId || null;
  let contract: Record<string, unknown> | null = null;

  // Validate contract access if contractId is provided
  if (contractId) {
    const found = await prisma.contract.findUnique({ where: { id: contractId } });
    contract = found ? toSnakeRecord(found) as Record<string, unknown> : null;
    if (!contract) {
      res.status(404).json({ error: '合同不存在' });
      return;
    }
    if (!(await canAccessContract(req, contract))) {
      res.status(403).json({ error: '无权为该合同上传文件' });
      return;
    }
  }

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

  const ext = path.extname(originalName);
  const dir = await getStoragePath(field);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const namingConfig = await prisma.storageConfig.findUnique({ where: { key: 'namingRule' } });
  const fileName = generateFileName(contract, ext, namingConfig?.value || '{contractNo}{name}{partyB}');
  const fullPath = path.join(dir, fileName);
  await fs.promises.writeFile(fullPath, req.file.buffer);
  const relativePath = path.relative(baseUploadDir, fullPath);

  const uploadRecord = await prisma.upload.create({
    data: {
      contractId,
      filename: relativePath,
      originalName,
      size: req.file.size,
      mimeType: req.file.mimetype,
    },
  });

  if (contractId) {
    if (field === 'insurance') {
      await prisma.contract.update({ where: { id: contractId }, data: { insuranceFilePath: relativePath } });
    } else {
      await prisma.contract.update({ where: { id: contractId }, data: { filePath: relativePath } });
    }
  }

  res.status(201).json({
    ...toSnakeRecord(uploadRecord) as object,
    url: `/api/upload/file/${relativePath}`,
  });
});

// GET /api/upload/file/* — Authenticated file download (replaces public static /uploads)
router.get('/file/*', async (req: AuthRequest, res: Response) => {
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
  const upload = await prisma.upload.findFirst({ where: { filename: safePath } });

  if (upload?.contractId) {
    const found = await prisma.contract.findUnique({ where: { id: upload.contractId } });
    const contract = found ? toSnakeRecord(found) as Record<string, unknown> : undefined;
    if (contract) {
      if (!(await canAccessContract(req, contract))) {
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
    res.status(400).json({ error: '文件大小不能超过 50MB' });
  } else {
    res.status(500).json({ error: '文件上传失败' });
  }
});

export default router;
