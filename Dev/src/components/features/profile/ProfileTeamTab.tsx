import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, CalendarDays, ChevronRight, FileText, Search, UsersRound, X } from 'lucide-react';
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
const formatReportDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN');
export const ProfileTeamTab: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const profile = useAuthStore(state => state.profile);
  const navigate = useNavigate();
  const [weekSelection, setWeekSelection] = useState<WeekSelection>('previous');
  const { start: weekStart, end: weekEnd } = useMemo(() => weeklyReportRange(weekSelection), [weekSelection]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [taskCount, setTaskCount] = useState<Record<number, number>>({});
  const [reportProgress, setReportProgress] = useState<Record<number, { total: number; reported: number }>>({});
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [memberTasks, setMemberTasks] = useState<WeeklyReportTask[]>([]);
  const [references, setReferences] = useState<ReportReference[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [teamPanelWidth, setTeamPanelWidth] = useState(42);
  const reportGridRef = useRef<HTMLDivElement>(null);

  const resizeTeamPanel = (clientX: number) => {
    const bounds = reportGridRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0) return;
    setTeamPanelWidth(Math.min(65, Math.max(30, ((clientX - bounds.left) / bounds.width) * 100)));
  };

  useEffect(() => {
    let active = true;
    const loadTeam = async () => {
      const normalizedRole = (profile?.role || '').toLowerCase();
      const normalizedLevel = (profile?.employment_level || '').toLowerCase();
      const canViewAll = normalizedRole === 'admin' || normalizedLevel === 'admin' || normalizedLevel === 'manager' || (normalizedRole === 'manager' && normalizedLevel !== 'leader');
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
      const memberIds = loadedMembers.map(member => member.id);
      const [taskResult] = memberIds.length ? await Promise.all([
        supabase.from('tasks').select('id,task_ref,title,status,description,due_date,created_at,updated_at,assignee_id,project:project_id(id,name)').in('assignee_id', memberIds),
      ]) : [{ data: [], error: null } as any];
      if (taskResult.error) console.warn('Could not load team report tasks:', taskResult.error.message);
      const allMemberTasks = (taskResult.data || []) as WeeklyReportTask[];
      const weeklyTasks = tasksForWeeklyReport(allMemberTasks, weekStart, weekEnd);
      const weeklyTaskIds = weeklyTasks.map((task: any) => task.id);
      const { data: reportRows, error: reportError } = weeklyTaskIds.length
        ? await supabase.from('activity_log').select('user_id,entity_id,metadata').eq('entity_type', 'task').eq('action', 'weekly_report').in('entity_id', weeklyTaskIds)
        : { data: [], error: null };
      if (reportError) console.warn('Could not load team report status:', reportError.message);
      const taskIdsByMember = new Map<number, string[]>();
      weeklyTasks.forEach((task: any) => {
        const memberId = Number(task.assignee_id);
        taskIdsByMember.set(memberId, [...(taskIdsByMember.get(memberId) || []), task.id]);
      });
      const reportedKeys = new Set((reportRows || []).filter((row: any) => row.metadata?.week_start === weekStart && row.metadata?.week_end === weekEnd).map((row: any) => `${row.user_id}:${row.entity_id}`));
      const progress = Object.fromEntries(loadedMembers.map(member => {
        const ids = taskIdsByMember.get(member.id) || [];
        return [member.id, { total: ids.length, reported: ids.filter(id => reportedKeys.has(`${member.id}:${id}`)).length }];
      }));
      const counts = Object.fromEntries(loadedMembers.map(member => [member.id, allMemberTasks.filter((task: any) => Number(task.assignee_id) === member.id).length]));
      if (!active) return;
      setMembers(loadedMembers);
      setTaskCount(counts);
      setReportProgress(progress);
      setLoadingTeam(false);
    };
    void loadTeam();
    return () => { active = false; };
  }, [profile?.department_id, profile?.id, profile?.role, weekEnd, weekStart]);

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

  const teamTotal = Object.values(reportProgress).reduce((total, item) => total + item.total, 0);
  const teamReported = Object.values(reportProgress).reduce((total, item) => total + item.reported, 0);

  return (
    <div ref={reportGridRef} style={embedded ? { '--team-panel-width': `${teamPanelWidth}%` } as React.CSSProperties : undefined} className={embedded ? 'grid min-w-0 gap-y-4 gap-x-0 lg:grid-cols-[minmax(280px,var(--team-panel-width))_1px_minmax(0,1fr)]' : 'space-y-4'}>
      {(embedded || !selectedMember) && <section className={embedded ? 'card-hub min-w-0 rounded-2xl p-4 shadow-sm md:p-5' : 'card-hub rounded-2xl p-6 shadow-sm'}>
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white"><UsersRound size={19} className="text-primary" />Tổng report team</h3>
            <p className="mt-1 text-sm text-gray-500">Chọn thành viên để kiểm tra weekly report và nhắc cập nhật.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2"><div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900/50">{(['current', 'previous'] as const).map(option => <button key={option} type="button" aria-pressed={weekSelection === option} onClick={() => setWeekSelection(option)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${weekSelection === option ? 'bg-white text-primary shadow-sm dark:bg-slate-700 dark:text-white' : 'text-gray-500 hover:text-primary'}`}>{option === 'current' ? 'Tuần này' : 'Tuần trước'}</button>)}</div><span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/5 px-3 py-2 text-xs font-semibold text-primary"><FileText size={15} />{members.length} PIC</span></div>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-950/25"><b className="block text-lg text-primary">{teamReported}/{teamTotal}</b><span className="text-xs text-gray-500">Task đã report</span></div><div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/25"><b className="block text-lg text-amber-700 dark:text-amber-300">{Math.max(teamTotal - teamReported, 0)}</b><span className="text-xs text-gray-500">Cần cập nhật</span></div></div>
        <div className="relative mb-5 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} type="search" placeholder="Tìm thành viên..." className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm outline-none transition-colors focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        </div>
        <div className="space-y-2">
          {loadingTeam ? <p className="rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-500 dark:bg-slate-900">Đang tải đội ngũ…</p> : visibleMembers.length === 0 ? <p className="rounded-xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500">Chưa có thành viên khác trong phòng ban.</p> : visibleMembers.map(member => (
            <button key={member.id} type="button" onClick={() => void openReport(member)} className="group flex w-full items-center justify-between rounded-2xl border border-transparent p-3 text-left transition-colors hover:border-gray-200 hover:bg-gray-50 dark:hover:border-slate-700 dark:hover:bg-slate-700/50">
              <span className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary">{member.avatar_url ? <img src={member.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(member.name)}</span><span className="min-w-0"><b className="block truncate text-sm text-gray-900 dark:text-white">{member.name}</b><span className="mt-0.5 block truncate text-xs text-gray-500">{member.job_title || 'Nhân viên'} · {member.employment_level || 'Staff'}</span></span></span>
              <span className="flex shrink-0 items-center gap-2"><span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">{reportProgress[member.id]?.reported || 0}/{reportProgress[member.id]?.total || 0} report</span><span className="hidden rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-slate-700 dark:text-gray-300 sm:inline-flex">{taskCount[member.id] || 0} tasks</span><ChevronRight size={18} className="text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" /></span>
            </button>
          ))}
        </div>
      </section>}
      {embedded && <div role="separator" aria-orientation="vertical" aria-label="Kéo để thay đổi độ rộng hai bảng report" aria-valuemin={30} aria-valuemax={65} aria-valuenow={Math.round(teamPanelWidth)} tabIndex={0} title="Kéo để thay đổi độ rộng hai bảng" onPointerDown={event => { if (event.pointerType === 'mouse' || event.pointerType === 'pen' || event.pointerType === 'touch') { event.currentTarget.setPointerCapture(event.pointerId); resizeTeamPanel(event.clientX); } }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) resizeTeamPanel(event.clientX); }} onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); setTeamPanelWidth(width => Math.max(30, width - 2)); } else if (event.key === 'ArrowRight') { event.preventDefault(); setTeamPanelWidth(width => Math.min(65, width + 2)); } else if (event.key === 'Home') { event.preventDefault(); setTeamPanelWidth(30); } else if (event.key === 'End') { event.preventDefault(); setTeamPanelWidth(65); } }} className="group relative z-10 -mx-[5.5px] hidden w-3 cursor-col-resize touch-none items-center justify-center rounded-full outline-none lg:flex"><span className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:bg-primary/50 group-focus-visible:bg-primary dark:group-hover:bg-primary/70" /><span className="relative h-8 w-1 rounded-full bg-transparent transition-colors group-hover:bg-primary group-focus-visible:bg-primary" /></div>}
      {selectedMember && !loadingReport && <div className={embedded ? 'card-hub min-w-0 overflow-hidden rounded-2xl shadow-sm' : ''}>{embedded && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-slate-700"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary">{selectedMember.avatar_url ? <img src={selectedMember.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(selectedMember.name)}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-gray-900 dark:text-white">{selectedMember.name}</p><p className="truncate text-xs text-gray-500">{selectedMember.job_title || 'Nhân viên'} · {selectedMember.employment_level || 'Staff'}</p></div></div><div className="flex shrink-0 items-center gap-2"><span className="hidden items-center gap-1.5 text-xs text-gray-500 sm:inline-flex"><CalendarDays size={14} />{formatReportDate(weekStart)} – {formatReportDate(weekEnd)}</span>{(reportProgress[selectedMember.id]?.total || 0) > (reportProgress[selectedMember.id]?.reported || 0) && <button type="button" disabled={reminding} onClick={() => void notify()} className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"><BellRing size={14} />Nhắc PIC</button>}<button type="button" onClick={() => setSelectedMember(null)} aria-label="Bỏ chọn PIC" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"><X size={17} /></button></div></div>}<WeeklyReportDrawer isOpen onClose={() => setSelectedMember(null)} ownerName={selectedMember.name} userId={selectedMember.id} weekStart={weekStart} weekEnd={weekEnd} weekSelection={weekSelection} onWeekSelectionChange={setWeekSelection} showWeekSelection={!embedded} showHeader={!embedded} tasks={reportTasks} references={references} variant="inline" onOpenTask={taskId => navigate(`/tasks?task=${taskId}`)} onRemindTask={task => void notify(task)} reminding={reminding} /></div>}
      {embedded && !selectedMember && !loadingTeam && <section className="card-hub col-start-3 flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 p-8 text-center dark:border-slate-700"><UsersRound size={28} className="text-primary/60" /><h3 className="mt-3 font-bold text-gray-800 dark:text-white">Chọn PIC để xem report</h3><p className="mt-1 max-w-sm text-sm text-gray-500">Nội dung report theo từng task và hình minh chứng của thành viên sẽ hiển thị tại đây.</p></section>}
      {selectedMember && loadingReport && <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/10"><div className="rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-gray-700 shadow-xl dark:bg-slate-800 dark:text-white">Đang tải weekly report của {selectedMember.name}…</div></div>}
    </div>
  );
};
