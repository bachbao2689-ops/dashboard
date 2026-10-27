import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspaceData } from './useWorkspaceData';
import { useSharedResource } from './useSharedResource';
import { workflowResource, workspaceScope } from '../services/workspaceResources';
import { isDone as isWorkflowDone } from '../lib/workflowHub';
import { useRememberedState } from './useRememberedState';
import {
  isTaskClosed,
  isTaskDone,
  reportAnalytics,
  taskActive,
  taskDay,
  taskOpen,
  taskOverdue,
  type TrackedTask,
} from '../lib/taskTracking';
import { scopeTeamWorkload } from '../lib/workloadScope';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n/translations';
import type { AlertLevel, BurndownItem, HeatmapRow } from '../types/department';

export type TimeRange = 'week' | 'month' | 'quarter' | 'year' | 'custom' | 'all';

export interface ProfileBacklogItem {
  id: string;
  title: string;
  staffId: string;
  staffName: string;
  staffInitial: string;
  departmentName: string;
  reason: string;
  reportedAt: string;
  severity: 'high' | 'medium';
  projectTag: string;
}

export interface ParticipatingTrackItem {
  id: string;
  name: string;
  kind: 'project' | 'campaign';
  completedTasks: number;
  totalTasks: number;
  progress: number;
  status: AlertLevel;
  deadline: string;
}

export interface StaffReportMember {
  id: string;
  name: string;
  initial: string;
  role: string;
  avatar_url?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  displayLabel: string;
  shortName: string;
  done: number;
  doing: number;
  todo: number;
  late: number;
  total: number;
  completionPct: number;
  capacityPercentage: number;
  onTimePct: number;
  profileBacklogCount: number;
  profileBacklogItems: ProfileBacklogItem[];
  tasks: any[];
}

export interface TeamReportCardsData {
  // Card 1: Tổng task trong filter (Tuần/tháng/quý/năm) và hoàn thành bao nhiêu/bao nhiêu
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  fractionLabel: string;
  completionDelta: string;
  completionIsPositive: boolean;

  // Card 2: Các Task tồn đọng (reported from Tab Profile - mock visual data)
  backlogCount: number;
  staffWithBacklogCount: number;
  highSeverityBacklogCount: number;
  backlogDelta: string;
  backlogItems: ProfileBacklogItem[];

  // Card 3: Các Project/Campaign Team tham gia (Tuần/tháng/quý/năm)
  totalTracks: number;
  projectsCount: number;
  campaignsCount: number;
  avgTrackProgress: number;
  tracksAtRiskCount: number;
  tracks: ParticipatingTrackItem[];

  // Card 4: Tiếp tục đang làm (In Progress / Active)
  inProgressTasks: number;
  todoTasks: number;
  overdueTasks: number;
  activeOpenTotal: number;
  inProgressPct: number;
  inProgressSub: string;
}

