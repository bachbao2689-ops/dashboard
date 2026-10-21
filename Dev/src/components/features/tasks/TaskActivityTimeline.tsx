import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, History } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { retainWorkspaceRealtime } from '../../../services/workspaceRealtime';
import { useTranslation } from '../../../i18n/translations';

type AuditKind = 'task' | 'project_subtask' | 'campaign_subtask';
type AuditRow = {
  id: string;
  user_id: number | null;
  action: string;
  created_at: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  actor?: { name?: string | null } | null;
};

interface TaskActivityTimelineProps {
  kind: AuditKind;
  entityId: string;
  actorId?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const FIELD_LABELS: Record<string, { vi: string; en: string }> = {
  title: { vi: 'Tiêu đề', en: 'Title' },
  description: { vi: 'Mô tả', en: 'Description' },
  priority: { vi: 'Ưu tiên', en: 'Priority' },
  start_date: { vi: 'Ngày bắt đầu', en: 'Start date' },
  due_date: { vi: 'Hạn chót', en: 'Due date' },
  status: { vi: 'Trạng thái', en: 'Status' },
  workflow_status: { vi: 'Trạng thái Workflow', en: 'Workflow status' },
  completed_at: { vi: 'Thời điểm hoàn thành', en: 'Completion time' },
  assignee_id: { vi: 'Người phụ trách', en: 'Assignee' },
  department_id: { vi: 'Phòng ban', en: 'Department' },
  project_id: { vi: 'Dự án', en: 'Project' },
  campaign_id: { vi: 'Chiến dịch', en: 'Campaign' },
  workflow_phase_id: { vi: 'Chặng Workflow', en: 'Workflow phase' },
  column_id: { vi: 'Nhóm task', en: 'Task group' },
  image_url: { vi: 'Hình minh chứng', en: 'Evidence image' },
};

function formatValue(value: unknown, lang: string) {
  if (value == null || value === '') return lang === 'en' ? 'Empty' : 'Trống';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString(lang === 'en' ? 'en-GB' : 'vi-VN');
  }
  if (typeof value === 'string' && /^[0-9a-f-]{32,36}$/i.test(value)) {
    return lang === 'en' ? 'Changed' : 'Đã thay đổi';
  }
  if (typeof value === 'object') return lang === 'en' ? 'Changed' : 'Đã thay đổi';
  return String(value);
}

function eventTitle(row: AuditRow, en: boolean) {
  if (row.action === 'task_created') return en ? 'Created the task' : 'Tạo task';
  if (row.action === 'task_completed') return en ? 'Completed the task' : 'Hoàn thành task';
  if (row.action === 'details_updated') return en ? 'Updated subtask details' : 'Cập nhật chi tiết subtask';
  return en ? 'Edited the task' : 'Chỉnh sửa task';
}

