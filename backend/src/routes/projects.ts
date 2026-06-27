import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import prisma from '../prisma.js';
import { toDate, addDays, daysBetween, getTaskDates } from '../utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectUploadDir = path.join(__dirname, '..', '..', 'uploads', 'project');
fs.mkdirSync(projectUploadDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff', '.zip', '.rar', '.7z'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) cb(null, true);
    else cb(new Error('不支持的文件类型，请上传文档、表格、图片或压缩包'));
  },
});

const router = Router();

router.use(authenticateToken);

function buildTiming(project: any) {
  const today = new Date();
  const targetDate = project.targetDate || project.endDate;
  const startDate = project.startDate;
  const daysRemaining = targetDate ? daysBetween(today, targetDate) : null;
  const elapsedDays = startDate ? Math.max(0, daysBetween(startDate, today)) : null;
  const totalDays = startDate && targetDate ? Math.max(1, daysBetween(startDate, targetDate)) : null;

  return {
    targetName: project.targetName || project.countdownLabel || '目标日期',
    targetDate,
    daysRemaining,
    elapsedDays,
    totalDays,
    overdue: daysRemaining !== null && daysRemaining < 0,
    timeProgress: totalDays && elapsedDays !== null ? Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100))) : null,
  };
}

function buildProjectStats(project: any) {
  const tasks = project.tasks || [];
  const totalTasks = typeof project._count?.tasks === 'number' ? project._count.tasks : tasks.length;
  const completedTasks = tasks.filter((task: any) => task.status === 'done').length;
  const overdueTasks = tasks.filter((task: any) => task.dueDate && task.dueDate < new Date() && task.status !== 'done').length;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : project.progress || 0;

  return {
    totalTasks,
    completedTasks,
    overdueTasks,
    progress: Math.max(0, Math.min(100, taskProgress)),
  };
}

function serializeProject(project: any) {
  const stats = buildProjectStats(project);
  return {
    ...project,
    ...stats,
    timing: buildTiming(project),
    progress: stats.progress,
  };
}

async function createApprovalRecordsForProject(project: any, submitNote: string | null) {
  const flow = await prisma.approvalFlow.findFirst({
    where: { module: 'project_completion', isActive: true },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  });

  if (!flow || flow.steps.length === 0) {
    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: 'completed',
        progress: 100,
        completionSubmittedAt: new Date(),
        completionApprovedAt: new Date(),
        completionNote: submitNote,
      },
    });
    return { autoApproved: true, flowName: null, stepCount: 0, createdApprovalCount: 0 };
  }

  let createdApprovalCount = 0;
  for (const step of flow.steps) {
    const role = await prisma.customRole.findFirst({
      where: { name: step.roleName },
      include: { userRoles: true },
    });
    for (const userRole of role?.userRoles || []) {
      await prisma.approvalRecord.create({
        data: {
          flowId: flow.id,
          stepId: step.id,
          requestId: project.id,
          requestType: 'project_completion',
          approverId: userRole.userId,
          status: 'pending',
          submitNote,
        },
      });
      createdApprovalCount++;

      await prisma.notification.create({
        data: {
          userId: userRole.userId,
          type: 'approval',
          title: `有新的项目完成申请需要审批: ${project.name}`,
          module: 'project',
          refId: project.id,
        },
      });
    }
  }

  if (createdApprovalCount === 0) {
    throw new Error('审批流未匹配到审批人，请检查项目完成审批流角色配置');
  }

  await prisma.project.update({
    where: { id: project.id },
    data: {
      status: 'pending_completion_approval',
      completionSubmittedAt: new Date(),
      completionNote: submitNote,
    },
  });

  return { autoApproved: false, flowName: flow.name, stepCount: flow.steps.length, createdApprovalCount };
}

// GET /api/projects — list projects
router.get('/', async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
  const status = req.query.status as string | undefined;

  try {
    const where: any = {};
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, department: true, avatar: true } },
          tasks: { select: { id: true, status: true, dueDate: true } },
          _count: { select: { tasks: true, members: true, files: true } },
          members: {
            include: { user: { select: { id: true, name: true, avatar: true } } },
          },
        },
        orderBy: [{ targetDate: 'asc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({ items: items.map(serializeProject), total, page, pageSize });
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    res.status(500).json({ error: '获取项目列表失败' });
  }
});

