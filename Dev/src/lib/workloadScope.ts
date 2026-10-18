import { isGlobalManager, type RoleProfile } from './roleScope.ts';

type WorkloadProfile = (NonNullable<RoleProfile> & { id?: string | number | null }) | null | undefined;
type WorkloadMember = { id: string | number; department_id?: string | null };
type WorkloadDepartment = { id: string; name: string };
type WorkloadTask = {
  assignee_id?: string | number | null;
  department_id?: string | null;
  department?: { id?: string | null } | null;
  project?: { department_id?: string | null } | null;
  campaign?: { department_id?: string | null } | null;
};

/** One scope for the Workload page and every embedded performance chart. */
export function scopeTeamWorkload<Member extends WorkloadMember, Task extends WorkloadTask>(
  profile: WorkloadProfile,
  requestedDepartment: string,
  members: readonly Member[],
  departments: readonly WorkloadDepartment[],
  tasks: readonly Task[],
) {
  const canViewAllDepartments = isGlobalManager(profile);
  const ownDepartment = profile?.department_id ? String(profile.department_id) : null;
  const availableDepartments = canViewAllDepartments
    ? [...departments]
    : ownDepartment
      ? departments.some((department) => String(department.id) === ownDepartment)
        ? departments.filter((department) => String(department.id) === ownDepartment)
        : [{ id: ownDepartment, name: profile?.department_name || '' }]
      : [];
  const effectiveDepartmentFilter = canViewAllDepartments
    ? requestedDepartment !== 'all' && availableDepartments.some((department) => String(department.id) === String(requestedDepartment))
      ? String(requestedDepartment)
      : 'all'
    : ownDepartment || 'self';

  const visibleMembers = members.filter((member) => {
    if (!profile) return false;
    if (canViewAllDepartments) {
      return effectiveDepartmentFilter === 'all' || String(member.department_id) === effectiveDepartmentFilter;
    }
    return ownDepartment
      ? String(member.department_id) === ownDepartment
      : String(member.id) === String(profile.id);
  });
  const memberIds = new Set(visibleMembers.map((member) => String(member.id)));
  const visibleTasks = tasks.filter((task) => {
    if (!profile) return false;
    if (canViewAllDepartments && effectiveDepartmentFilter === 'all') return true;
    if (task.assignee_id != null && String(task.assignee_id).trim() !== '') {
      return memberIds.has(String(task.assignee_id));
    }
    const ownerDepartment = task.project?.department_id || task.campaign?.department_id || task.department_id || task.department?.id;
    return effectiveDepartmentFilter !== 'self' && Boolean(ownerDepartment) && String(ownerDepartment) === effectiveDepartmentFilter;
  });

  return {
    canViewAllDepartments,
    effectiveDepartmentFilter,
    departments: availableDepartments,
    users: visibleMembers,
    tasks: visibleTasks,
  };
}
