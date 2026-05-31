import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.role) {
      res.status(403).json({ error: '无权限访问' });
      return;
    }
    if (!allowedRoles.includes(req.role)) {
      res.status(403).json({ error: '权限不足，需要 ' + allowedRoles.join(' / ') + ' 角色' });
      return;
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
