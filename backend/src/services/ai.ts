import OpenAI from 'openai';
import prisma from '../prisma.js';

interface ContractInfo {
  name: string;
  partyA: string;
  partyB: string;
  type: string;
  amount: number;
  startDate: string;
  endDate: string;
}

interface AnalysisResult {
  riskScore: number;
  issuesCount: number;
  status: 'pass' | 'warning' | 'fail';
  analysis: string;
  suggestions: string[];
  issues: AuditIssue[];
  metrics: AuditMetrics;
  needHumanReviewCount: number;
}

export interface AuditIssue {
  title: string;
  severity: 'high' | 'medium' | 'low';
  source: 'rule' | 'ai';
  checkItemId?: string;
  evidence: string;
  reason: string;
  suggestion: string;
  confidence: number;
  needHumanReview: boolean;
}

export interface AuditMetrics {
  totalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  needHumanReviewCount: number;
}

interface ExtractedInfo {
  name: string;
  partyA: string;
  partyB: string;
  amount: number;
  amountExcludingTax?: number;
  taxRate?: number;
  qualityDeposit?: string;
  contractNo?: string;
  startDate: string;
  endDate: string;
  contractTerm?: string;
  insuranceInfo?: string;
  insuranceDate?: string;
}

function normalizePromptText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseJsonFromAi(content: string): unknown {
  let jsonStr = content.trim();
  jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    jsonStr = objectMatch[0];
  }

  jsonStr = jsonStr.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
  return JSON.parse(jsonStr);
}

function normalizeSeverity(value: unknown): 'high' | 'medium' | 'low' {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'medium';
}

function normalizeIssues(raw: unknown, source: 'rule' | 'ai'): AuditIssue[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const issue = item as Record<string, unknown>;
    return {
      title: String(issue.title || '未命名问题'),
      severity: normalizeSeverity(issue.severity),
      source,
      checkItemId: issue.checkItemId ? String(issue.checkItemId) : undefined,
      evidence: String(issue.evidence || ''),
      reason: String(issue.reason || ''),
      suggestion: String(issue.suggestion || ''),
      confidence: typeof issue.confidence === 'number' ? Math.max(0, Math.min(1, issue.confidence)) : 0.7,
      needHumanReview: Boolean(issue.needHumanReview),
    };
  });
}

export function calculateAuditMetrics(issues: AuditIssue[]): AuditMetrics {
  const highIssues = issues.filter((i) => i.severity === 'high').length;
  const mediumIssues = issues.filter((i) => i.severity === 'medium').length;
  const lowIssues = issues.filter((i) => i.severity === 'low').length;
  const needHumanReviewCount = issues.filter((i) => i.needHumanReview).length;
  return {
    totalIssues: issues.length,
    highIssues,
    mediumIssues,
    lowIssues,
    needHumanReviewCount,
  };
}

export function calculateRiskScore(issues: AuditIssue[]): { riskScore: number; status: 'pass' | 'warning' | 'fail'; metrics: AuditMetrics } {
  const metrics = calculateAuditMetrics(issues);
  const riskScore = Math.max(
    0,
    100
      - metrics.highIssues * 15
      - metrics.mediumIssues * 8
      - metrics.lowIssues * 3
      - metrics.needHumanReviewCount * 2,
  );
  const status = riskScore >= 85 ? 'pass' : riskScore >= 60 ? 'warning' : 'fail';
  return { riskScore, status, metrics };
}

