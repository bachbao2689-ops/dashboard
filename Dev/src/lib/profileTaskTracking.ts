import {calendarDay} from './profileCalendar.ts';
import {taskActive,taskDone,type TrackedTask} from './taskTracking.ts';
// Completion timestamps are authoritative; an unrelated edit never moves a finished task into a new week.
export const tasksForProfileWeek = <T extends TrackedTask>(tasks:T[],weekStart:string,weekEnd:string):T[] => tasks.filter(task=>{
 if(!taskActive(task))return false;
 const created=calendarDay(task.created_at);if(created&&created>weekEnd)return false;
 if(!taskDone(task))return true;
 const completed=calendarDay(task.completed_at);
 // Historical completions without timestamps remain reviewable, but are never assigned a fabricated completion day.
 return !completed||completed>=weekStart;
});
