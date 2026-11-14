import React, { useState, useMemo } from 'react';
import { Megaphone, FolderKanban, FileText } from 'lucide-react';
import type { CalendarItem } from '../../../lib/profileCalendar';
import { isCalendarDone, formatCalendarDay } from '../../../lib/profileCalendar';
import { daysUntil } from '../../../lib/workflowHub';
import { Avatar } from '../../common/Avatar';
import { SlidingToolbarGroup } from '../../common/SlidingToolbarGroup';
import { priorityClass } from '../projects/projectPresentation';
import { getStatusLabel, getStatusBadgeVisual } from '../../../utils/statusTheme';
import type { ProfileBoardColumnKey } from '../../../services/profileBoardActions';

export interface ProfileBoardViewProps {
  items: CalendarItem[];
  today: string;
  unreadKeys: Set<string>;
  lang?: string;
  onOpen: (item: CalendarItem) => void;
  onMoveItem?: (item: CalendarItem, targetCol: ProfileBoardColumnKey) => Promise<void> | void;
  emptyLabel?: string;
}

interface ColumnConfig {
  key: ProfileBoardColumnKey;
  labelVi: string;
  labelEn: string;
  dotColor: string;
  pillClass: string;
  countBadgeClass: string;
  targetStatus: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    key: 'draft_on_hold',
    labelVi: 'DRAFT / TO-DO & ON HOLD',
    labelEn: 'DRAFT / TO-DO & ON HOLD',
    dotColor: 'bg-slate-400',
    pillClass: 'bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800/90 dark:text-slate-300 dark:border-slate-700/80',
    countBadgeClass: 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700',
    targetStatus: 'draft',
  },
  {
    key: 'planning',
    labelVi: 'PLANNING',
    labelEn: 'PLANNING',
    dotColor: 'bg-purple-500',
    pillClass: 'bg-purple-50 text-purple-700 border border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60',
    countBadgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60',
    targetStatus: 'planning',
  },
  {
    key: 'active',
    labelVi: 'IN PROGRESS',
    labelEn: 'IN PROGRESS',
    dotColor: 'bg-sky-500',
    pillClass: 'bg-sky-50 text-sky-700 border border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60',
    countBadgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60',
    targetStatus: 'active',
  },
  {
    key: 'completed',
    labelVi: 'COMPLETED',
    labelEn: 'COMPLETED',
    dotColor: 'bg-emerald-500',
    pillClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
    countBadgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60',
    targetStatus: 'completed',
  },
];

function matchProfileColumn(item: CalendarItem): ColumnConfig['key'] {
  const norm = (item.record?.workflow_status || item.status || 'active').toLowerCase().trim();
  if (['draft', 'todo', 'backlog', 'pending', 'on_hold', 'paused', 'holding'].includes(norm)) {
    return 'draft_on_hold';
  }
  if (['planning', 'planned', 'scoping'].includes(norm)) {
    return 'planning';
  }
  if (
    ['done', 'complete', 'completed', 'pending_approval', 'review', 'in_qa', 'closed'].includes(norm) ||
    isCalendarDone(item.status)
  ) {
    return 'completed';
  }
  return 'active';
}

