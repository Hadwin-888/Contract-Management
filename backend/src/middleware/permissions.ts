import type { AuthRequest, Role } from './auth.js';
import prisma from '../prisma.js';
import { toSnakeRecord } from '../serializers.js';

/**
 * Build the department-restriction SQL snippet and params for clerk/head roles.
 * Returns { clause: string, params: unknown[] } — append to WHERE and pass to query.
 */
export async function buildDeptFilter(req: AuthRequest): Promise<{ clause: string; params: unknown[] }> {
  if (req.role !== 'clerk' && req.role !== 'head') {
    return { clause: '', params: [] };
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { department: true } });
  if (user?.department) {
    return { clause: ' AND follow_dept = ?', params: [user.department] };
  }
  return { clause: ' AND 1=0', params: [] }; // no department → no access
}

/**
 * Check whether the current user can access a given contract.
 * admin/super_admin can access all; clerk/head can only access their own department's.
 */
export async function canAccessContract(req: AuthRequest, contract: Record<string, unknown>): Promise<boolean> {
  if (req.role === 'admin' || req.role === 'super_admin') return true;
  if (req.role === 'clerk' || req.role === 'head') {
    const dept = contract.follow_dept as string | undefined;
    if (!dept) return false;
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { department: true } });
    return user?.department === dept;
  }
  return false;
}

/**
 * Fetch a contract by id, check access, return contract or respond with error.
 * Returns the contract if accessible, or null if not found / forbidden (response already sent).
 */
export async function requireContractAccess(req: AuthRequest, res: any, contractId: string): Promise<Record<string, unknown> | null> {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) {
    res.status(404).json({ error: '合同不存在' });
    return null;
  }
  const snakeContract = toSnakeRecord(contract) as Record<string, unknown>;
  if (!(await canAccessContract(req, snakeContract))) {
    res.status(403).json({ error: '无权访问该合同' });
    return null;
  }
  return snakeContract;
}
