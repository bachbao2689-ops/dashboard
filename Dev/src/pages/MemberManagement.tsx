import {ActionButton} from '../components/common/ActionButton';
import { useState, useMemo } from 'react';
import { useMembers } from '../hooks/useMembers';
import type { Member } from '../hooks/useMembers';
import { useAuthStore } from '../store/authStore';
import { useResizableColumns } from '../hooks/useResizableColumns';
import { InviteMemberModal } from '../components/features/members/InviteMemberModal';
import { useTranslation } from '../i18n/translations';
import {canViewPersonInTeam,isGlobalManager} from '../lib/roleScope';
import { Plus, User, ChevronDown, ChevronRight, Trash2, RotateCcw, Shield } from 'lucide-react';
import { SearchInput, StatusFilterDropdown } from '../components/common/filters';

export function MemberManagement() {
  const { t } = useTranslation();
  const { tableRef: memberTableRef, widths: memberColWidths, startResize: startMemberColResize, totalTableWidth: memberTableWidth } = useResizableColumns({
    tableKey: 'members_table',
    initialWidths: [240, 200, 160, 160, 110, 130, 120, 120, 95],
    minWidth: 80,
  });
  const { members, departments, loading, addMember, setMemberRemoved } = useMembers();
  const profile = useAuthStore(state => state.profile);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [activeDropdown, setActiveDropdown] = useState<'role' | 'status' | null>(null);
  const [collapsedDepartments, setCollapsedDepartments] = useState<string[]>([]);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [savingMember, setSavingMember] = useState(false);
  const canManageAll = isGlobalManager(profile);

  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      if (!canViewPersonInTeam(profile, member)) return false;
      const matchesSearch = member.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            member.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter ? member.role === roleFilter : true;
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [members, profile, searchTerm, roleFilter, statusFilter]);

  const memberGroups = useMemo(() => {
    const sortMembers = (a: any, b: any) => {
      if (a.name?.includes('Thái Đặng') && !b.name?.includes('Thái Đặng')) return -1;
      if (!a.name?.includes('Thái Đặng') && b.name?.includes('Thái Đặng')) return 1;
      const isALeader = ['team_lead', 'leader', 'manager'].includes(a.role?.toLowerCase());
      const isBLeader = ['team_lead', 'leader', 'manager'].includes(b.role?.toLowerCase());
      if (isALeader && !isBLeader) return -1;
      if (!isALeader && isBLeader) return 1;
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateA - dateB;
    };
    return Object.entries(filteredMembers.reduce<Record<string, typeof filteredMembers>>((groups, member) => {
      const key = member.department?.name || t('members.unassigned');
      (groups[key] ||= []).push(member);
      return groups;
    }, {})).sort(([a], [b]) => a.localeCompare(b)).map(([dept, mbrs]) => [dept, mbrs.sort(sortMembers)] as [string, typeof filteredMembers]);
  }, [canManageAll, filteredMembers, profile?.department_name, t]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'manager': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'team_lead':
      case 'leader': return 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30 shadow-sm font-bold';
      case 'viewer': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'pending': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'removed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="p-1 sm:p-2 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 sm:py-2.5 mb-4 shrink-0 relative z-50">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">{t('members.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm">{t('members.subtitle')}</p>
        </div>
        
        <div className="mobile-actions-row flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t('members.search')}
          />

          <StatusFilterDropdown
            value={roleFilter}
            onChange={setRoleFilter}
            allKey=""
            label={t('members.allRoles')}
            icon={<Shield size={13} className={roleFilter ? 'text-primary dark:text-blue-400' : 'text-gray-400'} />}
            options={[
              { key: '', label: t('members.allRoles'), dot: 'bg-gray-400' },
              { key: 'admin', label: 'Admin', dot: 'bg-purple-500' },
              { key: 'manager', label: 'Manager', dot: 'bg-blue-500' },
              { key: 'leader', label: 'Leader', dot: 'bg-orange-500' },
              { key: 'member', label: t('members.roleMember'), dot: 'bg-emerald-500' }
            ]}
            isOpen={activeDropdown === 'role'}
            onToggle={() => setActiveDropdown(activeDropdown === 'role' ? null : 'role')}
            onClose={() => setActiveDropdown(null)}
          />

          <StatusFilterDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            allKey="all"
            label={t('members.allStatus')}
            options={[
              { key: 'all', label: t('members.allStatus'), dot: 'bg-gray-400' },
              { key: 'active', label: t('members.active'), dot: 'bg-emerald-500' },
              { key: 'removed', label: t('members.removed'), dot: 'bg-rose-500' }
            ]}
            isOpen={activeDropdown === 'status'}
            onToggle={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
            onClose={() => setActiveDropdown(null)}
          />

          {(Boolean(searchTerm) || Boolean(roleFilter) || statusFilter !== 'active') && (
            <ActionButton icon={<RotateCcw size={13} />}
              type="button"
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('');
                setStatusFilter('active');
              }}
              className="h-9 px-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 hover:text-gray-900 dark:hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title={t('projects.clearFilters')}
            >

              <span className="hidden sm:inline">{t('projects.clearFilters')}</span>
            </ActionButton>
          )}

          {canManageAll && (
            <ActionButton icon={<Plus size={15} />}
              type="button"
              onClick={() => setIsInviteModalOpen(true)}
              className="btn-add-new h-9 flex items-center gap-1.5 px-3.5 rounded-xl font-medium text-xs shadow-2xs cursor-pointer"
            >

              <span className="hidden sm:inline">{t('members.invite')}</span>
            </ActionButton>
          )}
        </div>
      </div>

      <div className="glass-panel rounded-3xl border border-white/20 bg-white/50 dark:bg-black/20 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table ref={memberTableRef} className="table-fixed text-left border-collapse" style={{ width: `${memberTableWidth}px` }}>
            <colgroup>
              {memberColWidths.map((w, idx) => (
                <col key={idx} style={{ width: `${w}px` }} />
              ))}
            </colgroup>
            <thead className="bg-black/5 dark:bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 relative">
                  <span className="truncate block">{t('members.col.member')}</span>
                  <div onMouseDown={(e) => startMemberColResize(0, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 relative">
                  <span className="truncate block">{t('members.col.contact')}</span>
                  <div onMouseDown={(e) => startMemberColResize(1, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 relative">
                  <span className="truncate block">{t('members.col.team')}</span>
                  <div onMouseDown={(e) => startMemberColResize(2, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 relative">
                  <span className="truncate block">{t('members.col.title')}</span>
                  <div onMouseDown={(e) => startMemberColResize(3, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 relative">
                  <span className="truncate block">{t('members.col.level')}</span>
                  <div onMouseDown={(e) => startMemberColResize(4, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 relative">
                  <span className="truncate block">{t('members.col.role')}</span>
                  <div onMouseDown={(e) => startMemberColResize(5, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 relative">
                  <span className="truncate block">{t('members.col.status')}</span>
                  <div onMouseDown={(e) => startMemberColResize(6, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 relative">
                  <span className="truncate block">{t('members.col.joined')}</span>
                  <div onMouseDown={(e) => startMemberColResize(7, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 text-right">{t('members.col.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">{t('common.loading')}</td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">{t('members.noMembers')}</td>
                </tr>
              ) : (
                memberGroups.flatMap(([departmentName, departmentMembers]) => [
                  ...([<tr key={`department-${departmentName}`} className="bg-gray-50 dark:bg-slate-800/70"><td colSpan={9} className="px-6 py-3"><button type="button" onClick={() => setCollapsedDepartments(current => current.includes(departmentName) ? current.filter(name => name !== departmentName) : [...current, departmentName])} className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-100"><span>{collapsedDepartments.includes(departmentName) ? <ChevronRight size={16} /> : <ChevronDown size={16} />}</span>{departmentName}<span className="text-xs font-normal text-gray-500">({departmentMembers.length})</span></button></td></tr>]),
                  ...(collapsedDepartments.includes(departmentName) ? [] : departmentMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 overflow-hidden">
                      <div className="flex items-center gap-3 overflow-hidden min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={20} className="text-gray-500" />
                          )}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white truncate">{member.name || t('common.unassigned')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 overflow-hidden"><span className="truncate block">{member.email}</span></td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 overflow-hidden"><span className="truncate block">{member.department?.name || '—'}</span></td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white overflow-hidden"><span className="truncate block">{member.job_title || '—'}</span></td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 overflow-hidden"><span className="truncate block">{member.employment_level || '—'}</span></td>
                    <td className="px-6 py-4 overflow-hidden">
                      <div className="truncate">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium truncate inline-block ${getRoleColor(member.role)}`}>
                          {member.role?.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 overflow-hidden">
                      <div className="truncate">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium truncate inline-block ${getStatusColor(member.status || 'pending')}`}>
                          {member.status === 'active' ? t('members.active').toUpperCase() : t('members.removed').toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 overflow-hidden">
                      <span className="truncate block">{member.created_at ? new Date(member.created_at).toLocaleDateString() : '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-right overflow-hidden">
                      {canManageAll && member.id !== profile?.id && (member.status === 'active' ?
                        <ActionButton icon={<Trash2 size={14} />} type="button" onClick={() => setMemberToRemove(member)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"> {t('common.delete')}</ActionButton>
                        : <ActionButton icon={<RotateCcw size={14} />} type="button" disabled={savingMember} onClick={async () => { setSavingMember(true); await setMemberRemoved(member, false); setSavingMember(false); }} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"> {t('members.restore')}</ActionButton>)}
                    </td>
                  </tr>
                  )))
                ])
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvite={addMember}
        departments={departments}
        canAddAdmin={profile?.role === 'admin'}
      />
      {memberToRemove && <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={() => !savingMember && setMemberToRemove(null)}>
        <div role="dialog" aria-modal="true" aria-labelledby="remove-member-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800" onClick={event => event.stopPropagation()}>
          <h2 id="remove-member-title" className="text-lg font-bold text-gray-900 dark:text-white">{t('members.removeTitle')}</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{t('members.removeConfirm', { name: memberToRemove.name })}</p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" disabled={savingMember} onClick={() => setMemberToRemove(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold dark:border-slate-700">{t('common.cancel')}</button>
            <button type="button" disabled={savingMember} onClick={async () => { if (!memberToRemove) return; setSavingMember(true); const success = await setMemberRemoved(memberToRemove, true); setSavingMember(false); if (success) setMemberToRemove(null); }} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{savingMember ? t('members.removing') : t('members.removeBtn')}</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
