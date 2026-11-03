import { useState, useEffect } from 'react';
import { ChevronDown, Calendar, Layers } from 'lucide-react';
import { Avatar } from '../../common/Avatar';
import { daysUntil, displayDate } from '../../../lib/workflowHub';
import type { Task } from '../../../hooks/useTasks';
import type { WorkflowModel } from '../../../hooks/useWorkflowManagement';

interface WorkflowUnplannedTasksProps {
  model: WorkflowModel;
  draggingTaskId?: string | null;
  setDraggingTaskId?: (id: string | null) => void;
}

function getTaskCategory(task: Task): string {
  if (task.id.startsWith('ps-')) return 'SUBTASK - PROJECT';
  if (task.id.startsWith('cs-')) return 'SUBTASK - CAMPAIGN';
  if (task.project_id || task.project) return 'PROJECT';
  if (task.campaign_id || task.campaign) return 'CAMPAIGN';
  return 'TASK';
}

function renderDeadlineBadge(dueDate: string | null | undefined, isEn: boolean) {
  const rem = daysUntil(dueDate);
  if (rem == null) {
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[6px] bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700/60 select-none">
        —
      </span>
    );
  }
  if (rem < 0) {
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[6px] bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60 select-none">
        {isEn ? `Late ${Math.abs(rem)}d` : `Trễ ${Math.abs(rem)}d`}
      </span>
    );
  }
  if (rem === 0) {
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[6px] bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60 select-none">
        {isEn ? 'Today' : 'Hôm nay'}
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[6px] bg-sky-50 text-sky-600 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60 select-none">
      {isEn ? `${rem}d left` : `Còn ${rem}d`}
    </span>
  );
}

