import { useMemo, useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspaceData } from './useWorkspaceData';
import { useSharedResource } from './useSharedResource';
import { workflowResource, workspaceScope } from '../services/workspaceResources';
import { isDone as isWorkflowDone } from '../lib/workflowHub';
import {reportDeliverableQuantity, reportPeriodTasks, reportTaskTotals} from '../lib/reportTaskTracking';
import { useRememberedState } from './useRememberedState';
import {
  isTaskClosed,
  reportAnalytics,
  taskActive,
  taskDay,
  taskDone,
  taskOpen,
  taskOverdue,
  type TrackedTask,
} from '../lib/taskTracking';
import { scopeTeamWorkload } from '../lib/workloadScope';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n/translations';
import type { AlertLevel, BurndownItem, HeatmapRow } from '../types/department';

export type TimeRange = 'today' | 'three' | 'week' | 'month' | 'quarter' | 'year' | 'custom' | 'all';

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
  entityKind: 'project' | 'campaign';
  entityName: string;
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

export interface TrackedTaskSummaryItem {
  id: string;
  title: string;
  assigneeName: string;
  projectTag: string;
  statusKind: 'done' | 'doing' | 'todo' | 'overdue';
  entityKind: 'project' | 'campaign';
  entityName: string;
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
  deliverableCount: number;
  completedDeliverables: number;
  profileBacklogCount: number;
  profileBacklogItems: ProfileBacklogItem[];
  periodTaskItems: TrackedTaskSummaryItem[];
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
  periodTaskItems: TrackedTaskSummaryItem[];

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
  openTaskItems: TrackedTaskSummaryItem[];

  // Card 5: Sản lượng hình ảnh / file (Deliverables Output)
  totalDeliverables: number;
  completedDeliverables: number;
  doingDeliverables: number;
  deliverableCompletionRate: number;
  deliverablesByDepartment: DeliverableDepartmentItem[];
  deliverablesByTrack: DeliverableTrackItem[];
  deliverableItems: DeliverableTaskSummaryItem[];
}

export interface DeliverableDepartmentItem {
  departmentName: string;
  total: number;
  completed: number;
  percentage: number;
}

export interface DeliverableTrackItem {
  id: string;
  name: string;
  kind: 'project' | 'campaign';
  total: number;
  completed: number;
  percentage: number;
}

export interface DeliverableTaskSummaryItem {
  id: string;
  title: string;
  quantity: number;
  targetDepartmentName: string;
  entityKind: 'project' | 'campaign';
  entityName: string;
  statusKind: 'done' | 'doing' | 'todo' | 'overdue';
}

