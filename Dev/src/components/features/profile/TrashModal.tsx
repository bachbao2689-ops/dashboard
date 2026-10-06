import React, { useState, useEffect } from 'react';
import { X, RefreshCcw, FolderKanban, Megaphone, CheckSquare, Trash2 } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import toast from 'react-hot-toast';

export const TrashModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [deletedProjects, setDeletedProjects] = useState<any[]>([]);
  const [deletedCampaigns, setDeletedCampaigns] = useState<any[]>([]);
  const [deletedTasks, setDeletedTasks] = useState<any[]>([]);

  const loadData = async () => {
    const [pRes, cRes, tRes, pstRes, cstRes] = await Promise.all([
      supabase.from('projects').select('*').eq('status', 'deleted').order('created_at', { ascending: false }),
      supabase.from('campaigns').select('*').eq('status', 'deleted').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').eq('status', 'deleted').order('created_at', { ascending: false }),
      supabase.from('project_subtasks').select('*, projects(name)').eq('status', 'deleted').order('created_at', { ascending: false }),
      supabase.from('campaign_subtasks').select('*, campaigns(name)').eq('status', 'deleted').order('created_at', { ascending: false }),
    ]);

    setDeletedProjects(pRes.data || []);
    setDeletedCampaigns(cRes.data || []);

    const allDeletedTasks = [
      ...(tRes.data || []).map((t: any) => ({ ...t, type: 'standalone' })),
      ...(pstRes.data || []).map((t: any) => ({ ...t, title: t.title, type: 'project', parentName: t.projects?.name })),
      ...(cstRes.data || []).map((t: any) => ({ ...t, title: t.title, type: 'campaign', parentName: t.campaigns?.name })),
    ];
    setDeletedTasks(allDeletedTasks);
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  const restoreItem = async (table: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await window.confirm('Khôi phục mục này?') ? await supabase.from(table).update({ status: 'active' }).eq('id', id) : { error: true };
    if (!error) {
      toast.success('Đã khôi phục thành công');
      loadData();
      if (table === 'projects') window.dispatchEvent(new Event('projects:changed'));
      if (table === 'campaigns') window.dispatchEvent(new Event('campaigns:changed'));
      if (table === 'tasks' || table === 'project_subtasks' || table === 'campaign_subtasks') window.dispatchEvent(new Event('tasks:changed'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col relative overflow-hidden animate-in zoom-in-95">
        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50 shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2"><Trash2 className="text-red-500"/> Danh sách đã xóa (Thùng rác)</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><FolderKanban className="text-blue-500" size={18}/> Projects đã xóa ({deletedProjects.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {deletedProjects.length === 0 && <p className="text-sm text-gray-500">Trống</p>}
              {deletedProjects.map(p => (
                <div key={p.id} className="p-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">{p.name}</h4>
                    <p className="text-xs text-gray-500 truncate max-w-[200px] mt-1">{p.description || 'Không có mô tả'}</p>
                  </div>
                  <button onClick={(e) => restoreItem('projects', p.id, e)} className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors" title="Khôi phục"><RefreshCcw size={16}/></button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Megaphone className="text-amber-500" size={18}/> Campaigns đã xóa ({deletedCampaigns.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {deletedCampaigns.length === 0 && <p className="text-sm text-gray-500">Trống</p>}
              {deletedCampaigns.map(c => (
                <div key={c.id} className="p-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">{c.name}</h4>
                  </div>
                  <button onClick={(e) => restoreItem('campaigns', c.id, e)} className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors" title="Khôi phục"><RefreshCcw size={16}/></button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><CheckSquare className="text-emerald-500" size={18}/> Tasks đã xóa ({deletedTasks.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {deletedTasks.length === 0 && <p className="text-sm text-gray-500">Trống</p>}
              {deletedTasks.map(t => (
                <div key={t.id} className="p-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">{t.title}</h4>
                    <p className="text-[10px] uppercase text-gray-400 font-semibold mt-1">
                      {t.type === 'project' ? `Dự án: ${t.parentName}` : t.type === 'campaign' ? `Chiến dịch: ${t.parentName}` : 'Task lẻ'}
                    </p>
                  </div>
                  <button onClick={(e) => restoreItem(t.type === 'project' ? 'project_subtasks' : t.type === 'campaign' ? 'campaign_subtasks' : 'tasks', t.id, e)} className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors" title="Khôi phục"><RefreshCcw size={16}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
