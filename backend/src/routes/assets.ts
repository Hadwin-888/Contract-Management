import { Router, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.use(authenticateToken);

const SETTING_CATEGORIES = [
  'cost_center',
  'warehouse',
  'item_category',
  'item_unit',
  'asset_type',
  'tax_rate',
  'operation_type',
  'invoice_type',
] as const;

function text(value: unknown) {
  return String(value ?? '').trim();
}

function statusValue(value: unknown) {
  const v = text(value).toLowerCase();
  if (['inactive', '停用', 'disabled', '0'].includes(v)) return 'inactive';
  return 'active';
}

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function dateText() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function serial(prefix: string) {
  return `${prefix}-${dateText()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function jsonToSheetBuffer(rows: any[], sheetName: string) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function parseAssetItemFilters(query: AuthRequest['query']) {
  return {
    q: text(query.q),
    itemUnit: text(query.itemUnit),
    bsstype: text(query.bsstype),
    assettype: text(query.assettype),
    status: text(query.status),
    approvalStatus: text(query.approvalStatus),
  };
}

function assetItemWhere(filters: ReturnType<typeof parseAssetItemFilters>) {
  const where: any = {};
  if (filters.q) {
    where.OR = [
      { itemNo: { contains: filters.q, mode: 'insensitive' } },
      { itemName: { contains: filters.q, mode: 'insensitive' } },
      { itemBrand: { contains: filters.q, mode: 'insensitive' } },
      { itemDec: { contains: filters.q, mode: 'insensitive' } },
    ];
  }
  if (filters.itemUnit) where.itemUnit = filters.itemUnit;
  if (filters.bsstype) where.bsstype = filters.bsstype;
  if (filters.assettype) where.assettype = filters.assettype;
  if (filters.status) where.status = filters.status;
  return where;
}

function assetApprovalLabel(status?: string | null) {
  if (status === 'pending') return '审批中';
  if (status === 'approved') return '已通过';
  if (status === 'rejected') return '已驳回';
  return '无审批';
}

async function listAssetItemsWithApproval(filters: ReturnType<typeof parseAssetItemFilters>) {
  const baseItems = await prisma.assetItem.findMany({
    where: assetItemWhere(filters),
    orderBy: { updatedAt: 'desc' },
    take: 500,
  });

  const itemIds = baseItems.map((item) => item.id);
  const itemNos = baseItems.map((item) => item.itemNo);
  const changeRequests = await prisma.assetChangeRequest.findMany({
    where: {
      entityType: 'item',
      OR: [
        itemIds.length ? { entityId: { in: itemIds } } : {},
        { action: 'create' },
      ],
    },
    include: { requester: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });

  const requestIds = changeRequests.map((request) => request.id);
  const pendingRecords = requestIds.length
    ? await prisma.approvalRecord.findMany({
        where: { requestType: 'asset_item', requestId: { in: requestIds }, status: 'pending' },
        include: { approver: { select: { id: true, name: true } } },
      })
    : [];
  const approverMap = new Map<string, string[]>();
  for (const record of pendingRecords) {
    const names = approverMap.get(record.requestId) || [];
    if (record.approver?.name && !names.includes(record.approver.name)) names.push(record.approver.name);
    approverMap.set(record.requestId, names);
  }

  const latestByEntityId = new Map<string, any>();
  const latestByItemNo = new Map<string, any>();
  for (const request of changeRequests) {
    if (request.entityId && !latestByEntityId.has(request.entityId)) latestByEntityId.set(request.entityId, request);
    const payload = request.payload as any;
    if (payload?.itemNo && !latestByItemNo.has(payload.itemNo)) latestByItemNo.set(payload.itemNo, request);
  }

  const rows = baseItems.map((item) => {
    const change = latestByEntityId.get(item.id) || latestByItemNo.get(item.itemNo);
    const approvalStatus = change?.status || 'none';
    return {
      ...item,
      approvalStatus,
      approvalStatusLabel: assetApprovalLabel(approvalStatus),
      pendingApprovers: change?.status === 'pending' ? approverMap.get(change.id) || [] : [],
      approvalAction: change?.action || null,
      approvalRequestId: change?.id || null,
      approvalSubmitNote: change?.submitNote || null,
    };
  });

  const knownNos = new Set(itemNos);
  const pendingCreates = changeRequests
    .filter((request) => request.action === 'create' && request.status === 'pending')
    .filter((request) => {
      const payload = request.payload as any;
      if (!payload?.itemNo || knownNos.has(payload.itemNo)) return false;
      if (filters.q) {
        const haystack = [payload.itemNo, payload.itemName, payload.itemBrand, payload.itemDec].join(' ').toLowerCase();
        if (!haystack.includes(filters.q.toLowerCase())) return false;
      }
      if (filters.itemUnit && payload.itemUnit !== filters.itemUnit) return false;
      if (filters.bsstype && payload.bsstype !== filters.bsstype) return false;
      if (filters.assettype && payload.assettype !== filters.assettype) return false;
      if (filters.status && payload.status !== filters.status) return false;
      return true;
    })
    .map((request) => {
      const payload = request.payload as any;
      return {
        id: `pending-${request.id}`,
        itemNo: payload.itemNo,
        itemName: payload.itemName,
        itemDec: payload.itemDec || null,
        itemBrand: payload.itemBrand || null,
        itemUnit: payload.itemUnit || null,
        bsstype: payload.bsstype || null,
        assettype: payload.assettype || null,
        status: payload.status || 'active',
        remark: payload.remark || null,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        approvalStatus: request.status,
        approvalStatusLabel: assetApprovalLabel(request.status),
        pendingApprovers: approverMap.get(request.id) || [],
        approvalAction: request.action,
        approvalRequestId: request.id,
        approvalSubmitNote: request.submitNote || null,
        isPendingCreate: true,
      };
    });

  const allRows = [...pendingCreates, ...rows];
  const filteredRows = filters.approvalStatus
    ? allRows.filter((row) => row.approvalStatus === filters.approvalStatus)
    : allRows;
  return filteredRows;
}

function sendWorkbook(res: Response, filename: string, buffer: Buffer) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.send(buffer);
}

function rowValue(row: Record<string, any>, names: string[]) {
  for (const name of names) {
    const value = row[name];
    if (value !== undefined && value !== null && text(value) !== '') return value;
  }
  return '';
}

function decodeCsvBuffer(buffer: Buffer) {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  if (!utf8.includes('�')) return utf8.replace(/^\uFEFF/, '');
  return new TextDecoder('gb18030', { fatal: false }).decode(buffer).replace(/^\uFEFF/, '');
}

function readWorkbookFromUpload(file: Express.Multer.File) {
  const originalName = file.originalname || '';
  const isCsv = originalName.toLowerCase().endsWith('.csv') || file.mimetype.includes('csv');
  if (isCsv) {
    return XLSX.read(decodeCsvBuffer(file.buffer), { type: 'string' });
  }
  return XLSX.read(file.buffer, { type: 'buffer' });
}

async function createApprovalRecords(changeRequest: any, module: string, title: string) {
  const flow = await prisma.approvalFlow.findFirst({
    where: { module, isActive: true },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  });

  if (!flow || flow.steps.length === 0) {
    return { autoApproved: true, createdApprovalCount: 0 };
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
          requestId: changeRequest.id,
          requestType: module,
          approverId: userRole.userId,
          status: 'pending',
          submitNote: changeRequest.submitNote,
        },
      });
      createdApprovalCount++;
      await prisma.notification.create({
        data: {
          userId: userRole.userId,
          type: 'approval',
          title,
          module: 'assets',
          refId: changeRequest.id,
        },
      });
    }
  }

  if (createdApprovalCount === 0) {
    throw new Error('审批流未匹配到审批人，请检查审批流角色配置');
  }

  return { autoApproved: false, createdApprovalCount };
}

async function applyAssetChange(changeRequest: any) {
  const payload = changeRequest.payload as any;
  if (changeRequest.entityType === 'item') {
    if (changeRequest.action === 'create') {
      await prisma.assetItem.create({ data: payload });
    } else if (changeRequest.entityId) {
      await prisma.assetItem.update({ where: { id: changeRequest.entityId }, data: payload });
    }
  }
  if (changeRequest.entityType === 'supplier') {
    if (changeRequest.action === 'create') {
      await prisma.assetSupplier.create({ data: payload });
    } else if (changeRequest.entityId) {
      await prisma.assetSupplier.update({ where: { id: changeRequest.entityId }, data: payload });
    }
  }
  await prisma.assetChangeRequest.update({
    where: { id: changeRequest.id },
    data: { status: 'approved', approvedAt: new Date() },
  });
}

export async function approveAssetChangeRequest(requestId: string) {
  const changeRequest = await prisma.assetChangeRequest.findUnique({ where: { id: requestId } });
  if (changeRequest && changeRequest.status === 'pending') await applyAssetChange(changeRequest);
}

export async function rejectAssetChangeRequest(requestId: string) {
  await prisma.assetChangeRequest.updateMany({
    where: { id: requestId, status: 'pending' },
    data: { status: 'rejected' },
  });
}

export async function approveAssetPurchaseRequest(requestId: string) {
  await prisma.assetPurchaseRequest.updateMany({
    where: { id: requestId, status: 'pending' },
    data: { status: 'approved' },
  });
}

export async function rejectAssetPurchaseRequest(requestId: string) {
  await prisma.assetPurchaseRequest.updateMany({
    where: { id: requestId, status: 'pending' },
    data: { status: 'rejected' },
  });
}

export async function approveAssetReceiving(requestId: string) {
  const receipt = await prisma.assetReceivingRecord.findUnique({
    where: { id: requestId },
    include: { items: true },
  });
  if (!receipt || receipt.status !== 'pending') return;

  await prisma.$transaction(async (tx) => {
    await tx.assetReceivingRecord.update({ where: { id: receipt.id }, data: { status: 'approved' } });
    if (receipt.orderId) {
      await tx.assetPurchaseOrder.update({ where: { id: receipt.orderId }, data: { status: 'received' } });
    }
    for (const item of receipt.items) {
      const warehouse = receipt.warehouse || 'DEFAULT';
      await tx.inventoryBalance.upsert({
        where: { itemId_warehouse: { itemId: item.itemId, warehouse } },
        create: { itemId: item.itemId, warehouse, quantity: item.quantity },
        update: { quantity: { increment: item.quantity } },
      });
      await tx.inventoryTransaction.create({
        data: {
          itemId: item.itemId,
          warehouse,
          operationType: 'RC',
          quantity: item.quantity,
          unit: item.unit,
          refType: 'receiving',
          refId: receipt.id,
          remark: receipt.remark,
          createdBy: receipt.receivedBy,
        },
      });
      if (item.orderItemId) {
        await tx.assetPurchaseOrderItem.update({
          where: { id: item.orderItemId },
          data: { receivedQty: { increment: item.quantity } },
        });
      }
    }
  });
}

export async function rejectAssetReceiving(requestId: string) {
  await prisma.assetReceivingRecord.updateMany({
    where: { id: requestId, status: 'pending' },
    data: { status: 'rejected' },
  });
}

router.get('/settings', async (req: AuthRequest, res: Response) => {
  const category = text(req.query.category);
  const items = await prisma.assetSetting.findMany({
    where: category ? { category } : undefined,
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { code: 'asc' }],
  });
  res.json(items);
});

router.post('/settings', async (req: AuthRequest, res: Response) => {
  const { category, code, name, description, status, remark, sortOrder } = req.body;
  if (!SETTING_CATEGORIES.includes(category)) {
    res.status(400).json({ error: '设置分类不正确' });
    return;
  }
  if (!text(code) || !text(name)) {
    res.status(400).json({ error: '代码和名称不能为空' });
    return;
  }
  const item = await prisma.assetSetting.create({
    data: { category, code: text(code), name: text(name), description: text(description) || null, status: statusValue(status), remark: text(remark) || null, sortOrder: Number(sortOrder) || 0 },
  });
  res.status(201).json(item);
});

router.put('/settings/:id', async (req: AuthRequest, res: Response) => {
  const item = await prisma.assetSetting.update({
    where: { id: req.params.id as string },
    data: {
      code: text(req.body.code),
      name: text(req.body.name),
      description: text(req.body.description) || null,
      status: statusValue(req.body.status),
      remark: text(req.body.remark) || null,
      sortOrder: Number(req.body.sortOrder) || 0,
    },
  });
  res.json(item);
});

router.delete('/settings/:id', async (req: AuthRequest, res: Response) => {
  await prisma.assetSetting.delete({ where: { id: req.params.id as string } });
  res.json({ message: '已删除' });
});

router.post('/settings/import-csv', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: '请选择设置 CSV 文件' });
    return;
  }
  const workbook = readWorkbookFromUpload(req.file);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
  let count = 0;
  const add = async (category: string, code: string, name: string, sortOrder: number, description = '') => {
    if (!text(code) && !text(name)) return;
    const finalCode = text(code) || `${category}-${sortOrder}`;
    const finalName = text(name) || finalCode;
    await prisma.assetSetting.upsert({
      where: { category_code: { category, code: finalCode } },
      create: { category, code: finalCode, name: finalName, description: text(description) || null, sortOrder },
      update: { name: finalName, description: text(description) || null, sortOrder },
    });
    count++;
  };

  for (const row of rows) {
    const sortOrder = Number(row[0]) || 0;
    await add('cost_center', row[0], row[1], sortOrder);
    await add('asset_type', row[4], row[4], sortOrder);
    await add('item_unit', row[5], row[6], sortOrder);
    await add('item_category', row[8], row[7], sortOrder);
    await add('operation_type', row[10], row[11], sortOrder);
    await add('invoice_type', row[12], row[12], sortOrder);
    await add('tax_rate', row[13], row[13], sortOrder);
  }
  res.json({ message: `已导入 ${count} 条设置`, count });
});

router.get('/items', async (req: AuthRequest, res: Response) => {
  const items = await listAssetItemsWithApproval(parseAssetItemFilters(req.query));
  res.json({ items, total: items.length });
});

router.get('/items/export', async (req: AuthRequest, res: Response) => {
  const items = await listAssetItemsWithApproval(parseAssetItemFilters(req.query));
  const rows = items.map((item: any) => ({
    item_no: item.itemNo,
    item_name: item.itemName,
    item_dec: item.itemDec,
    item_brand: item.itemBrand,
    item_unit: item.itemUnit,
    bsstype: item.bsstype,
    assettype: item.assettype,
    status: item.status === 'active' ? '启用' : '停用',
    approval_status: item.approvalStatusLabel,
    pending_approvers: (item.pendingApprovers || []).join('、'),
    remark: item.remark,
  }));
  sendWorkbook(res, '物资品项.xlsx', jsonToSheetBuffer(rows, '物资品项'));
});

router.get('/items/import-template', async (_req: AuthRequest, res: Response) => {
  const workbook = XLSX.utils.book_new();
  const headers = [
    'item_no',
    'item_name',
    'item_dec',
    'item_brand',
    'item_unit',
    'bsstype',
    'assettype',
    'status',
    'remark',
    'submit_note',
  ];
  const example = [
    'MI-NEW-001',
    '示例物资名称',
    '示例品项摘要',
    '示例品牌',
    'EA',
    'Guest Supplies 客用品',
    'Cost/Expense',
    'active',
    '',
    '新增物资品项，请审批',
  ];
  const sheet = XLSX.utils.aoa_to_sheet([headers, example]);
  sheet['!cols'] = headers.map((header) => ({ wch: Math.max(14, header.length + 4) }));
  XLSX.utils.book_append_sheet(workbook, sheet, '物资新增模板');
  sendWorkbook(res, '物资新增模板.xlsx', XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
});

router.post('/items/import-change-requests', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: '请选择物资新增模板文件' });
    return;
  }

  const workbook = readWorkbookFromUpload(req.file);
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
  const errors: string[] = [];
  let submittedCount = 0;

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const itemNo = text(rowValue(row, ['item_no', '品项代码']));
    const itemName = text(rowValue(row, ['item_name', '品项名称']));
    if (!itemNo && !itemName) continue;
    if (!itemNo || !itemName) {
      errors.push(`第 ${rowNumber} 行：品项代码和品项名称不能为空`);
      continue;
    }
    const existing = await prisma.assetItem.findUnique({ where: { itemNo } });
    if (existing) {
      errors.push(`第 ${rowNumber} 行：品项代码 ${itemNo} 已存在，请勿通过新增模板重复新增`);
      continue;
    }
  }

  if (errors.length > 0) {
    res.status(400).json({ error: '导入校验失败', details: errors });
    return;
  }

  for (const row of rows) {
    const itemNo = text(rowValue(row, ['item_no', '品项代码']));
    const itemName = text(rowValue(row, ['item_name', '品项名称']));
    if (!itemNo || !itemName) continue;
    const payload = {
      itemNo,
      itemName,
      itemDec: text(rowValue(row, ['item_dec', '品项摘要'])) || null,
      itemBrand: text(rowValue(row, ['item_brand', '品项品牌'])) || null,
      itemUnit: text(rowValue(row, ['item_unit', '品项单位'])) || null,
      bsstype: text(rowValue(row, ['bsstype', '品项分类'])) || null,
      assettype: text(rowValue(row, ['assettype', '资产类型'])) || null,
      status: statusValue(rowValue(row, ['status', '状态'])),
      remark: text(rowValue(row, ['remark', '备注'])) || null,
    };
    const submitNote = text(rowValue(row, ['submit_note', '审批说明'])) || '批量导入新增物资品项';
    const request = await prisma.assetChangeRequest.create({
      data: { entityType: 'item', entityId: null, action: 'create', payload, submitNote, requestedBy: req.userId! },
    });
    const result = await createApprovalRecords(request, 'asset_item', `有新的物资品项新增需要审批: ${payload.itemName}`);
    if (result.autoApproved) await applyAssetChange(request);
    submittedCount++;
  }

  res.status(201).json({ message: `已提交 ${submittedCount} 个物资品项新增审批`, count: submittedCount });
});

router.post('/items/import', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: '请选择导入文件' });
    return;
  }
  const workbook = readWorkbookFromUpload(req.file);
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
  let count = 0;
  for (const row of rows) {
    const itemNo = text(rowValue(row, ['item_no', '品项代码']));
    const itemName = text(rowValue(row, ['item_name', '品项名称']));
    if (!itemNo || !itemName) continue;
    await prisma.assetItem.upsert({
      where: { itemNo },
      create: {
        itemNo,
        itemName,
        itemDec: text(rowValue(row, ['item_dec', '品项摘要'])) || null,
        itemBrand: text(rowValue(row, ['item_brand', '品项品牌'])) || null,
        itemUnit: text(rowValue(row, ['item_unit', '品项单位'])) || null,
        bsstype: text(rowValue(row, ['bsstype', '品项分类'])) || null,
        assettype: text(rowValue(row, ['assettype', '资产类型'])) || null,
        status: statusValue(rowValue(row, ['status', '状态'])),
        remark: text(rowValue(row, ['remark', '备注'])) || null,
      },
      update: {
        itemName,
        itemDec: text(rowValue(row, ['item_dec', '品项摘要'])) || null,
        itemBrand: text(rowValue(row, ['item_brand', '品项品牌'])) || null,
        itemUnit: text(rowValue(row, ['item_unit', '品项单位'])) || null,
        bsstype: text(rowValue(row, ['bsstype', '品项分类'])) || null,
        assettype: text(rowValue(row, ['assettype', '资产类型'])) || null,
        status: statusValue(rowValue(row, ['status', '状态'])),
        remark: text(rowValue(row, ['remark', '备注'])) || null,
      },
    });
    count++;
  }
  res.json({ message: `已导入 ${count} 个物资品项`, count });
});

router.post('/items/change-request', async (req: AuthRequest, res: Response) => {
  const { id, submitNote, ...payload } = req.body;
  if (!text(payload.itemNo) || !text(payload.itemName)) {
    res.status(400).json({ error: '品项代码和品项名称不能为空' });
    return;
  }
  const request = await prisma.assetChangeRequest.create({
    data: { entityType: 'item', entityId: id || null, action: id ? 'update' : 'create', payload, submitNote: text(submitNote) || null, requestedBy: req.userId! },
  });
  const result = await createApprovalRecords(request, 'asset_item', `有新的物资品项${id ? '变更' : '新增'}需要审批: ${payload.itemName}`);
  if (result.autoApproved) await applyAssetChange(request);
  res.status(201).json({ ...request, ...result });
});

router.put('/items/:id/status', async (req: AuthRequest, res: Response) => {
  const item = await prisma.assetItem.update({ where: { id: req.params.id as string }, data: { status: statusValue(req.body.status) } });
  res.json(item);
});

router.delete('/items/:id', async (req: AuthRequest, res: Response) => {
  await prisma.assetItem.delete({ where: { id: req.params.id as string } });
  res.json({ message: '已删除' });
});

router.get('/suppliers', async (req: AuthRequest, res: Response) => {
  const q = text(req.query.q);
  const items = await prisma.assetSupplier.findMany({
    where: q ? { OR: [{ suppliersId: { contains: q, mode: 'insensitive' } }, { suppliersNameCn: { contains: q, mode: 'insensitive' } }] } : undefined,
    orderBy: { updatedAt: 'desc' },
    take: 500,
  });
  res.json({ items, total: items.length });
});

router.get('/suppliers/export', async (_req: AuthRequest, res: Response) => {
  const items = await prisma.assetSupplier.findMany({ orderBy: { suppliersId: 'asc' } });
  sendWorkbook(res, '供应商资料.xlsx', jsonToSheetBuffer(items, '供应商资料'));
});

router.post('/suppliers/import', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: '请选择导入文件' });
    return;
  }
  const workbook = readWorkbookFromUpload(req.file);
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
  let count = 0;
  for (const row of rows) {
    const suppliersId = text(rowValue(row, ['suppliers_id', '供应商ID']));
    const suppliersNameCn = text(rowValue(row, ['suppliers_name_cn', '供应商中文名']));
    if (!suppliersId || !suppliersNameCn) continue;
    const data = {
      suppliersId,
      suppliersNameCn,
      suppliersNameEn: text(rowValue(row, ['suppliers_name_en', '供应商英文名'])) || null,
      suppliersCity: text(rowValue(row, ['suppliers_city', '供应商城市'])) || null,
      contactPerson: text(rowValue(row, ['contact_person', '联系人'])) || null,
      contactTitle: text(rowValue(row, ['contact_title', '联系人职务'])) || null,
      contactNumber: text(rowValue(row, ['contact_number', '联系电话'])) || null,
      email: text(rowValue(row, ['email', '邮箱'])) || null,
      invoiceName: text(rowValue(row, ['invoice_name', '发票名称'])) || null,
      taxId: text(rowValue(row, ['tax_ID', 'tax_id', '纳税识别号'])) || null,
      invoiceAdd: text(rowValue(row, ['invoice_add', '发票地址'])) || null,
      bank: text(rowValue(row, ['bank', '开户行信息'])) || null,
      bankAccountNo: text(rowValue(row, ['bank_account_no', '银行账号'])) || null,
      status: statusValue(rowValue(row, ['status', '状态'])),
    };
    await prisma.assetSupplier.upsert({ where: { suppliersId }, create: data, update: data });
    count++;
  }
  res.json({ message: `已导入 ${count} 个供应商`, count });
});

router.post('/suppliers/change-request', async (req: AuthRequest, res: Response) => {
  const { id, submitNote, ...payload } = req.body;
  if (!text(payload.suppliersId) || !text(payload.suppliersNameCn)) {
    res.status(400).json({ error: '供应商ID和中文名不能为空' });
    return;
  }
  const request = await prisma.assetChangeRequest.create({
    data: { entityType: 'supplier', entityId: id || null, action: id ? 'update' : 'create', payload, submitNote: text(submitNote) || null, requestedBy: req.userId! },
  });
  const result = await createApprovalRecords(request, 'asset_supplier', `有新的供应商${id ? '变更' : '新增'}需要审批: ${payload.suppliersNameCn}`);
  if (result.autoApproved) await applyAssetChange(request);
  res.status(201).json({ ...request, ...result });
});

router.put('/suppliers/:id/status', async (req: AuthRequest, res: Response) => {
  const supplier = await prisma.assetSupplier.update({ where: { id: req.params.id as string }, data: { status: statusValue(req.body.status) } });
  res.json(supplier);
});

router.delete('/suppliers/:id', async (req: AuthRequest, res: Response) => {
  await prisma.assetSupplier.delete({ where: { id: req.params.id as string } });
  res.json({ message: '已删除' });
});

router.get('/purchase-requests', async (_req: AuthRequest, res: Response) => {
  const items = await prisma.assetPurchaseRequest.findMany({
    include: {
      requester: { select: { id: true, name: true } },
      items: {
        include: {
          item: true,
          supplier: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ items, total: items.length });
});

router.post('/purchase-requests', async (req: AuthRequest, res: Response) => {
  const rows = Array.isArray(req.body.items) ? req.body.items : [];
  if (!text(req.body.title)) {
    res.status(400).json({ error: '采购申请标题不能为空' });
    return;
  }
  if (rows.length === 0) {
    res.status(400).json({ error: '请至少添加一个采购明细' });
    return;
  }
  const totalAmount = rows.reduce((sum: number, row: any) => sum + num(row.quantity, 1) * num(row.unitPrice, 0), 0);
  const request = await prisma.assetPurchaseRequest.create({
    data: {
      requestNo: serial('PR'),
      title: text(req.body.title),
      department: text(req.body.department) || null,
      costCenter: text(req.body.costCenter) || null,
      reason: text(req.body.reason) || null,
      requesterId: req.userId!,
      totalAmount,
      items: {
        create: rows.map((row: any) => {
          const quantity = num(row.quantity, 1);
          const unitPrice = num(row.unitPrice, 0);
          return {
            itemId: row.itemId,
            supplierId: row.supplierId || null,
            quantity,
            unit: text(row.unit) || null,
            unitPrice,
            taxRate: num(row.taxRate, 0),
            amount: quantity * unitPrice,
            remark: text(row.remark) || null,
          };
        }),
      },
    },
    include: { items: { include: { item: true, supplier: true } }, requester: { select: { id: true, name: true } } },
  });
  res.status(201).json(request);
});

router.post('/purchase-requests/:id/submit', async (req: AuthRequest, res: Response) => {
  const request = await prisma.assetPurchaseRequest.findUnique({ where: { id: req.params.id as string } });
  if (!request) {
    res.status(404).json({ error: '采购申请不存在' });
    return;
  }
  await prisma.assetPurchaseRequest.update({
    where: { id: request.id },
    data: { status: 'pending', submitNote: text(req.body.submitNote) || null },
  });
  const result = await createApprovalRecords({ id: request.id, submitNote: text(req.body.submitNote) || null }, 'asset_purchase_request', `有新的资产采购申请需要审批: ${request.title}`);
  if (result.autoApproved) await approveAssetPurchaseRequest(request.id);
  res.json({ message: result.autoApproved ? '采购申请已自动通过' : '采购申请已提交审批', ...result });
});

router.post('/purchase-requests/:id/generate-order', async (req: AuthRequest, res: Response) => {
  const request = await prisma.assetPurchaseRequest.findUnique({
    where: { id: req.params.id as string },
    include: { items: true },
  });
  if (!request) {
    res.status(404).json({ error: '采购申请不存在' });
    return;
  }
  if (request.status !== 'approved') {
    res.status(400).json({ error: '只有已审批通过的采购申请可以生成采购订单' });
    return;
  }
  const supplierId = text(req.body.supplierId) || request.items.find((item) => item.supplierId)?.supplierId;
  if (!supplierId) {
    res.status(400).json({ error: '请先为采购明细选择供应商' });
    return;
  }
  const selectedItems = request.items.filter((item) => !item.supplierId || item.supplierId === supplierId);
  const order = await prisma.assetPurchaseOrder.create({
    data: {
      orderNo: serial('PO'),
      requestId: request.id,
      supplierId,
      totalAmount: selectedItems.reduce((sum, item) => sum + item.amount, 0),
      orderedDate: new Date(),
      createdBy: req.userId,
      items: {
        create: selectedItems.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          amount: item.amount,
          remark: item.remark,
        })),
      },
    },
    include: { supplier: true, items: { include: { item: true } } },
  });
  await prisma.assetPurchaseRequest.update({ where: { id: request.id }, data: { status: 'ordered' } });
  res.status(201).json(order);
});

router.get('/purchase-orders', async (_req: AuthRequest, res: Response) => {
  const items = await prisma.assetPurchaseOrder.findMany({
    include: { supplier: true, request: true, items: { include: { item: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ items, total: items.length });
});

router.get('/purchase-requests/export', async (_req: AuthRequest, res: Response) => {
  const rows = await prisma.assetPurchaseRequest.findMany({ include: { requester: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
  sendWorkbook(res, '资产采购申请.xlsx', jsonToSheetBuffer(rows.map((row) => ({
    requestNo: row.requestNo,
    title: row.title,
    requester: row.requester.name,
    status: row.status,
    totalAmount: row.totalAmount,
    createdAt: row.createdAt,
  })), '采购申请'));
});

router.post('/receiving', async (req: AuthRequest, res: Response) => {
  const order = req.body.orderId
    ? await prisma.assetPurchaseOrder.findUnique({ where: { id: req.body.orderId }, include: { items: true } })
    : null;
  const rows = Array.isArray(req.body.items) && req.body.items.length > 0
    ? req.body.items
    : order?.items.map((item) => ({
        orderItemId: item.id,
        itemId: item.itemId,
        quantity: Math.max(0, item.quantity - item.receivedQty),
        unit: item.unit,
        unitPrice: item.unitPrice,
      })) || [];
  if (rows.length === 0) {
    res.status(400).json({ error: '请至少添加一个收货明细' });
    return;
  }
  const receipt = await prisma.assetReceivingRecord.create({
    data: {
      receiptNo: serial('RC'),
      orderId: req.body.orderId || null,
      warehouse: text(req.body.warehouse) || 'DEFAULT',
      receivedBy: req.userId,
      remark: text(req.body.remark) || null,
      items: {
        create: rows.filter((row: any) => num(row.quantity, 0) > 0).map((row: any) => {
          const quantity = num(row.quantity, 1);
          const unitPrice = num(row.unitPrice, 0);
          return {
            orderItemId: row.orderItemId || null,
            itemId: row.itemId,
            quantity,
            unit: text(row.unit) || null,
            unitPrice,
            amount: quantity * unitPrice,
            remark: text(row.remark) || null,
          };
        }),
      },
    },
    include: { order: true, items: { include: { item: true } } },
  });
  res.status(201).json(receipt);
});

router.get('/receiving', async (_req: AuthRequest, res: Response) => {
  const items = await prisma.assetReceivingRecord.findMany({
    include: { order: true, items: { include: { item: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ items, total: items.length });
});

router.post('/receiving/:id/submit', async (req: AuthRequest, res: Response) => {
  const receipt = await prisma.assetReceivingRecord.findUnique({ where: { id: req.params.id as string } });
  if (!receipt) {
    res.status(404).json({ error: '收货单不存在' });
    return;
  }
  await prisma.assetReceivingRecord.update({
    where: { id: receipt.id },
    data: { status: 'pending', submitNote: text(req.body.submitNote) || null },
  });
  const result = await createApprovalRecords({ id: receipt.id, submitNote: text(req.body.submitNote) || null }, 'asset_receiving', `有新的收货入库申请需要审批: ${receipt.receiptNo}`);
  if (result.autoApproved) await approveAssetReceiving(receipt.id);
  res.json({ message: result.autoApproved ? '收货单已自动入库' : '收货单已提交审批', ...result });
});

router.get('/inventory/balances', async (_req: AuthRequest, res: Response) => {
  const items = await prisma.inventoryBalance.findMany({
    include: { item: true },
    orderBy: [{ warehouse: 'asc' }, { updatedAt: 'desc' }],
    take: 500,
  });
  res.json({ items, total: items.length });
});

router.get('/inventory/transactions', async (_req: AuthRequest, res: Response) => {
  const items = await prisma.inventoryTransaction.findMany({
    include: { item: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  res.json({ items, total: items.length });
});

export default router;
