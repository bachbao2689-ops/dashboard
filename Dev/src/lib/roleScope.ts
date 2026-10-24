/** Keep rank checks aligned with public.workflow2_global and the Workflow scope rules. */
export type RoleProfile = {
  role?: string | null;
  employment_level?: string | null;
  department_id?: string | null;
  department_name?: string | null;
} | null | undefined;

const normalized = (value?: string | null) => (value || '').trim().toLowerCase();

export function isAdmin(profile: RoleProfile): boolean {
  return normalized(profile?.role) === 'admin';
}

export function isGlobalManager(profile: RoleProfile): boolean {
  const role = normalized(profile?.role);
  const level = normalized(profile?.employment_level);
  return role === 'admin' || level === 'manager' || (role === 'manager' && level !== 'leader');
}

export function isDepartmentLeader(profile: RoleProfile): boolean {
  if (isGlobalManager(profile)) return false;
  return normalized(profile?.role) === 'leader' || normalized(profile?.employment_level) === 'leader';
}

export function isAssetApprover(profile: RoleProfile): boolean {
  return isAdmin(profile) || isGlobalManager(profile) || (isDepartmentLeader(profile) && normalized(profile?.department_name) === 'design');
}

export function canSubmitAssetRequest(profile: RoleProfile): boolean {
  return Boolean(profile && ((normalized(profile.role) === 'member' && !isDepartmentLeader(profile) && !isGlobalManager(profile)) || isAssetApprover(profile)));
}

export function canViewTeamManagement(profile: RoleProfile): boolean {
  return isGlobalManager(profile) || isDepartmentLeader(profile);
}

export function canViewPersonInTeam(profile: RoleProfile, person: { id: string | number; department_id?: string | null }): boolean {
  if (isGlobalManager(profile)) return true;
  return Boolean(profile?.department_id && person.department_id === profile.department_id);
}

export interface MentionablePerson {
  id: string | number;
  name: string;
  avatar_url?: string | null;
  role?: string | null;
  employment_level?: string | null;
  department_id?: string | number | null;
  departments?: { name?: string; id?: string | number } | null;
  department?: { name?: string; id?: string | number } | null;
}

export type MentionActorProfile = {
  id?: string | number | null;
  role?: string | null;
  employment_level?: string | null;
  department_id?: string | null;
  department_name?: string | null;
} | null | undefined;

/**
 * Filter who can be tagged in comment @mentions:
 * 1. Staff: Can tag members of the same department, or collaborators sharing the subtask/task/project.
 * 2. Leader: Like staff, PLUS can tag Leaders and Managers across other departments.
 * 3. Global Manager / Admin: Can tag anyone across all departments.
 * 4. Self: Can always tag oneself.
 */
export function canMentionPerson(
  actor: MentionActorProfile,
  target: MentionablePerson,
  collaboratorIds?: Iterable<string | number>
): boolean {

  if (!actor || !target) return false;

  // Always allow tagging oneself
  if (actor.id !== undefined && target.id !== undefined && String(actor.id) === String(target.id)) {
    return true;
  }

  // Global Admin / Global Manager can tag anyone
  if (isAdmin(actor) || isGlobalManager(actor)) {
    return true;
  }

  // Same department members can always tag each other
  const actorDeptId = actor.department_id ? String(actor.department_id) : null;
  const targetDeptId = (target.department_id || target.departments?.id || target.department?.id)
    ? String(target.department_id || target.departments?.id || target.department?.id)
    : null;

  if (actorDeptId && targetDeptId && actorDeptId === targetDeptId) {
    return true;
  }

  // Check department name fallback if IDs are missing
  const actorDeptName = normalized(actor.department_name);
  const targetDeptName = normalized(target.departments?.name || target.department?.name);
  if (actorDeptName && targetDeptName && actorDeptName === targetDeptName) {
    return true;
  }

  // Subtask/task/project collaborator can be tagged
  if (collaboratorIds) {
    const targetIdStr = String(target.id);
    for (const cid of collaboratorIds) {
      if (String(cid) === targetIdStr) return true;
    }
  }

  // Department Leader can tag Leaders and Managers across other departments
  if (isDepartmentLeader(actor)) {
    const roleLower = normalized(target.role);
    const levelLower = normalized(target.employment_level);
    const isLeaderOrManager =
      ['admin', 'manager', 'leader'].includes(roleLower) ||
      ['admin', 'manager', 'leader'].includes(levelLower);
    if (isLeaderOrManager) {
      return true;
    }
  }

  return false;
}

