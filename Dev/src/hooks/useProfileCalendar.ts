import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { calendarDates, isCalendarVisible } from '../lib/profileCalendar';
import type { CalendarItem, CalendarKind } from '../lib/profileCalendar';

export interface CalendarNotification {
  id: string; entity_id: string | null; entity_type: string | null;
  message: string; is_read: boolean; created_at: string;
}

// Personal queries are paginated so older tasks are not silently dropped at 1,000 rows.
async function allRows(query: any): Promise<any[]> {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await query.range(offset, offset + 499);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 500) return rows;
  }
}

export function useProfileCalendar() {
  const profileId = useAuthStore(state => state.profile?.id);
  const [snapshot, setSnapshot] = useState<{ userId?: number; items: CalendarItem[]; notifications: CalendarNotification[]; updatedAt: Date | null }>({ items: [], notifications: [], updatedAt: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reloadRef = useRef<() => void>(() => {});
  const refresh = useCallback(() => reloadRef.current(), []);

  useEffect(() => {
    let active = true;
    let loadingNow = false;
    let pending = false;
    let debounce: ReturnType<typeof setTimeout>;
    const load = async () => {
      if (!profileId || !active) { setLoading(false); return; }
      if (loadingNow) { pending = true; return; }
      loadingNow = true;
      setLoading(true);
      try {
        const [tasks, memberships, projectSubtasks, campaignSubtasks, ownedProjects, ownedCampaigns, notificationResult] = await Promise.all([
          allRows(supabase.from('tasks').select('*,project:project_id(id,name),assignee:assignee_id(name,avatar_url),department:department_id(name)').eq('assignee_id', profileId).order('id')),
          allRows(supabase.from('project_members').select('project_id,user:user_id(name)').eq('user_id', profileId).order('project_id')),
          allRows(supabase.from('project_subtasks').select('*,assignee:assignee_id(name)').eq('assignee_id', profileId).order('id')),
          allRows(supabase.from('campaign_subtasks').select('*,assignee:assignee_id(name)').eq('assignee_id', profileId).order('id')),
          allRows(supabase.from('projects').select('*,creator:created_by(name)').eq('created_by', profileId).order('id')),
          allRows(supabase.from('campaigns').select('*,lead:lead_id(name)').or(`lead_id.eq.${profileId},created_by.eq.${profileId}`).order('id')),
          supabase.from('notifications').select('id,entity_id,entity_type,message,is_read,created_at').eq('user_id', profileId).in('entity_type', ['task', 'project', 'campaign', 'project_subtask', 'campaign_subtask']).order('created_at', { ascending: false }).limit(50),
        ]);
        if (notificationResult.error) throw notificationResult.error;
        const projectIds = [...new Set([...memberships.map(row => row.project_id), ...tasks.map(row => row.project_id), ...projectSubtasks.map(row => row.project_id)].filter(Boolean))];
        const linkedProjects = projectIds.length ? await allRows(supabase.from('projects').select('*,creator:created_by(name)').in('id', projectIds).order('id')) : [];
        const linkedProjectMembers = projectIds.length ? await allRows(supabase.from('project_members').select('project_id,user:user_id(name)').in('project_id', projectIds).order('project_id')) : [];
        const projects = [...new Map([...ownedProjects, ...linkedProjects].map(row => [row.id, row])).values()].filter(row => isCalendarVisible(row.status));
        const campaignIds = [...new Set([...projects.map(row => row.campaign_id), ...tasks.map(row => row.campaign_id), ...campaignSubtasks.map(row => row.campaign_id)].filter(Boolean))];
        const linkedCampaigns = campaignIds.length ? await allRows(supabase.from('campaigns').select('*,lead:lead_id(name)').in('id', campaignIds).order('id')) : [];
        const campaigns = [...new Map([...ownedCampaigns, ...linkedCampaigns].map(row => [row.id, row])).values()].filter(row => isCalendarVisible(row.status));
        const projectMap = new Map(projects.map(row => [row.id, row]));
        const campaignMap = new Map(campaigns.map(row => [row.id, row]));
        const projectMemberNames = new Map<string, string[]>();
        linkedProjectMembers.forEach(row => {
          const name = row.user?.name;
          if (!name) return;
          const names = projectMemberNames.get(row.project_id) || [];
          if (!names.includes(name)) names.push(name);
          projectMemberNames.set(row.project_id, names);
        });
        const makeItem = (record: any, kind: CalendarKind): CalendarItem => {
          const parent = kind === 'campaign_subtask' ? campaignMap.get(record.campaign_id) : projectMap.get(record.project_id) || campaignMap.get(record.campaign_id);
          return {
            key: `${kind}:${record.id}`, id: record.id, kind, title: record.title || record.name,
            status: record.status, priority: record.priority, description: record.description || record.objective,
            ...calendarDates(record, kind), parentId: parent?.id, parentName: parent?.name || record.project?.name,
            campaignId: record.campaign_id || parent?.campaign_id,
            owner: record.assignee?.name || record.lead?.name || record.creator?.name,
            record: { ...record, memberNames: kind === 'project' ? projectMemberNames.get(record.id) || [] : undefined, campaign: campaignMap.get(record.campaign_id) || null },
          };
        };
        const items = [
          ...tasks.filter(row => isCalendarVisible(row.status)).map(row => makeItem(row, 'task')),
          ...projects.map(row => makeItem(row, 'project')),
          ...campaigns.map(row => makeItem(row, 'campaign')),
          ...projectSubtasks.filter(row => isCalendarVisible(row.status) && projectMap.has(row.project_id)).map(row => makeItem(row, 'project_subtask')),
          ...campaignSubtasks.filter(row => isCalendarVisible(row.status) && campaignMap.has(row.campaign_id)).map(row => makeItem(row, 'campaign_subtask')),
        ];
        if (active) { setSnapshot({ userId: profileId, items, notifications: notificationResult.data || [], updatedAt: new Date() }); setError(null); }
      } catch (cause) {
        console.warn('Could not refresh personal calendar', cause);
        if (active) setError('Chưa thể đồng bộ lịch. Dữ liệu đang hiển thị có thể chưa phải bản mới nhất.');
      } finally {
        loadingNow = false;
        if (active) { setLoading(false); if (pending) { pending = false; void load(); } }
      }
    };
    const schedule = () => { clearTimeout(debounce); debounce = setTimeout(() => void load(), 250); };
    const onVisible = () => { if (document.visibilityState === 'visible') schedule(); };
    reloadRef.current = schedule;
    void load();
    const channel = profileId ? supabase.channel(`profile-calendar-${profileId}`) : null;
    ['tasks', 'projects', 'project_members', 'project_subtasks', 'campaigns', 'campaign_subtasks', 'notifications'].forEach(table => {
      channel?.on('postgres_changes', { event: '*', schema: 'public', table }, schedule);
    });
    channel?.subscribe();
    // Reconnect/focus and polling also cover tables not enabled for Realtime yet.
    const interval = setInterval(onVisible, 60000);
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('projects:changed', schedule);
    window.addEventListener('campaigns:changed', schedule);
    return () => {
      active = false; clearTimeout(debounce); clearInterval(interval);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('projects:changed', schedule);
      window.removeEventListener('campaigns:changed', schedule);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [profileId]);

  const visible = snapshot.userId === profileId;
  return { items: visible ? snapshot.items : [], notifications: visible ? snapshot.notifications : [], updatedAt: visible ? snapshot.updatedAt : null, loading, error, refresh };
}
