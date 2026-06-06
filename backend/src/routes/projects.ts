import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = Router();

router.use(authenticateToken);

// GET /api/projects — list projects
router.get('/', async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));
  const status = req.query.status as string | undefined;

  try {
    const where: any = {};
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        include: {
          _count: { select: { tasks: true, members: true } },
          members: {
            include: { user: { select: { id: true, name: true, avatar: true } } },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const result = items.map((project) => {
      const totalTasks = project._count.tasks;
      const completedTasks = 0; // Will be calculated from task status
      return {
        ...project,
        totalTasks,
        completedTasks,
        progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      };
    });

    res.json({ items: result, total, page, pageSize });
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    res.status(500).json({ error: '获取项目列表失败' });
  }
});

// POST /api/projects — create project
router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, description, startDate, endDate } = req.body;

  if (!name) {
    res.status(400).json({ error: '项目名称不能为空' });
    return;
  }

  try {
    const project = await prisma.project.create({
      data: {
        name,
        description: description || '',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: 'active',
      },
    });

    // Add creator as admin member
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: req.userId!,
        role: 'admin',
      },
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Failed to create project:', error);
    res.status(500).json({ error: '创建项目失败' });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { tasks: true, members: true } },
        members: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    res.json(project);
  } catch (error) {
    console.error('Failed to fetch project:', error);
    res.status(500).json({ error: '获取项目失败' });
  }
});

// PUT /api/projects/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { name, description, status, startDate, endDate } = req.body;

  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...(name ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status ? { status } : {}),
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate ? { endDate: new Date(endDate) } : {}),
      },
    });

    res.json(project);
  } catch (error) {
    console.error('Failed to update project:', error);
    res.status(500).json({ error: '更新项目失败' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: '项目已删除' });
  } catch (error) {
    console.error('Failed to delete project:', error);
    res.status(500).json({ error: '删除项目失败' });
  }
});

// GET /api/projects/:id/kanban — get kanban board data
router.get('/:id/kanban', async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { projectId: req.params.id },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        subtasks: { select: { id: true, status: true } },
        dependencies: { include: { dependsOn: { select: { id: true, title: true, status: true } } } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const columns = {
      todo: tasks.filter((t) => t.status === 'todo'),
      in_progress: tasks.filter((t) => t.status === 'in_progress'),
      review: tasks.filter((t) => t.status === 'review'),
      done: tasks.filter((t) => t.status === 'done'),
    };

    res.json(columns);
  } catch (error) {
    console.error('Failed to fetch kanban:', error);
    res.status(500).json({ error: '获取看板数据失败' });
  }
});

// GET /api/projects/:id/stats — project statistics
router.get('/:id/stats', async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { projectId: req.params.id },
    });

    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const review = tasks.filter((t) => t.status === 'review').length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const overdue = tasks.filter((t) => t.dueDate && t.dueDate < new Date() && t.status !== 'done').length;

    res.json({ total, todo, inProgress, review, done, overdue });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// GET /api/projects/:id/members
router.get('/:id/members', async (req: AuthRequest, res: Response) => {
  try {
    const members = await prisma.projectMember.findMany({
      where: { projectId: req.params.id },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    res.json(members);
  } catch (error) {
    console.error('Failed to fetch members:', error);
    res.status(500).json({ error: '获取成员失败' });
  }
});

// POST /api/projects/:id/members — add member
router.post('/:id/members', async (req: AuthRequest, res: Response) => {
  const { userId, role } = req.body;

  try {
    const member = await prisma.projectMember.create({
      data: {
        projectId: req.params.id,
        userId,
        role: role || 'member',
      },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    res.status(201).json(member);
  } catch (error) {
    console.error('Failed to add member:', error);
    res.status(500).json({ error: '添加成员失败' });
  }
});

// DELETE /api/projects/:id/members/:userId
router.delete('/:id/members/:userId', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.projectMember.deleteMany({
      where: { projectId: req.params.id, userId: req.params.userId },
    });
    res.json({ message: '成员已移除' });
  } catch (error) {
    console.error('Failed to remove member:', error);
    res.status(500).json({ error: '移除成员失败' });
  }
});

export default router;