// POST /api/projects — create project
router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, description, startDate, endDate, ownerId, department, priority, type, targetName, targetDate, countdownMode, countdownLabel } = req.body;

  if (!name) {
    res.status(400).json({ error: '项目名称不能为空' });
    return;
  }

  try {
    const project = await prisma.project.create({
      data: {
        name,
        description: description || '',
        startDate: toDate(startDate),
        endDate: toDate(endDate),
        ownerId: ownerId || req.userId,
        department: department || null,
        priority: priority || 'medium',
        type: type || null,
        targetName: targetName || null,
        targetDate: toDate(targetDate),
        countdownMode: Boolean(countdownMode),
        countdownLabel: countdownLabel || null,
        status: 'active',
      },
      include: {
        owner: { select: { id: true, name: true, department: true, avatar: true } },
        tasks: { select: { id: true, status: true, dueDate: true } },
        _count: { select: { tasks: true, members: true, files: true } },
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      },
    });

    const memberIds = Array.from(new Set([req.userId!, ownerId || req.userId!].filter(Boolean)));
    for (const userId of memberIds) {
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: project.id, userId } },
        update: { role: userId === ownerId ? 'owner' : 'admin' },
        create: { projectId: project.id, userId, role: userId === ownerId ? 'owner' : 'admin' },
      });
    }

    if (ownerId && ownerId !== req.userId) {
      await prisma.notification.create({
        data: {
          userId: ownerId,
          type: 'assigned',
          title: `您被委派为项目负责人: ${name}`,
          module: 'project',
          refId: project.id,
        },
      });
    }

    res.status(201).json(serializeProject(project));
  } catch (error) {
    console.error('Failed to create project:', error);
    res.status(500).json({ error: '创建项目失败' });
  }
});

// GET /api/projects/files/:fileId/download
router.get('/files/:fileId/download', async (req: AuthRequest, res: Response) => {
  try {
    const file = await prisma.projectFile.findUnique({ where: { id: req.params.fileId as string } });
    if (!file) {
      res.status(404).json({ error: '文件不存在' });
      return;
    }
    const filePath = path.join(projectUploadDir, file.filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: '文件已丢失' });
      return;
    }
    res.download(filePath, file.originalName);
  } catch (error) {
    console.error('Failed to download project file:', error);
    res.status(500).json({ error: '下载文件失败' });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id as string },
      include: {
        owner: { select: { id: true, name: true, department: true, avatar: true } },
        tasks: {
          include: { assignee: { select: { id: true, name: true, avatar: true } } },
          orderBy: [{ dueDate: 'asc' }, { sortOrder: 'asc' }],
        },
        files: {
          include: { uploader: { select: { id: true, name: true } } },
          orderBy: { uploadedAt: 'desc' },
        },
        _count: { select: { tasks: true, members: true, files: true } },
        members: {
          include: { user: { select: { id: true, name: true, department: true, avatar: true } } },
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    res.json(serializeProject(project));
  } catch (error) {
    console.error('Failed to fetch project:', error);
    res.status(500).json({ error: '获取项目失败' });
  }
});

// PUT /api/projects/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { name, description, status, startDate, endDate, ownerId, department, priority, type, progress, targetName, targetDate, countdownMode, countdownLabel } = req.body;

  try {
    const project = await prisma.project.update({
      where: { id: req.params.id as string },
      data: {
        ...(name ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status ? { status } : {}),
        ...(startDate !== undefined ? { startDate: toDate(startDate) } : {}),
        ...(endDate !== undefined ? { endDate: toDate(endDate) } : {}),
        ...(ownerId !== undefined ? { ownerId: ownerId || null } : {}),
        ...(department !== undefined ? { department: department || null } : {}),
        ...(priority ? { priority } : {}),
        ...(type !== undefined ? { type: type || null } : {}),
        ...(progress !== undefined ? { progress: Math.max(0, Math.min(100, Number(progress) || 0)) } : {}),
        ...(targetName !== undefined ? { targetName: targetName || null } : {}),
        ...(targetDate !== undefined ? { targetDate: toDate(targetDate) } : {}),
        ...(countdownMode !== undefined ? { countdownMode: Boolean(countdownMode) } : {}),
        ...(countdownLabel !== undefined ? { countdownLabel: countdownLabel || null } : {}),
      },
      include: {
        owner: { select: { id: true, name: true, department: true, avatar: true } },
        tasks: { select: { id: true, status: true, dueDate: true } },
        _count: { select: { tasks: true, members: true, files: true } },
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      },
    });

    if (ownerId) {
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: project.id, userId: ownerId } },
        update: { role: 'owner' },
        create: { projectId: project.id, userId: ownerId, role: 'owner' },
      });
    }

    res.json(serializeProject(project));
  } catch (error) {
    console.error('Failed to update project:', error);
    res.status(500).json({ error: '更新项目失败' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id as string } });
    res.json({ message: '项目已删除' });
  } catch (error) {
    console.error('Failed to delete project:', error);
    res.status(500).json({ error: '删除项目失败' });
  }
});

