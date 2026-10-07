import React, { useEffect, useState } from 'react';
import { ChevronDown, Megaphone, Trash2, EyeOff } from 'lucide-react';
import { ConfirmDeleteModal } from '../../common/ConfirmDeleteModal';
import { ConfirmHideModal } from '../../common/ConfirmHideModal';
import toast from 'react-hot-toast';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
const priorityClass = (value: string) => value === 'high' ? 'bg-red-100 text-red-700' : value === 'low' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700';
const statusClass = (value: string) => value === 'completed' ? 'bg-emerald-100 text-emerald-700' : value === 'active' ? 'bg-blue-100 text-blue-700' : value === 'planning' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600';
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
  const profile = useAuthStore(s => s.profile);
  const canManage = profile?.role === 'admin' || profile?.role === 'manager' || profile?.employment_level === 'Leader';
  const [expanded, setExpanded] = useState(true);
  const [campaignToDelete, setCampaignToDelete] = useState<any>(null);
  const [campaignToHide, setCampaignToHide] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  const load = async () => {
    let query = supabase.from('campaigns').select('*, lead:lead_id(name), creator:created_by(name)').neq('status', 'archived').neq('status', 'deleted').order('created_at', { ascending: false });
    if (profile?.role !== 'admin' && profile?.role !== 'manager' && profile?.department_id) query = query.eq('department_id', profile.department_id);
    const { data, error } = await query;
    if (error) { toast.error('Không thể tải Campaign'); return; }
    setCampaigns(data || []);
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
    const { error } = await supabase.from('campaigns').update({ status: 'deleted' }).eq('id', campaignToDelete.id);
    if (!error) {
      await supabase.from('campaign_subtasks').update({ status: 'deleted' }).eq('campaign_id', campaignToDelete.id);
      toast.success('Đã chuyển Campaign vào thùng rác');
      await load();
      window.dispatchEvent(new Event('tasks:changed'));
    } else {
      toast.error('Lỗi khi xóa Campaign');
    }
    setCampaignToDelete(null);
  };

  const remove = (campaign: any) => {
    setCampaignToDelete(campaign);
  };


  return (
    <section className="card-hub rounded-2xl overflow-hidden shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
        <button onClick={() => setExpanded(value => !value)} aria-expanded={expanded} className="inline-flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
          <ChevronDown className={`text-gray-500 transition-transform ${expanded ? '' : '-rotate-90'}`} size={17} />
          <Megaphone className="text-primary" size={16} /> Campaigns
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{campaigns.length}</span>
        </button>
      </div>
      {expanded && <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-slate-800 text-xs uppercase tracking-wide text-gray-500"><tr>
            <th className="p-4">Campaign</th><th>Owner</th><th>Dates</th><th>Priority</th><th>Budget</th><th>Status</th><th className="w-12" />
          </tr></thead>
          <tbody>{campaigns.map(c => <tr key={c.id} onClick={() => onSelect?.(c)} className={`group border-t border-gray-100 dark:border-slate-800 hover:bg-primary/5 ${onSelect ? 'cursor-pointer' : ''}`}>
            <td className="p-4"><b className="text-gray-900 dark:text-white">{c.name}</b><p className="text-xs text-gray-500 truncate max-w-[250px] md:max-w-[400px] lg:max-w-[500px] mt-1">{c.objective || 'Chưa có mục tiêu'}</p></td>
            <td><div className="flex -space-x-2"><span title={c.lead?.name || 'Chưa có owner'} className="w-7 h-7 rounded-full bg-primary/15 border-2 border-white dark:border-slate-900 grid place-items-center text-[10px] font-bold text-primary">{c.lead?.name?.[0] || '?'}</span></div></td>
            <td className="text-sm text-gray-600 dark:text-gray-300"><div className="flex items-center gap-2"><span>{formatDate(c.start_date)} – {formatDate(c.end_date)}</span>{c.end_date && <div className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-full border-[2.5px] ${getDueStatusColor(c.end_date)}`} title={`Hạn chót: ${formatDate(c.end_date)}`} />{getDueStatusLabel(c.end_date)}</div>}</div></td>
            <td><span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${priorityClass(campaignPriority(c))}`}>{campaignPriority(c)}</span></td>
            <td className="text-sm font-bold text-gray-900 dark:text-white">{c.budget ? new Intl.NumberFormat('vi-VN').format(c.budget) : '—'}</td>
            <td><span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusClass(c.status || 'planning')}`}>{c.status || 'planning'}</span></td>
            <td className="w-16 pr-4">{canManage && <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); void archive(c); }} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Ẩn"><EyeOff size={16}/></button><button onClick={(e) => { e.stopPropagation(); void remove(c); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa"><Trash2 size={16}/></button></div>}</td>
          </tr>)}</tbody>
        </table>
        {!campaigns.length && <p className="p-8 text-center text-sm text-gray-400">Chưa có Campaign.</p>}
      </div>}
    <ConfirmDeleteModal isOpen={!!campaignToDelete} title="Xóa Chiến dịch" message={`Bạn có chắc muốn xóa "${campaignToDelete?.name}"? Tất cả subtask thuộc chiến dịch này cũng sẽ bị xóa.`} onConfirm={executeRemove} onCancel={() => setCampaignToDelete(null)} />
    <ConfirmHideModal isOpen={!!campaignToHide} title="Ẩn Chiến dịch" message={`Bạn có chắc muốn ẩn chiến dịch "${campaignToHide?.name}"? Chiến dịch sẽ được đưa vào lưu trữ và có thể khôi phục sau.`} onConfirm={executeHide} onCancel={() => setCampaignToHide(null)} />
    </section>
  );
};
