import React, { useEffect, useState } from 'react';
import { ChevronDown, Megaphone, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';

export const CampaignPanel: React.FC = () => {
  const profile = useAuthStore(s => s.profile);
  const canManage = profile?.role === 'admin' || profile?.role === 'manager' || profile?.employment_level === 'Leader';
  const [open, setOpen] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  const load = async () => {
    let query = supabase.from('campaigns').select('*, lead:lead_id(name)').order('created_at', { ascending: false });
    if (profile?.role !== 'admin' && profile?.role !== 'manager' && profile?.department_id) query = query.eq('department_id', profile.department_id);
    const { data, error } = await query;
    if (error) { toast.error('Không thể tải Campaign'); return; }
    setCampaigns(data || []);
  };

  useEffect(() => { void load(); }, [profile?.id, profile?.department_id]);

  const remove = async (campaign: any) => {
    if (!window.confirm(`Xóa Campaign “${campaign.name}”? Project liên kết vẫn được giữ.`)) return;
    const { error } = await supabase.from('campaigns').delete().eq('id', campaign.id);
    if (error) return toast.error('Không thể xóa Campaign');
    await load();
    toast.success('Đã xóa Campaign');
  };

  return (
    <section className="card-hub rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
          <ChevronDown className={`transition-transform ${open ? '' : '-rotate-90'}`} size={17} />
          <Megaphone className="text-primary" size={18} /> Campaigns
          <span className="text-xs font-medium text-gray-500">{campaigns.length}</span>
        </button>
      </div>
      {open && <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-slate-800 text-xs uppercase tracking-wide text-gray-500"><tr>
            <th className="p-4">Campaign</th><th>Owner</th><th>Dates</th><th>Budget</th><th>Status</th><th className="w-12" />
          </tr></thead>
          <tbody>{campaigns.map(c => <tr key={c.id} className="group border-t border-gray-100 dark:border-slate-800 hover:bg-primary/5">
            <td className="p-4"><b className="text-gray-900 dark:text-white">{c.name}</b><p className="text-xs text-gray-500 line-clamp-1 mt-1">{c.objective || 'Chưa có mục tiêu'}</p></td>
            <td className="text-sm text-gray-700 dark:text-gray-300">{c.lead?.name || 'Chưa có owner'}</td>
            <td className="text-sm text-gray-600 dark:text-gray-300">{formatDate(c.start_date)} – {formatDate(c.end_date)}</td>
            <td className="text-sm text-gray-600 dark:text-gray-300">{c.budget ? new Intl.NumberFormat('vi-VN').format(c.budget) : '—'}</td>
            <td><span className="px-2 py-1 rounded-md text-xs bg-blue-50 text-primary capitalize">{c.status || 'planning'}</span></td>
            <td>{canManage && <button onClick={() => void remove(c)} aria-label={`Xóa ${c.name}`} className="p-2 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"><Trash2 size={16} /></button>}</td>
          </tr>)}</tbody>
        </table>
        {!campaigns.length && <p className="p-8 text-center text-sm text-gray-400">Chưa có Campaign.</p>}
      </div>}
    </section>
  );
};
