import OpenAI from 'openai';
import { getDb } from '../db.js';

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

interface ModelConfig {
  baseURL: string;
  modelName: string;
  apiKey: string;
}

/**
 * Read AI configuration from the database.
 */
function getModelConfig(): ModelConfig {
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

  const configs = db.prepare('SELECT key, value FROM ai_config').all() as { key: string; value: string }[];
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
): Promise<AnalysisResult> {
  const modelConfig = getModelConfig();

  const client = new OpenAI({
    apiKey: modelConfig.apiKey,
    baseURL: modelConfig.baseURL,
    timeout: 120000,
    maxRetries: 0, // we handle retry ourselves
  });

  // Build prompt: include MD template if provided, then contract info + analysis instructions
  let prompt = '你是一个专业的合同审核AI助手。';

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
    prompt += `以下是合同文件的具体内容，请基于此内容结合审核规则进行详细审核：\n\n${fileContent.slice(0, 4000)}\n\n---\n\n`;
  }

  prompt += `请以JSON格式返回分析结果，包含以下字段：
1. riskScore: 风险评分（0-100，越高越安全）
2. issuesCount: 发现的问题数量
3. status: "pass"（通过，≥70分）、"warning"（警告，50-69分）或"fail"（未通过，<50分）
4. analysis: 详细分析报告（中文，200-300字），请引用合同具体条款进行分析
5. suggestions: 改进建议数组（3-5条具体建议）

请只返回JSON，不要包含其他内容。`;

  // Build request options - some models (MiniMax) don't support response_format
  const requestOptions: any = {
    model: modelConfig.modelName,
    max_tokens: 2048,
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

  // Try to extract JSON from the response
  let jsonStr = content.trim();

  // Remove think tags (MiniMax-M3 adds <think> reasoning blocks)
  jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  // Try to extract JSON from markdown code blocks
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Try to find a JSON object directly (starts with { and ends with })
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    jsonStr = objectMatch[0];
  }

  try {
    const result = JSON.parse(jsonStr);
    return {
      riskScore: result.riskScore ?? 60,
      issuesCount: result.issuesCount ?? 0,
      status: result.status ?? 'warning',
      analysis: result.analysis ?? '分析完成。',
      suggestions: result.suggestions ?? ['请手动检查合同条款'],
    };
  } catch (parseError) {
    console.error('JSON parse failed, raw content:', jsonStr.slice(0, 300));
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
  const modelConfig = getModelConfig();

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
    prompt += `以下是合同文件的内容，请基于此内容生成概况：\n\n${fileContent.slice(0, 4000)}\n\n---\n\n`;
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
  const modelConfig = getModelConfig();

  const client = new OpenAI({
    apiKey: modelConfig.apiKey,
    baseURL: modelConfig.baseURL,
    timeout: 60000,
    maxRetries: 0,
  });

  const prompt = `你是一个合同信息提取助手。请从以下合同文件内容中提取关键信息。

合同文件内容：
${fileContent.slice(0, 8000)}

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

  // Build request options
  const extractOptions: any = {
    model: modelConfig.modelName,
    max_tokens: 2048,
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

  // Try to extract JSON from the response
  let jsonStr = content.trim();

  // Remove think tags (MiniMax-M3 adds <think> reasoning blocks)
  jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  // Try to extract JSON from markdown code blocks
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Try to find a JSON object directly
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    jsonStr = objectMatch[0];
  }

  try {
    const result = JSON.parse(jsonStr);
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
