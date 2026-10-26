import { StatusBadge } from '../../common/StatusBadge';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useWorkspaceRealtime } from '../../../hooks/useWorkspaceRealtime';
import { Avatar } from '../../common/Avatar';
import { ChevronDown, ChevronRight, Megaphone, Trash2, EyeOff, MessageSquare } from 'lucide-react';
import { ConfirmDeleteModal } from '../../common/ConfirmDeleteModal';
import { ConfirmHideModal } from '../../common/ConfirmHideModal';
import toast from 'react-hot-toast';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useTranslation } from '../../../i18n/translations';
import {isTaskDone} from '../../../lib/taskTracking';
import { EntityInfoPopover } from './EntityInfoPopover';
import type { HubTrack } from '../../../lib/workflowHub';

export interface CampaignFilters {
  searchTerm: string;
  status: string;
  picId: string;
  calendar: string;
  customStartDate?: string;
  customEndDate?: string;
  priority: string;
}

export const checkDateMatch = (
  startDateStr: string | null | undefined,
  dueDateStr: string | null | undefined,
  filter: string,
  customStart?: string,
  customEnd?: string,
  isCompleted?: boolean
): boolean => {
  if (filter === 'all' && !customStart && !customEnd) return true;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  const start = startDateStr ? new Date(startDateStr).setHours(0, 0, 0, 0) : null;
  const due = dueDateStr ? new Date(dueDateStr).setHours(0, 0, 0, 0) : null;

  if (filter === 'ongoing') {
    if (isCompleted) return false;
    if (start && start > today) return false;
    if (due && due < today) return false;
    return true;
  }

  if (filter === 'due_soon') {
    if (isCompleted || !due) return false;
    const diff = (due - today) / ONE_DAY;
    return diff >= 0 && diff <= 7;
  }

  if (filter === 'overdue') {
    if (isCompleted || !due) return false;
    return due < today;
  }

  if (filter === 'this_week') {
    const day = now.getDay();
    const diffToMon = (day === 0 ? -6 : 1) - day;
    const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon).setHours(0, 0, 0, 0);
    const sun = mon + 6 * ONE_DAY;
    const itemStart = start || due;
    const itemEnd = due || start;
    if (!itemStart && !itemEnd) return false;
    return itemStart! <= sun && itemEnd! >= mon;
  }

  if (filter === 'this_month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).setHours(0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).setHours(23, 59, 59, 999);
    const itemStart = start || due;
    const itemEnd = due || start;
    if (!itemStart && !itemEnd) return false;
    return itemStart! <= endOfMonth && itemEnd! >= startOfMonth;
  }

  if (filter === 'custom' || customStart || customEnd) {
    const cs = customStart ? new Date(customStart).setHours(0, 0, 0, 0) : null;
    const ce = customEnd ? new Date(customEnd).setHours(23, 59, 59, 999) : null;
    const itemStart = start || due;
    const itemEnd = due || start;
    if (!itemStart && !itemEnd) return false;
    if (cs && itemEnd! < cs) return false;
    if (ce && itemStart! > ce) return false;
    return true;
  }

  return true;
};

const strictFormatVN = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  const ymd = dateStr.split('T')[0];
  const parts = ymd.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
};
const formatDate = strictFormatVN;
const priorityClass = (value: string) => value === 'high' ? 'bg-red-100 text-red-700' : value === 'low' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700';
const campaignPriority = (campaign: any) => campaign.priority || (Number(campaign.budget) >= 50000000 ? 'high' : Number(campaign.budget) >= 30000000 ? 'medium' : 'low');


const getDueStatusColor = (endDateStr?: string | null, status?: string | null) => {
  if (!endDateStr) return 'border-transparent';
  const isDone = ['done', 'complete', 'completed'].includes((status || '').toLowerCase());
  if (isDone) return 'border-emerald-500';
  const parts = endDateStr.split('T')[0].split('-').map(Number);
  if (parts.length !== 3) return 'border-transparent';
  const end = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 3) return 'border-emerald-500';
  if (diffDays >= 0) return 'border-amber-500';
  return 'border-red-500';
};