const getInitial = (name: string) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};


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

  if (range === 'today') {
    const start = rawToday;
    const today = rawToday;
    const periodDays = 1;
    const currentRealDay = taskDay(new Date().toISOString());
    const labelVi =
      rawToday === currentRealDay
        ? lang === 'en'
          ? 'Today'
          : 'Hôm nay'
        : formatShortDate(rawToday);
    return { start, today, periodDays, labelVi };
  }

  if (range === 'three') {
    const start = rawToday;
    const endDate = new Date(`${rawToday}T12:00:00Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 2);
    const today = taskDay(endDate.toISOString());
    const periodDays = 3;
    const labelVi = lang === 'en' ? '3 Days' : '3 ngày';
    return { start, today, periodDays, labelVi };
  }

  if (range === 'week') {
    const cur = new Date(`${rawToday}T12:00:00Z`);
    const dayIndex = (cur.getUTCDay() + 6) % 7;
    const monday = new Date(cur);
    monday.setUTCDate(cur.getUTCDate() - dayIndex);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const start = taskDay(monday.toISOString());
    const today = taskDay(sunday.toISOString());
    const periodDays = 7;
    const labelVi = lang === 'en' ? '1 Week' : '1 tuần';
    return { start, today, periodDays, labelVi };
  }

  if (range === 'month') {
    const cur = new Date(`${rawToday}T12:00:00Z`);
    const firstDay = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), 1, 12));
    const lastDay = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 0, 12));
    const start = taskDay(firstDay.toISOString());
    const today = taskDay(lastDay.toISOString());
    const periodDays = lastDay.getUTCDate();
    const labelVi = lang === 'en' ? '1 Month' : '1 tháng';
    return { start, today, periodDays, labelVi };
  }

  if (range === 'quarter') {
    const cur = new Date(`${rawToday}T12:00:00Z`);
    const qStartMonth = Math.floor(cur.getUTCMonth() / 3) * 3;
    const firstDay = new Date(Date.UTC(cur.getUTCFullYear(), qStartMonth, 1, 12));
    const lastDay = new Date(Date.UTC(cur.getUTCFullYear(), qStartMonth + 3, 0, 12));
    const start = taskDay(firstDay.toISOString());
    const today = taskDay(lastDay.toISOString());
    const periodDays = Math.max(1, Math.round((lastDay.getTime() - firstDay.getTime()) / 86400000) + 1);
    const labelVi = lang === 'en' ? '1 Quarter' : '1 quý';
    return { start, today, periodDays, labelVi };
  }

  if (range === 'all') {
    const start = '2020-01-01';
    const today = '2099-12-31';
    const periodDays = 36500;
    const labelVi = lang === 'en' ? 'All' : 'Tất cả';
    return { start, today, periodDays, labelVi };
  }

  // range === 'year'
  const cur = new Date(`${rawToday}T12:00:00Z`);
  const firstDay = new Date(Date.UTC(cur.getUTCFullYear(), 0, 1, 12));
  const lastDay = new Date(Date.UTC(cur.getUTCFullYear(), 11, 31, 12));
  const start = taskDay(firstDay.toISOString());
  const today = taskDay(lastDay.toISOString());
  const periodDays = Math.max(1, Math.round((lastDay.getTime() - firstDay.getTime()) / 86400000) + 1);
  const labelVi = lang === 'en' ? '1 Year' : '1 năm';
  return { start, today, periodDays, labelVi };
}

const computeTaskDeliverableQty = reportDeliverableQuantity;

function formatDayMonth(iso: string): string {
  if (!iso || iso.length < 10) return iso;
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}`;
}

function computePeriodBurndown(
  tasks: TrackedTask[],
  range: TimeRange,
  now = new Date(),
  customStart?: string,
  customEnd?: string,
  lang: "vi" | "en" = "vi",
): BurndownItem[] {
  const activeList = tasks.filter((t) => taskActive(t));
  const totalTasks = Math.max(8, activeList.length);
  const openNow = activeList.filter((t) => !isTaskClosed(t.status)).length;
  const { start, today } = getPeriodBounds(range, now, customStart, customEnd, lang);
  const startMs = new Date(`${start}T12:00:00Z`).getTime();
  const endMs = new Date(`${today}T12:00:00Z`).getTime();

  let pointsMeta: Array<{ label: string; cutoffDate: string }> = [];

  if (range === "week") {
    const weekdayLabels =
      lang === "en"
        ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        : ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    pointsMeta = weekdayLabels.map((lbl, idx) => {
      const d = new Date(startMs + idx * 86400000);
      return {
        label: lbl,
        cutoffDate: d.toISOString().slice(0, 10),
      };
    });
  } else if (range === "three") {
    pointsMeta = Array.from({ length: 3 }, (_, idx) => {
      const d = new Date(startMs + idx * 86400000);
      const iso = d.toISOString().slice(0, 10);
      return {
        label: formatDayMonth(iso),
        cutoffDate: iso,
      };
    });
  } else if (range === "today") {
    const hours = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];
    pointsMeta = hours.map((h) => ({
      label: h,
      cutoffDate: today,
    }));
  } else if (range === "month") {
    const cur = new Date(`${start}T12:00:00Z`);
    const y = cur.getUTCFullYear();
    const m = cur.getUTCMonth();
    const lastDay = new Date(Date.UTC(y, m + 1, 0, 12)).getUTCDate();
    const mm = String(m + 1).padStart(2, "0");
    const dayMilestones = [1, 5, 9, 13, 17, 21, 25, lastDay];
    pointsMeta = dayMilestones.map((dayNum) => {
      const dd = String(dayNum).padStart(2, "0");
      return {
        label: `${dd}/${mm}`,
        cutoffDate: `${y}-${mm}-${dd}`,
      };
    });
  } else if (range === "quarter") {
    const cur = new Date(`${start}T12:00:00Z`);
    const y = cur.getUTCFullYear();
    const qStartMonth = Math.floor(cur.getUTCMonth() / 3) * 3;
    for (let mIdx = 0; mIdx < 3; mIdx++) {
      const mNum = qStartMonth + mIdx + 1;
      const mm = String(mNum).padStart(2, "0");
      const lastDay = new Date(Date.UTC(y, qStartMonth + mIdx + 1, 0, 12)).getUTCDate();
      pointsMeta.push({
        label: `01/${mm}`,
        cutoffDate: `${y}-${mm}-01`,
      });
      pointsMeta.push({
        label: `15/${mm}`,
        cutoffDate: `${y}-${mm}-15`,
      });
      if (mIdx === 2) {
        pointsMeta.push({
          label: `${String(lastDay).padStart(2, "0")}/${mm}`,
          cutoffDate: `${y}-${mm}-${String(lastDay).padStart(2, "0")}`,
        });
      }
    }
  } else if (range === "year") {
    const cur = new Date(`${start}T12:00:00Z`);
    const y = cur.getUTCFullYear();
    const monthNamesEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    pointsMeta = Array.from({ length: 12 }, (_, mIdx) => {
      const mm = String(mIdx + 1).padStart(2, "0");
      const lastDay = new Date(Date.UTC(y, mIdx + 1, 0, 12)).getUTCDate();
      return {
        label: lang === "en" ? monthNamesEn[mIdx] : `T${mIdx + 1}`,
        cutoffDate: `${y}-${mm}-${String(lastDay).padStart(2, "0")}`,
      };
    });
  } else {
    // custom or all
    const totalDays = Math.max(1, Math.round((endMs - startMs) / 86400000) + 1);
    const steps = Math.min(8, Math.max(2, totalDays));
    pointsMeta = Array.from({ length: steps }, (_, idx) => {
      const pointMs = steps === 1 ? startMs : startMs + Math.round(((endMs - startMs) * idx) / (steps - 1));
      const iso = new Date(pointMs).toISOString().slice(0, 10);
      return {
        label: formatDayMonth(iso),
        cutoffDate: iso,
      };
    });
  }

  const lastIdx = Math.max(1, pointsMeta.length - 1);
  return pointsMeta.map((pt, idx) => {
    const completedByCutoff = activeList.filter((t) => {
      if (!taskDone(t)) return false;
      const doneDay = taskDay(t.completed_at) || taskDay((t as any).updated_at) || taskDay(t.due_date);
      return doneDay ? doneDay <= pt.cutoffDate : idx === lastIdx;
    }).length;

    const actual = idx === lastIdx ? openNow : Math.max(openNow, totalTasks - completedByCutoff);
    const planned = Math.max(0, Math.round(totalTasks * (1 - (idx * 0.82) / lastIdx)));
    return {
      week: pt.label,
      label: pt.label,
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
  lang: "vi" | "en" = "vi",
  customStart?: string,
  customEnd?: string,
): { rows: HeatmapRow[]; columnLabels: string[] } {
  const { start, today } = getPeriodBounds(range, now, customStart, customEnd, lang);
  const startMs = new Date(`${start}T12:00:00Z`).getTime();
  const endMs = new Date(`${today}T12:00:00Z`).getTime();

  let checkpoints: Array<{ label: string; pointEnd: string }> = [];

  if (range === "week") {
    const weekdayLabels =
      lang === "en"
        ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        : ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    checkpoints = weekdayLabels.map((lbl, idx) => {
      const d = new Date(startMs + idx * 86400000);
      return {
        label: lbl,
        pointEnd: d.toISOString().slice(0, 10),
      };
    });
  } else if (range === "three") {
    checkpoints = Array.from({ length: 3 }, (_, idx) => {
      const d = new Date(startMs + idx * 86400000);
      const iso = d.toISOString().slice(0, 10);
      return {
        label: formatDayMonth(iso),
        pointEnd: iso,
      };
    });
  } else if (range === "today") {
    checkpoints = [
      { label: lang === "en" ? "Today" : `Hôm nay (${formatDayMonth(today)})`, pointEnd: today },
    ];
  } else if (range === "month") {
    const cur = new Date(`${start}T12:00:00Z`);
    const y = cur.getUTCFullYear();
    const m = cur.getUTCMonth();
    const mm = String(m + 1).padStart(2, "0");
    const lastDay = new Date(Date.UTC(y, m + 1, 0, 12)).getUTCDate();
    const endDays = [7, 14, 21, lastDay];
    const startDays = [1, 8, 15, 22];
    checkpoints = endDays.map((eDay, idx) => {
      const sDayStr = String(startDays[idx]).padStart(2, "0");
      const eDayStr = String(eDay).padStart(2, "0");
      return {
        label:
          lang === "en"
            ? `W${idx + 1} (${sDayStr}-${eDayStr}/${mm})`
            : `Tuần ${idx + 1} (${sDayStr}-${eDayStr}/${mm})`,
        pointEnd: `${y}-${mm}-${eDayStr}`,
      };
    });
  } else if (range === "quarter") {
    const cur = new Date(`${start}T12:00:00Z`);
    const y = cur.getUTCFullYear();
    const qStartMonth = Math.floor(cur.getUTCMonth() / 3) * 3;
    checkpoints = [0, 1, 2].map((mOffset) => {
      const mIndex = qStartMonth + mOffset;
      const mNum = mIndex + 1;
      const lastDay = new Date(Date.UTC(y, mIndex + 1, 0, 12)).getUTCDate();
      const mm = String(mNum).padStart(2, "0");
      return {
        label: lang === "en" ? `Month ${mNum}` : `Tháng ${mNum}`,
        pointEnd: `${y}-${mm}-${String(lastDay).padStart(2, "0")}`,
      };
    });
  } else if (range === "year") {
    const cur = new Date(`${start}T12:00:00Z`);
    const y = cur.getUTCFullYear();
    const qEndMonths = [2, 5, 8, 11];
    checkpoints = qEndMonths.map((mIndex, idx) => {
      const lastDay = new Date(Date.UTC(y, mIndex + 1, 0, 12)).getUTCDate();
      const mm = String(mIndex + 1).padStart(2, "0");
      return {
        label: lang === "en" ? `Q${idx + 1}` : `Quý ${idx + 1}`,
        pointEnd: `${y}-${mm}-${String(lastDay).padStart(2, "0")}`,
      };
    });
  } else {
    const spanMs = Math.max(86400000, endMs - startMs);
    checkpoints = [0, 1, 2, 3].map((idx) => {
      const ptMs = startMs + Math.round((spanMs * idx) / 3);
      const iso = new Date(ptMs).toISOString().slice(0, 10);
      return {
        label: formatDayMonth(iso),
        pointEnd: iso,
      };
    });
  }

  const rows: HeatmapRow[] = members.slice(0, 8).map((member) => {
    const memberTasks = scopedTasks.filter(
      (t) => String(t.assignee_id) === String(member.id) && taskActive(t),
    );
    const weeks = checkpoints.map((cp) => {
      const openAtPoint = memberTasks.filter((t) => {
        const createdDay = taskDay(t.created_at) || taskDay(t.start_date);
        if (createdDay && createdDay > cp.pointEnd) return false;
        if (!taskDone(t)) return true;
        const doneDay = taskDay(t.completed_at) || taskDay((t as any).updated_at);
        return Boolean(doneDay && doneDay > cp.pointEnd);
      }).length;
      const basePct = openAtPoint * 20;
      return Math.min(140, basePct);
    });

    return {
      id: member.id,
      name: member.name,
      avatar_url: member.avatar_url,
      weeks,
    };
  });

  return {
    rows,
    columnLabels: checkpoints.map((cp) => cp.label),
  };
}

export const REPORT_SNAPSHOT_STORAGE_KEY = "kcoffee.report.snapshot.v2";

export interface ReportSnapshotPayload {
  scopeKey: string;
  savedAt: string;
  timeRange: TimeRange;
  cursorDate: string;
  customStart: string;
  customEnd: string;
  departmentFilter: string;
  selectedDepartmentName: string;
  periodMeta: { start: string; today: string; periodDays: number; labelVi: string };
  teamCards: TeamReportCardsData;
  staffMembers: StaffReportMember[];
  burndown: BurndownItem[];
  heatmap: HeatmapRow[];
  heatmapColumnLabels: string[];
}

export const useReports = (options?: { standalone?: boolean }) => {
  const isStandalone = Boolean(options?.standalone);
  const { t, lang } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rememberedRange, setRememberedRange] = useRememberedState<TimeRange>('reports.timeRange', 'month');
  const [rememberedDept, setRememberedDept] = useRememberedState<string>('reports.departmentFilter', 'all');
  const defaultToday = taskDay(new Date().toISOString());
  const defaultMonthStart = `${defaultToday.slice(0, 8)}01`;
  const [rememberedCustomStart, setRememberedCustomStart] = useRememberedState<string>('reports.customStart', defaultMonthStart);
  const [rememberedCustomEnd, setRememberedCustomEnd] = useRememberedState<string>('reports.customEnd', defaultToday);
  const [cursorDate, setCursorDate] = useState<string>(() => searchParams.get('at') || defaultToday);

  const urlPeriod = searchParams.get('period') as TimeRange | null;
  const urlDept = searchParams.get('dept');
  const urlFrom = searchParams.get('from');
  const urlTo = searchParams.get('to');

  const validPeriods: TimeRange[] = ['today', 'three', 'week', 'month', 'quarter', 'year', 'custom', 'all'];
  const normalizedRemembered: TimeRange = validPeriods.includes(rememberedRange) ? rememberedRange : 'month';
  const timeRange: TimeRange = urlPeriod && validPeriods.includes(urlPeriod) ? urlPeriod : normalizedRemembered;
  const customStart = urlFrom || rememberedCustomStart || defaultMonthStart;
  const customEnd = urlTo || rememberedCustomEnd || defaultToday;
  const rawDepartmentFilter = urlDept || rememberedDept || 'all';

  const setTimeRange = useCallback(
    (nextRange: TimeRange) => {
      const normalized: TimeRange = validPeriods.includes(nextRange) ? nextRange : 'month';
      setRememberedRange(normalized);
      setCursorDate(defaultToday);
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
    [defaultToday, setRememberedRange, setSearchParams],
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

  const shiftPeriod = useCallback(
    (direction: -1 | 1) => {
      const cur = new Date(`${cursorDate || defaultToday}T12:00:00Z`);
      if (timeRange === 'today') {
        cur.setUTCDate(cur.getUTCDate() + direction * 1);
        setCursorDate(taskDay(cur.toISOString()));
      } else if (timeRange === 'three') {
        cur.setUTCDate(cur.getUTCDate() + direction * 3);
        setCursorDate(taskDay(cur.toISOString()));
      } else if (timeRange === 'week') {
        cur.setUTCDate(cur.getUTCDate() + direction * 7);
        setCursorDate(taskDay(cur.toISOString()));
      } else if (timeRange === 'month') {
        cur.setUTCMonth(cur.getUTCMonth() + direction, 1);
        setCursorDate(taskDay(cur.toISOString()));
      } else if (timeRange === 'quarter') {
        cur.setUTCMonth(cur.getUTCMonth() + direction * 3, 1);
        setCursorDate(taskDay(cur.toISOString()));
      } else if (timeRange === 'year') {
        cur.setUTCFullYear(cur.getUTCFullYear() + direction, 0, 1);
        setCursorDate(taskDay(cur.toISOString()));
      } else if (timeRange === 'custom' && customStart && customEnd) {
        const s = new Date(`${customStart}T12:00:00Z`);
        const e = new Date(`${customEnd}T12:00:00Z`);
        const diffDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
        s.setUTCDate(s.getUTCDate() + direction * diffDays);
        e.setUTCDate(e.getUTCDate() + direction * diffDays);
        const nextS = taskDay(s.toISOString());
        const nextE = taskDay(e.toISOString());
        setCustomDateRange(nextS, nextE);
        setCursorDate(nextS);
      }
    },
    [cursorDate, defaultToday, timeRange, customStart, customEnd, setCustomDateRange],
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

  const effectiveProfile = useMemo(
    () =>
      isStandalone
        ? profile
          ? { ...profile, role: "admin" as const }
          : { id: "public-viewer", role: "admin" as const, department_id: null, department_name: null }
        : profile,
    [isStandalone, profile],
  );

  const scope = useMemo(
    () => scopeTeamWorkload(effectiveProfile, rawDepartmentFilter, users, departments, workspaceTasks),
    [effectiveProfile, rawDepartmentFilter, users, departments, workspaceTasks],
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
    () =>
      getPeriodBounds(
        timeRange,
        new Date(`${cursorDate || defaultToday}T12:00:00Z`),
        customStart,
        customEnd,
        lang,
      ),
    [timeRange, cursorDate, defaultToday, customStart, customEnd, lang],
  );

  // Filter tasks relevant to the chosen period (week / month / quarter / year)
  const periodTasks = useMemo(() => {
    const { start, today } = periodMeta;
    return reportPeriodTasks(scopedTasks, start, today, timeRange === 'all');
  }, [scopedTasks, periodMeta, timeRange]);

  const analyticRange =
    timeRange === 'today' || timeRange === 'three'
      ? 'week'
      : timeRange === 'custom'
      ? 'month'
      : timeRange;
  const data = useMemo(
    () =>
      reportAnalytics(
        scopedTasks,
        analyticRange as any,
        new Date(`${cursorDate || defaultToday}T12:00:00Z`),
      ),
    [scopedTasks, analyticRange, cursorDate, defaultToday],
  );

  // Build Staff Performance list (shared 1:1 between List Mode and Staff Cards Mode)
  const staffMembers = useMemo<StaffReportMember[]>(() => {
    const today = periodMeta.today;

    return scopedUsers
      .map((u) => {
        const memberAllTasks = periodTasks.filter(
          (t) => String(t.assignee_id) === String(u.id) && taskActive(t),
        );
        const openList = memberAllTasks.filter((t) => taskOpen(t));
        const doneList = memberAllTasks.filter((t) => taskDone(t));
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
        const deliverableCount = memberAllTasks.reduce((sum, t) => sum + computeTaskDeliverableQty(t), 0);
        const completedDeliverables = doneList.reduce((sum, t) => sum + computeTaskDeliverableQty(t), 0);

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

        const staffAvatarUrl =
          u.avatar_url ||
          (String(u.id) === String(profile?.id) ? profile?.avatar_url : null) ||
          workspaceTasks.find((t) => String(t.assignee_id) === String(u.id) && t.assignee?.avatar_url)?.assignee?.avatar_url ||
          null;

        const deptName = u.department?.name || selectedDepartmentName;
        const initial = getInitial(u.name);

        const realBacklogTasks = memberAllTasks.filter(
          (t) => taskOpen(t) && (taskOverdue(t, today) || (t.status || '').toLowerCase() === 'backlog'),
        );

        const profileBacklogItems: ProfileBacklogItem[] = realBacklogTasks.map((t, bIdx) => {
          const isOverdue = taskOverdue(t, today);
          const reason = t.due_date
            ? isOverdue
              ? lang === 'en'
                ? `Overdue since ${formatShortDate(t.due_date)}`
                : `Quá hạn từ ${formatShortDate(t.due_date)}`
              : lang === 'en'
              ? `Due ${formatShortDate(t.due_date)}`
              : `Hạn chót ${formatShortDate(t.due_date)}`
            : lang === 'en'
            ? 'Backlog item'
            : 'Công việc tồn đọng';

          const reportedAt = t.updated_at
            ? formatShortDate(taskDay(t.updated_at))
            : t.created_at
            ? formatShortDate(taskDay(t.created_at))
            : lang === 'en'
            ? 'Recent'
            : 'Gần đây';

          const hasCampaign = Boolean(
            (t as any).campaign?.id || (t as any).campaign_id || (t as any).campaign,
          );
          const entityKind: 'project' | 'campaign' = hasCampaign ? 'campaign' : 'project';
          const entityName =
            (t as any).campaign?.name ||
            (t as any).project?.name ||
            deptName ||
            '';
          const projectTag =
            (t as any).project?.name ||
            (t as any).campaign?.name ||
            deptName ||
            '';

          return {
            id: `prof-backlog-${u.id}-${t.id || bIdx}`,
            title: t.title || (lang === 'en' ? 'Task' : 'Công việc'),
            staffId: String(u.id),
            staffName: u.name,
            staffInitial: initial,
            departmentName: deptName,
            reason,
            reportedAt,
            severity: isOverdue ? 'high' : 'medium',
            projectTag,
            entityKind,
            entityName,
          };
        });
        const profileBacklogCount = profileBacklogItems.length;

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

        const periodTaskItems: TrackedTaskSummaryItem[] = memberAllTasks
          .map((t) => {
            const isDone = taskDone(t);
            const isOverdue = !isDone && taskOverdue(t, periodMeta.today);
            const isTodo =
              !isDone &&
              !isOverdue &&
              ['todo', 'backlog', 'planned'].includes((t.status || '').toLowerCase());
            const statusKind: 'done' | 'doing' | 'todo' | 'overdue' = isDone
              ? 'done'
              : isOverdue
              ? 'overdue'
              : isTodo
              ? 'todo'
              : 'doing';

            const hasCampaign = Boolean(
              (t as any).campaign?.id || (t as any).campaign_id || (t as any).campaign,
            );
            const entityKind: 'project' | 'campaign' = hasCampaign ? 'campaign' : 'project';
            const entityName =
              (t as any).campaign?.name ||
              (t as any).project?.name ||
              deptName ||
              '';

            return {
              id: String(t.id),
              title: t.title || (lang === 'en' ? 'Task' : 'Công việc'),
              assigneeName: u.name,
              projectTag: (t as any).project?.name || (t as any).campaign?.name || deptName || 'General',
              statusKind,
              entityKind,
              entityName,
            };
          })
          .sort((a, b) => {
            if (a.statusKind === 'done' && b.statusKind !== 'done') return -1;
            if (a.statusKind !== 'done' && b.statusKind === 'done') return 1;
            return 0;
          });

        return {
          id: String(u.id),
          name: u.name,
          initial,
          role: roleLabel,
          avatar_url: staffAvatarUrl,
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
          deliverableCount,
          completedDeliverables,
          profileBacklogCount,
          profileBacklogItems,
          periodTaskItems,
          tasks: memberAllTasks,
        };
      })
      .sort((a, b) => {
        const getRank = (m: { name: string; role?: string }): number => {
          const normName = (m.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (normName.includes('thai dang') || (normName.includes('thai') && normName.includes('dang'))) return 0;
          const normRole = (m.role || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (
            normRole.includes('lead') ||
            normRole.includes('truong') ||
            normRole.includes('quan ly') ||
            normRole.includes('manager') ||
            normRole.includes('director') ||
            normRole.includes('giam doc')
          ) {
            return 1;
          }
          return 2;
        };
        const rankA = getRank(a);
        const rankB = getRank(b);
        if (rankA !== rankB) return rankA - rankB;
        return b.total - a.total || b.capacityPercentage - a.capacityPercentage || a.name.localeCompare(b.name, 'vi');
      });
  }, [scopedUsers, periodTasks, periodMeta.today, timeRange, selectedDepartmentName, lang, profile, workspaceTasks]);

  // Build 4 Team Performance Cards (100% consistent with staffMembers & periodTasks)
  const teamCards = useMemo<TeamReportCardsData>(() => {
    const today = periodMeta.today;
    const totals = reportTaskTotals(periodTasks);
    const completedTasks = totals.completedTasks;
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
    const totalTasks = totals.totalTasks;
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
    const backlogDelta =
      staffWithBacklogCount > 0
        ? lang === 'en'
          ? `${staffWithBacklogCount} staff reported from Profile Tab`
          : `${staffWithBacklogCount} nhân sự báo cáo từ Tab Profile`
        : lang === 'en'
        ? 'No backlog reported'
        : 'Không có tồn đọng';

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
      const tDone = entry.tasks.filter((t) => taskDone(t)).length;
      const tLate = entry.tasks.filter((t) => taskOverdue(t, today)).length;
      const progress = entry.tasks.length > 0 ? Math.round((tDone / tTotal) * 100) : 0;
      const status: AlertLevel = tLate > 1 ? 'late' : tLate === 1 ? 'risk' : 'ok';
      return {
        id: entry.id,
        name: entry.name,
        kind: entry.kind,
        completedTasks: tDone,
        totalTasks: entry.tasks.length,
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
    const inProgressSub =
      lang === 'en'
        ? `+${todoTasks} pending · ${overdueTasks} overdue`
        : `+${todoTasks} chờ thực hiện · ${overdueTasks} quá hạn`;

    // Task items lists for full-box expanded views
    const sourceTasks = periodTasks;
    const periodTaskItems: TrackedTaskSummaryItem[] = sourceTasks
      .map((t) => {
        const isDone = taskDone(t);
        const isOverdue = !isDone && taskOverdue(t, today);
        const isTodo =
          !isDone &&
          !isOverdue &&
          ['todo', 'backlog', 'planned'].includes((t.status || '').toLowerCase());
        const statusKind: 'done' | 'doing' | 'todo' | 'overdue' = isDone
          ? 'done'
          : isOverdue
          ? 'overdue'
          : isTodo
          ? 'todo'
          : 'doing';

        const hasCampaign = Boolean(
          (t as any).campaign?.id || (t as any).campaign_id || (t as any).campaign,
        );
        const entityKind: 'project' | 'campaign' = hasCampaign ? 'campaign' : 'project';
        const entityName =
          (t as any).campaign?.name ||
          (t as any).project?.name ||
          (entityKind === 'campaign'
            ? lang === 'en'
              ? 'Campaign'
              : 'Chiến dịch'
            : lang === 'en'
            ? 'Project'
            : 'Dự án');

        return {
          id: String(t.id),
          title: t.title || (lang === 'en' ? 'Task' : 'Công việc'),
          assigneeName: t.assignee?.name || (lang === 'en' ? 'Unassigned' : 'Chưa phân công'),
          projectTag: (t as any).project?.name || (t as any).campaign?.name || 'General',
          statusKind,
          entityKind,
          entityName,
        };
      })
      .sort((a, b) => {
        if (a.statusKind === 'done' && b.statusKind !== 'done') return -1;
        if (a.statusKind !== 'done' && b.statusKind === 'done') return 1;
        return 0;
      });
    const openTaskItems = periodTaskItems.filter((item) => item.statusKind !== 'done');

    // Card 5: Deliverables Output (Sản lượng hình ảnh / file)
    const {totalDeliverables, completedDeliverables, remainingDeliverables: doingDeliverables} = totals;

    const deptDeliverableMap = new Map<string, { total: number; completed: number }>();
    const trackDeliverableMap = new Map<string, { id: string; name: string; kind: 'project' | 'campaign'; total: number; completed: number }>();
    const deliverableItems: DeliverableTaskSummaryItem[] = [];

    periodTasks.forEach((t) => {
      const isDone = taskDone(t);
      const isOverdue = !isDone && taskOverdue(t, today);
      const isTodo = !isDone && !isOverdue && ['todo', 'backlog', 'planned'].includes((t.status || '').toLowerCase());
      const statusKind: 'done' | 'doing' | 'todo' | 'overdue' = isDone ? 'done' : isOverdue ? 'overdue' : isTodo ? 'todo' : 'doing';

      const q = computeTaskDeliverableQty(t);

      const targetDept = ((t as any).target_department_name || (t as any).target_department?.name || t.department?.name || 'Nội bộ').trim();
      const currentDept = deptDeliverableMap.get(targetDept) || { total: 0, completed: 0 };
      currentDept.total += q;
      if (isDone) currentDept.completed += q;
      deptDeliverableMap.set(targetDept, currentDept);

      const hasCamp = Boolean((t as any).campaign?.id || (t as any).campaign_id || (t as any).campaign);
      const trackKind: 'project' | 'campaign' = hasCamp ? 'campaign' : 'project';
      const trackId = String((t as any).campaign?.id || (t as any).campaign_id || (t as any).project?.id || (t as any).project_id || 'unlinked');
      const trackName = (t as any).campaign?.name || (t as any).project?.name || (trackKind === 'campaign' ? (lang === 'en' ? 'Campaign' : 'Chiến dịch') : (lang === 'en' ? 'Project' : 'Dự án'));
      const trackKey = `${trackKind}-${trackId}`;

      const currentTrack = trackDeliverableMap.get(trackKey) || { id: trackId, name: trackName, kind: trackKind, total: 0, completed: 0 };
      currentTrack.total += q;
      if (isDone) currentTrack.completed += q;
      trackDeliverableMap.set(trackKey, currentTrack);

      deliverableItems.push({
        id: String(t.id),
        title: t.title || (lang === 'en' ? 'Task' : 'Công việc'),
        quantity: q,
        targetDepartmentName: targetDept,
        entityKind: trackKind,
        entityName: trackName,
        statusKind,
      });
    });

    const deliverableCompletionRate = totalDeliverables > 0
      ? Math.round((completedDeliverables / totalDeliverables) * 100)
      : 0;

    const deliverablesByDepartment: DeliverableDepartmentItem[] = [...deptDeliverableMap.entries()]
      .map(([departmentName, stats]) => ({
        departmentName,
        total: stats.total,
        completed: stats.completed,
        percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const deliverablesByTrack: DeliverableTrackItem[] = [...trackDeliverableMap.values()]
      .map((stats) => ({
        ...stats,
        percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      totalTasks,
      completedTasks,
      completionRate,
      fractionLabel: `${completedTasks} / ${totalTasks}`,
      completionDelta,
      completionIsPositive,
      periodTaskItems,
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
      openTaskItems,
      totalDeliverables,
      completedDeliverables,
      doingDeliverables,
      deliverableCompletionRate,
      deliverablesByDepartment,
      deliverablesByTrack,
      deliverableItems,
    };
  }, [
    periodMeta.today,
    periodTasks,
    data.kpis.tasksCompletedPrev,
    staffMembers,
    workspaceProjects,
    workspaceCampaigns,
    effectiveDepartmentFilter,
    scopedTasks,
    lang,
    t,
  ]);

  const burndown = useMemo(
    () =>
      computePeriodBurndown(
        scopedTasks,
        timeRange,
        new Date(`${cursorDate || defaultToday}T12:00:00Z`),
        customStart,
        customEnd,
        lang,
      ),
    [scopedTasks, timeRange, cursorDate, defaultToday, customStart, customEnd, lang],
  );

  const heatmapData = useMemo(
    () =>
      computePeriodHeatmap(
        staffMembers,
        scopedTasks,
        timeRange,
        new Date(`${cursorDate || defaultToday}T12:00:00Z`),
        lang,
        customStart,
        customEnd,
      ),
    [staffMembers, scopedTasks, timeRange, cursorDate, defaultToday, lang, customStart, customEnd],
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

  const storedSnapshot = useMemo<ReportSnapshotPayload | null>(() => {
    if (!isStandalone || typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(REPORT_SNAPSHOT_STORAGE_KEY);
      if (!raw) return null;
      const snapshot = JSON.parse(raw) as ReportSnapshotPayload;
      return profile && snapshot.scopeKey === workspaceScope()
        && snapshot.departmentFilter === effectiveDepartmentFilter
        && snapshot.timeRange === timeRange && snapshot.cursorDate === cursorDate
        && snapshot.customStart === customStart && snapshot.customEnd === customEnd
        ? snapshot : null;
    } catch {
      return null;
    }
  }, [isStandalone, profile, effectiveDepartmentFilter, timeRange, cursorDate, customStart, customEnd]);

  const useSnapshotFallback = Boolean(
    isStandalone &&
      storedSnapshot &&
      workspaceTasks.length === 0 &&
      users.length === 0,
  );

  const finalSelectedDepartmentName = useSnapshotFallback && storedSnapshot?.selectedDepartmentName
    ? storedSnapshot.selectedDepartmentName
    : selectedDepartmentName;
  const finalPeriodMeta = useSnapshotFallback && storedSnapshot?.periodMeta
    ? storedSnapshot.periodMeta
    : periodMeta;
  const finalTeamCards = useSnapshotFallback && storedSnapshot?.teamCards
    ? storedSnapshot.teamCards
    : teamCards;
  const finalStaffMembers = useSnapshotFallback && storedSnapshot?.staffMembers
    ? storedSnapshot.staffMembers
    : staffMembers;
  const finalBurndown = useSnapshotFallback && storedSnapshot?.burndown
    ? storedSnapshot.burndown
    : burndown;
  const finalHeatmap = useSnapshotFallback && storedSnapshot?.heatmap
    ? storedSnapshot.heatmap
    : heatmapData.rows;
  const finalHeatmapLabels = useSnapshotFallback && storedSnapshot?.heatmapColumnLabels
    ? storedSnapshot.heatmapColumnLabels
    : heatmapData.columnLabels;

  const openVisualizeReport = useCallback(
    (customDept?: string, customPeriod?: TimeRange) => {
      const targetDept = customDept ?? effectiveDepartmentFilter;
      const targetPeriod = customPeriod ?? timeRange;
      const params = new URLSearchParams();
      const pVal = validPeriods.includes(targetPeriod) ? targetPeriod : "month";
      params.set("period", pVal);
      if (cursorDate) {
        params.set("at", cursorDate);
      }
      if (pVal === "custom") {
        params.set("from", customStart);
        params.set("to", customEnd);
      }
      if (targetDept && targetDept !== "all") {
        params.set("dept", targetDept);
      }
      if (typeof window !== "undefined") {
        try {
          const payload: ReportSnapshotPayload = {
            scopeKey: workspaceScope(),
            savedAt: new Date().toISOString(),
            timeRange: pVal,
            cursorDate,
            customStart,
            customEnd,
            departmentFilter: targetDept,
            selectedDepartmentName,
            periodMeta,
            teamCards,
            staffMembers,
            burndown,
            heatmap: heatmapData.rows,
            heatmapColumnLabels: heatmapData.columnLabels,
          };
          window.localStorage.setItem(REPORT_SNAPSHOT_STORAGE_KEY, JSON.stringify(payload));
        } catch {
          // ignore storage quota errors
        }
      }
      const url = `/reports/visualize?${params.toString()}`;
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [
      effectiveDepartmentFilter,
      timeRange,
      cursorDate,
      customStart,
      customEnd,
      selectedDepartmentName,
      periodMeta,
      teamCards,
      staffMembers,
      burndown,
      heatmapData,
    ],
  );

  return {
    data,
    isLoading: loading,
    error,
    timeRange,
    setTimeRange,
    cursorDate,
    setCursorDate,
    shiftPeriod,
    customStart,
    customEnd,
    setCustomDateRange,
    departmentFilter: effectiveDepartmentFilter,
    setDepartmentFilter,
    departments: scope.departments,
    canViewAllDepartments,
    selectedDepartmentName: finalSelectedDepartmentName,
    periodMeta: finalPeriodMeta,
    periodLabelVi: finalPeriodMeta.labelVi,
    teamCards: finalTeamCards,
    staffMembers: finalStaffMembers,
    burndown: finalBurndown,
    heatmap: finalHeatmap,
    heatmapColumnLabels: finalHeatmapLabels,
    exportCSV,
    openVisualizeReport,
    refetch,
  };
};
