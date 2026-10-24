import { supabase } from './supabase';

export interface LogTaskActivityParams {
  workspaceId?: string;
  userId?: number | null;
  action: string;
  entityType: 'task' | 'project_subtask' | 'campaign_subtask';
  entityId: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

export async function logTaskActivity({
  workspaceId = '9000eae0-528c-47a2-b6f3-eba019d4edca',
  userId = null,
  action,
  entityType,
  entityId,
  oldValue = null,
  newValue = null,
  metadata = {},
}: LogTaskActivityParams) {
  try {
    const payload = {
      workspace_id: workspaceId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue,
      new_value: newValue,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    };
    const { data, error } = await supabase.from('activity_log').insert(payload).select('id').maybeSingle();
    if (error) {
      console.warn('Failed to insert activity log:', error.message);
      return { error };
    }
    return { data };
  } catch (err: any) {
    console.warn('Exception inserting activity log:', err);
    return { error: err };
  }
}
