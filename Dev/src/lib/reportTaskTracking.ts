import {taskActive, taskDay, taskDone, type TrackedTask} from './taskTracking.ts';
import {computeDeliverableQuantity} from './taskDeliverables.ts';

export type ReportQuantityTask = TrackedTask & {
  quantity?: number | null;
  deliverable_quantity?: number | null;
  checklist_items?: Array<{quantity?: number | null; completed?: boolean}>;
};

/** The mapped total already includes checklist quantities; never add it twice. */
export function reportDeliverableQuantity(task: ReportQuantityTask): number {
  if ('quantity' in task || Array.isArray(task.checklist_items)) {
    return computeDeliverableQuantity(task).totalQuantity;
  }
  const quantity = Number(task.deliverable_quantity);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

/** Every card, drilldown, staff row and export receives the same period rows. */
export function reportPeriodTasks<T extends TrackedTask>(tasks: readonly T[], start: string, end: string, all = false): T[] {
  return tasks.filter(task => {
    if (!taskActive(task)) return false;
    if (all) return true;
    const created = taskDay(task.created_at) || taskDay(task.start_date);
    if (created && created > end) return false;
    if (taskDone(task)) {
      // A deadline/edit is not evidence of when the task was completed.
      const completed = taskDay(task.completed_at);
      return Boolean(completed && completed >= start && completed <= end);
    }
    const due = taskDay(task.due_date);
    return !due || due <= end || Boolean(created && created >= start);
  });
}

export function reportTaskTotals(tasks: readonly ReportQuantityTask[]) {
  const rows = tasks.filter(taskActive);
  let completedTasks = 0, totalDeliverables = 0, completedDeliverables = 0;
  for (const task of rows) {
    const quantity = reportDeliverableQuantity(task);
    totalDeliverables += quantity;
    if (taskDone(task)) { completedTasks++; completedDeliverables += quantity; }
  }
  return {
    totalTasks: rows.length,
    completedTasks,
    totalDeliverables,
    completedDeliverables,
    remainingDeliverables: totalDeliverables - completedDeliverables,
  };
}