export function runBasicContractChecks(fields: Partial<ExtractedInfo>): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const add = (title: string, severity: 'high' | 'medium' | 'low', reason: string, suggestion: string, evidence = '') => {
    issues.push({ title, severity, source: 'rule', evidence, reason, suggestion, confidence: 1, needHumanReview: false });
  };

  if (!fields.name) add('合同名称缺失', 'medium', '未识别到合同名称', '建议补充明确的合同名称');
  if (!fields.contractNo) add('合同编号缺失', 'low', '未识别到合同编号', '建议补充唯一合同编号，方便归档和追溯');
  if (!fields.partyA || fields.partyA === '未识别') add('甲方信息缺失', 'high', '未识别到甲方主体', '建议补充完整甲方名称、统一社会信用代码和联系信息');
  if (!fields.partyB || fields.partyB === '未识别') add('乙方信息缺失', 'high', '未识别到乙方主体', '建议补充完整乙方名称、统一社会信用代码和联系信息');
  if (!fields.amount || fields.amount <= 0) add('合同金额缺失或无效', 'medium', '未识别到有效合同金额', '建议明确合同金额、币种、税费和付款安排');
  if (!fields.startDate) add('开始日期缺失', 'medium', '未识别到合同开始日期', '建议明确合同生效日期或服务开始日期');
  if (!fields.endDate) add('结束日期缺失', 'medium', '未识别到合同结束日期', '建议明确合同结束日期或终止条件');
  if (fields.startDate && fields.endDate && new Date(fields.endDate).getTime() < new Date(fields.startDate).getTime()) {
    add('合同结束日期早于开始日期', 'high', '合同结束日期早于开始日期', '建议核对并修正合同期限');
  }
  if (!fields.qualityDeposit) add('质保金或质量保障安排不明确', 'low', '未识别到质保金或质量保障安排', '如适用，建议明确质保金比例、扣留和返还条件');
  if (!fields.insuranceInfo) add('保险要求不明确', 'low', '未识别到保险要求', '如涉及施工、服务外包或高风险履约，建议明确保险种类、保额和有效期');

  return issues;
}

function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '未识别';
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getClauseText(content: string, startKeyword: string, nextKeyword: string): string {
  const start = content.indexOf(startKeyword);
  if (start < 0) return '';
  const end = content.indexOf(nextKeyword, start + startKeyword.length);
  return content.slice(start, end > start ? end : start + 1800).trim();
}

function firstMatch(content: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) return match[1].replace(/\s+/g, ' ').trim();
  }
  return '';
}

function extractPaymentFacts(fileContent?: string): { taxStatus: string; taxRate: string; paymentMethod: string; settlementCycle: string } {
  if (!fileContent) {
    return { taxStatus: '需结合原文复核', taxRate: '需结合原文复核', paymentMethod: '需结合原文复核', settlementCycle: '需结合原文复核' };
  }

  const content = fileContent.replace(/\s+/g, ' ');
  const settlementClause = getClauseText(content, '第十一条 货款结算', '第十二条');
  const source = settlementClause || content;
  const settlementCycle = firstMatch(source, [
    /货款账期[:：]\s*([^。；;]+)/,
    /(月结[^。；;]*)/,
  ]);
  const paymentMethod = firstMatch(source, [
    /(收到乙方提供的等额合法增值税[^。；;]*?以银行转账的方式[^。；;]*?支付[^。；;]*)/,
    /(以银行转账的方式[^。；;]*?支付[^。；;]*)/,
    /付款方式\s*([^。；;]+)/,
  ]);
  const taxRate = firstMatch(content, [
    /增值税税率\s*[为：:]?\s*【?(\d+(?:\.\d+)?)】?\s*%/,
    /税率为\s*【?(\d+(?:\.\d+)?)】?\s*%/,
  ]);
  const taxStatus = content.includes('含税价格') ? '含税价格' : '需结合原文复核';

  return {
    taxStatus,
    taxRate: taxRate ? `${taxRate}%` : '需结合原文复核',
    paymentMethod: paymentMethod || '需结合原文复核',
    settlementCycle: settlementCycle || '需结合原文复核',
  };
}