export function TaskActivityTimeline({ kind, entityId, actorId, createdAt, updatedAt }: TaskActivityTimelineProps) {
  const { lang } = useTranslation();
  const en = lang === 'en';
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const rowsRef = useRef<AuditRow[]>([]);
  useEffect(() => { rowsRef.current = rows; }, [rows]);

  const load = useCallback(async (reset = true) => {
    if (!actorId || !entityId) { rowsRef.current = []; setRows([]); setLoading(false); return; }
    if (reset) setLoading(true); else setLoadingMore(true);
    const offset = reset ? 0 : rowsRef.current.length;
    const { data, error } = await supabase.from('activity_log')
      .select('id,user_id,action,created_at,old_value,new_value,metadata,actor:user_id(name)')
      .eq('entity_type', kind).eq('entity_id', entityId)
      .in('action', ['task_created', 'task_updated', 'task_completed', 'details_updated'])
      .order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 39);
    if (error) { setFailed(true); setLoading(false); setLoadingMore(false); return; }
    const page = (data || []) as unknown as AuditRow[];
    const next = reset ? page : [...rowsRef.current, ...page];
    rowsRef.current = next;
    setRows(next);
    setHasMore(page.length === 40);
    setFailed(false);
    setLoading(false);
    setLoadingMore(false);
  }, [actorId, entityId, kind]);

  useEffect(() => {
    let active = true;
    setRows([]);
    setLoading(true);
    const refresh = async () => { if (active) await load(true); };
    void refresh();
    if (!actorId) return () => { active = false; };
    const release = retainWorkspaceRealtime(actorId, ['activity_log'], () => refresh(), () => {}, change => {
      if (change.table !== 'activity_log' || change.eventType === 'DELETE') return false;
      return change.new?.entity_type === kind && String(change.new?.entity_id) === String(entityId) &&
        ['task_created', 'task_updated', 'task_completed', 'details_updated'].includes(String(change.new?.action));
    });
    return () => { active = false; release(); };
  }, [actorId, entityId, kind, load]);

  const renderTime = (value?: string | null) => value
    ? new Date(value).toLocaleString(en ? 'en-GB' : 'vi-VN', { dateStyle: 'medium', timeStyle: 'short' })
    : '';

  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/30">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
        <History className="h-4 w-4 text-primary" />{en ? 'Task history' : 'Lịch sử task'}
      </h3>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-gray-500 dark:text-slate-400">
        {createdAt && <span>{en ? 'Created' : 'Tạo lúc'}: {renderTime(createdAt)}</span>}
        {updatedAt && updatedAt !== createdAt && <span>{en ? 'Last updated' : 'Cập nhật gần nhất'}: {renderTime(updatedAt)}</span>}
      </div>
      {loading ? <p className="text-xs text-gray-400">{en ? 'Loading activity…' : 'Đang tải lịch sử…'}</p>
        : failed ? <p role="status" className="text-xs text-amber-600 dark:text-amber-400">{en ? 'Activity history is unavailable for this account.' : 'Tài khoản hiện không xem được lịch sử cập nhật.'}</p>
          : rows.length === 0 ? <p className="text-xs text-gray-400">{en ? 'No detailed edits recorded yet.' : 'Chưa có lịch sử chỉnh sửa chi tiết.'}</p>
            : <><ol className="space-y-3 border-l border-gray-200 pl-3 dark:border-slate-700">
              {rows.map(row => {
                const changed = Array.isArray(row.metadata?.changed_fields)
                  ? row.metadata.changed_fields.map(String)
                  : row.action === 'details_updated'
                    ? Object.keys(row.metadata || {}).filter(field => ['description', 'image_url'].includes(field))
                    : Object.keys(row.new_value || {}).filter(field => row.old_value?.[field] !== row.new_value?.[field]);
                return <li key={row.id} className="relative min-w-0">
                  <span className="absolute -left-[18px] top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-gray-50 dark:ring-slate-900" />
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                    <b className="text-gray-800 dark:text-slate-100">{eventTitle(row, en)}</b>
                    <span className="text-gray-500 dark:text-slate-400">{row.actor?.name || String(row.metadata?.actor_name || (en ? 'Staff' : 'Nhân viên'))}</span>
                    <time className="inline-flex items-center gap-1 text-[10px] text-gray-400" dateTime={row.created_at}>
                      <Clock className="h-3 w-3" />{renderTime(row.created_at)}
                    </time>
                  </div>
                  {changed.length > 0 && <ul className="mt-1.5 space-y-1 text-[11px] text-gray-500 dark:text-slate-400">
                    {changed.slice(0, 6).map(field => {
                      const label = FIELD_LABELS[field]?.[en ? 'en' : 'vi'] || field;
                      const oldValue = row.old_value?.[field];
                      const newValue = row.action === 'details_updated' ? row.metadata?.[field] : row.new_value?.[field];
                      return <li key={field} className="break-words">{label}: {row.action === 'task_created' || row.action === 'details_updated'
                        ? formatValue(newValue, lang)
                        : `${formatValue(oldValue, lang)} → ${formatValue(newValue, lang)}`}</li>;
                    })}
                    {changed.length > 6 && <li>{en ? `and ${changed.length - 6} more changes` : `và ${changed.length - 6} thay đổi khác`}</li>}
                  </ul>}
                </li>;
              })}
            </ol>{hasMore && <button type="button" disabled={loadingMore} onClick={() => void load(false)} className="mt-3 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 disabled:opacity-50">{loadingMore ? (en ? 'Loading…' : 'Đang tải…') : (en ? 'Load older activity' : 'Xem lịch sử cũ hơn')}</button>}</>}
    </section>
  );
}
