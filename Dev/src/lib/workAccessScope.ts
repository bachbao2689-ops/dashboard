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

export function workflowTaskAssigneePeople<T extends Person>(
  actor: Actor,
  people: T[],
  currentEntity?: any,
  activePhase?: any
): T[] {
  if (!actor || actor.is_active === false) return [];

  // 1. Các cấp bậc Manager/admin thì thấy hết các staff
  if (isGlobalManager(actor)) {
    return people.filter(p => p.is_active !== false);
  }

  // 2. Cấp bậc Lead thấy Staff phòng ban mình và các Leader khác (kèm thành viên tham gia)
  if (isDepartmentLeader(actor)) {
    const participantIds = new Set<string>();
    (currentEntity?.pics || []).forEach((p: any) => participantIds.add(String(p.id)));
    (currentEntity?.sub_pics || []).forEach((p: any) => participantIds.add(String(p.id)));
    (activePhase?.members || []).forEach((p: any) => participantIds.add(String(p.id)));

    return people.filter(p =>
      p.is_active !== false &&
      (String(p.id) === String(actor.id) ||
        sameWorkDepartment(actor, p.department_id) ||
        isDepartmentLeader(p) ||
        participantIds.has(String(p.id)))
    );
  }

  // 3. Cấp bậc nhân viên thấy được các thành viên tham gia
  const participantIds = new Set<string>();
  if (actor?.id) participantIds.add(String(actor.id));
  (currentEntity?.pics || []).forEach((p: any) => participantIds.add(String(p.id)));
  (currentEntity?.sub_pics || []).forEach((p: any) => participantIds.add(String(p.id)));
  if (currentEntity?.creator?.id) participantIds.add(String(currentEntity.creator.id));
  (activePhase?.members || []).forEach((p: any) => participantIds.add(String(p.id)));

  const matched = people.filter(p => p.is_active !== false && participantIds.has(String(p.id)));
  if (matched.length > 0) return matched;

  const fallbackList: any[] = [];
  participantIds.forEach(id => {
    const fromPhase = (activePhase?.members || []).find((m: any) => String(m.id) === id);
    const fromEntity = (currentEntity?.pics || []).find((m: any) => String(m.id) === id)
      || (currentEntity?.sub_pics || []).find((m: any) => String(m.id) === id);
    if (fromPhase) fallbackList.push(fromPhase);
    else if (fromEntity) fallbackList.push(fromEntity);
    else if (actor && String(actor.id) === id) fallbackList.push(actor);
  });
  return fallbackList as T[];
}
