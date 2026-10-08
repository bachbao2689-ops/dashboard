import React, { useEffect, useMemo, useRef, useState } from 'react';

import { ProfileHeader } from '../components/features/profile/ProfileHeader';
import { ProfileCalendar } from '../components/features/profile/ProfileCalendar';
import { CalendarWorkDetail } from '../components/features/profile/CalendarWorkDetail';
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
  const calendar = useProfileCalendar();
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
        <ProfileHeader role={role} />
        {/* ActivityTaskCard and ReportHistoryModal are temporarily replaced, retained for later use. */}
        <ProfileCalendar {...calendar} onRefresh={calendar.refresh} onOpen={item => setSelectedKey(item.key)} onReport={() => setReportOpen(value => !value)} reportOpen={reportOpen} includeTeamNotifications={isManager} />
        {reportOpen && <div ref={reportRef}><WeeklyReportDrawer isOpen variant="inline" onClose={() => setReportOpen(false)} ownerName={profile?.name || 'Report của tôi'} userId={profile?.id} canEdit weekStart={week.start} weekEnd={week.end} weekSelection={weekSelection} onWeekSelectionChange={setWeekSelection} tasks={reportTasks} references={references} onOpenTask={id => setSelectedKey(`task:${id}`)} /></div>}
      </div>
      <TaskDetailPanel task={selected?.kind === 'task' ? selected.record : null} isOpen={selected?.kind === 'task'} onClose={() => setSelectedKey(null)} onTaskUpdated={calendar.refresh} />
      {selected && (selected.kind === 'project' || selected.kind === 'campaign') && <CalendarWorkDetail item={selected} items={calendar.items} onClose={() => setSelectedKey(null)} onOpen={item => setSelectedKey(item.key)} />}
      {selected && (selected.kind === 'project_subtask' || selected.kind === 'campaign_subtask') && <SubtaskDetailPanel subtask={selected.record as any} entityType={selected.kind} profile={profile} people={profile ? [{ id: profile.id, name: profile.name }] : []} onClose={() => setSelectedKey(null)} onUpdated={calendar.refresh} />}
    </div>
  );
};
