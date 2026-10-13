import type {WorkflowModel} from '../../../hooks/useWorkflowManagement';
import {Plus, X, Trash2, AlertTriangle} from 'lucide-react';
import {MultiSelect} from '../../common/MultiSelect';
import {WorkflowDateField} from '../../features/projects/WorkflowDateField';

export function WorkflowModals({model}: {model: WorkflowModel}) {
  const {hub, isEn, isCampaign, allTasks, parentCalendar, showAddPhaseModal, setShowAddPhaseModal, editingPhaseId, insertPhaseIndex, newPhaseName, setNewPhaseName, newPhaseDesc, setNewPhaseDesc, phasePicIds, setPhasePicIds, phaseSubIds, setPhaseSubIds, phaseStart, setPhaseStart, phaseDue, setPhaseDue, phaseStatus, setPhaseStatus, phaseOpportunity, setPhaseOpportunity, phaseReason, setPhaseReason, personOptions, handleCreatePhase, phaseToDelete, setPhaseToDelete, confirmDeletePhase, field} = model;
  return (<>
{showAddPhaseModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowAddPhaseModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[calc(100dvh-2rem)] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  isCampaign ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                }`}>
                  <Plus size={16} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    {editingPhaseId ? (isEn ? 'Edit phase' : 'Chỉnh sửa phase') : (isEn ? 'Add new phase' : 'Thêm giai đoạn mới')}
                  </h3>
                  <span className="text-[10px] text-gray-400">
                    {editingPhaseId ? (isEn ? 'PIC and sub-PIC only have permissions on assigned phases' : 'PIC và sub-PIC chỉ có quyền trên phase được giao') : (isEn ? `Insert into phase #${insertPhaseIndex + 1}` : `Chèn vào vị trí chặng số ${insertPhaseIndex + 1}`)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPhaseModal(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePhase} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {isEn ? 'Phase name' : 'Tên giai đoạn'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPhaseName}
                  onChange={e => setNewPhaseName(e.target.value)}
                  placeholder={isEn ? 'Enter phase name...' : 'Nhập tên giai đoạn...'}
                  autoFocus
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {isEn ? 'Phase objective description' : 'Mô tả mục tiêu giai đoạn'}
                </label>
                <textarea
                  rows={2}
                  value={newPhaseDesc}
                  onChange={e => setNewPhaseDesc(e.target.value)}
                  placeholder={isEn ? 'Objective and expected deliverables...' : 'Mục tiêu và kết quả cần bàn giao...'}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold">{isEn ? 'Start date' : 'Ngày bắt đầu'}<WorkflowDateField id="workflow-phase-start" value={phaseStart} onChange={setPhaseStart} minDate={parentCalendar.start} maxDate={phaseDue || parentCalendar.due}/></label><label className="text-xs font-semibold">{isEn ? 'Due date' : 'Ngày kết thúc'}<WorkflowDateField id="workflow-phase-due" value={phaseDue} onChange={setPhaseDue} minDate={phaseStart || parentCalendar.start} maxDate={parentCalendar.due}/></label></div>
              <label className="block text-xs font-semibold">{isEn ? 'Phase PIC *' : 'PIC phase *'}<MultiSelect options={personOptions} value={phasePicIds} onChange={setPhasePicIds} placeholder={isEn ? 'Select phase PIC...' : 'Chọn PIC phase...'}/></label>
              <label className="block text-xs font-semibold">{isEn ? 'Phase Sub-PIC' : 'Sub-PIC phase'}<MultiSelect options={personOptions.filter(p=>!phasePicIds.includes(p.value))} value={phaseSubIds} onChange={setPhaseSubIds} placeholder={isEn ? 'Select phase Sub-PIC...' : 'Chọn sub-PIC phase...'}/></label>
              <label className="block text-xs font-semibold">{isEn ? 'Status' : 'Trạng thái'}<select className={field} value={phaseStatus} onChange={e=>setPhaseStatus(e.target.value)}>{[['todo', isEn ? 'Todo' : 'Chưa bắt đầu'],['in_progress', isEn ? 'In progress' : 'Đang triển khai'],['in_review', isEn ? 'In review' : 'Đang nghiệm thu'],['on_hold', isEn ? 'On hold' : 'Tạm dừng'],['completed', isEn ? 'Completed' : 'Hoàn thành'],['cancelled', isEn ? 'Canceled' : 'Đã hủy']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
              <div className="space-y-2"><label className="block text-xs font-semibold">{isEn ? 'Gate opportunity · PIC evaluation (optional)' : 'Cơ hội qua phase · PIC đánh giá (tùy chọn)'}<input type="number" min="0" max="100" className={field} value={phaseOpportunity} onChange={e=>setPhaseOpportunity(e.target.value)} placeholder={isEn ? 'Not evaluated' : 'Chưa đánh giá'}/></label><textarea className={field} value={phaseReason} onChange={e=>setPhaseReason(e.target.value)} placeholder={isEn ? 'Evaluation basis · required when entering %' : 'Cơ sở đánh giá · bắt buộc khi nhập %'}/></div>
              <div className="sticky bottom-0 bg-white dark:bg-slate-900 flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPhaseModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Hủy bỏ'}
                </button>
                <button
                  type="submit" disabled={hub.busy}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                    isCampaign
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>{hub.busy ? (isEn ? 'Saving...' : 'Đang lưu...') : editingPhaseId ? (isEn ? 'Save phase' : 'Lưu phase') : (isEn ? 'Create phase' : 'Tạo giai đoạn')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
{phaseToDelete && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => !hub.busy && setPhaseToDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-phase-modal-title"
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Icon + Title */}
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 shadow-xs">
                <Trash2 size={20} strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 id="delete-phase-modal-title" className="text-base font-bold text-gray-900 dark:text-white">
                  {isEn ? 'Delete Phase Confirmation' : 'Xác nhận xóa giai đoạn'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {isEn ? 'Review the phase details before removing from roadmap.' : 'Kiểm tra kỹ thông tin giai đoạn trước khi gỡ khỏi lộ trình.'}
                </p>
              </div>
              <button
                type="button"
                disabled={hub.busy}
                onClick={() => setPhaseToDelete(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Phase Target Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {isEn ? `Phase ${phaseToDelete.phase.position}` : `Chặng ${phaseToDelete.phase.position}`}
                </span>
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                  {allTasks.filter(t => t.workflow_phase_id === phaseToDelete.phase.id).length} {isEn ? 'linked tasks' : 'task trong phase'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                {phaseToDelete.phase.title}
              </h4>
              {phaseToDelete.phase.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {phaseToDelete.phase.description}
                </p>
              )}
            </div>

            {/* Warning Message based on linked tasks */}
            {(() => {
              const linkedCount = allTasks.filter(t => t.workflow_phase_id === phaseToDelete.phase.id).length;
              if (linkedCount > 0) {
                return (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs leading-relaxed">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
                    <div>
                      <span className="font-bold">{isEn ? 'Preservation Notice: ' : 'Lưu ý bảo toàn dữ liệu: '}</span>
                      {isEn
                        ? `This phase currently has ${linkedCount} tasks. These tasks will NOT be deleted; they will be safely kept and moved to "Unplanned tasks".`
                        : `Phase này đang có ${linkedCount} task. Các task sẽ KHÔNG bị mất đi mà được giữ nguyên an toàn và chuyển về mục "Task chưa gắn phase".`}
                    </div>
                  </div>
                );
              }
              return (
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {isEn
                    ? 'This phase is empty and will be completely removed from the project roadmap.'
                    : 'Giai đoạn này đang trống và sẽ được gỡ bỏ hoàn toàn khỏi lộ trình dự án.'}
                </p>
              );
            })()}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                disabled={hub.busy}
                onClick={() => setPhaseToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {isEn ? 'Cancel' : 'Hủy bỏ'}
              </button>
              <button
                type="button"
                disabled={hub.busy}
                onClick={confirmDeletePhase}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-all flex items-center gap-1.5 shadow-sm hover:shadow-red-500/20 cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={13} />
                <span>{hub.busy ? (isEn ? 'Deleting...' : 'Đang xóa...') : (isEn ? 'Confirm Delete' : 'Xác nhận xóa')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
  </>);
}
