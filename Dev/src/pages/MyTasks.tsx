import { ProjectCampaignDetailPanel } from '../components/features/projects/ProjectCampaignDetailPanel';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { Filter } from 'lucide-react';


import { ProfileHeader } from '../components/features/profile/ProfileHeader';
import { ProfileCalendar } from '../components/features/profile/ProfileCalendar';
import { TaskDetailPanel } from '../components/features/tasks/TaskDetailPanel';
import { SubtaskDetailPanel } from '../components/features/projects/SubtaskDetailPanel';
import { WeeklyReportDrawer } from '../components/features/reports/WeeklyReportDrawer';
import type { ReportReference } from '../components/features/reports/WeeklyReportDrawer';
import { useProfileCalendar } from '../hooks/useProfileCalendar';
import { tasksForWeeklyReport, weeklyReportRange } from '../lib/weeklyReport';
import type { WeekSelection } from '../lib/weeklyReport';
import { useAuthStore } from '../store/authStore';

export const MyTasks: React.FC = () => {
  const profile = useAuthStore(state => state.profile);
  const isManager = profile?.role === 'admin' || profile?.role === 'manager' || profile?.employment_level === 'Leader';
  const role = isManager ? 'manager' : 'staff';
    const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [filterDept, setFilterDept] = useState('');
  const [filterPic, setFilterPic] = useState('');

  useEffect(() => {
    if (!isManager) return;
    Promise.all([
      supabase.from('departments').select('id, name'),
      supabase.from('users').select('id, name, department_id').eq('is_active', true)
    ]).then(([d, u]) => {
      if (d.data) setDepartments(d.data);
      if (u.data) setUsers(u.data);
    });
  }, [isManager]);

  const visibleUsers = useMemo(() => {
    if (!filterDept) return users;
    return users.filter(u => String(u.department_id) === filterDept);
  }, [filterDept, users]);

  const targetUserId = filterPic || profile?.id;
  const calendar = useProfileCalendar(targetUserId);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (reportOpen) reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [reportOpen]);
  const [weekSelection, setWeekSelection] = useState<WeekSelection>('current');
  const selected = calendar.items.find(item => item.key === selectedKey);
  const week = useMemo(() => weeklyReportRange(weekSelection), [weekSelection]);
  const reportTasks = useMemo(() => tasksForWeeklyReport(calendar.items.filter(item => item.kind === 'task').map(item => item.record as any), week.start, week.end), [calendar.items, week.start, week.end]);
  const references: ReportReference[] = calendar.items.filter(item => item.kind === 'project' || item.kind === 'campaign').map(item => ({ id: item.id, name: item.title, status: item.status, description: item.description, kind: item.kind as 'project' | 'campaign' }));
  return (
    <div className="relative flex h-full min-h-0 min-w-0">
      <div className="min-w-0 flex-1 space-y-6 overflow-y-auto custom-scrollbar pb-6 pr-0 lg:pr-4">
                <div className="flex justify-between items-center mb-6">
          <ProfileHeader role={role} />
          {isManager && (
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
              <Filter size={16} className="text-gray-400 ml-2" />
              <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setFilterPic(''); }} className="bg-transparent text-sm font-semibold outline-none border-none text-gray-700 dark:text-gray-300">
                <option value="">Tất cả phòng ban</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <div className="w-px h-5 bg-gray-200 dark:bg-slate-700" />
              <select value={filterPic} onChange={e => setFilterPic(e.target.value)} className="bg-transparent text-sm font-semibold outline-none border-none text-gray-700 dark:text-gray-300">
                <option value="">{filterDept ? 'Tất cả nhân sự' : 'Chọn nhân sự (PIC)'}</option>
                {visibleUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}
        </div>
        {/* ActivityTaskCard and ReportHistoryModal are temporarily replaced, retained for later use. */}
        <ProfileCalendar {...calendar} onRefresh={calendar.refresh} onOpen={item => setSelectedKey(item.key)} onReport={() => setReportOpen(value => !value)} reportOpen={reportOpen} includeTeamNotifications={isManager} />
        {reportOpen && <div ref={reportRef}><WeeklyReportDrawer isOpen variant="inline" onClose={() => setReportOpen(false)} ownerName={profile?.name || 'Report của tôi'} userId={profile?.id} canEdit weekStart={week.start} weekEnd={week.end} weekSelection={weekSelection} onWeekSelectionChange={setWeekSelection} tasks={reportTasks} references={references} onOpenTask={id => setSelectedKey(`task:${id}`)} /></div>}
      </div>
      <TaskDetailPanel task={selected?.kind === 'task' ? selected.record : null} isOpen={selected?.kind === 'task'} onClose={() => setSelectedKey(null)} onTaskUpdated={calendar.refresh} />
      {selected && (selected.kind === 'project' || selected.kind === 'campaign') && <ProjectCampaignDetailPanel item={selected.record} kind={selected.kind as any} onClose={() => setSelectedKey(null)} onUpdated={calendar.refresh} />}
      {selected && (selected.kind === 'project_subtask' || selected.kind === 'campaign_subtask') && <SubtaskDetailPanel subtask={selected.record as any} entityType={selected.kind} profile={profile} people={profile ? [{ id: profile.id, name: profile.name }] : []} onClose={() => setSelectedKey(null)} onUpdated={calendar.refresh} />}
    </div>
  );
};
