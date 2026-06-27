import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import prisma from '../prisma.js';
import {
  approveAssetChangeRequest,
  rejectAssetChangeRequest,
  approveAssetPurchaseRequest,
  rejectAssetPurchaseRequest,
  approveAssetReceiving,
  rejectAssetReceiving,
} from './assets.js';

const router = Router();

router.use(authenticateToken);

function approvalModule(requestType: string) {
  if (requestType === 'contract') return 'contract';
  if (requestType === 'procurement') return 'procurement';
  if (requestType === 'project_completion') return 'project';
  if (requestType === 'task_completion') return 'project';
  if (requestType === 'asset_item' || requestType === 'asset_supplier') return 'assets';
  if (requestType === 'asset_purchase_request' || requestType === 'asset_receiving') return 'assets';
  return requestType;
}

function approvalEntityName(requestType: string) {
  if (requestType === 'contract') return '合同';
  if (requestType === 'procurement') return '采购申请';
  if (requestType === 'project_completion') return '项目完成申请';
  if (requestType === 'task_completion') return '任务完成申请';
  if (requestType === 'asset_item') return '物资品项变更申请';
  if (requestType === 'asset_supplier') return '供应商变更申请';
  if (requestType === 'asset_purchase_request') return '资产采购申请';
  if (requestType === 'asset_receiving') return '收货入库申请';
  return '审批申请';
}

async function approveApprovalRecord(recordId: string, userId: string, comment?: string) {
  const record = await prisma.approvalRecord.findUnique({
    where: { id: recordId },
    include: { contract: true, procurementRequest: true },
  });

  if (!record) throw new Error('审批记录不存在');
  if (record.approverId !== userId) throw new Error('您不是该审批步骤的审批人');
  if (record.status !== 'pending') throw new Error('该审批已被处理');

  await prisma.approvalRecord.update({
    where: { id: record.id },
    data: { status: 'approved', comment: comment || null },
  });

  const flowSteps = await prisma.approvalFlowStep.findMany({
    where: { flowId: record.flowId! },
    orderBy: { stepOrder: 'asc' },
  });
  const allApprovalsForFlow = await prisma.approvalRecord.findMany({
    where: { flowId: record.flowId!, requestId: record.requestId, requestType: record.requestType },
  });
  const currentStepApprovals = allApprovalsForFlow.filter((approval) => approval.stepId === record.stepId);
  const allCurrentStepApproved = currentStepApprovals.every((approval) => approval.status === 'approved');

  if (!allCurrentStepApproved) return;

  const currentStepIndex = flowSteps.findIndex((step) => step.id === record.stepId);

  // Check all prior steps are fully approved before finalizing
  const priorSteps = flowSteps.slice(0, currentStepIndex);
  for (const priorStep of priorSteps) {
    const priorApprovals = allApprovalsForFlow.filter((a) => a.stepId === priorStep.id);
    if (!priorApprovals.every((a) => a.status === 'approved')) return;
  }

  if (currentStepIndex < flowSteps.length - 1) return;

  if (record.requestType === 'contract' && record.contract) {
    await prisma.contract.update({
      where: { id: record.requestId },
      data: {
        status: 'pending_archive',
        archiveStatus: 'pending_upload',
        approvalApprovedAt: new Date(),
      },
    });
  } else if (record.requestType === 'procurement' && record.procurementRequest) {
    await prisma.procurementRequest.update({
      where: { id: record.requestId },
      data: { status: 'approved' },
    });
  } else if (record.requestType === 'project_completion') {
    await prisma.project.update({
      where: { id: record.requestId },
      data: { status: 'completed', progress: 100, completionApprovedAt: new Date() },
    });
  } else if (record.requestType === 'task_completion') {
    await prisma.task.update({
      where: { id: record.requestId },
      data: { status: 'done', progress: 100, completedAt: new Date(), completionApprovedAt: new Date() },
    });
  } else if (record.requestType === 'asset_item' || record.requestType === 'asset_supplier') {
    await approveAssetChangeRequest(record.requestId);
  } else if (record.requestType === 'asset_purchase_request') {
    await approveAssetPurchaseRequest(record.requestId);
  } else if (record.requestType === 'asset_receiving') {
    await approveAssetReceiving(record.requestId);
  }

  const project = record.requestType === 'project_completion'
    ? await prisma.project.findUnique({ where: { id: record.requestId }, select: { ownerId: true } })
    : null;
  const task = record.requestType === 'task_completion'
    ? await prisma.task.findUnique({ where: { id: record.requestId }, select: { assigneeId: true, projectId: true } })
    : null;
  const assetChange = record.requestType === 'asset_item' || record.requestType === 'asset_supplier'
    ? await prisma.assetChangeRequest.findUnique({ where: { id: record.requestId }, select: { requestedBy: true } })
    : null;
  const assetPurchase = record.requestType === 'asset_purchase_request'
    ? await prisma.assetPurchaseRequest.findUnique({ where: { id: record.requestId }, select: { requesterId: true } })
    : null;
  const assetReceiving = record.requestType === 'asset_receiving'
    ? await prisma.assetReceivingRecord.findUnique({ where: { id: record.requestId }, select: { receivedBy: true } })
    : null;
  const requesterId = record.requestType === 'contract'
    ? record.contract?.userId
    : record.requestType === 'project_completion'
      ? project?.ownerId
      : record.requestType === 'task_completion'
        ? task?.assigneeId
        : record.requestType === 'asset_item' || record.requestType === 'asset_supplier'
          ? assetChange?.requestedBy
          : record.requestType === 'asset_purchase_request'
            ? assetPurchase?.requesterId
            : record.requestType === 'asset_receiving'
              ? assetReceiving?.receivedBy
              : record.procurementRequest?.requesterId;

  if (requesterId) {
    await prisma.notification.create({
      data: {
        userId: requesterId,
        type: 'approval',
        title: record.requestType === 'contract'
          ? '您的合同已通过审批，请上传双方盖章合同扫描件完成归档'
          : `您的${approvalEntityName(record.requestType)}已通过审批`,
        module: approvalModule(record.requestType),
        refId: task?.projectId || record.requestId,
      },
    });
  }
}

