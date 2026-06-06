import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth.js';
import { buildDeptFilter, requireContractAccess, canAccessContract } from '../middleware/permissions.js';
import { analyzeContract, generateSummary, extractContractInfo, runBasicContractChecks, calculateRiskScore } from '../services/ai.js';
import { readFileContent } from '../services/file-reader.js';
import prisma from '../prisma.js';
import { toSnakeArray, toSnakeRecord } from '../serializers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', '..', 'uploads');

const router = Router();

router.use(authenticateToken);

function parseJsonField(value: unknown, fallback: unknown) {
  if (typeof value !== 'string') return value ?? fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function hydrateAuditRecord<T extends Record<string, unknown>>(record: T): T {
  return {
    ...record,
    suggestions: parseJsonField(record.suggestions, []),
    extracted_fields: parseJsonField(record.extracted_fields, {}),
    rule_issues: parseJsonField(record.rule_issues, []),
    ai_issues: parseJsonField(record.ai_issues, []),
    reviewed_issues: parseJsonField(record.reviewed_issues, []),
  };
}

// GET /api/audit — list audit records (with dept filtering)
router.get('/', async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));

  const deptFilter = await buildDeptFilter(req);
  const department = deptFilter.params[0] as string | undefined;
  const where = department ? { contract: { followDept: department } } : {};
  const total = await prisma.auditRecord.count({ where });

  const offset = (page - 1) * pageSize;
  const rows = await prisma.auditRecord.findMany({
    where,
    include: { contract: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: pageSize,
  });
  const items = rows.map((row) => hydrateAuditRecord({ ...toSnakeRecord(row), contract_name: row.contract.name, contract: undefined } as Record<string, unknown>));

  res.json({ items, total, page, pageSize });
});

// GET /api/audit/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const row = await prisma.auditRecord.findUnique({
    where: { id: req.params.id as string },
    include: { contract: true },
  });
  const record = row ? {
    ...toSnakeRecord(row),
    contract_name: row.contract.name,
    party_a: row.contract.partyA,
    party_b: row.contract.partyB,
    type: row.contract.type,
    amount: row.contract.amount,
    start_date: row.contract.startDate,
    end_date: row.contract.endDate,
    file_path: row.contract.filePath,
    contract: undefined,
  } as Record<string, unknown> : undefined;

  if (!record) {
    res.status(404).json({ error: '审核记录不存在' });
    return;
  }

  // Check access to the associated contract
  const contractId = record.contract_id as string;
  if (contractId) {
    const contract = row?.contract ? toSnakeRecord(row.contract) as Record<string, unknown> : undefined;
    if (contract && !(await canAccessContract(req, contract))) {
      res.status(403).json({ error: '无权访问该审核记录' });
      return;
    }
  }

  res.json(hydrateAuditRecord(record));
});

// DELETE /api/audit/clear — clear all audit records (admin+ only)
router.delete('/clear', requireRole('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const result = await prisma.auditRecord.deleteMany();
  console.log(`Cleared ${result.count} audit records by user ${req.userId}`);
  res.json({ message: `已清除 ${result.count} 条审核记录` });
});

// DELETE /api/audit/:id — delete a single audit record
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const row = await prisma.auditRecord.findUnique({ where: { id: req.params.id as string }, include: { contract: true } });
  const record = row ? toSnakeRecord(row) as Record<string, unknown> : undefined;
  if (!record) {
    res.status(404).json({ error: '审核记录不存在' });
    return;
  }

  // Check access
  const contractId = record.contract_id as string;
  if (contractId) {
    const contract = row?.contract ? toSnakeRecord(row.contract) as Record<string, unknown> : undefined;
    if (contract && !(await canAccessContract(req, contract))) {
      res.status(403).json({ error: '无权删除该审核记录' });
      return;
    }
  }

  await prisma.auditRecord.delete({ where: { id: req.params.id as string } });
  res.json({ message: '审核记录已删除' });
});

