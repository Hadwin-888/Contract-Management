import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';

const DEV_FALLBACK_SECRET = 'contract-mgmt-dev-secret-key-2024';
const JWT_SECRET = process.env.JWT_SECRET || DEV_FALLBACK_SECRET;

if (process.env.NODE_ENV === 'production' && JWT_SECRET === DEV_FALLBACK_SECRET) {
  throw new Error('JWT_SECRET must be set in production environment');
}
if (JWT_SECRET === DEV_FALLBACK_SECRET) {
  console.warn('⚠️  Using dev JWT_SECRET fallback. Set JWT_SECRET in .env for any non-local use.');
}

export type Role = 'clerk' | 'head' | 'admin' | 'super_admin';

export interface AuthRequest extends Request {
  userId?: string;
  username?: string;
  role?: Role;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: '未提供认证令牌' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string; role: Role };
    req.userId = decoded.userId;
    req.username = decoded.username;
    req.role = decoded.role;
    next();
  } catch {
    res.status(403).json({ error: '令牌无效或已过期' });
  }
}

/**
 * Middleware factory: require the user to have one of the specified roles.
 */
export function requireRole(...allowedRoles: Role[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.role) {
      res.status(403).json({ error: '无权限访问' });
      return;
    }
    if (!allowedRoles.includes(req.role)) {
      const requiredPermission = inferRequiredPermission(req);
      if (!requiredPermission || !req.userId || !(await userHasCustomPermission(req.userId, requiredPermission))) {
        res.status(403).json({ error: '权限不足，需要 ' + allowedRoles.join(' / ') + ' 角色' });
        return;
      }
    }
    next();
  };
}

export function hasRole(req: AuthRequest, ...allowedRoles: Role[]): boolean {
  return !!req.role && allowedRoles.includes(req.role);
}

export function generateToken(userId: string, username: string, role: Role = 'clerk'): string {
  return jwt.sign({ userId, username, role }, JWT_SECRET, { expiresIn: '7d' });
}

function inferRequiredPermission(req: AuthRequest): { module: string; action: string } | null {
  const baseUrl = req.baseUrl || '';
  const method = req.method.toUpperCase();
  const path = req.path || '';

  if (baseUrl === '/api/contracts') {
    if (method === 'GET' && path === '/export') return { module: 'contracts', action: 'export' };
    if (method === 'GET') return { module: 'contracts', action: 'view' };
    if (method === 'POST') return { module: 'contracts', action: 'create' };
    if (method === 'PUT') return { module: 'contracts', action: 'edit' };
    if (method === 'DELETE') return { module: 'contracts', action: 'delete' };
  }
  if (baseUrl === '/api/projects') {
    if (method === 'GET') return { module: 'projects', action: 'view' };
    if (method === 'POST' && path.includes('/submit-completion')) return { module: 'projects', action: 'submit_completion' };
    if (method === 'POST' && path.includes('/files')) return { module: 'projects', action: 'manage_files' };
    if (method === 'DELETE' && path.includes('/files')) return { module: 'projects', action: 'manage_files' };
    if (path.includes('/members') || path.includes('/owner')) return { module: 'projects', action: 'manage_members' };
    if (method === 'POST') return { module: 'projects', action: 'create' };
    if (method === 'PUT') return { module: 'projects', action: 'edit' };
    if (method === 'DELETE') return { module: 'projects', action: 'delete' };
  }
  if (baseUrl === '/api/dashboard') {
    return path.includes('statistics')
      ? { module: 'statistics', action: 'view' }
      : { module: 'dashboard', action: 'view' };
  }
  if (baseUrl === '/api/audit') {
    if (method === 'DELETE') return { module: 'audit', action: 'clear' };
    return { module: 'audit', action: 'view' };
  }
  if (baseUrl === '/api/templates' || baseUrl === '/api/ai-config') {
    return { module: 'settings', action: 'manage_audit_config' };
  }
  if (baseUrl === '/api/users') return { module: 'settings', action: 'manage_users' };
  if (baseUrl === '/api/settings/roles' || baseUrl === '/api/settings/permissions') {
    return { module: 'settings', action: 'manage_roles' };
  }
  if (baseUrl === '/api/departments') return { module: 'settings', action: 'manage_departments' };
  if (baseUrl === '/api/storage-config') return { module: 'settings', action: 'manage_storage' };
  if (baseUrl === '/api/approvals/flows') return { module: 'settings', action: 'manage_approval_flows' };
  if (baseUrl === '/api/procurement/requests' || baseUrl === '/api/procurement/suppliers' || baseUrl === '/api/procurement/purchase-orders') {
    if (method === 'GET') return { module: 'procurement', action: 'view' };
    if (method === 'POST') return { module: 'procurement', action: 'create' };
    if (method === 'PUT') return { module: 'procurement', action: 'edit' };
    if (method === 'DELETE') return { module: 'procurement', action: 'delete' };
  }
  if (baseUrl === '/api/approvals') {
    return method === 'GET'
      ? { module: 'approvals', action: 'view' }
      : { module: 'approvals', action: 'approve' };
  }

  return null;
}

async function userHasCustomPermission(userId: string, required: { module: string; action: string }) {
  if (!(prisma as any).permission?.findUnique) return false;

  try {
    const permission = await prisma.permission.findUnique({
      where: { module_action: { module: required.module, action: required.action } },
      include: {
        rolePermissions: {
          where: {
            role: {
              userRoles: {
                some: { userId },
              },
            },
          },
          select: { id: true },
          take: 1,
        },
      },
    });

    return !!permission?.rolePermissions.length;
  } catch {
    return false;
  }
}
