import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = Router();

router.use(authenticateToken);

// GET /api/notifications — list notifications for current user
router.get('/', async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));
  const type = req.query.type as string | undefined;
  const unreadOnly = req.query.unread === 'true';

  try {
    const where: any = { userId: req.userId };
    if (type) where.type = type;
    if (unreadOnly) where.isRead = false;

    const [total, items] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({ items, total, page, pageSize });
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    res.status(500).json({ error: '获取通知失败' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.userId, isRead: false },
    });
    res.json({ count });
  } catch (error) {
    console.error('Failed to count unread:', error);
    res.status(500).json({ error: '获取未读数失败' });
  }
});

// PUT /api/notifications/:id/read — mark as read
router.put('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id as string, userId: req.userId },
      data: { isRead: true },
    });
    res.json({ message: '已标记为已读' });
  } catch (error) {
    console.error('Failed to mark as read:', error);
    res.status(500).json({ error: '标记已读失败' });
  }
});

// POST /api/notifications/read-all — mark all as read
router.post('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: `已标记 ${result.count} 条通知为已读` });
  } catch (error) {
    console.error('Failed to mark all as read:', error);
    res.status(500).json({ error: '标记全部已读失败' });
  }
});

// GET /api/notifications/preferences — get notification preferences
router.get('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const prefs = await prisma.notificationPreference.findMany({
      where: { userId: req.userId },
    });

    // Default preferences for all types
    const defaultTypes = [
      'assigned', 'comment', 'due_reminder', 'overdue',
      'dependency_complete', 'approval',
    ];

    const result = defaultTypes.map((type) => {
      const existing = prefs.find((p) => p.type === type);
      return {
        type,
        inAppEnabled: existing?.inAppEnabled ?? true,
        emailEnabled: existing?.emailEnabled ?? true,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Failed to fetch preferences:', error);
    res.status(500).json({ error: '获取通知偏好失败' });
  }
});

// PUT /api/notifications/preferences — update notification preferences
router.put('/preferences', async (req: AuthRequest, res: Response) => {
  const { preferences } = req.body as {
    preferences: { type: string; inAppEnabled: boolean; emailEnabled: boolean }[];
  };

  try {
    for (const pref of preferences) {
      await prisma.notificationPreference.upsert({
        where: {
          userId_type: { userId: req.userId!, type: pref.type },
        },
        update: {
          inAppEnabled: pref.inAppEnabled,
          emailEnabled: pref.emailEnabled,
        },
        create: {
          userId: req.userId!,
          type: pref.type,
          inAppEnabled: pref.inAppEnabled,
          emailEnabled: pref.emailEnabled,
        },
      });
    }

    res.json({ message: '通知偏好已更新' });
  } catch (error) {
    console.error('Failed to update preferences:', error);
    res.status(500).json({ error: '更新通知偏好失败' });
  }
});

export default router;