// PUT /api/projects/:id/owner
router.put('/:id/owner', async (req: AuthRequest, res: Response) => {
  const { ownerId } = req.body;
  if (!ownerId) {
    res.status(400).json({ error: '请选择项目负责人' });
    return;
  }

  try {
    const project = await prisma.project.update({
      where: { id: req.params.id as string },
      data: { ownerId },
      include: { owner: { select: { id: true, name: true, department: true, avatar: true } } },
    });
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: ownerId } },
      update: { role: 'owner' },
      create: { projectId: project.id, userId: ownerId, role: 'owner' },
    });
    await prisma.notification.create({
      data: { userId: ownerId, type: 'assigned', title: `您被委派为项目负责人: ${project.name}`, module: 'project', refId: project.id },
    });
    res.json(project);
  } catch (error) {
    console.error('Failed to assign project owner:', error);
    res.status(500).json({ error: '委派负责人失败' });
  }
});

// GET /api/projects/:id/kanban — get kanban board data
router.get('/:id/kanban', async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { projectId: req.params.id as string },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        subtasks: { select: { id: true, status: true } },
        _count: { select: { files: true } },
        dependencies: { include: { dependsOn: { select: { id: true, title: true, status: true } } } },
      },
      orderBy: [{ sortOrder: 'asc' }, { dueDate: 'asc' }],
    });

    res.json({
      todo: tasks.filter((t) => t.status === 'todo'),
      in_progress: tasks.filter((t) => t.status === 'in_progress'),
      review: tasks.filter((t) => t.status === 'review'),
      done: tasks.filter((t) => t.status === 'done'),
    });
  } catch (error) {
    console.error('Failed to fetch kanban:', error);
    res.status(500).json({ error: '获取看板数据失败' });
  }
});

// GET /api/projects/:id/gantt
router.get('/:id/gantt', async (req: AuthRequest, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id as string },
      include: {
        tasks: {
          include: {
            assignee: { select: { id: true, name: true } },
            _count: { select: { files: true } },
          },
          orderBy: [{ startDate: 'asc' }, { dueDate: 'asc' }, { sortOrder: 'asc' }],
        },
      },
    });
    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }
    res.json({
      project: {
        id: project.id,
        name: project.name,
        startDate: project.startDate,
        endDate: project.endDate,
        targetName: project.targetName,
        targetDate: project.targetDate,
        timing: buildTiming(project),
      },
      tasks: project.tasks,
    });
  } catch (error) {
    console.error('Failed to fetch gantt:', error);
    res.status(500).json({ error: '获取甘特图失败' });
  }
});

// GET /api/projects/:id/stats — project statistics
router.get('/:id/stats', async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({ where: { projectId: req.params.id as string } });
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const review = tasks.filter((t) => t.status === 'review').length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const overdue = tasks.filter((t) => t.dueDate && t.dueDate < new Date() && t.status !== 'done').length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    res.json({ total, todo, inProgress, review, done, overdue, progress });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// GET /api/projects/:id/members
router.get('/:id/members', async (req: AuthRequest, res: Response) => {
  try {
    const members = await prisma.projectMember.findMany({
      where: { projectId: req.params.id as string },
      include: { user: { select: { id: true, name: true, department: true, avatar: true } } },
      orderBy: { role: 'desc' },
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
    const member = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: req.params.id as string, userId } },
      update: { role: role || 'member' },
      create: { projectId: req.params.id as string, userId, role: role || 'member' },
      include: { user: { select: { id: true, name: true, department: true, avatar: true } } },
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
      where: { projectId: req.params.id as string, userId: req.params.userId as string },
    });
    res.json({ message: '成员已移除' });
  } catch (error) {
    console.error('Failed to remove member:', error);
    res.status(500).json({ error: '移除成员失败' });
  }
});

