import { Router, Response } from 'express';
import { getDb } from '../db.js';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth.js';
import { buildDeptFilter } from '../middleware/permissions.js';

const router = Router();

router.use(authenticateToken);

// GET /api/dashboard/stats
router.get('/stats', requireRole('head', 'admin', 'super_admin'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const deptFilter = buildDeptFilter(req);
  const joinedDeptClause = deptFilter.clause.replace('follow_dept', 'c.follow_dept');
  const activeWhere = `WHERE is_audit_draft = 0${deptFilter.clause}`;
  const statusWhere = (status: string) => `WHERE is_audit_draft = 0 AND status = '${status}'${deptFilter.clause}`;

  const totalContracts = (db.prepare(`SELECT COUNT(*) as count FROM contracts ${activeWhere}`).get(...deptFilter.params) as { count: number }).count;
  const activeContracts = (db.prepare(`SELECT COUNT(*) as count FROM contracts ${statusWhere('active')}`).get(...deptFilter.params) as { count: number }).count;
  const draftContracts = (db.prepare(`SELECT COUNT(*) as count FROM contracts ${statusWhere('draft')}`).get(...deptFilter.params) as { count: number }).count;

  // Expiring within 30 days
  const expiringSoon = db.prepare(`
    SELECT COUNT(*) as count FROM contracts
    WHERE is_audit_draft = 0
    AND status = 'active'
    AND end_date BETWEEN date('now') AND date('now', '+30 days')
    ${deptFilter.clause}
  `).get(...deptFilter.params) as { count: number };

  // Average risk score from audit records
  const avgRisk = db.prepare(`
    SELECT AVG(a.risk_score) as avg
    FROM audit_records a
    JOIN contracts c ON a.contract_id = c.id
    WHERE c.is_audit_draft = 0${joinedDeptClause}
  `).get(...deptFilter.params) as { avg: number | null };
  const riskScore = avgRisk.avg ? Math.round(avgRisk.avg) : 75;

  // Expiring contracts list (next 5)
  const expiringContracts = db.prepare(`
    SELECT * FROM contracts
    WHERE is_audit_draft = 0
    AND status = 'active'
    ${deptFilter.clause}
    ORDER BY end_date ASC
    LIMIT 5
  `).all(...deptFilter.params);

  // Recent uploads (last 5)
  const recentUploads = (db.prepare(`
    SELECT u.id, u.original_name as name, u.uploaded_at, u.size
    FROM uploads u
    JOIN contracts c ON u.contract_id = c.id
    WHERE c.is_audit_draft = 0${joinedDeptClause}
    ORDER BY u.uploaded_at DESC
    LIMIT 5
  `).all(...deptFilter.params) as { id: string; name: string; uploaded_at: string; size: number }[]).map((u) => ({
    id: u.id,
    name: u.name,
    uploadTime: timeAgo(u.uploaded_at),
    size: formatSize(u.size),
  }));

  // Audit status counts
  const auditPassed = (db.prepare(`
    SELECT COUNT(*) as count FROM audit_records a
    JOIN contracts c ON a.contract_id = c.id
    WHERE a.status = 'pass' AND c.is_audit_draft = 0${joinedDeptClause}
  `).get(...deptFilter.params) as { count: number }).count;
  const auditFailed = (db.prepare(`
    SELECT COUNT(*) as count FROM audit_records a
    JOIN contracts c ON a.contract_id = c.id
    WHERE a.status = 'fail' AND c.is_audit_draft = 0${joinedDeptClause}
  `).get(...deptFilter.params) as { count: number }).count;
  const auditPending = (db.prepare(`
    SELECT COUNT(*) as count FROM audit_records a
    JOIN contracts c ON a.contract_id = c.id
    WHERE a.status = 'pending' AND c.is_audit_draft = 0${joinedDeptClause}
  `).get(...deptFilter.params) as { count: number }).count;

  res.json({
    stats: {
      totalContracts,
      activeContracts,
      expiringSoon: expiringSoon.count,
      draftContracts,
      riskScore,
    },
    expiringContracts,
    recentUploads,
    auditStatus: {
      passed: auditPassed,
      failed: auditFailed,
      pending: auditPending,
    },
  });
});

