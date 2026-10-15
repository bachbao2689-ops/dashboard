import {FilterPopover} from './FilterPopover';
import {ActionButton} from '../ActionButton';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../../../i18n/translations';

interface DateFilterDropdownProps {
  calendarFilter: string;
  customStartDate?: string;
  customEndDate?: string;
  onSelectPreset: (preset: string) => void;
  onApplyCustomRange: (start: string, end: string) => void;
  onClear: () => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  align?: 'left' | 'right';
}

const formatVN = (dateStr?: string | null) => {
  if (!dateStr) return '';
  const ymd = dateStr.split('T')[0];
  const parts = ymd.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
};

export const DateFilterDropdown: React.FC<DateFilterDropdownProps> = ({
  calendarFilter,
  customStartDate = '',
  customEndDate = '',
  onSelectPreset,
  onApplyCustomRange,
  onClear,
  isOpen,
  onToggle,
  onClose,
  align = 'right'
}) => {
  const { t, lang } = useTranslation();
  const isEn = lang === 'en';
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleDocumentClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node) && !panelRef.current?.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [isOpen, onClose]);

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState<number>(() => {
    if (customStartDate) {
      const d = new Date(customStartDate);
      if (!isNaN(d.getTime())) return d.getFullYear();
    }
    return today.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    if (customStartDate) {
      const d = new Date(customStartDate);
      if (!isNaN(d.getTime())) return d.getMonth();
    }
    return today.getMonth();
  });

  const [tempStart, setTempStart] = useState<string>(customStartDate);
  const [tempEnd, setTempEnd] = useState<string>(customEndDate);
  const [isPickingEnd, setIsPickingEnd] = useState<boolean>(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTempStart(customStartDate);
      setTempEnd(customEndDate);
      setIsPickingEnd(false);
      setHoverDate(null);
      if (customStartDate) {
        const d = new Date(customStartDate);
        if (!isNaN(d.getTime())) {
          setViewYear(d.getFullYear());
          setViewMonth(d.getMonth());
        }
      }
    }
  }, [isOpen, customStartDate, customEndDate]);

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  const firstDayOfWeek = useMemo(() => {
    // 0 = Sunday, 1 = Monday... We want Monday = 0
    const day = new Date(viewYear, viewMonth, 1).getDay();
    return (day + 6) % 7;
  }, [viewYear, viewMonth]);

  const monthNamesVi = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekDaysVi = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const weekDaysEn = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const monthLabel = isEn ? `${monthNamesEn[viewMonth]} ${viewYear}` : `${monthNamesVi[viewMonth]}, ${viewYear}`;

  const handleDayClick = (day: number) => {
    const formatted = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!tempStart || (tempStart && tempEnd) || !isPickingEnd) {
      setTempStart(formatted);
      setTempEnd('');
      setIsPickingEnd(true);
    } else {
      // User picking end
      if (formatted < tempStart) {
        setTempEnd(tempStart);
        setTempStart(formatted);
      } else {
        setTempEnd(formatted);
      }
      setIsPickingEnd(false);
    }
  };

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tempStart) return;
    const end = tempEnd || tempStart;
    onApplyCustomRange(tempStart, end);
    onClose();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempStart('');
    setTempEnd('');
    setIsPickingEnd(false);
    onClear();
    onClose();
  };

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const presets = [
    { key: 'all', label: t('projects.allDates') },
    { key: 'ongoing', label: t('projects.dateOngoing') },
    { key: 'this_week', label: t('projects.dateThisWeek') },
    { key: 'this_month', label: t('projects.dateThisMonth') },
    { key: 'due_soon', label: t('projects.dateDueSoon') },
    { key: 'overdue', label: t('projects.dateOverdue') }
  ];

  const hasCustom = Boolean(customStartDate || customEndDate);
  const isFiltered = calendarFilter !== 'all' || hasCustom;

  const triggerLabel = useMemo(() => {
    if (hasCustom) {
      if (customStartDate && customEndDate) {
        return `${formatVN(customStartDate)} – ${formatVN(customEndDate)}`;
      }
      return formatVN(customStartDate || customEndDate);
    }
    const found = presets.find(p => p.key === calendarFilter);
    return found && calendarFilter !== 'all' ? found.label : t('projects.filterCalendar');
  }, [hasCustom, customStartDate, customEndDate, calendarFilter, presets, t]);

  return (
    <div ref={containerRef} className="mobile-filter-control relative inline-block text-left">
      <ActionButton icon={<CalendarIcon size={13} className={isFiltered ? 'text-primary dark:text-blue-400' : 'text-gray-400'} />}
        type="button"
        aria-expanded={isOpen}
        onClick={e => {
          e.stopPropagation();
          onToggle();
        }}
        className={`h-9 px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
          isFiltered
            ? 'border-primary/40 bg-primary/10 text-primary dark:bg-primary/20 dark:border-primary/50 dark:text-blue-400 font-semibold'
            : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/60'
        }`}
      >

        <span className="max-w-[130px] truncate">{triggerLabel}</span>
        <ChevronDown size={12} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </ActionButton>

      {isOpen && (
        <FilterPopover onClose={onClose} anchorRef={containerRef} panelRef={panelRef} align={align}
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 w-76 sm:w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-3 animate-in fade-in zoom-in-95 duration-150 space-y-2.5 max-h-[85vh] overflow-y-auto custom-scrollbar`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-1 flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
              {t('projects.filterCalendar')}
            </span>
            {isFiltered && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] font-semibold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
              >
                {t('common.cancel')} / {t('projects.clearFilters')}
              </button>
            )}
          </div>

          {/* Presets Grid */}
          <div className="grid grid-cols-2 gap-1">
            {presets.map(opt => {
              const active = calendarFilter === opt.key && !hasCustom;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    onSelectPreset(opt.key);
                    onClose();
                  }}
                  className={`text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    active
                      ? 'font-bold text-primary dark:text-blue-400 bg-primary/10 dark:bg-primary/20'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {active && <CheckCircle2 size={12} className="text-primary dark:text-blue-400 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>

          <div className="h-px bg-gray-100 dark:bg-slate-700 my-1" />

          {/* Custom Date Range Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                {t('projects.dateCustom')}
              </span>
              <span className="text-[10px] text-gray-400">
                {isPickingEnd ? (isEn ? 'Select end date' : 'Chọn ngày kết thúc') : (isEn ? 'Select range' : 'Chọn khoảng ngày')}
              </span>
            </div>

            {/* Range display boxes */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className={`p-2 rounded-xl border text-xs text-center transition-all ${
                tempStart && !tempEnd && isPickingEnd
                  ? 'border-primary ring-1 ring-primary/30 bg-primary/5 dark:bg-primary/10'
                  : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60'
              }`}>
                <div className="text-[9px] uppercase font-bold text-gray-400 mb-0.5">{t('projects.startDate')}</div>
                <div className="font-semibold text-gray-800 dark:text-gray-100">{tempStart ? formatVN(tempStart) : '—/—/————'}</div>
              </div>
              <div className={`p-2 rounded-xl border text-xs text-center transition-all ${
                isPickingEnd
                  ? 'border-primary ring-1 ring-primary/30 bg-primary/5 dark:bg-primary/10'
                  : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60'
              }`}>
                <div className="text-[9px] uppercase font-bold text-gray-400 mb-0.5">{t('projects.endDate')}</div>
                <div className="font-semibold text-gray-800 dark:text-gray-100">{tempEnd ? formatVN(tempEnd) : '—/—/————'}</div>
              </div>
            </div>

            {/* Mini Month Calendar */}
            <div className="bg-gray-50/80 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-700/60 rounded-xl p-2.5">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-bold text-gray-800 dark:text-white">
                  {monthLabel}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Next month"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Weekdays */}
              <div className="grid grid-cols-7 text-center mb-1">
                {(isEn ? weekDaysEn : weekDaysVi).map(d => (
                  <span key={d} className="text-[10px] font-bold text-gray-400 py-1">
                    {d}
                  </span>
                ))}
              </div>

              {/* Days Matrix */}
              <div className="grid grid-cols-7 gap-y-0.5 text-center text-xs">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <span key={`empty-${i}`} className="h-7 w-7" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isToday = dateStr === todayStr;

                  const isStart = tempStart === dateStr;
                  const isEnd = tempEnd === dateStr;

                  // Range calculation
                  const effectiveEnd = tempEnd || (isPickingEnd && hoverDate && hoverDate >= tempStart ? hoverDate : '');
                  const inRange = tempStart && effectiveEnd && dateStr > tempStart && dateStr < effectiveEnd;

                  let cellClass = 'h-7 w-7 mx-auto flex items-center justify-center text-xs transition-colors cursor-pointer ';
                  if (isStart && isEnd) {
                    cellClass += 'bg-primary text-white font-bold rounded-lg shadow-xs';
                  } else if (isStart) {
                    cellClass += 'bg-primary text-white font-bold rounded-l-lg rounded-r-none shadow-xs';
                  } else if (isEnd) {
                    cellClass += 'bg-primary text-white font-bold rounded-r-lg rounded-l-none shadow-xs';
                  } else if (inRange) {
                    cellClass += 'bg-primary/15 dark:bg-primary/25 text-primary dark:text-blue-300 font-medium rounded-none';
                  } else {
                    cellClass += 'text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-slate-800 rounded-lg ';
                    if (isToday) cellClass += 'font-bold text-primary dark:text-blue-400 ring-1 ring-primary/30';
                  }

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayClick(day)}
                      onMouseEnter={() => isPickingEnd && setHoverDate(dateStr)}
                      className={cellClass}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Range Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
              >
                {t('projects.clearFilters')}
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!tempStart}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg text-white transition-all shadow-xs cursor-pointer ${
                  tempStart
                    ? 'bg-[#002e6d] hover:bg-[#001f4d] dark:bg-blue-600 dark:hover:bg-blue-500'
                    : 'bg-gray-300 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </FilterPopover>
      )}
    </div>
  );
};