// POST /api/audit/analyze — trigger AI analysis
router.post('/analyze', async (req: AuthRequest, res: Response) => {
  const { contractId } = req.body;

  if (!contractId) {
    res.status(400).json({ error: '请提供合同ID' });
    return;
  }

  const contract = await requireContractAccess(req, res, contractId);
  if (!contract) return;

  try {
    const template = await prisma.auditTemplate.findUnique({ where: { contractType: contract.type as string } });

    let templateId: string | null = null;
    let templateVersion: number | null = null;

    let fileContent = '';
    let extractedFields: Record<string, unknown> = {
      name: contract.name,
      partyA: contract.party_a,
      partyB: contract.party_b,
      amount: contract.amount,
      startDate: contract.start_date,
      endDate: contract.end_date,
      contractNo: contract.contract_no,
      qualityDeposit: contract.quality_deposit,
      insuranceInfo: contract.insurance_info,
    };
    const filePath = contract.file_path as string | null;
    if (filePath) {
      const fullPath = path.join(uploadDir, filePath);
      if (fs.existsSync(fullPath)) {
        try {
          fileContent = await readFileContent(fullPath, 120000);
        } catch {
          // ignore
        }
      }
    }

    if (fileContent) {
      try {
        const extracted = await extractContractInfo(fileContent, contract.type as string);
        extractedFields = { ...extractedFields, ...extracted };
        await prisma.contract.update({
          where: { id: contractId },
          data: {
            name: extracted.name,
            partyA: extracted.partyA,
            partyB: extracted.partyB,
            amount: extracted.amount,
            startDate: extracted.startDate,
            endDate: extracted.endDate,
          },
        });
        contract.name = extracted.name;
        contract.party_a = extracted.partyA;
        contract.party_b = extracted.partyB;
        contract.amount = extracted.amount;
        contract.start_date = extracted.startDate;
        contract.end_date = extracted.endDate;
      } catch (extractError) {
        console.error('Contract info extraction failed (non-fatal):', extractError);
      }
    }

    const ruleIssues = runBasicContractChecks(extractedFields as any);

    const analysis = await analyzeContract(
      {
        name: contract.name as string,
        partyA: contract.party_a as string,
        partyB: contract.party_b as string,
        type: contract.type as string,
        amount: contract.amount as number,
        startDate: contract.start_date as string,
        endDate: contract.end_date as string,
      },
      template?.content,
      fileContent || undefined,
      ruleIssues,
    );

    let summary = '';
    try {
      summary = await generateSummary(
        {
          name: contract.name as string,
          partyA: contract.party_a as string,
          partyB: contract.party_b as string,
          type: contract.type as string,
          amount: contract.amount as number,
          startDate: contract.start_date as string,
          endDate: contract.end_date as string,
        },
        template?.summaryContent,
        fileContent || undefined,
      );
    } catch (summaryError) {
      console.error('Summary generation failed (non-fatal):', summaryError);
      summary = `合同名称：${contract.name}\n甲方：${contract.party_a}\n乙方：${contract.party_b}\n合同类型：${contract.type}\n金额：¥${((contract.amount as number) / 10000).toFixed(2)}万\n期限：${contract.start_date} 至 ${contract.end_date}`;
    }

    if (template) {
      templateId = template.id;
      templateVersion = template.version;
    }

    const aiIssues = analysis.issues || [];
    const reviewedIssues = [...ruleIssues, ...aiIssues];
    const score = calculateRiskScore(reviewedIssues);
    const suggestionsJson = JSON.stringify(analysis.suggestions);

    const record = await prisma.auditRecord.create({
      data: {
        contractId,
        riskScore: score.riskScore,
        issuesCount: score.metrics.totalIssues,
        status: score.status,
        analysis: analysis.analysis,
        suggestions: suggestionsJson,
        summary,
        templateId,
        templateVersion,
        templateContentSnapshot: template?.content || '',
        contractType: contract.type as string || '',
        extractedFields: JSON.stringify(extractedFields),
        ruleIssues: JSON.stringify(ruleIssues),
        aiIssues: JSON.stringify(aiIssues),
        reviewedIssues: JSON.stringify(reviewedIssues),
        needHumanReviewCount: score.metrics.needHumanReviewCount,
        auditVersion: 'structured-v1',
      },
    });
    res.status(201).json(hydrateAuditRecord(toSnakeRecord(record) as Record<string, unknown>));
  } catch (error) {
    console.error('AI analysis failed:', error);
    res.status(500).json({
      error: 'AI 分析失败，请检查 AI 配置或稍后重试',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;
