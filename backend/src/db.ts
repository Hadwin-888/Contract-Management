import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.VITEST
  ? ':memory:'
  : path.join(__dirname, '..', 'data', 'contracts.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables() {
  if (!db) return;

  // Check if role column exists (for migration safety)
  const userColumns = db.prepare("PRAGMA table_info('users')").all() as { name: string }[];
  const hasRole = userColumns.some((c) => c.name === 'role');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      department TEXT,
      department_code TEXT,
      role TEXT NOT NULL DEFAULT 'clerk' CHECK(role IN ('clerk','head','admin','super_admin')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      party_a TEXT NOT NULL,
      party_b TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('active','expired','draft','terminated')),
      amount REAL NOT NULL DEFAULT 0,
      amount_excluding_tax REAL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      quality_deposit TEXT DEFAULT '',
      contract_no TEXT DEFAULT '',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      contract_term TEXT DEFAULT '',
      risk_level TEXT NOT NULL DEFAULT 'low' CHECK(risk_level IN ('low','medium','high')),
      insurance_info TEXT DEFAULT '',
      insurance_date TEXT DEFAULT '',
      file_path TEXT,
      insurance_file_path TEXT,
      is_audit_draft INTEGER NOT NULL DEFAULT 0,
      follow_dept TEXT DEFAULT '',
      cost_dept TEXT DEFAULT '',
      cost_code TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      user_id TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_records (
      id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL,
      risk_score INTEGER NOT NULL DEFAULT 0,
      issues_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pass','warning','fail','pending')),
      analysis TEXT,
      suggestions TEXT,
      summary TEXT DEFAULT '',
      template_id TEXT,
      template_version INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      contract_id TEXT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      uploaded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL,
      contract_name TEXT NOT NULL,
      days_remaining INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('expiration','review','renewal')),
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_templates (
      id TEXT PRIMARY KEY,
      contract_type TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      summary_content TEXT DEFAULT '',
      version INTEGER NOT NULL DEFAULT 1,
      updated_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      short_name TEXT NOT NULL,
      name TEXT NOT NULL,
      head_name TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS storage_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migration: add role column if it doesn't exist (for existing DBs)
  if (!hasRole) {
    try {
      db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'clerk' CHECK(role IN ('clerk','head','admin','super_admin'))");
    } catch {
      // Column may already exist
    }
  }

  // Migration: add summary_content to audit_templates if not exists
  try {
    const templateColumns = db.prepare("PRAGMA table_info('audit_templates')").all() as { name: string }[];
    if (!templateColumns.some((c) => c.name === 'summary_content')) {
      db.exec("ALTER TABLE audit_templates ADD COLUMN summary_content TEXT DEFAULT ''");
    }
  } catch {
    // ignore
  }

  // Migration: add summary to audit_records if not exists
  try {
    const recordColumns = db.prepare("PRAGMA table_info('audit_records')").all() as { name: string }[];
    if (!recordColumns.some((c) => c.name === 'summary')) {
      db.exec("ALTER TABLE audit_records ADD COLUMN summary TEXT DEFAULT ''");
    }
  } catch {
    // ignore
  }

  // Migration: add new columns to contracts table
  const contractColumns = db.prepare("PRAGMA table_info('contracts')").all() as { name: string }[];
  const contractMigrations: { col: string; def: string }[] = [
    { col: 'contract_no', def: "TEXT DEFAULT ''" },
    { col: 'amount_excluding_tax', def: 'REAL DEFAULT 0' },
    { col: 'tax_rate', def: 'REAL DEFAULT 0' },
    { col: 'quality_deposit', def: "TEXT DEFAULT ''" },
    { col: 'contract_term', def: "TEXT DEFAULT ''" },
    { col: 'insurance_info', def: "TEXT DEFAULT ''" },
    { col: 'insurance_date', def: "TEXT DEFAULT ''" },
    { col: 'insurance_file_path', def: "TEXT DEFAULT ''" },
    { col: 'follow_dept', def: "TEXT DEFAULT ''" },
    { col: 'cost_dept', def: "TEXT DEFAULT ''" },
    { col: 'cost_code', def: "TEXT DEFAULT ''" },
    { col: 'is_audit_draft', def: 'INTEGER NOT NULL DEFAULT 0' },
  ];
  for (const m of contractMigrations) {
    if (!contractColumns.some((c) => c.name === m.col)) {
      try {
        db.exec(`ALTER TABLE contracts ADD COLUMN ${m.col} ${m.def}`);
      } catch {
        // ignore
      }
    }
  }

  // Seed default admin user if not exists
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin') as { id: string } | undefined;
  if (!existingUser) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(
      'INSERT INTO users (id, username, password_hash, name, email, department, department_code, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(uuidv4(), 'admin', hash, '管理员', 'admin@example.com', '管理部', 'MGMT', 'super_admin');
  } else {
    // Ensure admin has super_admin role
    db.prepare("UPDATE users SET role = 'super_admin' WHERE username = 'admin' AND role = 'clerk'").run();
  }

  // Seed default audit templates if none exist
  const templateCount = (db.prepare('SELECT COUNT(*) as count FROM audit_templates').get() as { count: number }).count;
  if (templateCount === 0) {
    seedDefaultTemplates();
  }
}

function seedDefaultTemplates() {
  if (!db) return;
  const admin = db.prepare("SELECT id FROM users WHERE username = 'admin'").get() as { id: string } | undefined;
  const adminId = admin?.id || '';

  const templates: { type: string; name: string; content: string }[] = [
    {
      type: '采购',
      name: '采购合同审核规则',
      content: `# 采购合同审核规则

## 1. 价格条款审核
- 检查合同金额是否与市场行情相符
- 确认是否有价格调整机制
- 检查付款方式和账期是否合理
- 确认是否有最低采购量或独家供货条款

## 2. 交付条款审核
- 确认交货期限、地点、方式是否明确
- 检查验收标准和流程
- 确认运输责任和风险转移节点
- 检查延迟交付的违约责任

## 3. 质量保证
- 检查质量标准和验收条件
- 确认质保期限和范围
- 检查售后服务条款
- 确认不合格品的处理流程

## 4. 法律合规
- 确认合同适用法律
- 检查争议解决条款的明确性
- 确认知识产权归属
- 检查保密条款的完整性`,
    },
    {
      type: '服务',
      name: '服务合同审核规则',
      content: `# 服务合同审核规则

## 1. 服务范围审核
- 确认服务内容、范围和标准是否明确
- 检查服务级别协议（SLA）的具体指标
- 确认服务交付物和验收标准

## 2. 费用条款审核
- 检查服务费用计算方式是否合理
- 确认付款节点和条件
- 检查是否有隐性收费

## 3. 履约管理
- 确认服务期限和续约机制
- 检查双方的权利义务
- 确认服务变更管理流程
- 检查服务终止条件和善后义务

## 4. 风险控制
- 检查数据安全和隐私保护条款
- 确认保密义务的存续期限
- 检查知识产权归属
- 确认违约责任和赔偿限额`,
    },
    {
      type: '租赁',
      name: '租赁合同审核规则',
      content: `# 租赁合同审核规则

## 1. 租赁标的审核
- 确认租赁物描述是否清晰准确
- 检查租赁物的权属证明
- 确认租赁物的使用范围和限制

## 2. 租金条款审核
- 检查租金计算方式和支付周期
- 确认押金金额和退还条件
- 检查租金调整机制
- 确认物业费、水电费等附加费用承担

## 3. 期限条款
- 确认租赁起止日期
- 检查续租条件和流程
- 确认提前解约的条件和违约金
- 检查到期后的清退义务

## 4. 维护责任
- 确认维修责任划分
- 检查装修和改造的审批要求
- 确认保险责任`,
    },
    {
      type: '营销',
      name: '营销合同审核规则',
      content: `# 营销合同审核规则

## 1. 服务内容审核
- 确认营销服务的具体内容和范围
- 检查交付物清单和交付时间表
- 确认效果评估标准和KPI指标

## 2. 费用条款
- 检查服务费用和付款方式
- 确认是否有效果付费机制
- 检查额外费用的承担方式

## 3. 知识产权
- 确认营销素材的版权归属
- 检查肖像权和商标使用授权
- 确认合同终止后素材的使用权

## 4. 合规审查
- 检查广告内容的合规性责任
- 确认数据使用和隐私保护
- 检查竞业限制条款`,
    },
    {
      type: '技术',
      name: '技术合同审核规则',
      content: `# 技术合同审核规则

## 1. 技术范围审核
- 确认技术交付物和功能规格
- 检查技术标准和兼容性要求
- 确认开发周期和里程碑

## 2. 知识产权
- 确认技术成果的归属（背景IP和前景IP）
- 检查技术许可的范围和期限
- 确认源代码的交付和托管条件

## 3. 交付验收
- 检查验收标准和测试方案
- 确认验收流程和周期
- 检查验收不合格的处理机制
- 确认质保期和维护服务

## 4. 保密与安全
- 确认技术保密义务
- 检查数据安全保护措施
- 确认漏洞修复和安全更新责任`,
    },
    {
      type: '咨询',
      name: '咨询合同审核规则',
      content: `# 咨询合同审核规则

## 1. 服务范围
- 确认咨询服务的具体目标和范围
- 检查交付物清单和形式
- 确认项目时间表和关键节点

## 2. 费用条款
- 检查咨询费用的计算方式
- 确认费用包含的项目和额外费用
- 检查差旅费等杂费的承担方

## 3. 成果归属
- 确认咨询报告的版权归属
- 检查保密信息的使用限制
- 确认是否允许引用咨询成果

## 4. 责任条款
- 检查咨询建议的免责声明
- 确认专业责任保险要求
- 检查争议解决机制`,
    },
    {
      type: '人力资源',
      name: '人力资源合同审核规则',
      content: `# 人力资源合同审核规则

## 1. 服务范围
- 确认人力资源服务的具体内容
- 检查服务人员的资质要求
- 确认服务人员的替换机制

## 2. 费用条款
- 检查服务费用的构成
- 确认社保、公积金的缴纳责任
- 检查加班费和补贴的计算方式

## 3. 用工风险
- 确认用工关系的法律性质
- 检查工伤和意外的责任承担
- 确认保密和竞业限制条款
- 检查合同终止的善后义务

## 4. 合规审查
- 确认符合劳动法律法规
- 检查个人信息保护措施
- 确认劳动合同法的合规性`,
    },
    {
      type: '物流',
      name: '物流合同审核规则',
      content: `# 物流合同审核规则

## 1. 服务范围
- 确认物流服务的具体范围和路线
- 检查运输方式和时效要求
- 确认仓储服务的内容和标准

## 2. 费用条款
- 检查运价计算方式和调整机制
- 确认燃油附加费等浮动费用的计算
- 检查结算周期和付款条件

## 3. 风险责任
- 确认货物损毁、丢失的赔偿责任
- 检查保险要求和理赔流程
- 确认不可抗力条款的适用
- 检查延迟交付的违约责任

## 4. 运营管理
- 确认货物跟踪和信息反馈要求
- 检查KPI考核标准
- 确认服务终止的过渡期安排`,
    },
  ];

  const insert = db.prepare(`
    INSERT INTO audit_templates (id, contract_type, name, content, version, updated_by)
    VALUES (?, ?, ?, ?, 1, ?)
  `);

  for (const t of templates) {
    insert.run(uuidv4(), t.type, t.name, t.content, adminId);
  }
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

export function resetDb() {
  closeDb();
  if (dbPath !== ':memory:') {
    try {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
      if (fs.existsSync(dbPath + '-wal')) {
        fs.unlinkSync(dbPath + '-wal');
      }
      if (fs.existsSync(dbPath + '-shm')) {
        fs.unlinkSync(dbPath + '-shm');
      }
    } catch {
      // ignore
    }
  }
}
