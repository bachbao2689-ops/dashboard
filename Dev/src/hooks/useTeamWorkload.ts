import { useMemo } from 'react';
import { useWorkspaceData } from './useWorkspaceData';
import {
  isTaskClosed,
  isTaskDone,
  taskActive,
  taskDay,
  taskOpen,
  taskOverdue,
  weeklyActivity,
  type TrackedTask,
} from '../lib/taskTracking';
import { weeklyReportRange } from '../lib/weeklyReport';
import type { BurndownItem, HeatmapRow } from '../types/department';

export interface TeamMemberWorkload {
  id: string;
  name: string;
  initial: string;
  avatar_url?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  activeTasksCount: number;
  totalTasksCount: number;
  capacityPercentage: number;
  status: 'good' | 'warning' | 'high' | 'overloaded';
  tasks: any[];
  created: number;
  doing: number;
  done: number;
  doneTotal: number;
  inProgressCount: number;
  todoCount: number;
  overdueCount: number;
  completionPct: number;
}

const getInitial = (name: string) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export function computeBurndownSeries(tasks: TrackedTask[], now = new Date()): BurndownItem[] {
  const activeList = tasks.filter((t) => taskActive(t));
  const totalTasks = activeList.length;
  const openNow = activeList.filter((t) => !isTaskClosed(t.status)).length;
  const todayStr = taskDay(now.toISOString());
  const endMs = new Date(`${todayStr || new Date().toISOString().slice(0, 10)}T12:00:00Z`).getTime();

  return Array.from({ length: 8 }, (_, idx) => {
    const weeksAgo = 7 - idx;
    const cutoffDate = new Date(endMs - weeksAgo * 7 * 86400000).toISOString().slice(0, 10);
    const completedByCutoff = activeList.filter((t) => {
      if (!isTaskDone(t.status)) return false;
      const doneDay = taskDay(t.completed_at) || taskDay((t as any).updated_at) || taskDay(t.due_date);
      return doneDay ? doneDay <= cutoffDate : idx === 7;
    }).length;

    const actual = idx === 7 ? openNow : Math.max(openNow, totalTasks - completedByCutoff);
    const planned = Math.max(0, Math.round(totalTasks * (1 - (idx * 0.8) / 7)));
    return {
      week: `T${idx + 1}`,
      actual,
      planned,
    };
  });
}

export function computeWorkloadHeatmap(
  entities: Array<{ id: string; name: string; tasks: TrackedTask[]; memberCount?: number }>,
  now = new Date(),
): HeatmapRow[] {
  const todayStr = taskDay(now.toISOString());
  const endMs = new Date(`${todayStr || new Date().toISOString().slice(0, 10)}T12:00:00Z`).getTime();

  return entities.map((entity) => {
    const activeList = entity.tasks.filter((t) => taskActive(t));
    const scale = Math.max(1, entity.memberCount || 1);
    const weeks = [3, 2, 1, 0].map((weeksAgo) => {
      const weekEnd = new Date(endMs - weeksAgo * 7 * 86400000).toISOString().slice(0, 10);
      const openAtWeek = activeList.filter((t) => {
        const createdDay = taskDay(t.created_at) || taskDay(t.start_date);
        if (createdDay && createdDay > weekEnd) return false;
        if (!isTaskDone(t.status)) return true;
        const doneDay = taskDay(t.completed_at) || taskDay((t as any).updated_at);
        return Boolean(doneDay && doneDay > weekEnd);
      }).length;
      return Math.round((openAtWeek * 20) / scale);
    }) as [number, number, number, number];

    return {
      id: entity.id,
      name: entity.name,
      weeks,
    };
  });
}

