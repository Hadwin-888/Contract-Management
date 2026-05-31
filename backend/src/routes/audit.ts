import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDb } from '../db.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import { analyzeContract, generateSummary, extractContractInfo } from '../services/ai.js';
import { readFileContent } from '../services/file-reader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', '..', 'uploads');

const router = Router();

router.use(authenticateToken);

// GET /api/audit — list audit records
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));

  const total = (db.prepare('SELECT COUNT(*) as count FROM audit_records').get() as { count: number }).count;
  const offset = (page - 1) * pageSize;

  const items = db.prepare(`
    SELECT a.*, c.name as contract_name
    FROM audit_records a
    LEFT JOIN contracts c ON a.contract_id = c.id
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(pageSize, offset);

  res.json({ items, total, page, pageSize });
});

// GET /api/audit/:id
router.get('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const record = db.prepare(`
    SELECT a.*, c.name as contract_name, c.party_a, c.party_b, c.type, c.amount, c.start_date, c.end_date, c.file_path
    FROM audit_records a
    LEFT JOIN contracts c ON a.contract_id = c.id
    WHERE a.id = ?
  `).get(req.params.id);

  if (!record) {
    res.status(404).json({ error: '审核记录不存在' });
    return;
  }

  const result = record as Record<string, unknown>;
  if (typeof result.suggestions === 'string') {
    try {
      result.suggestions = JSON.parse(result.suggestions as string);
    } catch {
      // keep as string
    }
  }

  res.json(result);
});

// POST /api/audit/analyze — trigger AI analysis with optional MD template
router.post('/analyze', async (req: AuthRequest, res: Response) => {
  const { contractId } = req.body;

  if (!contractId) {
    res.status(400).json({ error: '请提供合同ID' });
    return;
  }

  const db = getDb();
  const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(contractId) as Record<string, unknown> | undefined;

  if (!contract) {
    res.status(404).json({ error: '合同不存在' });
    return;
  }

  try {
    // Look up audit template by contract type
    const template = db.prepare('SELECT * FROM audit_templates WHERE contract_type = ?').get(contract.type as string) as { id: string; content: string; summary_content: string; version: number } | undefined;

    let templateId: string | null = null;
    let templateVersion: number | null = null;

    // Read uploaded file content if available
    let fileContent = '';
    const filePath = contract.file_path as string | null;
    if (filePath) {
      const fullPath = path.join(uploadDir, filePath);
      if (fs.existsSync(fullPath)) {
        try {
          fileContent = await readFileContent(fullPath, 5000);
        } catch {
          // ignore
        }
      }
    }

    // Extract contract info from file content using AI
    if (fileContent) {
      try {
        const extracted = await extractContractInfo(fileContent, contract.type as string);
        // Update contract with extracted info
        db.prepare(`
          UPDATE contracts SET name=?, party_a=?, party_b=?, amount=?, start_date=?, end_date=?
          WHERE id=?
        `).run(extracted.name, extracted.partyA, extracted.partyB, extracted.amount, extracted.startDate, extracted.endDate, contractId);
        // Refresh contract data
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

    // Build the analysis prompt with template if available
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
    );

    // Also generate file summary from uploaded file content
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
        template?.summary_content,
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

    const id = uuidv4();
    const suggestionsJson = JSON.stringify(analysis.suggestions);

    db.prepare(`
      INSERT INTO audit_records (id, contract_id, risk_score, issues_count, status, analysis, suggestions, summary, template_id, template_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, contractId, analysis.riskScore, analysis.issuesCount, analysis.status, analysis.analysis, suggestionsJson, summary, templateId, templateVersion);

    const record = db.prepare('SELECT * FROM audit_records WHERE id = ?').get(id);
    res.status(201).json({ ...record as object, suggestions: analysis.suggestions });
  } catch (error) {
    console.error('AI analysis failed:', error);
    res.status(500).json({
      error: 'AI 分析失败，请检查 AI 配置或稍后重试',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;
