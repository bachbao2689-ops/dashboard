import { useCallback, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationCenter } from './useNotificationCenter';
import { useWorkspaceData } from './useWorkspaceData';
import { useSharedResource } from './useSharedResource';
import { workflowResource, workspaceScope } from '../services/workspaceResources';
import { useSidebarPinStore } from '../store/sidebarPinStore';
import { taskKey, taskOpen, taskOverdue, taskDone, taskActive, taskLink } from '../lib/taskTracking';
import { workflowLink, projectsLink, type HubTrack } from '../lib/workflowHub';
import type { Task } from './useTasks';
import type { NotificationItem } from '../store/notificationStore';
import { markNotificationsRead } from '../store/notificationStore';
import { useLocation } from 'react-router-dom';
import { isSidebarMention as isMentionNotif, isSidebarComment as isCommentNotif, opensSidebarNotification } from '../lib/sidebarSignals';

export interface EnrichedSidebarTask {
  task: Task;
  id: string;
  title: string;
  isPinned: boolean;
  isMentioned: boolean;
  hasUnreadMention: boolean;
  isCommented: boolean;
  hasUnreadComment: boolean;
  mentionCount: number;
  commentCount: number;
  latestNote: string | null;
  latestNoteUnread: boolean;
  isMine: boolean;
  isOverdue: boolean;
  isDone: boolean;
  priorityScore: number;
  href: string;
  contextLabel: string;
  trackTone: 'task' | 'project' | 'campaign';
}

export interface EnrichedProjectTrack {
  track: HubTrack;
  key: string;
  name: string;
  kind: 'project' | 'campaign';
  tasks: EnrichedSidebarTask[];
  openCount: number;
  doneCount: number;
  pinnedCount: number;
  mentionCount: number;
  commentCount: number;
  hasUnreadSignal: boolean;
  hasUnreadMention: boolean;
  hasUnreadComment: boolean;
  priorityScore: number;
  workflowHref: string;
  projectsHref: string;
}