// GET /api/dashboard/statistics — full statistics for the statistics page
router.get('/statistics', requireRole('admin', 'super_admin'), (req: AuthRequest, res: Response) => {
  const db = getDb();

  const dateRange = (req.query.range as string) || 'year';
  let days: number;
  switch (dateRange) {
    case 'week': days = 7; break;
    case 'month': days = 30; break;
    case 'quarter': days = 90; break;
    default: days = 365; break;
  }

  // Apply role-based filtering
  let roleFilter = '';
  const roleParams: unknown[] = [];
  if (req.role === 'clerk' || req.role === 'head') {
    const user = db.prepare('SELECT department FROM users WHERE id = ?').get(req.userId) as { department: string } | undefined;
    if (user?.department) {
      roleFilter = ' AND follow_dept = ?';
      roleParams.push(user.department);
    }
  }

  // 1. Total contract value
  const totalValueRow = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) as total FROM contracts WHERE is_audit_draft = 0${roleFilter}`
  ).get(...roleParams) as { total: number };

  // 2. Average contract duration (in months)
  const avgDurationRow = db.prepare(`
    SELECT COALESCE(AVG(
      CAST(julianday(end_date) - julianday(start_date) AS REAL) / 30.0
    ), 0) as avg FROM contracts WHERE is_audit_draft = 0 AND start_date != '' AND end_date != ''${roleFilter}
  `).get(...roleParams) as { avg: number };

  // 3. Monthly growth: compare contracts created in last N days vs previous N days
  const currentPeriodRow = db.prepare(
    `SELECT COUNT(*) as count FROM contracts WHERE is_audit_draft = 0 AND created_at >= datetime('now', ?)${roleFilter}`
  ).get(`-${days} days`, ...roleParams) as { count: number };

  const prevPeriodRow = db.prepare(
    `SELECT COUNT(*) as count FROM contracts WHERE is_audit_draft = 0 AND created_at < datetime('now', ?) AND created_at >= datetime('now', ?)${roleFilter}`
  ).get(`-${days} days`, `-${days * 2} days`, ...roleParams) as { count: number };

  const monthlyGrowth = prevPeriodRow.count > 0
    ? Math.round(((currentPeriodRow.count - prevPeriodRow.count) / prevPeriodRow.count) * 100)
    : currentPeriodRow.count > 0 ? 100 : 0;

  // 4. Total contract count
  const totalCountRow = db.prepare(
    `SELECT COUNT(*) as count FROM contracts WHERE is_audit_draft = 0${roleFilter}`
  ).get(...roleParams) as { count: number };

  // 5. Monthly contract counts (last 12 months)
  const monthlyData: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM contracts
      WHERE is_audit_draft = 0
        AND created_at >= datetime('now', 'start of month', ?)
        AND created_at < datetime('now', 'start of month', ?)
      ${roleFilter}
    `).get(`-${i} months`, `-${i - 1} months`, ...roleParams) as { count: number };
    monthlyData.push(row.count);
  }

  // 6. Contract type distribution
  let typeSql = `
    SELECT type, COUNT(*) as count
    FROM contracts
    WHERE is_audit_draft = 0${roleFilter}
    GROUP BY type
    ORDER BY count DESC
  `;
  const typeDistribution = db.prepare(typeSql).all(...roleParams) as { type: string; count: number }[];

  // 7. Top contracts by amount
  let topSql = `
    SELECT name, amount, party_b as party
    FROM contracts
    WHERE is_audit_draft = 0${roleFilter}
    ORDER BY amount DESC
    LIMIT 10
  `;
  const topContracts = db.prepare(topSql).all(...roleParams) as { name: string; amount: number; party: string }[];

  // 8. Monthly amount trend (last 12 months)
  const monthlyAmount: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const row = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM contracts
      WHERE is_audit_draft = 0
        AND created_at >= datetime('now', 'start of month', ?)
        AND created_at < datetime('now', 'start of month', ?)
      ${roleFilter}
    `).get(`-${i} months`, `-${i - 1} months`, ...roleParams) as { total: number };
    monthlyAmount.push(row.total);
  }

  // 9. Status distribution
  let statusSql = `
    SELECT status, COUNT(*) as count
    FROM contracts
    WHERE is_audit_draft = 0${roleFilter}
    GROUP BY status
  `;
  const statusDistribution = db.prepare(statusSql).all(...roleParams) as { status: string; count: number }[];

  // 10. Risk level distribution
  let riskSql = `
    SELECT risk_level, COUNT(*) as count
    FROM contracts
    WHERE is_audit_draft = 0${roleFilter}
    GROUP BY risk_level
  `;
  const riskDistribution = db.prepare(riskSql).all(...roleParams) as { risk_level: string; count: number }[];

  // 11. Department contract counts
  let deptSql = `
    SELECT follow_dept, COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
    FROM contracts
    WHERE is_audit_draft = 0 AND follow_dept != ''${roleFilter}
    GROUP BY follow_dept
    ORDER BY count DESC
  `;
  const deptStats = db.prepare(deptSql).all(...roleParams) as { follow_dept: string; count: number; total_amount: number }[];

  // 12. Expiring contracts count (within date range)
  const expiringCountRow = db.prepare(`
    SELECT COUNT(*) as count FROM contracts
    WHERE is_audit_draft = 0
      AND status = 'active'
      AND end_date BETWEEN date('now') AND date('now', ?)
    ${roleFilter}
  `).get(`+${days} days`, ...roleParams) as { count: number };

  // 13. Audit pass rate
  let auditSql = `
    SELECT
      COALESCE(SUM(CASE WHEN a.status = 'pass' THEN 1 ELSE 0 END), 0) as passed,
      COALESCE(SUM(CASE WHEN a.status = 'fail' THEN 1 ELSE 0 END), 0) as failed,
      COALESCE(SUM(CASE WHEN a.status = 'warning' THEN 1 ELSE 0 END), 0) as warnings,
      COUNT(*) as total
    FROM audit_records a
    JOIN contracts c ON a.contract_id = c.id
    WHERE c.is_audit_draft = 0${roleFilter}
  `;
  const auditStats = db.prepare(auditSql).get(...roleParams) as { passed: number; failed: number; warnings: number; total: number };

  res.json({
    totalValue: totalValueRow.total,
    avgDuration: Math.round(avgDurationRow.avg * 10) / 10,
    monthlyGrowth,
    totalCount: totalCountRow.count,
    monthlyData,
    monthlyAmount,
    typeDistribution,
    topContracts,
    statusDistribution,
    riskDistribution,
    deptStats,
    expiringCount: expiringCountRow.count,
    auditStats,
  });
});

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr + 'Z');
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
