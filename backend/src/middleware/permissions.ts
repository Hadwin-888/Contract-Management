import { getDb } from '../db.js';
import type { AuthRequest, Role } from './auth.js';

/**
 * Build the department-restriction SQL snippet and params for clerk/head roles.
 * Returns { clause: string, params: unknown[] } — append to WHERE and pass to query.
 */
export function buildDeptFilter(req: AuthRequest): { clause: string; params: unknown[] } {
  if (req.role !== 'clerk' && req.role !== 'head') {
    return { clause: '', params: [] };
  }
  const db = getDb();
  const user = db.prepare('SELECT department FROM users WHERE id = ?').get(req.userId) as { department: string } | undefined;
  if (user?.department) {
    return { clause: ' AND follow_dept = ?', params: [user.department] };
  }
  return { clause: ' AND 1=0', params: [] }; // no department → no access
}

/**
 * Check whether the current user can access a given contract.
 * admin/super_admin can access all; clerk/head can only access their own department's.
 */
export function canAccessContract(req: AuthRequest, contract: Record<string, unknown>): boolean {
  if (req.role === 'admin' || req.role === 'super_admin') return true;
  if (req.role === 'clerk' || req.role === 'head') {
    const dept = contract.follow_dept as string | undefined;
    if (!dept) return false;
    const db = getDb();
    const user = db.prepare('SELECT department FROM users WHERE id = ?').get(req.userId) as { department: string } | undefined;
    return user?.department === dept;
  }
  return false;
}

/**
 * Fetch a contract by id, check access, return contract or respond with error.
 * Returns the contract if accessible, or null if not found / forbidden (response already sent).
 */
export function requireContractAccess(req: AuthRequest, res: any, contractId: string): Record<string, unknown> | null {
  const db = getDb();
  const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(contractId) as Record<string, unknown> | undefined;
  if (!contract) {
    res.status(404).json({ error: '合同不存在' });
    return null;
  }
  if (!canAccessContract(req, contract)) {
    res.status(403).json({ error: '无权访问该合同' });
    return null;
  }
  return contract;
}