async function rejectApprovalRecord(recordId: string, userId: string, comment?: string) {
  const record = await prisma.approvalRecord.findUnique({ where: { id: recordId } });

  if (!record) throw new Error('审批记录不存在');
  if (record.approverId !== userId) throw new Error('您不是该审批步骤的审批人');
  if (record.status !== 'pending') throw new Error('该审批已被处理');

  await prisma.approvalRecord.update({
    where: { id: record.id },
    data: { status: 'rejected', comment: comment || null },
  });
  await prisma.approvalRecord.updateMany({
    where: { requestId: record.requestId, requestType: record.requestType, status: 'pending' },
    data: { status: 'rejected' },
  });

  if (record.requestType === 'contract') {
    await prisma.contract.update({ where: { id: record.requestId }, data: { status: 'rejected', archiveStatus: 'not_started' } });
  } else if (record.requestType === 'procurement') {
    await prisma.procurementRequest.update({ where: { id: record.requestId }, data: { status: 'rejected' } });
  } else if (record.requestType === 'project_completion') {
    await prisma.project.update({ where: { id: record.requestId }, data: { status: 'active' } });
  } else if (record.requestType === 'task_completion') {
    await prisma.task.update({ where: { id: record.requestId }, data: { status: 'in_progress' } });
  } else if (record.requestType === 'asset_item' || record.requestType === 'asset_supplier') {
    await rejectAssetChangeRequest(record.requestId);
  } else if (record.requestType === 'asset_purchase_request') {
    await rejectAssetPurchaseRequest(record.requestId);
  } else if (record.requestType === 'asset_receiving') {
    await rejectAssetReceiving(record.requestId);
  }

  const parent = record.requestType === 'contract'
    ? await prisma.contract.findUnique({ where: { id: record.requestId } })
    : record.requestType === 'project_completion'
      ? await prisma.project.findUnique({ where: { id: record.requestId } })
      : record.requestType === 'task_completion'
        ? await prisma.task.findUnique({ where: { id: record.requestId } })
        : record.requestType === 'asset_item' || record.requestType === 'asset_supplier'
          ? await prisma.assetChangeRequest.findUnique({ where: { id: record.requestId } })
          : record.requestType === 'asset_purchase_request'
            ? await prisma.assetPurchaseRequest.findUnique({ where: { id: record.requestId } })
            : record.requestType === 'asset_receiving'
              ? await prisma.assetReceivingRecord.findUnique({ where: { id: record.requestId } })
              : await prisma.procurementRequest.findUnique({ where: { id: record.requestId } });
  const requesterId = parent && 'userId' in (parent as any)
    ? (parent as any).userId
    : (parent as any)?.requesterId || (parent as any)?.ownerId || (parent as any)?.assigneeId || (parent as any)?.requestedBy || (parent as any)?.receivedBy;

  if (requesterId) {
    await prisma.notification.create({
      data: {
        userId: requesterId,
        type: 'approval',
        title: `您的${approvalEntityName(record.requestType)}已被驳回`,
        content: comment || undefined,
        module: approvalModule(record.requestType),
        refId: (parent as any)?.projectId || record.requestId,
      },
    });
  }
}

