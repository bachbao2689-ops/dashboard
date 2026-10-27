import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReports } from '../../../hooks/useReports';
import type { TimeRange, StaffReportMember } from '../../../hooks/useReports';
import { useTranslation } from '../../../i18n/translations';
import { FilterPopover } from '../../common/filters/FilterPopover';
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
  ChevronDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

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
    customStart,
    customEnd,
    setCustomDateRange,
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

  // Expandable Box state with auto-closing on outside click
  const [activeExpandedId, setActiveExpandedId] = useState<string | null>(null);
  const toggleExpanded = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveExpandedId((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    if (!activeExpandedId) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest(`[data-expandable-box="${activeExpandedId}"]`)) {
        setActiveExpandedId(null);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [activeExpandedId]);

  // Green markup: Calendar Date Range Popover
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const calendarPanelRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState<number>(() => {
    if (customStart) {
      const d = new Date(customStart);
      if (!isNaN(d.getTime())) return d.getFullYear();
    }
    return today.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    if (customStart) {
      const d = new Date(customStart);
      if (!isNaN(d.getTime())) return d.getMonth();
    }
    return today.getMonth();
  });
  const [tempStart, setTempStart] = useState<string>(customStart || '');
  const [tempEnd, setTempEnd] = useState<string>(customEnd || '');
  const [isPickingEnd, setIsPickingEnd] = useState(false);

  useEffect(() => {
    if (calendarOpen) {
      setTempStart(customStart || '');
      setTempEnd(customEnd || '');
      setIsPickingEnd(false);
      if (customStart) {
        const d = new Date(customStart);
        if (!isNaN(d.getTime())) {
          setViewYear(d.getFullYear());
          setViewMonth(d.getMonth());
        }
      }
    }
  }, [calendarOpen, customStart, customEnd]);

  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  const startOffset = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    return (firstDay + 6) % 7;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const dateStr = `${viewYear}-${m}-${d}`;

    if (!tempStart || (!isPickingEnd && tempEnd)) {
      setTempStart(dateStr);
      setTempEnd('');
      setIsPickingEnd(true);
    } else if (isPickingEnd) {
      if (dateStr < tempStart) {
        setTempStart(dateStr);
        setTempEnd('');
        setIsPickingEnd(true);
      } else {
        setTempEnd(dateStr);
        setIsPickingEnd(false);
      }
    }
  };

  const handleApplyCustomRange = () => {
    if (tempStart) {
      const finalEnd = tempEnd || tempStart;
      setCustomDateRange(tempStart, finalEnd);
      setTimeRange('custom');
      setCalendarOpen(false);
    }
  };

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const monthYearTitle = useMemo(() => {
    if (lang === 'en') {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      return `${monthNames[viewMonth]} ${viewYear}`;
    }
    return `Tháng ${viewMonth + 1}, ${viewYear}`;
  }, [viewMonth, viewYear, lang]);

  const weekDays = lang === 'en'
    ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
    : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

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
          <p className="text-sm font-medium">
            {lang === 'en' ? 'Loading Visualized Report data...' : 'Đang tải dữ liệu Báo cáo Visualize...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="glass-panel m-6 p-6 rounded-2xl border border-rose-300/60 dark:border-rose-900/60 text-sm text-rose-600 dark:text-rose-400">
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
          className="grid grid-flow-col auto-cols-max items-center gap-2 px-4 py-2 rounded-xl bg-[#002e6d] text-white hover:bg-[#002250] text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{lang === 'en' ? 'Retry' : 'Thử lại'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`w-full ${standalone ? 'min-h-screen bg-slate-50/50 dark:bg-[#0b1120]' : 'p-4 lg:p-6'} space-y-6`}>
      {/* Top Bar for Standalone Visualize Mode */}
      {standalone && (
        <header className="sticky top-0 z-30 w-full border-b border-slate-200/70 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 lg:px-8 py-3.5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-4 max-w-[1600px] mx-auto">
            <button
              type="button"
              onClick={handleBack}
              aria-label={t('reports.viz.backDashboard')}
              className="grid grid-flow-col auto-cols-max items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#002e6d] dark:text-[#38bdf8]" />
              <span>{t('reports.viz.backDashboard')}</span>
            </button>

            <div className="grid justify-items-start md:justify-items-center">
              <div className="grid grid-flow-col auto-cols-max items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#002e6d]/10 dark:bg-cyan-500/10 border border-[#002e6d]/20 dark:border-cyan-400/30 text-[11px] font-bold tracking-wider text-[#002e6d] dark:text-[#38bdf8] uppercase">
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
                <span>{t('reports.viz.exportCsv')}</span>
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
                  {t('reports.viz.titlePrefix')} · {selectedDepartmentName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                  Live
                </span>
              </div>
              <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400">
                {t('reports.viz.periodPrefix')} <strong className="text-slate-700 dark:text-slate-200">{periodLabelVi}</strong> · {t('reports.viz.headerDesc')}
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
                    <option value="all">{t('reports.viz.allCompany')}</option>
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

              {/* Time Range Pills + Calendar Custom Range Button (Green markup) */}
              <div className="grid grid-flow-col auto-cols-max gap-1 p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80">
                {(
                  [
                    ['week', lang === 'en' ? 'Week' : 'Tuần'],
                    ['month', lang === 'en' ? 'Month' : 'Tháng'],
                    ['quarter', lang === 'en' ? 'Quarter' : 'Quý'],
                    ['year', lang === 'en' ? 'Year' : 'Năm'],
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

                {/* Calendar Button (Item 5 - Green markup) */}
                <div ref={calendarContainerRef} className="relative inline-grid">
                  <button
                    type="button"
                    onClick={() => setCalendarOpen((prev) => !prev)}
                    aria-label={t('reports.viz.customRange')}
                    title={t('reports.viz.customRange')}
                    className={`grid grid-flow-col auto-cols-max items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      timeRange === 'custom'
                        ? 'bg-[#002e6d] text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    {timeRange === 'custom' && (
                      <span className="text-[11px] font-bold">
                        {customStart && customEnd
                          ? `${formatDateDisplay(customStart).slice(0, 5)} - ${formatDateDisplay(customEnd).slice(0, 5)}`
                          : lang === 'en'
                          ? 'Custom'
                          : 'Tùy chọn'}
                      </span>
                    )}
                  </button>

                  {calendarOpen && (
                    <FilterPopover
                      onClose={() => setCalendarOpen(false)}
                      anchorRef={calendarContainerRef}
                      panelRef={calendarPanelRef}
                      align="right"
                      className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-3.5 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="grid grid-cols-1 gap-3">
                        {/* Month navigation header */}
                        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                          <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="grid place-items-center w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                            aria-label="Previous Month"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="font-bold text-center text-sm text-slate-900 dark:text-white">
                            {monthYearTitle}
                          </span>
                          <button
                            type="button"
                            onClick={handleNextMonth}
                            className="grid place-items-center w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                            aria-label="Next Month"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Display Start / End Date */}
                        <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                          <div className={`p-2 rounded-xl border ${tempStart && !tempEnd ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60'}`}>
                            <span className="block text-[10px] text-slate-400 font-semibold">{t('reports.viz.startDate')}</span>
                            <strong className="text-slate-800 dark:text-slate-100">{formatDateDisplay(tempStart)}</strong>
                          </div>
                          <div className={`p-2 rounded-xl border ${tempEnd ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60'}`}>
                            <span className="block text-[10px] text-slate-400 font-semibold">{t('reports.viz.endDate')}</span>
                            <strong className="text-slate-800 dark:text-slate-100">{formatDateDisplay(tempEnd)}</strong>
                          </div>
                        </div>

                        {/* Weekday headers */}
                        <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-400">
                          {weekDays.map((wd, i) => (
                            <div key={i} className="py-1">
                              {wd}
                            </div>
                          ))}
                        </div>

                        {/* Calendar Days Matrix */}
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {Array.from({ length: startOffset }).map((_, i) => (
                            <div key={`offset-${i}`} className="h-7 w-7" />
                          ))}

                          {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const m = String(viewMonth + 1).padStart(2, '0');
                            const d = String(day).padStart(2, '0');
                            const dateStr = `${viewYear}-${m}-${d}`;
                            const isStart = tempStart === dateStr;
                            const isEnd = tempEnd === dateStr;
                            const inRange = Boolean(tempStart && tempEnd && dateStr > tempStart && dateStr < tempEnd);

                            let btnClass = 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700';
                            if (isStart || isEnd) {
                              btnClass = 'bg-[#002e6d] text-white font-bold shadow-sm';
                            } else if (inRange) {
                              btnClass = 'bg-blue-100/70 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 font-medium';
                            }

                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => handleSelectDate(day)}
                                className={`grid place-items-center h-7 w-7 mx-auto rounded-lg text-xs transition-colors cursor-pointer ${btnClass}`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>

                        {/* Calendar Actions */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => setCalendarOpen(false)}
                            className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                          >
                            {t('common.cancel')}
                          </button>
                          <button
                            type="button"
                            onClick={handleApplyCustomRange}
                            disabled={!tempStart}
                            className={`py-1.5 px-3 rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer ${
                              tempStart
                                ? 'bg-[#002e6d] hover:bg-[#002250] text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {t('profile.apply')}
                          </button>
                        </div>
                      </div>
                    </FilterPopover>
                  )}
                </div>
              </div>

              {/* Visualize Button (shown when embedded in /reports) */}
              {!standalone && (
                <button
                  type="button"
                  onClick={() => openVisualizeReport()}
                  className="grid grid-flow-col auto-cols-max items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#002e6d] to-[#0047a5] hover:from-[#002250] hover:to-[#003882] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{t('reports.viz.viewReport')}</span>
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
                  <span className="hidden sm:inline">{t('reports.viz.exportCsv')}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* TẦNG 1: 4 Team Performance Cards */}
        <section aria-label="Team Performance Cards" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {/* Card 1: Tổng Task trong filter & Hoàn thành */}
          <div
            data-expandable-box="card1"
            className={`min-h-[160px] relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-3.5 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors ${
              activeExpandedId === 'card1' ? 'z-40' : 'z-10'
            }`}
          >
            {/* Header Row: Top-Right Chevron Dropdown */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 mb-2">
              <div className="grid grid-cols-[auto_1fr] items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-[8px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="grid grid-cols-1 min-w-0">
                  <h3 className="text-[11px] font-bold uppercase tracking-tight text-gray-800 dark:text-gray-100 leading-tight whitespace-nowrap truncate">
                    {t('reports.viz.card1Title')}
                  </h3>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    {t('reports.viz.card1Sub', { period: periodLabelVi })}
                  </p>
                </div>
              </div>

              {/* Chevron Button placed at top-right with state border */}
              <button
                type="button"
                onClick={(e) => toggleExpanded('card1', e)}
                aria-label={activeExpandedId === 'card1' ? t('reports.viz.toggleHideStatus') : t('reports.viz.toggleShowStatus')}
                className={`w-6 h-6 rounded-[8px] grid place-items-center transition-all cursor-pointer ${
                  activeExpandedId === 'card1'
                    ? 'border border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/60'
                    : 'border border-transparent bg-slate-100 dark:bg-slate-700/60 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${activeExpandedId === 'card1' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Performance KPI & Visualize Bar (Stays on background) */}
            <div className="grid grid-cols-1 gap-1">
              <div className="grid grid-cols-[1fr_auto] items-baseline gap-2">
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

              <div className="w-full h-2 my-1 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, teamCards.completionRate)}%` }}
                />
              </div>

              <div className="grid grid-cols-[1fr_auto] items-center text-[11px] text-gray-500 dark:text-gray-400">
                <span>{t('reports.viz.doneCount', { count: teamCards.completedTasks })}</span>
                <span>{t('reports.viz.remainingCount', { count: Math.max(0, teamCards.totalTasks - teamCards.completedTasks) })}</span>
              </div>
            </div>

            {/* Floating Glass Dropdown Popup */}
            <div
              role="region"
              aria-label={t('reports.viz.card1Title')}
              className={`absolute left-2.5 right-2.5 top-[48px] z-50 rounded-[10px] bg-slate-50/95 dark:bg-[#0f1a2c]/95 backdrop-blur-xl shadow-[0_14px_34px_-6px_rgba(15,23,42,0.16),0_4px_12px_-2px_rgba(15,23,42,0.06)] dark:shadow-[0_16px_38px_-6px_rgba(0,0,0,0.65)] border border-emerald-400/80 dark:border-emerald-500/80 origin-top transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                activeExpandedId === 'card1'
                  ? 'opacity-100 scale-y-100 translate-y-0 max-h-[220px] p-2.5 pointer-events-auto visible'
                  : 'opacity-0 scale-y-95 -translate-y-1.5 max-h-0 p-0 border-transparent pointer-events-none invisible overflow-hidden'
              }`}
              style={{ WebkitBackdropFilter: 'blur(20px) saturate(180%)', backdropFilter: 'blur(20px) saturate(180%)' }}
            >
              <div className="max-h-[160px] overflow-y-auto pr-0.5 space-y-1.5">
                {teamCards.periodTaskItems && teamCards.periodTaskItems.length > 0 ? (
                  teamCards.periodTaskItems.map((item) => (
                    <div
                      key={item.id}
                      className="px-2 py-1.5 rounded-[8px] bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-[1fr_auto] items-center gap-2 text-[11px] shadow-xs"
                    >
                      <div className="grid grid-cols-1 min-w-0 gap-0.5">
                        <span className="truncate font-semibold text-slate-800 dark:text-slate-100" title={item.title}>
                          {item.title}
                        </span>
                        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 text-[10px] min-w-0">
                          <span className={`px-1.5 py-0.2 rounded-[6px] font-bold border whitespace-nowrap ${
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
                      <span className={`px-1.5 py-0.5 rounded-[6px] text-[10px] font-bold whitespace-nowrap border ${
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
                  <div className="px-2 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-center text-[11px]">
                    {t('reports.viz.noTasksInPeriod')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Task tồn đọng (reported from Tab Profile) */}
          <div
            data-expandable-box="card2"
            className={`min-h-[160px] relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-3.5 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors ${
              activeExpandedId === 'card2' ? 'z-40' : 'z-10'
            }`}
          >
            {/* Header Row: Top-Right Chevron Dropdown */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 mb-2">
              <div className="grid grid-cols-[auto_1fr] items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-[8px] bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="grid grid-cols-1 min-w-0">
                  <h3 className="text-[11px] font-bold uppercase tracking-tight text-gray-800 dark:text-gray-100 leading-tight whitespace-nowrap truncate">
                    {t('reports.viz.card2Title')}
                  </h3>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    {t('reports.viz.card2Sub')}
                  </p>
                </div>
              </div>

              {/* Chevron Button placed at top-right with state border */}
              <button
                type="button"
                onClick={(e) => toggleExpanded('card2', e)}
                aria-label={activeExpandedId === 'card2' ? t('reports.viz.toggleHideStatus') : t('reports.viz.toggleShowStatus')}
                className={`w-6 h-6 rounded-[8px] grid place-items-center transition-all cursor-pointer ${
                  activeExpandedId === 'card2'
                    ? 'border border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50/90 dark:bg-amber-950/60'
                    : 'border border-transparent bg-slate-100 dark:bg-slate-700/60 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${activeExpandedId === 'card2' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Performance KPI & Visualize Bar (Stays on background) */}
            <div className="grid grid-cols-1 gap-1">
              <div className="grid grid-cols-1 items-baseline">
                <div className="grid grid-flow-col auto-cols-max items-baseline gap-1.5">
                  <b className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                    {teamCards.backlogCount}
                  </b>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {t('reports.viz.backlogUnit')}
                  </span>
                </div>
              </div>

              <div
                className="w-full h-2 my-1 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden grid"
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

              <div className="grid grid-cols-[1fr_auto] items-center text-[11px] text-gray-500 dark:text-gray-400">
                <span>{t('reports.viz.highPriorityCount', { count: teamCards.highSeverityBacklogCount })}</span>
                <span>{t('reports.viz.mediumPriorityCount', { count: Math.max(0, teamCards.backlogCount - teamCards.highSeverityBacklogCount) })}</span>
              </div>
            </div>

            {/* Floating Glass Dropdown Popup */}
            <div
              role="region"
              aria-label={t('reports.viz.card2Title')}
              className={`absolute left-2.5 right-2.5 top-[48px] z-50 rounded-[10px] bg-slate-50/95 dark:bg-[#0f1a2c]/95 backdrop-blur-xl shadow-[0_14px_34px_-6px_rgba(15,23,42,0.16),0_4px_12px_-2px_rgba(15,23,42,0.06)] dark:shadow-[0_16px_38px_-6px_rgba(0,0,0,0.65)] border border-amber-400/80 dark:border-amber-500/80 origin-top transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                activeExpandedId === 'card2'
                  ? 'opacity-100 scale-y-100 translate-y-0 max-h-[220px] p-2.5 pointer-events-auto visible'
                  : 'opacity-0 scale-y-95 -translate-y-1.5 max-h-0 p-0 border-transparent pointer-events-none invisible overflow-hidden'
              }`}
              style={{ WebkitBackdropFilter: 'blur(20px) saturate(180%)', backdropFilter: 'blur(20px) saturate(180%)' }}
            >
              <div className="max-h-[160px] overflow-y-auto pr-0.5 space-y-1.5">
                {teamCards.backlogItems && teamCards.backlogItems.length > 0 ? (
                  teamCards.backlogItems.map((item) => (
                    <div
                      key={item.id}
                      title={`${item.title} — ${item.reason}`}
                      className="px-2 py-1.5 rounded-[8px] bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-[1fr_auto] items-center gap-2 text-[11px] shadow-xs"
                    >
                      <div className="grid grid-cols-1 min-w-0 gap-0.5">
                        <span className="truncate font-semibold text-slate-800 dark:text-slate-100">
                          {item.title}
                        </span>
                        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 text-[10px] min-w-0">
                          <span className={`px-1.5 py-0.2 rounded-[6px] font-bold border whitespace-nowrap ${
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
                      <span className="px-1.5 py-0.5 rounded-[6px] text-[10px] text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 border border-amber-200 dark:border-amber-800/50 font-bold whitespace-nowrap">
                        {item.projectTag}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="px-2 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-800/50 text-emerald-600 dark:text-emerald-400 font-medium text-center text-[11px]">
                    {t('reports.viz.noBacklog')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Project & Campaign Team tham gia */}
          <div
            data-expandable-box="card3"
            className={`min-h-[160px] relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-3.5 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors ${
              activeExpandedId === 'card3' ? 'z-40' : 'z-10'
            }`}
          >
            {/* Header Row: Top-Right Chevron Dropdown */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 mb-2">
              <div className="grid grid-cols-[auto_1fr] items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-[8px] bg-violet-500/10 text-violet-600 dark:text-violet-400 grid place-items-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="grid grid-cols-1 min-w-0">
                  <h3 className="text-[11px] font-bold uppercase tracking-tight text-gray-800 dark:text-gray-100 leading-tight whitespace-nowrap truncate">
                    {t('reports.viz.card3Title')}
                  </h3>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    {t('reports.viz.card3Sub')}
                  </p>
                </div>
              </div>

              {/* Chevron Button placed at top-right with state border */}
              <button
                type="button"
                onClick={(e) => toggleExpanded('card3', e)}
                aria-label={activeExpandedId === 'card3' ? t('reports.viz.toggleHideStatus') : t('reports.viz.toggleShowStatus')}
                className={`w-6 h-6 rounded-[8px] grid place-items-center transition-all cursor-pointer ${
                  activeExpandedId === 'card3'
                    ? 'border border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50/90 dark:bg-violet-950/60'
                    : 'border border-transparent bg-slate-100 dark:bg-slate-700/60 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${activeExpandedId === 'card3' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Performance KPI & Visualize Bar (Stays on background) */}
            <div className="grid grid-cols-1 gap-1">
              <div className="grid grid-cols-[1fr_auto] items-baseline gap-2">
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

              <div className="w-full h-2 my-1 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#093570] to-[#2a78d6] transition-all duration-500"
                  style={{ width: `${Math.min(100, teamCards.avgTrackProgress)}%` }}
                />
              </div>

              <div className="grid grid-cols-[1fr_auto] items-center text-[11px] text-gray-500 dark:text-gray-400">
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
              className={`absolute left-2.5 right-2.5 top-[48px] z-50 rounded-[10px] bg-slate-50/95 dark:bg-[#0f1a2c]/95 backdrop-blur-xl shadow-[0_14px_34px_-6px_rgba(15,23,42,0.16),0_4px_12px_-2px_rgba(15,23,42,0.06)] dark:shadow-[0_16px_38px_-6px_rgba(0,0,0,0.65)] border border-violet-400/80 dark:border-violet-500/80 origin-top transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                activeExpandedId === 'card3'
                  ? 'opacity-100 scale-y-100 translate-y-0 max-h-[220px] p-2.5 pointer-events-auto visible'
                  : 'opacity-0 scale-y-95 -translate-y-1.5 max-h-0 p-0 border-transparent pointer-events-none invisible overflow-hidden'
              }`}
              style={{ WebkitBackdropFilter: 'blur(20px) saturate(180%)', backdropFilter: 'blur(20px) saturate(180%)' }}
            >
              <div className="max-h-[160px] overflow-y-auto pr-0.5 space-y-1.5">
                {teamCards.tracks && teamCards.tracks.length > 0 ? (
                  teamCards.tracks.map((tr) => (
                    <div
                      key={tr.id}
                      className="px-2 py-1.5 rounded-[8px] bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-[11px] shadow-xs"
                    >
                      {/* Standard Dashboard colors: Project = Violet, Campaign = Orange */}
                      <span className={`px-1.5 py-0.5 rounded-[6px] text-[10px] font-bold border whitespace-nowrap ${
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
                  <div className="px-2 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-800/50 text-gray-400 text-center text-[11px]">
                    {t('reports.viz.noTracks')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 4: Tiếp tục đang làm (In Progress & Active) */}
          <div
            data-expandable-box="card4"
            className={`min-h-[160px] relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-3.5 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors ${
              activeExpandedId === 'card4' ? 'z-40' : 'z-10'
            }`}
          >
            {/* Header Row: Top-Right Chevron Dropdown */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 mb-2">
              <div className="grid grid-cols-[auto_1fr] items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-[8px] bg-blue-500/10 text-blue-600 dark:text-blue-400 grid place-items-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="grid grid-cols-1 min-w-0">
                  <h3 className="text-[11px] font-bold uppercase tracking-tight text-gray-800 dark:text-gray-100 leading-tight whitespace-nowrap truncate">
                    {t('reports.viz.card4Title')}
                  </h3>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    {t('reports.viz.card4Sub')}
                  </p>
                </div>
              </div>

              {/* Chevron Button placed at top-right with state border */}
              <button
                type="button"
                onClick={(e) => toggleExpanded('card4', e)}
                aria-label={activeExpandedId === 'card4' ? t('reports.viz.toggleHideStatus') : t('reports.viz.toggleShowStatus')}
                className={`w-6 h-6 rounded-[8px] grid place-items-center transition-all cursor-pointer ${
                  activeExpandedId === 'card4'
                    ? 'border border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/60'
                    : 'border border-transparent bg-slate-100 dark:bg-slate-700/60 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${activeExpandedId === 'card4' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Performance KPI & Visualize Bar (Stays on background) */}
            <div className="grid grid-cols-1 gap-1">
              <div className="grid grid-cols-[1fr_auto] items-baseline gap-2">
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

              <div
                className="w-full h-2 my-1 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden grid"
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

              <div className="grid grid-cols-[1fr_auto] items-center text-[11px] text-gray-500 dark:text-gray-400">
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
              className={`absolute left-2.5 right-2.5 top-[48px] z-50 rounded-[10px] bg-slate-50/95 dark:bg-[#0f1a2c]/95 backdrop-blur-xl shadow-[0_14px_34px_-6px_rgba(15,23,42,0.16),0_4px_12px_-2px_rgba(15,23,42,0.06)] dark:shadow-[0_16px_38px_-6px_rgba(0,0,0,0.65)] border border-blue-400/80 dark:border-blue-500/80 origin-top transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                activeExpandedId === 'card4'
                  ? 'opacity-100 scale-y-100 translate-y-0 max-h-[220px] p-2.5 pointer-events-auto visible'
                  : 'opacity-0 scale-y-95 -translate-y-1.5 max-h-0 p-0 border-transparent pointer-events-none invisible overflow-hidden'
              }`}
              style={{ WebkitBackdropFilter: 'blur(20px) saturate(180%)', backdropFilter: 'blur(20px) saturate(180%)' }}
            >
              {/* 3 Compact Status Pills Row */}
              <div className="grid grid-cols-3 gap-1 mb-1.5">
                <div className="px-1.5 py-0.5 rounded-[6px] bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 grid grid-cols-[1fr_auto] items-center gap-1 text-[10px]">
                  <span className="text-blue-600 dark:text-blue-400 font-medium truncate">{t('reports.viz.statusDoing')}</span>
                  <b className="font-bold text-blue-700 dark:text-blue-300">{teamCards.inProgressTasks}</b>
                </div>
                <div className="px-1.5 py-0.5 rounded-[6px] bg-gray-50/80 dark:bg-slate-700/40 border border-gray-200/60 dark:border-slate-700/60 grid grid-cols-[1fr_auto] items-center gap-1 text-[10px]">
                  <span className="text-gray-500 dark:text-gray-400 font-medium truncate">{t('reports.viz.statusTodo')}</span>
                  <b className="font-bold text-slate-700 dark:text-slate-300">{teamCards.todoTasks}</b>
                </div>
                <div className="px-1.5 py-0.5 rounded-[6px] bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 grid grid-cols-[1fr_auto] items-center gap-1 text-[10px]">
                  <span className="text-rose-600 dark:text-rose-400 font-medium truncate">{t('reports.viz.statusOverdue')}</span>
                  <b className="font-bold text-rose-700 dark:text-rose-300">{teamCards.overdueTasks}</b>
                </div>
              </div>

              {/* Scrollable list of open tasks */}
              <div className="max-h-[140px] overflow-y-auto pr-0.5 space-y-1.5">
                {teamCards.openTaskItems && teamCards.openTaskItems.length > 0 ? (
                  teamCards.openTaskItems.map((item) => (
                    <div
                      key={item.id}
                      className="px-2 py-1.5 rounded-[8px] bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-[1fr_auto] items-center gap-2 text-[11px] shadow-xs"
                    >
                      <div className="grid grid-cols-1 min-w-0 gap-0.5">
                        <span className="truncate font-semibold text-slate-800 dark:text-slate-100" title={item.title}>
                          {item.title}
                        </span>
                        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 text-[10px] min-w-0">
                          <span className={`px-1.5 py-0.2 rounded-[6px] font-bold border whitespace-nowrap ${
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
                      <span className={`px-1.5 py-0.5 rounded-[6px] text-[10px] font-bold whitespace-nowrap border ${
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
                  <div className="px-2 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-center text-[11px]">
                    {t('reports.viz.noTasksInPeriod')}
                  </div>
                )}
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
                  {t('reports.viz.staffSectionTitle')}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {t('reports.viz.staffCountBadge', { count: staffMembers.length })}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('reports.viz.staffSectionSub')}
              </p>
            </div>

            <div className="grid grid-flow-col auto-cols-max items-center gap-4">
              {/* Legend */}
              <div className="hidden sm:grid grid-flow-col auto-cols-max items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  <span>{t('reports.viz.legendDone')}</span>
                </div>
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2a78d6]" />
                  <span>{t('reports.viz.legendDoing')}</span>
                </div>
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" />
                  <span>{t('reports.viz.legendTodo')}</span>
                </div>
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                  <span>{t('reports.viz.legendLate')}</span>
                </div>
              </div>

              {/* View Switcher Buttons */}
              <div className="grid grid-flow-col auto-cols-max gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setStaffView('list')}
                  aria-label={t('reports.viz.viewHorizontal')}
                  title={t('reports.viz.viewHorizontal')}
                  className={`grid grid-flow-col auto-cols-max items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
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
                  className={`grid grid-flow-col auto-cols-max items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
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
                        className={`grid grid-flow-col auto-cols-max items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
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

          {/* VIEW 'CARDS': Grid of Staff Cards (Floating Glass Popup, enlarged stats, zero flexbox, rounded-[8px]) */}
          {staffView === 'cards' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {staffMembers.map((m) => {
                const isSelected = selectedStaffId === m.id;
                const isExpanded = activeExpandedId === `staff-${m.id}`;

                return (
                  <div
                    key={m.id}
                    data-expandable-box={`staff-${m.id}`}
                    className={`min-h-[168px] relative rounded-2xl p-3.5 border transition-all cursor-pointer ${
                      isExpanded ? 'z-40' : 'z-10'
                    } ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/20 dark:bg-blue-950/30 shadow-md'
                        : 'border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                    }`}
                    onClick={() => setSelectedStaffId(isSelected ? null : m.id)}
                  >
                    {/* Header: Avatar, Name, Completion % */}
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 mb-2">
                      {m.avatar_url ? (
                        <img
                          src={m.avatar_url}
                          alt={m.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#002e6d] to-[#38bdf8] grid place-items-center text-white font-bold text-xs shadow-sm">
                          {m.initial}
                        </div>
                      )}

                      <div className="grid grid-cols-1 min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {m.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate">
                          {m.role}
                        </p>
                      </div>

                      <span className="px-1.5 py-0.5 rounded-[6px] text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50 whitespace-nowrap">
                        {m.completionPct}%
                      </span>
                    </div>

                    {/* Performance Stats UI (Stays on background) */}
                    <div className="grid grid-cols-1 gap-1.5">
                      {/* 4 Mini Stat Badges: ENLARGED NUMBERS */}
                      <div className="grid grid-cols-4 gap-1 text-center bg-slate-50/80 dark:bg-slate-800/50 rounded-[8px] py-1.5 px-1">
                        <div>
                          <span className="block text-slate-800 dark:text-slate-100 text-lg sm:text-xl font-extrabold tracking-tight leading-tight">{m.total}</span>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate mt-0.5">{t('reports.viz.colTotalTasks')}</span>
                        </div>
                        <div>
                          <span className="block text-emerald-600 dark:text-emerald-400 text-lg sm:text-xl font-extrabold tracking-tight leading-tight">{m.done}</span>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate mt-0.5">{t('reports.viz.colCompleted')}</span>
                        </div>
                        <div>
                          <span className="block text-blue-600 dark:text-blue-400 text-lg sm:text-xl font-extrabold tracking-tight leading-tight">{m.doing}</span>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate mt-0.5">{t('reports.viz.colInProgress')}</span>
                        </div>
                        <div>
                          <span className="block text-rose-600 dark:text-rose-400 text-lg sm:text-xl font-extrabold tracking-tight leading-tight">{m.late}</span>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate mt-0.5">{t('reports.viz.colOverdue')}</span>
                        </div>
                      </div>

                      {/* Backlog Alert or Clean state button (rounded-[8px]) - Single trigger for dropdown */}
                      {m.profileBacklogCount > 0 ? (
                        <div
                          onClick={(e) => toggleExpanded(`staff-${m.id}`, e)}
                          className="rounded-[8px] bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 px-2.5 py-1.5 text-[11px] text-amber-800 dark:text-amber-300 grid grid-cols-[auto_1fr_auto] items-center gap-1.5 font-semibold cursor-pointer hover:bg-amber-100/70 dark:hover:bg-amber-900/50 transition-colors"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          <span className="truncate">{t('reports.viz.profileBacklogBtn', { count: m.profileBacklogCount })}</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      ) : (
                        <div className="py-1.5 px-2 rounded-[8px] bg-slate-50/50 dark:bg-slate-800/30 text-[11px] text-slate-400 text-center">
                          {t('reports.viz.noProfileBacklog')}
                        </div>
                      )}
                    </div>

                    {/* Floating Glass Dropdown Popup for Staff Card - ONLY Profile Backlog */}
                    <div
                      role="region"
                      aria-label={m.name}
                      className={`absolute left-2.5 right-2.5 top-[50px] z-50 rounded-[10px] bg-slate-50/95 dark:bg-[#0f1a2c]/95 backdrop-blur-xl shadow-[0_14px_34px_-6px_rgba(15,23,42,0.16),0_4px_12px_-2px_rgba(15,23,42,0.06)] dark:shadow-[0_16px_38px_-6px_rgba(0,0,0,0.65)] border border-amber-400/80 dark:border-amber-500/80 origin-top transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isExpanded
                          ? 'opacity-100 scale-y-100 translate-y-0 max-h-[220px] p-2.5 pointer-events-auto visible'
                          : 'opacity-0 scale-y-95 -translate-y-1.5 max-h-0 p-0 border-transparent pointer-events-none invisible overflow-hidden'
                      }`}
                      style={{ WebkitBackdropFilter: 'blur(20px) saturate(180%)', backdropFilter: 'blur(20px) saturate(180%)' }}
                    >
                      <div className="max-h-[168px] overflow-y-auto pr-0.5 space-y-1.5">
                        {m.profileBacklogItems && m.profileBacklogItems.length > 0 ? (
                          m.profileBacklogItems.map((item) => (
                            <div
                              key={`backlog-${item.id}`}
                              title={`${item.title} — ${item.reason}`}
                              className="px-2 py-1.5 rounded-[8px] bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-[1fr_auto] items-center gap-2 text-[11px] shadow-xs"
                            >
                              <div className="grid grid-cols-1 min-w-0 gap-0.5">
                                <span className="truncate font-semibold text-slate-800 dark:text-slate-100">
                                  {item.title}
                                </span>
                                <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 text-[10px] min-w-0">
                                  <span className="px-1.5 py-0.2 rounded-[6px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 whitespace-nowrap">
                                    Profile
                                  </span>
                                  <span className={`px-1.5 py-0.2 rounded-[6px] font-bold border whitespace-nowrap ${
                                    item.entityKind === 'campaign'
                                      ? 'bg-orange-100/90 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200/80 dark:border-orange-800/50'
                                      : 'bg-violet-100/90 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200/80 dark:border-violet-800/50'
                                  }`}>
                                    {item.entityKind === 'campaign' ? t('reports.viz.campaignBadge') : t('reports.viz.projectBadge')}
                                  </span>
                                  <span className="text-slate-500 dark:text-slate-400 truncate block min-w-0">
                                    {item.entityName || item.projectTag}
                                  </span>
                                </div>
                              </div>
                              <span className="px-1.5 py-0.5 rounded-[6px] text-[10px] text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 border border-amber-200 dark:border-amber-800/50 font-bold whitespace-nowrap">
                                {item.projectTag}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="px-2 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-center text-[11px]">
                            {t('reports.viz.noProfileBacklog')}
                          </div>
                        )}
                      </div>
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
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
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
                {/* Column 1: Active Tasks in Period */}
                <div className="rounded-[10px] p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                  <div className="grid grid-flow-col justify-between items-center">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {t('reports.viz.tasksInPeriod', { count: selectedStaff.tasks?.length || 0 })}
                    </h4>
                    <span className="text-[11px] text-slate-400">{t('reports.viz.realtimeUpdate')}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                    {selectedStaff.tasks && selectedStaff.tasks.length > 0 ? (
                      selectedStaff.tasks.map((task: any, tIdx: number) => {
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
                            className="p-2.5 rounded-[8px] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs grid grid-cols-1 gap-1.5 shadow-xs"
                          >
                            <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white truncate">
                                {task.title}
                              </span>
                              <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold border ${
                                task.status === 'done' || task.status === 'completed'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                                  : task.status === 'in_progress'
                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              }`}>
                                {task.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 text-[10px] min-w-0">
                              <span className={`px-1.5 py-0.2 rounded-[6px] font-bold border whitespace-nowrap ${
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
                <div className="rounded-[10px] p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-3">
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
                          className="p-2.5 rounded-[8px] bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/60 text-xs grid grid-cols-1 gap-1 shadow-xs"
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

        {/* TẦNG 3: 2 Bottom Charts */}
        <section aria-label="Bottom Analytics Charts" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart 1: BURNDOWN: TASK CÒN LẠI (Burndown / Burnup trend) */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-start sm:items-center gap-2">
              <div className="grid grid-cols-1 gap-0.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {lang === 'en' ? 'BURNDOWN: REMAINING TASKS' : 'BURNDOWN: TASK CÒN LẠI'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'en' ? 'Actual progress vs planned trend' : 'Đường hoàn thành thực tế (Actual) so với kế hoạch dự kiến (Plan)'}
                </p>
              </div>

              {/* Legend */}
              <div className="grid grid-flow-col auto-cols-max items-center gap-3 text-xs">
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#2a78d6] rounded-full" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'en' ? 'Actual' : 'Thực tế'}
                  </span>
                </div>
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#898781] border-b border-dashed border-[#898781]" />
                  <span className="font-semibold text-slate-500">
                    {lang === 'en' ? 'Plan' : 'Kế hoạch'}
                  </span>
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
                    name={lang === 'en' ? 'Plan' : 'Kế hoạch (Plan)'}
                    stroke="#898781"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name={lang === 'en' ? 'Actual' : 'Thực tế (Actual)'}
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
                  {lang === 'en' ? 'WORKLOAD CAPACITY (% CAPACITY)' : 'MỨC TẢI CÔNG VIỆC (% CÔNG SUẤT)'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'en' ? 'Capacity distribution across 4 time milestones in period' : 'Mức độ phân bổ tải theo 4 mốc thời gian trong kỳ'}
                </p>
              </div>

              {/* Threshold Legend */}
              <div className="grid grid-flow-col auto-cols-max items-center gap-2 text-[10px]">
                <span className="px-2 py-0.5 rounded font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                  &gt;100% {lang === 'en' ? 'Overload' : 'Quá tải'}
                </span>
                <span className="px-2 py-0.5 rounded font-bold bg-blue-600/15 text-blue-700 dark:text-blue-400 border border-blue-600/30">
                  80–100% {lang === 'en' ? 'Optimal' : 'Chuẩn'}
                </span>
                <span className="px-2 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  &lt;80% {lang === 'en' ? 'Underload' : 'Trống tải'}
                </span>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
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

