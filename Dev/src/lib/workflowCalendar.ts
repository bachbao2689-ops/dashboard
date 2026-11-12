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
export function taskContributors(
  tasks: { assignee_id?: string | number | null; assignee?: { id?: string | number; name: string; avatar_url?: string | null } | null; custom_fields?: any }[],
  directory: WorkflowPerson[] = []
): WorkflowPerson[] {
  const knownPeople = new Map(directory.map(p => [String(p.id), p]));
  const people = new Map<string, WorkflowPerson>();

  for (const task of tasks) {
    const allIds = Array.from(new Set([
      ...(task.assignee_id != null ? [task.assignee_id] : []),
      ...(((task.custom_fields as any)?.assignee_ids as (string | number)[]) || [])
    ])).filter(Boolean);

    for (const rawId of allIds) {
      const id = String(rawId);
      if (people.has(id)) continue;
      if (task.assignee?.name && (task.assignee.id == null || String(task.assignee.id) === id || String(task.assignee_id) === id)) {
        people.set(id, { id: Number(id), name: task.assignee.name, avatar_url: task.assignee.avatar_url || undefined });
      } else {
        const found = knownPeople.get(id);
        if (found) {
          people.set(id, { id: Number(id), name: found.name, avatar_url: found.avatar_url || undefined });
        }
      }
    }
  }
  return [...people.values()];
}

/** Phase cards show explicit Sub-PICs as well as people assigned to phase tasks. */
export function workflowPhaseContributors(
  members: WorkflowPerson[],
  tasks: { assignee_id?: string | number | null; assignee?: { id?: string | number; name: string; avatar_url?: string | null } | null; custom_fields?: any }[],
  directory: WorkflowPerson[] = [],
): WorkflowPerson[] {
  const knownPeople = new Map(directory.map(person => [String(person.id), person]));
  const contributors = new Map<string, WorkflowPerson>();

  for (const member of members) {
    if (member.role === 'sub_pic') contributors.set(String(member.id), member);
  }

  for (const task of tasks) {
    const allIds = Array.from(new Set([
      ...(task.assignee_id != null ? [task.assignee_id] : []),
      ...(((task.custom_fields as any)?.assignee_ids as (string | number)[]) || [])
    ])).filter(Boolean);

    for (const rawId of allIds) {
      const key = String(rawId);
      if (contributors.has(key)) continue;
      const person = (task.assignee?.name && (task.assignee.id == null || String(task.assignee.id) === key || String(task.assignee_id) === key))
        ? { id: Number(key), name: task.assignee.name, avatar_url: task.assignee.avatar_url || undefined }
        : knownPeople.get(key);
      if (person) contributors.set(key, { id: Number(key), name: person.name, avatar_url: person.avatar_url || undefined });
    }
  }

  return [...contributors.values()];
}
