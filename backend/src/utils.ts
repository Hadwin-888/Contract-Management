/**
 * Shared utility functions used across route modules.
 */

export function toDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function daysBetween(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.ceil((end - start) / 86400000);
}

export function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

export function truthyText(value: unknown): boolean {
  const text = normalizeText(value).toLowerCase();
  return ['是', 'yes', 'y', 'true', '1', '开启'].includes(text);
}

export function priorityValue(value: unknown): string {
  const text = normalizeText(value);
  const map: Record<string, string> = {
    高: 'high',
    high: 'high',
    中: 'medium',
    medium: 'medium',
    低: 'low',
    low: 'low',
  };
  return map[text] || map[text.toLowerCase()] || 'medium';
}

export function normalizeOriginalName(name: string): string {
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('�') ? name : decoded;
}

export function getRowValue(row: Record<string, any>, names: string[]): any {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && normalizeText(row[name]) !== '') return row[name];
  }
  return '';
}

/**
 * Compute task start/due dates based on project target date offset or absolute dates.
 */
export async function getTaskDates(
  projectId: string,
  payload: any,
  prisma: any,
): Promise<{ startDate: Date | null | undefined; dueDate: Date | null | undefined }> {
  const relativeToTarget = Boolean(payload.relativeToTarget);
  if (!relativeToTarget) {
    return {
      startDate: payload.startDate !== undefined ? toDate(payload.startDate) : undefined,
      dueDate: payload.dueDate !== undefined ? toDate(payload.dueDate) : undefined,
    };
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { targetDate: true, endDate: true },
  });
  const targetDate = project?.targetDate || project?.endDate;
  if (!targetDate) {
    return {
      startDate: payload.startDate !== undefined ? toDate(payload.startDate) : undefined,
      dueDate: payload.dueDate !== undefined ? toDate(payload.dueDate) : undefined,
    };
  }

  const startOffset = payload.startOffsetDays !== undefined && payload.startOffsetDays !== null && payload.startOffsetDays !== ''
    ? Number(payload.startOffsetDays)
    : null;
  const dueOffset = payload.dueOffsetDays !== undefined && payload.dueOffsetDays !== null && payload.dueOffsetDays !== ''
    ? Number(payload.dueOffsetDays)
    : null;

  return {
    startDate: startOffset !== null && Number.isFinite(startOffset) ? addDays(targetDate, startOffset) : undefined,
    dueDate: dueOffset !== null && Number.isFinite(dueOffset) ? addDays(targetDate, dueOffset) : undefined,
  };
}
