import { StatusBadge } from '../../common/StatusBadge';
import React, { useEffect, useState } from 'react';
import { Avatar } from '../../common/Avatar';
import { ChevronDown, ChevronRight, Megaphone, Trash2, EyeOff } from 'lucide-react';
import { ConfirmDeleteModal } from '../../common/ConfirmDeleteModal';
import { ConfirmHideModal } from '../../common/ConfirmHideModal';
import toast from 'react-hot-toast';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useTranslation } from '../../../i18n/translations';

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


const getDueStatusColor = (endDateStr?: string | null) => {
  if (!endDateStr) return 'border-transparent';
  const end = new Date(endDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 3) return 'border-green-500';
  if (diffDays >= 1) return 'border-amber-500';
  return 'border-red-500';
};

const getDueStatusLabel = (endDateStr?: string | null) => {
  if (!endDateStr) return null;
  const end = new Date(endDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  const color = diffDays > 3 ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30' : diffDays >= 1 ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30' : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
  const label = diffDays < 0 ? `Trễ ${Math.abs(diffDays)} ngày` : diffDays === 0 ? 'Hôm nay' : `Còn ${diffDays} ngày`;
  
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap ${color}`}>{label}</span>;
};

export const CampaignPanel: React.FC<{ onSelect?: (campaign: any) => void }> = ({ onSelect }) => {
  const { t } = useTranslation();
  const profile = useAuthStore(s => s.profile);
  const canManage = profile?.role === 'admin' || profile?.role === 'manager' || profile?.employment_level === 'Leader';
  const [expanded, setExpanded] = useState(true);
  const [campaignToDelete, setCampaignToDelete] = useState<any>(null);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [campaignToHide, setCampaignToHide] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [subtaskMap, setSubtaskMap] = useState<Record<string, any[]>>({});

  const load = async () => {
    let query = supabase.from('campaigns').select('*, lead:lead_id(name,avatar_url), creator:created_by(name,avatar_url)').neq('status', 'archived').neq('status', 'deleted').order('created_at', { ascending: false });
    if (profile?.role !== 'admin' && profile?.role !== 'manager' && profile?.department_id) query = query.eq('department_id', profile.department_id);
    const [{ data, error }, { data: allSubtasks }] = await Promise.all([
      query,
      supabase.from('campaign_subtasks').select('campaign_id, assignee:assignee_id(id,name,avatar_url)').neq('status', 'deleted')
    ]);
    if (error) { toast.error('Không thể tải Campaign'); return; }
    const stMap: Record<string, any[]> = {};
    (allSubtasks || []).forEach(st => {
      if (!st.assignee) return;
      if (!stMap[st.campaign_id]) stMap[st.campaign_id] = [];
      if (!stMap[st.campaign_id].find(x => x.id === (st.assignee as any).id)) stMap[st.campaign_id].push(st.assignee);
    });
    setSubtaskMap(stMap);
    
    const isAdminOrManager = profile?.role === 'admin' || profile?.employment_level === 'manager' || (profile?.role === 'manager' && profile?.employment_level !== 'Leader');
    const isLeader = profile?.employment_level === 'Leader' || profile?.role === 'leader';
    
    if (!isAdminOrManager && data) {
      const { data: subtasks } = await supabase.from('campaign_subtasks').select('campaign_id').eq('assignee_id', profile?.id).neq('status', 'deleted');
      const campaignIdsWithSubtasks = new Set((subtasks || []).map(s => s.campaign_id));
      
      const filteredData = data.filter(c => {
        const isLead = String(c.lead_id) === String(profile?.id) || String(c.created_by) === String(profile?.id);
        const hasSubtask = campaignIdsWithSubtasks.has(c.id);
        if (isLead || hasSubtask) return true;
        if (isLeader && String(c.department_id) === String(profile?.department_id)) return true;
        return false;
      });
      setCampaigns(filteredData);
    } else {
      setCampaigns(data || []);
    }
  };

  useEffect(() => {
    void load();
    window.addEventListener('campaigns:changed', load);
    return () => window.removeEventListener('campaigns:changed', load);
  }, [profile?.id, profile?.department_id]);

  
  
  const executeHide = async () => {
    if (!campaignToHide) return;
    const { error } = await supabase.from('campaigns').update({ status: 'archived' }).eq('id', campaignToHide.id);
    if (error) {
      toast.error('Không thể ẩn Campaign');
    } else {
      await load();
      toast.success('Đã ẩn Campaign');
    }
    setCampaignToHide(null);
  };

  const archive = (campaign: any) => {
    setCampaignToHide(campaign);
  };


  
  const executeRemove = async () => {
    if (!campaignToDelete) return;
    setDeletingIds(prev => [...prev, campaignToDelete.id]);
    const cached = campaignToDelete;
    setCampaignToDelete(null);
    setTimeout(async () => {
      const { error } = await supabase.from('campaigns').update({ status: 'deleted' }).eq('id', cached.id);
      if (!error) {
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
    setCampaignToDelete(campaign);
  };


  return (
    <section className="card-hub rounded-2xl overflow-hidden shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
        <button onClick={() => setExpanded(value => !value)} aria-expanded={expanded} className="inline-flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
          <ChevronDown className={`text-gray-500 transition-transform ${expanded ? '' : '-rotate-90'}`} size={17} />
          <Megaphone className="text-amber-500" size={16} /> {t('projects.campaignsAccordion')}
          <span className="rounded-full bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">{campaigns.length}</span>
        </button>
      </div>
      {expanded && <>
      <div className="space-y-3 p-3 md:hidden">
        {campaigns.map(c => <article key={c.id} className={`min-w-0 rounded-xl border border-gray-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/50 ${deletingIds.includes(c.id) ? 'animate-fade-out' : ''}`}>
          <button type="button" onClick={() => onSelect?.(c)} className="block w-full min-w-0 text-left">
            <span className="flex min-w-0 items-center gap-1 text-sm font-bold leading-5 text-gray-900 dark:text-white"><span className="min-w-0 flex-1 truncate">{c.name}</span><ChevronRight size={15} className="shrink-0 text-gray-400" /></span>
            <span className="mt-1 block truncate text-xs text-gray-500 dark:text-slate-400">{c.objective || t('tasks.noDescription')}</span>
          </button>
          <div className="mt-2 flex min-w-0 items-center gap-2 text-[11px] text-gray-500 dark:text-slate-400">
            <StatusBadge status={c.status || 'planning'} />
            <span className="min-w-0 truncate">{c.end_date ? `${t('common.due')} ${formatDate(c.end_date)}` : t('common.noDueDate')}</span>
            {canManage && <div className="ml-auto flex shrink-0 items-center gap-1"><button type="button" onClick={() => void archive(c)} className="rounded-lg p-1.5 text-amber-600" aria-label={`${t('common.hide')} ${c.name}`}><EyeOff size={15} /></button><button type="button" onClick={() => remove(c)} className="rounded-lg p-1.5 text-red-500" aria-label={`${t('common.delete')} ${c.name}`}><Trash2 size={15} /></button></div>}
          </div>
        </article>)}
        {!campaigns.length && <p className="p-6 text-center text-sm text-gray-500">{t('projects.noCampaigns')}</p>}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-max text-left">
          <thead className="bg-gray-50 dark:bg-slate-800 text-xs uppercase tracking-wide text-gray-500"><tr>
            <th className="p-4">{t('projects.col.campaign')}</th><th>{t('projects.col.owner')}</th><th>{t('projects.col.dates')}</th><th>{t('projects.col.priority')}</th><th>{t('projects.col.budget')}</th><th>{t('projects.col.status')}</th><th className="w-12" />
          </tr></thead>
          <tbody>{campaigns.map(c => <tr key={c.id} onClick={() => onSelect?.(c)} className={`group border-t border-gray-100 dark:border-slate-800 hover-row-effect hover-row-campaign hover:bg-primary/5 transition-all duration-300 ${onSelect ? 'cursor-pointer' : ''} ${deletingIds.includes(c.id) ? 'animate-fade-out' : ''}`}>
            <td className="p-4"><b className="block max-w-[400px] truncate text-gray-900 dark:text-white">{c.name}</b><p className="text-xs text-gray-500 truncate max-w-[250px] md:max-w-[400px] lg:max-w-[500px] mt-1">{c.objective || t('tasks.noDescription')}</p></td>
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
            <td className="text-sm text-gray-600 dark:text-gray-300"><div className="flex items-center gap-2"><span>{formatDate(c.start_date)} – {formatDate(c.end_date)}</span>{c.end_date && <div className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-full border-[2.5px] ${getDueStatusColor(c.end_date)}`} title={`${t('common.dueDate')}: ${formatDate(c.end_date)}`} />{getDueStatusLabel(c.end_date)}</div>}</div></td>
            <td><span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${priorityClass(campaignPriority(c))}`}>{campaignPriority(c)}</span></td>
            <td className="text-sm font-bold text-gray-900 dark:text-white">{c.budget ? new Intl.NumberFormat('vi-VN').format(c.budget) : '—'}</td>
            <td><StatusBadge status={c.status || 'planning'} /></td>
            <td className="w-16 pr-4">{canManage && <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); void archive(c); }} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title={t('common.hide')}><EyeOff size={16}/></button><button onClick={(e) => { e.stopPropagation(); void remove(c); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={t('common.delete')}><Trash2 size={16}/></button></div>}</td>
          </tr>)}</tbody>
        </table>
        {!campaigns.length && <p className="p-8 text-center text-sm text-gray-400">{t('projects.noCampaigns')}</p>}
      </div></>}
    <ConfirmDeleteModal isOpen={!!campaignToDelete} title="Xóa Chiến dịch" message={`Bạn có chắc muốn xóa "${campaignToDelete?.name}"? Tất cả subtask thuộc chiến dịch này cũng sẽ bị xóa.`} onConfirm={executeRemove} onCancel={() => setCampaignToDelete(null)} />
    <ConfirmHideModal isOpen={!!campaignToHide} title="Ẩn Chiến dịch" message={`Bạn có chắc muốn ẩn chiến dịch "${campaignToHide?.name}"? Chiến dịch sẽ được đưa vào lưu trữ và có thể khôi phục sau.`} onConfirm={executeHide} onCancel={() => setCampaignToHide(null)} />
    </section>
  );
};
