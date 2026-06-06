type AnyRecord = Record<string, any>;

const FIELD_MAP: Record<string, string> = {
  passwordHash: 'password_hash',
  departmentCode: 'department_code',
  isActive: 'is_active',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  shortName: 'short_name',
  headName: 'head_name',
  partyA: 'party_a',
  partyB: 'party_b',
  amountExcludingTax: 'amount_excluding_tax',
  taxRate: 'tax_rate',
  qualityDeposit: 'quality_deposit',
  contractNo: 'contract_no',
  startDate: 'start_date',
  endDate: 'end_date',
  contractTerm: 'contract_term',
  riskLevel: 'risk_level',
  insuranceInfo: 'insurance_info',
  insuranceDate: 'insurance_date',
  filePath: 'file_path',
  insuranceFilePath: 'insurance_file_path',
  isAuditDraft: 'is_audit_draft',
  followDept: 'follow_dept',
  costDept: 'cost_dept',
  costCode: 'cost_code',
  userId: 'user_id',
  contractId: 'contract_id',
  originalName: 'original_name',
  mimeType: 'mime_type',
  uploadedAt: 'uploaded_at',
  contractName: 'contract_name',
  daysRemaining: 'days_remaining',
  riskScore: 'risk_score',
  issuesCount: 'issues_count',
  templateId: 'template_id',
  templateVersion: 'template_version',
  templateContentSnapshot: 'template_content_snapshot',
  contractType: 'contract_type',
  extractedFields: 'extracted_fields',
  ruleIssues: 'rule_issues',
  aiIssues: 'ai_issues',
  reviewedIssues: 'reviewed_issues',
  needHumanReviewCount: 'need_human_review_count',
  auditVersion: 'audit_version',
  reviewedBy: 'reviewed_by',
  summaryContent: 'summary_content',
  updatedBy: 'updated_by',
};

export function toSnakeRecord<T extends AnyRecord | null | undefined>(record: T): AnyRecord | T {
  if (!record || typeof record !== 'object') return record;
  const out: AnyRecord = {};
  for (const [key, value] of Object.entries(record)) {
    if (value instanceof Date) {
      out[FIELD_MAP[key] || key] = value.toISOString();
    } else if (Array.isArray(value)) {
      out[FIELD_MAP[key] || key] = value.map((item) => toSnakeRecord(item));
    } else if (value && typeof value === 'object') {
      out[FIELD_MAP[key] || key] = toSnakeRecord(value as AnyRecord);
    } else {
      out[FIELD_MAP[key] || key] = value;
    }
  }
  return out;
}

export function toSnakeArray<T extends AnyRecord>(records: T[]): AnyRecord[] {
  return records.map((record) => toSnakeRecord(record) as AnyRecord);
}

export function parseBool(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

