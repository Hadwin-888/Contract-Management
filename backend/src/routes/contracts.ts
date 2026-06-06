import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { AuthRequest, authenticateToken, hasRole, requireRole } from '../middleware/auth.js';
import { buildDeptFilter, requireContractAccess } from '../middleware/permissions.js';
import { extractContractInfo } from '../services/ai.js';
import { readFileContent } from '../services/file-reader.js';
import prisma from '../prisma.js';
import { parseBool, toSnakeArray, toSnakeRecord } from '../serializers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', '..', 'uploads');

const router = Router();

// All routes require authentication
router.use(authenticateToken);

function buildContractWhere(req: AuthRequest, query: Record<string, unknown>) {
  const search = (query.search as string) || '';
  const where: any = { isAuditDraft: false };
  if ((req.role === 'clerk' || req.role === 'head') && query.__department) {
    where.followDept = query.__department;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { contractNo: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (query.status) where.status = query.status;
  if (query.riskLevel) where.riskLevel = query.riskLevel;
  if (query.followDept) where.followDept = query.followDept;
  if (query.costDept) where.costDept = query.costDept;
  if (query.amountMin || query.amountMax) {
    where.amount = {
      ...(query.amountMin ? { gte: parseFloat(query.amountMin as string) } : {}),
      ...(query.amountMax ? { lte: parseFloat(query.amountMax as string) } : {}),
    };
  }
  return where;
}

async function scopedQuery(req: AuthRequest) {
  if (req.role !== 'clerk' && req.role !== 'head') return {};
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { department: true } });
  return { __department: user?.department || '__NO_ACCESS__' };
}

// GET /api/contracts - List contracts with pagination & filters
router.get('/', requireRole('head', 'admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10));
  const where = buildContractWhere(req, { ...req.query, ...(await scopedQuery(req)) });
  const total = await prisma.contract.count({ where });
  const offset = (page - 1) * pageSize;
  const items = await prisma.contract.findMany({ where, orderBy: { createdAt: 'desc' }, skip: offset, take: pageSize });

  res.json({ items: toSnakeArray(items), total, page, pageSize });
});

// GET /api/contracts/export — Export filtered contracts as CSV
router.get('/export', requireRole('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const where = buildContractWhere(req, { ...req.query, ...(await scopedQuery(req)) });
  const items = toSnakeArray(await prisma.contract.findMany({ where, orderBy: { createdAt: 'desc' } })) as Record<string, unknown>[];

  const statusLabels: Record<string, string> = {
    active: '进行中', expired: '已过期', draft: '草稿', terminated: '已终止',
  };
  const riskLabels: Record<string, string> = {
    low: '低风险', medium: '中风险', high: '高风险',
  };

  const headers = [
    '合同编号', '合同名称', '甲方', '乙方', '合同类型', '合同状态',
    '合同金额', '不含税金额', '税率(%)', '质保金情况',
    '起始日期', '结束日期', '合同期限',
    '风险等级', '保险情况', '保险日期',
    '跟进部门', '费用部门', '费用代码',
    '创建时间',
  ];

  const csvRows = [headers.map(escapeCsvField).join(',')];

  for (const row of items) {
    csvRows.push([
      row.contract_no, row.name, row.party_a, row.party_b, row.type,
      statusLabels[row.status as string] || row.status,
      row.amount,
      row.amount_excluding_tax ?? '',
      row.tax_rate ?? '',
      row.quality_deposit,
      row.start_date, row.end_date, row.contract_term,
      riskLabels[row.risk_level as string] || row.risk_level,
      row.insurance_info, row.insurance_date,
      row.follow_dept, row.cost_dept, row.cost_code,
      row.created_at,
    ].map(escapeCsvField).join(','));
  }

  const csvContent = '﻿' + csvRows.join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="contracts_export_${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csvContent);
});

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// GET /api/contracts/:id
router.get('/:id', requireRole('head', 'admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string as string;
  const contract = await requireContractAccess(req, res, id);
  if (!contract) return;

  const uploads = toSnakeArray(await prisma.upload.findMany({ where: { contractId: id } }));
  const audits = toSnakeArray(await prisma.auditRecord.findMany({ where: { contractId: id }, orderBy: { createdAt: 'desc' } }));

  res.json({ ...contract, uploads, audits });
});

