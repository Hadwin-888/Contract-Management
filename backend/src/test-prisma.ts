import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

type Row = Record<string, any>;

const state = {
  users: [] as Row[],
  contracts: [] as Row[],
  auditTemplates: [] as Row[],
  uploads: [] as Row[],
  auditRecords: [] as Row[],
  departments: [] as Row[],
  storageConfig: [] as Row[],
  aiConfig: [] as Row[],
};

function clone<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function now() {
  return new Date();
}

function orderRows(rows: Row[], orderBy?: Row) {
  if (!orderBy) return rows;
  const [key, dir] = Object.entries(orderBy)[0] || [];
  if (!key) return rows;
  return rows.slice().sort((a, b) => {
    const av = a[key] instanceof Date ? a[key].getTime() : a[key];
    const bv = b[key] instanceof Date ? b[key].getTime() : b[key];
    if (av === bv) return 0;
    return (av > bv ? 1 : -1) * (dir === 'desc' ? -1 : 1);
  });
}

function matchWhere(row: Row, where?: Row): boolean {
  if (!where) return true;
  for (const [key, expected] of Object.entries(where)) {
    if (key === 'OR') {
      if (!(expected as Row[]).some((part) => matchWhere(row, part))) return false;
      continue;
    }
    if (key === 'contract') {
      const contract = state.contracts.find((c) => c.id === row.contractId);
      if (!contract || !matchWhere(contract, expected as Row)) return false;
      continue;
    }
    if (expected && typeof expected === 'object' && !Array.isArray(expected) && !(expected instanceof Date)) {
      if ('contains' in expected) {
        const haystack = String(row[key] || '').toLowerCase();
        const needle = String((expected as Row).contains || '').toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if ('gte' in expected && row[key] < (expected as Row).gte) return false;
      if ('lte' in expected && row[key] > (expected as Row).lte) return false;
      if ('lt' in expected && row[key] >= (expected as Row).lt) return false;
      continue;
    }
    if (row[key] !== expected) return false;
  }
  return true;
}

function pickSelect(row: Row, select?: Row) {
  if (!select) return row;
  const out: Row = {};
  for (const key of Object.keys(select)) {
    if (select[key]) out[key] = row[key];
  }
  return out;
}

function attachIncludes(row: Row, include?: Row) {
  const out = { ...row };
  if (include?.updater) {
    const user = state.users.find((u) => u.id === row.updatedBy);
    out.updater = user ? pickSelect(user, include.updater.select) : null;
  }
  if (include?.contract) {
    const contract = state.contracts.find((c) => c.id === row.contractId);
    out.contract = contract ? pickSelect(contract, include.contract.select) : null;
  }
  return out;
}

function collection(name: keyof typeof state, uniqueKeys: string[] = ['id']) {
  const rows = () => state[name];
  const findByWhere = (where: Row) => rows().find((row) => Object.entries(where).every(([k, v]) => row[k] === v));
  return {
    findUnique: async ({ where, select, include }: Row) => {
      const row = findByWhere(where);
      return row ? clone(attachIncludes(pickSelect(row, select), include)) : null;
    },
    findFirst: async ({ where, select, include }: Row = {}) => {
      const row = rows().find((item) => matchWhere(item, where));
      return row ? clone(attachIncludes(pickSelect(row, select), include)) : null;
    },
    findMany: async ({ where, orderBy, skip = 0, take, select, include }: Row = {}) => {
      let result = rows().filter((row) => matchWhere(row, where));
      result = orderRows(result, orderBy);
      if (skip) result = result.slice(skip);
      if (take !== undefined) result = result.slice(0, take);
      return clone(result.map((row) => attachIncludes(pickSelect(row, select), include)));
    },
    count: async ({ where }: Row = {}) => rows().filter((row) => matchWhere(row, where)).length,
    create: async ({ data, include }: Row) => {
      const row = { id: uuidv4(), createdAt: now(), updatedAt: now(), ...data };
      rows().push(row);
      return clone(attachIncludes(row, include));
    },
    update: async ({ where, data, include }: Row) => {
      const row = findByWhere(where);
      if (!row) throw new Error(`${String(name)} not found`);
      Object.assign(row, data, { updatedAt: now() });
      return clone(attachIncludes(row, include));
    },
    delete: async ({ where }: Row) => {
      const index = rows().findIndex((row) => Object.entries(where).every(([k, v]) => row[k] === v));
      if (index < 0) throw new Error(`${String(name)} not found`);
      const [deleted] = rows().splice(index, 1);
      return clone(deleted);
    },
    deleteMany: async ({ where }: Row = {}) => {
      const before = rows().length;
      state[name] = rows().filter((row) => !matchWhere(row, where)) as any;
      return { count: before - state[name].length };
    },
    upsert: async ({ where, update, create }: Row) => {
      const row = findByWhere(where);
      if (row) {
        Object.assign(row, update, { updatedAt: now() });
        return clone(row);
      }
      const created = { id: uuidv4(), createdAt: now(), updatedAt: now(), ...create };
      rows().push(created);
      return clone(created);
    },
  };
}

export function resetTestPrisma() {
  for (const key of Object.keys(state) as (keyof typeof state)[]) {
    state[key] = [] as any;
  }
  const adminId = uuidv4();
  state.users.push({
    id: adminId,
    username: 'admin',
    passwordHash: bcrypt.hashSync('admin123', 10),
    name: '管理员',
    email: 'admin@example.com',
    department: '管理部',
    departmentCode: 'MGMT',
    role: 'super_admin',
    isActive: true,
    createdAt: now(),
  });
  for (const type of ['采购', '服务', '租赁', '营销', '技术', '咨询', '人力资源', '物流']) {
    state.auditTemplates.push({
      id: uuidv4(),
      contractType: type,
      name: `${type}合同审核规则`,
      content: `# ${type}合同审核规则`,
      summaryContent: '',
      version: 1,
      updatedBy: adminId,
      createdAt: now(),
      updatedAt: now(),
    });
  }
}

export function createTestPrisma() {
  resetTestPrisma();
  return {
    user: collection('users', ['id', 'username']),
    contract: collection('contracts'),
    auditTemplate: collection('auditTemplates', ['id', 'contractType']),
    upload: collection('uploads'),
    auditRecord: collection('auditRecords'),
    department: collection('departments', ['id', 'code']),
    storageConfig: collection('storageConfig', ['key']),
    aiConfig: collection('aiConfig', ['key']),
    $transaction: async (items: Promise<any>[]) => Promise.all(items),
    $disconnect: async () => undefined,
  };
}

