import React, { useEffect, useState } from 'react';
import { BarChart3, ChevronDown, FileText, FolderKanban, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useProfileWorkload } from '../../../hooks/useProfileWorkload';
import type { ReportReference } from '../reports/WeeklyReportDrawer';

const done = (status?: string | null) => ['done', 'complete', 'completed'].includes((status || '').toLowerCase());
type Group = 'task' | 'project' | 'campaign';

export const ActivityTaskCard: React.FC<{ onOpenTask: (task: any) => void }> = ({ onOpenTask }) => {
  const profile = useAuthStore(state => state.profile);
  const { tasks, loading } = useProfileWorkload();
  const navigate = useNavigate();
  const [references, setReferences] = useState<ReportReference[]>([]);
  const [openGroups, setOpenGroups] = useState<Record<Group, boolean>>({ task: false, project: false, campaign: false });

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const [memberResult, ownProjectResult, campaignResult] = await Promise.all([
        supabase.from('project_members').select('project:project_id(id,name,status,description)').eq('user_id', profile.id),
        supabase.from('projects').select('id,name,status,description').eq('created_by', profile.id),
        supabase.from('campaigns').select('id,name,status,objective').or(`lead_id.eq.${profile.id},created_by.eq.${profile.id}`),
      ]);
      const related = new Map<string, ReportReference>();
      (memberResult.data || []).forEach((row: any) => row.project && related.set(`project-${row.project.id}`, { ...row.project, kind: 'project' }));
      (ownProjectResult.data || []).forEach((project: any) => related.set(`project-${project.id}`, { ...project, kind: 'project' }));
      (campaignResult.data || []).forEach((campaign: any) => related.set(`campaign-${campaign.id}`, { id: campaign.id, name: campaign.name, status: campaign.status, description: campaign.objective, kind: 'campaign' }));
      tasks.forEach(task => {
        if (!task.project?.id) return;
        const key = `project-${task.project.id}`;
        if (!related.has(key)) related.set(key, { id: task.project.id, name: task.project.name || 'Project', kind: 'project' });
      });
      setReferences([...related.values()]);
    })();
  }, [profile?.id, profile?.role, profile?.department_id, tasks]);

  const groups: Array<{ id: Group; label: string; icon: React.ReactNode; items: any[] }> = [
    { id: 'task', label: 'Task lẻ', icon: <FileText className="h-4 w-4" />, items: tasks },
    { id: 'project', label: 'Projects', icon: <FolderKanban className="h-4 w-4" />, items: references.filter(item => item.kind === 'project') },
    { id: 'campaign', label: 'Campaigns', icon: <Megaphone className="h-4 w-4" />, items: references.filter(item => item.kind === 'campaign') }
  ];

  return <>
    <section className="card-hub w-full rounded-2xl p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white"><BarChart3 className="text-primary" size={19} />Activity Task</h2><p className="mt-1 text-sm text-gray-500">Theo dõi Task lẻ, Project và Campaign của PIC trong cùng một board.</p></div>
      </div>
      <>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-950/25"><b className="block text-xl text-primary">{tasks.filter(task => !done(task.status)).length}</b><span className="text-xs font-medium text-gray-500">Task đang làm</span></div><div className="rounded-xl bg-violet-50 p-3 dark:bg-violet-950/25"><b className="block text-xl text-violet-700 dark:text-violet-300">{groups[1].items.length}</b><span className="text-xs font-medium text-gray-500">Projects</span></div><div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/25"><b className="block text-xl text-amber-700 dark:text-amber-300">{groups[2].items.length}</b><span className="text-xs font-medium text-gray-500">Campaigns</span></div></div>
        <div className="mt-4 space-y-2">{loading ? <p className="py-6 text-center text-sm text-gray-500">Đang tải activity…</p> : groups.map(group => <div key={group.id} className="overflow-hidden rounded-xl border border-gray-100 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/30"><button type="button" aria-expanded={openGroups[group.id]} onClick={() => setOpenGroups(current => ({ ...current, [group.id]: !current[group.id] }))} className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-primary/[0.03]"><span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><span className="text-primary">{group.icon}</span>{group.label}<span className="rounded-md bg-white px-1.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-slate-700">{group.items.length}</span></span><ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${openGroups[group.id] ? 'rotate-180' : ''}`} /></button>{openGroups[group.id] && <div className="border-t border-gray-100 dark:border-slate-700">{group.items.map((item: any) => <button type="button" key={item.id} onClick={() => group.id === 'task' ? onOpenTask(item) : navigate('/projects')} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-primary/[0.03]"><span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">{group.icon}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm text-gray-900 dark:text-white">{group.id === 'task' ? item.title : item.name}</b><small className="capitalize text-gray-500">{group.id === 'task' ? `Task · ${item.status || 'todo'}` : item.status || 'active'}</small></span></button>)}{group.items.length === 0 && <p className="px-4 py-5 text-center text-sm text-gray-500">Chưa có {group.label.toLowerCase()} để theo dõi.</p>}</div>}</div>)}</div>
      </>
    </section>
  </>;
};