const getDueStatusLabel = (endDateStr?: string | null, status?: string | null, isEn?: boolean) => {
  if (!endDateStr) return null;
  const isDone = ['done', 'complete', 'completed'].includes((status || '').toLowerCase());
  if (isDone) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30">
        {isEn ? 'Completed' : 'Hoàn thành'}
      </span>
    );
  }
  const parts = endDateStr.split('T')[0].split('-').map(Number);
  if (parts.length !== 3) return null;
  const end = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  const color = diffDays > 3
    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
    : diffDays >= 0
    ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30'
    : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
  const label = diffDays < 0
    ? (isEn ? `${Math.abs(diffDays)}d overdue` : `Trễ ${Math.abs(diffDays)} ngày`)
    : diffDays === 0
    ? (isEn ? 'Due today' : 'Hôm nay')
    : (isEn ? `${diffDays}d left` : `Còn ${diffDays} ngày`);
  
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap ${color}`}>{label}</span>;
};

export const CampaignPanel: React.FC<{ 
  onSelect?: (campaign: any) => void;
  filters?: CampaignFilters;
  rootCampaignIds?: ReadonlySet<string>;
  workflowTracks?: HubTrack[];
  starredCriteriaMap?: Record<string, boolean>;
}> = ({ onSelect, filters, rootCampaignIds, workflowTracks, starredCriteriaMap }) => {
  const { t, lang } = useTranslation();
  const profile = useAuthStore(s => s.profile);
  const canManage = (campaign: {id: string; created_by?: number | null}) => Boolean(profile && (campaign.created_by === profile.id || rootCampaignIds?.has(campaign.id)));
  const [expanded, setExpanded] = useState(true);
  const [campaignToDelete, setCampaignToDelete] = useState<any>(null);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [campaignToHide, setCampaignToHide] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [subtaskMap, setSubtaskMap] = useState<Record<string, any[]>>({});
  const [hasComments, setHasComments] = useState<Record<string, boolean>>({});
  const [hasUnread, setHasUnread] = useState<Record<string, boolean>>({});
  const request = useRef(0);

  const load = async () => {
    const token = ++request.current;
    if (!profile) { setCampaigns([]); setSubtaskMap({}); return; }
    let query = supabase.from('campaigns').select('*, lead:lead_id(name,avatar_url), creator:created_by(name,avatar_url)').neq('status', 'archived').neq('status', 'deleted').order('created_at', { ascending: false });
    const [{ data, error }, { data: allSubtasks }, { data: canonicalTasks }, { data: members }, { data: commentsData }, { data: unreadData }] = await Promise.all([
      query,
      supabase.from('campaign_subtasks').select('campaign_id, assignee:assignee_id(id,name,avatar_url)').neq('status', 'deleted').neq('status', 'archived'),
      supabase.from('tasks').select('campaign_id, assignee:assignee_id(id,name,avatar_url)').not('campaign_id', 'is', null).is('project_id', null).neq('status', 'deleted').neq('status', 'archived'),
      supabase.from('campaign_members').select('campaign_id, assignee:user_id(id,name,avatar_url)'),
      supabase.from('activity_log').select('entity_id').eq('entity_type', 'campaign').eq('action', 'comment'),
      profile?.id ? supabase.from('notifications').select('entity_id').eq('user_id', profile.id).eq('entity_type', 'campaign').is('read_at', null) : Promise.resolve({ data: [] } as any)
    ]);
    if (token !== request.current) return;
    if (error) { toast.error('Không thể tải Campaign'); return; }
    const stMap: Record<string, any[]> = {};
    [...(allSubtasks || []), ...(canonicalTasks || []), ...(members || [])].forEach(st => {
      if (!st.assignee) return;
      if (!stMap[st.campaign_id]) stMap[st.campaign_id] = [];
      if (!stMap[st.campaign_id].find(x => x.id === (st.assignee as any).id)) stMap[st.campaign_id].push(st.assignee);
    });
    setSubtaskMap(stMap);

    const commentMap: Record<string, boolean> = {};
    (commentsData || []).forEach((c: any) => { if (c.entity_id) commentMap[c.entity_id] = true; });
    setHasComments(commentMap);

    const unreadMap: Record<string, boolean> = {};
    (unreadData || []).forEach((n: any) => { if (n.entity_id) unreadMap[n.entity_id] = true; });
    setHasUnread(unreadMap);
    
    // Do not re-filter by department: RLS already scopes explicit cross-team invites.
    setCampaigns(data || []);
  };

  useEffect(() => {
    void load();
    return () => { request.current++; };
  }, [profile?.id, profile?.department_id]);
  useWorkspaceRealtime(['campaigns', 'campaign_members', 'campaign_subtasks', 'tasks', 'workflow_phase_members', 'activity_log', 'notifications'], load, profile?.id);

  
  
  const executeHide = async () => {
    if (!campaignToHide) return;
    if (!canManage(campaignToHide)) { toast.error('Bạn không có quyền ẩn Campaign này.'); setCampaignToHide(null); return; }
    const { data, error } = await supabase.from('campaigns').update({ status: 'archived' }).eq('id', campaignToHide.id).select('id').maybeSingle();
    if (error || !data) {
      toast.error('Không thể ẩn Campaign');
    } else {
      await load();
      toast.success('Đã ẩn Campaign');
    }
    setCampaignToHide(null);
  };

  const archive = (campaign: any) => {
    if (!canManage(campaign)) return toast.error('Bạn không có quyền ẩn Campaign này.');
    setCampaignToHide(campaign);
  };


  
  const executeRemove = async () => {
    if (!campaignToDelete) return;
    if (!canManage(campaignToDelete)) { toast.error('Bạn không có quyền xóa Campaign này.'); setCampaignToDelete(null); return; }
    setDeletingIds(prev => [...prev, campaignToDelete.id]);
    const cached = campaignToDelete;
    setCampaignToDelete(null);
    setTimeout(async () => {
      const { data, error } = await supabase.from('campaigns').update({ status: 'deleted' }).eq('id', cached.id).select('id').maybeSingle();
      if (!error && data) {
        await supabase.from('campaign_subtasks').update({ status: 'deleted' }).eq('campaign_id', cached.id);
        toast.success('Đã chuyển Campaign vào thùng rác');
        await load();
        window.dispatchEvent(new Event('tasks:changed'));
      } else {
        toast.error('Lỗi khi xóa Campaign');
      }
      setDeletingIds(prev => prev.filter(id => id !== cached.id));
    }, 300);
  };

  const remove = (campaign: any) => {
    if (!canManage(campaign)) return toast.error('Bạn không có quyền xóa Campaign này.');
    setCampaignToDelete(campaign);
  };


  const isCompleted = (c: any) => ['done', 'complete', 'completed'].includes((c.status || '').toLowerCase());

  const visibleCampaigns = useMemo(() => {
    if (!filters) return campaigns;
    const { searchTerm, status, picId, calendar, customStartDate, customEndDate, priority } = filters;
    const term = (searchTerm || '').trim().toLowerCase();

    return campaigns.filter(c => {
      // 1. Search filter
      if (term) {
        const nameMatch = (c.name || '').toLowerCase().includes(term);
        const objMatch = (c.objective || '').toLowerCase().includes(term);
        if (!nameMatch && !objMatch) return false;
      }

      // 2. Status filter
      if (status === 'open' && isTaskDone(c.status)) return false;
      if (status && status !== 'all' && status !== 'open') {
        const norm = (c.status || 'planning').toLowerCase();
        if (status === 'in_progress') {
          if (!['active', 'in_progress', 'in-progress'].includes(norm)) return false;
        } else if (status === 'completed') {
          if (!['done', 'complete', 'completed'].includes(norm)) return false;
        } else if (status === 'planning') {
          if (!['planning', 'draft', 'pending'].includes(norm)) return false;
        } else if (status !== norm) {
          return false;
        }
      }

      // 3. PIC filter
      if (picId && picId !== 'all') {
        if (picId === 'me') {
          const myId = profile?.id;
          const isLead = myId && Number(c.lead_id) === Number(myId);
          const isCreator = myId && Number(c.creator?.id) === Number(myId);
          const isSub = myId && (subtaskMap[c.id] || []).some((a: any) => Number(a.id) === Number(myId));
          if (!isLead && !isCreator && !isSub) return false;
        } else if (picId === 'unassigned') {
          if (c.lead_id || c.lead?.name) return false;
        } else {
          const targetId = Number(picId);
          const isLead = Number(c.lead_id) === targetId;
          const isCreator = Number(c.creator?.id) === targetId;
          const isSub = (subtaskMap[c.id] || []).some((a: any) => Number(a.id) === targetId);
          if (!isLead && !isCreator && !isSub) return false;
        }
      }

      // 4. Priority filter
      if (priority && priority !== 'all') {
        const p = campaignPriority(c).toLowerCase();
        if (p !== priority.toLowerCase()) return false;
      }

      // 5. Calendar filter
      if (calendar && calendar !== 'all') {
        if (!checkDateMatch(c.start_date, c.end_date, calendar, customStartDate, customEndDate, isCompleted(c))) {
          return false;
        }
      } else if (customStartDate || customEndDate) {
        if (!checkDateMatch(c.start_date, c.end_date, 'custom', customStartDate, customEndDate, isCompleted(c))) {
          return false;
        }
      }

      return true;
    });
  }, [campaigns, filters, subtaskMap, profile?.id]);

  return (
    <section className="card-hub rounded-2xl overflow-hidden shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
        <button onClick={() => setExpanded(value => !value)} aria-expanded={expanded} className="inline-flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
          <ChevronDown className={`text-gray-500 transition-transform ${expanded ? '' : '-rotate-90'}`} size={17} />
          <Megaphone className="text-amber-500" size={16} /> {t('projects.campaignsAccordion')}
          <span className="rounded-full bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
            {visibleCampaigns.length}{visibleCampaigns.length !== campaigns.length ? ` / ${campaigns.length}` : ''}
          </span>
        </button>
      </div>
      {expanded && <>
      <div className="space-y-3 p-3 xl:hidden">
        {visibleCampaigns.map(c => <article key={c.id} className={`min-w-0 rounded-xl border border-gray-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/50 ${deletingIds.includes(c.id) ? 'animate-fade-out' : ''}`}>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5">
            <EntityInfoPopover
              entityType="campaign"
              entity={c}
              track={workflowTracks?.find(t => t.entity_type === 'campaign' && t.entity_id === c.id)}
              starredCriteriaMap={starredCriteriaMap}
              leadPerson={c.lead || (c.creator ? { name: c.creator.name, avatar_url: c.creator.avatar_url } : null)}
              subPersons={subtaskMap[c.id]}
            />
            <button type="button" onClick={() => onSelect?.(c)} className="block w-full min-w-0 text-left">
              <span className="grid grid-cols-[1fr_auto] items-center gap-1 text-sm font-bold leading-5 text-gray-900 dark:text-white">
                <span className="min-w-0 truncate">{c.name}</span>
                {hasComments[c.id] && (
                  <span title={t('common.comment')} className="relative inline-grid place-items-center shrink-0">
                    <MessageSquare size={14} className="text-blue-500" />
                    {(Number(c.lead_id) === Number(profile?.id) || hasUnread[c.id]) && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm"></span>
                    )}
                  </span>
                )}
              </span>
              <span className="mt-1 block truncate text-xs text-gray-500 dark:text-slate-400">{c.objective || t('tasks.noDescription')}</span>
            </button>
            <ChevronRight size={15} className="shrink-0 text-gray-400" />
          </div>
          <div className="mt-2 flex min-w-0 items-center gap-2 text-[11px] text-gray-500 dark:text-slate-400">
            <StatusBadge status={c.status || 'planning'} />
            <span className="min-w-0 truncate">{c.end_date ? `${t('common.due')} ${formatDate(c.end_date)}` : t('common.noDueDate')}</span>
            {c.end_date && getDueStatusLabel(c.end_date, c.status, lang === 'en')}
            {canManage(c) && <div className="ml-auto flex shrink-0 items-center gap-1"><button type="button" onClick={() => void archive(c)} className="rounded-lg p-1.5 text-amber-600" aria-label={`${t('common.hide')} ${c.name}`}><EyeOff size={15} /></button><button type="button" onClick={() => remove(c)} className="rounded-lg p-1.5 text-red-500" aria-label={`${t('common.delete')} ${c.name}`}><Trash2 size={15} /></button></div>}
          </div>
        </article>)}
        {!visibleCampaigns.length && (
          <p className="p-6 text-center text-sm text-gray-500">
            {campaigns.length > 0 ? (lang === 'en' ? 'No campaigns match current filters.' : 'Không có chiến dịch phù hợp bộ lọc.') : t('projects.noCampaigns')}
          </p>
        )}
      </div>
      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full min-w-max text-left">
          <thead className="bg-gray-50 dark:bg-slate-800 text-xs uppercase tracking-wide text-gray-500"><tr>
            <th className="p-4">{t('projects.col.campaign')}</th><th>{t('projects.col.owner')}</th><th>{t('projects.col.dates')}</th><th>{t('projects.col.priority')}</th><th>{t('projects.col.budget')}</th><th>{t('projects.col.status')}</th><th className="w-12" />
          </tr></thead>
          <tbody>{visibleCampaigns.map(c => <tr key={c.id} onClick={() => onSelect?.(c)} className={`group border-t border-gray-100 dark:border-slate-800 hover-row-effect hover-row-campaign transition-all duration-200 ${onSelect ? 'cursor-pointer' : ''} ${deletingIds.includes(c.id) ? 'animate-fade-out' : ''}`}>
            <td className="p-4">
              <div className="grid grid-flow-col auto-cols-max items-center gap-2">
                <EntityInfoPopover
                  entityType="campaign"
                  entity={c}
                  track={workflowTracks?.find(t => t.entity_type === 'campaign' && t.entity_id === c.id)}
                  starredCriteriaMap={starredCriteriaMap}
                  leadPerson={c.lead || (c.creator ? { name: c.creator.name, avatar_url: c.creator.avatar_url } : null)}
                  subPersons={subtaskMap[c.id]}
                />
                <b className="block max-w-[400px] truncate text-gray-900 dark:text-white">{c.name}</b>
                {hasComments[c.id] && (
                  <span title={t('common.comment')} className="relative inline-grid place-items-center shrink-0">
                    <MessageSquare size={14} className="text-blue-500" />
                    {(Number(c.lead_id) === Number(profile?.id) || hasUnread[c.id]) && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm"></span>
                    )}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate max-w-[250px] md:max-w-[400px] lg:max-w-[500px] mt-1">{c.objective || t('tasks.noDescription')}</p>
            </td>
            <td>
  <div className="flex items-center gap-2">
    <div className="flex -space-x-2"><Avatar name={c.lead?.name || t('common.unassigned')} src={c.lead?.avatar_url || undefined} className="w-7 h-7 text-[10px] border-2 border-white dark:border-slate-900 shadow-sm z-10" /></div>
    {subtaskMap[c.id] && subtaskMap[c.id].length > 0 && (
      <>
        <span className="text-gray-300 dark:text-gray-600 px-1">|</span>
        <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full border border-amber-100 dark:border-amber-800">
          <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400">SUB</span>
          <div className="flex -space-x-2">
            {subtaskMap[c.id].slice(0,4).map((assignee: any) => <Avatar key={'s'+assignee.id} name={(assignee.name || 'Unknown') + ' (Subtask)'} src={assignee.avatar_url || undefined} className="w-6 h-6 text-[9px] border-2 border-white dark:border-slate-900 shadow-sm z-10 opacity-90" />)}
          </div>
        </div>
      </>
    )}
  </div>
</td>
            <td className="text-sm text-gray-600 dark:text-gray-300"><div className="flex items-center gap-2"><span>{formatDate(c.start_date)} – {formatDate(c.end_date)}</span>{c.end_date && <div className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-full border-[2.5px] ${getDueStatusColor(c.end_date, c.status)}`} title={`${t('common.dueDate')}: ${formatDate(c.end_date)}`} />{getDueStatusLabel(c.end_date, c.status, lang === 'en')}</div>}</div></td>
            <td><span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${priorityClass(campaignPriority(c))}`}>{campaignPriority(c)}</span></td>
            <td className="text-sm font-bold text-gray-900 dark:text-white">{c.budget ? new Intl.NumberFormat('vi-VN').format(c.budget) : '—'}</td>
            <td><StatusBadge status={c.status || 'planning'} /></td>
            <td className="w-16 pr-4">{canManage(c) && <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); void archive(c); }} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title={t('common.hide')}><EyeOff size={16}/></button><button onClick={(e) => { e.stopPropagation(); void remove(c); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={t('common.delete')}><Trash2 size={16}/></button></div>}</td>
          </tr>)}</tbody>
        </table>
        {!visibleCampaigns.length && (
          <p className="p-8 text-center text-sm text-gray-400">
            {campaigns.length > 0 ? (lang === 'en' ? 'No campaigns match current filters.' : 'Không có chiến dịch phù hợp bộ lọc.') : t('projects.noCampaigns')}
          </p>
        )}
      </div></>}
    <ConfirmDeleteModal isOpen={!!campaignToDelete} title="Xóa Chiến dịch" message={`Bạn có chắc muốn xóa "${campaignToDelete?.name}"? Tất cả subtask thuộc chiến dịch này cũng sẽ bị xóa.`} onConfirm={executeRemove} onCancel={() => setCampaignToDelete(null)} />
    <ConfirmHideModal isOpen={!!campaignToHide} title="Ẩn Chiến dịch" message={`Bạn có chắc muốn ẩn chiến dịch "${campaignToHide?.name}"? Chiến dịch sẽ được đưa vào lưu trữ và có thể khôi phục sau.`} onConfirm={executeHide} onCancel={() => setCampaignToHide(null)} />
    </section>
  );
};
