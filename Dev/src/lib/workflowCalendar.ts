import type { WorkflowPerson } from './workflowHub';

export interface CalendarWindow { start_date?: string | null; due_date?: string | null }
const day = (value?: string | null) => value?.slice(0, 10) || '';
export function workflowCalendarWindow(parent?: CalendarWindow, phase?: CalendarWindow) {
  const starts = [day(parent?.start_date), day(phase?.start_date)].filter(Boolean);
  const dues = [day(parent?.due_date), day(phase?.due_date)].filter(Boolean);
  return { start: starts.sort().at(-1) || '', due: dues.sort()[0] || '' };
}
export function workflowDateError(start: string, due: string, bounds: { start: string; due: string }) {
  if (start && due && start > due) return 'order';
  if (bounds.start && [start, due].some(value => value && value < bounds.start)) return 'before';
  if (bounds.due && [start, due].some(value => value && value > bounds.due)) return 'after';
  return null;
}
export function taskContributors(tasks: { assignee_id?: string | number | null; assignee?: { id?: string | number; name: string; avatar_url?: string | null } | null }[]): WorkflowPerson[] {
  const people = new Map<string, WorkflowPerson>();
  for (const task of tasks) {
    if (!task.assignee?.name) continue;
    const id = task.assignee.id ?? task.assignee_id;
    if (id == null) continue;
    people.set(String(id), { id: Number(id), name: task.assignee.name, avatar_url: task.assignee.avatar_url || undefined });
  }
  return [...people.values()];
}

/** People shown on a phase card: explicit phase Sub-PICs plus actual task assignees. */
export function workflowPhaseContributors(
  members: WorkflowPerson[],
  tasks: { assignee_id?: string | number | null; assignee?: { id?: string | number; name: string; avatar_url?: string | null } | null }[],
  directory: WorkflowPerson[] = [],
): WorkflowPerson[] {
  const knownPeople = new Map(directory.map(person => [String(person.id), person]));
  const contributors = new Map<string, WorkflowPerson>();

  for (const member of members) {
    if (member.role === 'sub_pic') contributors.set(String(member.id), member);
  }

  for (const task of tasks) {
    const id = task.assignee?.id ?? task.assignee_id;
    if (id == null) continue;
    const key = String(id);
    const person = task.assignee?.name
      ? { id: Number(id), name: task.assignee.name, avatar_url: task.assignee.avatar_url || undefined }
      : knownPeople.get(key);
    if (person && !contributors.has(key)) contributors.set(key, person);
  }

  return [...contributors.values()];
}
