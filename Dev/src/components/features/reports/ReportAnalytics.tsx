import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReports } from '../../../hooks/useReports';
import type { TimeRange, StaffReportMember } from '../../../hooks/useReports';
import {
  LineChart,
  Line,
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
} from 'lucide-react';

interface ReportAnalyticsProps {
  standalone?: boolean;
}

export const ReportAnalytics: React.FC<ReportAnalyticsProps> = ({ standalone = false }) => {
  const navigate = useNavigate();
  const {
    isLoading,
    error,
    refetch,
    timeRange,
    setTimeRange,
    departmentFilter,
    setDepartmentFilter,
    departments,
    canViewAllDepartments,
    selectedDepartmentName,
    periodLabelVi,
    teamCards,
    staffMembers,
    burndown,
    heatmap,
    heatmapColumnLabels,
    exportCSV,
    openVisualizeReport,
  } = useReports();

  const [staffView, setStaffView] = useState<'list' | 'cards'>('list');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const selectedStaff: StaffReportMember | null = useMemo(() => {
    if (!selectedStaffId) return null;
    return staffMembers.find((m) => m.id === selectedStaffId) || null;
  }, [staffMembers, selectedStaffId]);

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
          <p className="text-sm font-medium">Đang tải dữ liệu Báo cáo Visualize...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="glass-panel m-6 p-6 rounded-2xl border border-rose-300/60 dark:border-rose-900/60 text-sm text-rose-600 dark:text-rose-400">
        <div className="grid grid-flow-col auto-cols-max items-center gap-3 mb-3">
          <ShieldAlert className="w-6 h-6 text-rose-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Không thể tải báo cáo</h3>
        </div>
        <p className="mb-4 text-slate-700 dark:text-slate-300">{error}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="grid grid-flow-col auto-cols-max items-center gap-2 px-4 py-2 rounded-xl bg-[#002e6d] text-white hover:bg-[#002250] text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Thử lại</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`w-full ${standalone ? 'min-h-screen bg-slate-50/50 dark:bg-[#0b1120]' : 'p-4 lg:p-6'} space-y-6`}>
      {/* Top Bar for Standalone Visualize Mode */}
      {standalone && (
        <header className="sticky top-0 z-30 w-full border-b border-slate-200/70 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/85 backdrop-blur-xl px-4 lg:px-8 py-3.5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-4 max-w-[1600px] mx-auto">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Quay lại Dashboard"
              className="grid grid-flow-col auto-cols-max items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#002e6d] dark:text-[#38bdf8]" />
              <span>Quay lại Dashboard</span>
            </button>

            <div className="grid justify-items-start md:justify-items-center">
              <div className="grid grid-flow-col auto-cols-max items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#002e6d]/10 dark:bg-cyan-500/10 border border-[#002e6d]/20 dark:border-cyan-400/30 text-[11px] font-bold tracking-wider text-[#002e6d] dark:text-[#38bdf8] uppercase">
                  K COFFEE
                </span>
                <h1 className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  BÁO CÁO TRỰC QUAN (VISUALIZE)
                </h1>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Toàn màn hình · Phân tích hiệu suất & phụ thuộc công việc
              </p>
            </div>

            <div className="grid grid-flow-col auto-cols-max items-center gap-2.5 justify-self-end">
              <button
                type="button"
                onClick={() => void refetch()}
                aria-label="Tải lại dữ liệu"
                title="Tải lại dữ liệu"
                className="grid place-items-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={exportCSV}
                className="grid grid-flow-col auto-cols-max items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#002e6d] hover:bg-[#002250] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất CSV</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Container */}
      <div className={`${standalone ? 'max-w-[1600px] mx-auto px-4 lg:px-8 py-6' : ''} space-y-6`}>
        {/* Header Toolbar & Global Filters */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] items-start lg:items-center gap-4">
            <div className="grid grid-cols-1 gap-1">
              <div className="grid grid-flow-col auto-cols-max items-center gap-2">
                <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white">
                  Báo cáo Visualize · {selectedDepartmentName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                  Live
                </span>
              </div>
              <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400">
                Kỳ đánh giá: <strong className="text-slate-700 dark:text-slate-200">{periodLabelVi}</strong> · Phân tích khối lượng, tiến độ và tồn đọng công việc
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-flow-col sm:auto-cols-max items-center gap-3">
              {/* Department Selector */}
              {canViewAllDepartments ? (
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 shadow-sm">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    aria-label="Lọc theo phòng ban"
                    className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="all">Toàn bộ công ty</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedDepartmentName}</span>
                </div>
              )}

              {/* Time Range Pills */}
              <div className="grid grid-flow-col auto-cols-max gap-1 p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80">
                {(
                  [
                    ['week', 'Tuần'],
                    ['month', 'Tháng'],
                    ['quarter', 'Quý'],
                    ['year', 'Năm'],
                  ] as Array<[TimeRange, string]>
                ).map(([range, label]) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      timeRange === range
                        ? 'bg-[#002e6d] text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Visualize Button (shown when embedded in /reports) */}
              {!standalone && (
                <button
                  type="button"
                  onClick={() => openVisualizeReport()}
                  className="grid grid-flow-col auto-cols-max items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#002e6d] to-[#0047a5] hover:from-[#002250] hover:to-[#003882] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Report</span>
                </button>
              )}

              {/* Export CSV button */}
              {!standalone && (
                <button
                  type="button"
                  onClick={exportCSV}
                  className="grid grid-flow-col auto-cols-max items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Xuất CSV</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* TẦNG 1: 4 Team Performance Cards */}
        <section aria-label="Team Performance Cards" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {/* Card 1: Tổng Task trong filter & Hoàn thành */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm grid grid-rows-[auto_auto_1fr] gap-3 hover:border-blue-400/50 dark:hover:border-blue-500/50 transition-colors">
            {/* Hàng 1: Header */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 min-h-[36px]">
              <div className="grid grid-cols-[32px_1fr] items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="grid grid-cols-1 min-w-0">
                  <h3 className="text-[11px] font-bold uppercase tracking-tight text-gray-800 dark:text-gray-100 leading-tight whitespace-nowrap">
                    Tổng việc & Hoàn thành
                  </h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">Trong kỳ {periodLabelVi}</p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40 whitespace-nowrap">
                {teamCards.completionRate}%
              </span>
            </div>

            {/* Hàng 2: Số lớn + Thanh visualize + Sub-caption */}
            <div className="grid grid-cols-1 gap-1.5">
              <div className="grid grid-cols-[1fr_auto] items-baseline gap-2">
                <div className="grid grid-flow-col auto-cols-max items-baseline gap-1.5">
                  <b className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {teamCards.completedTasks}
                  </b>
                  <span className="text-sm font-semibold text-gray-400">
                    / {teamCards.totalTasks} công việc
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {teamCards.completionRate}%
                </span>
              </div>

              {/* Visualize Bar */}
              <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden my-1">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, teamCards.completionRate)}%` }}
                />
              </div>

              {/* Sub-caption */}
              <div className="grid grid-cols-[1fr_auto] items-center text-[11px] text-gray-500 dark:text-gray-400">
                <span>Đã hoàn thành {teamCards.completedTasks} việc</span>
                <span>Còn lại {Math.max(0, teamCards.totalTasks - teamCards.completedTasks)} việc</span>
              </div>
            </div>

            {/* Hàng 3: Footer detail */}
            <div className="pt-2.5 border-t border-gray-100 dark:border-slate-700/70 grid content-start gap-1.5">
              <div className="px-2.5 py-1.5 rounded-lg bg-gray-50/80 dark:bg-slate-700/40 border border-gray-200/60 dark:border-slate-700/60 grid grid-cols-[1fr_auto] items-center gap-2 text-[11px]">
                <span className="text-gray-500 dark:text-gray-400">Biến động kỳ lọc</span>
                <span className={teamCards.completionIsPositive ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                  {teamCards.completionDelta}
                </span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-gray-50/80 dark:bg-slate-700/40 border border-gray-200/60 dark:border-slate-700/60 grid grid-cols-[1fr_auto] items-center gap-2 text-[11px]">
                <span className="text-gray-500 dark:text-gray-400">Phân bổ hiện tại</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  {teamCards.completedTasks} xong · {teamCards.inProgressTasks} đang làm
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Task tồn đọng (reported from Tab Profile) */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm grid grid-rows-[auto_auto_1fr] gap-3 hover:border-amber-400/50 dark:hover:border-amber-500/50 transition-colors">
            {/* Hàng 1: Header */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 min-h-[36px]">
              <div className="grid grid-cols-[32px_1fr] items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="grid grid-cols-1 min-w-0">
                  <h3 className="text-[11px] font-bold uppercase tracking-tight text-gray-800 dark:text-gray-100 leading-tight whitespace-nowrap">
                    Các Task Tồn Đọng
                  </h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">Báo cáo từ Tab Profile</p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40 whitespace-nowrap">
                {teamCards.highSeverityBacklogCount} ưu tiên cao
              </span>
            </div>

            {/* Hàng 2: Số lớn + Thanh visualize + Sub-caption */}
            <div className="grid grid-cols-1 gap-1.5">
              <div className="grid grid-cols-[1fr_auto] items-baseline gap-2">
                <div className="grid grid-flow-col auto-cols-max items-baseline gap-1.5">
                  <b className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                    {teamCards.backlogCount}
                  </b>
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    việc tồn đọng
                  </span>
                </div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {teamCards.staffWithBacklogCount} nhân sự
                </span>
              </div>

              {/* Visualize Bar: Phân bổ High vs Medium severity */}
              <div
                className="w-full h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden grid my-1"
                style={{
                  gridTemplateColumns: `${Math.max(teamCards.highSeverityBacklogCount, 0)}fr ${Math.max(0, teamCards.backlogCount - teamCards.highSeverityBacklogCount)}fr`,
                }}
              >
                {teamCards.highSeverityBacklogCount > 0 && (
                  <div
                    className="h-full w-full bg-amber-500"
                    title={`Ưu tiên cao: ${teamCards.highSeverityBacklogCount}`}
                  />
                )}
                {teamCards.backlogCount - teamCards.highSeverityBacklogCount > 0 && (
                  <div
                    className="h-full w-full bg-amber-300 dark:bg-amber-700"
                    title={`Trung bình: ${teamCards.backlogCount - teamCards.highSeverityBacklogCount}`}
                  />
                )}
              </div>

              {/* Sub-caption */}
              <div className="grid grid-cols-[1fr_auto] items-center text-[11px] text-gray-500 dark:text-gray-400">
                <span>Ưu tiên cao: {teamCards.highSeverityBacklogCount} việc</span>
                <span>Trung bình: {Math.max(0, teamCards.backlogCount - teamCards.highSeverityBacklogCount)} việc</span>
              </div>
            </div>

            {/* Hàng 3: Footer detail */}
            <div className="pt-2.5 border-t border-gray-100 dark:border-slate-700/70 grid content-start gap-1.5">
              {teamCards.backlogItems.length > 0 ? (
                teamCards.backlogItems.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    title={`${item.title} — Lý do: ${item.reason}`}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/60 dark:border-amber-800/40 grid grid-cols-[1fr_auto] items-center gap-2 text-[11px]"
                  >
                    <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold whitespace-nowrap">
                      {item.projectTag}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-2.5 py-1.5 rounded-lg bg-gray-50/80 dark:bg-slate-700/40 border border-gray-200/60 dark:border-slate-700/60 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium text-center">
                  ✓ Không có việc tồn đọng
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Project & Campaign Team tham gia */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm grid grid-rows-[auto_auto_1fr] gap-3 hover:border-cyan-400/50 dark:hover:border-cyan-500/50 transition-colors">
            {/* Hàng 1: Header */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 min-h-[36px]">
              <div className="grid grid-cols-[32px_1fr] items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 grid place-items-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="grid grid-cols-1 min-w-0">
                  <h3 className="text-[11px] font-bold uppercase tracking-tight text-gray-800 dark:text-gray-100 leading-tight whitespace-nowrap">
                    Project & Campaign
                  </h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">Đang tham gia triển khai</p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/40 whitespace-nowrap">
                {teamCards.totalTracks} tracks
              </span>
            </div>

            {/* Hàng 2: Số lớn + Thanh visualize + Sub-caption */}
            <div className="grid grid-cols-1 gap-1.5">
              <div className="grid grid-cols-[1fr_auto] items-baseline gap-2">
                <div className="grid grid-flow-col auto-cols-max items-baseline gap-1.5">
                  <b className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {teamCards.totalTracks}
                  </b>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    ({teamCards.projectsCount} Dự án · {teamCards.campaignsCount} Chiến dịch)
                  </span>
                </div>
                <span className="text-xs font-bold text-[#093570] dark:text-blue-400">
                  {teamCards.avgTrackProgress}%
                </span>
              </div>

              {/* Visualize Bar */}
              <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden my-1">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#093570] to-[#2a78d6] transition-all duration-500"
                  style={{ width: `${Math.min(100, teamCards.avgTrackProgress)}%` }}
                />
              </div>

              {/* Sub-caption */}
              <div className="grid grid-cols-[1fr_auto] items-center text-[11px] text-gray-500 dark:text-gray-400">
                <span>Tiến độ triển khai trung bình</span>
                <span>
                  {teamCards.tracksAtRiskCount > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">{teamCards.tracksAtRiskCount} cần chú ý</span>
                  ) : (
                    'Đúng tiến độ'
                  )}
                </span>
              </div>
            </div>

            {/* Hàng 3: Footer detail */}
            <div className="pt-2.5 border-t border-gray-100 dark:border-slate-700/70 grid content-start gap-1.5">
              {teamCards.tracks.length > 0 ? (
                teamCards.tracks.slice(0, 2).map((tr) => (
                  <div
                    key={tr.id}
                    className="px-2.5 py-1.5 rounded-lg bg-gray-50/80 dark:bg-slate-700/40 border border-gray-200/60 dark:border-slate-700/60 grid grid-cols-[auto_1fr_auto] items-center gap-2 text-[11px]"
                  >
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      tr.kind === 'project'
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                        : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                    }`}>
                      {tr.kind === 'project' ? 'Dự án' : 'Chiến dịch'}
                    </span>
                    <span className="truncate font-medium text-slate-800 dark:text-slate-200" title={tr.name}>
                      {tr.name}
                    </span>
                    <span className="text-[11px] font-bold text-[#093570] dark:text-blue-400">
                      {tr.progress}%
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-2.5 py-1.5 rounded-lg bg-gray-50/80 dark:bg-slate-700/40 border border-gray-200/60 dark:border-slate-700/60 text-[11px] text-gray-400 text-center">
                  Chưa có chương trình nào
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Tiếp tục đang làm (In Progress & Active) */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm grid grid-rows-[auto_auto_1fr] gap-3 hover:border-indigo-400/50 dark:hover:border-indigo-500/50 transition-colors">
            {/* Hàng 1: Header */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 min-h-[36px]">
              <div className="grid grid-cols-[32px_1fr] items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 grid place-items-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="grid grid-cols-1 min-w-0">
                  <h3 className="text-[11px] font-bold uppercase tracking-tight text-gray-800 dark:text-gray-100 leading-tight whitespace-nowrap">
                    Tiếp Tục Đang Làm
                  </h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">Đang làm & Cần xử lý</p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40 whitespace-nowrap">
                {teamCards.activeOpenTotal} việc mở
              </span>
            </div>

            {/* Hàng 2: Số lớn + Thanh visualize + Sub-caption */}
            <div className="grid grid-cols-1 gap-1.5">
              <div className="grid grid-cols-[1fr_auto] items-baseline gap-2">
                <div className="grid grid-flow-col auto-cols-max items-baseline gap-1.5">
                  <b className="text-2xl font-bold tracking-tight text-[#2a78d6] dark:text-blue-400">
                    {teamCards.inProgressTasks}
                  </b>
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    đang thực hiện
                  </span>
                </div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {teamCards.inProgressPct}% việc mở
                </span>
              </div>

              {/* Visualize Bar: Phân bổ 3 màu liền mạch dùng gridTemplateColumns */}
              <div
                className="w-full h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden grid my-1"
                style={{
                  gridTemplateColumns: `${Math.max(teamCards.inProgressTasks, 0)}fr ${Math.max(teamCards.todoTasks, 0)}fr ${Math.max(teamCards.overdueTasks, 0)}fr`,
                }}
              >
                {teamCards.inProgressTasks > 0 && (
                  <div className="h-full w-full bg-[#2a78d6]" title={`Đang làm: ${teamCards.inProgressTasks}`} />
                )}
                {teamCards.todoTasks > 0 && (
                  <div className="h-full w-full bg-slate-400 dark:bg-slate-500" title={`Cần làm: ${teamCards.todoTasks}`} />
                )}
                {teamCards.overdueTasks > 0 && (
                  <div className="h-full w-full bg-rose-500" title={`Quá hạn: ${teamCards.overdueTasks}`} />
                )}
              </div>

              {/* Sub-caption */}
              <div className="grid grid-cols-[1fr_auto] items-center text-[11px] text-gray-500 dark:text-gray-400">
                <span>+{teamCards.todoTasks} chờ thực hiện</span>
                <span className={teamCards.overdueTasks > 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}>
                  {teamCards.overdueTasks} quá hạn
                </span>
              </div>
            </div>

            {/* Hàng 3: Footer detail */}
            <div className="pt-2.5 border-t border-gray-100 dark:border-slate-700/70 grid grid-cols-3 gap-1.5">
              <div className="py-1.5 px-2 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 text-center">
                <b className="block text-xs font-bold text-blue-700 dark:text-blue-300">{teamCards.inProgressTasks}</b>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Đang làm</span>
              </div>
              <div className="py-1.5 px-2 rounded-lg bg-gray-50/80 dark:bg-slate-700/40 border border-gray-200/60 dark:border-slate-700/60 text-center">
                <b className="block text-xs font-bold text-slate-700 dark:text-slate-300">{teamCards.todoTasks}</b>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Cần làm</span>
              </div>
              <div className="py-1.5 px-2 rounded-lg bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 text-center">
                <b className="block text-xs font-bold text-rose-700 dark:text-rose-300">{teamCards.overdueTasks}</b>
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Quá hạn</span>
              </div>
            </div>
          </div>
        </section>

        {/* TẦNG 2: Staff Performance & Workload */}
        <section aria-label="Staff Performance Block" className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 shadow-sm space-y-5">
          {/* Section Header */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-start md:items-center gap-4">
            <div className="grid grid-cols-1 gap-1">
              <div className="grid grid-flow-col auto-cols-max items-center gap-2">
                <h2 className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white">
                  PHÂN BỔ TRẠNG THÁI CÔNG VIỆC THEO THÀNH VIÊN
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {staffMembers.length} nhân sự
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Theo dõi tiến độ hoàn thành, nhiệm vụ mở và báo cáo tồn đọng từ Tab Profile của từng thành viên
              </p>
            </div>

            <div className="grid grid-flow-col auto-cols-max items-center gap-4">
              {/* Legend */}
              <div className="hidden sm:grid grid-flow-col auto-cols-max items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  <span>Hoàn thành</span>
                </div>
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2a78d6]" />
                  <span>Đang làm</span>
                </div>
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" />
                  <span>Cần làm</span>
                </div>
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                  <span>Trễ hạn</span>
                </div>
              </div>

              {/* View Switcher Buttons */}
              <div className="grid grid-flow-col auto-cols-max gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setStaffView('list')}
                  aria-label="Xem dạng biểu đồ cột xếp chồng"
                  title="Biểu đồ xếp chồng"
                  className={`grid grid-flow-col auto-cols-max items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    staffView === 'list'
                      ? 'bg-[#002e6d] text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Biểu đồ ngang</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStaffView('cards')}
                  aria-label="Xem dạng lưới thẻ nhân sự"
                  title="Lưới thẻ nhân sự"
                  className={`grid grid-flow-col auto-cols-max items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    staffView === 'cards'
                      ? 'bg-[#002e6d] text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Thẻ nhân sự</span>
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
                    data={staffMembers}
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
                          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-3.5 shadow-xl backdrop-blur-md text-xs min-w-[200px]">
                            <p className="font-bold text-slate-900 dark:text-white">{d.name}</p>
                            <p className="text-[11px] text-slate-500 mb-2">{d.role}</p>
                            <div className="grid grid-cols-1 gap-1 text-[11px]">
                              <div className="grid grid-flow-col justify-between items-center">
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Hoàn thành:</span>
                                <strong className="text-slate-800 dark:text-slate-100">{d.done}</strong>
                              </div>
                              <div className="grid grid-flow-col justify-between items-center">
                                <span className="text-blue-600 dark:text-blue-400 font-medium">Đang làm:</span>
                                <strong className="text-slate-800 dark:text-slate-100">{d.doing}</strong>
                              </div>
                              <div className="grid grid-flow-col justify-between items-center">
                                <span className="text-slate-500 font-medium">Cần làm:</span>
                                <strong className="text-slate-800 dark:text-slate-100">{d.todo}</strong>
                              </div>
                              <div className="grid grid-flow-col justify-between items-center">
                                <span className="text-rose-600 dark:text-rose-400 font-medium">Trễ hạn:</span>
                                <strong className="text-slate-800 dark:text-slate-100">{d.late}</strong>
                              </div>
                              {d.profileBacklogCount > 0 && (
                                <div className="grid grid-flow-col justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800">
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold">Các Task Tồn Đọng:</span>
                                  <strong className="text-amber-600">{d.profileBacklogCount}</strong>
                                </div>
                              )}
                              <div className="grid grid-flow-col justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800 font-bold">
                                <span>Tỷ lệ hoàn thành:</span>
                                <span className="text-emerald-600">{d.completionPct}%</span>
                              </div>
                            </div>
                            <p className="text-[10px] text-sky-500 mt-2 text-center">Bấm để xem chi tiết drill-down</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="done" name="Hoàn thành" stackId="staff" fill="#10b981" barSize={18} />
                    <Bar dataKey="doing" name="Đang làm" stackId="staff" fill="#2a78d6" barSize={18} />
                    <Bar dataKey="todo" name="Cần làm" stackId="staff" fill="#64748b" barSize={18} />
                    <Bar dataKey="late" name="Trễ hạn" stackId="staff" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Quick Staff Selection Pills */}
              <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Chọn nhân sự để mở chi tiết công việc & tồn đọng Profile:
                </span>
                <div className="grid grid-flow-col auto-cols-max gap-2 overflow-x-auto pb-1">
                  {staffMembers.map((m) => {
                    const isSelected = selectedStaffId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedStaffId(isSelected ? null : m.id)}
                        className={`grid grid-flow-col auto-cols-max items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#002e6d] text-white border-[#002e6d] shadow-sm'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          {m.initial}
                        </span>
                        <span>{m.shortName}</span>
                        {m.profileBacklogCount > 0 && (
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
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

          {/* VIEW 'CARDS': Grid of Staff Cards */}
          {staffView === 'cards' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {staffMembers.map((m) => {
                const isSelected = selectedStaffId === m.id;
                const capacityColor =
                  m.capacityPercentage > 100
                    ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
                    : m.capacityPercentage >= 80
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                    : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800';

                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl p-4 border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/20 dark:bg-blue-950/30 shadow-md'
                        : 'border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                    }`}
                    onClick={() => setSelectedStaffId(isSelected ? null : m.id)}
                  >
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#002e6d] to-[#38bdf8] grid place-items-center text-white font-bold text-xs shadow-sm">
                        {m.initial}
                      </div>

                      <div className="grid grid-cols-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {m.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">{m.role}</p>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        {m.completionPct}%
                      </span>
                    </div>

                    {/* 4 Mini Stat Badges */}
                    <div className="grid grid-cols-4 gap-1 text-center py-2 px-1 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl mb-3 text-[11px]">
                      <div>
                        <span className="block text-emerald-600 dark:text-emerald-400 font-bold">{m.done}</span>
                        <span className="text-[10px] text-slate-400">Xong</span>
                      </div>
                      <div>
                        <span className="block text-blue-600 dark:text-blue-400 font-bold">{m.doing}</span>
                        <span className="text-[10px] text-slate-400">Làm</span>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-bold">{m.todo}</span>
                        <span className="text-[10px] text-slate-400">Chờ</span>
                      </div>
                      <div>
                        <span className="block text-rose-600 dark:text-rose-400 font-bold">{m.late}</span>
                        <span className="text-[10px] text-slate-400">Trễ</span>
                      </div>
                    </div>

                    {/* Profile Backlog Alert Box if any */}
                    {m.profileBacklogCount > 0 ? (
                      <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-[11px] grid gap-1.5 mb-3 text-amber-800 dark:text-amber-300">
                        <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          <span className="font-semibold">
                            {m.profileBacklogCount} việc tồn đọng (Tab Profile)
                          </span>
                        </div>
                        <div className="grid gap-1 pt-1 border-t border-amber-200/50 dark:border-amber-900/30">
                          {m.profileBacklogItems.slice(0, 2).map((item) => (
                            <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-1.5 text-[10px]">
                              <span className="truncate text-slate-700 dark:text-slate-300 font-medium" title={item.title}>
                                • {item.title}
                              </span>
                              <span className="text-amber-600 dark:text-amber-400 font-semibold whitespace-nowrap">
                                {item.projectTag}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-[11px] text-slate-400 text-center mb-3">
                        Không có backlog từ Profile
                      </div>
                    )}

                    {/* Capacity Indicator */}
                    <div className="grid grid-cols-[1fr_auto] items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="text-slate-500 text-[11px]">Công suất tải</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${capacityColor}`}>
                        {m.capacityPercentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* DRILL-DOWN PANEL: Selected Staff Detailed View */}
          {selectedStaff && (
            <div className="rounded-2xl p-5 border-2 border-[#38bdf8]/40 bg-white/90 dark:bg-slate-900/90 shadow-lg backdrop-blur-xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] items-start sm:items-center gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#002e6d] to-[#38bdf8] grid place-items-center text-white font-bold text-sm shadow-sm">
                  {selectedStaff.initial}
                </div>

                <div className="grid grid-cols-1">
                  <div className="grid grid-flow-col auto-cols-max items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Chi tiết nhân sự: {selectedStaff.name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                      {selectedStaff.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedStaff.department_name || selectedDepartmentName} · Tỷ lệ hoàn thành {selectedStaff.completionPct}% · Công suất {selectedStaff.capacityPercentage}%
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedStaffId(null)}
                  aria-label="Đóng chi tiết nhân sự"
                  className="grid place-items-center w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer justify-self-end"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drill-down 2 Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Column 1: Active Tasks in Period */}
                <div className="rounded-xl p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                  <div className="grid grid-flow-col justify-between items-center">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Nhiệm vụ trong kỳ ({selectedStaff.tasks?.length || 0})
                    </h4>
                    <span className="text-[11px] text-slate-400">Cập nhật thời gian thực</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                    {selectedStaff.tasks && selectedStaff.tasks.length > 0 ? (
                      selectedStaff.tasks.map((task: any) => (
                        <div
                          key={task.id}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs grid grid-cols-1 gap-1"
                        >
                          <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white truncate">
                              {task.title}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              task.status === 'done' || task.status === 'completed'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : task.status === 'in_progress'
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {task.status}
                            </span>
                          </div>
                          <div className="grid grid-flow-col auto-cols-max items-center gap-3 text-[11px] text-slate-400">
                            {task.due_date && <span>Hạn: {task.due_date}</span>}
                            {task.priority && <span>Ưu tiên: {task.priority}</span>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 p-3 text-center">Không có nhiệm vụ nào trong kỳ này.</p>
                    )}
                  </div>
                </div>

                {/* Column 2: Backlog Items reported from Tab Profile */}
                <div className="rounded-xl p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-3">
                  <div className="grid grid-flow-col justify-between items-center">
                    <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        Tồn đọng báo cáo từ Profile ({selectedStaff.profileBacklogItems?.length || 0})
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                      Tab Profile
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                    {selectedStaff.profileBacklogItems && selectedStaff.profileBacklogItems.length > 0 ? (
                      selectedStaff.profileBacklogItems.map((backlog) => (
                        <div
                          key={backlog.id}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/60 text-xs grid grid-cols-1 gap-1"
                        >
                          <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {backlog.title}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                              {backlog.projectTag}
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-700 dark:text-amber-400">
                            <strong>Lý do tồn đọng:</strong> {backlog.reason}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            Ghi nhận: {backlog.reportedAt}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 p-3 text-center">
                        ✓ Nhân sự này không có công việc tồn đọng nào được báo cáo từ Profile.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* TẦNG 3: 2 Bottom Charts */}
        <section aria-label="Bottom Analytics Charts" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart 1: BURNDOWN: TASK CÒN LẠI (Burndown / Burnup trend) */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-start sm:items-center gap-2">
              <div className="grid grid-cols-1 gap-0.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  BURNDOWN: TASK CÒN LẠI
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Đường hoàn thành thực tế (Actual) so với kế hoạch dự kiến (Plan)
                </p>
              </div>

              {/* Legend */}
              <div className="grid grid-flow-col auto-cols-max items-center gap-3 text-xs">
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#2a78d6] rounded-full" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Thực tế</span>
                </div>
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#898781] border-b border-dashed border-[#898781]" />
                  <span className="font-semibold text-slate-500">Kế hoạch</span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={burndown} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-3 shadow-xl backdrop-blur-md text-xs">
                          <p className="font-semibold text-slate-800 dark:text-slate-100 mb-1.5">{label}</p>
                          <div className="grid grid-cols-1 gap-1">
                            {payload.map((entry: any, index: number) => (
                              <div key={index} className="grid grid-flow-col auto-cols-max items-center justify-between gap-3">
                                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                  <span className="text-slate-600 dark:text-slate-300">{entry.name}:</span>
                                </div>
                                <span className="font-bold text-slate-900 dark:text-slate-100">{entry.value} tasks</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="planned"
                    name="Kế hoạch (Plan)"
                    stroke="#898781"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Thực tế (Actual)"
                    stroke="#2a78d6"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#2a78d6' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Ma trận Công suất & Phân bổ Tải (Capacity Heatmap Matrix) */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-start sm:items-center gap-2">
              <div className="grid grid-cols-1 gap-0.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  MỨC TẢI CÔNG VIỆC (% CÔNG SUẤT)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mức độ phân bổ tải theo 4 mốc thời gian trong kỳ
                </p>
              </div>

              {/* Threshold Legend */}
              <div className="grid grid-flow-col auto-cols-max items-center gap-2 text-[10px]">
                <span className="px-2 py-0.5 rounded font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                  &gt;100% Quá tải
                </span>
                <span className="px-2 py-0.5 rounded font-bold bg-blue-600/15 text-blue-700 dark:text-blue-400 border border-blue-600/30">
                  80–100% Chuẩn
                </span>
                <span className="px-2 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  &lt;80% Trống tải
                </span>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200/70 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="py-2 px-2.5">Nhân sự</th>
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
                        <div className="grid grid-flow-col auto-cols-max items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#002e6d]/10 dark:bg-cyan-500/10 text-[#002e6d] dark:text-[#38bdf8] grid place-items-center text-[10px] font-bold">
                            {row.name.charAt(0)}
                          </span>
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
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs border ${cellClass}`}>
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
  );
};

