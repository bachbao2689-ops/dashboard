import React from 'react';
import {
  BarChart2, Layers, CheckSquare, FolderKanban, User, Users,
  Box, History, MessageSquare, AtSign, AlertTriangle,
  Clock, CheckCircle2, ExternalLink
} from 'lucide-react';
import type { EnrichedSidebarTask, EnrichedProjectTrack } from '../../hooks/useSidebarTrackingData';
import { displayDate } from '../../lib/workflowHub';
import { StylizedPinIcon } from '../common/StylizedPinIcon';

export interface DrillMenuItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  /** Route path to navigate when clicked (for root nav links or leaf navigation items) */
  path?: string;
  /** Target DrillNode ID if this item drills down into a child level */
  targetNodeId?: string;
  /** Task ID if this item supports 1-click Staff Pin/Unpin */
  pinTaskId?: string;
  isPinned?: boolean;
  isMentioned?: boolean;
  hasUnreadMention?: boolean;
  isCommented?: boolean;
  hasUnreadComment?: boolean;
  inlineBadge?: React.ReactNode;
  rightBadge?: React.ReactNode;
  variant?: 'default' | 'priority' | 'danger';
  onAction?: () => void;
}

export interface DrillNode {
  id: string;
  title: string;
  headerPath?: string;
  items: DrillMenuItem[];
}

export interface SidebarGroupModel {
  id: string;
  title: string;
  badgeCount: number;
  hasUnreadSignal: boolean;
  pinnedCount: number;
  rootNodeId: string;
  nodes: Record<string, DrillNode>;
}

function SignalBadges({
  isPinned,
  isMentioned,
  hasUnreadMention,
  isCommented,
  hasUnreadComment,
}: {
  isPinned?: boolean;
  isMentioned?: boolean;
  hasUnreadMention?: boolean;
  isCommented?: boolean;
  hasUnreadComment?: boolean;
}) {
  if (!isPinned && !isMentioned && !isCommented) return null;
  return (
    <span className="inline-flex items-center gap-1 ml-1 shrink-0">
      {isPinned && (
        <span title="Đã được ghim" className="inline-flex items-center text-slate-500 dark:text-slate-300">
          <StylizedPinIcon size={11.5} pinned />
        </span>
      )}
      {isMentioned && (
        <span title="Được nhắc tên (@)" className="relative inline-flex items-center">
          <AtSign size={11.5} className="text-rose-500" />
          {hasUnreadMention && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          )}
        </span>
      )}
      {isCommented && (
        <span title="Có bình luận" className="relative inline-flex items-center">
          <MessageSquare size={11.5} className="text-blue-500" />
          {hasUnreadComment && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          )}
        </span>
      )}
    </span>
  );
}

function NavSignalBadge({
  unreadCount,
}: {
  unreadCount: number;
  pinnedCount?: number;
}) {
  if (unreadCount <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 ml-1 shrink-0">
      {unreadCount > 0 && (
        <span title="Có bình luận / nhắc đến mới" className="relative inline-flex items-center">
          <MessageSquare size={13} className="text-blue-500" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-xs" />
        </span>
      )}
    </span>
  );
}

function CountPill({
  count,
  tone = 'neutral',
  title,
}: {
  count: number | string;
  tone?: 'neutral' | 'blue' | 'amber' | 'danger' | 'emerald';
  title?: string;
}) {
  const toneCls =
    tone === 'danger'
      ? 'bg-red-500 text-white shadow-xs'
      : tone === 'amber'
      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
      : tone === 'blue'
      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
      : tone === 'emerald'
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
      : 'bg-slate-500/12 text-slate-600 dark:text-slate-300';

  return (
    <span
      title={title}
      className={`shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full font-bold text-[10.5px] leading-none ${toneCls}`}
    >
      {typeof count === 'number' && count > 99 ? '99+' : count}
    </span>
  );
}

