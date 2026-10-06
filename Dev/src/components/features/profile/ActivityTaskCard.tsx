import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, BriefcaseBusiness, ChevronRight, FileText, FolderKanban, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useProfileWorkload } from '../../../hooks/useProfileWorkload';
import { WeeklyReportDrawer } from '../reports/WeeklyReportDrawer';
import type { ReportReference } from '../reports/WeeklyReportDrawer';

const toYmd = (date: Date) => date.toISOString().slice(0, 10);
const previousWeek = () => {
  const date = new Date();
  const weekday = date.getDay() || 7;
  date.setDate(date.getDate() - weekday - 6);
  const start = new Date(date); const end = new Date(date); end.setDate(end.getDate() + 6);
  return { start: toYmd(start), end: toYmd(end) };
};
const done = (status?: string | null) => ['done', 'complete', 'completed'].includes((status || '').toLowerCase());

export const ActivityTaskCard: React.FC = () => {
  const profile = useAuthStore(state => state.profile);
  const { tasks, loading } = useProfileWorkload();
  const navigate = useNavigate();
  const [references, setReferences] = useState<ReportReference[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const week = useMemo(previousWeek, []);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const [memberResult, ownProjectResult, campaignResult] = await Promise.all([
        supabase.from('project_members').select('project:project_id(id,name,status,description)').eq('user_id', profile.id),
        supabase.from('projects').select('id,name,status,description').eq('created_by', profile.id),
        supabase.from('campaigns').select('id,name,status,objective').or(`lead_id.eq.${profile.id},created_by.eq.${profile.id}`)
      ]);
      const items = new Map<string, ReportReference>();
      (memberResult.data || []).forEach((row: any) => row.project && items.set(`project-${row.project.id}`, { ...row.project, kind: 'project' }));
      (ownProjectResult.data || []).forEach((project: any) => items.set(`project-${project.id}`, { ...project, kind: 'project' }));
      (campaignResult.data || []).forEach((campaign: any) => items.set(`campaign-${campaign.id}`, { id: campaign.id, name: campaign.name, status: campaign.status, description: campaign.objective, kind: 'campaign' }));
      setReferences([...items.values()]);
    })();
  }, [profile?.id]);

  const entries = [
    ...tasks.map(task => ({ id: task.id, title: task.title, kind: 'task', status: task.status, icon: <FileText className="h-4 w-4" /> })),
    ...references.map(item => ({ id: `${item.kind}-${item.id}`, title: item.name, kind: item.kind, status: item.status, icon: item.kind === 'campaign' ? <Megaphone className="h-4 w-4" /> : <FolderKanban className="h-4 w-4" /> }))
  ];
  const activeTasks = tasks.filter(task => !done(task.status)).length;
  const reportTasks = useMemo(() => tasks.filter(task => {
    const created = task.created_at.slice(0, 10);
    const due = task.due_date || '';
    return created <= week.end && (!due || due >= week.start);
  }), [tasks, week]);

  return <>
    <section className="card-hub rounded-2xl p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white"><BarChart3 className="text-primary" size={19} />Activity Task</h2><p className="mt-1 text-sm text-gray-500">Task, Project và Campaign của PIC được theo dõi cùng một luồng.</p></div><button onClick={() => setDrawerOpen(true)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#002e6d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#001f4d]"><BriefcaseBusiness size={16} />Report</button></div>
      <div className="mb-4 grid grid-cols-3 gap-3"><div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-950/25"><b className="block text-xl text-primary">{activeTasks}</b><span className="text-xs font-medium text-gray-500">Task đang làm</span></div><div className="rounded-xl bg-violet-50 p-3 dark:bg-violet-950/25"><b className="block text-xl text-violet-700 dark:text-violet-300">{references.filter(item => item.kind === 'project').length}</b><span className="text-xs font-medium text-gray-500">Projects</span></div><div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/25"><b className="block text-xl text-amber-700 dark:text-amber-300">{references.filter(item => item.kind === 'campaign').length}</b><span className="text-xs font-medium text-gray-500">Campaigns</span></div></div>
      {loading ? <p className="text-sm text-gray-500">Đang tải activity…</p> : <div className="divide-y divide-gray-100 dark:divide-slate-700">{entries.slice(0, 6).map(item => <button key={item.id} onClick={() => item.kind === 'task' ? navigate(`/tasks?task=${item.id}`) : navigate('/projects')} className="flex w-full items-center gap-3 py-3 text-left hover:bg-primary/[0.03]"><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">{item.icon}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm text-gray-900 dark:text-white">{item.title}</b><small className="capitalize text-gray-500">{item.kind} · {item.status || 'active'}</small></span><ChevronRight className="h-4 w-4 text-gray-400" /></button>)}{entries.length === 0 && <p className="py-6 text-center text-sm text-gray-500">Chưa có Task, Project hoặc Campaign để theo dõi.</p>}</div>}
    </section>
    <WeeklyReportDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} ownerName={profile?.name || 'My report'} userId={profile?.id} canEdit weekStart={week.start} weekEnd={week.end} tasks={reportTasks} references={references} onOpenTask={taskId => { setDrawerOpen(false); navigate(`/tasks?task=${taskId}`); }} />
  </>;
};
