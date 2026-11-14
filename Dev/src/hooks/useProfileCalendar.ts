import {useNotificationCenter} from './useNotificationCenter';
import {useNotificationStore} from '../store/notificationStore';
import {retainWorkspaceRealtime} from '../services/workspaceRealtime';
import {taskResource,workspaceScope} from '../services/workspaceResources';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import {taskTarget} from '../lib/taskTracking';
import {canViewTeamManagement} from '../lib/roleScope';
import { calendarDates } from '../lib/profileCalendar';
import type { CalendarItem, CalendarKind } from '../lib/profileCalendar';

export interface CalendarNotification {
  id: string; entity_id: string | null; entity_type: string | null;
  message: string; is_read: boolean; created_at: string;
}

// Personal queries are paginated so older tasks are not silently dropped at 1,000 rows.
async function safeOptionalRows(label: string, queryPromise: Promise<any[]>): Promise<any[]> {
  try {
    return await queryPromise;
  } catch (err) {
    console.warn(`Optional calendar query failed (${label}):`, err);
    return [];
  }
}
async function allRows(query: any): Promise<any[]> {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await query.range(offset, offset + 499);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 500) return rows;
  }
}

export function useProfileCalendar(targetUserId?: string | number, options?: { scopeAllVisible?: boolean }) {
  const actor = useAuthStore(state => state.profile);
  const myProfileId=actor?.id,scope=workspaceScope(),center=useNotificationCenter();
  const profileId = targetUserId || myProfileId;
  const scopeAllVisible = Boolean(options?.scopeAllVisible && canViewTeamManagement(actor));
  const [snapshot, setSnapshot] = useState<{ userId?: string | number; scope?:string; scopeAllVisible?: boolean; items: CalendarItem[]; notifications: CalendarNotification[]; updatedAt: Date | null }>({ items: [], notifications: [], updatedAt: null });
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
      try {
        const [mentionRows, legacyMentions, campaignMemberships, phaseMemberships] = scopeAllVisible
          ? [[], [], [], []]
          : await Promise.all([
              allRows(supabase.from('comments').select('id,task_id').contains('mentions', [Number(profileId)]).order('id')),
              allRows(supabase.from('activity_log').select('entity_type,entity_id').eq('action','comment').in('entity_type',['project_subtask','campaign_subtask']).contains('metadata',{mentions:[Number(profileId)]}).order('id')),
              allRows(supabase.from('campaign_members').select('campaign_id').eq('user_id', profileId).order('campaign_id')),
              allRows(supabase.from('workflow_phase_members').select('phase_id,phase:phase_id(track:workflow_id(entity_type,entity_id))').eq('user_id',profileId).order('phase_id'))
            ]);
        const mentionedIds = [...new Set(mentionRows.map(r => r.task_id))];
        const numericProfileId = Number(profileId);
        const subtaskAssigneeFilter = Number.isFinite(numericProfileId)
          ? `assignee_id.eq.${profileId},custom_fields->assignee_ids.cs.[${numericProfileId}]`
          : `assignee_id.eq.${profileId}`;
        const [memberships, ownedProjects, ownedCampaigns, notificationResult, archivedDeletedTasks, archivedDeletedProjectSubtasks, archivedDeletedCampaignSubtasks] = await Promise.all([
          scopeAllVisible
            ? Promise.resolve([])
            : allRows(supabase.from('project_members').select('project_id,user:user_id(name)').eq('user_id', profileId).order('project_id')),
          scopeAllVisible
            ? allRows(supabase.from('projects').select('*,creator:created_by(name,avatar_url)').order('id'))
            : allRows(supabase.from('projects').select('*,creator:created_by(name,avatar_url)').eq('created_by', profileId).order('id')),
          scopeAllVisible
            ? allRows(supabase.from('campaigns').select('*,lead:lead_id(name,avatar_url)').order('id'))
            : allRows(supabase.from('campaigns').select('*,lead:lead_id(name,avatar_url)').or(`lead_id.eq.${profileId},created_by.eq.${profileId}`).order('id')),
          (scopeAllVisible || String(profileId)===String(myProfileId))
            ? Promise.resolve({data:useNotificationStore.getState().history,error:null})
            : supabase.from('notifications').select('id,entity_id,entity_type,message,is_read,created_at').eq('user_id', profileId).in('entity_type', ['task', 'project', 'campaign', 'project_subtask', 'campaign_subtask']).order('created_at', { ascending: false }).limit(50).then(res => res.error ? (console.warn('Optional notifications query failed:', res.error), { data: [], error: null }) : res),
          safeOptionalRows('tasks_archived_deleted', allRows(scopeAllVisible ? supabase.from('tasks').select('*').in('status', ['archived', 'deleted', 'hidden']).order('id') : supabase.from('tasks').select('*').in('status', ['archived', 'deleted', 'hidden']).or(`assignee_id.eq.${profileId},created_by.eq.${profileId}`).order('id'))),
          safeOptionalRows('project_subtasks_archived_deleted', allRows(scopeAllVisible ? supabase.from('project_subtasks').select('*').in('status', ['archived', 'deleted', 'hidden']).order('id') : supabase.from('project_subtasks').select('*').in('status', ['archived', 'deleted', 'hidden']).or(subtaskAssigneeFilter).order('id'))),
          safeOptionalRows('campaign_subtasks_archived_deleted', allRows(scopeAllVisible ? supabase.from('campaign_subtasks').select('*').in('status', ['archived', 'deleted', 'hidden']).order('id') : supabase.from('campaign_subtasks').select('*').in('status', ['archived', 'deleted', 'hidden']).or(subtaskAssigneeFilter).order('id'))),
          taskResource.refresh(scope),
        ]);
        const taskSnapshot=taskResource.getSnapshot(scope);
        if(taskSnapshot.error)throw new Error(taskSnapshot.error);
        const personal = scopeAllVisible
          ? (taskSnapshot.data || [])
          : (taskSnapshot.data||[]).filter(row=>{
              const target=taskTarget(row.id);
              const coAssigneeIds = ((((row as any).custom_fields as any)?.assignee_ids as any[]) || []).map(String);
              return String(row.assignee_id)===String(profileId)||coAssigneeIds.includes(String(profileId))||(target.kind==='task'?mentionedIds.includes(target.id):legacyMentions.some(m=>m.entity_type===target.kind&&m.entity_id===target.id));
            });
        const sourceRows=(kind:string)=>personal.filter(row=>taskTarget(row.id).kind===kind).map(row=>({...row,id:row.id.startsWith('ps-')||row.id.startsWith('cs-')?row.id.slice(3):row.id}));
        const tasks=sourceRows('task'),projectSubtasks=sourceRows('project_subtask'),campaignSubtasks=sourceRows('campaign_subtask');

        const tasksMap = new Map(tasks.map(t => [String(t.id), t]));
        archivedDeletedTasks.forEach(t => tasksMap.set(String(t.id), t));
        const allTasks = [...tasksMap.values()];

        const projectSubtasksMap = new Map(projectSubtasks.map(st => [String(st.id), st]));
        archivedDeletedProjectSubtasks.forEach(st => projectSubtasksMap.set(String(st.id), st));
        const allProjectSubtasks = [...projectSubtasksMap.values()];

        const campaignSubtasksMap = new Map(campaignSubtasks.map(st => [String(st.id), st]));
        archivedDeletedCampaignSubtasks.forEach(st => campaignSubtasksMap.set(String(st.id), st));
        const allCampaignSubtasks = [...campaignSubtasksMap.values()];

        if (notificationResult.error) throw notificationResult.error;
        const projectIds = [...new Set([...ownedProjects.map(row => row.id), ...phaseMemberships.filter(row=>row.phase?.track?.entity_type==='project').map(row=>row.phase.track.entity_id),...memberships.map(row => row.project_id), ...allTasks.map(row => row.project_id), ...allProjectSubtasks.map(row => row.project_id)].filter(Boolean))];
        const linkedProjects = (!scopeAllVisible && projectIds.length) ? await allRows(supabase.from('projects').select('*,creator:created_by(name,avatar_url)').in('id', projectIds).order('id')) : [];
        const linkedProjectMembers = projectIds.length ? await allRows(supabase.from('project_members').select('project_id,user:user_id(name)').in('project_id', projectIds).order('project_id')) : [];
        const projects = [...new Map([...ownedProjects, ...linkedProjects].map(row => [row.id, row])).values()];
        const campaignIds = [...new Set([...phaseMemberships.filter(row=>row.phase?.track?.entity_type==='campaign').map(row=>row.phase.track.entity_id),...campaignMemberships.map(row => row.campaign_id), ...projects.map(row => row.campaign_id), ...allTasks.map(row => row.campaign_id), ...allCampaignSubtasks.map(row => row.campaign_id)].filter(Boolean))];
        const linkedCampaigns = (!scopeAllVisible && campaignIds.length) ? await allRows(supabase.from('campaigns').select('*,lead:lead_id(name,avatar_url)').in('id', campaignIds).order('id')) : [];
        const campaigns = [...new Map([...ownedCampaigns, ...linkedCampaigns].map(row => [row.id, row])).values()];
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
          const parentStatus = (parent?.status || '').toLowerCase();
          const ownStatus = (record.status || '').toLowerCase();
          const effectiveStatus = (parent && ['deleted', 'archived'].includes(parentStatus) && !['deleted', 'archived'].includes(ownStatus))
            ? parent.status
            : record.status;

          return {
            key: `${kind}:${record.id}`, id: record.id, kind, title: record.title || record.name,
            status: effectiveStatus, priority: record.priority, description: record.description || record.objective,
            ...calendarDates(record, kind), parentId: parent?.id, parentName: parent?.name || record.project?.name,
            campaignId: record.campaign_id || parent?.campaign_id,
            owner: record.assignee?.name || record.lead?.name || record.creator?.name,
            record: { ...record, memberNames: kind === 'project' ? projectMemberNames.get(record.id) || [] : undefined, campaign: campaignMap.get(record.campaign_id) || null },
          };
        };
        const items = [
          ...allTasks.filter(row=> (!row.project_id||projectMap.has(row.project_id))&&(!row.campaign_id||campaignMap.has(row.campaign_id))).map(row => makeItem(row, 'task')),
          ...projects.map(row => makeItem(row, 'project')),
          ...campaigns.map(row => makeItem(row, 'campaign')),
          ...allProjectSubtasks.filter(row => projectMap.has(row.project_id)).map(row => makeItem(row, 'project_subtask')),
          ...allCampaignSubtasks.filter(row => campaignMap.has(row.campaign_id)).map(row => makeItem(row, 'campaign_subtask')),
        ];
        if (active) { setSnapshot({ userId: profileId, scope, scopeAllVisible, items, notifications: notificationResult.data || [], updatedAt: new Date() }); setError(null); }
      } catch (cause) {
        console.warn('Could not refresh personal calendar', cause);
        if (active) setError('Chưa thể đồng bộ lịch. Dữ liệu đang hiển thị có thể chưa phải bản mới nhất.');
      } finally {
        loadingNow = false;
        if (active) { setLoading(false); if (pending) { pending = false; void load(); } }
      }
    };
    const schedule = () => { clearTimeout(debounce); if(document.visibilityState==='hidden')return;debounce = setTimeout(() => void load(), 400); };
    reloadRef.current = schedule;
    setLoading(true);
    void load();
    const stop=myProfileId?retainWorkspaceRealtime(myProfileId,['tasks','projects','project_members','project_subtasks','campaigns','campaign_members','campaign_subtasks','comments','activity_log','workflow_phase_members'],()=>schedule(),()=>{},change=>{
      if(change.table==='activity_log'&&change.eventType!=='DELETE')return ['comment','details_updated'].includes(change.new?.action||'');
      if(change.table==='comments'&&change.eventType==='INSERT')return (change.new?.mentions||[]).includes(Number(profileId));
      return true;
    }):()=>{};
    const stopNotifications=myProfileId&&String(profileId)!==String(myProfileId)?retainWorkspaceRealtime(myProfileId,['notifications'],async()=>{
      const {data,error}=await supabase.from('notifications').select('id,entity_id,entity_type,message,is_read,created_at').eq('user_id',profileId).order('created_at',{ascending:false}).limit(50);
      if(active&&!error)setSnapshot(previous=>previous.userId===profileId?{...previous,notifications:data||[]}:previous);
    }):()=>{};
    return () => {active=false;clearTimeout(debounce);stop();stopNotifications();};
  }, [profileId,myProfileId,scope,scopeAllVisible]);

  const visible = snapshot.userId === profileId && snapshot.scope === scope && snapshot.scopeAllVisible === scopeAllVisible;
  return { items: visible ? snapshot.items : [], notifications: myProfileId&&center.actor===myProfileId&&String(profileId)===String(myProfileId)?center.history.filter(item=>['task','project','campaign','project_subtask','campaign_subtask'].includes(item.entity_type||'')):visible?snapshot.notifications:[], updatedAt: visible ? snapshot.updatedAt : null, loading, error, refresh };
}