function registerTaskDetailNode(
  nodes: Record<string, DrillNode>,
  prefix: string,
  t: EnrichedSidebarTask,
  onTogglePin: (taskId: string) => void
): string {
  const detailNodeId = `${prefix}:task:${t.id}`;
  const statusLabel = t.isDone
    ? 'Hoàn thành'
    : t.isOverdue
    ? 'Quá hạn'
    : (t.task.workflow_status || t.task.status || 'Đang mở').replace(/_/g, ' ');
  const priorityLabel = (t.task.priority || 'medium').toUpperCase();
  const dueLabel = t.task.due_date ? displayDate(t.task.due_date) : 'Chưa đặt hạn';
  const assigneeLabel = t.task.assignee?.name || 'Chưa phân công';

  const detailItems: DrillMenuItem[] = [
    {
      id: `${detailNodeId}:open`,
      label: 'Mở chi tiết công việc',
      sublabel: t.title,
      icon: <ExternalLink size={15} className="text-blue-600 dark:text-blue-400" />,
      path: t.href,
      variant: 'priority',
    },
    {
      id: `${detailNodeId}:pin`,
      label: t.isPinned ? 'Bỏ ghim công việc này' : 'Ghim ưu tiên công việc',
      sublabel: t.isPinned ? 'Đang được ghim trên Sidebar' : 'Ghim để theo dõi nhanh trên Sidebar',
      icon: (
        <StylizedPinIcon
          size={15}
          pinned={t.isPinned}
          className={t.isPinned ? 'text-slate-800 dark:text-slate-100' : 'text-gray-400'}
        />
      ),
      onAction: () => onTogglePin(t.id),
    },
  ];

  if (t.latestNote) {
    detailItems.push({
      id: `${detailNodeId}:note`,
      label: t.isMentioned ? 'Nhắc tên / Thông báo mới nhất' : 'Bình luận mới nhất',
      sublabel: t.latestNote,
      icon: t.isMentioned ? (
        <AtSign size={15} className="text-rose-500" />
      ) : (
        <MessageSquare size={15} className="text-blue-500" />
      ),
      path: t.href,
      inlineBadge: t.latestNoteUnread ? (
        <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[9px] font-bold">
          Mới
        </span>
      ) : undefined,
    });
  }

  detailItems.push(
    {
      id: `${detailNodeId}:meta`,
      label: `Trạng thái: ${statusLabel}`,
      sublabel: `Ưu tiên: ${priorityLabel} · Hạn: ${dueLabel}`,
      icon: t.isOverdue ? (
        <AlertTriangle size={15} className="text-rose-500" />
      ) : (
        <Clock size={15} className="text-sky-500" />
      ),
      path: t.href,
      variant: t.isOverdue ? 'danger' : 'default',
    },
    {
      id: `${detailNodeId}:pic`,
      label: `PIC: ${assigneeLabel}`,
      sublabel: t.contextLabel,
      icon: <User size={15} className="text-indigo-500" />,
      path: t.href,
    }
  );

  nodes[detailNodeId] = {
    id: detailNodeId,
    title: t.title,
    headerPath: t.href,
    items: detailItems,
  };

  return detailNodeId;
}

function buildTaskMenuItem(
  nodes: Record<string, DrillNode>,
  prefix: string,
  t: EnrichedSidebarTask,
  onTogglePin: (taskId: string) => void
): DrillMenuItem {
  const detailNodeId = registerTaskDetailNode(nodes, prefix, t, onTogglePin);
  const hasPrioritySignal = t.isPinned || t.isMentioned || t.isCommented;

  const subParts: string[] = [];
  if (t.latestNote) {
    subParts.push(t.latestNote);
  } else {
    if (t.contextLabel) subParts.push(t.contextLabel);
    if (t.task.due_date) subParts.push(`Hạn ${displayDate(t.task.due_date)}`);
  }

  const icon = t.isPinned ? (
    <StylizedPinIcon size={15} pinned className="text-slate-700 dark:text-slate-200 shrink-0" />
  ) : t.isMentioned ? (
    <AtSign size={15} className="text-rose-500 shrink-0" />
  ) : t.isCommented ? (
    <MessageSquare size={15} className="text-blue-500 shrink-0" />
  ) : t.isOverdue ? (
    <AlertTriangle size={15} className="text-rose-500 shrink-0" />
  ) : t.isDone ? (
    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
  ) : (
    <CheckSquare size={15} className="text-slate-500 shrink-0" />
  );

  return {
    id: `${prefix}:row:${t.id}`,
    label: t.title,
    sublabel: subParts.join(' · '),
    icon,
    path: t.href,
    targetNodeId: detailNodeId,
    pinTaskId: t.id,
    isPinned: t.isPinned,
    isMentioned: t.isMentioned,
    hasUnreadMention: t.hasUnreadMention,
    isCommented: t.isCommented,
    hasUnreadComment: t.hasUnreadComment,
    inlineBadge: (
      <SignalBadges
        isPinned={t.isPinned}
        isMentioned={t.isMentioned}
        hasUnreadMention={t.hasUnreadMention}
        isCommented={t.isCommented}
        hasUnreadComment={t.hasUnreadComment}
      />
    ),
    variant: t.isOverdue && !t.isDone ? 'danger' : hasPrioritySignal ? 'priority' : 'default',
  };
}

