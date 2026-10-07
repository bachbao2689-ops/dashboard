import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Edit3, FileText, History, ImagePlus, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';

type ReportLog = {
  id: string;
  entity_id: string;
  created_at: string;
  metadata?: { body?: string; image_url?: string | null; week_start?: string; week_end?: string } | null;
  taskTitle?: string;
  taskRef?: string | null;
};

const dateLabel = (date?: string) => date ? new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN') : 'Chưa xác định';

export const ReportHistoryModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const profileId = useAuthStore(state => state.profile?.id);
  const [logs, setLogs] = useState<ReportLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');

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

  useEffect(() => { if (isOpen) void loadLogs(); }, [isOpen, loadLogs]);

  const startEditing = (log: ReportLog) => {
    setEditingId(log.id);
    setBody(log.metadata?.body || '');
    setImageUrl(log.metadata?.image_url || '');
  };

  const save = async (log: ReportLog) => {
    if (!body.trim()) return toast.error('Nội dung report không được để trống');
    const { error } = await supabase.from('activity_log').update({ metadata: { ...log.metadata, body: body.trim(), image_url: imageUrl.trim() || null } }).eq('id', log.id);
    if (error) return toast.error('Không thể cập nhật report');
    toast.success('Đã cập nhật report');
    setEditingId(null);
    await loadLogs();
  };

  if (!isOpen) return null;
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
    <div className="card-hub flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl shadow-xl">
      <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-slate-700"><div><p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Log</p><h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white"><History className="h-5 w-5 text-primary" />History Report</h2></div><button aria-label="Đóng history report" onClick={onClose} className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button></header>
      <main className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-5 md:p-6">{loading ? <p className="py-10 text-center text-sm text-gray-500">Đang tải history report…</p> : logs.map(log => { const editing = editingId === log.id; return <article key={log.id} className="rounded-xl border border-gray-100 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/30"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-gray-900 dark:text-white"><FileText className="mr-1 inline h-4 w-4 text-primary" />{log.taskTitle}</p><p className="mt-1 text-xs text-gray-500">{log.taskRef || 'Task'} · <CalendarDays className="mx-1 inline h-3.5 w-3.5" />{dateLabel(log.metadata?.week_start)} – {dateLabel(log.metadata?.week_end)}</p></div>{!editing && <button onClick={() => startEditing(log)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5"><Edit3 className="mr-1 inline h-3.5 w-3.5" />Chỉnh sửa</button>}</div>{editing ? <div className="mt-3 space-y-2"><textarea value={body} onChange={event => setBody(event.target.value)} rows={4} className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800" /><input value={imageUrl} onChange={event => setImageUrl(event.target.value)} placeholder="Dán link hình report…" className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800" /><div className="flex justify-end gap-2"><button onClick={() => setEditingId(null)} className="rounded-xl px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100">Hủy</button><button onClick={() => void save(log)} className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white"><Save className="mr-1 inline h-3.5 w-3.5" />Lưu thay đổi</button></div></div> : <><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600 dark:text-gray-300">{log.metadata?.body || 'Chưa có nội dung.'}</p>{log.metadata?.image_url && <a href={log.metadata.image_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center text-xs font-semibold text-primary hover:underline"><ImagePlus className="mr-1 h-3.5 w-3.5" />Mở hình report</a>}</>}</article>})}{!loading && logs.length === 0 && <div className="py-12 text-center text-sm text-gray-500">Chưa có report nào được lưu.</div>}</main>
    </div>
  </div>;
};