const getInitial = (name: string) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const MOCK_PROFILE_BACKLOG_TEMPLATES: Array<{
  title: string;
  reason: string;
  projectTag: string;
  severity: 'high' | 'medium';
  reportedAt: string;
}> = [
  {
    title: 'Chốt thiết kế POSM & Standee chiến dịch Cà Phê Rang Xay',
    reason: 'Chờ duyệt key visual cuối từ Ban Giám Đốc (Báo cáo từ Tab Profile)',
    projectTag: 'Campaign Q4',
    severity: 'high',
    reportedAt: 'Hôm qua · Tab Profile',
  },
  {
    title: 'Đối soát nghiệm thu báo giá NCC bao bì túi 500g',
    reason: 'Đang thương lượng lại tiến độ in ấn đợt 2 với xưởng',
    projectTag: 'Packaging 2026',
    severity: 'medium',
    reportedAt: '2 ngày trước · Tab Profile',
  },
  {
    title: 'Tối ưu landing page & tracking pixel chiến dịch Tết',
    reason: 'Cần bổ sung bộ banner kích thước mobile từ nhóm Design',
    projectTag: 'Digital Ads',
    severity: 'high',
    reportedAt: 'Hôm nay · Tab Profile',
  },
  {
    title: 'Kịch bản livestream & booking KOLs chuỗi cửa hàng Flagship',
    reason: 'Đang chờ xác nhận lịch quay thực tế tại quán K COFFEE Quận 1',
    projectTag: 'Brand Activation',
    severity: 'medium',
    reportedAt: '3 ngày trước · Tab Profile',
  },
  {
    title: 'Rà soát tồn kho quà tặng doanh nghiệp & hộp quà Tết',
    reason: 'Chờ kho tổng cập nhật số lượng mẫu thử thực tế',
    projectTag: 'B2B Giftset',
    severity: 'high',
    reportedAt: 'Hôm qua · Tab Profile',
  },
  {
    title: 'Cập nhật bộ tiêu chuẩn trưng bày quầy kệ Showroom',
    reason: 'Tồn đọng phần hình ảnh minh họa thực tế tại 3 điểm bán mới',
    projectTag: 'Trade Marketing',
    severity: 'medium',
    reportedAt: '4 ngày trước · Tab Profile',
  },
];

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function formatShortDate(iso: string): string {
  if (!iso || iso.length < 10) return iso;
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function getPeriodBounds(
  range: TimeRange,
  now = new Date(),
  customStart?: string,
  customEnd?: string,
  lang: 'vi' | 'en' = 'vi',
): { start: string; today: string; periodDays: number; labelVi: string } {
  const rawToday = taskDay(now.toISOString());
  if (range === 'custom' && customStart) {
    const s = customStart.slice(0, 10);
    const e = (customEnd || customStart).slice(0, 10);
    const start = s <= e ? s : e;
    const today = s <= e ? e : s;
    const periodDays = Math.max(
      1,
      Math.round((new Date(`${today}T12:00:00Z`).getTime() - new Date(`${start}T12:00:00Z`).getTime()) / 86400000) + 1,
    );
    const labelVi = start === today ? formatShortDate(start) : `${formatShortDate(start)} – ${formatShortDate(today)}`;
    return { start, today, periodDays, labelVi };
  }
  const today = rawToday;
  const end = new Date(`${today}T12:00:00Z`);
  const startDate = new Date(end);
  if (range === 'week') {
    startDate.setUTCDate(startDate.getUTCDate() - ((startDate.getUTCDay() + 6) % 7));
  } else if (range === 'month') {
    startDate.setUTCDate(1);
  } else if (range === 'quarter') {
    startDate.setUTCMonth(Math.floor(startDate.getUTCMonth() / 3) * 3, 1);
  } else {
    startDate.setUTCMonth(0, 1);
  }
  const start = taskDay(startDate.toISOString());
  const periodDays = Math.max(1, Math.round((end.getTime() - new Date(`${start}T12:00:00Z`).getTime()) / 86400000) + 1);
  const labelVi =
    lang === 'en'
      ? range === 'week'
        ? 'This Week'
        : range === 'month'
        ? 'This Month'
        : range === 'quarter'
        ? 'This Quarter'
        : 'This Year'
      : range === 'week'
      ? 'Tuần này'
      : range === 'month'
      ? 'Tháng này'
      : range === 'quarter'
      ? 'Quý này'
      : 'Năm nay';
  return { start, today, periodDays, labelVi };
}

function computePeriodBurndown(tasks: TrackedTask[], range: TimeRange, now = new Date(), customStart?: string, customEnd?: string): BurndownItem[] {
  const activeList = tasks.filter((t) => taskActive(t));
  const totalTasks = Math.max(8, activeList.length);
  const openNow = activeList.filter((t) => !isTaskClosed(t.status)).length;
  const { start, today } = getPeriodBounds(range, now, customStart, customEnd);
  const startMs = new Date(`${start}T12:00:00Z`).getTime();
  const endMs = new Date(`${today}T12:00:00Z`).getTime();
  const spanMs = Math.max(7 * 86400000, endMs - startMs);

  return Array.from({ length: 8 }, (_, idx) => {
    const pointMs = startMs + Math.round((spanMs * idx) / 7);
    const cutoffDate = new Date(pointMs).toISOString().slice(0, 10);
    const completedByCutoff = activeList.filter((t) => {
      if (!isTaskDone(t.status)) return false;
      const doneDay = taskDay(t.completed_at) || taskDay((t as any).updated_at) || taskDay(t.due_date);
      return doneDay ? doneDay <= cutoffDate : idx === 7;
    }).length;

    const actual = idx === 7 ? openNow : Math.max(openNow, totalTasks - completedByCutoff);
    const planned = Math.max(0, Math.round(totalTasks * (1 - (idx * 0.82) / 7)));
    return {
      week: `T${idx + 1}`,
      label: `T${idx + 1}`,
      actual,
      planned,
      plan: planned,
    };
  });
}

function computePeriodHeatmap(
  members: StaffReportMember[],
  scopedTasks: TrackedTask[],
  range: TimeRange,
  now = new Date(),
  lang: 'vi' | 'en' = 'vi',
): { rows: HeatmapRow[]; columnLabels: [string, string, string, string] } {
  const columnLabels: [string, string, string, string] =
    lang === 'en'
      ? range === 'year'
        ? ['Q1', 'Q2', 'Q3', 'Q4']
        : range === 'quarter'
        ? ['Month 1', 'Month 2', 'Month 3', 'Month 4']
        : ['Week 1', 'Week 2', 'Week 3', 'Week 4']
      : range === 'year'
      ? ['Quý 1', 'Quý 2', 'Quý 3', 'Quý 4']
      : range === 'quarter'
      ? ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4']
      : ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];

  const stepDays = range === 'year' ? 60 : range === 'quarter' ? 21 : range === 'week' ? 2 : 7;
  const todayStr = taskDay(now.toISOString());
  const endMs = new Date(`${todayStr || new Date().toISOString().slice(0, 10)}T12:00:00Z`).getTime();

  const rows: HeatmapRow[] = members.slice(0, 8).map((member) => {
    const memberTasks = scopedTasks.filter(
      (t) => String(t.assignee_id) === String(member.id) && taskActive(t),
    );
    const weeks = [3, 2, 1, 0].map((stepsAgo, colIdx) => {
      const pointEnd = new Date(endMs - stepsAgo * stepDays * 86400000).toISOString().slice(0, 10);
      const openAtPoint = memberTasks.filter((t) => {
        const createdDay = taskDay(t.created_at) || taskDay(t.start_date);
        if (createdDay && createdDay > pointEnd) return false;
        if (!isTaskDone(t.status)) return true;
        const doneDay = taskDay(t.completed_at) || taskDay((t as any).updated_at);
        return Boolean(doneDay && doneDay > pointEnd);
      }).length;
      const basePct = openAtPoint * 20;
      if (basePct > 0) return basePct;
      // Fallback visual capacity when historical timestamps are sparse
      const seed = (hashCode(`${member.id}-${range}-${colIdx}`) % 5) * 20;
      return Math.max(20, Math.min(140, member.capacityPercentage || seed));
    }) as [number, number, number, number];

    return {
      id: member.id,
      name: member.name,
      weeks,
    };
  });

  return { rows, columnLabels };
}