function buildDocumentEvidenceHints(fileContent?: string): string {
  if (!fileContent) return '';

  const hints: string[] = [];
  const normalized = fileContent.replace(/\s+/g, ' ').trim();
  const appendixPatterns = [
    { label: '附件3《合同清单》', pattern: /(合同附件3[:：]合同清单|附件3[:：]合同清单|附件3《合同清单》)/ },
    { label: '附件/合同清单', pattern: /(合同清单|产品名称\s+规格\s+单位\s+未税价\s+税率\s+含税价)/ },
  ];

  for (const item of appendixPatterns) {
    const match = normalized.match(item.pattern);
    if (match?.index !== undefined) {
      const start = Math.max(0, match.index - 200);
      const end = Math.min(normalized.length, match.index + 1800);
      hints.push(`- 已检测到${item.label}，不得判断为“未提供”或“缺失”。证据片段：${normalized.slice(start, end)}`);
    }
  }

  const itemCountMatches = normalized.match(/(?:^|\s)(?:[1-9]\d?)\s+[\u4e00-\u9fa5A-Za-z0-9®+().（）\- ]{2,80}\s+[^ ]+\s+(?:箱|瓶|桶|盒|支|片|包|台|套)\s+\d+(?:\.\d+)?\s+13%\s+\d+(?:\.\d+)?/g);
  if (itemCountMatches && itemCountMatches.length >= 5) {
    hints.push(`- 已检测到合同清单明细至少 ${itemCountMatches.length} 项，包含产品名称、规格、单位、未税价、税率、含税价等字段。不得输出“附件3《合同清单》未提供”。`);
  }

  if (hints.length === 0) return '';
  return `系统从合同全文中提取到以下关键证据，请优先采用这些证据，避免误判附件缺失：\n${hints.join('\n')}\n\n---\n\n`;
}

function buildAuditFileContentForPrompt(fileContent: string, maxLength = 60000): string {
  const text = normalizePromptText(fileContent);
  if (text.length <= maxLength) return text;

  const sections: string[] = [];
  const addSection = (title: string, body: string) => {
    const normalized = normalizePromptText(body);
    if (normalized && !sections.some((section) => section.includes(normalized.slice(0, 120)))) {
      sections.push(`【${title}】\n${normalized}`);
    }
  };

  addSection('文件开头', text.slice(0, 18000));

  const importantPatterns = [
    /(?:合同附件|附件|附录|清单|报价单|明细表|Schedule|Appendix)[\s\S]{0,8000}/gi,
    /(?:付款|结算|发票|税率|金额|价款|总价|单价)[\s\S]{0,5000}/gi,
    /(?:违约|赔偿|解除|终止|争议|管辖|保密|知识产权)[\s\S]{0,5000}/gi,
    /(?:签署页|盖章|签字|以下无正文)[\s\S]{0,5000}/gi,
  ];

  for (const pattern of importantPatterns) {
    const matches = [...text.matchAll(pattern)].slice(0, 8);
    for (const match of matches) {
      if (match.index === undefined) continue;
      addSection('关键片段', text.slice(Math.max(0, match.index - 800), Math.min(text.length, match.index + match[0].length + 800)));
      if (sections.join('\n\n').length >= maxLength - 12000) break;
    }
    if (sections.join('\n\n').length >= maxLength - 12000) break;
  }

  addSection('文件结尾', text.slice(-12000));
  return normalizePromptText(sections.join('\n\n---\n\n')).slice(0, maxLength);
}

function formatAuditDate(date = new Date()): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date).replace(/\//g, '年').replace(/年(\d{2})年/, '年$1月') + '日';
}

function getCounterparty(contract: ContractInfo): string {
  if (contract.partyA && !contract.partyA.includes('美高梅')) return contract.partyA;
  if (contract.partyB && !contract.partyB.includes('美高梅')) return contract.partyB;
  return contract.partyB || contract.partyA || '对方公司全称未识别';
}

function getHotelParty(contract: ContractInfo): string {
  if (contract.partyA?.includes('美高梅')) return contract.partyA;
  if (contract.partyB?.includes('美高梅')) return contract.partyB;
  return '深圳美高梅酒店';
}

function getClauseLabel(issue: AuditIssue): string {
  const evidence = issue.evidence || '';
  const article = evidence.match(/第[一二三四五六七八九十百\d]+条(?:第[一二三四五六七八九十百\d]+款|（[一二三四五六七八九十百\d]+）)?/);
  return article?.[0] || issue.checkItemId || '未明确，需人工定位';
}

function issueBlock(issue: AuditIssue, index: number): string[] {
  return [
    `**问题${index}：${issue.title}**`,
    `- 所在条款：${getClauseLabel(issue)}`,
    `- 原文引用：「${issue.evidence || '未提供原文依据，建议人工复核'}」`,
    `- 风险分析：${issue.reason}`,
    `- 修改建议：建议改为「${issue.suggestion}」`,
    '',
  ];
}

