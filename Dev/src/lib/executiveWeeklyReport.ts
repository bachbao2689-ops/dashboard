import type { Task } from '../hooks/useTasks';
import { taskActive, taskDay, taskDone } from './taskTracking.ts';

export const OUTPUT_UNITS = ['image', 'file', 'page', 'sku', 'option'] as const;
export type OutputUnit = typeof OUTPUT_UNITS[number];
export type ReportOutput = { id: string; name: string; url: string; quantity: number; unit: OutputUnit; kind: 'image' | 'file' | 'link' };
export type ReportNotes = { summary: string; decisions: string; nextWeek: string };
export type ReportEntry = {
  id: string; title: string; ref: string; status: string; workflowStatus?: string | null;
  memberId: string; memberName: string; avatar?: string | null;
  parentId: string; parentName: string; parentKind: 'project' | 'campaign' | 'standalone';
  departmentId: string; departmentName: string; dueDate: string; completedAt: string;
  reported: boolean; body: string; blocker: string; nextStep: string; channel: string;
  outputs: ReportOutput[]; completedAfterPeriod?: boolean;
};
export type ReportSnapshot = {
  schema: 1; weekStart: string; weekEnd: string; departmentId: string; departmentName: string;
  authorName: string; capturedAt: string; notes: ReportNotes; entries: ReportEntry[];
};
export type WeeklyTaskReport = {
  user_id: number; task_key: string;
  metadata?: { body?: string; blocker?: string | null; next_step?: string | null; image_url?: string | null } | null;
};
export type TaskOutputRecord = { entity_type: string; entity_id: string; metadata?: { channel?: unknown; outputs?: unknown } | null };
export const EMPTY_REPORT_NOTES: ReportNotes = { summary: '', decisions: '', nextWeek: '' };

export function safeReportUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; }
  catch { return ''; }
}

export function normalizeOutputs(value: unknown): ReportOutput[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000 || !OUTPUT_UNITS.includes(item.unit)) return [];
    const url = safeReportUrl(item.url);
    return [{ id: String(item.id || index), name: String(item.name || '').slice(0, 200), url, quantity,
      unit: item.unit, kind: item.kind === 'image' && url ? 'image' : item.kind === 'file' ? 'file' : 'link' } as ReportOutput];
  });
}

// An old open item remains WIP; a completion belongs to its actual completion period.
// Unknown historical completion dates are shown separately instead of invented from updated_at.
export function reportPeriodTasks(tasks: Task[], start: string, end: string): Task[] {
  return tasks.filter(task => {
    if (!taskActive(task)) return false;
    const created = taskDay(task.created_at || task.start_date);
    if (created && created > end) return false;
    if (!taskDone(task)) return true;
    const completed = taskDay(task.completed_at);
    return Boolean(completed && completed >= start);
  });
}

