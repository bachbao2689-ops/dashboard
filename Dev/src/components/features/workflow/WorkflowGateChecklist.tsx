import type {WorkflowModel} from '../../../hooks/useWorkflowManagement';
import {ArrowRight, ShieldCheck, Plus} from 'lucide-react';

export function WorkflowGateChecklist({model}: {model: WorkflowModel}) {
  const {hub, isEn, currentEntity, activePhase, phases, activePhaseIndex, criteria, doneSubtasksCount, totalSubtasksCount, phaseProgressPct, gatePassChancePct, readyToApprove, readinessLabel, showAddCriteria, setShowAddCriteria, newCriteriaLabel, setNewCriteriaLabel, newCriteriaWeight, setNewCriteriaWeight, toggleCriterion, handleAddCriteria, handleAdvancePhase, pct} = model;
  if (!currentEntity || !activePhase) return null;
  return (<>
              {/* Left Column: Tiêu chí Gatekeeper & Duyệt Chuyển Phase (7 Cols) */}
              <div className="lg:col-span-7 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 space-y-4">

                {/* 2 Big Gauge Boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xs">
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>{isEn ? 'Task progress' : 'Tiến độ công việc'}</span>
                      <span className="font-bold text-primary">{pct(phaseProgressPct)}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${phaseProgressPct ?? 0}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {doneSubtasksCount}/{totalSubtasksCount} {isEn ? 'tasks completed' : 'task hoàn thành'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xs">
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{isEn ? 'Gate Opportunity' : 'Cơ hội qua Phase'}</span>
                      <span className={`font-bold ${(gatePassChancePct ?? -1) >= 80 ? 'text-emerald-500' : (gatePassChancePct ?? -1) >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                        {pct(gatePassChancePct)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          (gatePassChancePct ?? -1) >= 80 ? 'bg-emerald-500' : (gatePassChancePct ?? -1) >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${gatePassChancePct ?? 0}%` }}
                      />
                    </div>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border mt-1 inline-block ${
                      readyToApprove ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                    }`}>
                      {readinessLabel}
                    </span>
                  </div>
                </div>

                {/* Gate Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck size={16} className="text-emerald-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                        {isEn ? 'Gate Checklist' : 'Tiêu chí thẩm định Gate'}
                      </span>
                      <span className="text-[10px] text-gray-400 hidden sm:inline">{isEn ? '(Score ≥ 80% to unlock next phase)' : '(Đạt ≥ 80% để mở khóa chặng sau)'}</span>
                    </div>

                    <button
                      type="button"
                      disabled={!activePhase.can_edit_tasks || hub.busy || ['completed','cancelled'].includes(activePhase.status)}
                      onClick={() => setShowAddCriteria(!showAddCriteria)}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Plus size={13} /> {isEn ? 'Add criterion' : 'Thêm tiêu chí'}
                    </button>
                  </div>

                  {showAddCriteria && (
                    <>
                    <form onSubmit={handleAddCriteria} className="workflow-criterion-form">
                      <input
                        type="text"
                        aria-label={isEn ? 'Criterion name' : 'Tên tiêu chí'}
                        value={newCriteriaLabel}
                        onChange={e => setNewCriteriaLabel(e.target.value)}
                        placeholder={isEn ? "Enter gate criterion..." : "Nhập tiêu chí điều kiện Gate..."}
                        className="flex-1 text-xs p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-primary"
                      />
                      <label className="workflow-weight-label">{isEn ? 'Weight (%)' : 'Trọng số (%)'}<input type="number" min="0.1" max="100" step="0.1" required value={newCriteriaWeight} onChange={event => setNewCriteriaWeight(event.target.value)} className="workflow-calendar-input" /></label>
                      <button type="submit" className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold">
                        {isEn ? 'Save' : 'Lưu'}
                      </button>
                    </form>
                    <p className="mb-3 text-[10px] text-gray-500 dark:text-slate-400">{isEn ? 'Gate score = completed weight ÷ total criterion weight.' : 'Điểm Gate = trọng số đã đạt ÷ tổng trọng số các tiêu chí.'}</p>
                    </>
                  )}

                  <div className="space-y-2">
                    {criteria.map(c => (
                      <label
                        key={c.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          c.checked
                            ? 'border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 text-gray-900 dark:text-white'
                            : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={!activePhase.can_edit_tasks || hub.busy || ['completed','cancelled'].includes(activePhase.status)}
                          checked={c.checked}
                          onChange={() => toggleCriterion(c.id)}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-0 cursor-pointer"
                        />
                        <div className="flex-1 text-xs">
                          <span className={c.checked ? 'font-semibold' : ''}>{c.label}</span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">{isEn ? `Weight: ${c.weight}%` : `Trọng số: ${c.weight}%`}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Gate Pass Approval Button */}
                <div className="pt-2 border-t border-gray-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {readyToApprove ? (isEn ? '✓ Tasks completed and checklist ≥80%. Ready to approve Gate.' : '✓ Task đã xong và checklist đạt ≥80%. PIC có thể duyệt Gate.') : (isEn ? 'Complete tasks and achieve checklist ≥80% before Gate approval.' : 'Hoàn thành task và checklist ≥80% trước khi PIC duyệt Gate.')}
                  </p>

                  {currentEntity.root && !['completed','cancelled'].includes(activePhase.status) && (
                    <button
                      type="button"
                      disabled={hub.busy || !readyToApprove}
                      onClick={handleAdvancePhase}
                      className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                        (gatePassChancePct ?? -1) >= 80
                          ? 'bg-[#002e6d] hover:bg-[#001f4d] text-white cursor-pointer hover:shadow-md'
                          : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70'
                      }`}
                    >
                      <span>{phases[activePhaseIndex + 1] ? (isEn ? `Approve to ${phases[activePhaseIndex + 1].name}` : 'Phê duyệt qua ' + phases[activePhaseIndex + 1].name) : (isEn ? 'Complete phase' : 'Hoàn thành phase')}</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>

  </>);
}
