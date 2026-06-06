import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDb } from '../db.js';
import { AuthRequest, authenticateToken, hasRole, requireRole } from '../middleware/auth.js';
import { buildDeptFilter, requireContractAccess } from '../middleware/permissions.js';
import { extractContractInfo } from '../services/ai.js';
import { readFileContent } from '../services/file-reader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', '..', 'uploads');

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/contracts - List contracts with pagination & filters
router.get('/', requireRole('head', 'admin', 'super_admin'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10));
  const search = (req.query.search as string) || '';
  const status = req.query.status as string;
  const riskLevel = req.query.riskLevel as string;
  const followDept = req.query.followDept as string;
  const costDept = req.query.costDept as string;
  const amountMin = req.query.amountMin as string;
  const amountMax = req.query.amountMax as string;

  let whereClause = 'WHERE is_audit_draft = 0';
  const params: unknown[] = [];

  // Role-based filtering
  const deptFilter = buildDeptFilter(req);
  whereClause += deptFilter.clause;
  params.push(...deptFilter.params);

  if (search) {
    whereClause += ' AND (name LIKE ? OR contract_no LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }
  if (riskLevel) {
    whereClause += ' AND risk_level = ?';
    params.push(riskLevel);
  }
  if (followDept) {
    whereClause += ' AND follow_dept = ?';
    params.push(followDept);
  }
  if (costDept) {
    whereClause += ' AND cost_dept = ?';
    params.push(costDept);
  }
  if (amountMin) {
    whereClause += ' AND amount >= ?';
    params.push(parseFloat(amountMin));
  }
  if (amountMax) {
    whereClause += ' AND amount <= ?';
    params.push(parseFloat(amountMax));
  }

  const countResult = db.prepare(`SELECT COUNT(*) as total FROM contracts ${whereClause}`).get(...params) as { total: number };
  const total = countResult.total;

  const offset = (page - 1) * pageSize;
  const items = db.prepare(
    `SELECT * FROM contracts ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset);

  res.json({ items, total, page, pageSize });
});

// GET /api/contracts/export — Export filtered contracts as CSV
router.get('/export', requireRole('admin', 'super_admin'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const search = (req.query.search as string) || '';
  const status = req.query.status as string;
  const riskLevel = req.query.riskLevel as string;
  const followDept = req.query.followDept as string;
  const costDept = req.query.costDept as string;
  const amountMin = req.query.amountMin as string;
  const amountMax = req.query.amountMax as string;

  let whereClause = 'WHERE is_audit_draft = 0';
  const params: unknown[] = [];

  const deptFilter = buildDeptFilter(req);
  whereClause += deptFilter.clause;
  params.push(...deptFilter.params);

  if (search) {
    whereClause += ' AND (name LIKE ? OR contract_no LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }
  if (riskLevel) {
    whereClause += ' AND risk_level = ?';
    params.push(riskLevel);
  }
  if (followDept) {
    whereClause += ' AND follow_dept = ?';
    params.push(followDept);
  }
  if (costDept) {
    whereClause += ' AND cost_dept = ?';
    params.push(costDept);
  }
  if (amountMin) {
    whereClause += ' AND amount >= ?';
    params.push(parseFloat(amountMin));
  }
  if (amountMax) {
    whereClause += ' AND amount <= ?';
    params.push(parseFloat(amountMax));
  }

  const items = db.prepare(
    `SELECT * FROM contracts ${whereClause} ORDER BY created_at DESC`
  ).all(...params) as Record<string, unknown>[];

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
router.get('/:id', requireRole('head', 'admin', 'super_admin'), (req: AuthRequest, res: Response) => {
  const id = req.params.id as string as string;
  const contract = requireContractAccess(req, res, id);
  if (!contract) return;

  const db = getDb();
  const uploads = db.prepare('SELECT * FROM uploads WHERE contract_id = ?').all(id);
  const audits = db.prepare('SELECT * FROM audit_records WHERE contract_id = ? ORDER BY created_at DESC').all(id);

  res.json({ ...contract, uploads, audits });
});

// POST /api/contracts
router.post('/', (req: AuthRequest, res: Response) => {
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

  const db = getDb();
  const id = uuidv4();
  let finalFollowDept = followDept || '';

  if (isAuditDraft && (req.role === 'clerk' || req.role === 'head')) {
    const user = db.prepare('SELECT department FROM users WHERE id = ?').get(req.userId) as { department: string } | undefined;
    finalFollowDept = user?.department || '';
  }

  db.prepare(`
    INSERT INTO contracts (
      id, name, party_a, party_b, type, status,
      amount, amount_excluding_tax, tax_rate, quality_deposit, contract_no,
      start_date, end_date, contract_term, risk_level,
      insurance_info, insurance_date,
      follow_dept, cost_dept, cost_code,
      user_id, is_audit_draft
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, name, partyA, partyB, type,
    status || 'draft',
    amount || 0, amountExcludingTax || 0, taxRate || 0,
    qualityDeposit || '', contractNo || '',
    startDate, endDate, contractTerm || '', riskLevel || 'low',
    insuranceInfo || '', insuranceDate || '',
    finalFollowDept, costDept || '', costCode || '',
    req.userId, isAuditDraft ? 1 : 0,
  );

  const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(id);
  res.status(201).json(contract);
});

