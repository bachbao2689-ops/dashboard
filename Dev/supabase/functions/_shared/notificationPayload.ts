import {notificationLink} from './notificationLink.ts';

export const PUSH_TITLE = 'Phuc Sinh Consumers';
export function notificationPayload(n: {id: string; type?: string; message?: string; entity_type?: string | null; entity_id?: string | null; metadata?: Record<string, unknown> | null}) {
  const label = typeof n.metadata?.task_title === 'string' ? n.metadata.task_title.trim() : '';
  const message = String(n.message || 'Bạn có thông báo mới.').trim();
  const actor = typeof n.metadata?.actor_name === 'string' ? n.metadata.actor_name : 'Một thành viên';
  const action = ({task_assigned:'đã giao bạn công việc',task_created:'đã tạo công việc',task_updated:'đã cập nhật công việc',task_completed:'đã hoàn thành công việc',task_comment:'đã bình luận',project_assigned:'đã giao dự án',campaign_assigned:'đã giao chiến dịch',weekly_report:'đã cập nhật báo cáo'} as Record<string,string>)[n.type || ''];
  const body = label ? `${label}\n${action ? `${actor} ${action}` : message.replace(label, '').replace(/[:·\s]+$/, '')}` : message;
  return {title:PUSH_TITLE,body:body.slice(0,240),tag:`notification-${n.id}`,notificationId:n.id,
    url:notificationLink(n.entity_type,n.entity_id,n.metadata) || '/my-tasks'};
}
