import React, { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronRight, MessageSquare, CheckCircle2, Clock3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';

type NotificationEntry = {
  id: string;
  user_id: number;
  type?: string | null;
  message: string;
  entity_type?: string | null;
  entity_id?: string | null;
  is_read?: boolean | null;
  created_at: string;
};

const labelFor = (type?: string | null) => {
  if (type === 'task_completed') return { label: 'Hoàn thành task', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' };
  if (type === 'task_comment') return { label: 'Bình luận mới', icon: MessageSquare, color: 'text-blue-600 bg-blue-50' };
  if (type === 'report_reminder') return { label: 'Nhắc report', icon: Clock3, color: 'text-amber-600 bg-amber-50' };
  return { label: 'Cập nhật task', icon: Bell, color: 'text-violet-600 bg-violet-50' };
};

export const NotificationLog: React.FC<{ includeTeam?: boolean }> = ({ includeTeam = false }) => {
  const profile = useAuthStore(state => state.profile);
  const navigate = useNavigate();
  const [entries, setEntries] = useState<NotificationEntry[]>([]);
  const [names, setNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!profile?.id) {
        if (active) { setEntries([]); setLoading(false); }
        return;
      }
      setLoading(true);
      const teamQuery = includeTeam && profile.department_id
        ? supabase.from('users').select('id,name').eq('department_id', profile.department_id).eq('is_active', true)
        : supabase.from('users').select('id,name').eq('id', profile.id);
      const { data: team, error: teamError } = await teamQuery;
      const recipientIds = [...new Set([profile.id, ...(team || []).map((member: any) => member.id)])];
      const { data, error } = await supabase
        .from('notifications')
        .select('id,user_id,type,message,entity_type,entity_id,is_read,created_at')
        .in('user_id', recipientIds)
        .order('created_at', { ascending: false })
        .limit(12);
      if (!active) return;
      if (teamError) console.warn('Could not load team notification recipients:', teamError.message);
      if (error) console.warn('Could not load notification log:', error.message);
      setNames(Object.fromEntries((team || []).map((member: any) => [member.id, member.name])));
      setEntries((data || []) as NotificationEntry[]);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [includeTeam, profile?.department_id, profile?.id]);

  const subtitle = useMemo(() => includeTeam ? 'Thông báo của bạn và đội ngũ' : 'Thông báo liên quan đến bạn', [includeTeam]);

  return (
    <section className="card-hub flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-gray-100 shadow-sm dark:border-slate-700/50">
      <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-5 dark:border-slate-700/50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white"><Bell size={16} className="text-primary" />Log thông báo</h3>
            <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
          </div>
          <span className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-gray-500 shadow-sm dark:bg-slate-700">{entries.length} gần nhất</span>
        </div>
      </div>
      <div className="flex-1 p-2">
        {loading ? <p className="p-5 text-center text-sm text-gray-500">Đang tải log thông báo…</p> : entries.length === 0 ? <p className="p-5 text-center text-sm text-gray-500">Chưa có thông báo liên quan.</p> : entries.map(entry => {
          const display = labelFor(entry.type);
          const Icon = display.icon;
          const canOpenTask = entry.entity_type === 'task' && Boolean(entry.entity_id);
          return <button key={entry.id} type="button" onClick={() => canOpenTask && navigate(`/tasks?task=${entry.entity_id}`)} className={`group flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors ${canOpenTask ? 'hover:bg-gray-50 dark:hover:bg-slate-700/50' : 'cursor-default'}`}>
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${display.color} dark:bg-slate-700`}><Icon size={15} /></span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-gray-800 dark:text-white">{display.label}{names[entry.user_id] && names[entry.user_id] !== profile?.name ? ` · ${names[entry.user_id]}` : ''}</span><time className="shrink-0 text-[10px] text-gray-400">{new Date(entry.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</time></span>
              <span className="mt-1 block line-clamp-2 text-xs leading-5 text-gray-500">{entry.message}</span>
            </span>
            {canOpenTask && <ChevronRight size={16} className="mt-2 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />}
          </button>;
        })}
      </div>
    </section>
  );
};