function buildIssueSection(title: string, issues: AuditIssue[], startIndex: number): { lines: string[]; nextIndex: number } {
  const lines = [title, ''];
  if (issues.length === 0) {
    lines.push('暂无。', '');
    return { lines, nextIndex: startIndex };
  }

  let current = startIndex;
  for (const issue of issues) {
    lines.push(...issueBlock(issue, current));
    current += 1;
  }
  return { lines, nextIndex: current };
}

function buildHighlights(fileContent?: string): string[] {
  const content = fileContent || '';
  const highlights: string[] = [];
  if (/甲方有权|拒收|退换货|解除/.test(content)) {
    highlights.push('第九条/退换货相关条款：保留甲方拒收、退换货或解除合作的权利，有利于深圳美高梅酒店控制商品质量和宾客体验风险。');
  }
  if (/含税价格|税率|发票/.test(content)) {
    highlights.push('价格及发票条款：已出现含税价格、税率或发票要求，有利于后续财务审核和税务合规复核。');
  }
  if (/知识产权|商标|专利|侵权/.test(content)) {
    highlights.push('知识产权条款：已关注商标、专利或侵权责任，有利于降低深圳美高梅酒店品牌连带风险。');
  }
  if (/保密|商业秘密|宾客信息|个人信息/.test(content)) {
    highlights.push('保密相关条款：已设置保密或信息保护义务，有利于保护酒店经营信息、宾客信息和品牌资产。');
  }
  if (highlights.length === 0) {
    highlights.push('已识别到合同主体、期限及基本履约安排，可作为进一步谈判和法务修订的基础。');
  }
  return highlights.slice(0, 4);
}

function buildMoneyCheckRows(contract: ContractInfo, paymentFacts: ReturnType<typeof extractPaymentFacts>, issues: AuditIssue[]): string[] {
  const amount = Number.isFinite(contract.amount) && contract.amount > 0 ? contract.amount : 0;
  const taxRateNumber = parseFloat(paymentFacts.taxRate);
  const hasTaxRate = Number.isFinite(taxRateNumber) && taxRateNumber > 0;
  const amountDisplay = amount > 0 ? formatCurrency(amount) : '未识别';
  const netAmount = amount > 0 && hasTaxRate ? amount / (1 + taxRateNumber / 100) : 0;
  const taxAmount = amount > 0 && hasTaxRate ? amount - netAmount : 0;
  const amountIssue = issues.find((issue) => /金额|税|发票|价款|结算/.test(`${issue.title}${issue.reason}`));
  const result = amount > 0 && hasTaxRate && !amountIssue
    ? '✅ 一致'
    : amountIssue
      ? `❌ ${amountIssue.title}`
      : '需人工复核';

  return [
    '| 项目 | 金额 | 验算 |',
    '|------|------|------|',
    `| 合同总价（含税） | ${amountDisplay} | ${amount > 0 ? '--' : '合同未明确总价或需按实际结算'} |`,
    `| 不含税金额 | ${netAmount > 0 ? formatCurrency(netAmount) : '未识别'} | ÷(1+税率${hasTaxRate ? ` ${paymentFacts.taxRate}` : ''}) |`,
    `| 税额 | ${taxAmount > 0 ? formatCurrency(taxAmount) : '未识别'} | ×税率${hasTaxRate ? ` ${paymentFacts.taxRate}` : ''} |`,
    `| 验算结果 | -- | ${result} |`,
  ];
}