export const ProfileBoardView: React.FC<ProfileBoardViewProps> = ({
  items,
  today: _today,
  unreadKeys,
  lang = 'vi',
  onOpen,
  onMoveItem,
  emptyLabel,
}) => {
  const isEn = lang === 'en';
  const [colOneSubFilter, setColOneSubFilter] = useState<'all' | 'draft' | 'on_hold'>('all');
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Nhóm các item vào 4 cột
  const columnItems = useMemo(() => {
    const map: Record<ColumnConfig['key'], CalendarItem[]> = {
      draft_on_hold: [],
      planning: [],
      active: [],
      completed: [],
    };

    items.forEach((item) => {
      const colKey = matchProfileColumn(item);
      map[colKey].push(item);
    });

    return map;
  }, [items]);

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colKey) {
      setDragOverCol(colKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverCol(null);
  };

  const handleDrop = (e: React.DragEvent, colKey: ProfileBoardColumnKey) => {
    e.preventDefault();
    setDragOverCol(null);
    const key = e.dataTransfer.getData('text/plain') || draggedKey;
    if (!key) return;
    const found = items.find((i) => i.key === key);
    if (found) {
      void onMoveItem?.(found, colKey);
    }
    setDraggedKey(null);
  };

  return (
    <div className="w-full pb-16 pr-1 select-none">
      {/* Mobile Quick-Jump Pills (< 640px) - Zero Flexbox */}
      <div className="sm:hidden mb-3 grid grid-flow-col auto-cols-max items-center gap-1.5 overflow-x-auto max-w-full no-scrollbar py-1 px-1.5 rounded-[8px] bg-white/85 dark:bg-[#152338]/90 border border-gray-200/80 dark:border-[#34465c]">
        {COLUMNS.map((col) => {
          const count = (columnItems[col.key] || []).length;
          return (
            <button
              key={col.key}
              type="button"
              onClick={() => {
                const el = document.getElementById(`profile-board-col-${col.key}`);
                el?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
              }}
              className={`px-2 py-1 rounded-[6px] text-[10.5px] font-bold border transition-all grid grid-flow-col auto-cols-max items-center gap-1 cursor-pointer shrink-0 ${col.pillClass}`}
            >
              <span>{isEn ? col.labelEn : col.labelVi}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${col.countBadgeClass}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Horizontal Scrollable Kanban Columns - Zero Flexbox */}
      <div className="overflow-x-auto pb-4 -mx-1 px-1 custom-scrollbar snap-x snap-mandatory sm:snap-none scroll-smooth">
        <div className="grid grid-flow-col auto-cols-[minmax(272px,84vw)] sm:auto-cols-[minmax(285px,1fr)] sm:min-w-[1160px] gap-3.5 items-start">
          {COLUMNS.map((col) => {
            const rawItems = columnItems[col.key] || [];
            const isDragOver = dragOverCol === col.key;

            return (
              <div
                key={col.key}
                id={`profile-board-col-${col.key}`}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.key)}
                className={`card-hub snap-start rounded-[8px] border transition-all duration-150 grid grid-rows-[auto_1fr] gap-2.5 p-2.5 min-h-[380px] sm:min-h-[560px] ${
                  isDragOver
                    ? '!border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10'
                    : 'border-gray-200/80 dark:!border-[#34465c]'
                }`}
              >
                {/* Column Header: Status Pill and Count Badge */}
                <div className="grid grid-cols-[1fr_auto] items-center gap-2 pb-2 border-b border-gray-200/70 dark:border-[#293a50]">
                  {col.key === 'draft_on_hold' ? (
                    (() => {
                      const draftCount = rawItems.filter((i) => {
                        const s = (i.record?.workflow_status || i.status || '').toLowerCase().trim();
                        return ['draft', 'todo', 'backlog', 'pending'].includes(s);
                      }).length;
                      const onHoldCount = rawItems.filter((i) => {
                        const s = (i.record?.workflow_status || i.status || '').toLowerCase().trim();
                        return ['on_hold', 'paused', 'holding'].includes(s);
                      }).length;

                      return (
                        <div className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5 overflow-hidden">
                          <SlidingToolbarGroup
                            className="p-0.5 rounded-[6px] bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 gap-1"
                            showHoverPill={true}
                            showActivePill={false}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setColOneSubFilter((curr) => (curr === 'draft' ? 'all' : 'draft'))
                              }
                              title={
                                colOneSubFilter === 'draft'
                                  ? isEn
                                    ? 'Click to show all'
                                    : 'Bấm để hiện tất cả'
                                  : isEn
                                  ? 'Filter by Draft / To-Do'
                                  : 'Lọc theo Draft / To-Do'
                              }
                              className={`inline-grid grid-flow-col auto-cols-max items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[10px] font-bold transition-all cursor-pointer ${
                                colOneSubFilter === 'draft'
                                  ? 'bg-slate-200 text-slate-900 border border-slate-400 dark:bg-slate-700 dark:text-white dark:border-slate-500 shadow-2xs ring-1 ring-slate-400/50'
                                  : colOneSubFilter === 'on_hold'
                                  ? 'bg-transparent text-slate-400 dark:text-slate-500 border border-transparent opacity-55 hover:opacity-90'
                                  : 'bg-white/80 text-slate-700 border border-slate-200/80 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/80 hover:bg-slate-200/70 dark:hover:bg-slate-700/70'
                              }`}
                            >
                              <span>DRAFT / TO-DO</span>
                              <span className="text-[9.5px] font-bold opacity-80">({draftCount})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setColOneSubFilter((curr) => (curr === 'on_hold' ? 'all' : 'on_hold'))
                              }
                              title={
                                colOneSubFilter === 'on_hold'
                                  ? isEn
                                    ? 'Click to show all'
                                    : 'Bấm để hiện tất cả'
                                  : isEn
                                  ? 'Filter by On Hold'
                                  : 'Lọc theo On Hold'
                              }
                              className={`inline-grid grid-flow-col auto-cols-max items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[10px] font-bold transition-all cursor-pointer ${
                                colOneSubFilter === 'on_hold'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-400 dark:bg-amber-900/80 dark:text-amber-100 dark:border-amber-600 shadow-2xs ring-1 ring-amber-400/50'
                                  : colOneSubFilter === 'draft'
                                  ? 'bg-transparent text-amber-500/70 border border-transparent opacity-55 hover:opacity-90'
                                  : 'bg-white/80 text-amber-700 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60 hover:bg-amber-100/70 dark:hover:bg-amber-900/60'
                              }`}
                            >
                              <span>ON HOLD</span>
                              <span className="text-[9.5px] font-bold opacity-80">({onHoldCount})</span>
                            </button>
                          </SlidingToolbarGroup>
                          <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${col.countBadgeClass}`}>
                            {rawItems.length}
                          </span>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5">
                      <div className={`inline-grid grid-flow-col auto-cols-max items-center px-2 py-0.5 rounded-[6px] text-[11px] font-bold uppercase tracking-wider ${col.pillClass}`}>
                        <span>{isEn ? col.labelEn : col.labelVi}</span>
                      </div>
                      <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${col.countBadgeClass}`}>
                        {rawItems.length}
                      </span>
                    </div>
                  )}
                </div>

                {/* Column Body: Cards List */}
                <div className="grid gap-2.5 content-start overflow-y-auto max-h-[calc(100dvh-250px)] sm:max-h-[calc(100vh-270px)] -mx-1.5 px-1.5 py-1 custom-scrollbar">
                  {(() => {
                    const filteredItems =
                      col.key === 'draft_on_hold'
                        ? rawItems.filter((i) => {
                            const s = (i.record?.workflow_status || i.status || '').toLowerCase().trim();
                            const isDraft = ['draft', 'todo', 'backlog', 'pending'].includes(s);
                            const isOnHold = ['on_hold', 'paused', 'holding'].includes(s);
                            if (colOneSubFilter === 'draft') return isDraft;
                            if (colOneSubFilter === 'on_hold') return isOnHold;
                            return true;
                          })
                        : rawItems;

                    if (filteredItems.length === 0) {
                      return (
                        <div className="py-10 text-center border border-dashed border-gray-200/80 dark:border-[#2c3e55] rounded-[8px] text-xs text-gray-400 dark:text-gray-400">
                          {emptyLabel || (isEn ? 'No items in this column' : 'Không có mục nào trong cột này')}
                        </div>
                      );
                    }

                    return filteredItems.map((item) => {
                      const isUnread = unreadKeys.has(item.key);
                      const isDone = isCalendarDone(item.status);
                      const isDragging = draggedKey === item.key;
                      const normStatus = (item.record?.workflow_status || item.status || '').toLowerCase().trim();

                      // Deadline / Days left badge
                      let daysLeftLabel: string | null = null;
                      let daysLeftColor = '';
                      const deadline = item.due || item.end;
                      const daysLeft = daysUntil(deadline);
                      if (deadline && daysLeft != null) {
                        if (isDone) {
                          daysLeftLabel = isEn ? 'Done' : 'Đã xong';
                          daysLeftColor =
                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60';
                        } else if (daysLeft < 0) {
                          daysLeftLabel = isEn ? `${-daysLeft}d overdue` : `Quá hạn ${-daysLeft} ngày`;
                          daysLeftColor =
                            'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 border border-red-200 dark:border-red-800/60';
                        } else if (daysLeft === 0) {
                          daysLeftLabel = isEn ? 'Due today' : 'Hôm nay';
                          daysLeftColor =
                            'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60';
                        } else {
                          daysLeftLabel = isEn ? `${daysLeft}d left` : `Còn ${daysLeft} ngày`;
                          daysLeftColor =
                            'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60';
                        }
                      }

                      // Kind Badge Info
                      let kindLabel = 'Task';
                      let KindIcon = FileText;
                      let kindTagClass =
                        'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60';

                      if (item.kind === 'project' || item.kind === 'project_subtask') {
                        kindLabel = item.kind === 'project' ? (isEn ? 'Project' : 'Dự án') : 'Task';
                        KindIcon = item.kind === 'project' ? FolderKanban : FileText;
                        kindTagClass =
                          'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800/60';
                      } else if (item.kind === 'campaign' || item.kind === 'campaign_subtask') {
                        kindLabel = item.kind === 'campaign' ? (isEn ? 'Campaign' : 'Chiến dịch') : 'Task';
                        KindIcon = item.kind === 'campaign' ? Megaphone : FileText;
                        kindTagClass =
                          'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60';
                      }

                      // Priority badge
                      const priority = item.priority || item.record?.priority;

                      // Owner info
                      const ownerName =
                        item.record?.assignee?.name ||
                        item.record?.lead?.name ||
                        item.record?.creator?.name ||
                        item.owner ||
                        '';
                      const ownerAvatar =
                        item.record?.assignee?.avatar_url ||
                        item.record?.lead?.avatar_url ||
                        item.record?.creator?.avatar_url ||
                        '';

                      return (
                        <div
                          key={item.key}
                          data-board-card="true"
                          draggable={Boolean(onMoveItem)}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', item.key);
                            e.dataTransfer.effectAllowed = 'move';
                            setDraggedKey(item.key);
                          }}
                          onDragEnd={() => {
                            setDraggedKey(null);
                            setDragOverCol(null);
                          }}
                          onClick={() => onOpen(item)}
                          className={`group relative p-3 rounded-[8px] border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-blue-400 dark:hover:border-sky-500 shadow-2xs hover:shadow-xs transition-all text-left grid gap-2 content-start cursor-grab active:cursor-grabbing select-none hover-board-card ${
                            isDragging ? 'opacity-50 ring-2 ring-primary/40' : ''
                          }`}
                        >
                          {/* Card Header: Kind badge + Unread dot */}
                          <div className="grid grid-cols-[1fr_auto] items-center gap-1.5">
                            <div className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5">
                              <span
                                className={`w-fit inline-grid grid-flow-col auto-cols-max items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${kindTagClass}`}
                              >
                                <KindIcon size={11} />
                                <span>{kindLabel}</span>
                              </span>

                              {/* Standard status badge synced with EntityActionBadges & statusTheme */}
                              {(() => {
                                const effStatus = item.record?.workflow_status || item.status || normStatus;
                                const stLabel = getStatusLabel(effStatus, lang);
                                const stVisual = getStatusBadgeVisual(effStatus);
                                return (
                                  <span className={`inline-grid grid-flow-col auto-cols-max items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold border ${stVisual.badgeClass}`}>
                                    <span>{stLabel}</span>
                                  </span>
                                );
                              })()}
                            </div>

                            {/* Unread indicator */}
                            {isUnread && (
                              <span
                                className="w-2 h-2 rounded-full bg-blue-500 shadow-2xs justify-self-end"
                                title={isEn ? 'Unread notification' : 'Thông báo mới chưa đọc'}
                              />
                            )}
                          </div>

                          {/* Card Body: Title & Parent entity */}
                          <div className="grid gap-1">
                            <h4 className="font-bold text-xs text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                              {item.title}
                            </h4>
                            {item.parentName && (
                              <p className="text-[10.5px] text-gray-500 dark:text-slate-400 line-clamp-1 leading-tight">
                                ↳ {item.parentName}
                              </p>
                            )}
                          </div>

                          {/* Card Footer: Deadline, Priority & Assignee Avatar */}
                          <div className="grid grid-cols-[1fr_auto] items-center gap-2 pt-1 border-t border-gray-100 dark:border-slate-800/80 text-[11px] text-gray-500 dark:text-slate-400">
                            {/* Left: Deadline & Priority */}
                            <div className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5 overflow-hidden">
                              {daysLeftLabel ? (
                                <span
                                  className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold ${daysLeftColor}`}
                                >
                                  {daysLeftLabel}
                                </span>
                              ) : deadline ? (
                                <span className="text-[10px] text-gray-500 dark:text-slate-400">
                                  ⏱ {formatCalendarDay(deadline)}
                                </span>
                              ) : null}

                              {priority && (
                                <span
                                  className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-tight ${priorityClass(
                                    priority
                                  )}`}
                                >
                                  {priority}
                                </span>
                              )}
                            </div>

                            {/* Right: Owner / Assignee Avatar */}
                            {ownerName && (
                              <div
                                className="inline-grid grid-flow-col auto-cols-max items-center gap-1 text-[10.5px] font-semibold text-gray-700 dark:text-slate-300"
                                title={ownerName}
                              >
                                <Avatar
                                  name={ownerName}
                                  src={ownerAvatar}
                                  className="h-4 w-4 text-[9px] shadow-2xs ring-1 ring-white dark:ring-slate-800"
                                />
                                <span className="truncate max-w-[80px]">{ownerName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
