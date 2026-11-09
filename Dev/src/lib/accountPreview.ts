import type {StaffProfile} from '../store/authStore.ts';
import {isAdmin,isGlobalManager,isDepartmentLeader} from './roleScope.ts';

export type DirectoryPerson = {
  id: string | number;
  name: string;
  avatar_url?: string | null;
  role?: string | null;
  employment_level?: string | null;
  job_title?: string | null;
  department_id?: string | null;
  is_active?: boolean;
};
export type PreviewRank = 'admin' | 'manager' | 'leader' | 'staff';

// Presets resolve real active accounts; an empty rank never invents an identity.
export function resolvePreviewAccount<T extends DirectoryPerson>(
  users: readonly T[], rank: PreviewRank, departmentId?: string | null, preferredId?: string | number,
): T | undefined {
  const eligible = users.filter(user => user.is_active !== false && (
    rank === 'admin' ? isAdmin(user) : rank === 'manager' ? isGlobalManager(user) && !isAdmin(user)
      : Boolean(departmentId && user.department_id === departmentId) && (
        rank === 'leader' ? isDepartmentLeader(user) : !isGlobalManager(user) && !isDepartmentLeader(user)
      )
  ));
  return eligible.find(user => String(user.id) === String(preferredId))
    || eligible.slice().sort((a,b) => Number(a.id)-Number(b.id))[0];
}

export function previewProfile(user: DirectoryPerson, departments: readonly {id:string;name:string}[]): StaffProfile {
  return {
    id: Number(user.id), auth_id: null, email: null, name: user.name,
    avatar_url: user.avatar_url || null, role: user.role || 'member',
    employment_level: user.employment_level || null, job_title: user.job_title || null,
    department_id: user.department_id || null,
    department_name: departments.find(dept => dept.id === user.department_id)?.name || null,
    is_active: user.is_active !== false,
  };
}

// A deleted/deactivated preview returns to the real account. Changes to rank,
// department, name and avatar are reflected without reselecting the person.
export function reconcileAccountPreview<T extends StaffProfile>(
  current: T, original: T, users: readonly DirectoryPerson[], departments: readonly {id:string;name:string}[],
): T | ReturnType<typeof previewProfile> {
  if (current.id === original.id) return current;
  const person = users.find(user => String(user.id) === String(current.id) && user.is_active !== false);
  const next = person ? previewProfile(person, departments) : original;
  return Object.entries(next).every(([key,value]) => current[key as keyof T] === value) ? current : next;
}
