import {taskActive,taskDay,taskDone,type TrackedTask} from './taskTracking.ts';

/** Completed work is attributed to its completion day in Vietnam, never its deadline. */
export function taskCompletedInPeriod(task: TrackedTask, start?: string | null, end?: string | null): boolean {
  if (!taskActive(task) || !taskDone(task)) return false;
  const completed = taskDay(task.completed_at);
  if (!completed) return false;
  const first = start ? taskDay(start) : '';
  const last = end ? taskDay(end) : '';
  if ((start && !first) || (end && !last)) return false;
  const [from,to] = first && last && first > last ? [last,first] : [first,last];
  return (!from || completed >= from) && (!to || completed <= to);
}
