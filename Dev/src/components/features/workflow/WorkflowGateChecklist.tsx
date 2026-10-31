import type {WorkflowModel} from '../../../hooks/useWorkflowManagement';
import {ArrowRight, ShieldCheck, Plus, Star, X} from 'lucide-react';
import {useAuthStore} from '../../../store/authStore';
import {isAdmin, isGlobalManager} from '../../../lib/roleScope';

export function WorkflowGateChecklist({model}: {model: WorkflowModel}) {
  const {hub, isEn, currentEntity, activePhase, phases, activePhaseIndex, criteria, doneSubtasksCount, totalSubtasksCount, phaseProgressPct, gatePassChancePct, readyToApprove, readinessLabel, showAddCriteria, setShowAddCriteria, newCriteriaLabel, setNewCriteriaLabel, newCriteriaWeight, setNewCriteriaWeight, toggleCriterion, handleAddCriteria, handleAdvancePhase, pct} = model;
  const profile = useAuthStore(state => state.profile);
  if (!currentEntity || !activePhase) return null;

  const actorId = profile?.id != null ? String(profile.id) : null;
  const isPhasePic = Boolean(activePhase.members?.some(m => String(m.id) === actorId && m.role === 'pic'));
  const isParentCreator = Boolean(currentEntity.creator && String(currentEntity.creator.id) === actorId);
  const isParentPic = Boolean(currentEntity.pics?.some(p => String(p.id) === actorId));
  const canApprove = Boolean(
    isAdmin(profile) ||
    isGlobalManager(profile) ||
    currentEntity.root ||
    isPhasePic ||
    isParentCreator ||
    isParentPic
  );
  return (<>
              {/* Left Column: Tiêu chí Gatekeeper & Duyệt Chuyển Phase */}
              <div className="w-full h-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 space-y-4 flex flex-col justify-between">

                {/* 2 Big Gauge Boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xs">
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>{isEn ? 'Task progress' : 'Tiến độ công việc'}</span>
                      <span className="font-bold text-primary">{pct(phaseProgressPct)}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden relative">
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
                  {/* REQ-TOT-03 / Slide 2: Animation inline search-style input cho Thêm tiêu chí Gate */}
                  <div className="grid grid-cols-[1fr_auto] items-center gap-2 mb-2 min-h-[32px]">
                    {!showAddCriteria ? (
                      <div className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5 min-w-0">
                        <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200 truncate">
                          {isEn ? 'Gate Checklist' : 'Tiêu chí thẩm định Gate'}
                        </span>
                        <span className="text-[10px] text-gray-400 hidden sm:inline truncate">{isEn ? '(Score ≥ 80% to unlock next phase)' : '(Đạt ≥ 80% để mở khóa chặng sau)'}</span>
                      </div>
                    ) : (
                      <form onSubmit={handleAddCriteria} className="inline-grid grid-cols-[1fr_64px_auto_auto] items-center gap-1.5 w-full animate-in fade-in duration-200">
                        <div className="inline-grid grid-flow-col auto-cols-max items-center gap-1 min-w-0">
                          <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                          <input
                            type="text"
                            autoFocus
                            aria-label={isEn ? 'Criterion name' : 'Tên tiêu chí'}
                            value={newCriteriaLabel}
                            onChange={e => setNewCriteriaLabel(e.target.value)}
                            placeholder={isEn ? "Criterion name..." : "Tên tiêu chí Gate..."}
                            className="w-full text-xs px-2.5 py-1 rounded-[8px] border border-primary/40 dark:border-primary/50 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                          />
                        </div>
                        <input
                          type="number"
                          min="0.1"
                          max="100"
                          step="0.1"
                          required
                          aria-label={isEn ? 'Weight (%)' : 'Trọng số (%)'}
                          placeholder="%"
                          title={isEn ? 'Weight (%)' : 'Trọng số (%)'}
                          value={newCriteriaWeight}
                          onChange={event => setNewCriteriaWeight(event.target.value)}
                          className="w-full text-xs px-2 py-1 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none text-center"
                        />
                        <button type="submit" className="px-2.5 py-1 rounded-[8px] bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors shadow-2xs">
                          {isEn ? 'Save' : 'Lưu'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowAddCriteria(false); setNewCriteriaLabel(''); }}
                          className="p-1 rounded-[8px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          title={isEn ? 'Cancel' : 'Hủy'}
                        >
                          <X size={14} />
                        </button>
                      </form>
                    )}

                    {!showAddCriteria && (
                      <button
                        type="button"
                        disabled={!activePhase.can_edit_tasks || hub.busy || ['completed','cancelled'].includes(activePhase.status)}
                        onClick={() => setShowAddCriteria(true)}
                        className="text-[11px] text-primary hover:underline inline-grid grid-flow-col auto-cols-max items-center gap-1 font-semibold justify-self-end disabled:opacity-50"
                      >
                        <Plus size={13} /> {isEn ? 'Add criterion' : 'Thêm tiêu chí'}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {criteria.map(c => (
                      <label
                        key={c.id}
                        className={`grid grid-cols-[auto_1fr] items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer group/gate-item ${
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
                        <div className="min-w-0 text-xs">
                          <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                            <span className={c.checked ? 'font-semibold' : ''}>{c.label}</span>
                            <button
                              type="button"
                              disabled={!activePhase.can_edit_tasks || hub.busy}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                model.toggleStarCriterion(c.id);
                              }}
                              aria-label={c.starred ? (isEn ? 'Unmark key criterion' : 'Bỏ đánh dấu tiêu chí chính') : (isEn ? 'Mark as key criterion' : 'Đánh dấu tiêu chí chính')}
                              title={c.starred ? (isEn ? 'Key criterion (starred)' : 'Tiêu chí chính (đã gắn sao)') : (isEn ? 'Mark as key criterion' : 'Đánh dấu tiêu chí chính')}
                              className={`p-0.5 rounded transition-all cursor-pointer ${
                                c.starred
                                  ? 'fill-amber-400 text-amber-400 opacity-100'
                                  : 'opacity-60 sm:opacity-0 sm:group-hover/gate-item:opacity-100 focus-visible:opacity-100 text-gray-400 hover:text-amber-400'
                              }`}
                            >
                              <Star size={13} className={c.starred ? 'fill-amber-400 text-amber-400' : ''} />
                            </button>
                          </div>
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

                  {canApprove && !['completed','cancelled'].includes(activePhase.status) && (
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
