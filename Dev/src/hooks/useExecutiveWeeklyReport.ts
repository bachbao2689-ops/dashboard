import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspaceData } from './useWorkspaceData';
import { useWorkspaceRealtime } from './useWorkspaceRealtime';
import { useSharedResource } from './useSharedResource';
import { useAuthStore } from '../store/authStore';
import { scopeTeamWorkload } from '../lib/workloadScope';
import { canViewTeamManagement } from '../lib/roleScope';
import { buildReportEntries, reportPeriodTasks } from '../lib/executiveWeeklyReport';
import { taskActive, taskDone, taskDay } from '../lib/taskTracking';
import { readTeamReportData, reportDirectoryResource } from '../services/teamWeeklyReports';
import { workspaceScope } from '../services/workspaceResources';

type ReportData = Awaited<ReturnType<typeof readTeamReportData>>;
const EMPTY: ReportData = { reports: [], outputs: [], records: [] };

export function useExecutiveWeeklyReport(start: string, end: string, requestedDepartment: string) {
  const profile = useAuthStore(state => state.profile);
  const workspace = useWorkspaceData();
  const directoryKey = workspaceScope();
  const directory = useSharedResource(reportDirectoryResource, directoryKey, canViewTeamManagement(profile));
  const people = useMemo(() => (directory.data || []).map(person => ({ ...person,
    department: { name: workspace.departments.find(item => item.id === person.department_id)?.name || '' },
  })), [directory.data, workspace.departments]);
  const scope = useMemo(() => scopeTeamWorkload(profile, requestedDepartment, people, workspace.departments, workspace.tasks),
    [profile, requestedDepartment, people, workspace.departments, workspace.tasks]);
  const periodTasks = useMemo(() => reportPeriodTasks(scope.tasks, start, end), [scope.tasks, start, end]);
  const taskKeys = JSON.stringify(periodTasks.map(task => task.id).sort());
  const key = JSON.stringify([profile?.id, profile?.role, profile?.employment_level, scope.effectiveDepartmentFilter, start, end, taskKeys]);
  const [state, setState] = useState({ key: '', data: EMPTY, loading: true, error: '' });
  const request = useRef(0);
  const reload = useCallback(async () => {
    const token = ++request.current;
    if (!canViewTeamManagement(profile) || workspace.loading || workspace.error || directory.loading || directory.error) return;
    try {
      const data = await readTeamReportData(JSON.parse(taskKeys), start, end, scope.effectiveDepartmentFilter);
      if (token === request.current) setState({ key, data, loading: false, error: '' });
    } catch (error) {
      if (token === request.current) setState({ key, data: EMPTY, loading: false, error: error instanceof Error ? error.message : 'Chưa tải được báo cáo.' });
    }
  }, [key, taskKeys, start, end, scope.effectiveDepartmentFilter, workspace.loading, workspace.error, directory.loading, directory.error, profile]);
  const cancelRequest = useCallback(() => { request.current++; }, []);
  useEffect(() => {
    const timer = setTimeout(() => { void reload(); }, 0);
    return () => { clearTimeout(timer); cancelRequest(); };
  }, [reload, cancelRequest]);
  const connected = useWorkspaceRealtime(['activity_log', 'users'], change => {
    if (!change?.table || change.table === 'users') reportDirectoryResource.invalidate(directoryKey, change?.revision);
    if (change?.table !== 'users') void reload();
  }, profile?.id, change => {
    if (!change?.table) return true;
    if (change.table === 'users') return true;
    const row = change.new?.action ? change.new : change.old;
    return !row?.action || (String(row.action).includes('weekly_report') && (!row.metadata?.week_start || (row.metadata.week_start === start && row.metadata.week_end === end)));
  });
  const data = state.key === key ? state.data : EMPTY;
  const entries = useMemo(() => buildReportEntries(periodTasks, scope.users, data.reports, data.outputs, start, end),
    [periodTasks, scope.users, data.reports, data.outputs, start, end]);
  // Saved department scope is enforced by the dedicated activity_log report
  // policies. A former Leader's current rank/status must not erase submissions.
  const records = data.records.filter(row => row.metadata?.department_id === scope.effectiveDepartmentFilter);
  const unknownCompletions = scope.tasks.filter(task => taskActive(task) && taskDone(task) && !taskDay(task.completed_at) && (!taskDay(task.created_at) || taskDay(task.created_at) <= end)).length;
  return {
    ...scope, entries, records, connected, unknownCompletions,
    workspaceId: scope.tasks.find(task => task.workspace_id)?.workspace_id || '',
    taskWorkspaces: new Map(scope.tasks.map(task => [task.id, task.workspace_id || ''])),
    loading: workspace.loading || directory.loading || state.key !== key || state.loading,
    error: workspace.error || directory.error || (state.key === key ? state.error : ''),
    reload, refetch: async () => { await Promise.all([workspace.refetch(), directory.refetch()]); await reload(); },
  };
}
