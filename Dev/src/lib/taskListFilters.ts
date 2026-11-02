import {taskActive,taskDay,taskDone,type TrackedTask} from './taskTracking.ts';
import {taskCompletedInPeriod} from './taskPeriod.ts';

type DateFilter = {calendar: string; customStart?: string; customEnd?: string; queryStart?: string | null; queryEnd?: string | null};

/** A null result delegates unfinished work to the existing scheduling filters. */
export function completedTaskDateMatch(task: TrackedTask, filter: DateFilter, now = new Date()): boolean | null {
  if (!taskDone(task)) return null;
  if (!taskActive(task)) return false;
  if (['ongoing','due_soon','overdue'].includes(filter.calendar)) return false;
  let start = '', end = '';
  if (filter.calendar === 'this_week' || filter.calendar === 'this_month') {
    const date = new Date(`${taskDay(now.toISOString())}T12:00:00Z`);
    if (filter.calendar === 'this_week') {
      date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
      start = date.toISOString().slice(0,10);
      date.setUTCDate(date.getUTCDate() + 6);
      end = date.toISOString().slice(0,10);
    } else {
      start = new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1,12)).toISOString().slice(0,10);
      end = new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0,12)).toISOString().slice(0,10);
    }
  } else if (filter.customStart || filter.customEnd) {
    start = filter.customStart || '';
    end = filter.customEnd || '';
  } else {
    start = filter.queryStart || '';
    end = filter.queryEnd || '';
  }
  // An unfiltered Done list still includes legacy work without a known completion time.
  return start || end ? taskCompletedInPeriod(task,start,end) : true;
}

/** Use the same IDs for the checkboxes, counter and bulk operation payloads. */
export function visibleTaskSelection(selected: string[], rows: readonly {id: string}[]): string[] {
  const visible = new Set(rows.map(row => row.id));
  const next = selected.filter(id => visible.has(id));
  return next.length === selected.length ? selected : next;
}