function buildAnalysisMarkdown(contract: ContractInfo, summary: string, issues: AuditIssue[], fileContent?: string): string {
  const paymentFacts = extractPaymentFacts(fileContent);
  const highIssues = issues.filter((issue) => issue.severity === 'high');
  const mediumIssues = issues.filter((issue) => issue.severity === 'medium');
  const lowIssues = issues.filter((issue) => issue.severity === 'low');
  const hotelParty = getHotelParty(contract);
  const counterparty = getCounterparty(contract);
  let issueIndex = 1;
  const highSection = buildIssueSection('### 🔴 严重问题（必须修改）', highIssues, issueIndex);
  issueIndex = highSection.nextIndex;
  const mediumSection = buildIssueSection('### 🟡 中等问题（建议修改）', mediumIssues, issueIndex);
  issueIndex = mediumSection.nextIndex;
  const lowSection = buildIssueSection('### 🟢 轻微问题', lowIssues, issueIndex);
  const highlights = buildHighlights(fileContent);

  const lines = [
    '> ⚠️ 以下为 AI 合同审核报告，请以有利于深圳美高梅酒店的方向进行修订和谈判',
    '',
    '---',
    '',
    `**合同名称**：【${counterparty}】${contract.name || 'XXX合同'}`,
    `**合同金额**：人民币 ${formatCurrency(contract.amount)}（${paymentFacts.taxStatus}）`,
    `**签订方**：甲方：${hotelParty} / 乙方：${counterparty}`,
    `**审核日期**：${formatAuditDate()}`,
    '',
    '---',
    '',
    '## 逐条检查结果',
    '',
    `本次审核以深圳美高梅酒店利益保护为优先原则。${summary || '审核完成，请结合问题清单进行人工复核。'}`,
    `共识别 ${issues.length} 个问题，其中严重问题 ${highIssues.length} 个、中等问题 ${mediumIssues.length} 个、轻微问题 ${lowIssues.length} 个。`,
    `付款方式：${paymentFacts.paymentMethod}；结算周期：${paymentFacts.settlementCycle}；税率：${paymentFacts.taxRate}。`,
    '',
    '## 问题清单（按严重度排序）',
    '',
    ...highSection.lines,
    ...mediumSection.lines,
    ...lowSection.lines,
    '---',
    '',
    '## 亮点条款',
    '',
    ...highlights.map((highlight, index) => `${index + 1}. ${highlight}`),
    '',
    '---',
    '',
    '## 补充建议',
    '',
    `1. **谈判要点**：优先要求对方接受更有利于深圳美高梅酒店的违约责任、解除权、赔偿范围、发票合规和付款条件。`,
    `2. **补充条款建议**：补充对方资质持续有效、商品/服务不影响酒店品牌声誉、因对方原因导致宾客投诉或监管处罚时由对方全额赔偿的条款。`,
    `3. **人工复核建议**：涉及金额、税率、发票类型、销售激励、个人收款、品牌授权和监管合规的问题，应由财务、法务及业务部门共同确认。`,
    '',
    '---',
    '',
    '## 金额验算',
    '',
    ...buildMoneyCheckRows(contract, paymentFacts, issues),
  ];
  return lines.join('\n');
}

interface ModelConfig {
  baseURL: string;
  modelName: string;
  apiKey: string;
}

/**
 * Read AI configuration from the database.
 */
async function getModelConfig(): Promise<ModelConfig> {
  const configs = await prisma.aiConfig.findMany({ select: { key: true, value: true } });
  const configMap: Record<string, string> = {};
  for (const c of configs) {
    configMap[c.key] = c.value;
  }

  const model = configMap.model || 'deepseek';

  // Model → API config mapping
  const modelConfigs: Record<string, { baseURL: string; modelName: string; envKey: string }> = {
    deepseek: {
      baseURL: 'https://api.deepseek.com',
      modelName: 'deepseek-chat',
      envKey: 'deepseekApiKey',
    },
    minimax: {
      baseURL: 'https://api.minimax.chat/v1',
      modelName: 'MiniMax-M3',
      envKey: 'minimaxApiKey',
    },
    qwen: {
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      modelName: 'qwen-plus',
      envKey: 'qwenApiKey',
    },
  };

  const cfg = modelConfigs[model] || modelConfigs.deepseek;
  const apiKey = configMap[cfg.envKey] || process.env[cfg.envKey.toUpperCase()] || process.env.DEEPSEEK_API_KEY || '';

  if (!apiKey) {
    throw new Error(`API Key 未配置（${model}），请在系统设置中配置`);
  }

  return {
    baseURL: cfg.baseURL,
    modelName: cfg.modelName,
    apiKey,
  };
}

/**
 * Retry wrapper for AI calls with exponential backoff.
 */
