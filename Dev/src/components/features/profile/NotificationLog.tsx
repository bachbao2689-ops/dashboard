import {workspaceScope} from '../../../services/workspaceResources';
import {useNotificationCenter} from '../../../hooks/useNotificationCenter';
import {useWorkspaceRealtime} from '../../../hooks/useWorkspaceRealtime';
import {entityLink} from '../../../lib/taskTracking';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, ChevronRight, MessageSquare, CheckCircle2, Clock3, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import {markNotificationsRead} from '../../../store/notificationStore';
import toast from 'react-hot-toast';

type NotificationEntry = {
  id: string;
  user_id: number;
  type?: string | null;
  message: string;
  entity_type?: string | null;
  entity_id?: string | null;
  is_read?: boolean | null;
  created_at: string; metadata?:Record<string,unknown>;
};

const labelFor = (type?: string | null) => {
  if (type === 'task_completed') return { label: 'Hoàn thành task', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' };
  if (type === 'task_comment') return { label: 'Bình luận mới', icon: MessageSquare, color: 'text-blue-600 bg-blue-50' };
  if (type === 'report_reminder') return { label: 'Nhắc report', icon: Clock3, color: 'text-amber-600 bg-amber-50' };
  if (type === 'weekly_report') return { label: 'Weekly Report', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' };
  return { label: 'Hoạt động nội bộ', icon: Bell, color: 'text-violet-600 bg-violet-50' };
};

export const NotificationLog: React.FC<{ includeTeam?: boolean; onClose?: () => void; inline?: boolean; onOpenEntity?: (type: string, id: string) => boolean }> = ({ includeTeam = false, onClose, inline = false, onOpenEntity }) => {
  const profile = useAuthStore(state => state.profile);
  const navigate = useNavigate();
  const center=useNotificationCenter(),scope=workspaceScope();
  const [teamScope,setTeamScope]=useState("");
  const reload=useRef<() => void>(()=>{});
  const [teamEntries, setEntries] = useState<NotificationEntry[]>([]);
  const [teamLoading, setLoading] = useState(true);

  const entries=includeTeam?(teamScope===scope?teamEntries:[]):(center.history.filter(item=>item.user_id===profile?.id).slice(0,12) as NotificationEntry[]);
  const loading=includeTeam?teamLoading:Boolean(profile&&!center.ready);
  useWorkspaceRealtime(['notifications'],()=>reload.current(),includeTeam?profile?.id:undefined);
  useEffect(() => {
    if(!includeTeam)return;
    let active = true;
    const load = async () => {
      if (!profile?.id) {
        if (active) { setEntries([]); setLoading(false); }
        return;
      }
      setLoading(true);
      let teamQuery = supabase.from('users').select('id,name').eq('is_active', true);
      if (!includeTeam || (!profile.department_id && profile.role !== 'admin' && profile.role !== 'manager')) teamQuery = teamQuery.eq('id', profile.id);
      else if (profile.role !== 'admin' && profile.role !== 'manager' && profile.department_id) teamQuery = teamQuery.eq('department_id', profile.department_id);
      const { data: team, error: teamError } = await teamQuery;
      const recipientIds = [...new Set([profile.id, ...(team || []).map((member: any) => member.id)])];
      const { data, error } = await supabase
        .from('notifications')
        .select('id,user_id,type,message,entity_type,entity_id,is_read,created_at,metadata')
        .in('user_id', recipientIds)
        .order('created_at', { ascending: false })
        .limit(includeTeam ? 120 : 12);
      if (!active) return;
      if (teamError) console.warn('Could not load team notification recipients:', teamError.message);
      if (error) console.warn('Could not load notification log:', error.message);
      const seen = new Set<string>();
      const unique = ((data || []) as NotificationEntry[]).filter(entry => {
        const key = includeTeam ? `${entry.type}:${entry.entity_id}:${entry.message}:${entry.created_at.slice(0, 19)}` : entry.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setEntries(unique.slice(0, 12));setTeamScope(scope);
      setLoading(false);
    };
    reload.current=()=>{if(document.visibilityState==='visible')void load();};
    void load();
    return()=>{active=false;reload.current=()=>{};};
  }, [includeTeam, profile?.department_id, profile?.id, profile?.role,scope]);

  const subtitle = useMemo(() => includeTeam ? 'Thông báo của bạn và đội ngũ' : 'Thông báo liên quan đến bạn', [includeTeam]);
  const clearAll = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try{await markNotificationsRead();setEntries(current=>current.map(entry=>entry.user_id===profile.id?{...entry,is_read:true}:entry));}
    catch{toast.error('Chưa cập nhật được thông báo. Vui lòng thử lại.');}
    setLoading(false);
  };

  return (
    <section className={inline ? 'flex flex-col' : 'card-hub flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-gray-100 shadow-sm dark:border-slate-700/50'}>
      <div className={`border-b border-gray-100 bg-gray-50/50 dark:border-slate-700/50 dark:bg-slate-800/50 ${inline ? 'px-4 py-3 sm:px-5' : 'px-6 py-5'}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white"><Bell size={16} className="text-primary" />Log thông báo</h3>
            <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {entries.some(entry=>!entry.is_read&&entry.user_id===profile?.id) && <button type="button" onClick={clearAll} className="rounded-lg bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600 px-2 py-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300 transition-colors">Đánh dấu đã đọc</button>}
            <span className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-gray-500 shadow-sm dark:bg-slate-700">{entries.length} gần nhất</span>{onClose && <button type="button" aria-label="Đóng thông báo nội bộ" onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"><X size={18} /></button>}</div>
        </div>
      </div>
      <div className={inline ? 'max-h-72 overflow-y-auto p-2' : 'flex-1 p-2'}>
        {loading ? <p className="p-5 text-center text-sm text-gray-500">Đang tải log thông báo…</p> : entries.length === 0 ? <p className="p-5 text-center text-sm text-gray-500">Chưa có thông báo liên quan.</p> : entries.map(entry => {
          const display = labelFor(entry.type);
          const Icon = display.icon;
          const canOpen = Boolean(entityLink(entry.entity_type,entry.entity_id,entry.metadata));
          const handleClick = () => {
            if (!canOpen) return;
            if(entry.user_id===profile?.id)void markNotificationsRead([entry.id]).catch(()=>{});
            const handled = entry.metadata?.target==='workflow'?false:onOpenEntity?.(entry.entity_type!, entry.entity_id!);
            if (handled) return;
            const link=entityLink(entry.entity_type,entry.entity_id,entry.metadata);if(link)navigate(link);
          };
          return <button key={entry.id} type="button" onClick={handleClick} className={`group flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors ${canOpen ? 'hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer' : 'cursor-default'}`}>
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${display.color} dark:bg-slate-700`}><Icon size={15} /></span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-gray-800 dark:text-white">{display.label}</span><time className="shrink-0 text-[10px] text-gray-400">{new Date(entry.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</time></span>
              <span className="mt-1 block line-clamp-2 text-xs leading-5 text-gray-500">{entry.message}</span>
            </span>
            {canOpen && <ChevronRight size={16} className="mt-2 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />}
          </button>;
        })}
      </div>
    </section>
  );
};
