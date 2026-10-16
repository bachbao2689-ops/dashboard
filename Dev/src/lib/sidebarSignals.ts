import { notificationLink } from '../../supabase/functions/_shared/notificationLink.ts';

type Signal = { type: string; message: string; entity_type: string | null; entity_id: string | null; metadata?: Record<string, unknown> };
export function isSidebarMention(n: Signal, name?: string | null) {
  if (typeof n.metadata?.is_mention === 'boolean') return n.metadata.is_mention;
  if (['mention', 'task_mention', 'project_mention', 'campaign_mention'].includes(n.type)) return true;
  const label = name?.trim().toLowerCase();
  if (!label) return false;
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`@(?:${escape(label)}|${escape(label.replace(/\s/g, ''))})(?=$|[\\s.,!?;:()\\[\\]{}])`, 'u').test(n.message.toLowerCase());
}
export function isSidebarComment(n: Signal) {
  return ['task_comment', 'project_comment', 'campaign_comment'].includes(n.type)
    || (n.type === 'system' && /bình luận|comment|phản hồi/i.test(n.message));
}
export function opensSidebarNotification(n: Signal, pathname: string, search: string) {
  const href = notificationLink(n.entity_type, n.entity_id, n.metadata);
  if (!href) return false;
  const [path, query] = href.split('?');
  const target = new URLSearchParams(query), current = new URLSearchParams(search);
  const sameSurface = path === pathname || (path === '/projects' && pathname === '/workflow' && !current.has('phase'));
  return sameSurface && [...target].length > 0 && [...target].every(([key, value]) => current.get(key) === value);
}
