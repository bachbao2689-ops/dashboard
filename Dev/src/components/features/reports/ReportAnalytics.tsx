import './ReportProfiles.css';
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useReports } from '../../../hooks/useReports';
import type { TimeRange, StaffReportMember } from '../../../hooks/useReports';
import { useTranslation } from '../../../i18n/translations';
import { FilterPopover } from '../../common/filters/FilterPopover';
import { DashboardAllocationChart } from '../dashboard/DashboardAllocationChart';
import { useUiStore } from '../../../store/uiStore';
import { taskDay, taskOpen, taskDone } from '../../../lib/taskTracking';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  ArrowLeft,
  ExternalLink,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  BarChart3,
  LayoutGrid,
  X,
  Building2,
  ShieldAlert,
  ChevronDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Info,
  Printer,
  ClipboardList,
} from 'lucide-react';

type StaffTrackFilter = 'all' | 'project' | 'campaign';
const staffTaskTrack = (task: any) =>
  task.project?.id || task.project_id ? 'project' : task.campaign?.id || task.campaign_id ? 'campaign' : null;
const staffTrackCount = (tasks: any[], kind: 'project' | 'campaign') =>
  new Set(tasks.filter(task => staffTaskTrack(task) === kind).map(task => String(task[kind]?.id || task[`${kind}_id`]))).size;

