import type { SupabaseClient } from '@supabase/supabase-js';

export type CommentDeletionTarget = {
  kind: 'task' | 'project_subtask' | 'campaign_subtask' | 'project' | 'campaign';
  id: string;
};

type PersonId = string | number | null | undefined;

export function ownsComment(actorId: PersonId, authorId: PersonId): boolean {
  return actorId != null && authorId != null && String(actorId).trim() !== '' &&
    String(authorId).trim() !== '' && String(actorId) === String(authorId);
}

/** RLS is authoritative; require a returned row before reporting deletion. */
export async function deleteOwnedComment(
  client: Pick<SupabaseClient, 'from'>,
  target: CommentDeletionTarget,
  commentId: string,
  actorId: number,
): Promise<void> {
  if (!target.id || !commentId || !Number.isSafeInteger(actorId) || actorId <= 0) {
    throw new Error('Thông tin xóa bình luận không hợp lệ.');
  }
  let query;
  if (target.kind === 'task') {
    query = client.from('comments').delete().eq('id', commentId)
      .eq('task_id', target.id).eq('author_id', actorId);
  } else if (target.kind === 'project') {
    query = client.from('project_comments').delete().eq('id', commentId)
      .eq('project_id', target.id).eq('author_id', actorId);
  } else {
    query = client.from('activity_log').delete().eq('id', commentId)
      .eq('entity_type', target.kind).eq('entity_id', target.id)
      .eq('action', 'comment').eq('user_id', actorId);
  }
  const { data, error } = await query.select('id');
  if (error) throw error;
  if (data?.length !== 1 || String(data[0].id) !== String(commentId)) {
    throw new Error('Không thể xóa: bình luận không còn tồn tại hoặc bạn không phải tác giả.');
  }
}
