import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import prisma from '../prisma.js';
import {
  toDate, addDays, normalizeText, truthyText, priorityValue,
  normalizeOriginalName, getRowValue, getTaskDates,
} from '../utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const taskUploadDir = path.join(__dirname, '..', '..', 'uploads', 'task');
fs.mkdirSync(taskUploadDir, { recursive: true });

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

function parseExcelDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  const text = normalizeText(value);
  if (!text) return null;
  const normalized = text.replace(/\./g, '-').replace(/\//g, '-');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function excelDateText(value: unknown) {
  const date = parseExcelDate(value);
  if (!date) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function offsetDays(value: unknown, unit: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  const unitText = normalizeText(unit);
  const days = unitText === '周' || unitText.toLowerCase() === 'week' ? amount * 7 : amount;
  return -Math.round(days);
}

async function createApprovalRecordsForTask(task: any, submitNote: string | null) {
  const flow = await prisma.approvalFlow.findFirst({
    where: { module: 'task_completion', isActive: true },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  });

  if (!flow || flow.steps.length === 0) {
    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: 'done',
        progress: 100,
        completedAt: new Date(),
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
          requestId: task.id,
          requestType: 'task_completion',
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
          title: `有新的任务完成申请需要审批: ${task.title}`,
          module: 'project',
          refId: task.projectId,
        },
      });
    }
  }

  if (createdApprovalCount === 0) {
    throw new Error('任务完成审批流未匹配到审批人，请检查审批流角色配置');
  }

  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: 'review',
      progress: Math.max(task.progress || 0, 90),
      completionSubmittedAt: new Date(),
      completionNote: submitNote,
    },
  });

  return { autoApproved: false, flowName: flow.name, stepCount: flow.steps.length, createdApprovalCount };
}

