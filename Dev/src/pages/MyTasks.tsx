import { ProjectCampaignDetailPanel } from '../components/features/projects/ProjectCampaignDetailPanel';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { RotateCcw } from 'lucide-react';
import { useTranslation } from '../i18n/translations';
import { DepartmentFilterDropdown, PicFilterDropdown } from '../components/common/filters';

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
  const { t } = useTranslation();
  const profile = useAuthStore(state => state.profile);
  const isGlobalManager = profile?.role === 'admin' || profile?.employment_level === 'manager' || (profile?.role === 'manager' && profile?.employment_level !== 'Leader');
  const isLeader = profile?.employment_level === 'Leader' || profile?.role === 'leader';
  const isManager = isGlobalManager || isLeader;
  const role = isManager ? 'manager' : 'staff';
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [filterDept, setFilterDept] = useState('');
  const [filterPic, setFilterPic] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<'dept' | 'pic' | null>(null);

  useEffect(() => {
    const handleOutside = () => setActiveDropdown(null);
    if (activeDropdown) {
      window.addEventListener('click', handleOutside);
      return () => window.removeEventListener('click', handleOutside);
    }
  }, [activeDropdown]);

  useEffect(() => {
    if (!isManager) return;
    let deptQuery = supabase.from('departments').select('id, name');
    let userQuery = supabase.from('users').select('id, name, department_id, avatar_url').eq('is_active', true);
    if (!isManager && profile?.department_id) {
      deptQuery = deptQuery.eq('id', profile.department_id);
      userQuery = userQuery.eq('department_id', profile.department_id);
    }
    Promise.all([deptQuery, userQuery]).then(([d, u]) => {
      if (d.data) setDepartments(d.data);
      if (u.data) setUsers(u.data);
    });
  }, [isManager, profile?.department_id]);

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
    <div className="relative flex min-h-full min-w-0">
      <div className={`min-w-0 flex-1 space-y-6 pb-6 transition-all duration-300 ${selected ? 'hidden md:block xl:mr-[516px] pr-2' : 'pr-0 lg:pr-4'}`}>
        <ProfileHeader role={role} />
        {/* ActivityTaskCard and ReportHistoryModal are temporarily replaced, retained for later use. */}
        <ProfileCalendar 
          {...calendar} 
          onRefresh={calendar.refresh} 
          onOpen={item => setSelectedKey(item.key)} 
          onReport={() => setReportOpen(value => !value)} 
          reportOpen={reportOpen} 
          includeTeamNotifications={isManager}
          extraFilters={
            isManager && (
              <div className="flex items-center gap-2">
                <DepartmentFilterDropdown
                  value={filterDept}
                  onChange={val => {
                    setFilterDept(val);
                    setFilterPic('');
                  }}
                  departments={departments}
                  isOpen={activeDropdown === 'dept'}
                  onToggle={() => setActiveDropdown(activeDropdown === 'dept' ? null : 'dept')}
                  onClose={() => setActiveDropdown(null)}
                />
                <PicFilterDropdown
                  value={filterPic || ''}
                  onChange={val => setFilterPic(val)}
                  people={visibleUsers}
                  allKey=""
                  allLabel={filterDept ? t('common.allStaff') : t('common.selectPic')}
                  label={filterDept ? t('common.allStaff') : t('common.selectPic')}
                  showMe={false}
                  showUnassigned={false}
                  isOpen={activeDropdown === 'pic'}
                  onToggle={() => setActiveDropdown(activeDropdown === 'pic' ? null : 'pic')}
                  onClose={() => setActiveDropdown(null)}
                />
                {(Boolean(filterDept) || Boolean(filterPic)) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterDept('');
                      setFilterPic('');
                    }}
                    className="h-9 px-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 hover:text-gray-900 dark:hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    title={t('projects.clearFilters')}
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
              </div>
            )
          }
        />
        {reportOpen && <div ref={reportRef}><WeeklyReportDrawer isOpen variant="inline" onClose={() => setReportOpen(false)} ownerName={profile?.name || 'Report của tôi'} userId={profile?.id} canEdit weekStart={week.start} weekEnd={week.end} weekSelection={weekSelection} onWeekSelectionChange={setWeekSelection} tasks={reportTasks} references={references} onOpenTask={id => setSelectedKey(`task:${id}`)} /></div>}
      </div>
      <TaskDetailPanel task={selected?.kind === 'task' ? selected.record : null} isOpen={selected?.kind === 'task'} onClose={() => setSelectedKey(null)} onTaskUpdated={calendar.refresh} />
      {selected && (selected.kind === 'project' || selected.kind === 'campaign') && <ProjectCampaignDetailPanel item={selected.record} kind={selected.kind as any} onClose={() => setSelectedKey(null)} onUpdated={calendar.refresh} />}
      {selected && (selected.kind === 'project_subtask' || selected.kind === 'campaign_subtask') && <SubtaskDetailPanel subtask={selected.record as any} entityType={selected.kind} profile={profile} people={profile ? [{ id: profile.id, name: profile.name }] : []} onClose={() => setSelectedKey(null)} onUpdated={calendar.refresh} />}
    </div>
  );
};