// POST /api/contracts
router.post('/', async (req: AuthRequest, res: Response) => {
  const {
    name, partyA, partyB, type, status, amount,
    amountExcludingTax, taxRate, qualityDeposit, contractNo,
    startDate, endDate, contractTerm, riskLevel,
    insuranceInfo, insuranceDate,
    followDept, costDept, costCode,
    isAuditDraft,
  } = req.body;

  if (!isAuditDraft && !hasRole(req, 'admin', 'super_admin')) {
    res.status(403).json({ error: '权限不足，需要合同管理员或系统管理员角色' });
    return;
  }

  if (!name || !partyA || !partyB || !type || !startDate || !endDate) {
    res.status(400).json({ error: '请填写必要的合同信息' });
    return;
  }

  let finalFollowDept = followDept || '';

  if (isAuditDraft && (req.role === 'clerk' || req.role === 'head')) {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { department: true } });
    finalFollowDept = user?.department || '';
  }

  const contract = await prisma.contract.create({
    data: {
      name, partyA, partyB, type, status: status || 'draft',
      amount: amount || 0, amountExcludingTax: amountExcludingTax || 0, taxRate: taxRate || 0,
      qualityDeposit: qualityDeposit || '', contractNo: contractNo || '',
      startDate, endDate, contractTerm: contractTerm || '', riskLevel: riskLevel || 'low',
      insuranceInfo: insuranceInfo || '', insuranceDate: insuranceDate || '',
      followDept: finalFollowDept, costDept: costDept || '', costCode: costCode || '',
      userId: req.userId, isAuditDraft: parseBool(isAuditDraft),
    },
  });
  res.status(201).json(toSnakeRecord(contract));
});

// PUT /api/contracts/:id
router.put('/:id', requireRole('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string as string;
  const contract = await requireContractAccess(req, res, id);
  if (!contract) return;

  const {
    name, partyA, partyB, type, status, amount,
    amountExcludingTax, taxRate, qualityDeposit, contractNo,
    startDate, endDate, contractTerm, riskLevel,
    insuranceInfo, insuranceDate,
    followDept, costDept, costCode,
  } = req.body;

  const updated = await prisma.contract.update({
    where: { id },
    data: {
      name, partyA, partyB, type, status, amount,
      amountExcludingTax, taxRate, qualityDeposit, contractNo,
      startDate, endDate, contractTerm, riskLevel,
      insuranceInfo, insuranceDate, followDept, costDept, costCode,
    },
  });
  res.json(toSnakeRecord(updated));
});

// DELETE /api/contracts/:id
router.delete('/:id', requireRole('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string as string;
  const contract = await requireContractAccess(req, res, id);
  if (!contract) return;

  await prisma.contract.delete({ where: { id } });
  res.json({ message: '合同已删除' });
});

// POST /api/contracts/ai-extract
router.post('/ai-extract', async (req: AuthRequest, res: Response) => {
  const { contractId, filePath } = req.body;

  if (!contractId && !filePath) {
    res.status(400).json({ error: '请提供合同ID或文件路径' });
    return;
  }

  let targetPath = filePath;
  let contractType = '采购';

  if (contractId) {
    const contract = await requireContractAccess(req, res, contractId);
    if (!contract) return;
    targetPath = contract.file_path as string || targetPath;
    contractType = contract.type as string || '采购';
  }

  if (!targetPath) {
    res.status(400).json({ error: '未找到关联文件' });
    return;
  }

  const fullPath = path.join(uploadDir, targetPath);
  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: '文件不存在' });
    return;
  }

  let fileContent = '';
  try {
    fileContent = await readFileContent(fullPath, 60000);
  } catch (err) {
    console.error('Read file content failed:', err);
    res.status(500).json({ error: '读取文件失败' });
    return;
  }

  if (!fileContent) {
    res.status(400).json({ error: '文件内容为空或无法读取' });
    return;
  }

  try {
    const extracted = await extractContractInfo(fileContent, contractType);

    if (contractId) {
      await prisma.contract.update({
        where: { id: contractId },
        data: {
          name: extracted.name,
          partyA: extracted.partyA,
          partyB: extracted.partyB,
          amount: extracted.amount,
          amountExcludingTax: extracted.amountExcludingTax || null,
          taxRate: extracted.taxRate || null,
          qualityDeposit: extracted.qualityDeposit || '',
          contractNo: extracted.contractNo || '',
          startDate: extracted.startDate,
          endDate: extracted.endDate,
          contractTerm: extracted.contractTerm || '',
          insuranceInfo: extracted.insuranceInfo || '',
          insuranceDate: extracted.insuranceDate || '',
        },
      });
    }

    res.json(extracted);
  } catch (error: any) {
    console.error('AI extract failed:', error);
    res.status(500).json({ error: 'AI 提取失败：' + (error.message || '未知错误') });
  }
});

export default router;