export function WorkflowUnplannedTasks({
  model,
  draggingTaskId,
  setDraggingTaskId,
}: WorkflowUnplannedTasksProps) {
  const { hub, isEn, currentEntity, phases, unplanned, linkTask, setSelectedTask } = model;
  const isRoot = Boolean(currentEntity?.root);
  const [isOpen, setIsOpen] = useState(true);
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenuTaskId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-unplanned-menu]')) {
        setOpenMenuTaskId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuTaskId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuTaskId]);

  const availablePhases = phases.filter(
    (p) => !['completed', 'cancelled'].includes(p.status)
  );

  return (
    <section className="border-t border-gray-100 dark:border-slate-800/80 pt-4">
      {/* Dropdown Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="grid grid-flow-col items-center justify-start gap-2 text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-primary dark:hover:text-sky-300 transition-colors cursor-pointer group select-none"
        aria-expanded={isOpen}
      >
        <ChevronDown
          size={14}
          className={`text-gray-400 group-hover:text-primary dark:group-hover:text-sky-300 transition-transform duration-200 ${
            isOpen ? 'rotate-0' : '-rotate-90'
          }`}
        />
        <span>
          {isEn
            ? `Unplanned tasks (${unplanned.length})`
            : `Task chưa gắn phase (${unplanned.length})`}
        </span>
      </button>

      {/* Cards Grid */}
      {isOpen && (
        <div className="mt-3.5">
          {unplanned.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400 dark:text-slate-500">
              {isEn ? 'All tasks are assigned to phases' : 'Tất cả task đã được gắn vào chặng'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
              {unplanned.map((task) => {
                const isMenuOpen = openMenuTaskId === task.id;
                const isDragging = draggingTaskId === task.id;
                const assigneeName = task.assignee?.name || (isEn ? 'Unassigned' : 'Chưa giao');

                return (
                  <div
                    key={task.id}
                    draggable={!hub.busy && isRoot}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', task.id);
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggingTaskId?.(task.id);
                    }}
                    onDragEnd={() => {
                      setDraggingTaskId?.(null);
                    }}
                    className={`rounded-[8px] p-2.5 sm:p-3 transition-all select-none relative group border ${
                      isDragging
                        ? 'opacity-40 scale-[0.98] border-dashed border-primary bg-primary/5'
                        : 'bg-white border-gray-200/90 shadow-2xs hover:shadow-md hover:border-primary/40 dark:bg-[#0a192f] dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-[#0f1e36]'
                    } ${!isRoot ? 'cursor-default' : hub.busy ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
                  >
                    {/* Top Row: Category badge on left, deadline pill on right */}
                    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-[6px] tracking-wider uppercase bg-slate-100 dark:bg-[#0f1e36] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 truncate justify-self-start">
                        {getTaskCategory(task)}
                      </span>
                      {renderDeadlineBadge(task.due_date, isEn)}
                    </div>

                    {/* Middle Row: Title */}
                    <h4
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTask(task);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedTask(task);
                        }
                      }}
                      className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 my-1.5 leading-snug cursor-pointer hover:text-primary dark:hover:text-sky-300 transition-colors"
                      title={task.title}
                    >
                      {task.title}
                    </h4>

                    {/* Bottom Row: Calendar + due date on left, Avatar + Assignee on right (fades out smoothly on hover) */}
                    <div
                      className={`grid grid-cols-[auto_1fr] items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-slate-800/80 transition-opacity duration-150 ${
                        isMenuOpen ? 'opacity-0 pointer-events-none' : 'group-hover:opacity-0'
                      }`}
                    >
                      <div className="grid grid-flow-col items-center gap-1 text-[11px] text-gray-500 dark:text-slate-400">
                        <Calendar size={12} className="shrink-0 text-gray-400" />
                        <span className="truncate">{displayDate(task.due_date)}</span>
                      </div>

                      <div
                        className="grid grid-flow-col items-center justify-end gap-1.5 min-w-0 max-w-[120px] ml-auto"
                        title={assigneeName}
                      >
                        <Avatar
                          name={assigneeName}
                          src={task.assignee?.avatar_url}
                          className="w-4 h-4 text-[7px] shrink-0"
                        />
                        <span className="text-[11px] font-medium text-gray-700 dark:text-slate-300 truncate">
                          {assigneeName}
                        </span>
                      </div>
                    </div>

                    {/* Function 1: "Chọn phase" hover button & Popover (overlay smoothly over bottom row) */}
                    {isRoot && (
                      <div
                        className={`absolute inset-x-2.5 bottom-2.5 z-10 transition-all duration-200 ${
                          isMenuOpen
                            ? 'opacity-100 pointer-events-auto translate-y-0'
                            : 'opacity-0 pointer-events-none translate-y-1 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0'
                        }`}
                        data-unplanned-menu
                      >
                        <button
                          type="button"
                          disabled={hub.busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuTaskId((prev) => (prev === task.id ? null : task.id));
                          }}
                          className="w-full py-1.5 px-2.5 rounded-[6px] text-[11px] font-bold grid grid-flow-col items-center justify-center gap-1.5 transition-all cursor-pointer bg-primary text-white shadow-xs hover:bg-primary/90 dark:bg-[#002e6d] dark:text-white dark:border dark:border-sky-500/40 dark:hover:bg-[#003882]"
                          title={isEn ? 'Assign phase' : 'Chọn phase'}
                        >
                          <Layers size={13} className="shrink-0" />
                          <span>{isEn ? 'Assign phase' : 'Chọn phase'}</span>
                          <ChevronDown
                            size={12}
                            className={`shrink-0 transition-transform duration-200 ${
                              isMenuOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {/* Popover list of phases */}
                        {isMenuOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-0 right-0 bottom-[calc(100%+6px)] z-50 p-1.5 rounded-[8px] bg-white dark:bg-[#0a192f] border border-gray-200 dark:border-slate-700 shadow-xl max-h-48 overflow-y-auto custom-scrollbar space-y-1"
                          >
                            <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-slate-400 border-b border-gray-100 dark:border-slate-800">
                              {isEn ? 'Select phase' : 'Chọn chặng'}
                            </div>
                            {availablePhases.length === 0 ? (
                              <div className="px-2 py-2 text-xs text-gray-400 text-center">
                                {isEn ? 'No active phases available' : 'Chưa có chặng khả dụng'}
                              </div>
                            ) : (
                              availablePhases.map((phase) => (
                                <button
                                  key={phase.id}
                                  type="button"
                                  disabled={hub.busy}
                                  onClick={() => {
                                    linkTask(task, phase.id);
                                    setOpenMenuTaskId(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs font-semibold text-gray-800 dark:text-gray-100 hover:bg-primary/10 hover:text-primary dark:hover:bg-[#002e6d]/30 dark:hover:text-sky-300 transition-colors grid grid-cols-[auto_1fr] items-center gap-2 cursor-pointer"
                                >
                                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-[4px] bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
                                    P{phase.position}
                                  </span>
                                  <span className="truncate" title={phase.name || phase.title}>
                                    {phase.name || phase.title}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