// POST /api/projects/:id/files
router.post('/:id/files', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: '请选择要上传的文件' });
    return;
  }

  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id as string } });
    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    const ext = path.extname(req.file.originalname);
    const filename = `${randomUUID()}${ext}`;
    fs.writeFileSync(path.join(projectUploadDir, filename), req.file.buffer);

    const file = await prisma.projectFile.create({
      data: {
        projectId: project.id,
        filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype || 'application/octet-stream',
        fileType: req.body.fileType || 'support',
        uploadedBy: req.userId,
      },
      include: { uploader: { select: { id: true, name: true } } },
    });
    res.status(201).json(file);
  } catch (error) {
    console.error('Failed to upload project file:', error);
    res.status(500).json({ error: '上传项目文件失败' });
  }
});

// GET /api/projects/:id/files
router.get('/:id/files', async (req: AuthRequest, res: Response) => {
  try {
    const files = await prisma.projectFile.findMany({
      where: { projectId: req.params.id as string },
      include: { uploader: { select: { id: true, name: true } } },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json(files);
  } catch (error) {
    console.error('Failed to fetch project files:', error);
    res.status(500).json({ error: '获取项目文件失败' });
  }
});

// DELETE /api/projects/:id/files/:fileId
router.delete('/:id/files/:fileId', async (req: AuthRequest, res: Response) => {
  try {
    const file = await prisma.projectFile.findUnique({ where: { id: req.params.fileId as string } });
    if (!file || file.projectId !== req.params.id) {
      res.status(404).json({ error: '文件不存在' });
      return;
    }
    await prisma.projectFile.delete({ where: { id: file.id } });
    const filePath = path.join(projectUploadDir, file.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ message: '文件已删除' });
  } catch (error) {
    console.error('Failed to delete project file:', error);
    res.status(500).json({ error: '删除项目文件失败' });
  }
});

// POST /api/projects/:id/submit-completion
router.post('/:id/submit-completion', async (req: AuthRequest, res: Response) => {
  const submitNote = String(req.body.submitNote || '').trim() || null;

  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id as string },
      include: { _count: { select: { files: true } } },
    });
    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }
    if (project._count.files === 0) {
      res.status(400).json({ error: '请先上传项目完成支持文件，再提交完成审批' });
      return;
    }

    const pending = await prisma.approvalRecord.findFirst({
      where: { requestId: project.id, requestType: 'project_completion', status: 'pending' },
    });
    if (pending) {
      res.status(400).json({ error: '该项目已有待处理的完成审批' });
      return;
    }

    const result = await createApprovalRecordsForProject(project, submitNote);
    res.json({
      message: result.autoApproved ? '项目已自动完成' : '项目完成申请已提交审批',
      nextStep: result.autoApproved ? 'completed' : 'pending_completion_approval',
      ...result,
    });
  } catch (error: any) {
    console.error('Failed to submit project completion:', error);
    res.status(500).json({ error: error?.message || '提交项目完成审批失败' });
  }
});

// GET /api/projects/:id/approval-progress
router.get('/:id/approval-progress', async (req: AuthRequest, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, status: true, completionSubmittedAt: true, completionApprovedAt: true, completionNote: true },
    });
    const records = await prisma.approvalRecord.findMany({
      where: { requestId: req.params.id as string, requestType: 'project_completion' },
      include: { approver: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const flow = records.length > 0 && records[0].flowId
      ? await prisma.approvalFlow.findUnique({
          where: { id: records[0].flowId },
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
        })
      : null;

    const pendingCount = records.filter((record) => record.status === 'pending').length;
    const approvedCount = records.filter((record) => record.status === 'approved').length;
    const rejectedCount = records.filter((record) => record.status === 'rejected').length;
    const submitted = records.length > 0 || Boolean(project?.completionSubmittedAt);

    let status = 'not_submitted';
    if (project?.status === 'completed') status = 'completed';
    else if (rejectedCount > 0 || project?.status === 'rejected') status = 'rejected';
    else if (pendingCount > 0 || project?.status === 'pending_completion_approval') status = 'pending_completion_approval';
    else if (submitted && approvedCount === records.length && records.length > 0) status = 'approved';

    res.json({
      status,
      submitted,
      pendingCount,
      approvedCount,
      rejectedCount,
      totalSteps: records.length,
      completionSubmittedAt: project?.completionSubmittedAt,
      completionApprovedAt: project?.completionApprovedAt,
      completionNote: project?.completionNote,
      records,
      flow,
    });
  } catch (error) {
    console.error('Failed to fetch project approval progress:', error);
    res.status(500).json({ error: '获取项目审批进度失败' });
  }
});

export default router;
