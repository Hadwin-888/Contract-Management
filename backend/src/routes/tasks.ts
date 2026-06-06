import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = Router();

router.use(authenticateToken);

// GET /api/tasks/my — my tasks across all projects
router.get('/my', async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { assigneeId: req.userId },
      include: {
        project: { select: { id: true, name: true } },
        subtasks: { select: { id: true, status: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'asc' }],
      take: 50,
    });

    res.json(tasks);
  } catch (error) {
    console.error('Failed to fetch my tasks:', error);
    res.status(500).json({ error: '获取我的任务失败' });
  }
});

// POST /api/tasks — create task
router.post('/', async (req: AuthRequest, res: Response) => {
  const { projectId, title, description, priority, assigneeId, startDate, dueDate, parentId } = req.body;

  if (!projectId || !title) {
    res.status(400).json({ error: '项目和任务标题不能为空' });
    return;
  }

  try {
    // Get max sort order for the project
    const lastTask = await prisma.task.findFirst({
      where: { projectId },
      orderBy: { sortOrder: 'desc' },
    });

    const task = await prisma.task.create({
      data: {
        projectId,
        title,
        description: description || '',
        status: 'todo',
        priority: priority || 'medium',
        assigneeId: assigneeId || null,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        parentId: parentId || null,
        sortOrder: (lastTask?.sortOrder || 0) + 1,
      },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Create change log
    await prisma.taskChangeLog.create({
      data: {
        projectId,
        taskId: task.id,
        userId: req.userId!,
        action: 'created',
        newValue: title,
      },
    });

    // Create notification for assignee
    if (assigneeId && assigneeId !== req.userId) {
      await prisma.notification.create({
        data: {
          userId: assigneeId,
          type: 'assigned',
          title: `您被分配了新任务: ${title}`,
          module: 'project',
          refId: projectId,
        },
      });
    }

    res.status(201).json(task);
  } catch (error) {
    console.error('Failed to create task:', error);
    res.status(500).json({ error: '创建任务失败' });
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        subtasks: {
          include: { assignee: { select: { id: true, name: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        dependencies: {
          include: { dependsOn: { select: { id: true, title: true, status: true } } },
        },
        dependents: {
          include: { task: { select: { id: true, title: true, status: true } } },
        },
        comments: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'asc' },
        },
        changeLogs: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!task) {
      res.status(404).json({ error: '任务不存在' });
      return;
    }

    res.json(task);
  } catch (error) {
    console.error('Failed to fetch task:', error);
    res.status(500).json({ error: '获取任务失败' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { title, description, status, priority, assigneeId, startDate, dueDate, sortOrder } = req.body;

  try {
    const oldTask = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!oldTask) {
      res.status(404).json({ error: '任务不存在' });
      return;
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...(title ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(assigneeId !== undefined ? { assigneeId: assigneeId || null } : {}),
        ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
      },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Create change log for status change
    if (status && status !== oldTask.status) {
      await prisma.taskChangeLog.create({
        data: {
          projectId: oldTask.projectId,
          taskId: task.id,
          userId: req.userId!,
          action: 'status_changed',
          fieldName: 'status',
          oldValue: oldTask.status,
          newValue: status,
        },
      });

      // Check dependencies when moving to done
      if (status === 'done') {
        const dependents = await prisma.taskDependency.findMany({
          where: { dependsOnTaskId: task.id },
          include: { task: { select: { id: true, title: true, assigneeId: true } } },
        });
        for (const dep of dependents) {
          if (dep.task.assigneeId) {
            await prisma.notification.create({
              data: {
                userId: dep.task.assigneeId,
                type: 'dependency_complete',
                title: `前置任务"${task.title}"已完成，您的任务"${dep.task.title}"可以开始了`,
                module: 'project',
                refId: oldTask.projectId,
              },
            });
          }
        }
      }
    }

    // Create notification if assignee changed
    if (assigneeId && assigneeId !== oldTask.assigneeId && assigneeId !== req.userId) {
      await prisma.notification.create({
        data: {
          userId: assigneeId,
          type: 'assigned',
          title: `您被分配了新任务: ${title || oldTask.title}`,
          module: 'project',
          refId: oldTask.projectId,
        },
      });
    }

    res.json(task);
  } catch (error) {
    console.error('Failed to update task:', error);
    res.status(500).json({ error: '更新任务失败' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: '任务已删除' });
  } catch (error) {
    console.error('Failed to delete task:', error);
    res.status(500).json({ error: '删除任务失败' });
  }
});

// POST /api/tasks/:id/dependencies — add dependency
router.post('/:id/dependencies', async (req: AuthRequest, res: Response) => {
  const { dependsOnTaskId } = req.body;

  try {
    // Check for circular dependency
    const existing = await prisma.taskDependency.findUnique({
      where: {
        taskId_dependsOnTaskId: {
          taskId: req.params.id,
          dependsOnTaskId,
        },
      },
    });
    if (existing) {
      res.status(409).json({ error: '依赖关系已存在' });
      return;
    }

    const dep = await prisma.taskDependency.create({
      data: {
        taskId: req.params.id,
        dependsOnTaskId,
      },
      include: {
        dependsOn: { select: { id: true, title: true, status: true } },
      },
    });

    res.status(201).json(dep);
  } catch (error) {
    console.error('Failed to add dependency:', error);
    res.status(500).json({ error: '添加依赖失败' });
  }
});

// DELETE /api/tasks/:id/dependencies/:depId
router.delete('/:id/dependencies/:depId', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.taskDependency.delete({
      where: { id: req.params.depId },
    });
    res.json({ message: '依赖已删除' });
  } catch (error) {
    console.error('Failed to remove dependency:', error);
    res.status(500).json({ error: '删除依赖失败' });
  }
});

// POST /api/tasks/:id/comments — add comment
router.post('/:id/comments', async (req: AuthRequest, res: Response) => {
  const { content, mentions } = req.body;

  if (!content) {
    res.status(400).json({ error: '评论内容不能为空' });
    return;
  }

  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) {
      res.status(404).json({ error: '任务不存在' });
      return;
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId: req.params.id,
        userId: req.userId!,
        content,
        mentions: JSON.stringify(mentions || []),
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Notify mentioned users
    if (mentions && mentions.length > 0) {
      for (const mentionedUserId of mentions) {
        if (mentionedUserId !== req.userId) {
          await prisma.notification.create({
            data: {
              userId: mentionedUserId,
              type: 'comment',
              title: `有人在任务"${task.title}"中提到了您`,
              module: 'project',
              refId: task.projectId,
            },
          });
        }
      }
    }

    // Notify task assignee
    if (task.assigneeId && task.assigneeId !== req.userId) {
      await prisma.notification.create({
        data: {
          userId: task.assigneeId,
          type: 'comment',
          title: `任务"${task.title}"有新评论`,
          module: 'project',
          refId: task.projectId,
        },
      });
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error('Failed to add comment:', error);
    res.status(500).json({ error: '添加评论失败' });
  }
});

// GET /api/tasks/:id/comments
router.get('/:id/comments', async (req: AuthRequest, res: Response) => {
  try {
    const comments = await prisma.taskComment.findMany({
      where: { taskId: req.params.id },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(comments);
  } catch (error) {
    console.error('Failed to fetch comments:', error);
    res.status(500).json({ error: '获取评论失败' });
  }
});

// POST /api/tasks/:id/progress — record progress update
router.post('/:id/progress', async (req: AuthRequest, res: Response) => {
  const { progress, note } = req.body;

  try {
    const update = await prisma.progressUpdate.create({
      data: {
        taskId: req.params.id,
        userId: req.userId!,
        progress: Math.max(0, Math.min(100, progress || 0)),
        note: note || '',
      },
    });

    // Auto-update task status based on progress
    if (progress >= 100) {
      await prisma.task.update({
        where: { id: req.params.id },
        data: { status: 'done', completedAt: new Date() },
      });
    } else if (progress > 0) {
      await prisma.task.update({
        where: { id: req.params.id },
        data: { status: 'in_progress' },
      });
    }

    res.status(201).json(update);
  } catch (error) {
    console.error('Failed to record progress:', error);
    res.status(500).json({ error: '记录进度失败' });
  }
});

// GET /api/tasks/:id/progress
router.get('/:id/progress', async (req: AuthRequest, res: Response) => {
  try {
    const updates = await prisma.progressUpdate.findMany({
      where: { taskId: req.params.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(updates);
  } catch (error) {
    console.error('Failed to fetch progress:', error);
    res.status(500).json({ error: '获取进度失败' });
  }
});

// GET /api/tasks/:id/change-logs
router.get('/:id/change-logs', async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.taskChangeLog.findMany({
      where: { taskId: req.params.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(logs);
  } catch (error) {
    console.error('Failed to fetch change logs:', error);
    res.status(500).json({ error: '获取变更日志失败' });
  }
});

export default router;