// GET /api/approvals/pending — get pending approvals for current user
router.get('/pending', async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));

  try {
    const where = { approverId: req.userId, status: 'pending' };

    const [total, items] = await Promise.all([
      prisma.approvalRecord.count({ where }),
      prisma.approvalRecord.findMany({
        where,
        include: {
          procurementRequest: {
            include: { requester: { select: { id: true, name: true } } },
          },
          contract: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const projectIds = items.filter((item) => item.requestType === 'project_completion').map((item) => item.requestId);
    const taskIds = items.filter((item) => item.requestType === 'task_completion').map((item) => item.requestId);
    const assetChangeIds = items.filter((item) => item.requestType === 'asset_item' || item.requestType === 'asset_supplier').map((item) => item.requestId);
    const projects = projectIds.length > 0
      ? await prisma.project.findMany({
          where: { id: { in: projectIds } },
          include: { owner: { select: { id: true, name: true } } },
        })
      : [];
    const projectMap = new Map(projects.map((p) => [p.id, p as any]));
    const tasks = taskIds.length > 0
      ? await prisma.task.findMany({
          where: { id: { in: taskIds } },
          include: {
            assignee: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } },
            files: {
              include: { uploader: { select: { id: true, name: true } } },
              orderBy: { uploadedAt: 'desc' },
            },
          },
        })
      : [];
    const taskMap = new Map(tasks.map((t) => [t.id, t as any]));
    const assetChanges = assetChangeIds.length > 0
      ? await prisma.assetChangeRequest.findMany({
          where: { id: { in: assetChangeIds } },
          include: { requester: { select: { id: true, name: true } } },
        })
      : [];
    const assetChangeMap = new Map(assetChanges.map((c) => [c.id, c as any]));

    const result = items.map((item) => {
      const projectEntry = projectMap.get(item.requestId);
      const taskEntry = taskMap.get(item.requestId);
      const assetChangeEntry = assetChangeMap.get(item.requestId);
      return {
        id: item.id,
        requestType: item.requestType,
        requestId: item.requestId,
        status: item.status,
        comment: item.comment,
        createdAt: item.createdAt,
        submitNote: item.submitNote,
        riskScore: item.riskScore,
        criticalIssueCount: item.criticalIssueCount,
        auditSnapshot: item.auditSnapshot,
        title: item.requestType === 'procurement'
          ? item.procurementRequest?.title || '采购申请'
          : item.requestType === 'project_completion'
            ? projectEntry?.name || '项目完成申请'
            : item.requestType === 'task_completion'
              ? taskEntry?.title || '任务完成申请'
              : item.requestType === 'asset_item' || item.requestType === 'asset_supplier'
                ? approvalEntityName(item.requestType)
              : item.contract?.name || '合同',
        requester: item.requestType === 'procurement'
          ? item.procurementRequest?.requester
          : item.requestType === 'project_completion'
            ? projectEntry?.owner
            : item.requestType === 'task_completion'
              ? taskEntry?.assignee
              : item.requestType === 'asset_item' || item.requestType === 'asset_supplier'
                ? assetChangeEntry?.requester
              : item.contract?.user ? { id: item.contract.user.id, name: item.contract.user.name } : null,
        contract: item.requestType === 'contract' && item.contract ? {
          id: item.contract.id,
          name: item.contract.name,
          filePath: item.contract.filePath,
          amount: item.contract.amount,
          partyB: item.contract.partyB,
        } : null,
        project: item.requestType === 'project_completion' && projectEntry ? {
          id: projectEntry.id,
          name: projectEntry.name,
          status: projectEntry.status,
        } : item.requestType === 'task_completion' && taskEntry?.project ? {
          id: taskEntry.project.id,
          name: taskEntry.project.name,
        } : null,
        task: item.requestType === 'task_completion' && taskEntry ? {
          id: taskEntry.id,
          title: taskEntry.title,
          description: taskEntry.description,
          status: taskEntry.status,
          projectId: taskEntry.projectId,
          priority: taskEntry.priority,
          progress: taskEntry.progress,
          startDate: taskEntry.startDate,
          dueDate: taskEntry.dueDate,
          completedAt: taskEntry.completedAt,
          completionNote: taskEntry.completionNote,
          completionSubmittedAt: taskEntry.completionSubmittedAt,
          assignee: taskEntry.assignee,
          files: taskEntry.files,
        } : null,
        assetChange: (item.requestType === 'asset_item' || item.requestType === 'asset_supplier') && assetChangeEntry ? {
          id: assetChangeEntry.id,
          entityType: assetChangeEntry.entityType,
          action: assetChangeEntry.action,
          payload: assetChangeEntry.payload,
          status: assetChangeEntry.status,
        } : null,
      };
    });

    res.json({ items: result, total, page, pageSize });
  } catch (error) {
    console.error('Failed to fetch pending approvals:', error);
    res.status(500).json({ error: '获取待审批列表失败' });
  }
});

// POST /api/approvals/batch — approve or reject multiple pending records
router.post('/batch', async (req: AuthRequest, res: Response) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map((id: unknown) => String(id)).filter(Boolean) : [];
  const action = req.body.action === 'reject' ? 'reject' : 'approve';
  const comment = typeof req.body.comment === 'string' ? req.body.comment : undefined;

  if (ids.length === 0) {
    res.status(400).json({ error: '请选择需要处理的审批事项' });
    return;
  }

  const succeeded: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];
  for (const id of ids) {
    try {
      if (action === 'approve') await approveApprovalRecord(id, req.userId!, comment);
      else await rejectApprovalRecord(id, req.userId!, comment);
      succeeded.push(id);
    } catch (error: any) {
      failed.push({ id, error: error?.message || '处理失败' });
    }
  }

  res.json({
    message: `已处理 ${succeeded.length} 项${failed.length ? `，${failed.length} 项失败` : ''}`,
    succeeded,
    failed,
  });
});

