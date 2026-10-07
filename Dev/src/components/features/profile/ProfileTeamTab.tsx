import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, FileText, Search, UsersRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { WeeklyReportDrawer } from '../reports/WeeklyReportDrawer';
import type { ReportReference, WeeklyReportTask } from '../reports/WeeklyReportDrawer';
import { tasksForWeeklyReport, weeklyReportRange } from '../../../lib/weeklyReport';
import type { WeekSelection } from '../../../lib/weeklyReport';

type TeamMember = { id: number; name: string; avatar_url?: string | null; employment_level?: string | null; job_title?: string | null; department_id?: string | null };

const workspaceId = '9000eae0-528c-47a2-b6f3-eba019d4edca';
const initials = (name: string) => name.trim().split(/\s+/).filter(Boolean).map(word => word[0]).join('').slice(0, 2).toUpperCase();
export const ProfileTeamTab: React.FC = () => {
  const profile = useAuthStore(state => state.profile);
  const navigate = useNavigate();
  const [weekSelection, setWeekSelection] = useState<WeekSelection>('previous');
  const { start: weekStart, end: weekEnd } = useMemo(() => weeklyReportRange(weekSelection), [weekSelection]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [taskCount, setTaskCount] = useState<Record<number, number>>({});
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [memberTasks, setMemberTasks] = useState<WeeklyReportTask[]>([]);
  const [references, setReferences] = useState<ReportReference[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reminding, setReminding] = useState(false);

  useEffect(() => {
    let active = true;
    const loadTeam = async () => {
      const canViewAll = profile?.role === 'admin' || profile?.role === 'manager';
      if (!profile || (!canViewAll && !profile.department_id)) {
        if (active) { setMembers([]); setLoadingTeam(false); }
        return;
      }
      setLoadingTeam(true);
      let query = supabase.from('users')
        .select('id,name,avatar_url,employment_level,job_title,department_id')
        .eq('is_active', true)
        .neq('id', profile.id)
        .order('name');
      if (!canViewAll && profile.department_id) query = query.eq('department_id', profile.department_id);
      const { data, error } = await query;
      if (error) console.warn('Could not load team members:', error.message);
      const loadedMembers = (data || []) as TeamMember[];
      const counts = await Promise.all(loadedMembers.map(async member => {
        const { count } = await supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('assignee_id', member.id);
        return [member.id, count || 0] as const;
      }));
      if (!active) return;
      setMembers(loadedMembers);
      setTaskCount(Object.fromEntries(counts));
      setLoadingTeam(false);
    };
    void loadTeam();
    return () => { active = false; };
  }, [profile?.department_id, profile?.id, profile?.role]);

  const visibleMembers = useMemo(() => members.filter(member => `${member.name} ${member.job_title || ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())), [members, search]);
  const reportTasks = useMemo(() => tasksForWeeklyReport(memberTasks, weekStart, weekEnd), [memberTasks, weekStart, weekEnd]);

  const openReport = async (member: TeamMember) => {
    setSelectedMember(member);
    setLoadingReport(true);
    setMemberTasks([]);
    setReferences([]);
    let projectQuery = supabase.from('projects').select('id,name,status,description').order('name');
    let campaignQuery = supabase.from('campaigns').select('id,name,status,objective').order('name');
    if (member.department_id) {
      projectQuery = projectQuery.eq('department_id', member.department_id);
      campaignQuery = campaignQuery.eq('department_id', member.department_id);
    }
    const [taskResult, projectResult, campaignResult] = await Promise.all([
      supabase.from('tasks').select('id,task_ref,title,status,description,due_date,created_at,updated_at,project:project_id(id,name)').eq('assignee_id', member.id).order('updated_at', { ascending: false }),
      projectQuery,
      campaignQuery,
    ]);
    if (taskResult.error) console.warn('Could not load member tasks:', taskResult.error.message);
    if (projectResult.error) console.warn('Could not load member projects:', projectResult.error.message);
    if (campaignResult.error) console.warn('Could not load member campaigns:', campaignResult.error.message);
    setMemberTasks((taskResult.data || []) as WeeklyReportTask[]);
    const referenceMap = new Map<string, ReportReference>();
    (projectResult.data || []).forEach((item: any) => referenceMap.set(`project-${item.id}`, { ...item, kind: 'project' }));
    (taskResult.data || []).forEach((task: any) => {
      if (!task.project?.id) return;
      const key = `project-${task.project.id}`;
      if (!referenceMap.has(key)) referenceMap.set(key, { id: task.project.id, name: task.project.name || 'Project', kind: 'project' });
    });
    (campaignResult.data || []).forEach((item: any) => referenceMap.set(`campaign-${item.id}`, { id: item.id, name: item.name, status: item.status, description: item.objective, kind: 'campaign' }));
    setReferences([...referenceMap.values()]);
    setLoadingReport(false);
  };

  const notify = async (task?: WeeklyReportTask) => {
    if (!selectedMember || !profile?.id) return;
    setReminding(true);
    const period = `${new Date(`${weekStart}T00:00:00`).toLocaleDateString('vi-VN')} – ${new Date(`${weekEnd}T00:00:00`).toLocaleDateString('vi-VN')}`;
    const message = task
      ? `${profile.name} nhắc bạn cập nhật weekly report cho task: ${task.title}.`
      : `${profile.name} nhắc bạn cập nhật weekly report tuần ${period}.`;
    const { error } = await supabase.from('notifications').insert({
      user_id: selectedMember.id,
      type: 'report_reminder',
      entity_type: task ? 'task' : 'weekly_report',
      entity_id: task?.id || null,
      message,
      metadata: { week_start: weekStart, week_end: weekEnd, reminder_scope: task ? 'task' : 'member', task_title: task?.title || null, workspace_id: workspaceId },
    });
    setReminding(false);
    if (error) return toast.error('Chưa gửi được lời nhắc report');
    toast.success(task ? 'Đã nhắc report cho task' : `Đã nhắc ${selectedMember.name} cập nhật report`);
  };

  return (
    <>
      <section className="card-hub rounded-2xl p-6 shadow-sm">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white"><UsersRound size={19} className="text-primary" />Đội ngũ ({members.length} thành viên)</h3>
            <p className="mt-1 text-sm text-gray-500">Chọn thành viên để kiểm tra weekly report và nhắc cập nhật.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-xl bg-primary/5 px-3 py-2 text-xs font-semibold text-primary sm:self-auto"><FileText size={15} />Báo cáo tuần</span>
        </div>
        <div className="relative mb-5 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} type="search" placeholder="Tìm thành viên..." className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm outline-none transition-colors focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        </div>
        <div className="space-y-2">
          {loadingTeam ? <p className="rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-500 dark:bg-slate-900">Đang tải đội ngũ…</p> : visibleMembers.length === 0 ? <p className="rounded-xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500">Chưa có thành viên khác trong phòng ban.</p> : visibleMembers.map(member => (
            <button key={member.id} type="button" onClick={() => void openReport(member)} className="group flex w-full items-center justify-between rounded-2xl border border-transparent p-3 text-left transition-colors hover:border-gray-200 hover:bg-gray-50 dark:hover:border-slate-700 dark:hover:bg-slate-700/50">
              <span className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary">{member.avatar_url ? <img src={member.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(member.name)}</span><span className="min-w-0"><b className="block truncate text-sm text-gray-900 dark:text-white">{member.name}</b><span className="mt-0.5 block truncate text-xs text-gray-500">{member.job_title || 'Nhân viên'} · {member.employment_level || 'Staff'}</span></span></span>
              <span className="flex shrink-0 items-center gap-3"><span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-slate-700 dark:text-gray-300">{taskCount[member.id] || 0} tasks</span><ChevronRight size={18} className="text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" /></span>
            </button>
          ))}
        </div>
      </section>
      {selectedMember && !loadingReport && <WeeklyReportDrawer isOpen onClose={() => setSelectedMember(null)} ownerName={selectedMember.name} userId={selectedMember.id} weekStart={weekStart} weekEnd={weekEnd} weekSelection={weekSelection} onWeekSelectionChange={setWeekSelection} tasks={reportTasks} references={references} onOpenTask={taskId => navigate(`/tasks?task=${taskId}`)} onRemindTask={task => void notify(task)} onRemindMember={() => void notify()} reminding={reminding} />}
      {selectedMember && loadingReport && <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/10"><div className="rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-gray-700 shadow-xl dark:bg-slate-800 dark:text-white">Đang tải weekly report của {selectedMember.name}…</div></div>}
    </>
  );
};