export function buildSidebarGroups({
  t,
  role,
  isLeader,
  canManageBorrow,
  canBorrow,
  enrichedTasks,
  enrichedTracks,
  summary,
  togglePin,
}: {
  t: (key: any) => string;
  role: string;
  isLeader: boolean;
  canManageBorrow: boolean;
  canBorrow: boolean;
  enrichedTasks: EnrichedSidebarTask[];
  enrichedTracks: EnrichedProjectTrack[];
  summary: ReturnType<typeof import('../../hooks/useSidebarTrackingData').useSidebarTrackingData>['summary'];
  togglePin: (taskId: string) => void;
}): SidebarGroupModel[] {
  const roleLower = (role || 'member').toLowerCase();
  const canViewDashboard = isLeader;
  const canViewDepartments = roleLower === 'admin';
  const canViewReports = isLeader;

  // ==========================================
  // GROUP 1: MAIN (Dashboard [plain], Workflow Management [drill-down])
  // ==========================================
  const mainNodes: Record<string, DrillNode> = {};
  const mainRootItems: DrillMenuItem[] = [];

  if (canViewDashboard) {
    mainRootItems.push({
      id: 'main:root:dashboard',
      label: t('nav.dashboard'),
      icon: <BarChart2 size={18} />,
      path: '/ui-dashboard',
    });
  }

  // Workflow Management Drill-down (Level 2 & Level 3)
  const wfPriorityTasks = enrichedTasks
    .filter(
      task =>
        (task.isPinned || task.isMentioned || task.isCommented) &&
        (task.task.project_id || task.task.campaign_id || task.task.workflow_phase_id)
    )
    .slice(0, 5);

  const wfTrackItems: DrillMenuItem[] = enrichedTracks.slice(0, 8).map(tr => {
    const trackNodeId = `main:wf:track:${tr.key}`;
    mainNodes[trackNodeId] = {
      id: trackNodeId,
      title: tr.name,
      headerPath: tr.workflowHref,
      items: [
        {
          id: `${trackNodeId}:open`,
          label: `Mở Workflow: ${tr.name}`,
          sublabel: `${tr.track.phases.length} chặng · ${tr.openCount} việc đang mở`,
          icon: <ExternalLink size={15} className="text-blue-600 dark:text-blue-400" />,
          path: tr.workflowHref,
          variant: 'priority',
        },
        ...(tr.tasks.length > 0
          ? tr.tasks
              .slice(0, 8)
              .map(task => buildTaskMenuItem(mainNodes, trackNodeId, task, togglePin))
          : tr.track.phases.map(ph => ({
              id: `${trackNodeId}:phase:${ph.id}`,
              label: ph.title,
              sublabel: `Chặng ${ph.position} · ${ph.status}`,
              icon: <Layers size={15} className="text-indigo-500" />,
              path: `${tr.workflowHref}&phase=${encodeURIComponent(ph.id)}`,
            }))),
      ],
    };

    return {
      id: `main:wf:item:${tr.key}`,
      label: tr.name,
      sublabel: `${tr.kind === 'campaign' ? 'Chiến dịch' : 'Dự án'} · ${tr.openCount} việc mở`,
      icon: (
        <Layers
          size={15}
          className={tr.kind === 'campaign' ? 'text-amber-500' : 'text-violet-500'}
        />
      ),
      path: tr.workflowHref,
      targetNodeId: trackNodeId,
      inlineBadge: (
        <SignalBadges
          isPinned={tr.pinnedCount > 0}
          isMentioned={tr.mentionCount > 0}
          hasUnreadMention={tr.hasUnreadMention}
          isCommented={tr.commentCount > 0}
          hasUnreadComment={tr.hasUnreadComment}
        />
      ),
      rightBadge: <CountPill count={tr.openCount} tone={tr.hasUnreadSignal ? 'blue' : 'neutral'} />,
      variant: tr.pinnedCount > 0 || tr.hasUnreadSignal ? 'priority' : 'default',
    };
  });

  mainNodes['main:workflow'] = {
    id: 'main:workflow',
    title: t('nav.home'),
    headerPath: '/workflow',
    items: [
      ...wfPriorityTasks.map(task =>
        buildTaskMenuItem(mainNodes, 'main:wf:prio', task, togglePin)
      ),
      ...wfTrackItems,
    ],
  };

  const wfPinnedCount = enrichedTracks.reduce((acc, tr) => acc + tr.pinnedCount, 0);

  mainRootItems.push({
    id: 'main:root:workflow',
    label: t('nav.home'),
    icon: <Layers size={18} />,
    path: '/workflow',
    targetNodeId: 'main:workflow',
    inlineBadge: (
      <NavSignalBadge unreadCount={summary.counts.workflowCount} pinnedCount={wfPinnedCount} />
    ),
  });

  mainNodes['main:root'] = {
    id: 'main:root',
    title: t('nav.main'),
    items: mainRootItems,
  };

  // ==========================================
  // GROUP 2: TASK / PROJECTS (Tasks [plain], Projects/Campaigns [drill-down], Profile [plain], Departments [plain])
  // ==========================================
  const tpNodes: Record<string, DrillNode> = {};
  const tpRootItems: DrillMenuItem[] = [];

  // 2.1 Tasks (Plain button, no drill-down)
  tpRootItems.push({
    id: 'tp:root:tasks',
    label: t('nav.tasks'),
    icon: <CheckSquare size={18} />,
    path: '/tasks',
  });

  // 2.2 Projects & Campaigns (Drill-down with prioritized tasks: Pinned, Mentioned, Commented)
  const projPriorityTasks = enrichedTasks
    .filter(
      task =>
        (task.isPinned || task.isMentioned || task.isCommented) &&
        (task.task.project_id || task.task.campaign_id)
    )
    .slice(0, 5);

  const projectBranchItems: DrillMenuItem[] = enrichedTracks.slice(0, 9).map(tr => {
    const pNodeId = `tp:proj:${tr.key}`;
    tpNodes[pNodeId] = {
      id: pNodeId,
      title: tr.name,
      headerPath: tr.projectsHref,
      items: [
        {
          id: `${pNodeId}:open`,
          label: `Mở ${tr.kind === 'campaign' ? 'Chiến dịch' : 'Dự án'}: ${tr.name}`,
          sublabel: `${tr.openCount} việc đang mở · ${tr.doneCount} hoàn thành`,
          icon: <ExternalLink size={15} className="text-blue-600 dark:text-blue-400" />,
          path: tr.projectsHref,
          variant: 'priority',
        },
        ...(tr.tasks.length > 0
          ? tr.tasks
              .slice(0, 8)
              .map(task => buildTaskMenuItem(tpNodes, pNodeId, task, togglePin))
          : [
              {
                id: `${pNodeId}:empty`,
                label: 'Chưa có subtask nào',
                icon: <FolderKanban size={15} className="text-slate-400" />,
                path: tr.projectsHref,
              },
            ]),
      ],
    };

    return {
      id: `tp:proj:item:${tr.key}`,
      label: tr.name,
      sublabel: `${tr.kind === 'campaign' ? 'Campaign' : 'Project'} · ${tr.openCount} việc mở`,
      icon: (
        <FolderKanban
          size={15}
          className={tr.kind === 'campaign' ? 'text-amber-500' : 'text-violet-500'}
        />
      ),
      path: tr.projectsHref,
      targetNodeId: pNodeId,
      inlineBadge: (
        <SignalBadges
          isPinned={tr.pinnedCount > 0}
          isMentioned={tr.mentionCount > 0}
          hasUnreadMention={tr.hasUnreadMention}
          isCommented={tr.commentCount > 0}
          hasUnreadComment={tr.hasUnreadComment}
        />
      ),
      rightBadge: <CountPill count={tr.openCount} tone={tr.hasUnreadSignal ? 'blue' : 'neutral'} />,
      variant: tr.pinnedCount > 0 || tr.hasUnreadSignal ? 'priority' : 'default',
    };
  });

  tpNodes['tp:projects'] = {
    id: 'tp:projects',
    title: t('nav.projects'),
    headerPath: '/projects',
    items: [
      ...projPriorityTasks.map(task =>
        buildTaskMenuItem(tpNodes, 'tp:proj:prio', task, togglePin)
      ),
      ...(projectBranchItems.length > 0
        ? projectBranchItems
        : [
            {
              id: 'tp:projects:empty',
              label: 'Chưa có dự án hoặc chiến dịch',
              icon: <FolderKanban size={15} className="text-slate-400" />,
              path: '/projects',
            },
          ]),
    ],
  };

  tpRootItems.push({
    id: 'tp:root:projects',
    label: t('nav.projects'),
    icon: <FolderKanban size={18} />,
    path: '/projects',
    targetNodeId: 'tp:projects',
    inlineBadge: (
      <NavSignalBadge unreadCount={summary.counts.projectCount} pinnedCount={wfPinnedCount} />
    ),
  });

  // 2.3 My Profile (Plain button, no drill-down)
  tpRootItems.push({
    id: 'tp:root:profile',
    label: t('nav.profile'),
    icon: <User size={18} />,
    path: '/my-tasks',
  });

  // 2.4 Departments (Plain button, Admin only)
  if (canViewDepartments) {
    tpRootItems.push({
      id: 'tp:root:departments',
      label: t('nav.departments'),
      icon: <Users size={18} />,
      path: '/departments-2',
    });
  }

  tpNodes['tp:root'] = {
    id: 'tp:root',
    title: t('nav.tasksProj'),
    items: tpRootItems,
  };

  // ==========================================
  // GROUP 3: ASSETS (Inventory [plain], Borrow Requests [plain])
  // ==========================================
  const assetNodes: Record<string, DrillNode> = {};
  const borrowPath = canManageBorrow ? '/borrow-requests' : '/borrow-requests?scope=mine';
  const borrowLabel = canManageBorrow ? t('nav.borrow') : t('nav.myBorrow');

  assetNodes['assets:root'] = {
    id: 'assets:root',
    title: t('nav.assets'),
    items: [
      {
        id: 'assets:root:inventory',
        label: t('nav.inventory'),
        icon: <Box size={18} />,
        path: '/assets',
      },
      ...(canBorrow ? [{
        id: 'assets:root:borrow',
        label: borrowLabel,
        icon: <History size={18} />,
        path: borrowPath,
        rightBadge:
          summary.counts.borrowCount > 0 ? (
            <CountPill
              count={summary.counts.borrowCount}
              tone="danger"
              title="Đơn cần duyệt / mượn"
            />
          ) : undefined,
      }] : []),
    ],
  };

  // ==========================================
  // GROUP 4: TEAM & REPORT (Team [plain], Members [plain], Reports [plain])
  // ==========================================
  const trNodes: Record<string, DrillNode> = {};
  const trRootItems: DrillMenuItem[] = [
    {
      id: 'tr:root:team',
      label: t('nav.team'),
      icon: <Users size={18} />,
      path: '/team',
    },
    {
      id: 'tr:root:members',
      label: t('nav.members'),
      icon: <Users size={18} />,
      path: '/members',
    },
  ];

  if (canViewReports) {
    trRootItems.push({
      id: 'tr:root:reports',
      label: t('nav.reports'),
      icon: <BarChart2 size={18} />,
      path: '/reports',
    });
  }

  trNodes['tr:root'] = {
    id: 'tr:root',
    title: t('nav.teamRep'),
    items: trRootItems,
  };

  return [
    {
      id: 'main',
      title: t('nav.main'),
      badgeCount: summary.counts.workflowCount,
      hasUnreadSignal: summary.counts.workflowCount > 0,
      pinnedCount: wfPinnedCount,
      rootNodeId: 'main:root',
      nodes: mainNodes,
    },
    {
      id: 'tasksProj',
      title: t('nav.tasksProj'),
      badgeCount: summary.counts.projectCount,
      hasUnreadSignal: summary.counts.projectCount > 0,
      pinnedCount: wfPinnedCount,
      rootNodeId: 'tp:root',
      nodes: tpNodes,
    },
    {
      id: 'assets',
      title: t('nav.assets'),
      badgeCount: summary.counts.borrowCount,
      hasUnreadSignal: false,
      pinnedCount: 0,
      rootNodeId: 'assets:root',
      nodes: assetNodes,
    },
    {
      id: 'teamRep',
      title: t('nav.teamRep'),
      badgeCount: 0,
      hasUnreadSignal: false,
      pinnedCount: 0,
      rootNodeId: 'tr:root',
      nodes: trNodes,
    },
  ];
}
