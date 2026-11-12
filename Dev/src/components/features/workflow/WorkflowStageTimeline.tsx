import {ActionButton} from '../../common/ActionButton';
import type {WorkflowModel} from '../../../hooks/useWorkflowManagement';
import React, { useState } from 'react';
import {Plus, ChevronUp, ChevronLeft, ChevronRight, Trash2, Pencil, Eye, Check, Circle, Pause, CircleX, ScanEye} from 'lucide-react';
import {workflowPhaseContributors} from '../../../lib/workflowCalendar';
import {WorkflowPeopleRows} from '../../features/projects/WorkflowPeopleRows';
import {WorkflowPhaseDates} from '../../features/projects/WorkflowPhaseDates';
import {taskProgress} from '../../../lib/workflowHub';

export function WorkflowStageTimeline({
  model,
  draggingTaskId,
  setDraggingTaskId,
}: {
  model: WorkflowModel;
  draggingTaskId?: string | null;
  setDraggingTaskId?: (id: string | null) => void;
}) {
  const {hub, isEn, currentEntity, isCampaign, isDetailOpen, setIsDetailOpen, allTasks, phases, unplanned, linkTask, activePhaseIndex, handleOpenAddPhaseModal, timelineScrollRef, canScrollLeft, canScrollRight, scrollTimeline, handleDeletePhase, handlePhaseClick, pct, canManagePhases} = model;
  const [dragOverPhaseId, setDragOverPhaseId] = useState<string | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollStart, setScrollStart] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, a, select, [data-interactive="true"]')) return;
    if (!timelineScrollRef.current) return;
    setIsMouseDown(true);
    setHasDragged(false);
    setStartX(e.pageX - timelineScrollRef.current.offsetLeft);
    setScrollStart(timelineScrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDown || !timelineScrollRef.current) return;
    const x = e.pageX - timelineScrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 4) {
      setHasDragged(true);
    }
    timelineScrollRef.current.scrollLeft = scrollStart - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsMouseDown(false);
  };

  const handleMagneticMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  if (!currentEntity) return null;
  return (
    <div className="relative group/timeline pt-2 pb-2">
      {/* Scroll Left Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollTimeline('left')}
          aria-label={isEn ? 'Scroll left' : 'Trượt sang trái'}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-gray-200 dark:border-slate-700 shadow-xl grid place-items-center text-gray-700 dark:text-gray-200 hover:text-primary dark:hover:text-cyan-400 hover:scale-110 active:scale-95 transition-all cursor-pointer ring-1 ring-black/5 dark:ring-white/10"
          title={isEn ? 'Scroll left' : 'Trượt sang trái'}
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
      )}

      {/* Scroll Right Button */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollTimeline('right')}
          aria-label={isEn ? 'Scroll right' : 'Trượt sang phải'}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-gray-200 dark:border-slate-700 shadow-xl grid place-items-center text-gray-700 dark:text-gray-200 hover:text-primary dark:hover:text-cyan-400 hover:scale-110 active:scale-95 transition-all cursor-pointer ring-1 ring-black/5 dark:ring-white/10"
          title={isEn ? 'Scroll right' : 'Trượt sang phải'}
        >
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      )}

      <div
        ref={timelineScrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className={`overflow-x-auto scrollbar-thin custom-scrollbar scroll-smooth select-none ${isMouseDown ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <div className="grid grid-flow-col auto-cols-max items-center min-w-max pb-2 pt-1 px-1">
            {phases.map((p, idx) => {
              const isSelected = idx === activePhaseIndex;
              const isCompleted = p.displayStatus === 'completed';
              const isActive = p.displayStatus === 'active';
              const isDropTargetActive = Boolean(draggingTaskId) && dragOverPhaseId === p.id;

              return (
                <React.Fragment key={p.id}>
                  {/* Circular Phase Node Card */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`${isEn ? 'Select phase' : 'Chọn chặng'}: ${p.title}`}
                    aria-pressed={isSelected}
                    onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); handlePhaseClick(idx); } }}
                    onClick={() => { if (!hasDragged) handlePhaseClick(idx); }}
                    onDragOver={(e) => {
                      if (!canManagePhases || ['completed', 'cancelled'].includes(p.status)) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverPhaseId !== p.id) {
                        setDragOverPhaseId(p.id);
                      }
                    }}
                    onDragEnter={(e) => {
                      if (!canManagePhases || ['completed', 'cancelled'].includes(p.status)) return;
                      e.preventDefault();
                      setDragOverPhaseId(p.id);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        if (dragOverPhaseId === p.id) {
                          setDragOverPhaseId(null);
                        }
                      }
                    }}
                    onDrop={(e) => {
                      if (!canManagePhases || ['completed', 'cancelled'].includes(p.status)) return;
                      e.preventDefault();
                      setDragOverPhaseId(null);
                      const taskId = e.dataTransfer.getData('text/plain') || draggingTaskId;
                      if (!taskId) return;
                      const task = unplanned.find(t => t.id === taskId) || allTasks.find(t => t.id === taskId);
                      if (task) {
                        linkTask(task, p.id);
                      }
                      setDraggingTaskId?.(null);
                    }}
                    onMouseMove={handleMagneticMove}
                    className={`hover-magnetic-card ${isCampaign ? 'magnetic-amber' : 'magnetic-violet'} w-48 sm:w-56 p-3.5 rounded-[8px] border transition-all cursor-pointer relative grid grid-cols-1 justify-items-center text-center shrink-0 group ${
                      isDropTargetActive
                        ? 'ring-2 ring-primary border-primary bg-primary/10 scale-[1.03]'
                        : isSelected
                        ? isCampaign
                          ? 'border-amber-500 ring-2 ring-amber-500/25 bg-amber-50/10 dark:bg-amber-950/15 shadow-md -translate-y-0.5'
                          : 'border-violet-600 ring-2 ring-violet-600/25 bg-violet-50/10 dark:bg-violet-950/15 shadow-md -translate-y-0.5'
                        : isCompleted
                        ? 'border-emerald-500/40 bg-white dark:bg-slate-800 hover:border-emerald-500/70'
                        : 'border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 hover:border-gray-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {isDropTargetActive && (
                      <div className="absolute inset-0 z-30 rounded-[8px] bg-primary/15 backdrop-blur-[1px] border-2 border-primary border-dashed grid items-center justify-center p-2 text-center pointer-events-none transition-all">
                        <span className="text-[11px] font-extrabold text-primary dark:text-sky-300 bg-white/95 dark:bg-[#0a192f]/95 px-2.5 py-1.5 rounded-[6px] shadow-md border border-primary/30">
                          {isEn ? '+ Drop to assign to phase' : '+ Thả để gắn vào chặng'}
                        </span>
                      </div>
                    )}
                    {/* Header Row: Chặng order & Edit / Delete action buttons on hover */}
                    <div className="w-full grid grid-cols-[1fr_auto] items-center mb-1">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : isActive
                          ? isCampaign
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        {isEn ? `Phase ${p.position}` : `Chặng ${p.position}`}{canManagePhases ? '/' + phases.length : (isEn ? ' · assigned' : ' · được giao')}
                      </span>

                      {canManagePhases && (
                        <div className="grid grid-flow-col auto-cols-max items-center gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAddPhaseModal(idx, e, p);
                            }}
                            className="p-1 rounded-lg text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors cursor-pointer"
                            title={isEn ? `Edit phase: ${p.name}` : `Chỉnh sửa giai đoạn: ${p.name}`}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePhase(idx, e);
                            }}
                            className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            title={isEn ? `Delete phase: ${p.name}` : `Xóa giai đoạn: ${p.name}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Soft Technical Liquid Glass Progress Pod (No harsh strokes) */}
                    <div className="relative w-20 h-20 grid place-items-center my-1.5">
                      {isCompleted ? (
                        /* Chặng hoàn thành: Soft Emerald Glass Orb */
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400/90 via-emerald-500/90 to-teal-600/90 backdrop-blur-md grid place-items-center text-white shadow-[0_4px_16px_rgba(16,185,129,0.3),inset_0_1px_1.5px_rgba(255,255,255,0.75)] transition-transform duration-300 hover:scale-105">
                          <Check size={22} strokeWidth={2.5} />
                        </div>
                      ) : isActive ? (
                        /* Chặng đang chạy: Soft Conic Liquid Glass Dial (No harsh strokes) */
                        <div
                          className="w-16 h-16 rounded-full p-[3.5px] grid place-items-center relative transition-transform duration-300 hover:scale-105 shadow-[0_4px_16px_rgba(124,58,237,0.22)]"
                          style={{
                            background: `conic-gradient(from 180deg, ${
                              isCampaign ? '#f59e0b, #fbbf24' : '#7c3aed, #a78bfa'
                            } ${(p.progress ?? 0) * 3.6}deg, rgba(148, 163, 184, 0.15) ${(p.progress ?? 0) * 3.6}deg 360deg)`
                          }}
                        >
                          <div className="w-full h-full rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md grid place-items-center content-center shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.85),0_2px_8px_rgba(0,0,0,0.12)]">
                            <span className={`text-xs font-black tracking-tight ${
                              isCampaign ? 'text-amber-600 dark:text-amber-400' : 'text-violet-600 dark:text-violet-400'
                            }`}>
                              {pct(p.progress)}
                            </span>
                            <span className="text-[7.5px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-tight">
                              {isEn ? 'Running' : 'Đang chạy'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* Chặng chưa bắt đầu: Soft minimal glass pod */
                        <div className="w-16 h-16 rounded-full p-[2.5px] bg-slate-200/50 dark:bg-slate-800/50 grid place-items-center">
                          <div className="w-full h-full rounded-full bg-slate-100/80 dark:bg-slate-800/80 grid place-items-center text-xs font-bold text-gray-400 dark:text-slate-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]">
                            P{p.position}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status Pill */}
                    <ActionButton mobileOnlyIcon icon={isCompleted ? <Check size={16}/> : p.status === 'cancelled' ? <CircleX size={16}/> : p.status === 'on_hold' ? <Pause size={16}/> : p.status === 'in_review' ? <ScanEye size={16}/> : <Circle size={16}/>} onClick={e => e.stopPropagation()} className={`text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 ${
                      isCompleted
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : isActive
                        ? isCampaign
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-400'
                    }`}>
                      {isCompleted ? (isEn ? '✓ Completed' : '✓ Hoàn thành') : p.status === 'cancelled' ? (isEn ? 'Canceled' : 'Đã hủy') : p.status === 'on_hold' ? (isEn ? 'On Hold' : 'Tạm dừng') : p.status === 'in_review' ? (isEn ? 'In Review' : 'Đang nghiệm thu') : isActive ? (isEn ? '● In Progress' : '● Đang triển khai') : (isEn ? '○ Not Started' : '○ Chờ bắt đầu')}
                    </ActionButton>

                    {/* Phase Name & Desc */}
                    <b className={`text-xs block line-clamp-1 w-full ${
                      isSelected
                        ? (isCampaign ? 'text-amber-600 dark:text-amber-400' : 'text-violet-600 dark:text-violet-400')
                        : 'text-gray-900 dark:text-white'
                    }`} title={p.name}>
                      {p.name}
                    </b>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block line-clamp-1 mt-0.5 w-full" title={p.desc}>
                      {p.desc}
                    </span>

                    <WorkflowPhaseDates start={p.start_date || currentEntity.start_date} due={p.due_date || currentEntity.due_date} status={p.status} en={isEn} inherited={(!p.start_date && !!currentEntity.start_date) || (!p.due_date && !!currentEntity.due_date)}/>
                    <WorkflowPeopleRows pics={p.members.filter(member => member.role === 'pic')} contributors={workflowPhaseContributors(p.members, allTasks.filter(task => task.workflow_phase_id === p.id), hub.people)} en={isEn} isCampaign={isCampaign}/>

                    {/* Visualized Task Progress Bar (Mức xanh chạy lên trực quan theo % hoàn thành) */}
                    {(() => {
                      const phaseTasks = allTasks.filter(task => task.workflow_phase_id === p.id);
                      const pProg = taskProgress(phaseTasks);
                      const doneCount = pProg.done;
                      const totalCount = pProg.total;
                      const pctDone = pProg.percent;
                      return (
                        <div
                          className="relative w-full h-5.5 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-900/60 border border-gray-200/80 dark:border-slate-700/80 shadow-2xs grid place-items-center my-1.5"
                          title={`${isEn ? 'Task completion' : 'Tiến độ đầu việc'}: ${doneCount}/${totalCount} (${pctDone}%)`}
                        >
                          <div
                            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-emerald-500 dark:to-teal-400 transition-all duration-500 ease-out"
                            style={{ width: `${pctDone}%` }}
                          />
                          <span className="relative z-10 text-[10px] font-extrabold text-gray-800 dark:text-white drop-shadow-2xs select-none">
                            {doneCount === totalCount && totalCount > 0 ? '✓ ' : ''}
                            {doneCount}/{totalCount} {isEn ? 'tasks completed' : 'việc xong'}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Gate chance info */}
                    <div className="w-full mt-2 pt-1.5 border-t border-gray-100 dark:border-slate-700/60 grid grid-cols-[1fr_auto] items-center text-[10px]">
                      <span className="text-gray-400">{isEn ? 'Gate chance:' : 'Cơ hội Gate:'}</span>
                      <span className={`font-bold ${
                        isCompleted ? 'text-emerald-500' : (p.gateChance ?? -1) >= 80 ? 'text-emerald-500' : (p.gateChance ?? -1) >= 50 ? 'text-amber-500' : 'text-gray-400'
                      }`}>
                        {pct(p.gateChance)}
                      </span>
                    </div>

                    {/* Action button: Xem chi tiết */}
                    <ActionButton icon={isSelected && isDetailOpen ? <ChevronUp size={13}/> : <Eye size={13}/>}
                      type="button"
                      aria-expanded={isSelected && isDetailOpen}
                      onClick={(e) => {
                        e.stopPropagation();
                        const open = !(isSelected && isDetailOpen);
                        handlePhaseClick(idx);
                        setIsDetailOpen(open);
                      }}
                      className={`w-full mt-2 py-1.5 px-2 rounded-[8px] text-[11px] font-bold grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 transition-all shadow-2xs ${
                        isSelected && isDetailOpen
                          ? isCampaign
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30'
                          : 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-700/80 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-600'
                      }`}
                    >
                      {isSelected && isDetailOpen ? (isEn ? 'Collapse' : 'Thu gọn') : (isEn ? 'View details' : 'Xem chi tiết')}
                    </ActionButton>
                  </div>

                  {/* Connecting Shape Link with (+) Center Bead between adjacent phases */}
                  {idx < phases.length - 1 && (
                    <div className="grid place-items-center self-center px-1 sm:px-2 shrink-0 relative group/connector">
                      {/* Connecting capsule shape */}
                      <div className={`h-2 w-8 sm:w-12 rounded-full transition-all ${
                        isCompleted
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-xs'
                          : isActive
                          ? (isCampaign ? 'bg-gradient-to-r from-amber-400 to-amber-200 dark:to-slate-700' : 'bg-gradient-to-r from-violet-500 to-violet-200 dark:to-slate-700')
                          : 'bg-gray-200 dark:bg-slate-700'
                      }`} />

                      {/* Center round shape (+) button */}
                      <button
                        type="button"
                        disabled={!canManagePhases}
                        onClick={(e) => handleOpenAddPhaseModal(p.position, e)}
                        className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-violet-500 dark:hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-slate-700 text-gray-400 hover:text-violet-500 dark:hover:text-violet-400 grid place-items-center transition-all shadow-sm hover:scale-110 z-20 cursor-pointer"
                        title={isEn ? `Insert new phase after phase ${idx + 1}` : `Chèn thêm giai đoạn mới sau chặng ${idx + 1}`}
                      >
                        <Plus size={12} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* Add Phase End Card */}
            {canManagePhases && <div className="grid justify-items-center content-center shrink-0 self-center p-3 ml-2 min-w-[120px]">
              <button
                type="button"
                onClick={() => handleOpenAddPhaseModal(phases.length)}
                className={`w-14 h-14 rounded-full border-2 border-dashed grid place-items-center content-center transition-all hover:scale-105 shadow-sm group cursor-pointer ${
                  isCampaign
                    ? 'border-amber-400/70 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-amber-600 dark:text-amber-400'
                    : 'border-violet-400/70 hover:border-violet-600 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 text-violet-600 dark:text-violet-400'
                }`}
                title={isEn ? "Add new phase to end of roadmap" : "Thêm giai đoạn mới vào cuối lộ trình"}
              >
                <Plus size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-200" />
                <span className="text-[8px] font-bold mt-0.5">{isEn ? 'Add Phase' : 'Thêm chặng'}</span>
              </button>
              <span className="text-[9px] text-gray-400 mt-1 text-center">{isEn ? 'Custom roadmap' : 'Tùy biến lộ trình'}</span>
            </div>}
            </div>
          </div>
        </div>
  );
}
