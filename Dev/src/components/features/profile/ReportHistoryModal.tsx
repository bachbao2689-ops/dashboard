import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Edit3, FileText, History, ImagePlus, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { notifyTaskParticipants } from '../../../services/taskNotifications';

type ReportLog = {
  id: string;
  entity_id: string;
  created_at: string;
  metadata?: { body?: string; blocker?: string | null; next_step?: string | null; image_url?: string | null; unchanged?: boolean; week_start?: string; week_end?: string } | null;
  taskTitle?: string;
  taskRef?: string | null;
};

const dateLabel = (date?: string) => date ? new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN') : 'Chưa xác định';
const workspaceId = '9000eae0-528c-47a2-b6f3-eba019d4edca';
const reportKey = (log: ReportLog) => `${log.entity_id}:${log.metadata?.week_start || ''}:${log.metadata?.week_end || ''}`;

export const ReportHistoryModal: React.FC<{ isOpen: boolean; onClose?: () => void; variant?: 'modal' | 'inline'; refreshToken?: number }> = ({ isOpen, onClose, variant = 'modal', refreshToken }) => {
  const profile = useAuthStore(state => state.profile);
  const profileId = profile?.id;
  const [logs, setLogs] = useState<ReportLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showOlder, setShowOlder] = useState(false);

  const loadLogs = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    const { data, error } = await supabase.from('activity_log').select('id,entity_id,created_at,metadata').eq('user_id', profileId).eq('entity_type', 'task').eq('action', 'weekly_report').order('created_at', { ascending: false });
    if (error) { setLoading(false); return toast.error('Không thể tải lịch sử report'); }
    const taskIds = [...new Set((data || []).map(row => row.entity_id).filter(Boolean))];
    const taskResult = taskIds.length ? await supabase.from('tasks').select('id,title,task_ref').in('id', taskIds) : { data: [] as any[] };
    const taskMap = new Map((taskResult.data || []).map((task: any) => [task.id, task]));
    setLogs((data || []).map((row: any) => ({ ...row, taskTitle: taskMap.get(row.entity_id)?.title || 'Task đã bị xoá', taskRef: taskMap.get(row.entity_id)?.task_ref })));
    setLoading(false);
  }, [profileId]);

  useEffect(() => { if (isOpen) void loadLogs(); }, [isOpen, loadLogs, refreshToken]);
  const latestIds = useMemo(() => {
    const keys = new Set<string>();
    return new Set(logs.filter(log => {
      const key = reportKey(log);
      if (keys.has(key)) return false;
      keys.add(key);
      return true;
    }).map(log => log.id));
  }, [logs]);
  const visibleLogs = showOlder ? logs : logs.filter(log => latestIds.has(log.id));
  const olderCount = logs.length - latestIds.size;

  const startEditing = (log: ReportLog) => {
    setEditingId(log.id);
    setBody(log.metadata?.body || '');
    setImageUrl(log.metadata?.image_url || '');
  };

  const save = async (log: ReportLog) => {
    if (!body.trim() && !log.metadata?.unchanged) return toast.error('Nội dung report không được để trống');
    if (!profileId || !latestIds.has(log.id)) return;
    const { error } = await supabase.from('activity_log').insert({
      workspace_id: workspaceId,
      user_id: profileId,
      action: 'weekly_report',
      entity_type: 'task',
      entity_id: log.entity_id,
      metadata: { ...log.metadata, body: body.trim(), image_url: imageUrl.trim() || null },
    });
    if (error) return toast.error('Không thể cập nhật report');
    void notifyTaskParticipants({ id: log.entity_id, title: log.taskTitle, task_ref: log.taskRef }, { id: profileId, name: profile?.name, department_id: profile?.department_id }, 'weekly_report');
    toast.success('Đã cập nhật report');
    setEditingId(null);
    await loadLogs();
  };

  if (!isOpen) return null;
  const panel = <section aria-label="Lịch sử report" className={`card-hub flex min-w-0 flex-col overflow-hidden rounded-2xl ${variant === 'inline' ? 'min-h-[360px] max-h-[min(75vh,820px)] w-full shadow-sm' : 'max-h-[85vh] w-full max-w-3xl shadow-xl'}`}>
      <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-slate-700"><div><h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white"><History className="h-[19px] w-[19px] text-primary" />Log Report</h2><p className="mt-1 text-sm text-gray-500">Lịch sử report của bạn và các lần chỉnh sửa.</p></div>{variant === 'modal' && <button aria-label="Đóng history report" onClick={onClose} className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>}</header>
      <main className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-5 md:p-6">{olderCount > 0 && <button type="button" onClick={() => setShowOlder(value => !value)} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5 dark:border-slate-700">{showOlder ? 'Ẩn' : 'Xem'} {olderCount} phiên bản cũ</button>}{loading ? <p className="py-10 text-center text-sm text-gray-500">Đang tải history report…</p> : visibleLogs.map(log => { const editing = editingId === log.id; const latest = latestIds.has(log.id); return <article key={log.id} className="rounded-xl border border-gray-100 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/30"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-gray-900 dark:text-white"><FileText className="mr-1 inline h-4 w-4 text-primary" />{log.taskTitle}</p><p className="mt-1 text-xs text-gray-500">{log.taskRef || 'Task'} · <CalendarDays className="mx-1 inline h-3.5 w-3.5" />{dateLabel(log.metadata?.week_start)} – {dateLabel(log.metadata?.week_end)} · {latest ? 'Bản mới nhất' : 'Phiên bản cũ'}</p></div>{latest && !editing && <button onClick={() => startEditing(log)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5"><Edit3 className="mr-1 inline h-3.5 w-3.5" />Chỉnh sửa</button>}</div>{editing ? <div className="mt-3 space-y-2"><label className="block text-xs font-semibold text-gray-600">{log.metadata?.unchanged ? 'Ghi chú (tùy chọn)' : 'Kết quả tuần này'}<textarea value={body} onChange={event => setBody(event.target.value)} rows={4} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm font-normal outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800" /></label><input value={imageUrl} onChange={event => setImageUrl(event.target.value)} placeholder="Dán link hình report…" className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800" /><div className="flex justify-end gap-2"><button onClick={() => setEditingId(null)} className="rounded-xl px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100">Hủy</button><button onClick={() => void save(log)} className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white"><Save className="mr-1 inline h-3.5 w-3.5" />Lưu thay đổi</button></div></div> : <><p className="mt-3 text-xs font-semibold text-gray-500">{log.metadata?.unchanged ? 'Không thay đổi' : 'Có cập nhật'} · {new Date(log.created_at).toLocaleString('vi-VN')}</p>{log.metadata?.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600 dark:text-gray-300">{log.metadata.body}</p>}{log.metadata?.blocker && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300"><b>Vướng mắc: </b>{log.metadata.blocker}</p>}{log.metadata?.next_step && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300"><b>Việc tiếp theo: </b>{log.metadata.next_step}</p>}{log.metadata?.image_url && <a href={log.metadata.image_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center text-xs font-semibold text-primary hover:underline"><ImagePlus className="mr-1 h-3.5 w-3.5" />Mở hình report</a>}</>}</article>})}{!loading && logs.length === 0 && <div className="py-12 text-center text-sm text-gray-500">Chưa có report nào được lưu.</div>}</main>
    </section>;
  return variant === 'inline' ? panel : <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">{panel}</div>;
};