export function useSidebarTrackingData() {
  const location = useLocation();
  const profile = useAuthStore(s => s.profile);
  const notifCenter = useNotificationCenter();
  const workspace = useWorkspaceData({ includeAssets: false });
  const wfState = useSharedResource(workflowResource, workspaceScope(), Boolean(profile));
  const { pinnedIds, pinnedEntities, ownerId, syncOwner, togglePin } = useSidebarPinStore();

  useEffect(() => {
    syncOwner(profile?.id);
  }, [profile?.id, syncOwner]);

  const pinnedSet = useMemo(() => new Set(ownerId === String(profile?.id) ? pinnedIds : []), [pinnedIds, ownerId, profile?.id]);

  const allNotifications = useMemo(() => {
    if (notifCenter.actor !== profile?.id) return [];
    const map = new Map<string, NotificationItem>();
    for (const item of notifCenter.items || []) map.set(item.id, item);
    for (const item of notifCenter.history || []) {
      if (!map.has(item.id)) map.set(item.id, item);
    }
    return Array.from(map.values()).filter(n => String(n.user_id ?? notifCenter.actor) === String(profile?.id)).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [notifCenter.items, notifCenter.history, notifCenter.actor, profile?.id]);

  // Read only the opened destination. Opening a parent must not clear its children's dots.
  useEffect(() => {
    const ids = allNotifications.filter(n => {
      if (n.is_read || !(isMentionNotif(n, profile?.name) || isCommentNotif(n))) return false;
      return opensSidebarNotification(n, location.pathname, location.search);
    }).map(n => n.id);
    if (ids.length) void markNotificationsRead(ids).catch(console.error);
  }, [location.pathname, location.search, allNotifications, profile?.name]);

  const enrichedTasks = useMemo<EnrichedSidebarTask[]>(() => {
    const myId = profile?.id != null ? String(profile.id) : '';
    const myName = profile?.name || '';

    // Preserve canonical/legacy identity; parent notifications do not belong to every child.
    const byTaskKey = new Map<string, NotificationItem[]>();

    for (const n of allNotifications) {
      const kind = n.entity_type || '';
      const eid = n.entity_id ? String(n.entity_id) : '';
      if (eid && ['task', 'project_subtask', 'campaign_subtask'].includes(kind)) {
        const key = taskKey(kind, eid);
        const list = byTaskKey.get(key) || [];
        list.push(n);
        byTaskKey.set(key, list);
      }
      if (n.metadata?.task_id && !eid) {
        const rawId = String(n.metadata.task_id);
        for (const k of [taskKey(kind, rawId)]) {
          const list = byTaskKey.get(k) || [];
          if (!list.includes(n)) list.push(n);
          byTaskKey.set(k, list);
        }
      }
    }

    const activeTasks = (workspace.tasks || []).filter(t => taskActive(t));

    const result: EnrichedSidebarTask[] = activeTasks.map(t => {
      const directNotifs = byTaskKey.get(t.id) || [];

      const relevantNotifs = directNotifs.filter(n => isCommentNotif(n) || isMentionNotif(n, myName));

      const mentionNotifs = relevantNotifs.filter(n => isMentionNotif(n, myName));
      const commentNotifs = relevantNotifs.filter(n => isCommentNotif(n));

      const descMention = isMentionNotif({type: 'description', message: t.description || '', entity_type: 'task', entity_id: t.id}, myName);

      const isPinned = pinnedSet.has(t.id);
      const isMentioned = mentionNotifs.length > 0 || descMention;
      const hasUnreadMention = mentionNotifs.some(n => !n.is_read);
      const isCommented = commentNotifs.length > 0;
      const hasUnreadComment = commentNotifs.some(n => !n.is_read);
      const isMine = Boolean(myId && String(t.assignee_id) === myId);
      const isOverdue = taskOverdue(t);
      const isDone = taskDone(t);

      const latest = relevantNotifs[0] || null;
      const latestNote = latest ? latest.message : null;
      const latestNoteUnread = Boolean(latest && !latest.is_read);

      const pWeight =
        (t.priority || '').toLowerCase() === 'urgent'
          ? 35
          : (t.priority || '').toLowerCase() === 'high'
          ? 25
          : (t.priority || '').toLowerCase() === 'medium'
          ? 12
          : 5;

      let priorityScore = pWeight;
      if (!isDone) priorityScore += 40;
      if (isPinned) priorityScore += 2000;
      if (hasUnreadMention) priorityScore += 900;
      if (hasUnreadComment) priorityScore += 750;
      if (isMentioned) priorityScore += 450;
      if (isCommented) priorityScore += 350;
      if (isMine && !isDone) priorityScore += 180;
      if (isOverdue && !isDone) priorityScore += 120;

      const trackTone: 'task' | 'project' | 'campaign' = t.id.startsWith('ps-') || t.project_id
        ? 'project'
        : t.id.startsWith('cs-') || t.campaign_id
        ? 'campaign'
        : 'task';

      const contextLabel =
        t.project?.name ||
        t.campaign?.name ||
        t.department?.name ||
        t.assignee?.name ||
        (t.task_ref ? `#${t.task_ref}` : 'Công việc');

      return {
        task: t,
        id: t.id,
        title: t.title || 'Công việc không tên',
        isPinned,
        isMentioned,
        hasUnreadMention,
        isCommented,
        hasUnreadComment,
        mentionCount: mentionNotifs.length || (descMention ? 1 : 0),
        commentCount: commentNotifs.length,
        latestNote,
        latestNoteUnread,
        isMine,
        isOverdue,
        isDone,
        priorityScore,
        href: taskLink(t.id),
        contextLabel,
        trackTone,
      };
    });

    return result.filter(t => t.isMine || t.isPinned || t.isMentioned || t.isCommented).sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      const da = a.task.due_date || '9999-12-31';
      const db = b.task.due_date || '9999-12-31';
      return da.localeCompare(db);
    });
  }, [workspace.tasks, allNotifications, pinnedSet, profile?.id, profile?.name]);

  const enrichedTracks = useMemo<EnrichedProjectTrack[]>(() => {
    const tracks = wfState.data || [];
    const myName = profile?.name || '';

    return tracks
      .filter(track => {
        const me = String(profile?.id);
        return [...track.pics, ...(track.sub_pics || []), ...track.phases.flatMap(p => p.members)]
          .some(p => String(p.id) === me)
          || enrichedTasks.some(t => track.entity_type === 'project' ? t.task.project_id === track.entity_id : t.task.campaign_id === track.entity_id)
          || (ownerId === me && pinnedEntities.some(p => p.kind === track.entity_type && p.id === track.entity_id))
          || allNotifications.some(n => n.entity_type === track.entity_type && n.entity_id === track.entity_id && (isMentionNotif(n, myName) || isCommentNotif(n)));
      })
      .map(track => {
        const trackTasks = enrichedTasks.filter( item =>
          track.entity_type === 'project'
            ? String(item.task.project_id) === String(track.entity_id)
            : String(item.task.campaign_id) === String(track.entity_id) && !item.task.project_id
        );

        const directTrackNotifs = allNotifications.filter(n => {
          const pKind = n.entity_type === 'project' || n.entity_type === 'campaign' ? n.entity_type : n.metadata?.parent_kind;
          const pId = n.entity_type === 'project' || n.entity_type === 'campaign' ? n.entity_id : n.metadata?.parent_id;
          return pKind === track.entity_type && String(pId) === String(track.entity_id);
        });

        const openCount = trackTasks.filter(t => !t.isDone).length;
        const doneCount = trackTasks.filter(t => t.isDone).length;
        const pinnedCount = trackTasks.filter(t => t.isPinned).length;
        const mentionCount =
          trackTasks.filter(t => t.isMentioned).length +
          directTrackNotifs.filter(n => isMentionNotif(n, myName)).length;
        const commentCount =
          trackTasks.filter(t => t.isCommented).length +
          directTrackNotifs.filter(n => isCommentNotif(n)).length;
        const hasUnreadMention = trackTasks.some(t => t.hasUnreadMention)
          || directTrackNotifs.some(n => !n.is_read && isMentionNotif(n, myName));
        const hasUnreadComment = trackTasks.some(t => t.hasUnreadComment)
          || directTrackNotifs.some(n => !n.is_read && isCommentNotif(n));
        const hasUnreadSignal = hasUnreadMention || hasUnreadComment;

        let priorityScore = openCount * 5;
        if (pinnedCount > 0) priorityScore += 1500 + pinnedCount * 100;
        if (hasUnreadSignal) priorityScore += 800;
        if (mentionCount > 0) priorityScore += 400 + mentionCount * 20;
        if (commentCount > 0) priorityScore += 300 + commentCount * 20;

        return {
          track,
          key: `${track.entity_type}:${track.entity_id}`,
          name: track.name,
          kind: track.entity_type,
          tasks: trackTasks,
          openCount,
          doneCount,
          pinnedCount,
          mentionCount,
          commentCount,
          hasUnreadSignal,
          hasUnreadMention,
          hasUnreadComment,
          priorityScore,
          workflowHref: workflowLink(track.entity_type, track.entity_id),
          projectsHref: projectsLink(track.entity_type, track.entity_id),
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }, [wfState.data, enrichedTasks, allNotifications, profile?.name, profile?.id, pinnedEntities, ownerId]);

  const summary = useMemo(() => {
    const openTasks = enrichedTasks.filter(t => !t.isDone && taskOpen(t.task));
    const pinnedTasks = enrichedTasks.filter(t => t.isPinned);
    const mentionedOrCommentedTasks = enrichedTasks.filter(t => t.isMentioned || t.isCommented);
    const myTasks = enrichedTasks.filter(t => t.isMine && !t.isDone);
    const myPriorityTasks = enrichedTasks.filter(t => t.isMine || t.isPinned || t.isMentioned || t.isCommented);
    const overdueTasks = openTasks.filter(t => t.isOverdue);
    const doingTasks = openTasks.filter(t =>
      ['in_progress', 'in-progress', 'doing', 'scoping'].includes((t.task.status || '').toLowerCase()) ||
      ['in_progress', 'scoping'].includes((t.task.workflow_status || '').toLowerCase())
    );
    const reviewTasks = openTasks.filter(t =>
      ['in_review', 'review', 'in_qa', 'feedback', 'pending'].includes((t.task.status || '').toLowerCase()) ||
      t.task.workflow_status === 'in_qa'
    );
    const doneTasks = enrichedTasks.filter(t => t.isDone);

    const availableAssets = (workspace.assets || []).filter(a => a.is_available);
    const busyAssets = (workspace.assets || []).filter(a => !a.is_available);

    return {
      openTasks,
      pinnedTasks,
      mentionedOrCommentedTasks,
      myTasks,
      myPriorityTasks,
      overdueTasks,
      doingTasks,
      reviewTasks,
      doneTasks,
      availableAssets,
      busyAssets,
      users: workspace.users || [],
      departments: workspace.departments || [],
      counts: {...notifCenter.counts,
        workflowCount: enrichedTracks.filter(t => t.hasUnreadSignal).length,
        projectCount: enrichedTracks.filter(t => t.hasUnreadSignal).length,
        tasksCount: enrichedTasks.filter(t => t.hasUnreadComment || t.hasUnreadMention).length,
      },
      unreadTotal: notifCenter.unread || 0,
    };
  }, [enrichedTasks, enrichedTracks, workspace.assets, workspace.users, workspace.departments, notifCenter.counts, notifCenter.unread]);

  const handleTogglePin = useCallback(
    (taskId: string) => {
      togglePin(taskId, profile?.id);
    },
    [togglePin, profile?.id]
  );

  return {
    profile,
    enrichedTasks,
    enrichedTracks,
    summary,
    pinnedIds,
    togglePin: handleTogglePin,
  };
}
