import {tasksForProfileWeek as tasksForWeeklyReport} from '../lib/profileTaskTracking';
import {useMemo,useState,useEffect} from 'react';
import {useTranslation} from '../i18n/translations';
import {taskDone,taskOpen,taskOverdue,taskDueWithin} from '../lib/taskTracking';
import {calendarDay} from '../lib/profileCalendar';
import {mapPriority} from '../components/features/tasks/list/taskListPresentation';
import type {Task} from './useTasks';
import type {WorkspaceData} from './useWorkspaceData';
import type {ReportReference} from '../components/features/reports/WeeklyReportDrawer';
interface PerfData {
  id: string;
  type: 'staff' | 'department' | 'project';
  initial: string;
  name: string;
  role: string;
  dept: string;
  open: number;
  done: number;
  projects: number;
  projectsLabel: string;
  total: number;
  overdue: number;
  due3: number;
  urgent: number;
  noDeadline: number;
  week: number[];
  month: number[];
  avatar_url?: string | null;
}

const WEEK_LABELS_VI=['T2','T3','T4','T5','T6','T7','CN'];
const WEEK_LABELS_EN=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const toYmd=(d:Date)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const startOfCurrentWeek=(day:string)=>{const d=new Date(`${day}T00:00:00`);d.setDate(d.getDate()-((d.getDay()+6)%7));d.setHours(0,0,0,0);return d;};
const dayKey=(value?:string|null)=>calendarDay(value)||'';
export const taskOwningDepartment = (task: Task) => task.project?.department_id || task.campaign?.department_id || task.department_id || null;
const taskOwningDepartmentName = (task: Task) => task.project?.department?.name || task.campaign?.department?.name || task.department?.name || null;
export function useDashboardPerformance(tasks:Task[],users:WorkspaceData['users'],activeId:string,range:'weekly'|'custom',customStart:string,customEnd:string,search:string){
 const {t,lang}=useTranslation();
 const [todayKey,setTodayKey]=useState(()=>toYmd(new Date()));
 useEffect(()=>{const timer=setInterval(()=>setTodayKey(toYmd(new Date())),60000);return()=>clearInterval(timer);},[]);
  const liveData = useMemo<PerfData[]>(() => {
    const today = new Date(`${todayKey}T00:00:00`);
    today.setHours(0, 0, 0, 0);
    const plusThree = new Date(today); plusThree.setDate(today.getDate() + 3);
    const stats = (id: string, type: PerfData['type'], name: string, role: string, dept: string, list: any[], avatar_url?: string | null): PerfData => {
      const done = list.filter(taskDone).length;
      const open = list.filter(taskOpen).length;
      const overdue = list.filter(task => taskOverdue(task,todayKey)).length;
      const due3 = list.filter(task => taskDueWithin(task,todayKey,toYmd(plusThree))).length;
      const urgent = list.filter(task => taskOpen(task) && ['high','urgent'].includes(task.priority)).length;
      const noDeadline = list.filter(task => taskOpen(task) && !task.due_date).length;
      const projects = new Set(list.map(task => task.project_id?`project:${task.project_id}`:task.campaign_id?`campaign:${task.campaign_id}`:null).filter(Boolean)).size;
      const week = Array.from({ length: 7 }, (_, offset) => {
        const date = new Date(today); date.setDate(today.getDate() + offset);
        return list.filter(task => taskOpen(task) && dayKey(task.due_date) === toYmd(date)).length;
      });
      const month = Array.from({ length: 4 }, (_, offset) => {
        const date = new Date(today.getFullYear(), today.getMonth() - 3 + offset, 1);
        return list.filter(task => task.due_date && new Date(task.due_date).getFullYear() === date.getFullYear() && new Date(task.due_date).getMonth() === date.getMonth()).length;
      });
      return { id, type, initial: name.slice(0, 2).toUpperCase(), name, role, dept, open, done, projects, projectsLabel: t('dashboard.projects'), total: list.length, overdue, due3, urgent, noDeadline, week, month, avatar_url };
    };
    const members = users.map(user => stats(
      `user-${user.id}`,
      'staff',
      user.name,
      user.job_title ? `${user.employment_level || (user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Manager' : user.role === 'leader' ? 'Leader' : t('dashboard.memberRole'))} · ${user.job_title}` : (user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Manager' : user.role === 'leader' ? 'Leader' : t('dashboard.memberGeneral')),
      user.department?.name || t('dashboard.unassignedTeam'),
      tasks.filter(task => String(task.assignee_id) === String(user.id)),
      user.avatar_url
    ));
    const deptMap=new Map(tasks.map(task=>[taskOwningDepartment(task)||'unassigned',taskOwningDepartmentName(task)||t('dashboard.unassignedDept')]));
    const depts=[...deptMap].map(([id,name])=>stats(`dept-${id}`,'department',name,t('dashboard.department'),t('dashboard.department'),tasks.filter(task=>(taskOwningDepartment(task)||'unassigned')===id)));
    const projectMap=new Map(tasks.filter(task=>task.project_id||task.campaign_id).map(task=>[task.project_id?`project-${task.project_id}`:`campaign-${task.campaign_id}`,task.project?.name||task.campaign?.name||'Project/Campaign']));
    const projects=[...projectMap].map(([key,name])=>stats(key,'project',name,'Project/Campaign','Project/Campaign',tasks.filter(task=>task.project_id?`project-${task.project_id}`===key:`campaign-${task.campaign_id}`===key)));
    return [...members, ...depts, ...projects];
  }, [tasks, users, t,todayKey]);

  const s = liveData.find(d => d.id === activeId) || liveData.find(d => d.type === 'department') || liveData[0];
  const pct = s ? Math.round((s.done / s.total) * 100) || 0 : 0;
  const rangeStart = range === 'weekly' ? toYmd(startOfCurrentWeek(todayKey)) : customStart;
  const rangeEnd = range === 'weekly' ? (() => { const value = startOfCurrentWeek(todayKey); value.setDate(value.getDate() + 6); return toYmd(value); })() : customEnd;
  const selectedTasks = useMemo(() => {
    if (!s) return [];
    if (s.type === 'staff') return tasks.filter(task => `user-${task.assignee_id}` === s.id);
    if(s.type==='department')return tasks.filter(task=>`dept-${taskOwningDepartment(task)||'unassigned'}`===s.id);
    return tasks.filter(task=>task.project_id?`project-${task.project_id}`===s.id:`campaign-${task.campaign_id}`===s.id);
  }, [s, tasks]);
  const periodTasks = useMemo(() => tasksForWeeklyReport(selectedTasks, rangeStart, rangeEnd), [selectedTasks, rangeStart, rangeEnd]);
  const chartData = useMemo(() => {
    if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) return [];
    const start = new Date(`${rangeStart}T00:00:00`); const end = new Date(`${rangeEnd}T00:00:00`);
    const days: Array<{ key: string; name: string; created: number; doing: number; done: number }> = [];
    const weekLabels = lang === 'vi' ? WEEK_LABELS_VI : WEEK_LABELS_EN;
    for (let cursor = new Date(start); cursor <= end && days.length < 31; cursor.setDate(cursor.getDate() + 1)) {
      const key = toYmd(cursor);
      days.push({ key, name: range === 'weekly' ? weekLabels[(cursor.getDay() + 6) % 7] : cursor.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit' }), created: selectedTasks.filter(task => dayKey(task.created_at) === key).length, doing: selectedTasks.filter(task => taskOpen(task) && (task.status || '').toLowerCase() !== 'todo' && dayKey(task.updated_at || task.created_at) === key).length, done: selectedTasks.filter(task => taskDone(task) && dayKey(task.completed_at) === key).length });
    }
    return days;
  }, [rangeStart, rangeEnd, range, selectedTasks, lang]);
  const selectedReferences = useMemo<ReportReference[]>(() => {
    const refs: Array<[string, ReportReference]> = [
      ...selectedTasks.filter(task => task.project?.id).map(task => [`project-${task.project?.id}`, { id: task.project!.id!, name: task.project!.name || 'Project', kind: 'project' as const }] as [string, ReportReference]),
      ...selectedTasks.filter(task => task.campaign?.id).map(task => [`campaign-${task.campaign?.id}`, { id: task.campaign!.id!, name: task.campaign!.name || 'Campaign', kind: 'campaign' as const }] as [string, ReportReference])
    ];
    return [...new Map<string, ReportReference>(refs).values()];
  }, [selectedTasks]);
  const filteredDepts = liveData.filter(d => d.type === 'department' && d.name.toLowerCase().includes(search.toLowerCase()));

  const getEyebrow = () => {
    if (s?.type === 'department') return t('dashboard.deptInsights');
    if (s?.type === 'project') return t('dashboard.projectOverview');
    return t('dashboard.staffSpotlight');
  };

  const upcomingProjects = tasks
    .filter(task => taskOpen(task) && task.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 2)
    .map(task => {
      const diffDays=Math.round((Date.parse(task.due_date!)-Date.parse(todayKey))/86400000);
      const dueStr = diffDays < 0 ? t('dashboard.overdueDays', { days: Math.abs(diffDays) }) : diffDays === 0 ? t('dashboard.today') : t('dashboard.daysLeft', { days: diffDays });
      return {
        id: task.id,
        parentKey:task.project_id?`project-${task.project_id}`:task.campaign_id?`campaign-${task.campaign_id}`:null,
        code: task.task_ref || '—',
        name: task.project?.name || task.campaign?.name || task.title,
        dept: task.department?.name || t('dashboard.unassignedDept'),
        date: new Date(task.due_date!).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US'),
        dueStr,
        isOverdue: diffDays < 0,
        priority: mapPriority(task.priority),
      };
    });
  const departmentNames = new Map(users.map(user => [user.department_id || 'unassigned', user.department?.name || t('dashboard.unassignedTeam')]));
  const userDepartments = new Map(users.map(user => [`user-${user.id}`, user.department_id || 'unassigned']));
  const teams = [...departmentNames].map(([id,name]) => ({
    name, id:`team-${id}`,
    members:liveData.filter(member => member.type === 'staff' && userDepartments.get(member.id) === id).map(member => ({i:member.initial,id:member.id,n:member.name,r:member.role,open:member.open,a:member.avatar_url})),
  }));

 return {s,pct,rangeStart,rangeEnd,selectedTasks,periodTasks,chartData,selectedReferences,filteredDepts,getEyebrow,upcomingProjects,teams};
}
