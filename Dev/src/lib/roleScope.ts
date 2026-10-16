/** Keep rank checks aligned with public.workflow2_global and the Workflow scope rules. */
export type RoleProfile = {
  role?: string | null;
  employment_level?: string | null;
  department_id?: string | null;
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

export function canViewTeamManagement(profile: RoleProfile): boolean {
  return isGlobalManager(profile) || isDepartmentLeader(profile);
}

export function canViewPersonInTeam(profile: RoleProfile, person: { id: string | number; department_id?: string | null }): boolean {
  if (isGlobalManager(profile)) return true;
  return Boolean(profile?.department_id && person.department_id === profile.department_id);
}
