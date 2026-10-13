import type {WorkflowModel} from '../../../hooks/useWorkflowManagement';
import {Plus, X, Code2, Calendar, User, Edit3, Trash2, Check} from 'lucide-react';
import {displayDate} from '../../../lib/workflowHub';
import {WorkflowStatusPicker, WORKFLOW_STATUS_CONFIG, WORKFLOW_STATUS_LABELS_VI, WORKFLOW_STATUS_LABELS_EN, type WorkflowTaskStatus} from '../../features/tasks/WorkflowStatusPicker';
import {WorkflowGateChecklist} from './WorkflowGateChecklist';
import {MultiSelect} from '../../common/MultiSelect';
import {WorkflowDateField} from '../../features/projects/WorkflowDateField';

export function WorkflowPhaseDetails({model}: {model: WorkflowModel}) {
  const {hub, isEn, currentEntity, isCampaign, isDetailOpen, setIsDetailOpen, setSelectedTask, activePhase, currentPhaseSubtasks, doneSubtasksCount, totalSubtasksCount, phaseProgressPct, taskCalendar, showAddTask, setShowAddTask, newTaskTitle, setNewTaskTitle, newTaskAssignee, setNewTaskAssignee, newTaskStatus, setNewTaskStatus, newTaskDue, setNewTaskDue, newTaskStart, setNewTaskStart, editingTaskId, setEditingTaskId, editTaskTitle, setEditTaskTitle, editTaskAssignee, setEditTaskAssignee, editTaskStatus, setEditTaskStatus, editTaskDue, setEditTaskDue, taskOptions, toggleSubtask, handleAddTask, handleDeleteTask, handleStartEditTask, handleSaveEditTask, handleQuickChangeStatus, pct} = model;
  if (!currentEntity) return null;
  if (!activePhase) return null;
  return (<>
{isDetailOpen && activePhase && (
          <div className="pt-4 border-t border-gray-100 dark:border-slate-700/80 space-y-4 animate-in fade-in duration-300">

            {/* Top Detail Bar with Close action */}
            <div className="flex items-center justify-between bg-primary/5 dark:bg-primary/10 p-3 rounded-xl border border-primary/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold text-primary uppercase tracking-wide">
                  {isEn ? 'Selected Phase Details:' : 'Chi tiết chặng đang chọn:'}
                </span>
                <b className="text-xs text-gray-900 dark:text-white">
                  {activePhase.name} — {activePhase.desc}
                </b>
              </div>

              <button
                onClick={() => setIsDetailOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 font-semibold transition-colors"
              >
                <X size={14} /> {isEn ? 'Collapse details' : 'Thu gọn chi tiết'}
              </button>
            </div>

            {/* Split Columns: Cột Trái (Gate Checklist) & Cột Phải (Subtasks Website) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              <WorkflowGateChecklist model={model}/>

              {/* Right Column: Quản Lý Đầu Việc Kỹ Thuật (Subtasks) của chặng (5 Cols) */}
              <div className="lg:col-span-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                <div>
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700/80 pb-2.5 mb-2.5">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Code2 size={15} className={isCampaign ? 'text-amber-500' : 'text-blue-600'} />
                        {isEn ? 'Tasks' : 'Đầu việc'} ({doneSubtasksCount}/{totalSubtasksCount})
                      </h4>
                      <span className="text-[10px] text-gray-400">{isEn ? 'Add, edit, delete, and switch task status' : 'Thêm, sửa, xóa và chuyển đổi trạng thái task'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary">{pct(phaseProgressPct)}</span>
                      <button
                        type="button"
                        disabled={!activePhase.can_edit_tasks || hub.busy || ['completed','cancelled'].includes(activePhase.status)}
                        onClick={() => { if (!showAddTask) { setNewTaskStart(taskCalendar.start); setNewTaskDue(taskCalendar.due); } setShowAddTask(!showAddTask); }}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer ${
                          isCampaign
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                        title={isEn ? 'Add new task to this phase' : 'Thêm đầu việc mới vào chặng này'}
                      >
                        <Plus size={12} strokeWidth={2.5} />
                        <span>{isEn ? 'Add task' : 'Thêm task'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline Add Task Form */}
                  {showAddTask && (
                    <form onSubmit={handleAddTask} className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-slate-800/90 mb-3 space-y-2.5 animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                          <Plus size={12} strokeWidth={2.5} /> {isEn ? 'Add new task' : 'Thêm đầu việc mới'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddTask(false)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                        >
                          <X size={13} />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        placeholder={isEn ? 'Enter task title...' : 'Nhập tên đầu việc...'}
                        autoFocus
                        className="w-full text-xs p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <MultiSelect options={taskOptions} value={newTaskAssignee ? [newTaskAssignee] : []} maxSelected={1} onChange={(ids:string[])=>setNewTaskAssignee(ids[0] || '')} placeholder={isEn ? 'Select task PIC...' : 'Chọn PIC task...'} />
                        <label className="workflow-field-label">{isEn ? "Start date" : "Ngày bắt đầu"}<WorkflowDateField id="workflow-task-start" value={newTaskStart} onChange={setNewTaskStart} minDate={taskCalendar.start} maxDate={newTaskDue || taskCalendar.due}/></label><label className="workflow-field-label">{isEn ? "Due date" : "Hạn chót"}<WorkflowDateField id="workflow-task-due" value={newTaskDue} onChange={setNewTaskDue} minDate={newTaskStart || taskCalendar.start} maxDate={taskCalendar.due}/></label>

                        <select
                          value={newTaskStatus}
                          onChange={e => setNewTaskStatus(e.target.value as WorkflowTaskStatus)}
                          className="text-xs p-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none"
                        >
                          {(Object.keys(WORKFLOW_STATUS_CONFIG) as WorkflowTaskStatus[]).map(st => (
                            <option key={st} value={st}>
                              {isEn ? WORKFLOW_STATUS_LABELS_EN[st] : (WORKFLOW_STATUS_LABELS_VI[st] || WORKFLOW_STATUS_CONFIG[st].label)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400">{isEn ? 'Dates inherit the phase calendar within the Project/Campaign range.' : 'Lịch tự lấy từ chặng, nằm trong khoảng ngày của Project/Campaign.'}</p>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddTask(false)}
                          className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          {isEn ? 'Cancel' : 'Hủy'}
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
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
                        const isEditing = editingTaskId === s.id;

                        if (isEditing) {
                          return (
                            <div
                              key={s.id}
                              className="p-3 rounded-xl border border-blue-400 bg-white dark:bg-slate-900 shadow-sm space-y-2"
                              onClick={e => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-blue-600 uppercase">{isEn ? 'Editing task' : 'Đang chỉnh sửa đầu việc'}</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingTaskId(null)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <X size={12} />
                                </button>
                              </div>

                              <input
                                type="text"
                                value={editTaskTitle}
                                onChange={e => setEditTaskTitle(e.target.value)}
                                className="w-full text-xs p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                              />

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                                {currentEntity.root ? <MultiSelect options={taskOptions} value={editTaskAssignee ? [editTaskAssignee] : []} maxSelected={1} onChange={(ids:string[])=>setEditTaskAssignee(ids[0] || '')} placeholder={isEn ? 'Select task PIC...' : 'Chọn PIC task...'} /> : <span className="text-xs">{s.assignee}</span>}
                                <WorkflowDateField id="workflow-edit-task-due" value={editTaskDue} onChange={setEditTaskDue} minDate={s.record.start_date || taskCalendar.start} maxDate={taskCalendar.due}/>
                                <select
                                  value={editTaskStatus}
                                  onChange={e => setEditTaskStatus(e.target.value as WorkflowTaskStatus)}
                                  className="text-[11px] p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                >
                                  {(Object.keys(WORKFLOW_STATUS_CONFIG) as WorkflowTaskStatus[]).map(st => (
                                    <option key={st} value={st}>
                                      {isEn ? WORKFLOW_STATUS_LABELS_EN[st] : (WORKFLOW_STATUS_LABELS_VI[st] || WORKFLOW_STATUS_CONFIG[st].label)}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex justify-end gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingTaskId(null)}
                                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                                >
                                  {isEn ? 'Cancel' : 'Hủy'}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleSaveEditTask(s.id, e)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1"
                                >
                                  <Check size={12} strokeWidth={2.5} /> {isEn ? 'Save changes' : 'Lưu thay đổi'}
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={s.id}
                            className={`p-2.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 group/task relative ${
                              'z-10'
                            } ${
                              done
                                ? 'border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20'
                                : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400/60 dark:hover:border-blue-500/60'
                            }`}
                          >
                            {/* Left: Checkbox + Status Hexagon + Title */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                disabled={!s.canEdit || hub.busy}
                                checked={done}
                                onChange={() => toggleSubtask(s.id)}
                                className="rounded text-blue-600 focus:ring-0 cursor-pointer shrink-0"
                                title={isEn ? 'Mark completed' : 'Đánh dấu hoàn thành'}
                              />

                              <WorkflowStatusPicker status={s.record.status} stage={s.status} disabled={!s.canEdit || hub.busy} onChange={async stage=>{await handleQuickChangeStatus(s.id,stage);}} />

                              {/* Task Title */}
                              <button type="button" onClick={()=>setSelectedTask(s.record)}
                                className={`text-left text-xs truncate flex-1 min-w-0 ${
                                  done ? 'line-through text-gray-400 dark:text-gray-500' : 'font-medium text-gray-900 dark:text-white'
                                }`}
                                title={s.title}
                              >
                                {s.title}
                              </button>
                            </div>

                            {/* Right: Assignee, Due date & Actions */}
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto ml-6 sm:ml-0">
                              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                                <User size={10} className="text-gray-400" />
                                <span className="truncate max-w-[80px]">{s.assignee}</span>
                              </span>

                              {s.due_date && (
                                <span className="hidden sm:flex items-center gap-0.5 text-[9px] text-gray-400">
                                  <Calendar size={10} />
                                  <span>{displayDate(s.due_date)}</span>
                                </span>
                              )}

                              {/* Edit Action */}
                              <button
                                type="button"
                                disabled={!s.canEdit || hub.busy}
                                onClick={(e) => handleStartEditTask(s, e)}
                                className="p-1 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer disabled:hidden"
                                title={isEn ? 'Edit task' : 'Chỉnh sửa đầu việc'}
                              >
                                <Edit3 size={12} />
                              </button>

                              {/* Delete Action */}
                              <button
                                type="button"
                                disabled={!s.canEdit || hub.busy}
                                onClick={(e) => handleDeleteTask(s.id, e)}
                                className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer disabled:hidden"
                                title={isEn ? 'Delete task' : 'Xóa đầu việc'}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Footer summary */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-[11px] text-gray-500 flex items-center justify-between">
                  <span>{isEn ? 'Phase completion:' : 'Tiến độ hoàn thành chặng:'}</span>
                  <b className="text-primary font-bold">{doneSubtasksCount}/{totalSubtasksCount} {isEn ? 'tasks completed' : 'công việc xong'}</b>
                </div>
              </div>

            </div>
          </div>
        )}
  </>);
}
