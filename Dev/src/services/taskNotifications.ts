import { supabase } from './supabase';

type TaskActivity = 'task_completed' | 'task_comment' | 'task_updated' | 'weekly_report';

export async function notifyTaskParticipants(task: any, actor: { id?: number; name?: string; department_id?: string | null }, type: TaskActivity) {
  if (!task?.id || !actor.id) return;
  const { data: taskRow } = await supabase.from('tasks').select('assignee_id, task_ref, title, project:project_id(name)').eq('id', task.id).maybeSingle();
  const assigneeId = taskRow?.assignee_id || task.assignee_id;
  const { data: leaders } = actor.department_id
    ? await supabase.from('users').select('id').eq('department_id', actor.department_id).eq('employment_level', 'Leader')
    : { data: [] as { id: number }[] };
  const recipients = [...new Set([assigneeId, ...(leaders || []).map(leader => leader.id)].filter(Boolean))];
  if (!recipients.length) return;
  const taskLabel = `${taskRow?.task_ref || task.task_ref || 'Task'} · ${taskRow?.title || task.title || ''}`;
  const projectData: any = taskRow?.project;
  const project = Array.isArray(projectData) ? projectData[0]?.name : projectData?.name;
  const action = type === 'task_completed' ? 'đã hoàn thành' : type === 'task_comment' ? 'đã bình luận tại' : type === 'weekly_report' ? 'đã cập nhật Weekly Report cho' : 'đã cập nhật';
  const message = `${actor.name || 'Một thành viên'} ${action} ${taskLabel}${project ? ` · ${project}` : ''}`;
  await supabase.from('notifications').insert(recipients.map(user_id => ({
    user_id, type, entity_type: 'task', entity_id: task.id, message,
    metadata: { task_ref: taskRow?.task_ref || task.task_ref, task_title: taskRow?.title || task.title, project },
  })));
}
