import type {WorkflowModel} from '../../../hooks/useWorkflowManagement';
import {Sparkles, ChevronDown, ChevronUp, Info} from 'lucide-react';
import {WORKFLOW_STATUS_CONFIG, WORKFLOW_STATUS_LABELS_VI, WORKFLOW_STATUS_LABELS_EN, MARKETING_STATUS_GUIDES_EN, MARKETING_STATUS_GUIDES_VI, WorkflowHexagonIcon, type WorkflowTaskStatus} from '../../features/tasks/WorkflowStatusPicker';

export function WorkflowTimelineToolbar({model}: {model: WorkflowModel}) {
  const {isEn, isDetailOpen, setIsDetailOpen, activeTooltip, cancelCloseTooltip, openTooltip, scheduleCloseTooltip, togglePinTooltip, phases, activePhaseIndex, taskCountsByStatus, handlePhaseClick} = model;
  return (<>
<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-700/80 pb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              {isEn ? 'Stage-Gate Stepper Timeline' : 'Lộ trình giai đoạn'}
            </h3>

            {/* Thanh Task biểu hiện những Task trong đó (Requirement 3: move xuống bảng Lộ trình giai đoạn) */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mr-0.5">
                {isEn ? 'Tasks in scope:' : 'Task trong phạm vi:'}
              </span>

              {/* Small (i) button for Staff guidance on Task Status mechanisms (Requirement 2) */}
              <div className="relative inline-flex items-center mr-1" data-tooltip-container="true">
                <button
                  type="button"
                  data-tooltip-container="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePinTooltip('task_statuses');
                  }}
                  onMouseEnter={() => openTooltip('task_statuses')}
                  onMouseLeave={scheduleCloseTooltip}
                  className={`flex items-center justify-center w-4 h-4 rounded-full transition-colors focus:outline-none cursor-pointer shrink-0 ${
                    activeTooltip === 'task_statuses'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 ring-2 ring-blue-400/40'
                      : 'text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60'
                  }`}
                  aria-label={isEn ? "7 Task Status mechanism guide" : "Cơ chế & quy chuẩn 7 trạng thái Task"}
                  title={isEn ? "View mechanism & rules for 7 Task Statuses (Marketing)" : "Xem cơ chế & quy chuẩn 7 trạng thái Task (Marketing)"}
                >
                  <Info size={11} strokeWidth={2.4} />
                </button>

                {/* Popover explaining the 7 statuses */}
                {activeTooltip === 'task_statuses' && (
                  <div
                    role="tooltip"
                    data-tooltip-container="true"
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={cancelCloseTooltip}
                    onMouseLeave={scheduleCloseTooltip}
                    className="absolute z-40 left-0 top-[calc(100%+8px)] w-[320px] sm:w-[480px] md:w-[540px] max-w-[92vw] p-4 sm:p-5 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-gray-200/80 dark:border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] text-left pointer-events-auto before:absolute before:-top-3 before:inset-x-0 before:h-3 before:content-[''] transition-all animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-gray-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
                          <Sparkles size={14} strokeWidth={2.4} />
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                            {isEn ? 'Mechanism & Standards of 7 Task Statuses' : 'Cơ chế & Quy chuẩn 7 Trạng thái Task'}
                          </h4>
                          <span className="text-[10px] text-gray-500 dark:text-slate-400 block">
                            {isEn ? 'Standardized for Marketing & Campaign Operations' : 'Chuẩn hóa theo quy trình Marketing & Vận hành chiến dịch'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200/60 dark:border-blue-700/50">
                        Marketing Ops
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar text-[11px]">
                      {(isEn ? MARKETING_STATUS_GUIDES_EN : MARKETING_STATUS_GUIDES_VI).map((item) => {
                        const cfg = WORKFLOW_STATUS_CONFIG[item.status];
                        return (
                          <div
                            key={item.status}
                            className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700/70 hover:border-gray-200 dark:hover:border-slate-600 transition-colors"
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <WorkflowHexagonIcon status={item.status} size={14} />
                              <span className={`text-xs font-bold ${cfg.textColor}`}>
                                {item.marketingTitle}
                              </span>
                            </div>
                            <div className="text-[10.5px] text-gray-600 dark:text-slate-300 leading-relaxed mb-1">
                              <span className="font-semibold text-gray-700 dark:text-slate-200">{isEn ? 'Mechanism: ' : 'Cơ chế: '}</span>
                              {item.shortDesc}
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-slate-400 italic">
                              👉 {item.usageRule}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-gray-500 dark:text-slate-400">
                      <span>{isEn ? '💡 Convention: Submit draft deliverables to In QA for Lead review before moving to Completed.' : '💡 Quy ước: Nộp draft ấn phẩm chuyển In QA để Leader duyệt trước khi sang Completed.'}</span>
                    </div>
                  </div>
                )}
              </div>

              {(['backlog', 'planned', 'scoping', 'in_progress', 'in_qa', 'completed', 'canceled'] as WorkflowTaskStatus[]).map(st => {
                const count = taskCountsByStatus[st] || 0;
                const cfg = WORKFLOW_STATUS_CONFIG[st];
                const statusLabel = isEn ? WORKFLOW_STATUS_LABELS_EN[st] : (WORKFLOW_STATUS_LABELS_VI[st] || cfg.label);
                return (
                  <div
                    key={st}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-[10px] ${cfg.bgLight} ${cfg.bgDark} ${cfg.borderClass}`}
                    title={`${statusLabel}: ${count} tasks`}
                  >
                    <WorkflowHexagonIcon status={st} size={13} />
                    <span className={`font-bold ${cfg.textColor}`}>
                      {count}
                    </span>
                    <span className="text-[9px] text-gray-500 dark:text-gray-400">
                      {statusLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap min-w-0 items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">{isEn ? 'Selected phase:' : 'Chặng đang chọn:'}</span>
            <div className="relative">
              <select
                value={activePhaseIndex}
                onChange={e => handlePhaseClick(Number(e.target.value))}
                className="max-w-full appearance-none bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-900 dark:text-white rounded-xl pl-3 pr-8 py-1.5 outline-none cursor-pointer hover:border-primary transition-colors"
              >
                {phases.map((p, idx) => (
                  <option key={p.id} value={idx} className="dark:bg-slate-800">
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
            </div>

            {/* Toggle Expand / Collapse Button */}
            {isDetailOpen && <button
              onClick={() => setIsDetailOpen(false)}
              className="p-1.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700/60 text-gray-500 transition-colors ml-1"
              title={isDetailOpen ? (isEn ? 'Collapse details' : 'Thu gọn chi tiết') : (isEn ? 'Expand details' : 'Mở rộng chi tiết')}
            >
              <ChevronUp size={16} />
            </button>}
          </div>
        </div>
  </>);
}
