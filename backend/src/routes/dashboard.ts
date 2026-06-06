import { Router, Response } from 'express';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth.js';
import prisma from '../prisma.js';
import { toSnakeArray } from '../serializers.js';

const router = Router();

router.use(authenticateToken);

async function scopedWhere(req: AuthRequest) {
  const where: any = { isAuditDraft: false };
  if (req.role === 'clerk' || req.role === 'head') {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { department: true } });
    where.followDept = user?.department || '__NO_ACCESS__';
  }
  return where;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// GET /api/dashboard/stats
router.get('/stats', requireRole('head', 'admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const baseWhere = await scopedWhere(req);
  const activeWhere = { ...baseWhere, status: 'active' };
  const expiringWhere = { ...activeWhere, endDate: { gte: new Date().toISOString().slice(0, 10), lte: addDays(30) } };

  const [totalContracts, activeContracts, draftContracts, expiringSoon, expiringContracts, recentUploads, auditRows, auditPassed, auditFailed, auditPending] = await Promise.all([
    prisma.contract.count({ where: baseWhere }),
    prisma.contract.count({ where: activeWhere }),
    prisma.contract.count({ where: { ...baseWhere, status: 'draft' } }),
    prisma.contract.count({ where: expiringWhere }),
    prisma.contract.findMany({ where: activeWhere, orderBy: { endDate: 'asc' }, take: 5 }),
    prisma.upload.findMany({
      where: { contract: baseWhere },
      include: { contract: true },
      orderBy: { uploadedAt: 'desc' },
      take: 5,
    }),
    prisma.auditRecord.findMany({ where: { contract: baseWhere }, select: { riskScore: true } }),
    prisma.auditRecord.count({ where: { status: 'pass', contract: baseWhere } }),
    prisma.auditRecord.count({ where: { status: 'fail', contract: baseWhere } }),
    prisma.auditRecord.count({ where: { status: 'pending', contract: baseWhere } }),
  ]);

  const riskScore = auditRows.length
    ? Math.round(auditRows.reduce((sum, row) => sum + row.riskScore, 0) / auditRows.length)
    : 75;

  res.json({
    stats: { totalContracts, activeContracts, expiringSoon, draftContracts, riskScore },
    expiringContracts: toSnakeArray(expiringContracts),
    recentUploads: recentUploads.map((u) => ({
      id: u.id,
      name: u.originalName,
      uploadTime: timeAgo(u.uploadedAt),
      size: formatSize(u.size),
    })),
    auditStatus: { passed: auditPassed, failed: auditFailed, pending: auditPending },
  });
});

// GET /api/dashboard/statistics — full statistics for the statistics page
router.get('/statistics', requireRole('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const dateRange = (req.query.range as string) || 'year';
  const days = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : dateRange === 'quarter' ? 90 : 365;
  const baseWhere = await scopedWhere(req);
  const now = new Date();
  const currentStart = daysAgo(days);
  const previousStart = daysAgo(days * 2);

  const [contracts, currentCount, previousCount, auditRows] = await Promise.all([
    prisma.contract.findMany({ where: baseWhere, orderBy: { createdAt: 'desc' } }),
    prisma.contract.count({ where: { ...baseWhere, createdAt: { gte: currentStart } } }),
    prisma.contract.count({ where: { ...baseWhere, createdAt: { gte: previousStart, lt: currentStart } } }),
    prisma.auditRecord.findMany({ where: { contract: baseWhere } }),
  ]);

  const totalValue = contracts.reduce((sum, c) => sum + c.amount, 0);
  const durations = contracts
    .map((c) => (new Date(c.endDate).getTime() - new Date(c.startDate).getTime()) / 86400000 / 30)
    .filter((n) => Number.isFinite(n) && n > 0);
  const avgDuration = durations.length ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10 : 0;
  const monthlyGrowth = previousCount > 0 ? Math.round(((currentCount - previousCount) / previousCount) * 100) : currentCount > 0 ? 100 : 0;

  const monthlyData: number[] = [];
  const monthlyAmount: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const monthContracts = contracts.filter((c) => c.createdAt >= start && c.createdAt < end);
    monthlyData.push(monthContracts.length);
    monthlyAmount.push(monthContracts.reduce((sum, c) => sum + c.amount, 0));
  }

  const countBy = (key: 'type' | 'status' | 'riskLevel') => {
    const map = new Map<string, number>();
    for (const contract of contracts) {
      const value = contract[key] || '';
      map.set(value, (map.get(value) || 0) + 1);
    }
    return [...map.entries()].map(([value, count]) => key === 'riskLevel' ? { risk_level: value, count } : { [key]: value, count });
  };

  const deptMap = new Map<string, { follow_dept: string; count: number; total_amount: number }>();
  for (const contract of contracts) {
    if (!contract.followDept) continue;
    const item = deptMap.get(contract.followDept) || { follow_dept: contract.followDept, count: 0, total_amount: 0 };
    item.count += 1;
    item.total_amount += contract.amount;
    deptMap.set(contract.followDept, item);
  }

  const expiringCount = contracts.filter((c) => c.status === 'active' && c.endDate >= now.toISOString().slice(0, 10) && c.endDate <= addDays(days)).length;
  const auditStats = {
    passed: auditRows.filter((a) => a.status === 'pass').length,
    failed: auditRows.filter((a) => a.status === 'fail').length,
    warnings: auditRows.filter((a) => a.status === 'warning').length,
    total: auditRows.length,
  };

  res.json({
    totalValue,
    avgDuration,
    monthlyGrowth,
    totalCount: contracts.length,
    monthlyData,
    monthlyAmount,
    typeDistribution: countBy('type'),
    topContracts: contracts.slice().sort((a, b) => b.amount - a.amount).slice(0, 10).map((c) => ({ name: c.name, amount: c.amount, party: c.partyB })),
    statusDistribution: countBy('status'),
    riskDistribution: countBy('riskLevel'),
    deptStats: [...deptMap.values()].sort((a, b) => b.count - a.count),
    expiringCount,
    auditStats,
  });
});

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 30) return `${diffDay}天前`;
  return date.toLocaleDateString('zh-CN');
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default router;
