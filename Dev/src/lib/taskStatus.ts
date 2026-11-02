export type TaskStatusRecord = {status?: string | null; workflow_status?: string | null};

export const normalizeTaskStatus = (status?: string | null) => (status || '').trim().toLowerCase();
const workflowStages = new Set(['backlog', 'planned', 'scoping', 'in_progress', 'in_qa', 'completed', 'canceled']);

export const isTaskDoneStatus = (status?: string | null) =>
  ['done', 'complete', 'completed'].includes(normalizeTaskStatus(status));

export const isTaskDone = (task: TaskStatusRecord) => {
  const workflowStatus = normalizeTaskStatus(task.workflow_status);
  return workflowStages.has(workflowStatus) ? workflowStatus === 'completed' : isTaskDoneStatus(task.status);
};

export const isTaskActive = (task: TaskStatusRecord) =>
  !['deleted', 'archived', 'cancelled', 'canceled'].includes(normalizeTaskStatus(task.status)) &&
  !['cancelled', 'canceled'].includes(normalizeTaskStatus(task.workflow_status));

export const isTaskOpen = (task: TaskStatusRecord) => isTaskActive(task) && !isTaskDone(task);

/** Use Workflow stage when present; legacy status values follow WorkflowStatusPicker's fallback. */
export function taskState(task: TaskStatusRecord): 'done' | 'in_review' | 'in_progress' | 'todo' {
  if (isTaskDone(task)) return 'done';
  const workflowStatus = normalizeTaskStatus(task.workflow_status);
  const status = workflowStages.has(workflowStatus) ? workflowStatus : normalizeTaskStatus(task.status);
  if (['in_review', 'review', 'in_qa', 'feedback', 'pending'].includes(status)) return 'in_review';
  if (['in_progress', 'in-progress', 'doing', 'scoping'].includes(status)) return 'in_progress';
  return 'todo';
}
