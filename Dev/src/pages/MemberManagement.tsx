import { useState, useMemo } from 'react';
import { useMembers } from '../hooks/useMembers';
import { useAuthStore } from '../store/authStore';
import { InviteMemberModal } from '../components/features/members/InviteMemberModal';
import { useTranslation } from '../i18n/translations';
import { Search, Plus, MoreVertical, User, ChevronDown, ChevronRight } from 'lucide-react';

export function MemberManagement() {
  const { t } = useTranslation();
  const { members, loading, inviteMember } = useMembers();
  const profile = useAuthStore(state => state.profile);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [collapsedDepartments, setCollapsedDepartments] = useState<string[]>([]);
  const canManageAll = true;

  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const inVisibleDepartment = canManageAll || (profile?.department_id && member.department?.name === profile.department_name);
      const matchesSearch = member.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            member.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter ? member.role === roleFilter : true;
      const matchesStatus = statusFilter ? member.status === statusFilter : true;
      return inVisibleDepartment && matchesSearch && matchesRole && matchesStatus;
    });
  }, [members, searchTerm, roleFilter, statusFilter, canManageAll, profile?.department_id, profile?.department_name]);

  const memberGroups = useMemo(() => {
    if (!canManageAll) return [[profile?.department_name || 'Phòng ban của tôi', filteredMembers] as const];
    return Object.entries(filteredMembers.reduce<Record<string, typeof filteredMembers>>((groups, member) => {
      const key = member.department?.name || t('members.unassigned');
      (groups[key] ||= []).push(member);
      return groups;
    }, {})).sort(([a], [b]) => a.localeCompare(b));
  }, [canManageAll, filteredMembers, profile?.department_name]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'manager': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'team_lead': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300';
      case 'viewer': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'pending': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'suspended': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-50">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('members.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('members.subtitle')}</p>
        </div>
        
        <div className="flex flex-nowrap items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-hide w-full sm:w-auto">
          <div className={`flex items-center transition-all duration-300 ${isSearchExpanded ? 'w-48 sm:w-64' : 'w-10'} bg-white dark:bg-slate-800 border border-gray-200 dark:border-[#8fa8d0] rounded-xl overflow-hidden shadow-sm h-10`}>
            <button onClick={() => setIsSearchExpanded(!isSearchExpanded)} className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-primary transition-colors flex-shrink-0">
              <Search className="w-5 h-5" />
            </button>
            <input
              type="text"
              placeholder={t("members.search")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-gray-700 dark:text-gray-300 pr-3 transition-opacity duration-300 ${isSearchExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-8 sm:h-10 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm rounded-xl flex-shrink-0 border border-gray-200 dark:border-[#8fa8d0] bg-white dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm appearance-none cursor-pointer"
          >
            <option value="">{t('members.allRoles')}</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="team_lead">Team Lead</option>
            <option value="staff">Staff</option>
            <option value="viewer">Viewer</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 sm:h-10 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm rounded-xl flex-shrink-0 border border-gray-200 dark:border-[#8fa8d0] bg-white dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm appearance-none cursor-pointer"
          >
            <option value="">{t('members.allStatus')}</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>

          {canManageAll && <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 h-10 px-4 bg-[#002e6d] text-white rounded-xl hover:bg-[#001f4d] transition-colors shadow-sm font-semibold text-sm"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">{t('members.invite')}</span>
          </button>}
        </div>
      </div>

      <div className="glass-panel rounded-3xl border border-white/20 bg-white/50 dark:bg-black/20 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left">
            <thead className="bg-black/5 dark:bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{t('members.col.member')}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{t('members.col.contact')}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{t('members.col.team')}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{t('members.col.title')}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{t('members.col.level')}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{t('members.col.role')}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{t('members.col.status')}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{t('members.col.joined')}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 text-right">{t('members.col.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">Loading members...</td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">No members found</td>
                </tr>
              ) : (
                memberGroups.flatMap(([departmentName, departmentMembers]) => [
                  ...(canManageAll ? [<tr key={`department-${departmentName}`} className="bg-gray-50 dark:bg-slate-800/70"><td colSpan={9} className="px-6 py-3"><button type="button" onClick={() => setCollapsedDepartments(current => current.includes(departmentName) ? current.filter(name => name !== departmentName) : [...current, departmentName])} className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-100"><span>{collapsedDepartments.includes(departmentName) ? <ChevronRight size={16} /> : <ChevronDown size={16} />}</span>{departmentName}<span className="text-xs font-normal text-gray-500">({departmentMembers.length})</span></button></td></tr>] : []),
                  ...(collapsedDepartments.includes(departmentName) ? [] : departmentMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={20} className="text-gray-500" />
                          )}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{member.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{member.email}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{member.department?.name || '—'}</td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white">{member.job_title || '—'}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{member.employment_level || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                        {member.role?.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status || 'pending')}`}>
                        {(member.status || 'pending').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      {member.created_at ? new Date(member.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative group inline-block">
                        <button className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500 dark:text-gray-400">
                          <MoreVertical size={20} />
                        </button>
                        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-black/10 dark:border-[#8fa8d0] py-1 hidden group-hover:block z-10">
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5">Edit Role</button>
                          <button className="w-full text-left px-4 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-black/5 dark:hover:bg-white/5">Suspend</button>
                          <button className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-black/5 dark:hover:bg-white/5">Remove</button>
                        </div>
                      </div>
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
        onInvite={inviteMember}
      />
    </div>
  );
}
