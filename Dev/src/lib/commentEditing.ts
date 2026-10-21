import type { SupabaseClient } from '@supabase/supabase-js';
import type { CommentDeletionTarget } from './commentDeletion';

/** Edit only the body; preserve activity metadata such as mentions and attachments. */
export async function editOwnedComment(
  client: Pick<SupabaseClient, 'from'>,
  target: CommentDeletionTarget,
  commentId: string,
  actorId: number,
  body: string,
): Promise<void> {
  const text = body.trim();
  if (!text || !target.id || !commentId || !Number.isSafeInteger(actorId) || actorId <= 0) {
    throw new Error('Thông tin chỉnh sửa bình luận không hợp lệ.');
  }
  let query;
  if (target.kind === 'task') {
    query = client.from('comments').update({body:text,is_edited:true,updated_at:new Date().toISOString()}).eq('id',commentId)
      .eq('task_id',target.id).eq('author_id',actorId);
  } else if (target.kind === 'project') {
    query = client.from('project_comments').update({body:text}).eq('id',commentId)
      .eq('project_id',target.id).eq('author_id',actorId);
  } else {
    const {data:existing,error:readError} = await client.from('activity_log').select('metadata,new_value')
      .eq('id',commentId).eq('entity_type',target.kind).eq('entity_id',target.id)
      .eq('action','comment').eq('user_id',actorId).maybeSingle();
    if (readError) throw readError;
    if (!existing) throw new Error('Bạn chỉ được chỉnh sửa bình luận của mình.');
    query = client.from('activity_log').update({metadata:{...existing.metadata,body:text},new_value:{...(existing.new_value && typeof existing.new_value==='object' ? existing.new_value : {}),edited_at:new Date().toISOString()}})
      .eq('id',commentId).eq('entity_type',target.kind).eq('entity_id',target.id)
      .eq('action','comment').eq('user_id',actorId);
  }
  const {data,error} = await query.select('id');
  if (error) throw error;
  if (data?.length !== 1 || String(data[0].id) !== String(commentId)) {
    throw new Error('Không thể sửa: bình luận không còn tồn tại hoặc bạn không phải tác giả.');
  }
}