// PUT /api/contracts/:id
router.put('/:id', requireRole('admin', 'super_admin'), (req: AuthRequest, res: Response) => {
  const id = req.params.id as string as string;
  const contract = requireContractAccess(req, res, id);
  if (!contract) return;

  const db = getDb();
  const {
    name, partyA, partyB, type, status, amount,
    amountExcludingTax, taxRate, qualityDeposit, contractNo,
    startDate, endDate, contractTerm, riskLevel,
    insuranceInfo, insuranceDate,
    followDept, costDept, costCode,
  } = req.body;

  db.prepare(`
    UPDATE contracts SET
      name=?, party_a=?, party_b=?, type=?, status=?,
      amount=?, amount_excluding_tax=?, tax_rate=?, quality_deposit=?, contract_no=?,
      start_date=?, end_date=?, contract_term=?, risk_level=?,
      insurance_info=?, insurance_date=?,
      follow_dept=?, cost_dept=?, cost_code=?
    WHERE id=?
  `).run(
    name, partyA, partyB, type, status,
    amount, amountExcludingTax, taxRate, qualityDeposit, contractNo,
    startDate, endDate, contractTerm, riskLevel,
    insuranceInfo, insuranceDate,
    followDept, costDept, costCode,
    req.params.id as string,
  );

  const updated = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id as string);
  res.json(updated);
});

// DELETE /api/contracts/:id
router.delete('/:id', requireRole('admin', 'super_admin'), (req: AuthRequest, res: Response) => {
  const id = req.params.id as string as string;
  const contract = requireContractAccess(req, res, id);
  if (!contract) return;

  const db = getDb();
  db.prepare('DELETE FROM contracts WHERE id = ?').run(id);
  res.json({ message: '合同已删除' });
});

// POST /api/contracts/ai-extract
router.post('/ai-extract', async (req: AuthRequest, res: Response) => {
  const { contractId, filePath } = req.body;

  if (!contractId && !filePath) {
    res.status(400).json({ error: '请提供合同ID或文件路径' });
    return;
  }

  const db = getDb();
  let targetPath = filePath;
  let contractType = '采购';

  if (contractId) {
    const contract = requireContractAccess(req, res, contractId);
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
      db.prepare(`
        UPDATE contracts SET
          name=?, party_a=?, party_b=?, amount=?,
          amount_excluding_tax=?, tax_rate=?, quality_deposit=?, contract_no=?,
          start_date=?, end_date=?, contract_term=?,
          insurance_info=?, insurance_date=?
        WHERE id=?
      `).run(
        extracted.name, extracted.partyA, extracted.partyB, extracted.amount,
        extracted.amountExcludingTax || null, extracted.taxRate || null,
        extracted.qualityDeposit || '', extracted.contractNo || '',
        extracted.startDate, extracted.endDate, extracted.contractTerm || '',
        extracted.insuranceInfo || '', extracted.insuranceDate || '',
        contractId
      );
    }

    res.json(extracted);
  } catch (error: any) {
    console.error('AI extract failed:', error);
    res.status(500).json({ error: 'AI 提取失败：' + (error.message || '未知错误') });
  }
});

export default router;
