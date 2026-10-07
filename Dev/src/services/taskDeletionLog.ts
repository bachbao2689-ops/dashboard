import { supabase } from './supabase';

const workspaceId = '9000eae0-528c-47a2-b6f3-eba019d4edca';

type TaskDeletion = {
  userId: number;
  taskId: string;
  entityType: 'task' | 'project_subtask' | 'campaign_subtask';
  title: string;
  parentName?: string | null;
  parentType?: 'project' | 'campaign' | null;
};

export const recordTaskDeletion = async ({ userId, taskId, entityType, title, parentName, parentType }: TaskDeletion) => {
  return supabase.from('activity_log').insert({
    workspace_id: workspaceId,
    user_id: userId,
    action: 'task_deleted',
    entity_type: entityType,
    entity_id: taskId,
    metadata: { task_title: title, parent_name: parentName || null, parent_type: parentType || null },
  });
};
