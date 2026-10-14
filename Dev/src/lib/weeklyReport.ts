import {calendarDay} from './profileCalendar.ts';
import {taskActive,taskDone} from './taskTracking.ts';
export type WeekSelection = 'current' | 'previous' | string;

type ReportTask = {
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
  workflow_status?: string | null;
};

const dateKey = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');

export const weeklyReportRange = (selection: WeekSelection) => {
  if (selection !== 'current' && selection !== 'previous') {
    const parts = selection.split('|');
    if (parts.length === 2) return { start: parts[0], end: parts[1] };
  }
  const monday = new Date();
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) - (selection === 'previous' ? 7 : 0));
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return { start: dateKey(monday), end: dateKey(sunday) };
};

// Completion timestamps are authoritative; an unrelated edit never moves a finished task into a new week.
export const tasksForWeeklyReport = <T extends ReportTask>(tasks:T[],weekStart:string,weekEnd:string):T[] => tasks.filter(task=>{
 if(!taskActive(task))return false;
 const created=calendarDay(task.created_at);if(created&&created>weekEnd)return false;
 if(!taskDone(task))return true;
 const completed=calendarDay(task.completed_at);
 // Historical completions without timestamps remain reviewable, but are never assigned a fabricated completion day.
 return !completed||completed>=weekStart;
});
