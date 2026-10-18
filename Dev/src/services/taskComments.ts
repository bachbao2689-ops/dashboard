import { supabase } from './supabase';
import { deleteOwnedComment } from '../lib/commentDeletion';

export type CommentKind = 'task' | 'project_subtask' | 'campaign_subtask';
export type CommentTarget = { kind: CommentKind; id: string };
export type ThreadComment = { id: string; author_id: number; body: string; created_at: string; author: { name: string; avatar_url?: string | null } | null };
export const commentTarget = (id: string): CommentTarget => id.startsWith('ps-') ? { kind: 'project_subtask', id: id.slice(3) } : id.startsWith('cs-') ? { kind: 'campaign_subtask', id: id.slice(3) } : { kind: 'task', id };
export const commentKey = ({kind,id}: CommentTarget) => `${kind}:${id}`;

export async function readTaskComments(target: CommentTarget): Promise<ThreadComment[]> {
  const rows: ThreadComment[] = [];
  for (let offset = 0; ; offset += 500) {
    const query = target.kind === 'task'
      ? supabase.from('comments').select('id,author_id,body,created_at,author:author_id(name,avatar_url)').eq('task_id',target.id)
      : supabase.from('activity_log').select('id,user_id,metadata,created_at,author:user_id(name,avatar_url)').eq('entity_type',target.kind).eq('entity_id',target.id).eq('action','comment');
    const {data,error} = await query.order('created_at').order('id').range(offset,offset + 499);
    if (error) throw error;
    for (const row of data || []) {
      const value = row as unknown as ThreadComment & { user_id: number; metadata?: {body?: string} };
      rows.push({...value,author_id: target.kind === 'task' ? value.author_id : value.user_id,body: target.kind === 'task' ? value.body : value.metadata?.body || ''});
    }
    if (!data || data.length < 500) return rows;
  }
}

export async function writeTaskComment(target: CommentTarget, authorId: number, body: string, mentions: number[]) {
  const text = body.trim();
  if (!text) throw new Error('Nhập nội dung bình luận.');
  const mentionIds = [...new Set(mentions)];
  if (target.kind === 'task') {
    const {error} = await supabase.from('comments').insert({task_id:target.id,author_id:authorId,body:text,mentions:mentionIds});
    if (error) throw error;
  } else {
    const campaign = target.kind === 'campaign_subtask';
    const {data:task,error:taskError} = await supabase.from(campaign ? 'campaign_subtasks' : 'project_subtasks').select(campaign ? 'campaign_id' : 'project_id').eq('id',target.id).single();
    if (taskError) throw taskError;
    const parentId = (task as unknown as Record<string,string>)[campaign ? 'campaign_id' : 'project_id'];
    const {data:parent,error:parentError} = await supabase.from(campaign ? 'campaigns' : 'projects').select('workspace_id').eq('id',parentId).single();
    if (parentError) throw parentError;
    const {error} = await supabase.from('activity_log').insert({workspace_id:parent.workspace_id,user_id:authorId,action:'comment',entity_type:target.kind,entity_id:target.id,metadata:{body:text,mentions:mentionIds}});
    if (error) throw error;
  }
  window.dispatchEvent(new CustomEvent('task-comments:changed', { detail: target }));
}

export async function deleteTaskComment(target: CommentTarget, commentId: string, actorId: number) {
  await deleteOwnedComment(supabase, target, commentId, actorId);
  window.dispatchEvent(new CustomEvent('task-comments:changed', { detail: target }));
}
