import React, { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useProfileWorkload } from '../../../hooks/useProfileWorkload';
import { tasksForWeeklyReport, weeklyReportRange } from '../../../lib/weeklyReport';
import type { WeekSelection } from '../../../lib/weeklyReport';
import { ProfileTeamTab } from '../profile/ProfileTeamTab';
import { WeeklyReportDrawer } from './WeeklyReportDrawer';
import type { ReportReference } from './WeeklyReportDrawer';

type View = 'mine' | 'team';

export const LeaderReports: React.FC = () => {
  const profile = useAuthStore(state => state.profile);
  const { tasks, loading } = useProfileWorkload();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('mine');
  const [showMyReport, setShowMyReport] = useState(true);
  const [weekSelection, setWeekSelection] = useState<WeekSelection>('current');
  const [references, setReferences] = useState<ReportReference[]>([]);
  const week = useMemo(() => weeklyReportRange(weekSelection), [weekSelection]);
  const reportTasks = useMemo(() => tasksForWeeklyReport(tasks, week.start, week.end), [tasks, week.start, week.end]);

  useEffect(() => {
    if (!profile?.id) { setReferences([]); return; }
    let active = true;
    const loadReferences = async () => {
      const [memberResult, ownProjectResult, campaignResult] = await Promise.all([
        supabase.from('project_members').select('project:project_id(id,name,status,description)').eq('user_id', profile.id),
        supabase.from('projects').select('id,name,status,description').eq('created_by', profile.id),
        supabase.from('campaigns').select('id,name,status,objective').or(`lead_id.eq.${profile.id},created_by.eq.${profile.id}`),
      ]);
      if (!active) return;
      if (memberResult.error) console.warn('Could not load leader project references:', memberResult.error.message);
      if (ownProjectResult.error) console.warn('Could not load leader projects:', ownProjectResult.error.message);
      if (campaignResult.error) console.warn('Could not load leader campaigns:', campaignResult.error.message);
      const items = new Map<string, ReportReference>();
      (memberResult.data || []).forEach((row: any) => row.project && items.set(`project-${row.project.id}`, { ...row.project, kind: 'project' }));
      (ownProjectResult.data || []).forEach((project: any) => items.set(`project-${project.id}`, { ...project, kind: 'project' }));
      (campaignResult.data || []).forEach((campaign: any) => items.set(`campaign-${campaign.id}`, { id: campaign.id, name: campaign.name, status: campaign.status, description: campaign.objective, kind: 'campaign' }));
      tasks.forEach(task => {
        if (task.project?.id && !items.has(`project-${task.project.id}`)) {
          items.set(`project-${task.project.id}`, { id: task.project.id, name: task.project.name || 'Project', kind: 'project' });
        }
      });
      setReferences([...items.values()]);
    };
    void loadReferences();
    return () => { active = false; };
  }, [profile?.id, tasks]);

  return <div className="w-full space-y-6 p-4 md:p-6">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weekly Report</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Cập nhật công việc của bạn và theo dõi báo cáo từ đội ngũ.</p></div>
      <div className="inline-flex w-full rounded-xl border border-gray-100 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:w-auto">
        <button type="button" aria-pressed={view === 'mine'} onClick={() => setView('mine')} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${view === 'mine' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-700'}`}><BriefcaseBusiness size={16} />Report của tôi</button>
        <button type="button" aria-pressed={view === 'team'} onClick={() => setView('team')} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${view === 'team' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-700'}`}><UsersRound size={16} />Report của Team</button>
      </div>
    </header>

    {view === 'team' ? <ProfileTeamTab embedded /> : loading ? <div className="card-hub rounded-2xl p-10 text-center text-sm text-gray-500">Đang tải task để lập báo cáo…</div> : showMyReport ? <WeeklyReportDrawer
      isOpen
      onClose={() => setShowMyReport(false)}
      ownerName={profile?.name || 'Report của tôi'}
      userId={profile?.id}
      canEdit
      weekStart={week.start}
      weekEnd={week.end}
      weekSelection={weekSelection}
      onWeekSelectionChange={setWeekSelection}
      tasks={reportTasks}
      references={references}
      variant="inline"
      onOpenTask={taskId => navigate(`/tasks?task=${taskId}`)}
    /> : <section className="card-hub rounded-2xl p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Report tuần của {profile?.name || 'bạn'}</h2>
      <p className="mt-1 text-sm text-gray-500">{reportTasks.length} task nằm trong kỳ báo cáo tuần này.</p>
      <button type="button" onClick={() => setShowMyReport(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"><BriefcaseBusiness size={16} />Mở report tuần</button>
    </section>}
  </div>;
};