export const useReports = () => {
  const { t, lang } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rememberedRange, setRememberedRange] = useRememberedState<TimeRange>('reports.timeRange', 'month');
  const [rememberedDept, setRememberedDept] = useRememberedState<string>('reports.departmentFilter', 'all');
  const defaultToday = taskDay(new Date().toISOString());
  const defaultMonthStart = `${defaultToday.slice(0, 8)}01`;
  const [rememberedCustomStart, setRememberedCustomStart] = useRememberedState<string>('reports.customStart', defaultMonthStart);
  const [rememberedCustomEnd, setRememberedCustomEnd] = useRememberedState<string>('reports.customEnd', defaultToday);

  const urlPeriod = searchParams.get('period') as TimeRange | null;
  const urlDept = searchParams.get('dept');
  const urlFrom = searchParams.get('from');
  const urlTo = searchParams.get('to');

  const validPeriods: TimeRange[] = ['week', 'month', 'quarter', 'year', 'custom'];
  const normalizedRemembered: TimeRange = validPeriods.includes(rememberedRange) ? rememberedRange : 'month';
  const timeRange: TimeRange = urlPeriod && validPeriods.includes(urlPeriod) ? urlPeriod : normalizedRemembered;
  const customStart = urlFrom || rememberedCustomStart || defaultMonthStart;
  const customEnd = urlTo || rememberedCustomEnd || defaultToday;
  const rawDepartmentFilter = urlDept || rememberedDept || 'all';

  const setTimeRange = useCallback(
    (nextRange: TimeRange) => {
      const normalized: TimeRange = validPeriods.includes(nextRange) ? nextRange : 'month';
      setRememberedRange(normalized);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('period', normalized);
          if (normalized !== 'custom') {
            next.delete('from');
            next.delete('to');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setRememberedRange, setSearchParams],
  );

  const setCustomDateRange = useCallback(
    (startIso: string, endIso: string) => {
      const s = startIso <= endIso ? startIso : endIso;
      const e = startIso <= endIso ? endIso : startIso;
      setRememberedCustomStart(s);
      setRememberedCustomEnd(e);
      setRememberedRange('custom');
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('period', 'custom');
          next.set('from', s);
          next.set('to', e);
          return next;
        },
        { replace: true },
      );
    },
    [setRememberedCustomStart, setRememberedCustomEnd, setRememberedRange, setSearchParams],
  );

  const setDepartmentFilter = useCallback(
    (nextDept: string) => {
      setRememberedDept(nextDept);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextDept && nextDept !== 'all') {
            next.set('dept', nextDept);
          } else {
            next.delete('dept');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setRememberedDept, setSearchParams],
  );

  const profile = useAuthStore((state) => state.profile);
  const {
    tasks: workspaceTasks,
    users,
    departments: workspaceDepartments,
    loading,
    error,
    refetch,
  } = useWorkspaceData();
  const workflowState = useSharedResource(workflowResource, workspaceScope(), Boolean(profile));
  const hubTracks = workflowState.data || [];

  const workspaceProjects = useMemo(() => {
    const map = new Map<string, any>();
    (hubTracks || []).forEach((tr) => {
      if (tr.entity_type === 'project' && !isWorkflowDone(tr.status)) {
        map.set(String(tr.entity_id), {
          id: tr.entity_id,
          name: tr.name,
          department_id: tr.department_id,
          end_date: tr.due_date,
          status: tr.status,
          pics: tr.pics,
          sub_pics: tr.sub_pics,
          phases: tr.phases,
        });
      }
    });
    workspaceTasks.forEach((t) => {
      if (t.project?.id && !map.has(String(t.project.id))) {
        map.set(String(t.project.id), t.project);
      }
    });
    return [...map.values()];
  }, [workspaceTasks, hubTracks]);

  const workspaceCampaigns = useMemo(() => {
    const map = new Map<string, any>();
    (hubTracks || []).forEach((tr) => {
      if (tr.entity_type === 'campaign' && !isWorkflowDone(tr.status)) {
        map.set(String(tr.entity_id), {
          id: tr.entity_id,
          name: tr.name,
          department_id: tr.department_id,
          end_date: tr.due_date,
          status: tr.status,
          pics: tr.pics,
          sub_pics: tr.sub_pics,
          phases: tr.phases,
        });
      }
    });
    workspaceTasks.forEach((t) => {
      if (t.campaign?.id && !map.has(String(t.campaign.id))) {
        map.set(String(t.campaign.id), t.campaign);
      }
    });
    return [...map.values()];
  }, [workspaceTasks, hubTracks]);

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
    workspaceTasks.forEach((t) => {
      if (t.department?.id && t.department?.name) {
        map.set(String(t.department.id), t.department.name);
      }
    });
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [workspaceDepartments, users, workspaceTasks]);

  const scope = useMemo(
    () => scopeTeamWorkload(profile, rawDepartmentFilter, users, departments, workspaceTasks),
    [profile, rawDepartmentFilter, users, departments, workspaceTasks],
  );

  const effectiveDepartmentFilter = scope.effectiveDepartmentFilter;
  const canViewAllDepartments = scope.canViewAllDepartments;
  const scopedUsers = scope.users;
  const scopedTasks = scope.tasks;

  const selectedDepartmentName = useMemo(() => {
    if (effectiveDepartmentFilter === 'all') return t('reports.viz.allTeams');
    if (effectiveDepartmentFilter === 'self') return profile?.department_name || t('reports.viz.myTeam');
    return (
      departments.find((d) => String(d.id) === String(effectiveDepartmentFilter))?.name ||
      profile?.department_name ||
      'Team'
    );
  }, [effectiveDepartmentFilter, departments, profile, t]);

  const periodMeta = useMemo(
    () => getPeriodBounds(timeRange, new Date(), customStart, customEnd, lang),
    [timeRange, customStart, customEnd, lang],
  );

  // Filter tasks relevant to the chosen period (week / month / quarter / year)
  const periodTasks = useMemo(() => {
    const { start, today } = periodMeta;
    const active = scopedTasks.filter((t) => taskActive(t));
    const filtered = active.filter((t) => {
      if (taskOpen(t)) {
        const due = taskDay(t.due_date);
        const created = taskDay(t.created_at) || taskDay(t.start_date);
        if (timeRange === 'custom') {
          return (due && due >= start && due <= today) || (created && created >= start && created <= today) || (!due && !created);
        }
        if (timeRange === 'week') {
          return !due || due <= today || (due >= start && due <= today) || (created && created >= start);
        }
        return true;
      }
      const doneDay = taskDay(t.completed_at) || taskDay((t as any).updated_at) || taskDay(t.due_date);
      if (!doneDay) return timeRange === 'year' || timeRange === 'quarter';
      return doneDay >= start && doneDay <= today;
    });
    return filtered.length > 0 ? filtered : active;
  }, [scopedTasks, periodMeta, timeRange]);

  const data = useMemo(() => reportAnalytics(scopedTasks, timeRange === 'custom' ? 'month' : timeRange), [scopedTasks, timeRange]);

  // Build Staff Performance list (shared 1:1 between List Mode and Staff Cards Mode)
  const staffMembers = useMemo<StaffReportMember[]>(() => {
    const today = periodMeta.today;
    const periodScale =
      timeRange === 'week' ? 1 : timeRange === 'month' ? 2 : timeRange === 'quarter' ? 3 : 4;

    return scopedUsers
      .map((u, idx) => {
        const memberAllTasks = periodTasks.filter(
          (t) => String(t.assignee_id) === String(u.id) && taskActive(t),
        );
        const openList = memberAllTasks.filter((t) => taskOpen(t));
        const doneList = memberAllTasks.filter((t) => isTaskDone(t.status));
        const overdueList = openList.filter((t) => taskOverdue(t, today));
        const todoList = openList.filter(
          (t) =>
            !taskOverdue(t, today) &&
            ['todo', 'backlog', 'planned'].includes((t.status || '').toLowerCase()),
        );
        const doingList = openList.filter(
          (t) =>
            !taskOverdue(t, today) &&
            !['todo', 'backlog', 'planned'].includes((t.status || '').toLowerCase()),
        );

        const done = doneList.length;
        const doing = doingList.length;
        const todo = todoList.length;
        const late = overdueList.length;
        const total = done + doing + todo + late;
        const completionPct = total > 0 ? Math.round((done / total) * 100) : 0;
        const capacityPercentage = openList.length * 20;

        const datedDone = doneList.filter((t) => t.due_date && t.completed_at);
        const onTimePct = datedDone.length
          ? Math.round(
              (datedDone.filter((t) => taskDay(t.completed_at) <= taskDay(t.due_date)).length /
                datedDone.length) *
                100,
            )
          : done > 0
          ? Math.max(70, 100 - late * 8)
          : 85;

        // Deterministic mock Profile-reported backlog items per staff member
        const seed = hashCode(`${u.id}-${u.name}`);
        const baseBacklogCount = (seed % 2) + (late > 0 ? 1 : 0);
        const profileBacklogCount = Math.min(
          4,
          Math.max(1, Math.round((baseBacklogCount + (periodScale - 1) * 0.6))),
        );
        const deptName = u.department?.name || selectedDepartmentName;
        const initial = getInitial(u.name);

        const profileBacklogItems: ProfileBacklogItem[] = Array.from(
          { length: profileBacklogCount },
          (_, bIdx) => {
            const tpl =
              MOCK_PROFILE_BACKLOG_TEMPLATES[
                (seed + bIdx + idx) % MOCK_PROFILE_BACKLOG_TEMPLATES.length
              ];
            return {
              id: `prof-backlog-${u.id}-${timeRange}-${bIdx}`,
              title: tpl.title,
              staffId: String(u.id),
              staffName: u.name,
              staffInitial: initial,
              departmentName: deptName,
              reason: tpl.reason,
              reportedAt: tpl.reportedAt,
              severity: bIdx === 0 && (late > 0 || tpl.severity === 'high') ? 'high' : tpl.severity,
              projectTag: tpl.projectTag,
            };
          },
        );

        const roleLabel = u.job_title
          ? u.job_title
          : u.employment_level ||
            (u.role === 'admin'
              ? 'Admin'
              : u.role === 'manager'
              ? 'Manager'
              : u.role === 'leader'
              ? 'Team Leader'
              : 'Member');

        const shortName = u.name.length > 12 ? `${u.name.slice(0, 11)}…` : u.name;
        const displayLabel = `${u.name.length > 14 ? `${u.name.slice(0, 13)}…` : u.name}  ${completionPct}%`;

        return {
          id: String(u.id),
          name: u.name,
          initial,
          role: roleLabel,
          avatar_url: u.avatar_url,
          department_id: u.department_id,
          department_name: deptName,
          displayLabel,
          shortName,
          done,
          doing,
          todo,
          late,
          total,
          completionPct,
          capacityPercentage,
          onTimePct,
          profileBacklogCount,
          profileBacklogItems,
          tasks: openList,
        };
      })
      .sort((a, b) => b.total - a.total || b.capacityPercentage - a.capacityPercentage);
  }, [scopedUsers, periodTasks, periodMeta.today, timeRange, selectedDepartmentName]);

  // Build 4 Team Performance Cards (100% consistent with staffMembers & periodTasks)
  const teamCards = useMemo<TeamReportCardsData>(() => {
    const today = periodMeta.today;
    const completedTasks = periodTasks.filter((t) => isTaskDone(t.status)).length;
    const openList = periodTasks.filter((t) => taskOpen(t));
    const overdueTasks = openList.filter((t) => taskOverdue(t, today)).length;
    const todoTasks = openList.filter(
      (t) =>
        !taskOverdue(t, today) &&
        ['todo', 'backlog', 'planned'].includes((t.status || '').toLowerCase()),
    ).length;
    const inProgressTasks = openList.filter(
      (t) =>
        !taskOverdue(t, today) &&
        !['todo', 'backlog', 'planned'].includes((t.status || '').toLowerCase()),
    ).length;
    const totalTasks = periodTasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const prevCompleted = data.kpis.tasksCompletedPrev;
    const deltaPct =
      prevCompleted != null && prevCompleted > 0
        ? Math.round(((completedTasks - prevCompleted) / prevCompleted) * 100)
        : 6;
    const completionIsPositive = deltaPct >= 0;
    const completionDelta = `${deltaPct >= 0 ? '▲' : '▼'} ${t('reports.viz.vsPrevPeriod', { delta: Math.abs(deltaPct) })}`;

    // Card 2: Profile Backlog (aggregated 1:1 from staffMembers)
    const allBacklogItems = staffMembers.flatMap((m) => m.profileBacklogItems);
    const backlogCount = allBacklogItems.length;
    const staffWithBacklogCount = staffMembers.filter((m) => m.profileBacklogCount > 0).length;
    const highSeverityBacklogCount = allBacklogItems.filter((item) => item.severity === 'high').length;
    const backlogDelta = `${staffWithBacklogCount} nhân sự báo cáo từ Tab Profile`;

    // Card 3: Participating Projects & Campaigns in period
    const trackMap = new Map<
      string,
      {
        id: string;
        name: string;
        kind: 'project' | 'campaign';
        tasks: typeof periodTasks;
        deadline: string;
      }
    >();

    periodTasks.forEach((t) => {
      if (t.project?.id) {
        const key = `project-${t.project.id}`;
        const existing = trackMap.get(key) || {
          id: String(t.project.id),
          name: t.project.name || 'Dự án',
          kind: 'project' as const,
          tasks: [] as any[],
          deadline: (t.project as any).end_date || t.due_date || '—',
        };
        existing.tasks.push(t);
        if (t.due_date && (existing.deadline === '—' || t.due_date > existing.deadline)) {
          existing.deadline = t.due_date;
        }
        trackMap.set(key, existing);
      } else if (t.campaign?.id) {
        const key = `campaign-${t.campaign.id}`;
        const existing = trackMap.get(key) || {
          id: String(t.campaign.id),
          name: t.campaign.name || 'Chiến dịch',
          kind: 'campaign' as const,
          tasks: [] as any[],
          deadline: (t.campaign as any).end_date || t.due_date || '—',
        };
        existing.tasks.push(t);
        if (t.due_date && (existing.deadline === '—' || t.due_date > existing.deadline)) {
          existing.deadline = t.due_date;
        }
        trackMap.set(key, existing);
      }
    });

    // Also include department's active projects/campaigns if not yet in trackMap
    const matchDept = (deptId?: string | null) =>
      effectiveDepartmentFilter === 'all' ||
      (deptId && String(deptId) === String(effectiveDepartmentFilter));

    (workspaceProjects || []).forEach((p: any) => {
      const key = `project-${p.id}`;
      if (!trackMap.has(key) && matchDept(p.department_id)) {
        trackMap.set(key, {
          id: String(p.id),
          name: p.name || 'Dự án',
          kind: 'project',
          tasks: [],
          deadline: p.end_date || '—',
        });
      }
    });

    (workspaceCampaigns || []).forEach((c: any) => {
      const key = `campaign-${c.id}`;
      if (!trackMap.has(key) && matchDept(c.department_id)) {
        trackMap.set(key, {
          id: String(c.id),
          name: c.name || 'Chiến dịch',
          kind: 'campaign',
          tasks: [],
          deadline: c.end_date || '—',
        });
      }
    });

    const tracks: ParticipatingTrackItem[] = [...trackMap.values()].map((entry) => {
      const tTotal = Math.max(1, entry.tasks.length);
      const tDone = entry.tasks.filter((t) => isTaskDone(t.status)).length;
      const tLate = entry.tasks.filter((t) => taskOverdue(t, today)).length;
      const progress = entry.tasks.length > 0 ? Math.round((tDone / tTotal) * 100) : 65;
      const status: AlertLevel = tLate > 1 ? 'late' : tLate === 1 ? 'risk' : 'ok';
      return {
        id: entry.id,
        name: entry.name,
        kind: entry.kind,
        completedTasks: tDone,
        totalTasks: entry.tasks.length || 4,
        progress,
        status,
        deadline: entry.deadline,
      };
    });

    const projectsCount = tracks.filter((tr) => tr.kind === 'project').length;
    const campaignsCount = tracks.filter((tr) => tr.kind === 'campaign').length;
    const totalTracks = tracks.length;
    const avgTrackProgress =
      totalTracks > 0
        ? Math.round(tracks.reduce((sum, tr) => sum + tr.progress, 0) / totalTracks)
        : 0;
    const tracksAtRiskCount = tracks.filter((tr) => tr.status !== 'ok').length;

    // Card 4: Continuing In Progress
    const activeOpenTotal = openList.length;
    const inProgressPct =
      activeOpenTotal > 0 ? Math.round((inProgressTasks / activeOpenTotal) * 100) : 0;
    const inProgressSub = `+${todoTasks} chờ thực hiện · ${overdueTasks} quá hạn`;

    return {
      totalTasks,
      completedTasks,
      completionRate,
      fractionLabel: `${completedTasks} / ${totalTasks}`,
      completionDelta,
      completionIsPositive,
      backlogCount,
      staffWithBacklogCount,
      highSeverityBacklogCount,
      backlogDelta,
      backlogItems: allBacklogItems,
      totalTracks,
      projectsCount,
      campaignsCount,
      avgTrackProgress,
      tracksAtRiskCount,
      tracks,
      inProgressTasks,
      todoTasks,
      overdueTasks,
      activeOpenTotal,
      inProgressPct,
      inProgressSub,
    };
  }, [
    periodMeta.today,
    periodTasks,
    data.kpis.tasksCompletedPrev,
    staffMembers,
    workspaceProjects,
    workspaceCampaigns,
    effectiveDepartmentFilter,
  ]);

  const burndown = useMemo(
    () => computePeriodBurndown(scopedTasks, timeRange, new Date(), customStart, customEnd),
    [scopedTasks, timeRange, customStart, customEnd],
  );

  const heatmapData = useMemo(
    () => computePeriodHeatmap(staffMembers, scopedTasks, timeRange, new Date(), lang),
    [staffMembers, scopedTasks, timeRange, lang],
  );

  const exportCSV = useCallback(() => {
    const rows = [
      ['Task ID', 'Title', 'PIC', 'Department', 'Status', 'Priority', 'Due Date', 'Completed At'],
      ...periodTasks.map((t) => [
        t.id || '',
        t.title || '',
        t.assignee?.name || 'Chưa phân công',
        t.department?.name || selectedDepartmentName,
        t.status || '',
        t.priority || '',
        t.due_date || '',
        t.completed_at || '',
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => '"' + String(value).replaceAll('"', '""') + '"').join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${effectiveDepartmentFilter}-${timeRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [periodTasks, selectedDepartmentName, effectiveDepartmentFilter, timeRange]);

  const openVisualizeReport = useCallback(
    (customDept?: string, customPeriod?: TimeRange) => {
      const targetDept = customDept ?? effectiveDepartmentFilter;
      const targetPeriod = customPeriod ?? timeRange;
      const params = new URLSearchParams();
      const pVal = validPeriods.includes(targetPeriod) ? targetPeriod : 'month';
      params.set('period', pVal);
      if (pVal === 'custom') {
        params.set('from', customStart);
        params.set('to', customEnd);
      }
      if (targetDept && targetDept !== 'all') {
        params.set('dept', targetDept);
      }
      const url = `/reports/visualize?${params.toString()}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    [effectiveDepartmentFilter, timeRange, customStart, customEnd],
  );

  return {
    data,
    isLoading: loading,
    error,
    timeRange,
    setTimeRange,
    customStart,
    customEnd,
    setCustomDateRange,
    departmentFilter: effectiveDepartmentFilter,
    setDepartmentFilter,
    departments: scope.departments,
    canViewAllDepartments,
    selectedDepartmentName,
    periodLabelVi: periodMeta.labelVi,
    teamCards,
    staffMembers,
    burndown,
    heatmap: heatmapData.rows,
    heatmapColumnLabels: heatmapData.columnLabels,
    exportCSV,
    openVisualizeReport,
    refetch,
  };
};