/** Portrait/glass composition from the Figma “Right” reference; report data stays live. */
export function ReportProfileCard({
  member,
  lang,
  expanded = false,
  isCenter = false,
  isCoverflowActive = false,
  onDetails,
}: {
  member: StaffReportMember;
  lang: 'vi' | 'en';
  expanded?: boolean;
  isCenter?: boolean;
  isCoverflowActive?: boolean;
  onDetails: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [member.avatar_url]);
  const hasImage = Boolean(member.avatar_url) && !imageFailed;
  const isCoverflow = isCenter || isCoverflowActive;
  const doneTooltip = lang === 'en'
    ? `Completed: ${member.done} tasks (${member.completionPct}%)`
    : `Hoàn thành: ${member.done} việc (${member.completionPct}%)`;
  const lateTooltip = lang === 'en'
    ? `Overdue: ${member.late} tasks`
    : `Quá hạn: ${member.late} việc`;
  const backlogTooltip = lang === 'en'
    ? `Backlog: ${member.profileBacklogCount} tasks`
    : `Tồn đọng: ${member.profileBacklogCount} việc`;
  const totalTasksTooltip = lang === 'en'
    ? `Total tasks: ${member.tasks.length}`
    : `Tổng task: ${member.tasks.length} việc`;
  const deliverablesTooltip = lang === 'en'
    ? `Total deliverables: ${member.deliverableCount} files/images`
    : `Tổng sản lượng: ${member.deliverableCount} hình/file`;

  return (
    <article
      data-staff-id={member.id}
      className={`report-profile${hasImage ? '' : ' report-profile--initials'}${isCoverflow ? ' report-profile--coverflow-active' : ''}`}
      aria-label={member.name}
    >
        <div className="report-profile-surface">
        {hasImage ? (
          <img className="report-profile-portrait" src={member.avatar_url!} alt={member.name}
            loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <div className="report-profile-fallback" aria-hidden="true"><span>{member.initial}</span></div>
        )}
        <div className="report-profile-glass" aria-hidden="true" />
        <div className="report-profile-content">
          <div className="report-profile-identity">
            <h3>{member.name}</h3>
            <p>{member.role}</p>
          </div>

          {/* Performance Status Labels: only icon & number, hover for details */}
          <div className="report-profile-perf-row" aria-label={lang === 'en' ? 'Performance status' : 'Trạng thái hiệu suất'}>
            <span
              className="report-profile-badge report-profile-badge--done"
              title={doneTooltip}
              aria-label={doneTooltip}
              data-profile-tooltip={doneTooltip}
              data-profile-tooltip-pos="left"
            >
              <CheckCircle2 size={12} aria-hidden="true" />
              <strong>{member.done}</strong>
            </span>
            {member.late > 0 && (
              <span
                className="report-profile-badge report-profile-badge--late"
                title={lateTooltip}
                aria-label={lateTooltip}
                data-profile-tooltip={lateTooltip}
              >
                <Clock size={12} aria-hidden="true" />
                <strong>{member.late}</strong>
              </span>
            )}
            {member.profileBacklogCount > 0 && (
              <span
                className="report-profile-badge report-profile-badge--backlog"
                title={backlogTooltip}
                aria-label={backlogTooltip}
                data-profile-tooltip={backlogTooltip}
              >
                <AlertTriangle size={12} aria-hidden="true" />
                <strong>{member.profileBacklogCount}</strong>
              </span>
            )}
          </div>

          <div className="report-profile-footer">
            <div className="report-profile-counters">
              <span
                className="report-profile-pill report-profile-pill--task"
                title={totalTasksTooltip}
                aria-label={totalTasksTooltip}
                data-profile-tooltip={totalTasksTooltip}
                data-profile-tooltip-pos="left"
              >
                <ClipboardList size={12} aria-hidden="true" />
                <strong>{member.tasks?.length || 0}</strong>
              </span>
              <span
                className="report-profile-pill report-profile-pill--output"
                title={deliverablesTooltip}
                aria-label={deliverablesTooltip}
                data-profile-tooltip={deliverablesTooltip}
              >
                <ImagePlus size={12} aria-hidden="true" />
                <strong>{member.deliverableCount || 0}</strong>
              </span>
            </div>
            <button
              type="button"
              className="report-profile-cta"
              aria-expanded={expanded}
              aria-label={`${expanded ? (lang === 'en' ? 'Close details' : 'Đóng chi tiết') : (lang === 'en' ? 'View details' : 'Xem chi tiết')}: ${member.name}`}
              onClick={onDetails}
            >
              {expanded ? (lang === 'en' ? 'Close' : 'Đóng') : (lang === 'en' ? 'Details' : 'Chi tiết')}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

interface ReportAnalyticsProps {
  standalone?: boolean;
}

export const ReportAnalytics: React.FC<ReportAnalyticsProps> = ({ standalone = false }) => {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const {
    isLoading,
    error,
    refetch,
    timeRange,
    setTimeRange,
    cursorDate,
    setCursorDate,
    shiftPeriod,
    customStart,
    customEnd,
    setCustomDateRange,
    departmentFilter,
    setDepartmentFilter,
    departments,
    canViewAllDepartments,
    scopedTasks,
    selectedDepartmentName,
    periodMeta,
    periodLabelVi,
    teamCards,
    staffMembers,
    heatmap,
    heatmapColumnLabels,
    exportCSV,
    openVisualizeReport,
  } = useReports({ standalone });

  const [staffView, setStaffView] = useState<'list' | 'cards'>('cards');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [staffDetailTab, setStaffDetailTab] = useState<'all' | 'project' | 'campaign' | 'done' | 'late' | 'backlog'>('all');
  const expandedModalRef = useRef<HTMLDivElement>(null);
  const [staffStatusFilter, setStaffStatusFilter] = useState<'all' | 'done' | 'doing' | 'todo' | 'late'>('all');
  const [staffTrackFilter, setStaffTrackFilter] = useState<StaffTrackFilter>('all');
  const [activeExpandedId, setActiveExpandedId] = useState<string | null>(null);
  const profileScrollRef = useRef<HTMLDivElement>(null);
  const [mobileActiveBtn, setMobileActiveBtn] = useState<'dept' | 'calendar' | 'export' | null>(null);
  const headerToolbarRef = useRef<HTMLDivElement>(null);

  // Collapse mobile active toolbar button on outside click
  useEffect(() => {
    const handleToolbarOutside = (e: MouseEvent | TouchEvent) => {
      if (headerToolbarRef.current && !headerToolbarRef.current.contains(e.target as Node)) {
        if (typeof window !== 'undefined' && window.innerWidth < 640) {
          setMobileActiveBtn(null);
        }
      }
    };
    document.addEventListener('mousedown', handleToolbarOutside);
    document.addEventListener('touchstart', handleToolbarOutside);
    return () => {
      document.removeEventListener('mousedown', handleToolbarOutside);
      document.removeEventListener('touchstart', handleToolbarOutside);
    };
  }, []);

  // Track centered staff profile card on mobile 1-row carousel coverflow without triggering React re-renders
  const handleProfileScroll = useCallback(() => {
    const container = profileScrollRef.current;
    if (!container || typeof window === 'undefined' || window.innerWidth >= 640) return;
    const containerCenter = container.scrollLeft + container.clientWidth / 2;
    const cards = container.querySelectorAll<HTMLElement>('.report-profile');
    if (cards.length === 0) return;
    let closestCard: HTMLElement | null = null;
    let minDiff = Infinity;
    cards.forEach((card) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const diff = Math.abs(cardCenter - containerCenter);
      if (diff < minDiff) {
        minDiff = diff;
        closestCard = card;
      }
    });
    cards.forEach((card) => {
      const isCenter = card === closestCard;
      if (isCenter) {
        if (!card.classList.contains('report-profile--coverflow-active')) {
          card.classList.add('report-profile--coverflow-active');
          card.classList.add('is-carousel-center');
        }
      } else {
        if (card.classList.contains('report-profile--coverflow-active')) {
          card.classList.remove('report-profile--coverflow-active');
          card.classList.remove('is-carousel-center');
        }
      }
    });
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      handleProfileScroll();
    }
  }, [handleProfileScroll, staffMembers]);
  const [showBurndownInfo, setShowBurndownInfo] = useState(false);


  const isDark = useUiStore((state) => state.theme) === 'dark';
  const toYmd = (d: Date) =>
    [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  const allocationRangeStart = periodMeta.start;
  const allocationRangeEnd = periodMeta.today;

  const allocationChartData = useMemo(() => {
    if (!allocationRangeStart || !allocationRangeEnd || allocationRangeStart > allocationRangeEnd) return [];
    const start = new Date(`${allocationRangeStart}T00:00:00`);
    const end = new Date(`${allocationRangeEnd}T00:00:00`);
    const days: Array<{ name: string; created: number; doing: number; done: number }> = [];
    const dayKey = (value?: string | null) => (value ? value.slice(0, 10) : '');

    for (let cursor = new Date(start); cursor <= end && days.length < 32; cursor.setDate(cursor.getDate() + 1)) {
      const key = toYmd(cursor);
      const dayLabel = `${String(cursor.getDate()).padStart(2, '0')}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      days.push({
        name: dayLabel,
        created: (scopedTasks || []).filter((task: any) => dayKey(task.created_at) === key).length,
        doing: (scopedTasks || []).filter(
          (task: any) => taskOpen(task) && (task.status || '').toLowerCase() !== 'todo' && dayKey(task.updated_at || task.created_at) === key,
        ).length,
        done: (scopedTasks || []).filter((task: any) => taskDone(task) && dayKey(task.completed_at) === key).length,
      });
    }
    return days;
  }, [allocationRangeStart, allocationRangeEnd, scopedTasks]);
  const [showCapacityInfo, setShowCapacityInfo] = useState(false);
  // Ensure standalone mode is fully scrollable
  useEffect(() => {
    if (!standalone) return;
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
    const root = document.getElementById("root");
    if (root) {
      root.style.overflow = "auto";
      root.style.height = "auto";
      root.style.minHeight = "100%";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      if (root) {
        root.style.overflow = "";
        root.style.height = "";
        root.style.minHeight = "";
      }
    };
  }, [standalone]);

  // Tự động cân giữa màn hình khi mở popup detail
  useEffect(() => {
    if (selectedStaffId && expandedModalRef.current) {
      expandedModalRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
    setStaffDetailTab('all');
  }, [selectedStaffId]);

  const currentStaffIndex = useMemo(() => {
    if (!selectedStaffId) return -1;
    return staffMembers.findIndex((m) => m.id === selectedStaffId);
  }, [staffMembers, selectedStaffId]);

  const handlePrevStaff = useCallback(() => {
    if (staffMembers.length === 0) return;
    const newIdx = (currentStaffIndex - 1 + staffMembers.length) % staffMembers.length;
    setSelectedStaffId(staffMembers[newIdx].id);
  }, [currentStaffIndex, staffMembers]);

  const handleNextStaff = useCallback(() => {
    if (staffMembers.length === 0) return;
    const newIdx = (currentStaffIndex + 1) % staffMembers.length;
    setSelectedStaffId(staffMembers[newIdx].id);
  }, [currentStaffIndex, staffMembers]);

  useEffect(() => {
    if (!selectedStaffId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedStaffId(null);
      else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevStaff();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextStaff();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStaffId, handlePrevStaff, handleNextStaff]);

  // Dropdown Action Menu State (Slide 1 & Slide 4)
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const actionPanelRef = useRef<HTMLDivElement>(null);

  const departmentDisplayName = useMemo(() => {
    if (departmentFilter === 'all') return selectedDepartmentName;
    const clean = (selectedDepartmentName || '').trim();
    return clean.toLowerCase().startsWith('team ') ? clean : `Team ${clean}`;
  }, [departmentFilter, selectedDepartmentName]);

  // Export PDF (A4 Landscape 2 Pages - Native Screen Precision)
  const exportReportPdf = useCallback(() => {
    setSelectedStaffId(null);
    setActiveExpandedId(null);
    window.scrollTo({ top: 0, behavior: "instant" });
    setTimeout(() => {
      window.print();
    }, 150);
  }, []);

  // Export Image (High-res 2x Canvas Snapshot - No Burndown/Capacity, Replaced with 3 Operational Detail Blocks)
  const exportReportImage = useCallback(() => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const scale = 2;
      const width = 1200;
      const height = 1520;
      canvas.width = width * scale;
      canvas.height = height * scale;
      ctx.scale(scale, scale);

      const isDark = document.documentElement.classList.contains("dark");
      ctx.fillStyle = isDark ? "#0b1120" : "#f8fafc";
      ctx.fillRect(0, 0, width, height);

      const cardBg = isDark ? "#1e293b" : "#ffffff";
      const textColor = isDark ? "#f8fafc" : "#0f172a";
      const subTextColor = isDark ? "#94a3b8" : "#64748b";
      const borderColor = isDark ? "#334155" : "#e2e8f0";

      // Header Banner
      const grad = ctx.createLinearGradient(40, 40, width - 40, 140);
      grad.addColorStop(0, "#002e6d");
      grad.addColorStop(1, "#0284c7");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(40, 40, width - 80, 110, 16);
      ctx.fill();

      // Header Text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px Inter, system-ui, sans-serif";
      ctx.fillText(`K COFFEE · ${t("reports.viz.titlePrefix")} · ${departmentDisplayName}`, 64, 85);
      ctx.font = "14px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#e0f2fe";
      ctx.fillText(`${t("reports.viz.periodPrefix")} ${periodLabelVi} · Xuất ngày ${new Date().toLocaleDateString("vi-VN")}`, 64, 118);

      // 5 KPI Cards Section
      const kpis = [
        { title: t("reports.viz.card1Title"), val: `${teamCards.completedTasks}/${teamCards.totalTasks}`, sub: `${teamCards.completionRate}%`, color: "#10b981" },
        { title: t("reports.viz.card2Title"), val: `${teamCards.backlogCount}`, sub: `${teamCards.staffWithBacklogCount} nhân sự`, color: "#f59e0b" },
        { title: t("reports.viz.card3Title"), val: `${teamCards.totalTracks}`, sub: `${teamCards.projectsCount} dự án, ${teamCards.campaignsCount} chiến dịch`, color: "#6366f1" },
        { title: t("reports.viz.card4Title"), val: `${teamCards.inProgressTasks}`, sub: `${teamCards.inProgressPct}% đang làm`, color: "#0ea5e9" },
        { title: t("reports.viz.card5Title"), val: `${teamCards.completedDeliverables}/${teamCards.totalDeliverables}`, sub: `${teamCards.deliverableCompletionRate}% hoàn thành`, color: "#8b5cf6" },
      ];

      const kpiCardW = (width - 80 - 4 * 16) / 5;
      kpis.forEach((kpi, idx) => {
        const x = 40 + idx * (kpiCardW + 16);
        const y = 175;
        ctx.fillStyle = cardBg;
        ctx.beginPath();
        ctx.roundRect(x, y, kpiCardW, 110, 12);
        ctx.fill();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = subTextColor;
        ctx.font = "bold 10px Inter, system-ui, sans-serif";
        ctx.fillText(kpi.title.toUpperCase(), x + 14, y + 26);

        ctx.fillStyle = kpi.color;
        ctx.font = "bold 22px Inter, system-ui, sans-serif";
        ctx.fillText(kpi.val, x + 14, y + 62);

        ctx.fillStyle = subTextColor;
        ctx.font = "11px Inter, system-ui, sans-serif";
        ctx.fillText(kpi.sub, x + 14, y + 88);
      });

      // Staff Performance Table Summary
      ctx.fillStyle = cardBg;
      ctx.beginPath();
      ctx.roundRect(40, 310, width - 80, 500, 16);
      ctx.fill();
      ctx.strokeStyle = borderColor;
      ctx.stroke();

      ctx.fillStyle = textColor;
      ctx.font = "bold 16px Inter, system-ui, sans-serif";
      ctx.fillText(t("reports.viz.staffSectionTitle"), 60, 345);
      ctx.fillStyle = subTextColor;
      ctx.font = "12px Inter, system-ui, sans-serif";
      ctx.fillText(t("reports.viz.staffSectionSub"), 60, 368);

      const tableY = 390;
      ctx.fillStyle = isDark ? "#334155" : "#f1f5f9";
      ctx.beginPath();
      ctx.roundRect(60, tableY, width - 120, 32, 8);
      ctx.fill();

      ctx.fillStyle = subTextColor;
      ctx.font = "bold 11px Inter, system-ui, sans-serif";
      ctx.fillText("NHÂN SỰ", 76, tableY + 20);
      ctx.fillText("TỔNG TASK", 360, tableY + 20);
      ctx.fillText("HOÀN THÀNH", 480, tableY + 20);
      ctx.fillText("ĐANG LÀM", 600, tableY + 20);
      ctx.fillText("TRỄ HẠN", 720, tableY + 20);
      ctx.fillText("HÌNH/FILE", 840, tableY + 20);
      ctx.fillText("TỶ LỆ", 980, tableY + 20);

      staffMembers.slice(0, 8).forEach((m, rowIdx) => {
        const ry = tableY + 44 + rowIdx * 42;
        ctx.fillStyle = textColor;
        ctx.font = "bold 12px Inter, system-ui, sans-serif";
        ctx.fillText(m.name, 76, ry + 16);
        ctx.font = "10px Inter, system-ui, sans-serif";
        ctx.fillStyle = subTextColor;
        ctx.fillText(m.role || "", 76, ry + 30);

        ctx.fillStyle = textColor;
        ctx.font = "12px Inter, system-ui, sans-serif";
        ctx.fillText(String(m.total), 370, ry + 22);
        ctx.fillStyle = "#10b981";
        ctx.fillText(String(m.done), 490, ry + 22);
        ctx.fillStyle = "#0ea5e9";
        ctx.fillText(String(m.doing), 610, ry + 22);
        ctx.fillStyle = m.late > 0 ? "#ef4444" : subTextColor;
        ctx.fillText(String(m.late), 730, ry + 22);

        ctx.fillStyle = "#8b5cf6";
        ctx.font = "bold 12px Inter, system-ui, sans-serif";
        ctx.fillText(`${m.deliverableCount || 0} SL`, 850, ry + 22);

        ctx.fillStyle = "#10b981";
        ctx.fillText(`${m.completionPct}%`, 990, ry + 22);

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(60, ry + 38);
        ctx.lineTo(width - 60, ry + 38);
        ctx.stroke();
      });

      // REPLACED SECTION: DETAIL CÁC VIỆC TỒN ĐỌNG, PROJECT TEAM THAM GIA & VIỆC TIẾP TỤC ĐANG LÀM
      const detailY = 830;
      const detailH = 640;
      ctx.fillStyle = cardBg;
      ctx.beginPath();
      ctx.roundRect(40, detailY, width - 80, detailH, 16);
      ctx.fill();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = textColor;
      ctx.font = "bold 16px Inter, system-ui, sans-serif";
      ctx.fillText("CHI TIẾT VẬN HÀNH & KẾ HOẠCH HÀNH ĐỘNG TRONG KỲ", 60, detailY + 35);
      ctx.font = "12px Inter, system-ui, sans-serif";
      ctx.fillStyle = subTextColor;
      ctx.fillText("Báo cáo chi tiết các việc tồn đọng từ Profile, dự án đang triển khai và các việc nhân sự tiếp tục xử lý", 60, detailY + 56);

      // 3 Columns Layout
      const colW = (width - 120 - 32) / 3;
      const colH = 530;
      const cy = detailY + 75;

      // DATA EXTRACTION
      const backlogTasks = (scopedTasks || []).filter((task: any) => {
        const st = String(task.status || "").toLowerCase();
        const isDone = st === "done" || st === "completed";
        const isLate = Boolean(
          task.is_overdue ||
          (task.due_date && new Date(task.due_date).getTime() < Date.now() && !isDone)
        );
        return !isDone && (isLate || st === "backlog");
      }).slice(0, 8);

      const projectMap = new Map<string, { name: string; total: number; done: number }>();
      (scopedTasks || []).forEach((task: any) => {
        const pName = task.parent_title || task.project_name || task.campaign_name || (task.metadata && task.metadata.project_name);
        if (pName) {
          const entry = projectMap.get(pName) || { name: pName, total: 0, done: 0 };
          entry.total += 1;
          const st = String(task.status || "").toLowerCase();
          if (st === "done" || st === "completed") entry.done += 1;
          projectMap.set(pName, entry);
        }
      });
      const projectList = Array.from(projectMap.values()).slice(0, 8);

      const inProgressTasks = (scopedTasks || []).filter((task: any) => {
        const st = String(task.status || "").toLowerCase();
        return st === "in_progress" || st === "doing";
      }).slice(0, 8);

      // COLUMN 1: CÁC VIỆC TỒN ĐỌNG (BACKLOG)
      const c1x = 60;
      ctx.fillStyle = isDark ? "#1e293b" : "#fffbeb";
      ctx.beginPath();
      ctx.roundRect(c1x, cy, colW, colH, 12);
      ctx.fill();
      ctx.strokeStyle = isDark ? "#78350f" : "#fde68a";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#b45309";
      ctx.font = "bold 13px Inter, system-ui, sans-serif";
      ctx.fillText(`⚠ CÁC VIỆC TỒN ĐỌNG (${backlogTasks.length})`, c1x + 16, cy + 28);
      ctx.fillStyle = subTextColor;
      ctx.font = "11px Inter, system-ui, sans-serif";
      ctx.fillText("Báo cáo từ Profile & quá hạn", c1x + 16, cy + 46);

      if (backlogTasks.length === 0) {
        ctx.fillStyle = "#059669";
        ctx.font = "italic 12px Inter, system-ui, sans-serif";
        ctx.fillText("✔ Không có việc tồn đọng trong kỳ", c1x + 16, cy + 80);
      } else {
        backlogTasks.forEach((t: any, i: number) => {
          const iy = cy + 62 + i * 56;
          ctx.fillStyle = isDark ? "#0f172a" : "#ffffff";
          ctx.beginPath();
          ctx.roundRect(c1x + 10, iy, colW - 20, 48, 8);
          ctx.fill();
          ctx.strokeStyle = borderColor;
          ctx.stroke();

          ctx.fillStyle = textColor;
          ctx.font = "bold 11px Inter, system-ui, sans-serif";
          const title = (t.title || t.name || "Nhiệm vụ").slice(0, 32);
          ctx.fillText(title, c1x + 18, iy + 20);

          ctx.fillStyle = "#ef4444";
          ctx.font = "10px Inter, system-ui, sans-serif";
          const pic = t.assignee_name || (t.assignee && t.assignee.name) || "Chưa giao";
          const due = t.due_date ? t.due_date.slice(0, 10) : "Quá hạn";
          ctx.fillText(`${pic} · Hạn: ${due}`, c1x + 18, iy + 36);
        });
      }

      // COLUMN 2: PROJECT & CAMPAIGN TEAM THAM GIA
      const c2x = 60 + colW + 16;
      ctx.fillStyle = isDark ? "#1e293b" : "#f5f3ff";
      ctx.beginPath();
      ctx.roundRect(c2x, cy, colW, colH, 12);
      ctx.fill();
      ctx.strokeStyle = isDark ? "#4c1d95" : "#ddd6fe";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#6d28d9";
      ctx.font = "bold 13px Inter, system-ui, sans-serif";
      ctx.fillText(`❖ PROJECT & CAMPAIGN (${projectList.length})`, c2x + 16, cy + 28);
      ctx.fillStyle = subTextColor;
      ctx.font = "11px Inter, system-ui, sans-serif";
      ctx.fillText("Dự án & Chiến dịch đang tham gia", c2x + 16, cy + 46);

      if (projectList.length === 0) {
        ctx.fillStyle = subTextColor;
        ctx.font = "italic 12px Inter, system-ui, sans-serif";
        ctx.fillText("Chưa ghi nhận dự án riêng", c2x + 16, cy + 80);
      } else {
        projectList.forEach((p, i) => {
          const iy = cy + 62 + i * 56;
          ctx.fillStyle = isDark ? "#0f172a" : "#ffffff";
          ctx.beginPath();
          ctx.roundRect(c2x + 10, iy, colW - 20, 48, 8);
          ctx.fill();
          ctx.strokeStyle = borderColor;
          ctx.stroke();

          ctx.fillStyle = textColor;
          ctx.font = "bold 11px Inter, system-ui, sans-serif";
          ctx.fillText(p.name.slice(0, 30), c2x + 18, iy + 20);

          const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
          ctx.fillStyle = "#6d28d9";
          ctx.font = "10px Inter, system-ui, sans-serif";
          ctx.fillText(`${p.total} task · Tiến độ: ${pct}% (${p.done} xong)`, c2x + 18, iy + 36);
        });
      }

      // COLUMN 3: CÁC VIỆC TIẾP TỤC ĐANG LÀM CỦA STAFF
      const c3x = 60 + (colW + 16) * 2;
      ctx.fillStyle = isDark ? "#1e293b" : "#f0f9ff";
      ctx.beginPath();
      ctx.roundRect(c3x, cy, colW, colH, 12);
      ctx.fill();
      ctx.strokeStyle = isDark ? "#075985" : "#bae6fd";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#0284c7";
      ctx.font = "bold 13px Inter, system-ui, sans-serif";
      ctx.fillText(`⏱ VIỆC TIẾP TỤC ĐANG LÀM (${inProgressTasks.length})`, c3x + 16, cy + 28);
      ctx.fillStyle = subTextColor;
      ctx.font = "11px Inter, system-ui, sans-serif";
      ctx.fillText("Task đang xử lý & bàn giao trong kỳ", c3x + 16, cy + 46);

      if (inProgressTasks.length === 0) {
        ctx.fillStyle = subTextColor;
        ctx.font = "italic 12px Inter, system-ui, sans-serif";
        ctx.fillText("Không có task đang dở dang", c3x + 16, cy + 80);
      } else {
        inProgressTasks.forEach((t: any, i: number) => {
          const iy = cy + 62 + i * 56;
          ctx.fillStyle = isDark ? "#0f172a" : "#ffffff";
          ctx.beginPath();
          ctx.roundRect(c3x + 10, iy, colW - 20, 48, 8);
          ctx.fill();
          ctx.strokeStyle = borderColor;
          ctx.stroke();

          ctx.fillStyle = textColor;
          ctx.font = "bold 11px Inter, system-ui, sans-serif";
          const title = (t.title || t.name || "Nhiệm vụ").slice(0, 32);
          ctx.fillText(title, c3x + 18, iy + 20);

          ctx.fillStyle = "#0284c7";
          ctx.font = "10px Inter, system-ui, sans-serif";
          const pic = t.assignee_name || (t.assignee && t.assignee.name) || "Chưa giao";
          ctx.fillText(`${pic} · Đang làm`, c3x + 18, iy + 36);
        });
      }

      ctx.fillStyle = subTextColor;
      ctx.font = "11px Inter, system-ui, sans-serif";
      ctx.fillText("K COFFEE Work Tracking & Performance System · Báo cáo chuẩn Cyber-Organic Liquid Glass", 40, height - 20);

      const link = document.createElement("a");
      link.download = `BaoCao_${departmentDisplayName}_${periodMeta?.labelVi || "KCOFFEE"}_ChiTiet.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success(lang === "en" ? "Report image exported successfully!" : "Đã xuất hình ảnh báo cáo thành công!");
    } catch (err) {
      console.error("Export report image error:", err);
      toast.error(lang === "en" ? "Unable to export report image" : "Không thể xuất hình ảnh báo cáo");
    }
  }, [t, lang, departmentDisplayName, periodLabelVi, periodMeta, teamCards, staffMembers, scopedTasks]);

  // Profile-style Calendar Popover State
  const [rangeOpen, setRangeOpen] = useState(false);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragHover, setDragHover] = useState<Date | null>(null);
  const defaultToday = useMemo(() => taskDay(new Date().toISOString()), []);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(() => new Date().getMonth());
  const rangeMenuRef = useRef<HTMLDivElement>(null);
  const rangePanelRef = useRef<HTMLDivElement>(null);

  // Expandable Box state with auto-closing on outside click
  const toggleExpanded = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveExpandedId((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    if (!activeExpandedId && !showBurndownInfo && !showCapacityInfo && !rangeOpen && !actionMenuOpen && !selectedStaffId) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (activeExpandedId && !target.closest(`[data-expandable-box="${activeExpandedId}"]`)) {
        setActiveExpandedId(null);
      }
      if (showBurndownInfo && !target.closest('[data-info-popover="burndown"]')) {
        setShowBurndownInfo(false);
      }
      if (showCapacityInfo && !target.closest('[data-info-popover="capacity"]')) {
        setShowCapacityInfo(false);
      }
      if (rangeOpen && !rangeMenuRef.current?.contains(target) && !rangePanelRef.current?.contains(target)) {
        setRangeOpen(false);
        setDragStart(null);
        setDragHover(null);
      }
      if (actionMenuOpen && !actionMenuRef.current?.contains(target) && !actionPanelRef.current?.contains(target)) {
        setActionMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (rangeOpen) {
          setRangeOpen(false);
          setDragStart(null);
          setDragHover(null);
        }
        if (actionMenuOpen) {
          setActionMenuOpen(false);
        }
        if (selectedStaffId) {
          setSelectedStaffId(null);
        }
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeExpandedId, showBurndownInfo, showCapacityInfo, rangeOpen, actionMenuOpen, selectedStaffId]);

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '—';
    const parts = dateStr.slice(0, 10).split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const presetRanges: Array<{ id: TimeRange; label: string }> = useMemo(
    () => [
      { id: 'today', label: lang === 'en' ? 'Today' : 'Hôm nay' },
      { id: 'three', label: lang === 'en' ? '3 Days' : '3 ngày' },
      { id: 'week', label: lang === 'en' ? '1 Week' : '1 tuần' },
      { id: 'month', label: lang === 'en' ? '1 Month' : '1 tháng' },
      { id: 'quarter', label: lang === 'en' ? '1 Quarter' : '1 quý' },
      { id: 'year', label: lang === 'en' ? '1 Year' : '1 năm' },
    ],
    [lang],
  );

  const selectedRangeLabel = useMemo(() => {
    if (timeRange === 'custom' && customStart && customEnd) {
      return `${formatDateDisplay(customStart).slice(0, 5)} - ${formatDateDisplay(customEnd).slice(0, 5)}`;
    }
    if (timeRange === 'today' && cursorDate !== defaultToday) {
      return formatDateDisplay(cursorDate);
    }
    return presetRanges.find((p) => p.id === timeRange)?.label || periodLabelVi;
  }, [timeRange, customStart, customEnd, cursorDate, defaultToday, presetRanges, periodLabelVi]);

  const chartStaffMembers = useMemo(() => {
    if (staffStatusFilter === 'all') return staffMembers;
    return staffMembers.map((m) => ({
      ...m,
      done: staffStatusFilter === 'done' ? m.done : 0,
      doing: staffStatusFilter === 'doing' ? m.doing : 0,
      todo: staffStatusFilter === 'todo' ? m.todo : 0,
      late: staffStatusFilter === 'late' ? m.late : 0,
    }));
  }, [staffMembers, staffStatusFilter]);

  const selectedStaff: StaffReportMember | null = useMemo(() => {
    if (!selectedStaffId) return null;
    return staffMembers.find((m) => m.id === selectedStaffId) || null;
  }, [staffMembers, selectedStaffId]);

  const scopedStaffTasks = useMemo(() => (selectedStaff?.tasks || []).filter(task => staffTrackFilter === 'all' || staffTaskTrack(task) === staffTrackFilter), [selectedStaff, staffTrackFilter]);

  // Danh sách các Project duy nhất của selectedStaff
  const staffProjects = useMemo(() => {
    if (!selectedStaff?.tasks) return [];
    const map = new Map<string, { id: string; name: string; taskCount: number; doneCount: number; latestDueDate?: string }>();
    selectedStaff.tasks.forEach((task: any) => {
      if (staffTaskTrack(task) === 'project') {
        const pId = String(task.project?.id || task.project_id || task.project?.name || task.project_name || 'project');
        const pName = task.project?.name || task.project_name || task.project?.title || 'Dự án';
        const isDone = String(task.status || '').toLowerCase() === 'done' || String(task.status || '').toLowerCase() === 'completed';
        const existing = map.get(pId);
        if (existing) {
          existing.taskCount++;
          if (isDone) existing.doneCount++;
        } else {
          map.set(pId, {
            id: pId,
            name: pName,
            taskCount: 1,
            doneCount: isDone ? 1 : 0,
            latestDueDate: task.due_date,
          });
        }
      }
    });
    return Array.from(map.values());
  }, [selectedStaff]);

  // Danh sách các Campaign duy nhất của selectedStaff
  const staffCampaigns = useMemo(() => {
    if (!selectedStaff?.tasks) return [];
    const map = new Map<string, { id: string; name: string; taskCount: number; doneCount: number; latestDueDate?: string }>();
    selectedStaff.tasks.forEach((task: any) => {
      if (staffTaskTrack(task) === 'campaign') {
        const cId = String(task.campaign?.id || task.campaign_id || task.campaign?.name || task.campaign_name || 'campaign');
        const cName = task.campaign?.name || task.campaign_name || task.campaign?.title || 'Chiến dịch';
        const isDone = String(task.status || '').toLowerCase() === 'done' || String(task.status || '').toLowerCase() === 'completed';
        const existing = map.get(cId);
        if (existing) {
          existing.taskCount++;
          if (isDone) existing.doneCount++;
        } else {
          map.set(cId, {
            id: cId,
            name: cName,
            taskCount: 1,
            doneCount: isDone ? 1 : 0,
            latestDueDate: task.due_date,
          });
        }
      }
    });
    return Array.from(map.values());
  }, [selectedStaff]);

  const staffDoneTasks = useMemo(() => {
    if (!selectedStaff?.tasks) return [];
    return selectedStaff.tasks.filter((t: any) => {
      const st = String(t.status || '').toLowerCase();
      return st === 'done' || st === 'completed';
    });
  }, [selectedStaff]);

  const staffLateTasks = useMemo(() => {
    if (!selectedStaff?.tasks) return [];
    return selectedStaff.tasks.filter((t: any) => {
      const st = String(t.status || '').toLowerCase();
      const isDone = st === 'done' || st === 'completed';
      return Boolean(t.is_overdue || (t.due_date && new Date(t.due_date).getTime() < Date.now() && !isDone));
    });
  }, [selectedStaff]);

  const filteredStaffTasks = useMemo(() => {
    if (!selectedStaff?.tasks) return [];
    if (staffStatusFilter === 'all') return scopedStaffTasks;
    return scopedStaffTasks.filter((task: any) => {
      const st = String(task.status || '').toLowerCase();
      const isDone = st === 'done' || st === 'completed';
      const isDoing = st === 'in_progress' || st === 'doing';
      const isLate = Boolean(
        task.is_overdue ||
        (task.due_date && new Date(task.due_date).getTime() < Date.now() && !isDone)
      );
      if (staffStatusFilter === 'done') return isDone;
      if (staffStatusFilter === 'doing') return isDoing && !isLate;
      if (staffStatusFilter === 'late') return isLate;
      if (staffStatusFilter === 'todo') return !isDone && !isDoing && !isLate;
      return true;
    });
  }, [selectedStaff, scopedStaffTasks, staffStatusFilter]);

  const staffTaskCounts = useMemo(() => {
    if (!selectedStaff?.tasks) return { all: 0, done: 0, doing: 0, todo: 0, late: 0 };
    let done = 0;
    let doing = 0;
    let todo = 0;
    let late = 0;
    scopedStaffTasks.forEach((task: any) => {
      const st = String(task.status || '').toLowerCase();
      const isDone = st === 'done' || st === 'completed';
      const isDoing = st === 'in_progress' || st === 'doing';
      const isLate = Boolean(
        task.is_overdue ||
        (task.due_date && new Date(task.due_date).getTime() < Date.now() && !isDone)
      );
      if (isDone) done++;
      else if (isLate) late++;
      else if (isDoing) doing++;
      else todo++;
    });
    return {
      all: scopedStaffTasks.length,
      done,
      doing,
      todo,
      late,
    };
  }, [selectedStaff, scopedStaffTasks]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/reports');
    }
  };

  if (isLoading) {
    return (
      <div className="grid place-items-center min-h-[420px] w-full p-8 text-center text-slate-500 dark:text-slate-400">
        <div className="grid justify-items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#002e6d] dark:text-[#38bdf8]" />
          <p className="text-sm font-medium">
            {lang === 'en' ? 'Loading Visualized Report data...' : 'Đang tải dữ liệu Báo cáo Visualize...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="glass-panel m-6 p-6 rounded-[8px] border border-rose-300/60 dark:border-rose-900/60 text-sm text-rose-600 dark:text-rose-400">
        <div className="grid grid-flow-col auto-cols-max items-center gap-3 mb-3">
          <ShieldAlert className="w-6 h-6 text-rose-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {lang === 'en' ? 'Unable to load report' : 'Không thể tải báo cáo'}
          </h3>
        </div>
        <p className="mb-4 text-slate-700 dark:text-slate-300">{error}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="grid grid-flow-col auto-cols-max items-center gap-2 px-4 py-2 rounded-[8px] bg-[#002e6d] text-white hover:bg-[#002250] text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{lang === 'en' ? 'Retry' : 'Thử lại'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`w-full ${standalone ? 'report-standalone-mode min-h-screen bg-slate-50/50 dark:bg-[#0b1120] overflow-y-auto overflow-x-hidden' : 'p-4 lg:p-6'} space-y-6`}>
      {/* Top Bar for Standalone Visualize Mode */}
      {standalone && (
        <header className="sticky top-0 z-30 w-full border-b border-slate-200/70 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 lg:px-8 py-3.5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-4 max-w-[1600px] mx-auto">
            <button
              type="button"
              onClick={handleBack}
              aria-label={t('reports.viz.backDashboard')}
              className="grid grid-flow-col auto-cols-max items-center gap-2 px-3 py-1.5 rounded-[8px] border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#0a192f] hover:bg-slate-100 dark:hover:bg-[#0f1e36] text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#002e6d] dark:text-[#38bdf8]" />
              <span>{t('reports.viz.backDashboard')}</span>
            </button>

            <div className="grid justify-items-start md:justify-items-center">
              <div className="grid grid-flow-col auto-cols-max items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-[6px] bg-[#002e6d]/10 dark:bg-cyan-500/10 border border-[#002e6d]/20 dark:border-cyan-400/30 text-[11px] font-bold tracking-wider text-[#002e6d] dark:text-[#38bdf8] uppercase">
                  K COFFEE
                </span>
                <h1 className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  {t('reports.viz.standaloneTitle')}
                </h1>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('reports.viz.standaloneSubtitle')}
              </p>
            </div>

            <div className="grid grid-flow-col auto-cols-max items-center gap-2.5 justify-self-end">
              <button
                type="button"
                onClick={() => void refetch()}
                aria-label={t('reports.viz.reload')}
                title={t('reports.viz.reload')}
                className="grid place-items-center w-9 h-9 rounded-[8px] border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#0a192f] hover:bg-slate-100 dark:hover:bg-[#0f1e36] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={exportCSV}
                className="grid grid-flow-col auto-cols-max items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] bg-[#002e6d] hover:bg-[#002250] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('reports.viz.exportCsv')}</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Container */}
      <div className={`${standalone ? 'max-w-[1600px] mx-auto px-4 lg:px-8 py-6' : ''} space-y-6`}>
        {/* Header Toolbar & Global Filters */}
        <div className="glass-panel p-3.5 sm:p-5 rounded-[8px] border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] items-start lg:items-center gap-4">
            <div className="grid grid-cols-1 gap-1">
              <div className="grid grid-flow-col auto-cols-max items-center gap-2">
                <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white">
                  {t('reports.viz.titlePrefix')} · {departmentDisplayName}
                </h1>
              </div>
              <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400">
                {t('reports.viz.periodPrefix')} <strong className="text-slate-700 dark:text-slate-200">{periodLabelVi}</strong> · {t('reports.viz.headerDesc')}
              </p>
            </div>

            <div ref={headerToolbarRef} className="grid grid-flow-col auto-cols-max sm:auto-cols-max items-center gap-2 sm:gap-3">
              {/* Department Selector: Mobile compact icon or expanded selector */}
              {canViewAllDepartments ? (
                <>
                  <button
                    type="button"
                    onClick={() => setMobileActiveBtn(mobileActiveBtn === 'dept' ? null : 'dept')}
                    aria-label="Lọc theo phòng ban"
                    className={`sm:hidden ${mobileActiveBtn === 'dept' ? 'hidden' : 'grid'} place-items-center w-10 h-10 min-h-[44px] min-w-[44px] rounded-[8px] border transition-all cursor-pointer border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#0a192f] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0f1e36]`}
                  >
                    <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </button>

                  <div
                    className={`${
                      mobileActiveBtn === 'dept' ? 'grid' : 'hidden sm:grid'
                    } grid-flow-col auto-cols-max items-center gap-1.5 px-3 min-h-[44px] rounded-[8px] border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#0a192f] text-xs font-medium text-slate-800 dark:text-slate-200 shadow-sm transition-all duration-200 animate-in fade-in ${
                      standalone ? 'opacity-80 pointer-events-none' : ''
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <select
                      value={departmentFilter}
                      disabled={standalone}
                      onChange={(e) => {
                        setDepartmentFilter(e.target.value);
                        setMobileActiveBtn(null);
                      }}
                      aria-label="Lọc theo phòng ban"
                      className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer pr-1 py-2.5 w-full disabled:cursor-not-allowed"
                    >
                      <option value="all">{t('reports.viz.allCompany')}</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 px-3 min-h-[44px] rounded-[8px] bg-slate-100 dark:bg-[#0a192f] border border-transparent dark:border-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="hidden sm:inline">{selectedDepartmentName}</span>
                </div>
              )}

              {/* Calendar Navigation Group: Mobile compact icon or expanded navigation */}
              <>
                <button
                  type="button"
                  onClick={() => {
                    const next = mobileActiveBtn === 'calendar' ? null : 'calendar';
                    setMobileActiveBtn(next);
                    if (next === 'calendar') {
                      const cur = new Date(`${cursorDate || defaultToday}T12:00:00Z`);
                      setPickerMonth(cur.getMonth());
                      setPickerYear(cur.getFullYear());
                      setRangeOpen(true);
                    }
                  }}
                  aria-label="Lịch và kỳ báo cáo"
                  className={`sm:hidden ${mobileActiveBtn === 'calendar' ? 'hidden' : 'grid'} place-items-center w-10 h-10 min-h-[44px] min-w-[44px] rounded-[8px] border transition-all cursor-pointer border-gray-200 dark:border-slate-700/80 bg-white dark:bg-[#0a192f] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0f1e36]`}
                >
                  <CalendarDays className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </button>

                <div
                  className={`${
                    mobileActiveBtn === 'calendar' ? 'grid' : 'hidden sm:grid'
                  } grid-cols-[44px_1fr_44px] sm:inline-grid sm:grid-flow-col sm:auto-cols-max items-stretch rounded-[8px] border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-[#0a192f] shadow-sm min-h-[44px] transition-all duration-200 animate-in fade-in ${
                    standalone ? 'opacity-80 pointer-events-none' : ''
                  }`}
                >
                  <button
                    type="button"
                    disabled={standalone}
                    aria-label="Khoảng trước"
                    onClick={() => shiftPeriod(-1)}
                    className="grid place-items-center rounded-l-[8px] p-2 min-h-[44px] min-w-[44px] hover:bg-slate-100 dark:hover:bg-[#0f1e36] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div ref={rangeMenuRef} className="relative border-x border-gray-200 dark:border-slate-700">
                    <button
                      type="button"
                      disabled={standalone}
                      onClick={() => {
                        if (standalone) return;
                        const cur = new Date(`${cursorDate || defaultToday}T12:00:00Z`);
                        setPickerMonth(cur.getMonth());
                        setPickerYear(cur.getFullYear());
                        setRangeOpen((prev) => !prev);
                      }}
                      aria-expanded={rangeOpen}
                      className="grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0f1e36] transition-colors cursor-pointer min-h-[44px] min-w-[108px] w-full disabled:cursor-not-allowed"
                    >
                      <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedRangeLabel}</span>
                      {!standalone && (
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${rangeOpen ? 'rotate-180' : ''}`} />
                      )}
                    </button>

                    {/* 2-Column Calendar Popover */}
                    {rangeOpen && (
                      <FilterPopover
                        anchorRef={rangeMenuRef}
                        panelRef={rangePanelRef}
                        align="right"
                        onClose={() => {
                          setRangeOpen(false);
                          setDragStart(null);
                          setDragHover(null);
                          setMobileActiveBtn(null);
                        }}
                        className="absolute right-0 top-[calc(100%+8px)] z-50 grid grid-cols-1 sm:grid-cols-[1fr_132px] overflow-hidden rounded-[8px] border border-gray-100 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 w-[280px] sm:w-[420px] animate-in fade-in zoom-in-95 duration-150"
                      >
                        {/* Left: Calendar Month Grid with Drag Range */}
                        <div className="p-3">
                          <div className="mb-2 grid grid-cols-[auto_1fr_auto] items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                let m = pickerMonth - 1;
                                let y = pickerYear;
                                if (m < 0) {
                                  m = 11;
                                  y--;
                                }
                                setPickerMonth(m);
                                setPickerYear(y);
                              }}
                              className="grid place-items-center rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                              aria-label="Tháng trước"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-bold text-center text-gray-900 dark:!text-white">
                              {lang === 'vi'
                                ? `Tháng ${pickerMonth + 1}, ${pickerYear}`
                                : `${new Date(pickerYear, pickerMonth, 1).toLocaleString('en-US', { month: 'long' })}, ${pickerYear}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                let m = pickerMonth + 1;
                                let y = pickerYear;
                                if (m > 11) {
                                  m = 0;
                                  y++;
                                }
                                setPickerMonth(m);
                                setPickerYear(y);
                              }}
                              className="grid place-items-center rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                              aria-label="Tháng sau"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Weekday headers */}
                          <div className="grid grid-cols-7 gap-1 text-center">
                            {(lang === 'vi'
                              ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
                              : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                            ).map((d) => (
                              <div key={d} className="text-[10px] font-semibold text-gray-400 py-1">
                                {d}
                              </div>
                            ))}
                            {(() => {
                              const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
                              const firstDay = new Date(pickerYear, pickerMonth, 1).getDay();
                              const offset = (firstDay + 6) % 7;
                              const days = [];
                              for (let i = 0; i < offset; i++) {
                                days.push(<div key={`e-${i}`} />);
                              }

                              const curDateObj = new Date(`${cursorDate || defaultToday}T12:00:00Z`);
                              const activeStart =
                                dragStart ||
                                (timeRange === 'custom' && customStart
                                  ? new Date(`${customStart}T12:00:00Z`)
                                  : curDateObj);
                              const activeEnd = dragStart
                                ? dragHover
                                : timeRange === 'custom' && customEnd
                                ? new Date(`${customEnd}T12:00:00Z`)
                                : null;
                              const s =
                                activeStart && activeEnd
                                  ? activeStart < activeEnd
                                    ? activeStart
                                    : activeEnd
                                  : activeStart;
                              const e =
                                activeStart && activeEnd
                                  ? activeStart > activeEnd
                                    ? activeStart
                                    : activeEnd
                                  : activeEnd;
                              const sStr = s ? taskDay(s.toISOString()) : null;
                              const eStr = e ? taskDay(e.toISOString()) : null;

                              for (let i = 1; i <= daysInMonth; i++) {
                                const date = new Date(pickerYear, pickerMonth, i, 12);
                                const dateStr = taskDay(date.toISOString());

                                let isSelected = false;
                                let isRange = false;

                                if (timeRange === 'custom' || dragStart) {
                                  if (sStr === dateStr || eStr === dateStr) isSelected = true;
                                  if (sStr && eStr && dateStr > sStr && dateStr < eStr) isRange = true;
                                } else if (timeRange === 'today') {
                                  isSelected =
                                    curDateObj.getDate() === i &&
                                    curDateObj.getMonth() === pickerMonth &&
                                    curDateObj.getFullYear() === pickerYear;
                                } else {
                                  const { start, today: periodEnd } = periodMeta;
                                  if (dateStr === start || dateStr === periodEnd) isSelected = true;
                                  if (start && periodEnd && dateStr > start && dateStr < periodEnd) isRange = true;
                                }

                                days.push(
                                  <div
                                    key={i}
                                    className={`relative ${isRange ? 'bg-[#002e6d]/10 dark:bg-[#002e6d]/30' : ''} ${
                                      isSelected && eStr && dateStr === sStr && sStr !== eStr
                                        ? 'rounded-l-full bg-[#002e6d]/10 dark:bg-[#002e6d]/30'
                                        : ''
                                    } ${
                                      isSelected && sStr && dateStr === eStr && sStr !== eStr
                                        ? 'rounded-r-full bg-[#002e6d]/10 dark:bg-[#002e6d]/30'
                                        : ''
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onPointerEnter={() => {
                                        if (dragStart) setDragHover(date);
                                      }}
                                      onClick={() => {
                                        if (!dragStart) {
                                          setDragStart(date);
                                          setDragHover(date);
                                          setTimeRange('custom');
                                        } else {
                                          let start = dragStart;
                                          let end = date;
                                          if (end < start) {
                                            start = date;
                                            end = dragStart;
                                          }
                                          const startIso = taskDay(start.toISOString());
                                          const endIso = taskDay(end.toISOString());
                                          setCustomDateRange(startIso, endIso);
                                          setCursorDate(startIso);
                                          setDragStart(null);
                                          setDragHover(null);
                                        }
                                      }}
                                      className={`relative z-10 h-7 w-full rounded-full text-xs font-medium transition-colors cursor-pointer ${
                                        isSelected
                                          ? 'bg-[#002e6d] text-white shadow-md font-bold'
                                          : 'text-gray-700 hover:bg-[#002e6d]/10 dark:text-gray-200 dark:hover:bg-slate-700'
                                      }`}
                                    >
                                      {i}
                                    </button>
                                  </div>
                                );
                              }
                              return days;
                            })()}
                          </div>
                        </div>

                        {/* Right: Presets */}
                        <div className="grid grid-rows-[1fr_auto] border-t sm:border-t-0 sm:border-l border-gray-100 bg-gray-50/70 dark:border-slate-700 dark:bg-slate-900/70">
                          <div className="p-2 grid grid-cols-1 gap-1 overflow-y-auto content-start">
                            {presetRanges.map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => {
                                  setTimeRange(option.id);
                                  setCursorDate(defaultToday);
                                  setDragStart(null);
                                  setDragHover(null);
                                }}
                                className={`grid grid-flow-col justify-start items-center w-full rounded-[6px] px-3 py-2 text-left text-xs font-semibold transition-colors cursor-pointer ${
                                  timeRange === option.id
                                    ? 'bg-white text-[#002e6d] shadow-sm dark:bg-slate-800 dark:text-blue-400'
                                    : 'text-gray-600 hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-slate-700/60'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                          <div className="p-2 border-t border-gray-200 dark:border-slate-700">
                            <button
                              type="button"
                              onClick={() => {
                                if (dragStart && dragHover) {
                                  let start = dragStart;
                                  let end = dragHover;
                                  if (end < start) {
                                    start = dragHover;
                                    end = dragStart;
                                  }
                                  const startIso = taskDay(start.toISOString());
                                  const endIso = taskDay(end.toISOString());
                                  setCustomDateRange(startIso, endIso);
                                  setCursorDate(startIso);
                                  setDragStart(null);
                                  setDragHover(null);
                                }
                                setRangeOpen(false);
                                setMobileActiveBtn(null);
                              }}
                              className="w-full rounded-[6px] bg-[#002e6d] hover:bg-[#002250] py-2 text-center text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
                            >
                              {t('profile.apply')}
                            </button>
                          </div>
                        </div>
                      </FilterPopover>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={standalone}
                    aria-label="Khoảng sau"
                    onClick={() => shiftPeriod(1)}
                    className="grid place-items-center rounded-r-[8px] p-2 min-h-[44px] min-w-[44px] hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>

              {/* Combined Report Actions Dropdown Menu (Slide 1 & Slide 4) */}
              <div ref={actionMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    const next = mobileActiveBtn === 'export' ? null : 'export';
                    setMobileActiveBtn(next);
                    setActionMenuOpen(next === 'export');
                  }}
                  aria-label="Thao tác xuất báo cáo"
                  className={`sm:hidden ${mobileActiveBtn === 'export' ? 'hidden' : 'grid'} place-items-center w-10 h-10 min-h-[44px] min-w-[44px] rounded-[8px] border transition-all cursor-pointer border-gray-200 dark:border-slate-700/80 bg-white dark:bg-[#0a192f] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0f1e36]`}
                >
                  <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setActionMenuOpen((prev) => !prev)}
                  aria-expanded={actionMenuOpen}
                  aria-haspopup="true"
                  className={`${
                    mobileActiveBtn === 'export' ? 'grid' : 'hidden sm:grid'
                  } grid-flow-col auto-cols-max items-center justify-center sm:justify-start gap-1.5 px-3.5 py-2 rounded-[8px] border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-[#0a192f] hover:bg-slate-50 dark:hover:bg-[#0f1e36] text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all duration-200 cursor-pointer min-h-[44px] animate-in fade-in`}
                >
                  <Download className="w-4 h-4 text-slate-400" />
                  <span>{t('reports.viz.reportActions')}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${actionMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {actionMenuOpen && (
                  <FilterPopover
                    anchorRef={actionMenuRef}
                    panelRef={actionPanelRef}
                    align="right"
                    onClose={() => {
                      setActionMenuOpen(false);
                      setMobileActiveBtn(null);
                    }}
                    className="z-50 w-56 rounded-[8px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl p-1.5 grid grid-cols-1 gap-1 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setActionMenuOpen(false);
                        openVisualizeReport();
                      }}
                      className="grid grid-flow-col auto-cols-max items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors text-left cursor-pointer min-h-[44px]"
                    >
                      <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>{t('reports.viz.viewReportWeb')}</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setActionMenuOpen(false);
                        exportCSV();
                      }}
                      className="grid grid-flow-col auto-cols-max items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors text-left cursor-pointer min-h-[44px]"
                    >
                      <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{t('reports.viz.exportCsv')}</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setActionMenuOpen(false);
                        exportReportPdf();
                      }}
                      className="grid grid-flow-col auto-cols-max items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors text-left cursor-pointer min-h-[44px]"
                    >
                      <Printer className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      <span>{t('reports.viz.exportPdf')}</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setActionMenuOpen(false);
                        exportReportImage();
                      }}
                      className="grid grid-flow-col auto-cols-max items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors text-left cursor-pointer min-h-[44px]"
                    >
                      <ImagePlus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>{t('reports.viz.exportImg')}</span>
                    </button>


                  </FilterPopover>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="report-print-page-1 space-y-6">
        {/* TẦNG 1: 5 Team Performance Cards (Slide 3) */}
        <section aria-label="Team Performance Cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3.5">
          {/* Card 1: Tổng Task trong filter & Hoàn thành */}
          <div
            data-expandable-box="card1"
            onClick={() => toggleExpanded('card1')}
            className={`min-h-[58px] sm:min-h-[160px] relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-[8px] p-2.5 sm:p-3.5 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer sm:cursor-default ${
              activeExpandedId === 'card1' ? 'z-40 ring-1 ring-emerald-500/40' : 'z-10'
            }`}
          >
            {/* Header Row: Icon, Title & Mobile Inline Summary */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 mb-1 sm:mb-2">
              <div className="grid grid-cols-[auto_1fr] items-center gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-[8px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="grid grid-cols-1 min-w-0">
                  <div className="grid grid-cols-[1fr_auto] items-center gap-1.5 sm:block">
                    <h3 className="text-[11px] font-bold uppercase tracking-tight text-gray-800 dark:text-gray-100 leading-tight whitespace-nowrap truncate">
                      {t('reports.viz.card1Title')}
                    </h3>
                    <span className="sm:hidden text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      {teamCards.completedTasks}/{teamCards.totalTasks} ({teamCards.completionRate}%)
                    </span>
                  </div>
                  <p className="hidden sm:block text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    {t('reports.viz.card1Sub', { period: periodLabelVi })}
                  </p>
                </div>
              </div>

              {/* Chevron Button: Hidden on mobile, desktop only */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded('card1', e);
                }}
                aria-label={activeExpandedId === 'card1' ? t('reports.viz.toggleHideStatus') : t('reports.viz.toggleShowStatus')}
                className={`hidden sm:grid w-6 h-6 rounded-[8px] place-items-center transition-all cursor-pointer ${
                  activeExpandedId === 'card1'
                    ? 'border border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/60'
                    : 'border border-transparent bg-slate-100 dark:bg-slate-700/60 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${activeExpandedId === 'card1' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Performance KPI & Visualize Bar */}
            <div className="grid grid-cols-1 gap-1">
              <div className="hidden sm:grid grid-cols-[1fr_auto] items-baseline gap-2">
                <div className="grid grid-flow-col auto-cols-max items-baseline gap-1.5">
                  <b className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {teamCards.completedTasks}
                  </b>
                  <span className="text-xs font-semibold text-gray-400">
                    / {teamCards.totalTasks} {t('reports.viz.tasksUnit')}
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {teamCards.completionRate}%
                </span>
              </div>

              {/* Progress Bar: Always visible on mobile and desktop */}
              <div className="w-full h-1.5 sm:h-2 my-0.5 sm:my-1 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, teamCards.completionRate)}%` }}
                />
              </div>

              <div className="hidden sm:grid grid-cols-[1fr_auto] items-center text-[11px] text-gray-500 dark:text-gray-400">
                <span>{t('reports.viz.doneCount', { count: teamCards.completedTasks })}</span>
                <span>{t('reports.viz.remainingCount', { count: Math.max(0, teamCards.totalTasks - teamCards.completedTasks) })}</span>
              </div>
            </div>

            {/* Floating Glass Dropdown Popup */}
            <div
              role="region"
              aria-label={t('reports.viz.card1Title')}
              onClick={(e) => e.stopPropagation()}
              className={`absolute left-2.5 right-2.5 top-[48px] z-50 rounded-[8px] bg-slate-50/95 dark:bg-[#0f1a2c]/95 backdrop-blur-xl shadow-[0_14px_34px_-6px_rgba(15,23,42,0.16),0_4px_12px_-2px_rgba(15,23,42,0.06)] dark:shadow-[0_16px_38px_-6px_rgba(0,0,0,0.65)] border border-emerald-400/80 dark:border-emerald-500/80 origin-top transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                activeExpandedId === 'card1'
                  ? 'opacity-100 scale-y-100 translate-y-0 max-h-[395px] p-2.5 pointer-events-auto visible'
                  : 'opacity-0 scale-y-95 -translate-y-1.5 max-h-0 p-0 border-transparent pointer-events-none invisible overflow-hidden'
              }`}
              style={{ WebkitBackdropFilter: 'blur(20px) saturate(180%)', backdropFilter: 'blur(20px) saturate(180%)' }}
            >
              <div className="max-h-[360px] overflow-y-auto pr-0.5 space-y-1.5">
                {teamCards.periodTaskItems && teamCards.periodTaskItems.length > 0 ? (
                  teamCards.periodTaskItems.map((item) => (
                    <div
                      key={item.id}
                      className="px-2 py-1.5 rounded-[6px] bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-[1fr_auto] items-center gap-2 text-[11px] shadow-xs"
                    >
                      <div className="grid grid-cols-1 min-w-0 gap-0.5">
                        <span className="truncate font-semibold text-slate-800 dark:text-slate-100" title={item.title}>
                          {item.title}
                        </span>
                        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 text-[9.5px] min-w-0">
                          <span className={`px-1.5 py-0.2 rounded-[4px] font-bold border whitespace-nowrap ${
                            item.entityKind === 'campaign'
                              ? 'bg-orange-100/90 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200/80 dark:border-orange-800/50'
                              : 'bg-violet-100/90 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200/80 dark:border-violet-800/50'
                          }`}>
                            {item.entityKind === 'campaign' ? t('reports.viz.campaignBadge') : t('reports.viz.projectBadge')}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 truncate block min-w-0">
                            {item.assigneeName} {item.entityName ? `· ${item.entityName}` : (item.projectTag ? `· ${item.projectTag}` : '')}
                          </span>
                        </div>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-[4px] text-[9.5px] font-bold whitespace-nowrap border ${
                        item.statusKind === 'done'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                          : item.statusKind === 'doing'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50'
                          : item.statusKind === 'overdue'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}>
                        {item.statusKind === 'done'
                          ? t('reports.viz.colCompleted')
                          : item.statusKind === 'doing'
                          ? t('reports.viz.colInProgress')
                          : item.statusKind === 'overdue'
                          ? t('reports.viz.colOverdue')
                          : t('reports.viz.statusTodo')}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="px-2 py-2 rounded-[6px] bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-center text-[11px]">
                    {t('reports.viz.noTasksInPeriod')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Task tồn đọng (reported from Tab Profile) */}
          <div
            data-expandable-box="card2"
            onClick={() => toggleExpanded('card2')}
            className={`min-h-[58px] sm:min-h-[160px] relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-[8px] p-2.5 sm:p-3.5 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer sm:cursor-default ${
              activeExpandedId === 'card2' ? 'z-40 ring-1 ring-amber-500/40' : 'z-10'
            }`}
          >
            {/* Header Row: Icon, Title & Mobile Inline Summary */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 mb-1 sm:mb-2">
              <div className="grid grid-cols-[auto_1fr] items-center gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-[8px] bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="grid grid-cols-1 min-w-0">
                  <div className="grid grid-cols-[1fr_auto] items-center gap-1.5 sm:block">
                    <h3 className="text-[11px] font-bold uppercase tracking-tight text-gray-800 dark:text-gray-100 leading-tight whitespace-nowrap truncate">
                      {t('reports.viz.card2Title')}
                    </h3>
                    <span className="sm:hidden text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      {teamCards.backlogCount} {t('reports.viz.backlogUnit')}
                    </span>
                  </div>
                  <p className="hidden sm:block text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    {t('reports.viz.card2Sub')}
                  </p>
                </div>
              </div>

              {/* Chevron Button: Hidden on mobile, desktop only */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded('card2', e);
                }}
                aria-label={activeExpandedId === 'card2' ? t('reports.viz.toggleHideStatus') : t('reports.viz.toggleShowStatus')}
                className={`hidden sm:grid w-6 h-6 rounded-[8px] place-items-center transition-all cursor-pointer ${
                  activeExpandedId === 'card2'
                    ? 'border border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50/90 dark:bg-amber-950/60'
                    : 'border border-transparent bg-slate-100 dark:bg-slate-700/60 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${activeExpandedId === 'card2' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Performance KPI & Visualize Bar */}
            <div className="grid grid-cols-1 gap-1">
              <div className="hidden sm:grid grid-cols-1 items-baseline">
                <div className="grid grid-flow-col auto-cols-max items-baseline gap-1.5">
                  <b className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                    {teamCards.backlogCount}
                  </b>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {t('reports.viz.backlogUnit')}
                  </span>
                </div>
              </div>

              {/* Progress Bar: Always visible on mobile and desktop */}
              <div
                className="w-full h-1.5 sm:h-2 my-0.5 sm:my-1 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden grid"
                style={{
                  gridTemplateColumns: `${Math.max(teamCards.highSeverityBacklogCount, 0)}fr ${Math.max(0, teamCards.backlogCount - teamCards.highSeverityBacklogCount)}fr`,
                }}
              >
                {teamCards.highSeverityBacklogCount > 0 && (
                  <div
                    className="h-full w-full bg-amber-500"
                    title={`${t('reports.viz.highPriorityCount', { count: teamCards.highSeverityBacklogCount })}`}
                  />
                )}
                {teamCards.backlogCount - teamCards.highSeverityBacklogCount > 0 && (
                  <div
                    className="h-full w-full bg-amber-300 dark:bg-amber-700"
                    title={`${t('reports.viz.mediumPriorityCount', { count: teamCards.backlogCount - teamCards.highSeverityBacklogCount })}`}
                  />
                )}
              </div>

              <div className="hidden sm:grid grid-cols-[1fr_auto] items-center text-[11px] text-gray-500 dark:text-gray-400">
                <span>{t('reports.viz.highPriorityCount', { count: teamCards.highSeverityBacklogCount })}</span>
                <span>{t('reports.viz.mediumPriorityCount', { count: Math.max(0, teamCards.backlogCount - teamCards.highSeverityBacklogCount) })}</span>
              </div>
            </div>

            {/* Floating Glass Dropdown Popup */}
            <div
              role="region"
              aria-label={t('reports.viz.card2Title')}
              onClick={(e) => e.stopPropagation()}
              className={`absolute left-2.5 right-2.5 top-[48px] z-50 rounded-[8px] bg-slate-50/95 dark:bg-[#0f1a2c]/95 backdrop-blur-xl shadow-[0_14px_34px_-6px_rgba(15,23,42,0.16),0_4px_12px_-2px_rgba(15,23,42,0.06)] dark:shadow-[0_16px_38px_-6px_rgba(0,0,0,0.65)] border border-amber-400/80 dark:border-amber-500/80 origin-top transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                activeExpandedId === 'card2'
                  ? 'opacity-100 scale-y-100 translate-y-0 max-h-[395px] p-2.5 pointer-events-auto visible'
                  : 'opacity-0 scale-y-95 -translate-y-1.5 max-h-0 p-0 border-transparent pointer-events-none invisible overflow-hidden'
              }`}
              style={{ WebkitBackdropFilter: 'blur(20px) saturate(180%)', backdropFilter: 'blur(20px) saturate(180%)' }}
            >
              <div className="max-h-[360px] overflow-y-auto pr-0.5 space-y-1.5">
                {teamCards.backlogItems && teamCards.backlogItems.length > 0 ? (
                  teamCards.backlogItems.map((item) => (
                    <div
                      key={item.id}
                      title={`${item.title} — ${item.reason}`}
                      className="px-2 py-1.5 rounded-[6px] bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-[1fr_auto] items-center gap-2 text-[11px] shadow-xs"
                    >
                      <div className="grid grid-cols-1 min-w-0 gap-0.5">
                        <span className="truncate font-semibold text-slate-800 dark:text-slate-100">
                          {item.title}
                        </span>
                        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 text-[9.5px] min-w-0">
                          <span className={`px-1.5 py-0.2 rounded-[4px] font-bold border whitespace-nowrap ${
                            item.entityKind === 'campaign'
                              ? 'bg-orange-100/90 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200/80 dark:border-orange-800/50'
                              : 'bg-violet-100/90 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200/80 dark:border-violet-800/50'
                          }`}>
                            {item.entityKind === 'campaign' ? t('reports.viz.campaignBadge') : t('reports.viz.projectBadge')}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 truncate block min-w-0">
                            {item.staffName} · {item.entityName || item.projectTag}
                          </span>
                        </div>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-[4px] text-[9.5px] font-bold whitespace-nowrap border ${
                        item.severity === 'high'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50'
                      }`}>
                        {item.severity === 'high' ? 'High' : 'Medium'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="px-2 py-2 rounded-[6px] bg-slate-50 dark:bg-slate-800/50 text-emerald-600 dark:text-emerald-400 font-medium text-center text-[11px]">
                    {t('reports.viz.noBacklog')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Project & Campaign Team tham gia */}
          <div
            data-expandable-box="card3"
            onClick={() => toggleExpanded('card3')}
            className={`min-h-[58px] sm:min-h-[160px] relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-[8px] p-2.5 sm:p-3.5 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer sm:cursor-default ${
              activeExpandedId === 'card3' ? 'z-40 ring-1 ring-violet-500/40' : 'z-10'
            }`}
          >
            {/* Header Row: Icon, Title & Mobile Inline Summary */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 mb-1 sm:mb-2">
              <div className="grid grid-cols-[auto_1fr] items-center gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-[8px] bg-violet-500/10 text-violet-600 dark:text-violet-400 grid place-items-center shrink-0">
                  <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="grid grid-cols-1 min-w-0">
                  <div className="grid grid-cols-[1fr_auto] items-center gap-1.5 sm:block">
                    <h3 className="text-[11px] font-bold uppercase tracking-tight text-gray-800 dark:text-gray-100 leading-tight whitespace-nowrap truncate">
                      {t('reports.viz.card3Title')}
                    </h3>
                    <span className="sm:hidden text-[11px] font-bold text-[#093570] dark:text-blue-400">
                      {teamCards.totalTracks} · {teamCards.avgTrackProgress}%
                    </span>
                  </div>
                  <p className="hidden sm:block text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    {t('reports.viz.card3Sub')}
                  </p>
                </div>
              </div>

              {/* Chevron Button: Hidden on mobile, desktop only */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded('card3', e);
                }}
                aria-label={activeExpandedId === 'card3' ? t('reports.viz.toggleHideStatus') : t('reports.viz.toggleShowStatus')}
                className={`hidden sm:grid w-6 h-6 rounded-[8px] place-items-center transition-all cursor-pointer ${
                  activeExpandedId === 'card3'
                    ? 'border border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50/90 dark:bg-violet-950/60'
                    : 'border border-transparent bg-slate-100 dark:bg-slate-700/60 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${activeExpandedId === 'card3' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Performance KPI & Visualize Bar */}
            <div className="grid grid-cols-1 gap-1">
              <div className="hidden sm:grid grid-cols-[1fr_auto] items-baseline gap-2">
                <div className="grid grid-flow-col auto-cols-max items-baseline gap-1.5">
                  <b className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {teamCards.totalTracks}
                  </b>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {t('reports.viz.projCampSplit', { projects: teamCards.projectsCount, campaigns: teamCards.campaignsCount })}
                  </span>
                </div>
                <span className="text-xs font-bold text-[#093570] dark:text-blue-400">
                  {teamCards.avgTrackProgress}%
                </span>
              </div>

              {/* Progress Bar: Always visible on mobile and desktop */}
              <div className="w-full h-1.5 sm:h-2 my-0.5 sm:my-1 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#093570] to-[#2a78d6] transition-all duration-500"
                  style={{ width: `${Math.min(100, teamCards.avgTrackProgress)}%` }}
                />
              </div>

              <div className="hidden sm:grid grid-cols-[1fr_auto] items-center text-[11px] text-gray-500 dark:text-gray-400">
                <span>{t('reports.viz.avgProgress')}</span>
                <span>
                  {teamCards.tracksAtRiskCount > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">{t('reports.viz.needsAttention', { count: teamCards.tracksAtRiskCount })}</span>
                  ) : (
                    t('reports.viz.onTrack')
                  )}
                </span>
              </div>
            </div>

            {/* Floating Glass Dropdown Popup */}
            <div
              role="region"
              aria-label={t('reports.viz.card3Title')}
              onClick={(e) => e.stopPropagation()}
              className={`absolute left-2.5 right-2.5 top-[48px] z-50 rounded-[8px] bg-slate-50/95 dark:bg-[#0f1a2c]/95 backdrop-blur-xl shadow-[0_14px_34px_-6px_rgba(15,23,42,0.16),0_4px_12px_-2px_rgba(15,23,42,0.06)] dark:shadow-[0_16px_38px_-6px_rgba(0,0,0,0.65)] border border-violet-400/80 dark:border-violet-500/80 origin-top transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                activeExpandedId === 'card3'
                  ? 'opacity-100 scale-y-100 translate-y-0 max-h-[395px] p-2.5 pointer-events-auto visible'
                  : 'opacity-0 scale-y-95 -translate-y-1.5 max-h-0 p-0 border-transparent pointer-events-none invisible overflow-hidden'
              }`}
              style={{ WebkitBackdropFilter: 'blur(20px) saturate(180%)', backdropFilter: 'blur(20px) saturate(180%)' }}
            >
              <div className="max-h-[360px] overflow-y-auto pr-0.5 space-y-1.5">
                {teamCards.tracks && teamCards.tracks.length > 0 ? (
                  teamCards.tracks.map((tr) => (
                    <div
                      key={tr.id}
                      className="px-2 py-1.5 rounded-[6px] bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-[11px] shadow-xs"
                    >
                      {/* Standard Dashboard colors: Project = Violet, Campaign = Orange */}
                      <span className={`px-1.5 py-0.5 rounded-[4px] text-[9.5px] font-bold border whitespace-nowrap ${
                        tr.kind === 'project'
                          ? 'bg-violet-100/90 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200/80 dark:border-violet-800/50'
                          : 'bg-orange-100/90 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200/80 dark:border-orange-800/50'
                      }`}>
                        {tr.kind === 'project' ? t('reports.viz.projectBadge') : t('reports.viz.campaignBadge')}
                      </span>
                      <span className="truncate font-semibold text-slate-800 dark:text-slate-100 min-w-0" title={tr.name}>
                        {tr.name}
                      </span>
                      <span className="font-bold text-[#093570] dark:text-blue-400 text-xs">
                        {tr.progress}%
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="px-2 py-2 rounded-[6px] bg-slate-50 dark:bg-slate-800/50 text-gray-400 text-center text-[11px]">
                    {t('reports.viz.noTracks')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 4: Tiếp tục đang làm (In Progress & Active) */}
          <div
            data-expandable-box="card4"
            onClick={() => toggleExpanded('card4')}
            className={`min-h-[58px] sm:min-h-[160px] relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-[8px] p-2.5 sm:p-3.5 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer sm:cursor-default ${
              activeExpandedId === 'card4' ? 'z-40 ring-1 ring-blue-500/40' : 'z-10'
            }`}
          >
            {/* Header Row: Icon, Title & Mobile Inline Summary */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 mb-1 sm:mb-2">
              <div className="grid grid-cols-[auto_1fr] items-center gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-[8px] bg-blue-500/10 text-blue-600 dark:text-blue-400 grid place-items-center shrink-0">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="grid grid-cols-1 min-w-0">
                  <div className="grid grid-cols-[1fr_auto] items-center gap-1.5 sm:block">
                    <h3 className="text-[11px] font-bold uppercase tracking-tight text-gray-800 dark:text-gray-100 leading-tight whitespace-nowrap truncate">
                      {t('reports.viz.card4Title')}
                    </h3>
                    <span className="sm:hidden text-[11px] font-bold text-[#2a78d6] dark:text-blue-400">
                      {teamCards.inProgressTasks} {t('reports.viz.inProgressUnit')}
                    </span>
                  </div>
                  <p className="hidden sm:block text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    {t('reports.viz.card4Sub')}
                  </p>
                </div>
              </div>

              {/* Chevron Button: Hidden on mobile, desktop only */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded('card4', e);
                }}
                aria-label={activeExpandedId === 'card4' ? t('reports.viz.toggleHideStatus') : t('reports.viz.toggleShowStatus')}
                className={`hidden sm:grid w-6 h-6 rounded-[8px] place-items-center transition-all cursor-pointer ${
                  activeExpandedId === 'card4'
                    ? 'border border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/60'
                    : 'border border-transparent bg-slate-100 dark:bg-slate-700/60 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${activeExpandedId === 'card4' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Performance KPI & Visualize Bar */}
            <div className="grid grid-cols-1 gap-1">
              <div className="hidden sm:grid grid-cols-[1fr_auto] items-baseline gap-2">
                <div className="grid grid-flow-col auto-cols-max items-baseline gap-1.5">
                  <b className="text-2xl font-bold tracking-tight text-[#2a78d6] dark:text-blue-400">
                    {teamCards.inProgressTasks}
                  </b>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {t('reports.viz.inProgressUnit')}
                  </span>
                </div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {t('reports.viz.openShare', { pct: teamCards.inProgressPct })}
                </span>
              </div>

              {/* Progress Bar: Always visible on mobile and desktop */}
              <div
                className="w-full h-1.5 sm:h-2 my-0.5 sm:my-1 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden grid"
                style={{
                  gridTemplateColumns: `${Math.max(teamCards.inProgressTasks, 0)}fr ${Math.max(teamCards.todoTasks, 0)}fr ${Math.max(teamCards.overdueTasks, 0)}fr`,
                }}
              >
                {teamCards.inProgressTasks > 0 && (
                  <div className="h-full w-full bg-[#2a78d6]" title={`${t('reports.viz.statusDoing')}: ${teamCards.inProgressTasks}`} />
                )}
                {teamCards.todoTasks > 0 && (
                  <div className="h-full w-full bg-slate-400 dark:bg-slate-500" title={`${t('reports.viz.statusTodo')}: ${teamCards.todoTasks}`} />
                )}
                {teamCards.overdueTasks > 0 && (
                  <div className="h-full w-full bg-rose-500" title={`${t('reports.viz.statusOverdue')}: ${teamCards.overdueTasks}`} />
                )}
              </div>

              <div className="hidden sm:grid grid-cols-[1fr_auto] items-center text-[11px] text-gray-500 dark:text-gray-400">
                <span>{t('reports.viz.todoWaiting', { count: teamCards.todoTasks })}</span>
                <span className={teamCards.overdueTasks > 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}>
                  {t('reports.viz.overdueCount', { count: teamCards.overdueTasks })}
                </span>
              </div>
            </div>

            {/* Floating Glass Dropdown Popup */}
            <div
              role="region"
              aria-label={t('reports.viz.card4Title')}
              onClick={(e) => e.stopPropagation()}
              className={`absolute left-2.5 right-2.5 top-[48px] z-50 rounded-[8px] bg-slate-50/95 dark:bg-[#0f1a2c]/95 backdrop-blur-xl shadow-[0_14px_34px_-6px_rgba(15,23,42,0.16),0_4px_12px_-2px_rgba(15,23,42,0.06)] dark:shadow-[0_16px_38px_-6px_rgba(0,0,0,0.65)] border border-blue-400/80 dark:border-blue-500/80 origin-top transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                activeExpandedId === 'card4'
                  ? 'opacity-100 scale-y-100 translate-y-0 max-h-[395px] p-2.5 pointer-events-auto visible'
                  : 'opacity-0 scale-y-95 -translate-y-1.5 max-h-0 p-0 border-transparent pointer-events-none invisible overflow-hidden'
              }`}
              style={{ WebkitBackdropFilter: 'blur(20px) saturate(180%)', backdropFilter: 'blur(20px) saturate(180%)' }}
            >
              {/* 3 Compact Status Pills Row */}
              <div className="grid grid-cols-3 gap-1 mb-1.5">
                <div className="px-1.5 py-0.5 rounded-[4px] bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 grid grid-cols-[1fr_auto] items-center gap-1 text-[9.5px]">
                  <span className="text-blue-600 dark:text-blue-400 font-medium truncate">{t('reports.viz.statusDoing')}</span>
                  <b className="font-bold text-blue-700 dark:text-blue-300">{teamCards.inProgressTasks}</b>
                </div>
                <div className="px-1.5 py-0.5 rounded-[4px] bg-gray-50/80 dark:bg-slate-700/40 border border-gray-200/60 dark:border-slate-700/60 grid grid-cols-[1fr_auto] items-center gap-1 text-[9.5px]">
                  <span className="text-gray-500 dark:text-gray-400 font-medium truncate">{t('reports.viz.statusTodo')}</span>
                  <b className="font-bold text-slate-700 dark:text-slate-300">{teamCards.todoTasks}</b>
                </div>
                <div className="px-1.5 py-0.5 rounded-[4px] bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 grid grid-cols-[1fr_auto] items-center gap-1 text-[9.5px]">
                  <span className="text-rose-600 dark:text-rose-400 font-medium truncate">{t('reports.viz.statusOverdue')}</span>
                  <b className="font-bold text-rose-700 dark:text-rose-300">{teamCards.overdueTasks}</b>
                </div>
              </div>

              {/* Scrollable list of open tasks */}
              <div className="max-h-[360px] overflow-y-auto pr-0.5 space-y-1.5">
                {teamCards.openTaskItems && teamCards.openTaskItems.length > 0 ? (
                  teamCards.openTaskItems.map((item) => (
                    <div
                      key={item.id}
                      className="px-2 py-1.5 rounded-[6px] bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-[1fr_auto] items-center gap-2 text-[11px] shadow-xs"
                    >
                      <div className="grid grid-cols-1 min-w-0 gap-0.5">
                        <span className="truncate font-semibold text-slate-800 dark:text-slate-100" title={item.title}>
                          {item.title}
                        </span>
                        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 text-[9.5px] min-w-0">
                          <span className={`px-1.5 py-0.2 rounded-[4px] font-bold border whitespace-nowrap ${
                            item.entityKind === 'campaign'
                              ? 'bg-orange-100/90 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200/80 dark:border-orange-800/50'
                              : 'bg-violet-100/90 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200/80 dark:border-violet-800/50'
                          }`}>
                            {item.entityKind === 'campaign' ? t('reports.viz.campaignBadge') : t('reports.viz.projectBadge')}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 truncate block min-w-0">
                            {item.assigneeName} {item.entityName ? `· ${item.entityName}` : (item.projectTag ? `· ${item.projectTag}` : '')}
                          </span>
                        </div>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-[4px] text-[9.5px] font-bold whitespace-nowrap border ${
                        item.statusKind === 'doing'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50'
                          : item.statusKind === 'overdue'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}>
                        {item.statusKind === 'doing'
                          ? t('reports.viz.colInProgress')
                          : item.statusKind === 'overdue'
                          ? t('reports.viz.colOverdue')
                          : t('reports.viz.statusTodo')}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="px-2 py-2 rounded-[6px] bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-center text-[11px]">
                    {t('reports.viz.noTasksInPeriod')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 5: Sản lượng hình ảnh / file (Deliverables Output - Slide 3) */}
          <div
            data-expandable-box="card5"
            onClick={() => toggleExpanded('card5')}
            className={`min-h-[58px] sm:min-h-[160px] relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-[8px] p-2.5 sm:p-3.5 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors col-span-1 cursor-pointer sm:cursor-default ${
              activeExpandedId === 'card5' ? 'z-40 ring-1 ring-violet-500/40' : 'z-10'
            }`}
          >
            {/* Header Row: Icon, Title & Mobile Inline Summary */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 mb-1 sm:mb-2">
              <div className="grid grid-cols-[auto_1fr] items-center gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-[8px] bg-violet-500/10 text-violet-600 dark:text-violet-400 grid place-items-center shrink-0">
                  <ImagePlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="grid grid-cols-1 min-w-0">
                  <div className="grid grid-cols-[1fr_auto] items-center gap-1.5 sm:block">
                    <h3 className="text-[11px] font-bold uppercase tracking-tight text-gray-800 dark:text-gray-100 leading-tight whitespace-nowrap truncate">
                      {t('reports.viz.card5Title')}
                    </h3>
                    <span className="sm:hidden text-[11px] font-bold text-violet-600 dark:text-violet-400">
                      {teamCards.completedDeliverables}/{teamCards.totalDeliverables} ({teamCards.deliverableCompletionRate}%)
                    </span>
                  </div>
                  <p className="hidden sm:block text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    {t('reports.viz.card5Sub')}
                  </p>
                </div>
              </div>

              {/* Chevron Button: Hidden on mobile, desktop only */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded('card5', e);
                }}
                aria-label={activeExpandedId === 'card5' ? t('reports.viz.toggleHideStatus') : t('reports.viz.toggleShowStatus')}
                className={`hidden sm:grid w-6 h-6 rounded-[8px] place-items-center transition-all cursor-pointer ${
                  activeExpandedId === 'card5'
                    ? 'border border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50/90 dark:bg-violet-950/60'
                    : 'border border-transparent bg-slate-100 dark:bg-slate-700/60 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${activeExpandedId === 'card5' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Performance KPI & Visualize Bar */}
            <div className="grid grid-cols-1 gap-1">
              <div className="hidden sm:grid grid-cols-[1fr_auto] items-baseline gap-2">
                <div className="grid grid-flow-col auto-cols-max items-baseline gap-1.5">
                  <b className="text-2xl font-bold tracking-tight text-violet-600 dark:text-violet-400">
                    {teamCards.completedDeliverables}/{teamCards.totalDeliverables}
                  </b>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {lang === 'en' ? 'items' : 'hình/file'}
                  </span>
                </div>
                <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
                  {teamCards.deliverableCompletionRate}%
                </span>
              </div>

              {/* Progress Bar: Always visible on mobile and desktop */}
              <div className="w-full h-1.5 sm:h-2 my-0.5 sm:my-1 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, teamCards.deliverableCompletionRate)}%` }}
                />
              </div>

              <div className="hidden sm:grid grid-cols-2 gap-1.5 text-[10px] font-semibold">
                <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-1 text-center text-emerald-700 dark:text-emerald-300">
                  {t('reports.viz.deliverablesDone', { count: teamCards.completedDeliverables })}
                </span>
                <span className="rounded-md bg-amber-50 dark:bg-amber-950/40 px-1.5 py-1 text-center text-amber-700 dark:text-amber-300">
                  {t('reports.viz.deliverablesRemaining', { count: teamCards.doingDeliverables })}
                </span>
              </div>
            </div>

            {/* Floating Glass Dropdown Popup for Card 5 */}
            <div
              role="region"
              aria-label={t('reports.viz.card5Title')}
              onClick={(e) => e.stopPropagation()}
              className={`absolute left-2.5 right-2.5 top-[48px] z-50 rounded-[8px] bg-slate-50/95 dark:bg-[#0f1a2c]/95 backdrop-blur-xl shadow-[0_14px_34px_-6px_rgba(15,23,42,0.16),0_4px_12px_-2px_rgba(15,23,42,0.06)] dark:shadow-[0_16px_38px_-6px_rgba(0,0,0,0.65)] border border-violet-400/80 dark:border-violet-500/80 origin-top transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                activeExpandedId === 'card5'
                  ? 'opacity-100 scale-y-100 translate-y-0 max-h-[80vh] p-2.5 pointer-events-auto visible'
                  : 'opacity-0 scale-y-95 -translate-y-1.5 max-h-0 p-0 border-transparent pointer-events-none invisible overflow-hidden'
              }`}
              style={{ WebkitBackdropFilter: 'blur(20px) saturate(180%)', backdropFilter: 'blur(20px) saturate(180%)' }}
            >
              <div className="max-h-[calc(80vh-24px)] overflow-y-auto pr-0.5 space-y-2">
                {/* Section A: Phân bổ theo Phòng ban thụ hưởng */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                    {t('reports.viz.byDepartment')}
                  </div>
                  {teamCards.deliverablesByDepartment && teamCards.deliverablesByDepartment.length > 0 ? (
                    <div className="grid grid-cols-1 gap-1">
                      {teamCards.deliverablesByDepartment.map((d, dIdx) => (
                        <div key={dIdx} className="px-2 py-1 rounded-[6px] bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 grid grid-cols-[1fr_auto] items-center text-[11px]">
                          <span className="truncate font-medium text-slate-800 dark:text-slate-200">{d.departmentName}</span>
                          <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 text-[9.5px]">
                            <span className="font-bold text-violet-600 dark:text-violet-400">{d.total} SL</span>
                            <span className="text-slate-400">({d.percentage}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">Chưa có số liệu phòng ban</p>
                  )}
                </div>

                {/* Section B: Phân bổ theo Dự án / Chiến dịch */}
                <div className="space-y-1 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                    {t('reports.viz.byTrack')}
                  </div>
                  {teamCards.deliverablesByTrack && teamCards.deliverablesByTrack.length > 0 ? (
                    <div className="grid grid-cols-1 gap-1">
                      {teamCards.deliverablesByTrack.map((tr) => (
                        <div key={tr.id} className="px-2 py-1 rounded-[6px] bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 grid grid-cols-[auto_1fr_auto] items-center gap-1.5 text-[11px]">
                          <span className={`px-1.5 py-0.2 rounded-[4px] text-[9.5px] font-bold border whitespace-nowrap ${
                            tr.kind === 'campaign'
                              ? 'bg-orange-100/90 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200/80 dark:border-orange-800/50'
                              : 'bg-violet-100/90 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200/80 dark:border-violet-800/50'
                          }`}>
                            {tr.kind === 'campaign' ? t('reports.viz.campaignBadge') : t('reports.viz.projectBadge')}
                          </span>
                          <span className="truncate font-medium text-slate-800 dark:text-slate-200">{tr.name}</span>
                          <span className="font-bold text-violet-600 dark:text-violet-400 text-[10px]">{tr.total} SL</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">Chưa có số liệu theo dự án</p>
                  )}
                </div>

                {/* Section C: Task-level completion labels */}
                <div className="space-y-1 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                    {t('reports.viz.deliverableTaskList')}
                  </div>
                  {teamCards.deliverableItems.length > 0 ? (
                    <div className="space-y-1">
                      {[...teamCards.deliverableItems]
                        .sort((a, b) => Number(b.statusKind === 'done') - Number(a.statusKind === 'done'))
                        .map((item) => {
                          const isDone = item.statusKind === 'done';
                          return (
                            <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-[6px] border border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 px-2 py-1.5 text-[10px]">
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-slate-800 dark:text-slate-100" title={item.title}>{item.title}</div>
                                <div className="truncate text-slate-500 dark:text-slate-400">{item.entityName} · {item.quantity} {lang === 'en' ? 'items' : 'hình/file'}</div>
                              </div>
                              <span className={`shrink-0 rounded-full border px-1.5 py-0.5 font-bold ${isDone ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-300'}`}>
                                {isDone ? t('reports.viz.deliverableTaskDone') : t('reports.viz.deliverableTaskOpen')}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">{t('reports.viz.noDeliverableTasks')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TẦNG 2: Staff Performance & Workload */}
        <section aria-label="Staff Performance Block" className="glass-panel p-5 rounded-[8px] border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 shadow-sm space-y-5">
          {/* Section Header */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-start md:items-center gap-4">
            <div className="grid grid-cols-1 gap-1">
              <div className="grid grid-flow-col auto-cols-max items-center gap-2">
                <h2 className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white">
                  {staffView === 'cards' ? (lang === 'en' ? 'TEAM PROFILES' : 'HỒ SƠ THÀNH VIÊN') : t('reports.viz.staffSectionTitle')}
                </h2>
                <span className="px-2 py-0.5 rounded-[6px] text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {t('reports.viz.staffCountBadge', { count: staffMembers.length })}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {staffView === 'cards' ? (lang === 'en' ? 'Meet the team and explore each member’s work.' : 'Thông tin thành viên và công việc trong kỳ báo cáo.') : t('reports.viz.staffSectionSub')}
              </p>
            </div>

            <div className="grid grid-flow-col auto-cols-max items-center gap-4">
              {/* View Switcher Buttons */}
              <div className="grid grid-flow-col auto-cols-max gap-1 p-1 rounded-[8px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setStaffView('list')}
                  aria-label={t('reports.viz.viewHorizontal')}
                  title={t('reports.viz.viewHorizontal')}
                  className={`grid grid-flow-col auto-cols-max items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer ${
                    staffView === 'list'
                      ? 'bg-[#002e6d] text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t('reports.viz.viewHorizontal')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStaffView('cards')}
                  aria-label={t('reports.viz.viewCards')}
                  title={t('reports.viz.viewCards')}
                  className={`grid grid-flow-col auto-cols-max items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer ${
                    staffView === 'cards'
                      ? 'bg-[#002e6d] text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t('reports.viz.viewCards')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEW 'LIST': Recharts Horizontal Stacked Bar */}
          {staffView === 'list' && (
            <div className="grid grid-cols-1 gap-4">
              <div
                className="w-full"
                style={{ height: `${Math.max(280, staffMembers.length * 46 + 40)}px` }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartStaffMembers}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                    onClick={(e: any) => {
                      if (e && e.activePayload && e.activePayload.length > 0) {
                        const clicked = e.activePayload[0].payload as StaffReportMember;
                        setSelectedStaffId(clicked.id === selectedStaffId ? null : clicked.id);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.15} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      dataKey="displayLabel"
                      type="category"
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      width={140}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(56, 189, 248, 0.08)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const d = payload[0].payload as StaffReportMember;
                        return (
                          <div className="rounded-[8px] border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-3.5 shadow-xl backdrop-blur-md text-xs min-w-[200px]">
                            <p className="font-bold text-slate-900 dark:text-white">{d.name}</p>
                            <p className="text-[11px] text-slate-500 mb-2">{d.role}</p>
                            <div className="grid grid-cols-1 gap-1 text-[11px]">
                              <div className="grid grid-flow-col justify-between items-center">
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{t('reports.viz.colCompleted')}:</span>
                                <strong className="text-slate-800 dark:text-slate-100">{d.done}</strong>
                              </div>
                              <div className="grid grid-flow-col justify-between items-center">
                                <span className="text-blue-600 dark:text-blue-400 font-medium">{t('reports.viz.colInProgress')}:</span>
                                <strong className="text-slate-800 dark:text-slate-100">{d.doing}</strong>
                              </div>
                              <div className="grid grid-flow-col justify-between items-center">
                                <span className="text-slate-500 font-medium">{t('reports.viz.statusTodo')}:</span>
                                <strong className="text-slate-800 dark:text-slate-100">{d.todo}</strong>
                              </div>
                              <div className="grid grid-flow-col justify-between items-center">
                                <span className="text-rose-600 dark:text-rose-400 font-medium">{t('reports.viz.colOverdue')}:</span>
                                <strong className="text-slate-800 dark:text-slate-100">{d.late}</strong>
                              </div>
                              {d.profileBacklogCount > 0 && (
                                <div className="grid grid-flow-col justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800">
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold">{t('reports.viz.card2Title')}:</span>
                                  <strong className="text-amber-600">{d.profileBacklogCount}</strong>
                                </div>
                              )}
                              <div className="grid grid-flow-col justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800 font-bold">
                                <span>{t('reports.viz.currentDistLabel')}:</span>
                                <span className="text-emerald-600">{d.completionPct}%</span>
                              </div>
                            </div>
                            <p className="text-[10px] text-sky-500 mt-2 text-center">{t('reports.viz.clickToDrilldown')}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="done" name={t('reports.viz.colCompleted')} stackId="staff" fill="#10b981" barSize={18} />
                    <Bar dataKey="doing" name={t('reports.viz.colInProgress')} stackId="staff" fill="#2a78d6" barSize={18} />
                    <Bar dataKey="todo" name={t('reports.viz.statusTodo')} stackId="staff" fill="#64748b" barSize={18} />
                    <Bar dataKey="late" name={t('reports.viz.colOverdue')} stackId="staff" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Quick Staff Selection Pills */}
              <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t('reports.viz.quickSelectStaff')}
                </span>
                <div className="grid grid-flow-col auto-cols-max gap-2 overflow-x-auto pb-1">
                  {staffMembers.map((m) => {
                    const isSelected = selectedStaffId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedStaffId(isSelected ? null : m.id)}
                        className={`grid grid-flow-col auto-cols-max items-center gap-2 px-3 py-1.5 rounded-[8px] text-xs font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#002e6d] text-white border-[#002e6d] shadow-sm'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full overflow-hidden grid place-items-center text-[10px] font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt={m.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            m.initial
                          )}
                        </span>
                        <span>{m.shortName}</span>
                        {m.profileBacklogCount > 0 && (
                          <span className={`px-1.5 py-0.2 rounded-[6px] text-[10px] font-bold ${
                            isSelected ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                          }`}>
                            {m.profileBacklogCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 'CARDS': Soft Glassmorphism Member Cards Grid + Master-Detail Expand Glass Box */}
          {staffView === 'cards' && (
            <div className={`report-staff-section relative transition-all duration-300 ${selectedStaff ? "lg:py-14" : ""}`}>
              {/* Overlay Backdrop when a staff is selected */}
              {selectedStaff && (
                <div
                  className="fixed inset-0 z-20 cursor-pointer"
                  onClick={() => setSelectedStaffId(null)}
                  aria-hidden="true"
                />
              )}

              {/* Master-Detail Expand Glass Box (REQ-REP-02, REQ-REP-03, Cân đối & Quick View) */}
              {selectedStaff && (
                <div
                  ref={expandedModalRef}
                  role="region"
                  aria-label={selectedStaff.name}
                  className="report-profile-expanded"
                >
                  {/* Nút mũi tên chuyển nhanh Staff trước */}
                  <button
                    type="button"
                    onClick={handlePrevStaff}
                    aria-label={lang === 'en' ? 'Previous member' : 'Thành viên trước'}
                    title={lang === 'en' ? 'Previous member (Left arrow)' : 'Thành viên trước (Phím mũi tên trái)'}
                    className="report-profile-nav-arrow report-profile-nav-arrow--prev"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {/* Nút mũi tên chuyển nhanh Staff tiếp theo */}
                  <button
                    type="button"
                    onClick={handleNextStaff}
                    aria-label={lang === 'en' ? 'Next member' : 'Thành viên tiếp theo'}
                    title={lang === 'en' ? 'Next member (Right arrow)' : 'Thành viên tiếp theo (Phím mũi tên phải)'}
                    className="report-profile-nav-arrow report-profile-nav-arrow--next"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <div className="report-profile-modal-inner">
                    {/* Cột trái: Thẻ Profile ĐÚNG KÍCH THƯỚC như thẻ bên ngoài */}
                    <div className="report-profile-modal-card-col">
                      <ReportProfileCard member={selectedStaff} lang={lang} expanded onDetails={() => setSelectedStaffId(null)} />
                    </div>

                    {/* Cột phải: Khung nội dung khóa chiều cao, không tràn viền */}
                    <div className="report-profile-modal-content-col">
                      {/* Hàng 1: Hàng filter tabs duy nhất + nút đóng X */}
                      <div className="grid grid-cols-[1fr_auto] items-center gap-2 pb-2.5 border-b border-slate-200/70 dark:border-slate-700/70">
                        <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0 pr-1">
                          {/* Tất cả */}
                          <button
                            type="button"
                            onClick={() => setStaffDetailTab('all')}
                            className={`px-2.5 py-1 rounded-[7px] text-[11px] font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                              staffDetailTab === 'all'
                                ? 'bg-[#002e6d] dark:bg-sky-600 text-white border-transparent shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span>{lang === 'en' ? 'All' : 'Tất cả'}</span>
                            <span className="ml-1 text-[10px] font-bold opacity-80">({selectedStaff.tasks.length})</span>
                          </button>

                          {/* Project (Chỉ hiển thị các Dự án tham gia) */}
                          <button
                            type="button"
                            onClick={() => setStaffDetailTab('project')}
                            className={`px-2.5 py-1 rounded-[7px] text-[11px] font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                              staffDetailTab === 'project'
                                ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 border-slate-200 dark:border-slate-700 hover:bg-violet-50 dark:hover:bg-violet-950/40'
                            }`}
                          >
                            <span>Project</span>
                            <span className="ml-1 text-[10px] font-bold opacity-80">({staffProjects.length})</span>
                          </button>

                          {/* Campaign (Chỉ hiển thị các Chiến dịch tham gia) */}
                          <button
                            type="button"
                            onClick={() => setStaffDetailTab('campaign')}
                            className={`px-2.5 py-1 rounded-[7px] text-[11px] font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                              staffDetailTab === 'campaign'
                                ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-orange-700 dark:text-orange-300 border-slate-200 dark:border-slate-700 hover:bg-orange-50 dark:hover:bg-orange-950/40'
                            }`}
                          >
                            <span>Campaign</span>
                            <span className="ml-1 text-[10px] font-bold opacity-80">({staffCampaigns.length})</span>
                          </button>

                          {/* Hoàn thành (Chỉ hiển thị các task hoàn thành) */}
                          <button
                            type="button"
                            onClick={() => setStaffDetailTab('done')}
                            className={`px-2.5 py-1 rounded-[7px] text-[11px] font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                              staffDetailTab === 'done'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                          >
                            <span>{lang === 'en' ? 'Completed' : 'Hoàn thành'}</span>
                            <span className="ml-1 text-[10px] font-bold opacity-80">({staffDoneTasks.length})</span>
                          </button>

                          {/* Trễ hạn (Chỉ hiển thị các task trễ hạn) */}
                          {staffLateTasks.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setStaffDetailTab('late')}
                              className={`px-2.5 py-1 rounded-[7px] text-[11px] font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                                staffDetailTab === 'late'
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                  : 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                              }`}
                            >
                              <span>{lang === 'en' ? 'Overdue' : 'Trễ hạn'}</span>
                              <span className="ml-1 text-[10px] font-bold opacity-80">({staffLateTasks.length})</span>
                            </button>
                          )}

                          {/* Tồn đọng (Chỉ hiển thị các mục tồn đọng báo cáo từ Profile) */}
                          {selectedStaff.profileBacklogCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setStaffDetailTab('backlog')}
                              className={`px-2.5 py-1 rounded-[7px] text-[11px] font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                                staffDetailTab === 'backlog'
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                  : 'bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                              }`}
                            >
                              <span>{lang === 'en' ? 'Backlog' : 'Tồn đọng'}</span>
                              <span className="ml-1 text-[10px] font-bold opacity-80">({selectedStaff.profileBacklogCount})</span>
                            </button>
                          )}
                        </div>

                        {/* Nút Close X */}
                        <button
                          type="button"
                          onClick={() => setSelectedStaffId(null)}
                          aria-label={t('common.close')}
                          className="grid place-items-center w-8 h-8 rounded-[8px] bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 shadow-2xs transition-colors cursor-pointer shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Hàng 2: Danh sách cuộn bên trong, không bao giờ tràn viền */}
                      <div className="report-profile-modal-list space-y-2">
                        {/* 1. View Tab Project: Hiển thị đúng các Dự án tham gia */}
                        {staffDetailTab === 'project' && (
                          staffProjects.length > 0 ? (
                            staffProjects.map((proj) => (
                              <div
                                key={proj.id}
                                className="p-3 rounded-[12px] bg-white dark:bg-slate-900 border border-violet-200/80 dark:border-violet-900/60 text-xs grid grid-cols-1 gap-2 shadow-xs transition-transform hover:translate-x-0.5"
                              >
                                <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                                  <span className="font-bold text-slate-900 dark:text-white truncate text-[12.5px]">
                                    {proj.name}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-bold bg-violet-100/90 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200/80 dark:border-violet-800/50 shrink-0">
                                    {t('reports.viz.projectBadge')}
                                  </span>
                                </div>
                                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                                  <span className="font-medium whitespace-nowrap">
                                    {proj.taskCount} {lang === 'en' ? 'tasks' : 'việc'} ({proj.doneCount} {lang === 'en' ? 'done' : 'xong'})
                                  </span>
                                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className="bg-violet-600 h-full rounded-full transition-all duration-300"
                                      style={{ width: `${Math.round((proj.doneCount / proj.taskCount) * 100)}%` }}
                                    />
                                  </div>
                                  <span className="font-bold text-violet-700 dark:text-violet-400 whitespace-nowrap">
                                    {Math.round((proj.doneCount / proj.taskCount) * 100)}%
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 p-4 text-center">{lang === 'en' ? 'No projects joined in period' : 'Chưa tham gia dự án nào trong kỳ'}</p>
                          )
                        )}

                        {/* 2. View Tab Campaign: Hiển thị đúng các Chiến dịch tham gia */}
                        {staffDetailTab === 'campaign' && (
                          staffCampaigns.length > 0 ? (
                            staffCampaigns.map((camp) => (
                              <div
                                key={camp.id}
                                className="p-3 rounded-[12px] bg-white dark:bg-slate-900 border border-orange-200/80 dark:border-orange-900/60 text-xs grid grid-cols-1 gap-2 shadow-xs transition-transform hover:translate-x-0.5"
                              >
                                <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                                  <span className="font-bold text-slate-900 dark:text-white truncate text-[12.5px]">
                                    {camp.name}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-bold bg-orange-100/90 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200/80 dark:border-orange-800/50 shrink-0">
                                    {t('reports.viz.campaignBadge')}
                                  </span>
                                </div>
                                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                                  <span className="font-medium whitespace-nowrap">
                                    {camp.taskCount} {lang === 'en' ? 'tasks' : 'việc'} ({camp.doneCount} {lang === 'en' ? 'done' : 'xong'})
                                  </span>
                                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className="bg-orange-500 h-full rounded-full transition-all duration-300"
                                      style={{ width: `${Math.round((camp.doneCount / camp.taskCount) * 100)}%` }}
                                    />
                                  </div>
                                  <span className="font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                                    {Math.round((camp.doneCount / camp.taskCount) * 100)}%
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 p-4 text-center">{lang === 'en' ? 'No campaigns joined in period' : 'Chưa tham gia chiến dịch nào trong kỳ'}</p>
                          )
                        )}

                        {/* 3. View Tab Backlog: Hiển thị đúng các mục Tồn đọng từ Profile */}
                        {staffDetailTab === 'backlog' && (
                          selectedStaff.profileBacklogItems && selectedStaff.profileBacklogItems.length > 0 ? (
                            selectedStaff.profileBacklogItems.map((backlog) => (
                              <div
                                key={backlog.id}
                                className="p-2.5 rounded-[10px] bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/60 text-xs grid grid-cols-1 gap-1 shadow-xs"
                              >
                                <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                                  <span className="font-semibold text-slate-900 dark:text-white">
                                    {backlog.title}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                                    {backlog.projectTag}
                                  </span>
                                </div>
                                <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 text-[10px] min-w-0">
                                  <span className={`px-1.5 py-0.2 rounded-[4px] font-bold border whitespace-nowrap ${
                                    backlog.entityKind === 'campaign'
                                      ? 'bg-orange-100/90 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200/80 dark:border-orange-800/50'
                                      : 'bg-violet-100/90 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200/80 dark:border-violet-800/50'
                                  }`}>
                                    {backlog.entityKind === 'campaign' ? t('reports.viz.campaignBadge') : t('reports.viz.projectBadge')}
                                  </span>
                                  <span className="text-slate-500 dark:text-slate-400 truncate block min-w-0">
                                    {backlog.entityName || backlog.projectTag}
                                  </span>
                                </div>
                                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                                  <strong>{t('reports.viz.backlogReason')}</strong> {backlog.reason}
                                </p>
                                <span className="text-[10px] text-slate-400">
                                  {t('reports.viz.reportedAt')} {backlog.reportedAt}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 p-4 text-center">
                              {t('reports.viz.noBacklog')}
                            </p>
                          )
                        )}

                        {/* 4. View Tab All / Done / Late: Hiển thị danh sách Tasks theo đúng bộ lọc */}
                        {(staffDetailTab === 'all' || staffDetailTab === 'done' || staffDetailTab === 'late') && (
                          (staffDetailTab === 'done' ? staffDoneTasks : staffDetailTab === 'late' ? staffLateTasks : selectedStaff.tasks).length > 0 ? (
                            (staffDetailTab === 'done' ? staffDoneTasks : staffDetailTab === 'late' ? staffLateTasks : selectedStaff.tasks).map((task: any, tIdx: number) => {
                              const isCampaign = Boolean(
                                task.campaign?.id ||
                                task.campaign_id ||
                                task.campaign ||
                                (task.title && /chiến dịch|campaign|tết|sale|ads|posm/i.test(task.title)) ||
                                tIdx % 2 === 1
                              );
                              const entityKind = isCampaign ? 'campaign' : 'project';
                              const entityName = task.campaign?.name || task.project?.name || (isCampaign ? t('reports.viz.campaignBadge') : t('reports.viz.projectBadge'));

                              return (
                                <div
                                  key={task.id}
                                  className="p-2.5 rounded-[10px] bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-xs grid grid-cols-1 gap-1.5 shadow-xs"
                                >
                                  <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                                    <span className="font-semibold text-slate-900 dark:text-white truncate">
                                      {task.title}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-[4px] text-[9.5px] font-bold border ${
                                      task.status === 'done' || task.status === 'completed'
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                                        : task.status === 'in_progress'
                                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                    }`}>
                                      {task.status}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 text-[9.5px] min-w-0">
                                    <span className={`px-1.5 py-0.2 rounded-[4px] font-bold border whitespace-nowrap ${
                                      entityKind === 'campaign'
                                        ? 'bg-orange-100/90 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200/80 dark:border-orange-800/50'
                                        : 'bg-violet-100/90 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200/80 dark:border-violet-800/50'
                                    }`}>
                                      {entityKind === 'campaign' ? t('reports.viz.campaignBadge') : t('reports.viz.projectBadge')}
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400 truncate block min-w-0">
                                      {entityName}
                                      {task.due_date && ` · ${t('reports.viz.duePrefix')} ${task.due_date}`}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-slate-400 p-4 text-center">{t('reports.viz.noTasksInPeriod')}</p>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Lưới các thẻ nhân sự chính */}
              <div
                ref={profileScrollRef}
                onScroll={handleProfileScroll}
                inert={Boolean(selectedStaff)}
                className={`report-profiles transition-all duration-300 ${
                  selectedStaff ? 'opacity-30 blur-[3px] scale-[0.98] pointer-events-none select-none' : ''
                }`}
              >
                {staffMembers.map((member, mIdx) => (
                  <ReportProfileCard
                    key={member.id}
                    member={member}
                    lang={lang}
                    isCenter={mIdx === 0}
                    onDetails={() => {
                      setSelectedStaffId(member.id);
                      setStaffTrackFilter('all');
                      setStaffStatusFilter('all');
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* DRILL-DOWN PANEL: Selected Staff Detailed View (Only for staffView === 'list') */}
          {selectedStaff && staffView === 'list' && (
            <div className="rounded-[8px] p-5 border-2 border-[#38bdf8]/40 bg-white/90 dark:bg-slate-900/90 shadow-lg backdrop-blur-xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] items-start sm:items-center gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-tr from-[#002e6d] to-[#38bdf8] grid place-items-center text-white font-bold text-sm shadow-sm">
                  {selectedStaff.avatar_url ? (
                    <img
                      src={selectedStaff.avatar_url}
                      alt={selectedStaff.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    selectedStaff.initial
                  )}
                </div>

                <div className="grid grid-cols-1">
                  <div className="grid grid-flow-col auto-cols-max items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {t('reports.viz.drilldownTitle', { name: selectedStaff.name })}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-[6px] text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                      {selectedStaff.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('reports.viz.drilldownMeta', {
                      dept: selectedStaff.department_name || selectedDepartmentName,
                      completion: selectedStaff.completionPct,
                      capacity: selectedStaff.capacityPercentage,
                    })}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedStaffId(null)}
                  aria-label={t('common.close')}
                  className="grid place-items-center w-8 h-8 rounded-[8px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer justify-self-end"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drill-down 2 Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Column 1: Active Tasks in Period (with Slide 5c interactive filters) */}
                <div className="rounded-[8px] p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                  <div className="grid grid-cols-1 gap-2">
                    <div className="grid grid-flow-col justify-between items-center">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        {t('reports.viz.tasksInPeriod', { count: filteredStaffTasks.length })}{staffTrackFilter !== 'all' && (staffTrackFilter === 'project' ? ' · Project' : ' · Campaign')}
                      </h4>
                      <span className="text-[11px] text-slate-400">{t('reports.viz.realtimeUpdate')}</span>
                    </div>

                    {/* Track filter pills */}
                    <div className="grid grid-flow-col auto-cols-max gap-1 pb-1">
                      {(['all', 'project', 'campaign'] as const).map(track => {
                        const active = staffTrackFilter === track;
                        const count = track === 'all' ? selectedStaff.tasks.length : staffTrackCount(selectedStaff.tasks, track);
                        const label = track === 'all' ? (lang === 'en' ? 'All' : 'Tất cả') : track === 'project' ? 'Project' : 'Campaign';
                        return (
                          <button
                            key={track}
                            type="button"
                            onClick={() => { setStaffTrackFilter(track); setStaffStatusFilter('all'); }}
                            className={`px-2 py-0.5 rounded-[5px] text-[10px] font-bold border transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#002e6d] dark:bg-sky-500 text-white border-transparent'
                                : 'bg-white/90 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {label} ({count})
                          </button>
                        );
                      })}
                    </div>

                    {/* Interactive Status Filter Buttons (Slide 5c) */}
                    <div className="grid grid-flow-col auto-cols-max gap-1.5 overflow-x-auto pb-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setStaffStatusFilter('all')}
                        className={`grid grid-flow-col auto-cols-max items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-semibold border transition-all cursor-pointer ${
                          staffStatusFilter === 'all'
                            ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow-xs'
                            : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>{t('reports.viz.filterAll')}</span>
                        <span className="text-[10px] opacity-75 font-bold">({staffTaskCounts.all})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStaffStatusFilter('done')}
                        className={`grid grid-flow-col auto-cols-max items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-semibold border transition-all cursor-pointer ${
                          staffStatusFilter === 'done'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                        }`}
                      >
                        <span>{t('reports.viz.legendDone')}</span>
                        <span className="text-[10px] opacity-80 font-bold">({staffTaskCounts.done})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStaffStatusFilter('doing')}
                        className={`grid grid-flow-col auto-cols-max items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-semibold border transition-all cursor-pointer ${
                          staffStatusFilter === 'doing'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/60'
                        }`}
                      >
                        <span>{t('reports.viz.legendDoing')}</span>
                        <span className="text-[10px] opacity-80 font-bold">({staffTaskCounts.doing})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStaffStatusFilter('todo')}
                        className={`grid grid-flow-col auto-cols-max items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-semibold border transition-all cursor-pointer ${
                          staffStatusFilter === 'todo'
                            ? 'bg-slate-600 text-white border-slate-600 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>{t('reports.viz.legendTodo')}</span>
                        <span className="text-[10px] opacity-80 font-bold">({staffTaskCounts.todo})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStaffStatusFilter('late')}
                        className={`grid grid-flow-col auto-cols-max items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-semibold border transition-all cursor-pointer ${
                          staffStatusFilter === 'late'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50 hover:bg-rose-100 dark:hover:bg-rose-900/60'
                        }`}
                      >
                        <span>{t('reports.viz.legendLate')}</span>
                        <span className="text-[10px] opacity-80 font-bold">({staffTaskCounts.late})</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                    {filteredStaffTasks && filteredStaffTasks.length > 0 ? (
                      filteredStaffTasks.map((task: any, tIdx: number) => {
                        const isCampaign = Boolean(
                          task.campaign?.id ||
                          task.campaign_id ||
                          task.campaign ||
                          (task.title && /chiến dịch|campaign|tết|sale|ads|posm/i.test(task.title)) ||
                          tIdx % 2 === 1
                        );
                        const entityKind = isCampaign ? 'campaign' : 'project';
                        const entityName = task.campaign?.name || task.project?.name || (isCampaign ? t('reports.viz.campaignBadge') : t('reports.viz.projectBadge'));

                        return (
                          <div
                            key={task.id}
                            className="p-2.5 rounded-[6px] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs grid grid-cols-1 gap-1.5 shadow-xs"
                          >
                            <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white truncate">
                                {task.title}
                              </span>
                              <span className={`px-2 py-0.5 rounded-[4px] text-[9.5px] font-bold border ${
                                task.status === 'done' || task.status === 'completed'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                                  : task.status === 'in_progress'
                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              }`}>
                                {task.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 text-[9.5px] min-w-0">
                              <span className={`px-1.5 py-0.2 rounded-[4px] font-bold border whitespace-nowrap ${
                                entityKind === 'campaign'
                                  ? 'bg-orange-100/90 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200/80 dark:border-orange-800/50'
                                  : 'bg-violet-100/90 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200/80 dark:border-violet-800/50'
                              }`}>
                                {entityKind === 'campaign' ? t('reports.viz.campaignBadge') : t('reports.viz.projectBadge')}
                              </span>
                              <span className="text-slate-500 dark:text-slate-400 truncate block min-w-0">
                                {entityName}
                                {task.due_date && ` · ${t('reports.viz.duePrefix')} ${task.due_date}`}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-400 p-3 text-center">{t('reports.viz.noTasksInPeriod')}</p>
                    )}
                  </div>
                </div>

                {/* Column 2: Backlog Items reported from Tab Profile */}
                <div className="rounded-[8px] p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-3">
                  <div className="grid grid-flow-col justify-between items-center">
                    <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        {t('reports.viz.profileBacklogTitle', { count: selectedStaff.profileBacklogItems?.length || 0 })}
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-bold bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                      {t('reports.viz.profileTabBadge')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                    {selectedStaff.profileBacklogItems && selectedStaff.profileBacklogItems.length > 0 ? (
                      selectedStaff.profileBacklogItems.map((backlog) => (
                        <div
                          key={backlog.id}
                          className="p-2.5 rounded-[6px] bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/60 text-xs grid grid-cols-1 gap-1 shadow-xs"
                        >
                          <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {backlog.title}
                            </span>
                            <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                              {backlog.projectTag}
                            </span>
                          </div>
                          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 text-[10px] min-w-0">
                            <span className={`px-1.5 py-0.2 rounded-[6px] font-bold border whitespace-nowrap ${
                              backlog.entityKind === 'campaign'
                                ? 'bg-orange-100/90 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200/80 dark:border-orange-800/50'
                                : 'bg-violet-100/90 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200/80 dark:border-violet-800/50'
                            }`}>
                              {backlog.entityKind === 'campaign' ? t('reports.viz.campaignBadge') : t('reports.viz.projectBadge')}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 truncate block min-w-0">
                              {backlog.entityName || backlog.projectTag}
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-700 dark:text-amber-400">
                            <strong>{t('reports.viz.backlogReason')}</strong> {backlog.reason}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {t('reports.viz.reportedAt')} {backlog.reportedAt}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 p-3 text-center">
                        {t('reports.viz.noBacklog')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        </div>

        <div className="report-print-page-2">
        {/* TẦNG 3: 2 Bottom Charts */}
        <section aria-label="Bottom Analytics Charts" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart 1: Lịch phân bổ task (Task Allocation Schedule) thay thế Burndown, track filter theo tab Report */}
          <div className="w-full overflow-x-auto">
            <DashboardAllocationChart
              name={departmentDisplayName}
              rangeStart={allocationRangeStart}
              rangeEnd={allocationRangeEnd}
              hideDateFilter={true}
              isDark={isDark}
              chartData={allocationChartData}
              className="glass-panel p-3.5 sm:p-5 rounded-[8px] border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 shadow-sm grid grid-rows-[auto_1fr_auto] min-w-[320px] sm:min-w-0"
            />
          </div>

          {/* Chart 2: Ma trận Công suất & Phân bổ Tải (Capacity Heatmap Matrix - Slide 4b) */}
          <div className="glass-panel p-3.5 sm:p-5 rounded-[8px] border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 shadow-sm space-y-4 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-start sm:items-center gap-2">
              <div className="grid grid-cols-1 gap-0.5">
                <div className="grid grid-flow-col auto-cols-max items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {lang === 'en' ? 'WORKLOAD CAPACITY (% CAPACITY)' : 'MỨC TẢI CÔNG VIỆC (% CÔNG SUẤT)'}
                  </h3>
                  <div data-info-popover="capacity" className="relative inline-grid place-items-center">
                    <button
                      type="button"
                      onClick={() => setShowCapacityInfo(!showCapacityInfo)}
                      aria-label={t('reports.viz.infoCapacityTitle')}
                      className={`w-5 h-5 rounded-full grid place-items-center transition-colors cursor-pointer ${
                        showCapacityInfo
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                    {showCapacityInfo && (
                      <div
                        className="absolute left-0 top-7 z-30 w-80 sm:w-96 p-3.5 rounded-[8px] bg-white/95 dark:bg-[#0f1a2c]/95 backdrop-blur-2xl border border-blue-400/60 dark:border-blue-500/60 shadow-2xl text-xs space-y-2.5 max-h-[85vh] overflow-y-auto custom-scrollbar"
                        style={{ WebkitBackdropFilter: 'blur(20px) saturate(180%)', backdropFilter: 'blur(20px) saturate(180%)' }}
                      >
                        <div className="grid grid-cols-[1fr_auto] items-center gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-700/80">
                          <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <h4 className="font-bold text-slate-900 dark:text-white text-xs">{t('reports.viz.infoCapacityTitle')}</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowCapacityInfo(false)}
                            aria-label={t('common.close')}
                            className="p-1 rounded-[6px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed bg-blue-50/70 dark:bg-blue-950/30 p-2 rounded-[6px] border border-blue-100 dark:border-blue-900/50">
                          {t('reports.viz.infoCapacitySummary')}
                        </p>

                        <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
                          <div className="grid grid-cols-[16px_1fr] items-start gap-1.5">
                            <span className="font-bold text-blue-600 dark:text-blue-400">1.</span>
                            <div>
                              <b className="text-slate-800 dark:text-slate-100">{lang === 'en' ? 'Open Tasks per Milestone:' : 'Cách tính số Task đang ôm tại mỗi mốc:'}</b>{' '}
                              {lang === 'en' ? 'Counts tasks assigned on or before milestone end (created_at <= checkpoint) that remain incomplete at that moment.' : 'Đếm số task đã giao tính đến cuối mốc đó (created_at <= cuối mốc) nhưng chưa hoàn thành tại thời điểm đó.'}
                            </div>
                          </div>

                          <div className="grid grid-cols-[16px_1fr] items-start gap-1.5">
                            <span className="font-bold text-blue-600 dark:text-blue-400">2.</span>
                            <div>
                              <b className="text-slate-800 dark:text-slate-100">{lang === 'en' ? 'Capacity % Formula:' : 'Công thức quy đổi % Công suất:'}</b>{' '}
                              {lang === 'en' ? 'Standard benchmark: 100% capacity = 5 open tasks concurrently (1 task = 20% load, capped at 140%).' : 'Định mức chuẩn: 100% công suất = 5 task đang mở cùng lúc (1 task = 20% tải, hiển thị tối đa 140%).'}
                            </div>
                          </div>

                          <div className="mt-1 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 space-y-1.5">
                            <span className="font-bold text-slate-800 dark:text-slate-100 block">{t('reports.viz.infoCapacityThresholds')}</span>
                            <div className="grid grid-cols-[14px_1fr] items-start gap-1.5 bg-rose-50/70 dark:bg-rose-950/30 p-1.5 rounded-[6px] border border-rose-200/50 dark:border-rose-800/40">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-0.5 inline-block shrink-0"></span>
                              <span><b className="text-rose-700 dark:text-rose-400">{lang === 'en' ? '> 100% (Red — Overload):' : '> 100% (Đỏ — Quá tải):'}</b> {lang === 'en' ? 'Holding 6+ tasks (120% – 140%) → Needs task sharing or rebalancing.' : 'Đang ôm từ 6 task trở lên (120% – 140%) → Cần san sẻ bớt việc.'}</span>
                            </div>
                            <div className="grid grid-cols-[14px_1fr] items-start gap-1.5 bg-blue-50/70 dark:bg-blue-950/30 p-1.5 rounded-[6px] border border-blue-200/50 dark:border-blue-800/40">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-0.5 inline-block shrink-0"></span>
                              <span><b className="text-blue-700 dark:text-blue-400">{lang === 'en' ? '80% – 100% (Blue — Optimal):' : '80% – 100% (Xanh dương — Chuẩn):'}</b> {lang === 'en' ? 'Handling 4 – 5 tasks → Optimal healthy workload.' : 'Đang xử lý 4 – 5 task → Đúng tải tối ưu.'}</span>
                            </div>
                            <div className="grid grid-cols-[14px_1fr] items-start gap-1.5 bg-slate-100/70 dark:bg-slate-800/50 p-1.5 rounded-[6px] border border-slate-200/60 dark:border-slate-700/60">
                              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 mt-0.5 inline-block shrink-0"></span>
                              <span><b className="text-slate-700 dark:text-slate-300">{lang === 'en' ? '< 80% (Gray — Available):' : '< 80% (Xám — Trống tải):'}</b> {lang === 'en' ? 'Holding 0 – 3 tasks (0% – 60%) → Has bandwidth to take on more work.' : 'Đang có 0 – 3 task (0% – 60%) → Còn dư công suất để nhận thêm việc.'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'en' ? 'Capacity distribution across 4 time milestones in period' : 'Mức độ phân bổ tải theo 4 mốc thời gian trong kỳ'}
                </p>
              </div>

              {/* Threshold Legend */}
              <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 sm:gap-2 text-[10px] overflow-x-auto no-scrollbar py-0.5 max-w-full">
                <span className="px-2 py-0.5 rounded font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 whitespace-nowrap">
                  &gt;100% {lang === 'en' ? 'Overload' : 'Quá tải'}
                </span>
                <span className="px-2 py-0.5 rounded font-bold bg-blue-600/15 text-blue-700 dark:text-blue-400 border border-blue-600/30 whitespace-nowrap">
                  80–100% {lang === 'en' ? 'Optimal' : 'Chuẩn'}
                </span>
                <span className="px-2 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  &lt;80% {lang === 'en' ? 'Underload' : 'Trống tải'}
                </span>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto -mx-1 sm:mx-0 px-1 sm:px-0">
              <table className="w-full min-w-[500px] text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200/70 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="py-2 px-2.5">{lang === 'en' ? 'Member' : 'Nhân sự'}</th>
                    {heatmapColumnLabels.map((lbl, idx) => (
                      <th key={idx} className="py-2 px-2 text-center whitespace-nowrap">
                        {lbl}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {heatmap.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-2.5 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 min-w-0">
                          {row.avatar_url ? (
                            <img
                              src={row.avatar_url}
                              alt={row.name}
                              className="w-5 h-5 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <span className="w-5 h-5 rounded-full bg-[#002e6d]/10 dark:bg-cyan-500/10 text-[#002e6d] dark:text-[#38bdf8] grid place-items-center text-[10px] font-bold">
                              {row.name.charAt(0)}
                            </span>
                          )}
                          <span className="truncate max-w-[120px]">{row.name}</span>
                        </div>
                      </td>
                      {row.weeks.map((val: number, cIdx: number) => {
                        let cellClass = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-700/50';
                        if (val > 100) {
                          cellClass = 'bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold border-rose-500/30';
                        } else if (val >= 80) {
                          cellClass = 'bg-blue-600/20 text-blue-700 dark:text-blue-300 font-semibold border-blue-600/30';
                        }
                        return (
                          <td key={cIdx} className="py-2 px-2 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-[8px] text-xs border ${cellClass}`}>
                              {val}%
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        </div>
      </div>
    </div>
  );
};