export function buildReportEntries(
  tasks: Task[], users: Array<{ id: string; name: string; avatar_url?: string | null; department_id?: string | null; department?: { name?: string } | null }>,
  reports: WeeklyTaskReport[], outputRecords: TaskOutputRecord[], start: string, end: string,
): ReportEntry[] {
  const people = new Map(users.map(user => [String(user.id), user]));
  const latestReports = new Map<string, WeeklyTaskReport>();
  reports.forEach(row => { const key = `${row.user_id}:${row.task_key}`; if (!latestReports.has(key)) latestReports.set(key, row); });
  const outputMap = new Map<string, TaskOutputRecord>();
  outputRecords.forEach(row => {
    const key = row.entity_type === 'project_subtask' ? `ps-${row.entity_id}` : row.entity_type === 'campaign_subtask' ? `cs-${row.entity_id}` : row.entity_id;
    if (!outputMap.has(key)) outputMap.set(key, row);
  });
  return reportPeriodTasks(tasks, start, end).map(task => {
    const person = people.get(String(task.assignee_id));
    const report = latestReports.get(`${task.assignee_id}:${task.id}`);
    const output = outputMap.get(task.id)?.metadata;
    const structured = normalizeOutputs(output?.outputs);
    // Legacy image is evidence only: never infer a production quantity from an attachment.
    const legacyImage = safeReportUrl(report?.metadata?.image_url);
    const outputs = legacyImage && !structured.some(item => item.url === legacyImage)
      ? [...structured, { id: 'legacy-evidence', name: '', url: legacyImage, quantity: 0, unit: 'image' as const, kind: 'image' as const }]
      : structured;
    return {
      id: task.id, title: task.title, ref: task.task_ref || '', status: task.status, workflowStatus: task.workflow_status,
      memberId: String(task.assignee_id || ''), memberName: person?.name || task.assignee?.name || '', avatar: person?.avatar_url || task.assignee?.avatar_url,
      parentId: task.project?.id ? `project:${task.project.id}` : task.campaign?.id ? `campaign:${task.campaign.id}` : 'standalone',
      parentName: task.project?.name || task.campaign?.name || '', parentKind: task.project?.id ? 'project' : task.campaign?.id ? 'campaign' : 'standalone',
      departmentId: person?.department_id || task.department_id || '', departmentName: person?.department?.name || task.department?.name || '',
      dueDate: taskDay(task.due_date), completedAt: taskDay(task.completed_at), reported: Boolean(report),
      completedAfterPeriod: taskDone(task) && Boolean(taskDay(task.completed_at) && taskDay(task.completed_at) > end),
      body: report?.metadata?.body || '', blocker: report?.metadata?.blocker || '', nextStep: report?.metadata?.next_step || '',
      channel: typeof output?.channel === 'string' ? output.channel.trim().slice(0, 80) : '', outputs,
    };
  });
}

export const entryDone = (entry: ReportEntry) => !entry.completedAfterPeriod && taskDone({ status: entry.status, workflow_status: entry.workflowStatus });
export const entryPending = (entry: ReportEntry) => !entryDone(entry) && ['pending', 'on_hold', 'paused', 'blocked'].includes(entry.status.toLowerCase());

export function reportMetrics(entries: ReportEntry[], cutoff: string) {
  const done = entries.filter(entryDone).length;
  const pending = entries.filter(entryPending).length;
  const overdue = entries.filter(entry => !entryDone(entry) && entry.dueDate && entry.dueDate < cutoff).length;
  const outputTotals = Object.fromEntries(OUTPUT_UNITS.map(unit => [unit, entries.reduce((n, entry) => n + entry.outputs.filter(output => output.unit === unit).reduce((sum, output) => sum + output.quantity, 0), 0)])) as Record<OutputUnit, number>;
  return { total: entries.length, done, pending, doing: entries.length - done - pending, overdue,
    reported: entries.filter(entry => entry.reported).length, evidence: entries.filter(entry => entry.outputs.some(output => output.url)).length,
    completion: entries.length ? Math.round(done / entries.length * 100) : 0, outputTotals };
}

export function reportBreakdown(entries: ReportEntry[], dimension: 'channel' | 'parent' | 'member', fallback: string) {
  const groups = new Map<string, { id: string; name: string; avatar?: string | null; done: number; doing: number; pending: number; total: number }>();
  entries.forEach(entry => {
    const id = dimension === 'member' ? entry.memberId : dimension === 'parent' ? entry.parentId : entry.channel;
    const name = dimension === 'member' ? entry.memberName : dimension === 'parent' ? entry.parentName : entry.channel;
    const group = groups.get(id) || { id, name: name || fallback, avatar: dimension === 'member' ? entry.avatar : undefined, done: 0, doing: 0, pending: 0, total: 0 };
    group.total++; if (entryDone(entry)) group.done++; else if (entryPending(entry)) group.pending++; else group.doing++;
    groups.set(id, group);
  });
  return [...groups.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}
