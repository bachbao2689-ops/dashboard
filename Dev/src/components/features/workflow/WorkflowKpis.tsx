import { useState, useMemo, useEffect, useRef } from 'react';
import type { WorkflowModel } from '../../../hooks/useWorkflowManagement';
import { X, Info } from 'lucide-react';
import { Avatar } from '../../common/Avatar';
import { displayDate, daysUntil, isDone } from '../../../lib/workflowHub';

const handleMagneticMove = (e: React.MouseEvent<HTMLElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
};

export function WorkflowKpis({ model }: { model: WorkflowModel }) {
  const { isEn, currentEntity, allTasks, daysRemaining } = model;
  const [activeBoxPopup, setActiveBoxPopup] = useState<number | null>(null);
  const [activeInfoBox, setActiveInfoBox] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popups when clicking outside or pressing Escape
  useEffect(() => {
    if (activeBoxPopup == null && activeInfoBox == null) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-workflow-popover="true"]')) {
        setActiveBoxPopup(null);
        setActiveInfoBox(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveBoxPopup(null);
        setActiveInfoBox(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeBoxPopup, activeInfoBox]);

  // 1. Box 1: Điểm nghẽn hiện tại (Blockers) - Màu Đỏ
  const blockerTasks = useMemo(() => {
    return allTasks.filter((t) => {
      if (isDone(t.status)) return false;
      const d = daysUntil(t.due_date);
      const isOverdue = d != null && d < 0;
      const isBlockedStatus = t.status === 'blocked' || (t as any).is_blocked;
      return isOverdue || isBlockedStatus;
    });
  }, [allTasks]);

  const waitingClientCount = useMemo(() => {
    return allTasks.filter(
      (t) => !isDone(t.status) && (t.status === 'in_review' || t.status === 'in_qa' || (t as any).client_waiting)
    ).length;
  }, [allTasks]);

  const depBlockedCount = Math.max(0, blockerTasks.length - waitingClientCount);

  // 2. Box 2: Công việc đến hạn hôm nay (Due Today) - Màu Cam
  // Chỉ tính các task có hạn chót đúng ngày hôm nay (d === 0)
  const dueTodayTasks = useMemo(() => {
    return allTasks.filter((t) => {
      const d = daysUntil(t.due_date);
      return d === 0;
    });
  }, [allTasks]);

  const todayDoneCount = dueTodayTasks.filter((t) => isDone(t.status)).length;
  const todayActiveCount = dueTodayTasks.filter((t) => !isDone(t.status) && t.status === 'in_progress').length;
  const todayPendingCount = Math.max(0, dueTodayTasks.length - todayDoneCount - todayActiveCount);
  const totalActiveTasksCount = allTasks.filter((t) => !isDone(t.status) && t.status === 'in_progress').length;

  // Group today tasks by assignee (nếu hôm nay không có task nào thì fallback sang active tasks để theo dõi)
  const displayTasksForFollowup = dueTodayTasks.length > 0 ? dueTodayTasks : allTasks.filter((t) => !isDone(t.status) && t.status === 'in_progress');
  const todayTasksByAssignee = useMemo(() => {
    const map = new Map<string, { name: string; avatar?: string; tasks: typeof allTasks }>();
    for (const t of displayTasksForFollowup) {
      const name = typeof t.assignee === 'object' ? t.assignee?.name : t.assignee || (isEn ? 'Unassigned' : 'Chưa gán');
      const avatar = typeof t.assignee === 'object' ? t.assignee?.avatar_url : undefined;
      const item = map.get(name) || { name, avatar, tasks: [] };
      item.tasks.push(t);
      map.set(name, item);
    }
    return Array.from(map.values());
  }, [displayTasksForFollowup, isEn]);

  // 3. Box 3: Tốc độ triển khai (Execution Pace) - Màu Xanh dương
  const doneTasks = useMemo(() => allTasks.filter((t) => isDone(t.status)), [allTasks]);
  
  // Tính số ngày đã trôi qua từ khi bắt đầu dự án/campaign đến hôm nay (tối thiểu 1 ngày)
  const elapsedDays = useMemo(() => {
    const now = new Date();
    if (currentEntity?.start_date) {
      const start = new Date(currentEntity.start_date);
      if (!isNaN(start.getTime())) {
        const diffMs = now.getTime() - start.getTime();
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return Math.max(1, days);
      }
    }
    // Fallback: ngày tạo task sớm nhất
    let earliest = now.getTime();
    for (const t of allTasks) {
      if (t.created_at) {
        const ct = new Date(t.created_at).getTime();
        if (!isNaN(ct) && ct < earliest) earliest = ct;
      }
    }
    const days = Math.floor((now.getTime() - earliest) / (1000 * 60 * 60 * 24));
    return Math.max(1, days);
  }, [currentEntity?.start_date, allTasks]);

  const currentVelocity = (doneTasks.length / elapsedDays).toFixed(1);
  const remainingDaysCount = Math.max(1, daysRemaining ?? 7);
  const remainingTasksCount = Math.max(0, allTasks.length - doneTasks.length);
  const requiredVelocity = (remainingTasksCount / Math.max(1, remainingDaysCount)).toFixed(1);

  // 4. Box 4: Khối lượng còn lại (Remaining Scope) - Màu Tím
  const totalTasksCount = allTasks.length;
  const remainingWorkPct = totalTasksCount > 0 ? Math.round((remainingTasksCount / totalTasksCount) * 100) : 0;
  const remainingTimePct = daysRemaining != null && daysRemaining > 0 ? Math.min(100, Math.max(15, Math.round((daysRemaining / 30) * 100))) : 20;

  // 5. Box 5: Độ lệch kế hoạch (Schedule Forecast) - Màu Vàng/Cam
  const maxOverdueDays = useMemo(() => {
    let max = 0;
    for (const t of blockerTasks) {
      const d = daysUntil(t.due_date);
      if (d != null && d < 0) max = Math.max(max, Math.abs(d));
    }
    return max;
  }, [blockerTasks]);

  const varianceDays = daysRemaining != null && daysRemaining < 0 ? Math.abs(daysRemaining) : maxOverdueDays;
  const planDateStr = useMemo(() => {
    return currentEntity?.due_date ? displayDate(currentEntity.due_date) : (isEn ? 'Not set' : 'Chưa đặt');
  }, [currentEntity?.due_date, isEn]);
  const forecastDateStr = useMemo(() => {
    if (!currentEntity?.due_date) return isEn ? 'On Track' : 'Đúng hạn';
    const d = new Date(currentEntity.due_date);
    d.setDate(d.getDate() + varianceDays);
    return displayDate(d.toISOString());
  }, [currentEntity?.due_date, varianceDays, isEn]);

  // 6. Box 6: Hàng đợi nghiệm thu (Review & Scope Creep) - Màu Xanh ngọc
  const inReviewTasks = useMemo(() => {
    return allTasks.filter((t) => !isDone(t.status) && (t.status === 'in_review' || t.status === 'in_qa'));
  }, [allTasks]);

  const overdueReviewCount = inReviewTasks.filter((t) => {
    const d = daysUntil(t.due_date);
    return d != null && d < 0;
  }).length;

  const addedTasksCount = useMemo(() => {
    return allTasks.filter((t) => !t.workflow_phase_id).length;
  }, [allTasks]);

  if (!currentEntity) return null;

  return (
    <div ref={containerRef} className="grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-6 gap-2 sm:gap-2.5 w-full relative">
      {/* Box 1: Công việc bị nghẽn (Blocked Tasks) - Đỏ */}
      <div
        className={`relative ${activeBoxPopup === 1 || activeInfoBox === 1 ? 'z-[90]' : 'z-10'}`}
        data-workflow-popover="true"
      >
        <div
          role="button"
          tabIndex={0}
          onMouseMove={handleMagneticMove}
          onClick={() => {
            setActiveInfoBox(null);
            setActiveBoxPopup((prev) => (prev === 1 ? null : 1));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveInfoBox(null);
              setActiveBoxPopup((prev) => (prev === 1 ? null : 1));
            }
          }}
          className={`hover-magnetic-card magnetic-rose p-2 sm:p-2.5 rounded-[10px] bg-slate-50/85 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 grid grid-flow-row content-between gap-1 min-w-0 shadow-2xs cursor-pointer transition-all hover:border-rose-400/80 dark:hover:border-rose-500/60 hover:shadow-md hover:-translate-y-0.5 ${
            activeBoxPopup === 1 ? 'ring-2 ring-rose-500 shadow-md' : ''
          }`}
        >
          <div className="grid grid-cols-[1fr_auto] items-center gap-1 w-full min-w-0">
            <span className="text-[10px] sm:text-[10.5px] font-bold text-gray-700 dark:text-slate-300 truncate">
              {isEn ? 'Blocked Tasks' : 'Công việc bị nghẽn'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveBoxPopup(null);
                setActiveInfoBox((prev) => (prev === 1 ? null : 1));
              }}
              className="p-0.5 rounded text-gray-400 hover:text-rose-500 transition-colors"
              title={isEn ? 'Mechanism info' : 'Giải thích cơ chế'}
            >
              <Info size={11} />
            </button>
          </div>
          <div className="text-base sm:text-lg font-extrabold text-rose-600 dark:text-rose-400 tracking-tight leading-none truncate">
            {blockerTasks.length} {isEn ? (blockerTasks.length === 1 ? 'Blocker' : 'Blockers') : 'Điểm nghẽn'}
          </div>
          <div
            className="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 truncate"
            title={`${waitingClientCount} ${isEn ? 'Wait' : 'Chờ duyệt'} · ${depBlockedCount} ${isEn ? 'Late' : 'Quá hạn'}`}
          >
            {waitingClientCount} {isEn ? 'Wait' : 'Chờ duyệt'} · {depBlockedCount} {isEn ? 'Late' : 'Quá hạn'}
          </div>
        </div>

        {activeInfoBox === 1 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-[calc(100%+6px)] z-50 w-60 sm:w-64 p-2.5 rounded-[8px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700 shadow-xl text-left text-[11px] text-gray-700 dark:text-slate-200"
          >
            <div className="font-bold text-rose-600 dark:text-rose-400 mb-1">
              {isEn ? 'Mechanism: Blocked Tasks' : 'Cơ chế: Công việc bị nghẽn'}
            </div>
            <div>
              {isEn
                ? 'Counts tasks that are stuck or overdue in the current stage, helping Leaders unblock briefs, creative assets, or approvals.'
                : 'Đếm các đầu việc đang bị kẹt hoặc trễ hạn trong giai đoạn hiện tại. Giúp Leader tháo gỡ ngay các vướng mắc về brief, thiết kế hoặc duyệt bài.'}
            </div>
          </div>
        )}

        {activeBoxPopup === 1 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-[calc(100%+8px)] z-50 w-72 sm:w-80 p-3 sm:p-4 rounded-[12px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-2xl transition-all duration-200 ease-out animate-in fade-in zoom-in-95 text-left origin-top-left"
          >
            <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
              <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                {isEn ? 'Blocked Tasks' : 'Công việc bị nghẽn'}
              </span>
              <button
                type="button"
                onClick={() => setActiveBoxPopup(null)}
                className="w-6 h-6 rounded-full grid place-items-center text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <div className="pt-2 max-h-72 overflow-y-auto space-y-2">
              {blockerTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-emerald-600 dark:text-emerald-400">
                  {isEn ? 'Great job! No blocked or overdue tasks in this project.' : 'Tuyệt vời! Không có việc nào bị kẹt hoặc trễ hạn.'}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {blockerTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-2 rounded-[8px] bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40 grid grid-cols-[1fr_auto] items-center gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{t.title}</div>
                        <div className="text-[10px] text-rose-600 dark:text-rose-400">
                          {t.status === 'blocked' ? (isEn ? 'Blocked by dependency' : 'Kẹt việc phụ thuộc') : (isEn ? 'Overdue deadline' : 'Quá hạn bàn giao')}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 shrink-0">
                        {t.due_date ? displayDate(t.due_date) : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Box 2: Đến hạn hôm nay (Due Today) - Cam */}
      <div
        className={`relative ${activeBoxPopup === 2 || activeInfoBox === 2 ? 'z-[90]' : 'z-10'}`}
        data-workflow-popover="true"
      >
        <div
          role="button"
          tabIndex={0}
          onMouseMove={handleMagneticMove}
          onClick={() => {
            setActiveInfoBox(null);
            setActiveBoxPopup((prev) => (prev === 2 ? null : 2));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveInfoBox(null);
              setActiveBoxPopup((prev) => (prev === 2 ? null : 2));
            }
          }}
          className={`hover-magnetic-card magnetic-amber p-2 sm:p-2.5 rounded-[10px] bg-slate-50/85 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 grid grid-flow-row content-between gap-1 min-w-0 shadow-2xs cursor-pointer transition-all hover:border-amber-400/80 dark:hover:border-amber-500/60 hover:shadow-md hover:-translate-y-0.5 ${
            activeBoxPopup === 2 ? 'ring-2 ring-amber-500 shadow-md' : ''
          }`}
        >
          <div className="grid grid-cols-[1fr_auto] items-center gap-1 w-full min-w-0">
            <span className="text-[10px] sm:text-[10.5px] font-bold text-gray-700 dark:text-slate-300 truncate">
              {isEn ? 'Due Today' : 'Đến hạn hôm nay'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveBoxPopup(null);
                setActiveInfoBox((prev) => (prev === 2 ? null : 2));
              }}
              className="p-0.5 rounded text-gray-400 hover:text-amber-500 transition-colors"
              title={isEn ? 'Mechanism info' : 'Giải thích cơ chế'}
            >
              <Info size={11} />
            </button>
          </div>
          <div className="text-base sm:text-lg font-extrabold text-amber-600 dark:text-amber-400 tracking-tight leading-none truncate">
            {dueTodayTasks.length} {isEn ? (dueTodayTasks.length === 1 ? 'Task' : 'Tasks') : 'Công việc'}
          </div>
          <div
            className="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 truncate"
            title={`${todayDoneCount} ${isEn ? 'Done' : 'Xong'} · ${totalActiveTasksCount} ${isEn ? 'Active' : 'Đang làm'} · ${todayPendingCount} ${isEn ? 'Due Today' : 'Hạn hôm nay'}`}
          >
            {todayDoneCount} {isEn ? 'Done' : 'Xong'} · {totalActiveTasksCount} {isEn ? 'Active' : 'Đang làm'} · {todayPendingCount} {isEn ? 'Due' : 'Hạn'}
          </div>
        </div>

        {activeInfoBox === 2 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-[calc(100%+6px)] z-50 w-60 sm:w-64 p-2.5 rounded-[8px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700 shadow-xl text-left text-[11px] text-gray-700 dark:text-slate-200"
          >
            <div className="font-bold text-amber-600 dark:text-amber-400 mb-1">
              {isEn ? 'Mechanism: Due Today' : 'Cơ chế: Đến hạn hôm nay'}
            </div>
            <div>
              {isEn
                ? 'Aggregates tasks due today, grouped by assigned team members for quick standup follow-up.'
                : 'Tổng hợp các đầu việc có hạn chót trong ngày hôm nay, gom nhóm theo từng nhân sự thực hiện.'}
            </div>
          </div>
        )}

        {activeBoxPopup === 2 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-[calc(100%+8px)] z-50 w-72 sm:w-80 p-3 sm:p-4 rounded-[12px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-2xl transition-all duration-200 ease-out animate-in fade-in zoom-in-95 text-left origin-top-left"
          >
            <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
              <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                {isEn ? 'Due Today Tasks' : 'Công việc đến hạn hôm nay'}
              </span>
              <button
                type="button"
                onClick={() => setActiveBoxPopup(null)}
                className="w-6 h-6 rounded-full grid place-items-center text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <div className="pt-2 max-h-72 overflow-y-auto space-y-2">
              {todayTasksByAssignee.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">
                  {isEn ? 'No tasks scheduled for today.' : 'Hôm nay không có task nào đến hạn.'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {todayTasksByAssignee.map((group, gIdx) => (
                    <div key={`${group.name}-${gIdx}`} className="p-2.5 rounded-[8px] bg-gray-50/80 dark:bg-slate-800/50 border border-gray-200/80 dark:border-slate-700/80 space-y-1.5">
                      <div className="grid grid-flow-col auto-cols-max items-center gap-2">
                        <Avatar name={group.name} src={group.avatar} className="w-4 h-4 text-[8px]" />
                        <span className="font-bold text-xs text-gray-900 dark:text-white">{group.name}</span>
                        <span className="text-[10px] text-gray-400">({group.tasks.length} {isEn ? (group.tasks.length === 1 ? 'task' : 'tasks') : 'việc'})</span>
                      </div>
                      <div className="space-y-1 pl-6">
                        {group.tasks.map((t) => (
                          <div key={t.id} className="grid grid-cols-[1fr_auto] items-center gap-2 text-[11px]">
                            <span className="truncate text-gray-700 dark:text-slate-300">• {t.title}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${isDone(t.status) ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'}`}>
                              {isDone(t.status) ? (isEn ? 'Done' : 'Xong') : (t.status || 'Active')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Box 3: Tốc độ triển khai (Execution Pace) - Xanh dương */}
      <div
        className={`relative ${activeBoxPopup === 3 || activeInfoBox === 3 ? 'z-[90]' : 'z-10'}`}
        data-workflow-popover="true"
      >
        <div
          role="button"
          tabIndex={0}
          onMouseMove={handleMagneticMove}
          onClick={() => {
            setActiveInfoBox(null);
            setActiveBoxPopup((prev) => (prev === 3 ? null : 3));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveInfoBox(null);
              setActiveBoxPopup((prev) => (prev === 3 ? null : 3));
            }
          }}
          className={`hover-magnetic-card magnetic-blue p-2 sm:p-2.5 rounded-[10px] bg-slate-50/85 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 grid grid-flow-row content-between gap-1 min-w-0 shadow-2xs cursor-pointer transition-all hover:border-blue-400/80 dark:hover:border-blue-500/60 hover:shadow-md hover:-translate-y-0.5 ${
            activeBoxPopup === 3 ? 'ring-2 ring-blue-500 shadow-md' : ''
          }`}
        >
          <div className="grid grid-cols-[1fr_auto] items-center gap-1 w-full min-w-0">
            <span className="text-[10px] sm:text-[10.5px] font-bold text-gray-700 dark:text-slate-300 truncate">
              {isEn ? 'Execution Pace' : 'Tốc độ triển khai'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveBoxPopup(null);
                setActiveInfoBox((prev) => (prev === 3 ? null : 3));
              }}
              className="p-0.5 rounded text-gray-400 hover:text-blue-500 transition-colors"
              title={isEn ? 'Mechanism info' : 'Giải thích cơ chế'}
            >
              <Info size={11} />
            </button>
          </div>
          <div className="text-base sm:text-lg font-extrabold text-blue-600 dark:text-blue-400 tracking-tight leading-none truncate">
            {currentVelocity} {isEn ? 'tasks/d' : 'việc/ngày'}
          </div>
          <div
            className="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 truncate"
            title={`${isEn ? 'Target:' : 'Mục tiêu:'} ${requiredVelocity} ${isEn ? 'tasks/d' : 'việc/ngày'}`}
          >
            {isEn ? 'Target:' : 'Mục tiêu:'} {requiredVelocity} {isEn ? 'tasks/d' : 'việc/ngày'}
          </div>
        </div>

        {activeInfoBox === 3 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-[calc(100%+6px)] z-50 w-60 sm:w-64 p-2.5 rounded-[8px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700 shadow-xl text-left text-[11px] text-gray-700 dark:text-slate-200"
          >
            <div className="font-bold text-blue-600 dark:text-blue-400 mb-1">
              {isEn ? 'Mechanism: Execution Pace' : 'Cơ chế: Tốc độ triển khai'}
            </div>
            <div>
              {isEn
                ? 'Compares actual completion speed against the daily run-rate required to meet the planned Launch Date.'
                : 'So sánh tốc độ hoàn thành công việc thực tế của team với định mức cần đạt mỗi ngày để kịp ngày ra mắt chiến dịch (Launch Date).'}
            </div>
          </div>
        )}

        {activeBoxPopup === 3 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-[calc(100%+8px)] z-50 w-72 sm:w-80 p-3 sm:p-4 rounded-[12px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-2xl transition-all duration-200 ease-out animate-in fade-in zoom-in-95 text-left origin-top-left"
          >
            <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
              <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                {isEn ? 'Execution Pace' : 'Tốc độ triển khai'}
              </span>
              <button
                type="button"
                onClick={() => setActiveBoxPopup(null)}
                className="w-6 h-6 rounded-full grid place-items-center text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-3 rounded-[8px] bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 text-xs space-y-2 mt-2">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800">
                  <div className="text-[10px] text-gray-500 dark:text-slate-400">{isEn ? 'Current Velocity' : 'Tốc độ hiện tại'}</div>
                  <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400">{currentVelocity} {isEn ? 'tasks/d' : 'việc/ngày'}</div>
                </div>
                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800">
                  <div className="text-[10px] text-gray-500 dark:text-slate-400">{isEn ? 'Target Needed' : 'Chỉ tiêu cần đạt'}</div>
                  <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{requiredVelocity} {isEn ? 'tasks/d' : 'việc/ngày'}</div>
                </div>
              </div>
              <div className="text-[11px] text-gray-600 dark:text-slate-300 leading-relaxed">
                {isEn
                  ? `To complete all remaining ${remainingTasksCount} tasks within ${remainingDaysCount} remaining days, the team needs to maintain an average pace of ${requiredVelocity} tasks/d.`
                  : `Để hoàn thành tất cả ${remainingTasksCount} việc còn lại trong ${remainingDaysCount} ngày tới, đội ngũ cần duy trì tốc độ trung bình ${requiredVelocity} việc/ngày.`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Box 4: Khối lượng còn lại (Remaining Scope) - Tím */}
      <div
        className={`relative ${activeBoxPopup === 4 || activeInfoBox === 4 ? 'z-[90]' : 'z-10'}`}
        data-workflow-popover="true"
      >
        <div
          role="button"
          tabIndex={0}
          onMouseMove={handleMagneticMove}
          onClick={() => {
            setActiveInfoBox(null);
            setActiveBoxPopup((prev) => (prev === 4 ? null : 4));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveInfoBox(null);
              setActiveBoxPopup((prev) => (prev === 4 ? null : 4));
            }
          }}
          className={`hover-magnetic-card magnetic-violet p-2 sm:p-2.5 rounded-[10px] bg-slate-50/85 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 grid grid-flow-row content-between gap-1 min-w-0 shadow-2xs cursor-pointer transition-all hover:border-violet-400/80 dark:hover:border-violet-500/60 hover:shadow-md hover:-translate-y-0.5 ${
            activeBoxPopup === 4 ? 'ring-2 ring-violet-500 shadow-md' : ''
          }`}
        >
          <div className="grid grid-cols-[1fr_auto] items-center gap-1 w-full min-w-0">
            <span className="text-[10px] sm:text-[10.5px] font-bold text-gray-700 dark:text-slate-300 truncate">
              {isEn ? 'Remaining Scope' : 'Khối lượng còn lại'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveBoxPopup(null);
                setActiveInfoBox((prev) => (prev === 4 ? null : 4));
              }}
              className="p-0.5 rounded text-gray-400 hover:text-violet-500 transition-colors"
              title={isEn ? 'Mechanism info' : 'Giải thích cơ chế'}
            >
              <Info size={11} />
            </button>
          </div>
          <div className="text-base sm:text-lg font-extrabold text-violet-600 dark:text-violet-400 tracking-tight leading-none truncate">
            {isEn ? `${remainingTasksCount}/${totalTasksCount} Tasks Left` : `Còn ${remainingTasksCount}/${totalTasksCount} việc`}
          </div>
          <div
            className="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 truncate"
            title={isEn ? `${remainingWorkPct}% scope left · ${remainingTimePct}% time remaining` : `Còn ${remainingWorkPct}% việc · ${remainingTimePct}% quỹ thời gian`}
          >
            {isEn ? `${remainingWorkPct}% scope · ${remainingTimePct}% time left` : `Còn ${remainingWorkPct}% việc · ${remainingTimePct}% quỹ tg`}
          </div>
        </div>

        {activeInfoBox === 4 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-[calc(100%+6px)] z-50 w-60 sm:w-64 p-2.5 rounded-[8px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700 shadow-xl text-left text-[11px] text-gray-700 dark:text-slate-200"
          >
            <div className="font-bold text-violet-600 dark:text-violet-400 mb-1">
              {isEn ? 'Mechanism: Remaining Scope' : 'Cơ chế: Khối lượng còn lại'}
            </div>
            <div>
              {isEn
                ? 'Balances unfinished deliverable percentages against remaining campaign timeline to catch potential delivery shortfalls early.'
                : 'Đối chiếu phần trăm khối lượng công việc chưa xong với phần trăm quỹ thời gian còn lại của chiến dịch để phát hiện nguy cơ hụt hơi.'}
            </div>
          </div>
        )}

        {activeBoxPopup === 4 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-[calc(100%+8px)] z-50 w-72 sm:w-80 p-3 sm:p-4 rounded-[12px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-2xl transition-all duration-200 ease-out animate-in fade-in zoom-in-95 text-left origin-top-left"
          >
            <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
              <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                {isEn ? 'Remaining Scope' : 'Khối lượng còn lại'}
              </span>
              <button
                type="button"
                onClick={() => setActiveBoxPopup(null)}
                className="w-6 h-6 rounded-full grid place-items-center text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-3 rounded-[8px] bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200/70 dark:border-violet-900/40 text-xs space-y-2 mt-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-violet-100 dark:border-slate-800">
                  <div className="text-[10px] text-gray-500">{isEn ? 'Total' : 'Tổng task'}</div>
                  <div className="text-base font-extrabold text-gray-900 dark:text-white">{totalTasksCount}</div>
                </div>
                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-violet-100 dark:border-slate-800">
                  <div className="text-[10px] text-gray-500">{isEn ? 'Done' : 'Đã xong'}</div>
                  <div className="text-base font-extrabold text-emerald-600">{doneTasks.length}</div>
                </div>
                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-violet-100 dark:border-slate-800">
                  <div className="text-[10px] text-gray-500">{isEn ? 'Remaining' : 'Còn lại'}</div>
                  <div className="text-base font-extrabold text-violet-600">{remainingTasksCount}</div>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div className="bg-violet-600 h-full rounded-full transition-all duration-300" style={{ width: `${100 - remainingWorkPct}%` }} />
              </div>
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400 text-center">
                {isEn ? `Burned ${100 - remainingWorkPct}% of total scope` : `Đã hoàn thành ${100 - remainingWorkPct}% tổng khối lượng dự án`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Box 5: Dự báo tiến độ (Schedule Forecast) - Vàng/Cam */}
      <div
        className={`relative ${activeBoxPopup === 5 || activeInfoBox === 5 ? 'z-[90]' : 'z-10'}`}
        data-workflow-popover="true"
      >
        <div
          role="button"
          tabIndex={0}
          onMouseMove={handleMagneticMove}
          onClick={() => {
            setActiveInfoBox(null);
            setActiveBoxPopup((prev) => (prev === 5 ? null : 5));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveInfoBox(null);
              setActiveBoxPopup((prev) => (prev === 5 ? null : 5));
            }
          }}
          className={`hover-magnetic-card magnetic-amber p-2 sm:p-2.5 rounded-[10px] bg-slate-50/85 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 grid grid-flow-row content-between gap-1 min-w-0 shadow-2xs cursor-pointer transition-all hover:border-amber-400/80 dark:hover:border-amber-500/60 hover:shadow-md hover:-translate-y-0.5 ${
            activeBoxPopup === 5 ? 'ring-2 ring-amber-500 shadow-md' : ''
          }`}
        >
          <div className="grid grid-cols-[1fr_auto] items-center gap-1 w-full min-w-0">
            <span className="text-[10px] sm:text-[10.5px] font-bold text-gray-700 dark:text-slate-300 truncate">
              {isEn ? 'Schedule Forecast' : 'Dự báo tiến độ'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveBoxPopup(null);
                setActiveInfoBox((prev) => (prev === 5 ? null : 5));
              }}
              className="p-0.5 rounded text-gray-400 hover:text-amber-500 transition-colors"
              title={isEn ? 'Mechanism info' : 'Giải thích cơ chế'}
            >
              <Info size={11} />
            </button>
          </div>
          <div className={`text-base sm:text-lg font-extrabold tracking-tight leading-none truncate ${
            varianceDays > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
          }`}>
            {varianceDays > 0 ? (isEn ? `+${varianceDays}d Delay` : `Lệch +${varianceDays} ngày`) : (isEn ? 'On Track' : 'Đúng tiến độ')}
          </div>
          <div
            className="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 truncate"
            title={`${isEn ? 'Forecast' : 'Dự kiến'}: ${forecastDateStr}`}
          >
            {isEn ? 'Est' : 'Dự kiến'}: {forecastDateStr}
          </div>
        </div>

        {activeInfoBox === 5 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-[calc(100%+6px)] z-50 w-60 sm:w-64 p-2.5 rounded-[8px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700 shadow-xl text-left text-[11px] text-gray-700 dark:text-slate-200"
          >
            <div className="font-bold text-amber-600 dark:text-amber-400 mb-1">
              {isEn ? 'Mechanism: Schedule Forecast' : 'Cơ chế: Dự báo tiến độ'}
            </div>
            <div>
              {isEn
                ? 'Projects completion date based on maximum stage bottlenecks compared against original baseline commitments.'
                : 'Ước tính ngày hoàn thành thực tế dựa trên độ trễ lớn nhất của các chặng hiện tại so với mốc cam kết ban đầu.'}
            </div>
          </div>
        )}

        {activeBoxPopup === 5 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 sm:w-80 p-3 sm:p-4 rounded-[12px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-2xl transition-all duration-200 ease-out animate-in fade-in zoom-in-95 text-left origin-top-right"
          >
            <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
              <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                {isEn ? 'Schedule Forecast' : 'Dự báo tiến độ'}
              </span>
              <button
                type="button"
                onClick={() => setActiveBoxPopup(null)}
                className="w-6 h-6 rounded-full grid place-items-center text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-3 rounded-[8px] bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 text-xs space-y-2 mt-2">
              <div className="grid grid-cols-[1fr_auto] items-center justify-between text-xs">
                <span className="font-semibold text-gray-700 dark:text-slate-300">{isEn ? 'Committed Plan Date' : 'Hạn chót theo kế hoạch'}:</span>
                <span className="font-bold text-gray-900 dark:text-white">{planDateStr}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center justify-between text-xs">
                <span className="font-semibold text-gray-700 dark:text-slate-300">{isEn ? 'Forecast Completion Date' : 'Dự kiến hoàn thành thực tế'}:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{forecastDateStr}</span>
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800 text-[11px] text-gray-600 dark:text-slate-300">
                {varianceDays > 0
                  ? (isEn ? `⚠️ Project is currently running +${varianceDays} days behind committed schedule.` : `⚠️ Dự án hiện đang lệch +${varianceDays} ngày so với cam kết ban đầu do các task nghẽn.`)
                  : (isEn ? `✅ Project is running on schedule with zero variance.` : `✅ Dự án đang chạy đúng kế hoạch và không có độ trễ.`)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Box 6: Chờ duyệt nghiệm thu (Pending Review) - Xanh ngọc */}
      <div
        className={`relative ${activeBoxPopup === 6 || activeInfoBox === 6 ? 'z-[90]' : 'z-10'}`}
        data-workflow-popover="true"
      >
        <div
          role="button"
          tabIndex={0}
          onMouseMove={handleMagneticMove}
          onClick={() => {
            setActiveInfoBox(null);
            setActiveBoxPopup((prev) => (prev === 6 ? null : 6));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveInfoBox(null);
              setActiveBoxPopup((prev) => (prev === 6 ? null : 6));
            }
          }}
          className={`hover-magnetic-card [--glow-color:20,184,166] p-2 sm:p-2.5 rounded-[10px] bg-slate-50/85 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 grid grid-flow-row content-between gap-1 min-w-0 shadow-2xs cursor-pointer transition-all hover:border-teal-400/80 dark:hover:border-teal-500/60 hover:shadow-md hover:-translate-y-0.5 ${
            activeBoxPopup === 6 ? 'ring-2 ring-teal-500 shadow-md' : ''
          }`}
        >
          <div className="grid grid-cols-[1fr_auto] items-center gap-1 w-full min-w-0">
            <span className="text-[10px] sm:text-[10.5px] font-bold text-gray-700 dark:text-slate-300 truncate">
              {isEn ? 'Pending Review' : 'Chờ duyệt nghiệm thu'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveBoxPopup(null);
                setActiveInfoBox((prev) => (prev === 6 ? null : 6));
              }}
              className="p-0.5 rounded text-gray-400 hover:text-teal-500 transition-colors"
              title={isEn ? 'Mechanism info' : 'Giải thích cơ chế'}
            >
              <Info size={11} />
            </button>
          </div>
          <div className="text-base sm:text-lg font-extrabold text-teal-600 dark:text-teal-400 tracking-tight leading-none truncate">
            {inReviewTasks.length} {isEn ? 'In Review' : 'Chờ duyệt'}
          </div>
          <div
            className="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 truncate"
            title={`${overdueReviewCount} ${isEn ? 'Overdue' : 'Quá hạn duyệt'} · +${addedTasksCount} ${isEn ? 'Ad-hoc' : 'Việc phát sinh'}`}
          >
            {overdueReviewCount} {isEn ? 'Late' : 'Quá hạn'} · +{addedTasksCount} {isEn ? 'Added' : 'Phát sinh'}
          </div>
        </div>

        {activeInfoBox === 6 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-[calc(100%+6px)] z-50 w-60 sm:w-64 p-2.5 rounded-[8px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700 shadow-xl text-left text-[11px] text-gray-700 dark:text-slate-200"
          >
            <div className="font-bold text-teal-600 dark:text-teal-400 mb-1">
              {isEn ? 'Mechanism: Pending Review' : 'Cơ chế: Chờ duyệt nghiệm thu'}
            </div>
            <div>
              {isEn
                ? 'Review queue of submitted deliverables awaiting Leader sign-off (In QA/Review) and newly added ad-hoc tasks.'
                : 'Danh sách các ấn phẩm/đầu việc nhân sự đã nộp lên trạng thái Chờ nghiệm thu (In QA/Review) đang đợi Leader kiểm duyệt, kèm số việc phát sinh ngoài kế hoạch.'}
            </div>
          </div>
        )}

        {activeBoxPopup === 6 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 sm:w-80 p-3 sm:p-4 rounded-[12px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-2xl transition-all duration-200 ease-out animate-in fade-in zoom-in-95 text-left origin-top-right"
          >
            <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
              <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                {isEn ? 'Pending Review' : 'Hàng đợi nghiệm thu'}
              </span>
              <button
                type="button"
                onClick={() => setActiveBoxPopup(null)}
                className="w-6 h-6 rounded-full grid place-items-center text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <div className="pt-2 max-h-72 overflow-y-auto space-y-2">
              {inReviewTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-emerald-600 dark:text-emerald-400">
                  {isEn ? 'No tasks waiting in review queue.' : 'Hàng đợi nghiệm thu sạch, không có task nào chờ review.'}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {inReviewTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-2 rounded-[8px] bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-900/40 grid grid-cols-[1fr_auto] items-center gap-2 text-xs"
                    >
                      <span className="truncate font-medium text-gray-900 dark:text-white">• {t.title}</span>
                      <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-teal-600 text-white shrink-0">
                        {isEn ? 'In Review' : 'Chờ duyệt'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