// POST /api/approvals/:id/approve — approve
router.post('/:id/approve', async (req: AuthRequest, res: Response) => {
  const { comment } = req.body;

  try {
    await approveApprovalRecord(req.params.id as string, req.userId!, comment);
    res.json({ message: '已批准' });
  } catch (error) {
    console.error('Failed to approve:', error);
    res.status(500).json({ error: (error as Error).message || '审批失败' });
  }
});

// POST /api/approvals/:id/reject — reject
router.post('/:id/reject', async (req: AuthRequest, res: Response) => {
  const { comment } = req.body;

  try {
    await rejectApprovalRecord(req.params.id as string, req.userId!, comment);
    res.json({ message: '已驳回' });
  } catch (error) {
    console.error('Failed to reject:', error);
    res.status(500).json({ error: (error as Error).message || '驳回失败' });
  }
});

// GET /api/approvals/history — approval history for current user
router.get('/history', async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));

  try {
    const where = { approverId: req.userId, status: { not: 'pending' } };

    const [total, items] = await Promise.all([
      prisma.approvalRecord.count({ where }),
      prisma.approvalRecord.findMany({
        where,
        include: {
          contract: { select: { name: true } },
          procurementRequest: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({ items, total, page, pageSize });
  } catch (error) {
    console.error('Failed to fetch approval history:', error);
    res.status(500).json({ error: '获取审批历史失败' });
  }
});

export default router;
