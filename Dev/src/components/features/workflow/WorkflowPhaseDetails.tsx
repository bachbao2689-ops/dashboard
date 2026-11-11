import {useTaskCommentCounts} from '../../../hooks/useTaskCommentCounts';
import {useState, useRef, useEffect} from 'react';
import type {WorkflowModel} from '../../../hooks/useWorkflowManagement';
import {X, Code2, Calendar, User, Edit3, Trash2, ArrowLeft} from 'lucide-react';
import {displayDate} from '../../../lib/workflowHub';
import {WorkflowStatusPicker, WORKFLOW_STATUS_CONFIG, WORKFLOW_STATUS_LABELS_VI, WORKFLOW_STATUS_LABELS_EN, type WorkflowTaskStatus} from '../../features/tasks/WorkflowStatusPicker';
import {WorkflowGateChecklist} from './WorkflowGateChecklist';
import {MultiSelect} from '../../common/MultiSelect';
import {WorkflowDateField} from '../../features/projects/WorkflowDateField';
import {Avatar} from '../../common/Avatar';
import {TaskPinButton} from '../tasks/TaskPinButton';
import {CommentPreviewPopover} from '../../common/CommentPreviewPopover';
import {useSidebarPinStore} from '../../../store/sidebarPinStore';

export function WorkflowPhaseDetails({model}: {model: WorkflowModel}) {
  const {hub, isEn, currentEntity, isCampaign, isDetailOpen, setIsDetailOpen, openTaskComments, openTaskDetails, activePhase, currentPhaseSubtasks, doneSubtasksCount, totalSubtasksCount, phaseProgressPct, taskCalendar, showAddTask, setShowAddTask, newTaskTitle, setNewTaskTitle, newTaskAssignees, setNewTaskAssignees, newTaskStatus, setNewTaskStatus, newTaskDue, setNewTaskDue, newTaskStart, setNewTaskStart, newTaskQuantity, setNewTaskQuantity, taskOptions, toggleSubtask, handleAddTask, handleDeleteTask, handleQuickChangeStatus, pct} = model;
  const pinnedTaskIds = useSidebarPinStore(s => s.pinnedIds);

  const [splitPct, setSplitPct] = useState(58);
  const [resizing, setResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!resizing) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const pctValue = (offsetX / rect.width) * 100;
      if (pctValue >= 28 && pctValue <= 72) {
        setSplitPct(pctValue);
      }
    };
    const onMouseUp = () => {
      setResizing(false);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizing]);

  const commentTracking = useTaskCommentCounts(isDetailOpen ? currentPhaseSubtasks.map(task=>task.id) : [],hub.profile?.id);
  if (!currentEntity) return null;
  if (!activePhase) return null;
  return (<>
{isDetailOpen && activePhase && (
          <div className="pt-4 border-t border-gray-100 dark:border-slate-700/80 space-y-4 animate-in fade-in duration-300">

            {/* Top Detail Bar with Back Arrow action and Collapse details (REQ-TOT-02 / Slide 2) */}
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 bg-primary/5 dark:bg-primary/10 px-3 py-2 rounded-[8px]">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="inline-grid place-items-center w-7 h-7 rounded-[8px] bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 shadow-2xs transition-colors cursor-pointer"
                title={isEn ? "Back to all phases" : "Quay lại tổng quan các chặng"}
                aria-label={isEn ? "Back" : "Quay lại"}
              >
                <ArrowLeft size={15} />
              </button>

              <div className="inline-grid grid-flow-col auto-cols-max items-center gap-2 min-w-0 overflow-hidden">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shrink-0" />
                <span className="text-xs font-bold text-primary uppercase tracking-wide truncate">
                  {isEn ? 'Selected Phase Details:' : 'Chi tiết chặng đang chọn:'}
                </span>
                <b className="text-xs text-gray-900 dark:text-white truncate">
                  {activePhase.name} — {activePhase.desc}
                </b>
              </div>

              <button
                onClick={() => setIsDetailOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 inline-grid grid-flow-col auto-cols-max items-center gap-1 font-semibold transition-colors justify-self-end"
              >
                <X size={14} /> <span className="hidden sm:inline">{isEn ? 'Collapse details' : 'Thu gọn chi tiết'}</span>
              </button>
            </div>

            {/* Split Columns: Cột Trái (Gate Checklist) & Cột Phải (Đầu việc) with interactive drag resizer */}
            <div ref={containerRef} className="flex flex-col lg:flex-row items-stretch gap-0 relative">

              {/* Left Column (Gate Checklist) */}
              <div
                style={{ flexBasis: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${splitPct}%` : '100%' }}
                className="w-full lg:min-w-[320px] shrink-0 min-h-full flex flex-col"
              >
                <WorkflowGateChecklist model={model}/>
              </div>

              {/* Middle Resizer Handle */}
              <div
                onMouseDown={() => setResizing(true)}
                className={`hidden lg:flex w-5 -mx-2.5 z-20 cursor-col-resize items-center justify-center group relative select-none shrink-0 ${
                  resizing ? 'cursor-col-resize' : ''
                }`}
                title={isEn ? "Drag to resize panels" : "Kéo để co giãn các bảng"}
              >
                <div className={`w-1 h-14 rounded-full transition-all duration-200 ${
                  resizing
                    ? 'bg-primary ring-4 ring-primary/20 scale-y-110'
                    : 'bg-gray-300 dark:bg-slate-600 group-hover:bg-primary group-hover:scale-y-105'
                }`} />
              </div>

              {/* Right Column: Quản Lý Đầu Việc Kỹ Thuật (Subtasks) của chặng */}
              <div
                style={{ flex: 1 }}
                className="w-full lg:min-w-[300px] shrink-0 mt-4 lg:mt-0 min-h-full flex flex-col"
              >
                <div className="w-full h-full p-4 rounded-[8px] bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                <div>
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700/80 pb-2.5 mb-2.5">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Code2 size={15} className={isCampaign ? 'text-amber-500' : 'text-violet-600 dark:text-violet-400'} />
                        {isEn ? 'Subtasks' : 'Subtask'} ({doneSubtasksCount}/{totalSubtasksCount})
                      </h4>
                      <span className="text-[10px] text-gray-400">{isEn ? 'Add, edit, delete, and switch task status' : 'Thêm, sửa, xóa và chuyển đổi trạng thái task'}</span>
                    </div>

                    <div className="grid grid-flow-col auto-cols-max items-center gap-2">
                      <span className="text-xs font-bold text-primary">{pct(phaseProgressPct)}</span>
                      <button
                        type="button"
                        disabled={!activePhase.can_edit_tasks || hub.busy || ['completed','cancelled'].includes(activePhase.status)}
                        onClick={() => { if (!showAddTask) { setNewTaskStart(taskCalendar.start); setNewTaskDue(taskCalendar.due); } setShowAddTask(!showAddTask); }}
                        className={`px-2.5 py-1.5 rounded-[8px] text-[11px] font-bold grid grid-flow-col auto-cols-max items-center gap-1 transition-all shadow-xs cursor-pointer ${
                          isCampaign
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : 'bg-violet-600 hover:bg-violet-700 text-white'
                        }`}
                        title={isEn ? '+ Add Phase Task' : '+ Thêm Task của Phase'}
                      >
                        <span>{isEn ? '+ Add Phase Task' : '+ Thêm Task của Phase'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline Add Task Form */}
                  {showAddTask && (
                    <form onSubmit={handleAddTask} className="p-3.5 rounded-[8px] border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-slate-800/90 mb-3 space-y-3 animate-in fade-in zoom-in-95">
                      <div className="grid grid-flow-col auto-cols-max items-center justify-between w-full">
                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">
                          {isEn ? '+ Add Phase Task' : '+ Thêm Task của Phase'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddTask(false)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 justify-self-end cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      </div>

                      {/* Row 1: Task Title Input */}
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        placeholder={isEn ? 'Enter task title...' : 'Nhập tên đầu việc...'}
                        autoFocus
                        className="w-full text-xs p-2.5 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                      />

                      {/* Row 2: 4 Equal Columns (PIC, Start Date, Due Date, Quantity), each 38px height */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 items-end">
                        <div className="min-w-0">
                          <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-300 mb-1 truncate">
                            {isEn ? 'Assignee' : 'Chọn PIC task...'}
                          </label>
                          <MultiSelect
                            options={taskOptions}
                            value={newTaskAssignees}
                            onChange={(ids: string[]) => setNewTaskAssignees(ids)}
                            placeholder={isEn ? 'Select task PICs...' : 'Chọn PIC task...'}
                            buttonClassName="!h-[38px] !min-h-[38px] !py-1 !px-2.5 !text-xs !rounded-[8px] !border-gray-200 dark:!border-slate-700"
                          />
                        </div>

                        <div className="min-w-0">
                          <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-300 mb-1 truncate" htmlFor="workflow-task-start">
                            {isEn ? 'Start date' : 'Ngày bắt đầu'}
                          </label>
                          <WorkflowDateField
                            id="workflow-task-start"
                            value={newTaskStart}
                            onChange={setNewTaskStart}
                            minDate={taskCalendar.start}
                            maxDate={newTaskDue || taskCalendar.due}
                            className="!h-[38px] !p-2 !rounded-[8px] !text-xs"
                          />
                        </div>

                        <div className="min-w-0">
                          <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-300 mb-1 truncate" htmlFor="workflow-task-due">
                            {isEn ? 'Due date' : 'Hạn chót'}
                          </label>
                          <WorkflowDateField
                            id="workflow-task-due"
                            value={newTaskDue}
                            onChange={setNewTaskDue}
                            minDate={newTaskStart || taskCalendar.start}
                            maxDate={taskCalendar.due}
                            className="!h-[38px] !p-2 !rounded-[8px] !text-xs"
                          />
                        </div>

                        <div className="min-w-0">
                          <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-300 mb-1 truncate">
                            {isEn ? 'Quantity' : 'Số lượng'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={newTaskQuantity}
                            onChange={e => setNewTaskQuantity(e.target.value)}
                            placeholder={isEn ? 'Qty / Amount' : 'SL / Số lượng'}
                            className="w-full h-[38px] text-xs px-2.5 py-1.5 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Row 3: Task Status */}
                      <div className="min-w-0">
                        <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-300 mb-1 truncate">
                          {isEn ? 'Initial status' : 'Trạng thái ban đầu'}
                        </label>
                        <select
                          value={newTaskStatus}
                          onChange={e => setNewTaskStatus(e.target.value as WorkflowTaskStatus)}
                          className="w-full h-[38px] text-xs px-2.5 py-1.5 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                        >
                          {(Object.keys(WORKFLOW_STATUS_CONFIG) as WorkflowTaskStatus[]).map(st => (
                            <option key={st} value={st}>
                              {isEn ? WORKFLOW_STATUS_LABELS_EN[st] : (WORKFLOW_STATUS_LABELS_VI[st] || WORKFLOW_STATUS_CONFIG[st].label)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <p className="text-[10px] text-gray-500 dark:text-slate-400">
                        {isEn ? 'Dates inherit the phase calendar within the Project/Campaign range.' : 'Lịch tự lấy từ chặng, nằm trong khoảng ngày của Project/Campaign.'}
                      </p>

                      <div className="grid grid-flow-col auto-cols-max items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddTask(false)}
                          className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                        >
                          {isEn ? 'Cancel' : 'Hủy'}
                        </button>
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 rounded-[8px] bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                        >
                          {isEn ? 'Save task' : 'Lưu đầu việc'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Subtasks List */}
                  <div className="space-y-2">
                    {currentPhaseSubtasks.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-400">
                        {isEn ? 'No tasks in this phase yet. Click "Add task" to create the first one.' : 'Chưa có đầu việc nào trong giai đoạn này. Bấm "Thêm task" để tạo đầu việc đầu tiên.'}
                      </div>
                    ) : (
                      currentPhaseSubtasks.map((s) => {
                        const done = s.status === 'completed';
                        const isPinned = pinnedTaskIds.includes(String(s.id));
                        const qty = (s.record as any)?.custom_fields?.quantity 
                          ?? s.record?.quantity 
                          ?? (s.record as any)?.custom_fields?.base_quantity 
                          ?? s.record?.base_quantity 
                          ?? s.record?.deliverable_quantity;
                        const hasQty = Boolean(qty) && Number(qty) > 0;
                        const commentCount = commentTracking.counts[s.id]?.count ?? 0;

                        const rawAssigneeIds: (string|number)[] = [
                          ...(s.record?.assignee_id ? [s.record.assignee_id] : []),
                          ...(((s.record as any)?.custom_fields?.assignee_ids as (string|number)[]) || [])
                        ];
                        const uniqueAssigneeIds = Array.from(new Set(rawAssigneeIds.map(String)));
                        const assignees = uniqueAssigneeIds.map(id => {
                          const found = (hub.people || []).find((p: any) => String(p.id) === id);
                          if (found) return found;
                          if (String(s.record?.assignee_id) === id && s.record?.assignee) return s.record.assignee;
                          return { id, name: `User #${id}` };
                        });
                        return (
                          <div
                            key={s.id}
                            className={`p-2.5 rounded-[8px] border transition-all grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center justify-between gap-2 group group/task relative ${
                              'z-10'
                            } ${
                              done
                                ? 'border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20'
                                : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400/60 dark:hover:border-blue-500/60'
                            }`}
                          >
                            {/* Left: Checkbox + Status Hexagon + Quantity badge + Title + Comment Preview */}
                            <div className="grid grid-flow-col auto-cols-max items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                disabled={(done ? !s.canEdit : !s.canComplete) || hub.busy}
                                checked={done}
                                onChange={() => toggleSubtask(s.id)}
                                className="rounded text-blue-600 focus:ring-0 cursor-pointer shrink-0"
                                title={isEn ? 'Mark completed' : 'Đánh dấu hoàn thành'}
                              />

                              <WorkflowStatusPicker iconOnly status={s.record.status} stage={s.status} disabled={!s.canEdit || hub.busy} onChange={async stage=>{await handleQuickChangeStatus(s.id,stage);}} />

                              {/* Quantity Badge */}
                              {hasQty && (
                                <span className="px-1.5 py-0.5 rounded-[6px] text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0 shadow-2xs">
                                  SL: {qty}
                                </span>
                              )}

                              {/* Task Title */}
                              <button type="button" onClick={()=>openTaskDetails(s.record)}
                                className={`text-left text-xs truncate max-w-[180px] sm:max-w-[240px] md:max-w-[320px] lg:max-w-[400px] hover:text-primary transition-colors cursor-pointer min-w-0 ${
                                  done ? 'line-through text-gray-400 dark:text-gray-500' : 'font-medium text-gray-900 dark:text-white'
                                }`}
                                title={s.title}
                              >
                                {s.title}
                              </button>

                              {/* Comment preview popover - only render if comments exist */}
                              {commentCount > 0 && (
                                <CommentPreviewPopover
                                  entityType={isCampaign ? 'campaign_subtask' : 'project_subtask'}
                                  entityId={s.record?.id || s.id}
                                  entityTitle={s.title}
                                  count={commentCount}
                                  onOpenFull={() => openTaskComments(s.record)}
                                />
                              )}
                            </div>

                            {/* Right: Assignees (Avatar Stack only), Due date & Actions */}
                            <div className="grid grid-flow-col auto-cols-max items-center shrink-0 self-end sm:self-auto ml-6 sm:ml-0 gap-1.5">
                              {/* Basic Info: PIC Avatar Stack & Due date */}
                              <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                                {/* PIC Avatar Stack (Avatar only, no text label to prevent overflow) */}
                                {assignees.length > 0 ? (
                                  <div
                                    className="inline-grid grid-flow-col auto-cols-max -space-x-1.5 items-center p-0.5 rounded-full bg-gray-100/70 dark:bg-slate-700/60 border border-gray-200/60 dark:border-slate-600/60 shadow-2xs"
                                    title={`${isEn ? 'Assignees' : 'Người thực hiện'}: ${assignees.map(a => a.name).join(', ')}`}
                                  >
                                    {assignees.map((a, aIdx) => (
                                      <Avatar
                                        key={a.id || aIdx}
                                        name={a.name}
                                        src={a.avatar_url || undefined}
                                        className="w-5 h-5 text-[8px] rounded-full shrink-0 border-2 border-white dark:border-slate-800 shadow-2xs hover:scale-110 hover:z-10 transition-transform cursor-pointer"
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <span
                                    className="w-5 h-5 rounded-full grid place-items-center bg-gray-100 dark:bg-slate-700 text-gray-400 border border-dashed border-gray-300 dark:border-slate-600 shadow-2xs"
                                    title={isEn ? 'Unassigned' : 'Chưa giao PIC'}
                                  >
                                    <User size={10} />
                                  </span>
                                )}

                                {s.due_date && (
                                  <span className="hidden sm:grid grid-flow-col auto-cols-max items-center gap-0.5 text-[9px] text-gray-400">
                                    <Calendar size={10} />
                                    <span>{displayDate(s.due_date)}</span>
                                  </span>
                                )}
                              </div>

                              {/* Actions (Pin, Edit, Delete): collapses to 0 width when idle (sitting flush right), expands on hover pushing info left */}
                              <div
                                className={`grid grid-flow-col auto-cols-max items-center overflow-hidden transition-all duration-300 ease-in-out shrink-0 ${
                                  isPinned
                                    ? 'max-w-[32px] opacity-100 pl-1.5 group-hover:max-w-[120px] group-hover/task:max-w-[120px] focus-within:max-w-[120px]'
                                    : 'max-w-0 opacity-0 pl-0 group-hover:max-w-[120px] group-hover:opacity-100 group-hover:pl-1.5 group-hover/task:max-w-[120px] group-hover/task:opacity-100 group-hover/task:pl-1.5 focus-within:max-w-[120px] focus-within:opacity-100 focus-within:pl-1.5'
                                }`}
                              >
                                <div className="grid grid-flow-col auto-cols-max items-center gap-0.5 shrink-0">
                                  <TaskPinButton taskId={s.id} size={12} className="!p-1" />
                                  {/* Edit Action */}
                                  <button
                                    type="button"
                                    disabled={!s.canEdit || hub.busy}
                                    onClick={(e) => { e.stopPropagation(); openTaskDetails(s.record); }}
                                    className="p-1 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer disabled:hidden shrink-0"
                                    title={isEn ? 'Edit task' : 'Chỉnh sửa đầu việc'}
                                  >
                                    <Edit3 size={12} />
                                  </button>

                                  {/* Delete Action */}
                                  <button
                                    type="button"
                                    disabled={!s.canEdit || hub.busy}
                                    onClick={(e) => handleDeleteTask(s.id, e)}
                                    className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer disabled:hidden shrink-0"
                                    title={isEn ? 'Delete task' : 'Xóa đầu việc'}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Footer summary */}
                <div className="p-2.5 rounded-[8px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-[11px] text-gray-500 flex items-center justify-between">
                  <span>{isEn ? 'Phase completion:' : 'Tiến độ hoàn thành chặng:'}</span>
                  <b className="text-primary font-bold">{doneSubtasksCount}/{totalSubtasksCount} {isEn ? 'tasks completed' : 'công việc xong'}</b>
                </div>
              </div>
            </div>

            </div>
          </div>
        )}
  </>);
}