async function retryAiCall<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export async function analyzeContract(
  contract: ContractInfo,
  templateContent?: string,
  fileContent?: string,
  ruleIssues: AuditIssue[] = [],
): Promise<AnalysisResult> {
  const modelConfig = await getModelConfig();

  const client = new OpenAI({
    apiKey: modelConfig.apiKey,
    baseURL: modelConfig.baseURL,
    timeout: 120000,
    maxRetries: 0, // we handle retry ourselves
  });

  // Build prompt: include MD template if provided, then contract info + analysis instructions
  let prompt = '你是一个专业的合同审核AI助手。审核立场：默认代表深圳美高梅酒店进行审核，所有风险判断和修改建议均应优先保护深圳美高梅酒店的经营安全、财务利益、品牌声誉、宾客体验、税务合规和争议处理优势。';

  if (templateContent) {
    console.log(`Using audit template (${templateContent.length} chars) for contract type: ${contract.type}`);
    prompt += `请严格按照以下审核规则对合同进行分析，逐条对照规则进行审核，并基于这些规则出具审核报告：\n\n${templateContent}\n\n---\n\n`;
  } else {
    console.log(`No audit template found for contract type: ${contract.type}, using generic prompt`);
    prompt += '请分析以下合同信息，给出风险评估和修改建议。\n\n';
  }

  prompt += `合同名称：${contract.name}
甲方：${contract.partyA}
乙方：${contract.partyB}
合同类型：${contract.type}
合同金额：¥${(contract.amount / 10000).toFixed(2)}万
合同期限：${contract.startDate} 至 ${contract.endDate}

`;

  if (fileContent) {
    prompt += `以下是合同文件的具体内容。若原文件较长，系统会保留开头、附件/清单/报价表/付款结算/违约责任/签署页等关键片段，请基于这些内容结合审核规则进行详细审核：\n\n${buildAuditFileContentForPrompt(fileContent)}\n\n---\n\n`;
    prompt += buildDocumentEvidenceHints(fileContent);
  }

  if (ruleIssues.length > 0) {
    prompt += `以下是系统基础规则检查已发现的问题，请结合合同原文复核，不要重复输出同类问题：\n\n${JSON.stringify(ruleIssues, null, 2)}\n\n---\n\n`;
  }

  prompt += `请以JSON格式返回分析结果，包含以下字段：
1. riskScore: 风险评分（0-100，越高越安全）
2. issuesCount: 发现的问题数量
3. status: "pass"（通过，≥70分）、"warning"（警告，50-69分）或"fail"（未通过，<50分）
4. summary: 对合同整体风险的简短总结
5. analysis: 按用户审核要求 Markdown 中“合同审核报告输出格式要求”生成的完整 Markdown 审核报告
6. issues: 结构化问题数组。每个问题必须包含：
   - title
   - severity: "high" | "medium" | "low"
   - source: "ai"
   - checkItemId: 可选，对应审核规则检查项
   - evidence: 合同原文摘录；没有依据时留空
   - reason: 判断理由
   - suggestion: 修改建议
   - confidence: 0到1
   - needHumanReview: boolean
7. suggestions: 改进建议数组（3-5条简短建议）

要求：
- 严格依据用户配置的审核要求 Markdown。
- analysis 必须优先遵循审核要求 Markdown 中定义的报告章节和标题；报告格式参考“问题清单按严重度排序、亮点条款、补充建议、金额验算”。
- 审核结论和修改建议必须以有利于深圳美高梅酒店为原则。
- 每个确定性风险必须引用合同原文 evidence。
- 每个问题的 suggestion 尽量写成可直接替换进合同的修改后文本。
- 没有原文依据时不要编造，设置 needHumanReview=true。
- 不要重复输出基础规则检查中已经明确的问题。
- 只返回JSON，不要包含其他内容。`;

  // Build request options - some models (MiniMax) don't support response_format
  // Use temperature=0 for deterministic output (same contract → same audit result)
  const requestOptions: any = {
    model: modelConfig.modelName,
    max_tokens: 4096,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  };

  // Only DeepSeek and Qwen support response_format: json_object
  if (modelConfig.modelName !== 'MiniMax-M3') {
    requestOptions.response_format = { type: 'json_object' };
  } else {
    // For MiniMax, instruct it more explicitly to return JSON
    prompt += '\n\n请务必只返回纯JSON，不要包含任何markdown标记、代码块或额外说明。';
    requestOptions.messages = [{ role: 'user', content: prompt }];
  }

  const response = await retryAiCall(async () => {
    return await client.chat.completions.create(requestOptions);
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('AI 返回内容为空');
  }

  try {
    const result = parseJsonFromAi(content) as Record<string, unknown>;
    const aiIssues = normalizeIssues(result.issues, 'ai');
    const allIssues = [...ruleIssues, ...aiIssues];
    const { riskScore, status, metrics } = calculateRiskScore(allIssues);
    const summary = String(result.summary || result.analysis || '审核完成。');
    const suggestions = Array.isArray(result.suggestions)
      ? result.suggestions.map((s) => String(s)).slice(0, 5)
      : allIssues.slice(0, 5).map((i) => i.suggestion).filter(Boolean);

    return {
      riskScore,
      issuesCount: metrics.totalIssues,
      status,
      analysis: buildAnalysisMarkdown(contract, summary, allIssues, fileContent),
      suggestions: suggestions.length > 0 ? suggestions : ['请手动检查合同条款'],
      issues: aiIssues,
      metrics,
      needHumanReviewCount: metrics.needHumanReviewCount,
    };
  } catch (parseError) {
    // Last resort: try to extract fields using regex
    console.error('JSON parse failed, trying regex fallback...');
    try {
      const riskMatch = content.match(/"riskScore"\s*:\s*(\d+)/);
      const statusMatch = content.match(/"status"\s*:\s*"(pass|warning|fail)"/);
      const suggestionsMatch = content.match(/"suggestions"\s*:\s*(\[[\s\S]*?\])/);

      if (riskMatch || statusMatch) {
        const { riskScore, status, metrics } = calculateRiskScore(ruleIssues);
        return {
          riskScore: ruleIssues.length > 0 ? riskScore : (riskMatch ? parseInt(riskMatch[1]) : 60),
          issuesCount: metrics.totalIssues,
          status: ruleIssues.length > 0 ? status : (statusMatch ? statusMatch[1] : 'warning') as 'pass' | 'warning' | 'fail',
          analysis: buildAnalysisMarkdown(contract, 'AI返回格式不完整，已保留基础规则检查结果。', ruleIssues, fileContent),
          suggestions: suggestionsMatch ? (() => { try { return JSON.parse(suggestionsMatch[1]); } catch { return ['请手动检查合同条款']; } })() : ['请手动检查合同条款'],
          issues: [],
          metrics,
          needHumanReviewCount: metrics.needHumanReviewCount,
        };
      }
    } catch { /* fall through to throw */ }
    console.error('JSON parse failed, raw content:', content.slice(0, 300));
    throw new Error('AI 返回的 JSON 格式无效');
  }
}

/**
 * Generate a text summary/overview of a contract.
 */
export async function generateSummary(
  contract: ContractInfo,
  summaryTemplate?: string,
  fileContent?: string,
): Promise<string> {
  const modelConfig = await getModelConfig();

  const client = new OpenAI({
    apiKey: modelConfig.apiKey,
    baseURL: modelConfig.baseURL,
    timeout: 60000,
    maxRetries: 0,
  });

  let prompt = '你是一个合同文件概况生成助手。请根据合同文件内容和合同信息，生成一份详细的文件概况。';

  if (summaryTemplate) {
    prompt += `\n\n请严格按照以下概况规则生成：\n\n${summaryTemplate}\n\n---\n\n`;
  }

  prompt += `\n合同名称：${contract.name}
甲方：${contract.partyA}
乙方：${contract.partyB}
合同类型：${contract.type}
合同金额：¥${(contract.amount / 10000).toFixed(2)}万
合同期限：${contract.startDate} 至 ${contract.endDate}

`;

  if (fileContent) {
    prompt += `以下是合同文件的内容，请基于此内容生成概况：\n\n${buildAuditFileContentForPrompt(fileContent, 30000)}\n\n---\n\n`;
  }

  prompt += `请根据以上合同文件内容，生成一份完整的文件概况（中文），包含以下内容：
1. 合同基本信息摘要（双方主体、合同类型、金额、期限）
2. 主要条款概述（核心权利义务、交付/服务内容、付款方式等）
3. 关键风险提示（需要关注的条款和潜在风险）
4. 合同整体评价

请以纯文本格式输出，不要使用JSON或Markdown标记。`;

  const response = await retryAiCall(async () => {
    return await client.chat.completions.create({
      model: modelConfig.modelName,
      max_tokens: 800,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });
  });

  const content = response.choices[0]?.message?.content;
  if (content) {
    return content.trim();
  }

  throw new Error('AI 概况生成返回格式异常');
}

/**
 * Extract contract information from file content using AI.
 */
export async function extractContractInfo(
  fileContent: string,
  contractType: string,
): Promise<ExtractedInfo> {
  const modelConfig = await getModelConfig();

  const client = new OpenAI({
    apiKey: modelConfig.apiKey,
    baseURL: modelConfig.baseURL,
    timeout: 60000,
    maxRetries: 0,
  });

  const prompt = `你是一个合同信息提取助手。请从以下合同文件内容中提取关键信息。

合同文件内容：
${buildAuditFileContentForPrompt(fileContent, 30000)}

请以JSON格式返回提取的信息，包含以下字段：
1. name: 合同名称（从文件内容中提取，如"采购合同"、"服务协议"等）
2. partyA: 甲方名称（合同中的甲方/委托方/采购方）
3. partyB: 乙方名称（合同中的乙方/受托方/供应方）
4. amount: 合同总金额（数字，单位为元，如果无法确定则填0）
5. amountExcludingTax: 不含税金额（数字，单位为元，如果文件中有明确说明则提取，否则不填）
6. taxRate: 税率（数字，如13表示13%，如果文件中有明确说明则提取，否则不填）
7. qualityDeposit: 质保金信息（如"5%"、"10万元"等，如果文件中有明确说明则提取，否则不填）
8. contractNo: 合同编号（如果文件中有明确的合同编号则提取，否则不填）
9. startDate: 合同开始日期（格式：YYYY-MM-DD，如果无法确定则填当前日期）
10. endDate: 合同结束日期（格式：YYYY-MM-DD，如果无法确定则填一年后的日期）
11. contractTerm: 合同期限描述（如"1年"、"3个月"等，如果文件中有明确说明则提取，否则不填）
12. insuranceInfo: 保险信息（如果文件中提到保险要求则提取，否则不填）
13. insuranceDate: 保险到期日期（格式：YYYY-MM-DD，如果文件中有明确说明则提取，否则不填）

注意：
- 合同类型为：${contractType}
- 必填字段：name, partyA, partyB, amount, startDate, endDate
- 可选字段如果文件中没有明确信息，可以不返回该字段或返回null
- 金额相关字段请提取数字，去掉"元"、"万元"等单位（如果是万元请转换为元）
- 只返回JSON，不要包含其他内容`;

  // Build request options with temperature=0 for deterministic output
  const extractOptions: any = {
    model: modelConfig.modelName,
    max_tokens: 2048,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  };

  // Only DeepSeek and Qwen support response_format: json_object
  if (modelConfig.modelName !== 'MiniMax-M3') {
    extractOptions.response_format = { type: 'json_object' };
  } else {
    const enhancedPrompt = prompt + '\n\n请务必只返回纯JSON，不要包含任何markdown标记、代码块或额外说明。';
    extractOptions.messages = [{ role: 'user', content: enhancedPrompt }];
  }

  const response = await retryAiCall(async () => {
    return await client.chat.completions.create(extractOptions);
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('AI 返回内容为空');
  }

  try {
    const result = parseJsonFromAi(content) as Record<string, any>;
    return {
      name: result.name || '未命名合同',
      partyA: result.partyA || '未识别',
      partyB: result.partyB || '未识别',
      amount: typeof result.amount === 'number' ? result.amount : (parseFloat(result.amount) || 0),
      amountExcludingTax: typeof result.amountExcludingTax === 'number' ? result.amountExcludingTax : (parseFloat(result.amountExcludingTax) || undefined),
      taxRate: typeof result.taxRate === 'number' ? result.taxRate : (parseFloat(result.taxRate) || undefined),
      qualityDeposit: result.qualityDeposit || undefined,
      contractNo: result.contractNo || undefined,
      startDate: result.startDate || new Date().toISOString().split('T')[0],
      endDate: result.endDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      contractTerm: result.contractTerm || undefined,
      insuranceInfo: result.insuranceInfo || undefined,
      insuranceDate: result.insuranceDate || undefined,
    };
  } catch (parseError) {
    throw new Error('AI 返回的 JSON 格式无效');
  }
}