// Explicit planning estimate: 5 active tasks = 100%; no stored hours exist yet.
export const useTeamWorkload = (departmentFilter = 'all') => {
  const { tasks, users, departments: workspaceDepartments, loading, error, refetch } = useWorkspaceData();
  const today = taskDay(new Date().toISOString());

  const departments = useMemo(() => {
    const map = new Map<string, string>();
    (workspaceDepartments || []).forEach((d) => {
      if (d.id && d.name) map.set(String(d.id), d.name);
    });
    users.forEach((u) => {
      if (u.department_id && u.department?.name) {
        map.set(String(u.department_id), u.department.name);
      }
    });
    tasks.forEach((t) => {
      if (t.department?.id && t.department?.name) {
        map.set(String(t.department.id), t.department.name);
      }
    });
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [workspaceDepartments, users, tasks]);

  const filteredUsers = useMemo(() => {
    if (!departmentFilter || departmentFilter === 'all') return users;
    return users.filter((u) => String(u.department_id) === String(departmentFilter));
  }, [users, departmentFilter]);

  const scopedTasks = useMemo(() => {
    if (!departmentFilter || departmentFilter === 'all') return tasks;
    const memberIds = new Set(filteredUsers.map((u) => String(u.id)));
    return tasks.filter((t) => {
      if (t.assignee_id != null) {
        return memberIds.has(String(t.assignee_id));
      }
      return String(t.department?.id) === String(departmentFilter);
    });
  }, [tasks, filteredUsers, departmentFilter]);

  const workloads = useMemo(() => {
    const week = weeklyReportRange('current');
    return filteredUsers
      .map((u) => {
        const memberTasks = scopedTasks.filter(
          (t) => String(t.assignee_id) === String(u.id) && taskActive(t),
        );
        const openList = memberTasks.filter((t) => taskOpen(t));
        const doneList = memberTasks.filter((t) => isTaskDone(t.status));
        const overdueList = openList.filter((t) => taskOverdue(t, today));
        const todoList = openList.filter(
          (t) =>
            !taskOverdue(t, today) &&
            ['todo', 'backlog', 'planned'].includes((t.status || '').toLowerCase()),
        );
        const inProgressList = openList.filter(
          (t) =>
            !taskOverdue(t, today) &&
            !['todo', 'backlog', 'planned'].includes((t.status || '').toLowerCase()),
        );
        const capacityPercentage = openList.length * 20;
        const totalTasksCount = memberTasks.length;
        const completionPct = totalTasksCount
          ? Math.round((doneList.length / totalTasksCount) * 100)
          : 0;

        return {
          id: String(u.id),
          name: u.name,
          initial: getInitial(u.name),
          avatar_url: u.avatar_url,
          department_id: u.department_id,
          department_name: u.department?.name || null,
          tasks: openList,
          ...weeklyActivity(memberTasks, week.start, week.end),
          activeTasksCount: openList.length,
          totalTasksCount,
          doneTotal: doneList.length,
          inProgressCount: inProgressList.length,
          todoCount: todoList.length,
          overdueCount: overdueList.length,
          completionPct,
          capacityPercentage,
          status: (capacityPercentage > 100
            ? 'overloaded'
            : capacityPercentage >= 80
            ? 'high'
            : capacityPercentage >= 60
            ? 'warning'
            : 'good') as TeamMemberWorkload['status'],
        };
      })
      .sort((a, b) => b.capacityPercentage - a.capacityPercentage || b.totalTasksCount - a.totalTasksCount);
  }, [tasks, filteredUsers, today]);

  const burndown = useMemo(() => computeBurndownSeries(scopedTasks), [scopedTasks]);

  const heatmap = useMemo(
    () =>
      computeWorkloadHeatmap(
        workloads.slice(0, 6).map((w) => ({
          id: w.id,
          name: w.name,
          tasks: tasks.filter((t) => String(t.assignee_id) === String(w.id)),
          memberCount: 1,
        })),
      ),
    [workloads, tasks],
  );

  const summary = useMemo(() => {
    const activeTasks = scopedTasks.filter((t) => taskActive(t));
    const doneTasks = activeTasks.filter((t) => isTaskDone(t.status)).length;
    const openTasks = activeTasks.filter((t) => taskOpen(t));
    const overdueTasks = openTasks.filter((t) => taskOverdue(t, today)).length;
    const inProgressTasks = openTasks.filter(
      (t) => !['todo', 'backlog', 'planned'].includes((t.status || '').toLowerCase()),
    ).length;
    const todoTasks = openTasks.length - inProgressTasks;
    const completionRate = activeTasks.length
      ? Math.round((doneTasks / activeTasks.length) * 100)
      : 0;
    const totalMembers = workloads.length;
    const totalMemberOpenTasks = workloads.reduce((sum, w) => sum + w.activeTasksCount, 0);
    const averageLoad = totalMembers > 0 ? (totalMemberOpenTasks / totalMembers).toFixed(1) : '0';
    const overloadedCount = workloads.filter((w) => w.capacityPercentage > 100).length;
    const highLoadCount = workloads.filter((w) => w.capacityPercentage >= 80).length;
    const avgCapacity = totalMembers > 0
      ? Math.round(workloads.reduce((sum, w) => sum + w.capacityPercentage, 0) / totalMembers)
      : 0;

    return {
      totalMembers,
      totalTasks: activeTasks.length,
      openTasks: openTasks.length,
      doneTasks,
      inProgressTasks,
      todoTasks,
      overdueTasks,
      completionRate,
      averageLoad,
      overloadedCount,
      highLoadCount,
      avgCapacity,
    };
  }, [scopedTasks, workloads, today]);

  return { workloads, departments, burndown, heatmap, summary, isLoading: loading, error, refetch };
};