// GET /api/tasks/my — my tasks across all projects
router.get('/my', async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { assigneeId: req.userId },
      include: {
        project: { select: { id: true, name: true } },
        subtasks: { select: { id: true, status: true } },
        _count: { select: { files: true } },
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
  const { projectId, title, description, priority, assigneeId, parentId, relativeToTarget, startOffsetDays, dueOffsetDays, progress } = req.body;

  if (!projectId || !title) {
    res.status(400).json({ error: '项目和任务标题不能为空' });
    return;
  }

  try {
    const dates = await getTaskDates(projectId, req.body, prisma);
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
        startDate: dates.startDate ?? null,
        dueDate: dates.dueDate ?? null,
        relativeToTarget: Boolean(relativeToTarget),
        startOffsetDays: startOffsetDays !== undefined && startOffsetDays !== '' ? Number(startOffsetDays) : null,
        dueOffsetDays: dueOffsetDays !== undefined && dueOffsetDays !== '' ? Number(dueOffsetDays) : null,
        progress: Math.max(0, Math.min(100, Number(progress) || 0)),
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

// GET /api/tasks/import-template — download task import template
router.get('/import-template', async (_req: AuthRequest, res: Response) => {
  try {
    const headers = [
      '任务标题*',
      '任务说明',
      '负责人姓名',
      '优先级(高/中/低)',
      '开始日期(YYYY-MM-DD)',
      '截止日期(YYYY-MM-DD)',
      '进度(0-100)',
      '按目标日期倒推(是/否)',
      '开始提前数值',
      '开始单位(天/周)',
      '截止提前数值',
      '截止单位(天/周)',
    ];
    const examples = [
      ['编制筹备期预算', '完成预算表并上传支持文件', '张三', '高', '2026-07-01', '2026-07-15', 0, '否', '', '', '', ''],
      ['HOE采购预算提交', '按开业目标日前倒排计划', '李四', '中', '', '', 0, '是', 8, '周', 4, '周'],
    ];
    const notes = [
      ['填写说明'],
      ['1. 任务标题为必填；负责人姓名需与系统用户姓名一致，留空则不分配负责人。'],
      ['2. 优先级可填：高、中、低；不填默认为中。'],
      ['3. 普通日期模式填写开始日期/截止日期；倒推模式填写“按目标日期倒推=是”及提前数值、单位。'],
      ['4. 倒推单位支持“天”或“周”，系统会按项目目标日期/结束日期自动计算任务日期。'],
      ['5. 导入时系统会先校验全部行，存在错误则不会导入任何任务。'],
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    worksheet['!cols'] = headers.map((header) => ({ wch: Math.max(14, header.length + 4) }));
    XLSX.utils.book_append_sheet(workbook, worksheet, '任务导入模板');

    const exampleSheet = XLSX.utils.aoa_to_sheet([headers, ...examples, [], ...notes]);
    exampleSheet['!cols'] = headers.map((header) => ({ wch: Math.max(14, header.length + 4) }));
    XLSX.utils.book_append_sheet(workbook, exampleSheet, '示例与说明');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent('任务导入模板.xlsx')}`);
    res.send(buffer);
  } catch (error) {
    console.error('Failed to generate task import template:', error);
    res.status(500).json({ error: '生成任务导入模板失败' });
  }
});

// POST /api/tasks/import — import tasks from Excel template
router.post('/import', upload.single('file'), async (req: AuthRequest, res: Response) => {
  const projectId = normalizeText(req.body.projectId);
  if (!projectId) {
    res.status(400).json({ error: '项目不能为空' });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: '请选择任务导入 Excel 文件' });
    return;
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, targetDate: true, endDate: true },
    });
    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '', raw: false });
    const dataRows = rows.filter((row) => normalizeText(getRowValue(row, ['任务标题*', '任务标题'])));
    if (dataRows.length === 0) {
      res.status(400).json({ error: '导入文件中没有可导入的任务' });
      return;
    }

    const users = await prisma.user.findMany({ select: { id: true, name: true } });
    const userByName = new Map(users.map((user) => [user.name.trim(), user]));
    const rowErrors: string[] = [];
    const tasks = dataRows.map((row, index) => {
      const rowNumber = index + 2;
      const title = normalizeText(getRowValue(row, ['任务标题*', '任务标题']));
      const assigneeName = normalizeText(getRowValue(row, ['负责人姓名', '负责人']));
      const assignee = assigneeName ? userByName.get(assigneeName) : null;
      const relativeToTarget = truthyText(getRowValue(row, ['按目标日期倒推(是/否)', '按目标日期倒推']));
      const startOffset = offsetDays(getRowValue(row, ['开始提前数值']), getRowValue(row, ['开始单位(天/周)', '开始单位']));
      const dueOffset = offsetDays(getRowValue(row, ['截止提前数值']), getRowValue(row, ['截止单位(天/周)', '截止单位']));
      const startDateText = excelDateText(getRowValue(row, ['开始日期(YYYY-MM-DD)', '开始日期']));
      const dueDateText = excelDateText(getRowValue(row, ['截止日期(YYYY-MM-DD)', '截止日期']));
      const progress = Math.max(0, Math.min(100, Number(getRowValue(row, ['进度(0-100)', '进度'])) || 0));

      if (!title) rowErrors.push(`第 ${rowNumber} 行：任务标题不能为空`);
      if (assigneeName && !assignee) rowErrors.push(`第 ${rowNumber} 行：负责人"${assigneeName}"不存在`);
      if (relativeToTarget && !project.targetDate && !project.endDate) rowErrors.push(`第 ${rowNumber} 行：项目没有目标日期或结束日期，不能使用倒推`);
      if (relativeToTarget && startOffset === null && dueOffset === null) rowErrors.push(`第 ${rowNumber} 行：倒推模式至少填写开始或截止提前数值`);
      if (!relativeToTarget && startDateText && dueDateText && parseExcelDate(startDateText)! > parseExcelDate(dueDateText)!) {
        rowErrors.push(`第 ${rowNumber} 行：开始日期不能晚于截止日期`);
      }

      return {
        title,
        description: normalizeText(getRowValue(row, ['任务说明', '说明'])),
        priority: priorityValue(getRowValue(row, ['优先级(高/中/低)', '优先级'])),
        assigneeId: assignee?.id || null,
        relativeToTarget,
        startOffsetDays: relativeToTarget ? startOffset : null,
        dueOffsetDays: relativeToTarget ? dueOffset : null,
        startDate: relativeToTarget ? null : startDateText,
        dueDate: relativeToTarget ? null : dueDateText,
        progress,
      };
    });

    if (rowErrors.length > 0) {
      res.status(400).json({ error: '导入校验失败', details: rowErrors });
      return;
    }

    const lastTask = await prisma.task.findFirst({
      where: { projectId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    let sortOrder = lastTask?.sortOrder || 0;
    const created: any[] = [];

    await prisma.$transaction(async (tx) => {
      for (const item of tasks) {
        const dates = await getTaskDates(projectId, item, prisma);
        sortOrder += 1;
        const task = await tx.task.create({
          data: {
            projectId,
            title: item.title,
            description: item.description,
            status: 'todo',
            priority: item.priority,
            assigneeId: item.assigneeId,
            startDate: dates.startDate ?? null,
            dueDate: dates.dueDate ?? null,
            relativeToTarget: item.relativeToTarget,
            startOffsetDays: item.startOffsetDays,
            dueOffsetDays: item.dueOffsetDays,
            progress: item.progress,
            sortOrder,
          },
          include: { assignee: { select: { id: true, name: true, avatar: true } } },
        });
        created.push(task);
        await tx.taskChangeLog.create({
          data: {
            projectId,
            taskId: task.id,
            userId: req.userId!,
            action: 'imported',
            newValue: task.title,
          },
        });
        if (task.assigneeId && task.assigneeId !== req.userId) {
          await tx.notification.create({
            data: {
              userId: task.assigneeId,
              type: 'assigned',
              title: `您被分配了新任务: ${task.title}`,
              module: 'project',
              refId: projectId,
            },
          });
        }
      }
    });

    res.status(201).json({
      message: `成功导入 ${created.length} 个任务`,
      importedCount: created.length,
      tasks: created,
    });
  } catch (error: any) {
    console.error('Failed to import tasks:', error);
    res.status(500).json({ error: error?.message || '导入任务失败' });
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id as string as string },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        subtasks: {
          include: { assignee: { select: { id: true, name: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        dependencies: {
          include: { dependsOn: { select: { id: true, title: true, status: true } } },
        },
        files: {
          include: { uploader: { select: { id: true, name: true } } },
          orderBy: { uploadedAt: 'desc' },
        },
        _count: { select: { files: true } },
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

// GET /api/tasks/files/:fileId/download
router.get('/files/:fileId/download', async (req: AuthRequest, res: Response) => {
  try {
    const file = await prisma.taskFile.findUnique({ where: { id: req.params.fileId as string } });
    if (!file) {
      res.status(404).json({ error: '文件不存在' });
      return;
    }
    const filePath = path.join(taskUploadDir, file.filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: '文件已丢失' });
      return;
    }
    res.download(filePath, file.originalName);
  } catch (error) {
    console.error('Failed to download task file:', error);
    res.status(500).json({ error: '下载任务文件失败' });
  }
});

// GET /api/tasks/:id/files
router.get('/:id/files', async (req: AuthRequest, res: Response) => {
  try {
    const files = await prisma.taskFile.findMany({
      where: { taskId: req.params.id as string },
      include: { uploader: { select: { id: true, name: true } } },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json(files);
  } catch (error) {
    console.error('Failed to fetch task files:', error);
    res.status(500).json({ error: '获取任务文件失败' });
  }
});

// POST /api/tasks/:id/files
router.post('/:id/files', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: '请选择要上传的文件' });
    return;
  }

  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id as string } });
    if (!task) {
      res.status(404).json({ error: '任务不存在' });
      return;
    }

    const originalName = normalizeOriginalName(req.file.originalname);
    const ext = path.extname(originalName);
    const filename = `${randomUUID()}${ext}`;
    fs.writeFileSync(path.join(taskUploadDir, filename), req.file.buffer);

    const file = await prisma.taskFile.create({
      data: {
        taskId: task.id,
        filename,
        originalName,
        size: req.file.size,
        mimeType: req.file.mimetype || 'application/octet-stream',
        fileType: req.body.fileType || 'completion',
        uploadedBy: req.userId,
      },
      include: { uploader: { select: { id: true, name: true } } },
    });
    res.status(201).json(file);
  } catch (error) {
    console.error('Failed to upload task file:', error);
    res.status(500).json({ error: '上传任务文件失败' });
  }
});

// DELETE /api/tasks/:id/files/:fileId
router.delete('/:id/files/:fileId', async (req: AuthRequest, res: Response) => {
  try {
    const file = await prisma.taskFile.findUnique({ where: { id: req.params.fileId as string } });
    if (!file || file.taskId !== req.params.id) {
      res.status(404).json({ error: '文件不存在' });
      return;
    }
    await prisma.taskFile.delete({ where: { id: file.id } });
    const filePath = path.join(taskUploadDir, file.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ message: '文件已删除' });
  } catch (error) {
    console.error('Failed to delete task file:', error);
    res.status(500).json({ error: '删除任务文件失败' });
  }
});

// POST /api/tasks/:id/submit-completion
router.post('/:id/submit-completion', async (req: AuthRequest, res: Response) => {
  const submitNote = String(req.body.submitNote || '').trim() || null;

  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id as string },
      include: { _count: { select: { files: true } } },
    });
    if (!task) {
      res.status(404).json({ error: '任务不存在' });
      return;
    }
    if (task.assigneeId && task.assigneeId !== req.userId) {
      res.status(403).json({ error: '只有任务负责人可以提交任务完成' });
      return;
    }
    if (task._count.files === 0) {
      res.status(400).json({ error: '请先上传任务完成支持文件，再提交完成审批' });
      return;
    }
    const pending = await prisma.approvalRecord.findFirst({
      where: { requestId: task.id, requestType: 'task_completion', status: 'pending' },
    });
    if (pending) {
      res.status(400).json({ error: '该任务已有待处理的完成审批' });
      return;
    }

    const result = await createApprovalRecordsForTask(task, submitNote);
    res.json({
      message: result.autoApproved ? '任务已自动完成' : '任务完成申请已提交审批',
      nextStep: result.autoApproved ? 'done' : 'review',
      ...result,
    });
  } catch (error: any) {
    console.error('Failed to submit task completion:', error);
    res.status(500).json({ error: error?.message || '提交任务完成审批失败' });
  }
});

// GET /api/tasks/:id/approval-progress
router.get('/:id/approval-progress', async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, status: true, completionSubmittedAt: true, completionApprovedAt: true, completionNote: true },
    });
    const records = await prisma.approvalRecord.findMany({
      where: { requestId: req.params.id as string, requestType: 'task_completion' },
      include: { approver: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const pendingCount = records.filter((record) => record.status === 'pending').length;
    const approvedCount = records.filter((record) => record.status === 'approved').length;
    const rejectedCount = records.filter((record) => record.status === 'rejected').length;
    const submitted = records.length > 0 || Boolean(task?.completionSubmittedAt);
    let status = 'not_submitted';
    if (task?.status === 'done') status = 'completed';
    else if (rejectedCount > 0) status = 'rejected';
    else if (pendingCount > 0 || task?.status === 'review') status = 'pending_completion_approval';
    else if (submitted && approvedCount === records.length && records.length > 0) status = 'approved';

    res.json({
      status,
      submitted,
      pendingCount,
      approvedCount,
      rejectedCount,
      totalSteps: records.length,
      completionSubmittedAt: task?.completionSubmittedAt,
      completionApprovedAt: task?.completionApprovedAt,
      completionNote: task?.completionNote,
      records,
    });
  } catch (error) {
    console.error('Failed to fetch task approval progress:', error);
    res.status(500).json({ error: '获取任务审批进度失败' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { title, description, status, priority, assigneeId, sortOrder, relativeToTarget, startOffsetDays, dueOffsetDays, progress } = req.body;

  try {
    const oldTask = await prisma.task.findUnique({ where: { id: req.params.id as string as string } });
    if (!oldTask) {
      res.status(404).json({ error: '任务不存在' });
      return;
    }

    const dates = await getTaskDates(oldTask.projectId, req.body, prisma);
    const task = await prisma.task.update({
      where: { id: req.params.id as string as string },
      data: {
        ...(title ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(assigneeId !== undefined ? { assigneeId: assigneeId || null } : {}),
        ...(dates.startDate !== undefined ? { startDate: dates.startDate } : {}),
        ...(dates.dueDate !== undefined ? { dueDate: dates.dueDate } : {}),
        ...(relativeToTarget !== undefined ? { relativeToTarget: Boolean(relativeToTarget) } : {}),
        ...(startOffsetDays !== undefined ? { startOffsetDays: startOffsetDays !== '' && startOffsetDays !== null ? Number(startOffsetDays) : null } : {}),
        ...(dueOffsetDays !== undefined ? { dueOffsetDays: dueOffsetDays !== '' && dueOffsetDays !== null ? Number(dueOffsetDays) : null } : {}),
        ...(progress !== undefined ? { progress: Math.max(0, Math.min(100, Number(progress) || 0)) } : {}),
        ...(status === 'done' ? { completedAt: oldTask.completedAt || new Date(), progress: 100 } : {}),
        ...(status && status !== 'done' ? { completedAt: null } : {}),
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
    await prisma.task.delete({ where: { id: req.params.id as string as string } });
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
          taskId: req.params.id as string as string,
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
        taskId: req.params.id as string as string,
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
      where: { id: req.params.depId as string as string },
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
    const task = await prisma.task.findUnique({ where: { id: req.params.id as string as string } });
    if (!task) {
      res.status(404).json({ error: '任务不存在' });
      return;
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId: req.params.id as string as string,
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
      where: { taskId: req.params.id as string as string },
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
        taskId: req.params.id as string as string,
        userId: req.userId!,
        progress: Math.max(0, Math.min(100, progress || 0)),
        note: note || '',
      },
    });

    // Auto-update task status based on progress
    if (progress >= 100) {
      await prisma.task.update({
        where: { id: req.params.id as string as string },
        data: { status: 'done', completedAt: new Date() },
      });
    } else if (progress > 0) {
      await prisma.task.update({
        where: { id: req.params.id as string as string },
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
      where: { taskId: req.params.id as string as string },
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
      where: { taskId: req.params.id as string as string },
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
