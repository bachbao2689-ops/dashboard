import { isGlobalManager, isDepartmentLeader } from './roleScope.ts';

type Person = {
  id?: string | number;
  department_id?: string | null;
  role?: string | null;
  employment_level?: string | null;
  is_active?: boolean;
};
type Actor = Person | null | undefined;

export const sameWorkDepartment = (actor: Actor, departmentId: unknown) =>
  Boolean(actor?.department_id && departmentId && String(actor.department_id) === String(departmentId));

export function workAssignmentPeople<T extends Person>(
  actor: Actor,
  people: T[],
  parentDepartmentId?: string | null
): T[] {
  if (!actor || actor.is_active === false) return [];
  // 1. Admin / Manager: Toàn quyền giao việc toàn công ty
  if (isGlobalManager(actor)) return people.filter(p => p.is_active !== false);

  // 2. Leader: Giao việc trong phòng ban của mình VÀ các Leader phòng ban khác (hoặc chính mình)
  if (isDepartmentLeader(actor)) {
    return people.filter(
      p =>
        p.is_active !== false &&
        (String(p.id) === String(actor.id) ||
          sameWorkDepartment(actor, p.department_id) ||
          (parentDepartmentId && String(p.department_id) === String(parentDepartmentId)) ||
          isDepartmentLeader(p))
    );
  }

  // 3. Nhân viên (Staff) khi được giao PIC chính dự án:
  // Chỉ pick được nhân sự trong phạm vi phòng ban của mình (hoặc phòng ban dự án)
  const targetDeptId = actor.department_id || parentDepartmentId;
  return people.filter(
    p =>
      p.is_active !== false &&
      (String(p.id) === String(actor.id) ||
        (targetDeptId && String(p.department_id) === String(targetDeptId)))
  );
}
// Read authorization lives in RLS/workflow_hub_index. This module only limits
// assignment picker options; a directory snapshot must not decide data access.
