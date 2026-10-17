import {useSearchParams} from 'react-router-dom';
import { ProjectCampaignDetailPanel } from '../components/features/projects/ProjectCampaignDetailPanel';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, RotateCcw, X } from 'lucide-react';
import { useTranslation } from '../i18n/translations';
import { DepartmentFilterDropdown, PicFilterDropdown } from '../components/common/filters';

import { ProfileHeader } from '../components/features/profile/ProfileHeader';
import { ProfileCalendar } from '../components/features/profile/ProfileCalendar';
import { TaskDetailPanel } from '../components/features/tasks/TaskDetailPanel';
import { SubtaskDetailPanel } from '../components/features/projects/SubtaskDetailPanel';
import { useProfileCalendar } from '../hooks/useProfileCalendar';
import { useAuthStore } from '../store/authStore';
import {canViewPersonInTeam,canViewTeamManagement,isDepartmentLeader,isGlobalManager} from '../lib/roleScope';
import {useWorkspaceDirectory} from '../hooks/useWorkspaceData';
import { useRememberedState } from '../hooks/useRememberedState';

export const MyTasks: React.FC = () => {
  const { t } = useTranslation();
  const profile = useAuthStore(state => state.profile);
  const globalScope = isGlobalManager(profile);
  const leaderScope = isDepartmentLeader(profile);
  const isManager = canViewTeamManagement(profile);
  const role = isManager ? 'manager' : 'staff';
  const directory = useWorkspaceDirectory(isManager);
  const departments = useMemo(() => (directory.data?.departments || []).filter(department => globalScope || (leaderScope && department.id === profile?.department_id)), [directory.data, globalScope, leaderScope, profile?.department_id]);
  const users = useMemo(() => (directory.data?.users || []).filter(user => canViewPersonInTeam(profile, user)), [directory.data, profile]);
  const [filterDept, setFilterDept] = useRememberedState('profile.departmentFilter', '');
  const [filterPic, setFilterPic] = useRememberedState('profile.picFilter', '');
  const [activeDropdown, setActiveDropdown] = useState<'dept' | 'pic' | null>(null);

  useEffect(() => {
    if (!directory.data) return;
    if (filterDept && !departments.some(department => String(department.id) === filterDept)) setFilterDept('');
    if (filterPic && !users.some(user => String(user.id) === filterPic)) setFilterPic('');
  }, [directory.data, filterDept, filterPic, departments, users, setFilterDept, setFilterPic]);

  const visibleUsers = useMemo(() => {
    if (!filterDept) return users;
    return users.filter(u => String(u.department_id) === filterDept);
  }, [filterDept, users]);

  const targetUserId = isManager && filterPic && visibleUsers.some(user => String(user.id) === String(filterPic) && canViewPersonInTeam(profile, user)) ? filterPic : profile?.id;
  const calendar = useProfileCalendar(targetUserId);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [searchParams]=useSearchParams();
  const [reportOpen, setReportOpen] = useState(searchParams.get("report")==="1");
  const reportRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{if(searchParams.get("report")==="1")setReportOpen(true);},[searchParams]);
  useEffect(() => { if (reportOpen) reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [reportOpen]);
  const selected = calendar.items.find(item => item.key === selectedKey);
  return (
    <div className="relative flex min-h-full min-w-0">
      <div className={`min-w-0 flex-1 space-y-6 pb-6 transition-all duration-300 ${selected ? 'hidden xl:block xl:mr-[516px] pr-2' : 'pr-0 lg:pr-4'}`}>
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
              <div className="mobile-actions-row flex items-center gap-2">
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
                  allLabel={t('common.selectPic')}
                  label={t('common.selectPic')}
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
        {reportOpen && <div ref={reportRef} role="status" className="card-hub flex min-h-40 items-center gap-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary dark:bg-slate-700 dark:text-blue-300"><FileText size={22} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-gray-900 dark:text-white">{t('profile.myReport')}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('profile.reportComingSoon')}</p>
          </div>
          <button type="button" onClick={() => setReportOpen(false)} aria-label={t('common.close')} className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700"><X size={18} /></button>
        </div>}
      </div>
      <TaskDetailPanel task={selected?.kind === 'task' ? selected.record : null} isOpen={selected?.kind === 'task'} onClose={() => setSelectedKey(null)} onTaskUpdated={calendar.refresh} />
      {selected && (selected.kind === 'project' || selected.kind === 'campaign') && <ProjectCampaignDetailPanel item={selected.record} kind={selected.kind as any} onClose={() => setSelectedKey(null)} onUpdated={calendar.refresh} />}
      {selected && (selected.kind === 'project_subtask' || selected.kind === 'campaign_subtask') && <SubtaskDetailPanel subtask={selected.record as any} entityType={selected.kind} profile={profile} people={profile ? [{ id: profile.id, name: profile.name }] : []} onClose={() => setSelectedKey(null)} onUpdated={calendar.refresh} />}
    </div>
  );
};
