import type {WorkflowModel} from '../../../hooks/useWorkflowManagement';
import {Info} from 'lucide-react';

export function WorkflowKpis({model}: {model: WorkflowModel}) {
  const {isEn, currentEntity, activeTooltip, cancelCloseTooltip, openTooltip, scheduleCloseTooltip, togglePinTooltip, allTasks, activePhase, gatePassChancePct, criteriaScore, readyToApprove, readinessLabel, metrics, overallProjectProgressPct, pct} = model;
  if (!currentEntity) return null;
  if (!activePhase) return null;
  return (<>
<div className="xl:col-span-8 2xl:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full">
          {/* Card 1: Tiến độ tổng thể */}
          <div
            data-tooltip-container="true"
            className={`p-3 sm:p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between hover-magnetic-card magnetic-blue transition-all relative group/card min-w-0 h-full cursor-default ${
              activeTooltip === 'overall_progress'
                ? 'z-30 ring-2 ring-blue-500/40 shadow-xl bg-white dark:bg-slate-800'
                : 'z-10'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
                {currentEntity.root ? (isEn ? 'Overall Progress' : 'Tiến độ tổng thể') : (isEn ? 'Assigned Progress' : 'Tiến độ được giao')}
              </span>

              {/* Info Icon (i) */}
              <button
                type="button"
                data-tooltip-container="true"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePinTooltip('overall_progress');
                }}
                onMouseEnter={() => openTooltip('overall_progress')}
                onMouseLeave={scheduleCloseTooltip}
                className={`flex items-center justify-center w-4 h-4 rounded-full transition-colors focus:outline-none cursor-pointer shrink-0 ${
                  activeTooltip === 'overall_progress'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 ring-2 ring-blue-400/40'
                    : 'text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60'
                }`}
                aria-label={isEn ? "Overall Progress info" : "Thông tin chỉ số Tiến độ tổng thể"}
                title={isEn ? "View mechanism & formula for Overall Progress" : "Xem cơ chế & cách tính Tiến độ tổng thể"}
              >
                <Info size={11} strokeWidth={2.2} />
              </button>
            </div>

            <div className="flex items-baseline justify-between my-0.5">
              <b className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                {pct(overallProjectProgressPct)}
              </b>
              <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
                {allTasks.length} tasks
              </span>
            </div>

            <span className="text-[9px] text-gray-400 block truncate mt-0.5">
              {activePhase ? (isEn ? `Viewing: ${activePhase.name}` : `Đang xem: ${activePhase.name}`) : (isEn ? 'No phase roadmap' : 'PIC chưa tạo lộ trình')}
            </span>

            {/* Tooltip Popover positioned neatly below Card 1 */}
            {activeTooltip === 'overall_progress' && (
              <div
                role="tooltip"
                data-tooltip-container="true"
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={cancelCloseTooltip}
                onMouseLeave={scheduleCloseTooltip}
                className="absolute z-40 left-0 top-[calc(100%+8px)] w-72 sm:w-80 p-4 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-gray-200/80 dark:border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] text-left pointer-events-auto before:absolute before:-top-3 before:inset-x-0 before:h-3 before:content-[''] transition-all animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100 dark:border-slate-800">
                  <span className="p-1 rounded-md bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
                    <Info size={12} strokeWidth={2.5} />
                  </span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {isEn ? 'Overall Progress' : 'Tiến độ tổng thể'}
                  </span>
                </div>

                <div className="space-y-2 text-[11px] text-gray-600 dark:text-slate-300">
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-slate-200">{isEn ? 'Mechanism: ' : 'Cơ chế: '}</span>
                    <span>{isEn ? 'Ratio of completed tasks to active tasks for the Project/Campaign within viewable scope.' : 'Tỷ lệ task hoàn thành trên các task còn hoạt động của Project/Campaign trong phạm vi được xem.'}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-800 text-[10px] leading-relaxed">
                    <span className="font-semibold text-gray-500 dark:text-slate-400 block mb-0.5">{isEn ? 'Formula:' : 'Cách tính:'}</span>
                    <code className="text-primary dark:text-blue-400 font-mono text-[10px] break-words font-semibold">
                      {isEn ? '(Completed subtasks / Total project subtasks) × 100%' : '(Số subtasks đã xong / Tổng số subtasks toàn dự án) × 100%'}
                    </code>
                  </div>

                  <div className="text-[10px] text-gray-500 dark:text-slate-400 italic">
                    {isEn ? 'Canceled tasks are excluded from denominator. Displays — if no tasks.' : 'Task đã hủy không nằm trong mẫu số. Không có task thì hiển thị —.'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Sức khỏe & Cơ hội qua Phase (Health Card) */}
          <div
            data-tooltip-container="true"
            className={`p-3 sm:p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between hover-magnetic-card ${(gatePassChancePct ?? -1) >= 80 ? 'magnetic-emerald' : 'magnetic-amber'} transition-all relative group/card min-w-0 h-full cursor-default ${
              activeTooltip === 'phase_health_gate'
                ? 'z-30 ring-2 ring-emerald-500/40 shadow-xl bg-white dark:bg-slate-800'
                : 'z-10'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate" title={isEn ? "Stage-Gate Health" : "Sức khỏe & Cơ hội qua Phase"}>
                {isEn ? 'Stage-Gate Health' : 'Sức khỏe & Cơ hội qua Phase'}
              </span>

              {/* Info Icon (i) */}
              <button
                type="button"
                data-tooltip-container="true"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePinTooltip('phase_health_gate');
                }}
                onMouseEnter={() => openTooltip('phase_health_gate')}
                onMouseLeave={scheduleCloseTooltip}
                className={`flex items-center justify-center w-4 h-4 rounded-full transition-colors focus:outline-none cursor-pointer shrink-0 ${
                  activeTooltip === 'phase_health_gate'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 ring-2 ring-emerald-400/40'
                    : 'text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60'
                }`}
                aria-label={isEn ? "Stage-Gate Health info" : "Thông tin chỉ số Sức khỏe & Cơ hội qua Phase"}
                title={isEn ? "View mechanism & formula for Stage-Gate Health" : "Xem cơ chế & cách tính Sức khỏe & Cơ hội qua Phase"}
              >
                <Info size={11} strokeWidth={2.2} />
              </button>
            </div>

            <div className="flex items-baseline justify-between my-0.5">
              <b className={`text-xl sm:text-2xl font-extrabold ${(gatePassChancePct ?? -1) >= 80 ? 'text-emerald-500' : (gatePassChancePct ?? -1) >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {pct(gatePassChancePct)}
              </b>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                readyToApprove ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
              }`}>
                {gatePassChancePct == null
                  ? (isEn ? 'Not evaluated' : 'Chưa đánh giá')
                  : readinessLabel}
              </span>
            </div>

            <span className="text-[9px] text-gray-400 block truncate mt-0.5">
              {activePhase?.opportunity != null
                ? (isEn ? `PIC eval · ${activePhase.opportunity_note || ''}` : `PIC đánh giá · ${activePhase.opportunity_note || ''}`)
                : (isEn ? `Gate Checklist: ${criteriaScore == null ? 'No criteria' : criteriaScore + '/100'}` : `Gate Checklist: ${criteriaScore == null ? 'Chưa có tiêu chí' : criteriaScore + '/100'}`)}
            </span>

            {/* Tooltip Popover positioned neatly below Card 2 */}
            {activeTooltip === 'phase_health_gate' && (
              <div
                role="tooltip"
                data-tooltip-container="true"
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={cancelCloseTooltip}
                onMouseLeave={scheduleCloseTooltip}
                className="absolute z-40 left-0 top-[calc(100%+8px)] w-72 sm:w-80 p-4 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-gray-200/80 dark:border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] text-left pointer-events-auto before:absolute before:-top-3 before:inset-x-0 before:h-3 before:content-[''] transition-all animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100 dark:border-slate-800">
                  <span className={`p-1 rounded-md bg-gray-100 dark:bg-slate-800 ${(gatePassChancePct ?? -1) >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    <Info size={12} strokeWidth={2.5} />
                  </span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {isEn ? 'Stage-Gate Health' : 'Sức khỏe & Cơ hội qua Phase'}
                  </span>
                </div>

                <div className="space-y-2 text-[11px] text-gray-600 dark:text-slate-300">
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-slate-200">{isEn ? 'Mechanism: ' : 'Cơ chế: '}</span>
                    <span>{isEn ? 'Operational health forecast and probability of passing the gate review to unlock the next phase.' : 'Dự báo sức khỏe vận hành và xác suất vượt qua cổng nghiệm thu kỹ thuật để mở khóa sang giai đoạn kế tiếp.'}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-800 text-[10px] leading-relaxed">
                    <span className="font-semibold text-gray-500 dark:text-slate-400 block mb-0.5">{isEn ? 'Formula:' : 'Cách tính:'}</span>
                    <code className="text-primary dark:text-blue-400 font-mono text-[10px] break-words font-semibold">
                      {isEn ? '65% Gate Checklist Score + 35% Subtasks Completion Rate' : '65% Điểm Gate Checklist + 35% Tỷ lệ hoàn tất Subtasks'}
                    </code>
                  </div>

                  <div className="text-[10px] text-gray-500 dark:text-slate-400 italic">
                    {isEn ? 'Gate score is an indicator based on checklist and real progress. Passing Gate requires finished tasks and checklist ≥80%.' : 'Điểm Gate là chỉ báo theo checklist và tiến độ thật; không phải xác suất thống kê. PIC có thể ghi đánh giá riêng kèm cơ sở. Duyệt Gate cần task xong và checklist ≥80%.'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Vận tốc (Velocity) */}
          <div
            data-tooltip-container="true"
            className={`p-3 sm:p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between hover-magnetic-card magnetic-violet transition-all relative group/card min-w-0 h-full cursor-default ${
              activeTooltip === 'velocity'
                ? 'z-30 ring-2 ring-indigo-500/40 shadow-xl bg-white dark:bg-slate-800'
                : 'z-10'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
                {isEn ? 'Velocity' : 'Vận tốc'}
              </span>

              {/* Info Icon (i) */}
              <button
                type="button"
                data-tooltip-container="true"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePinTooltip('velocity');
                }}
                onMouseEnter={() => openTooltip('velocity')}
                onMouseLeave={scheduleCloseTooltip}
                className={`flex items-center justify-center w-4 h-4 rounded-full transition-colors focus:outline-none cursor-pointer shrink-0 ${
                  activeTooltip === 'velocity'
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 ring-2 ring-indigo-400/40'
                    : 'text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60'
                }`}
                aria-label={isEn ? "Velocity info" : "Thông tin chỉ số Vận tốc"}
                title={isEn ? "View mechanism & formula for Velocity" : "Xem cơ chế & cách tính Vận tốc"}
              >
                <Info size={11} strokeWidth={2.2} />
              </button>
            </div>

            <div className="flex items-baseline justify-between my-0.5">
              <b className="text-xl sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {metrics.velocity == null ? '—' : metrics.velocity} <span className="text-xs font-normal text-gray-500">{isEn ? 'days/task' : 'ngày/task'}</span>
              </b>
              <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
                {isEn ? `${allTasks.filter(t=>t.completed_at).length} dated tasks` : `${allTasks.filter(t=>t.completed_at).length} task có thời gian`}
              </span>
            </div>

            <span className="text-[9px] text-gray-400 block truncate mt-0.5">
              {isEn ? 'Average technical task completion pace' : 'Tốc độ giải quyết task kỹ thuật'}
            </span>

            {/* Tooltip Popover positioned neatly below Card 3 */}
            {activeTooltip === 'velocity' && (
              <div
                role="tooltip"
                data-tooltip-container="true"
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={cancelCloseTooltip}
                onMouseLeave={scheduleCloseTooltip}
                className="absolute z-40 left-0 sm:left-auto sm:right-0 top-[calc(100%+8px)] w-72 sm:w-80 p-4 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-gray-200/80 dark:border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] text-left pointer-events-auto before:absolute before:-top-3 before:inset-x-0 before:h-3 before:content-[''] transition-all animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100 dark:border-slate-800">
                  <span className="p-1 rounded-md bg-indigo-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
                    <Info size={12} strokeWidth={2.5} />
                  </span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {isEn ? 'Velocity' : 'Vận tốc'}
                  </span>
                </div>

                <div className="space-y-2 text-[11px] text-gray-600 dark:text-slate-300">
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-slate-200">{isEn ? 'Mechanism: ' : 'Cơ chế: '}</span>
                    <span>{isEn ? 'Measures the average digestion pace and completion time of technical workloads by the team.' : 'Đo lường nhịp độ tiêu hóa và giải quyết khối lượng công việc kỹ thuật trung bình của đội ngũ.'}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-800 text-[10px] leading-relaxed">
                    <span className="font-semibold text-gray-500 dark:text-slate-400 block mb-0.5">{isEn ? 'Formula:' : 'Cách tính:'}</span>
                    <code className="text-primary dark:text-blue-400 font-mono text-[10px] break-words font-semibold">
                      {isEn ? 'Total completion duration of finished tasks / Total finished technical tasks' : 'Tổng thời gian hoàn tất task đã xong / Tổng số task kỹ thuật hoàn thành'}
                    </code>
                  </div>

                  <div className="text-[10px] text-gray-500 dark:text-slate-400 italic">
                    {isEn ? 'Only counts tasks with start/created time and actual completed_at.' : 'Chỉ tính task có thời gian bắt đầu/tạo và completed_at thực tế.'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Đúng cam kết hạn */}
          <div
            data-tooltip-container="true"
            className={`p-3 sm:p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between hover-magnetic-card magnetic-emerald transition-all relative group/card min-w-0 h-full cursor-default ${
              activeTooltip === 'on_time_rate'
                ? 'z-30 ring-2 ring-emerald-500/40 shadow-xl bg-white dark:bg-slate-800'
                : 'z-10'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
                {isEn ? 'On-Time Rate' : 'Đúng cam kết hạn'}
              </span>

              {/* Info Icon (i) */}
              <button
                type="button"
                data-tooltip-container="true"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePinTooltip('on_time_rate');
                }}
                onMouseEnter={() => openTooltip('on_time_rate')}
                onMouseLeave={scheduleCloseTooltip}
                className={`flex items-center justify-center w-4 h-4 rounded-full transition-colors focus:outline-none cursor-pointer shrink-0 ${
                  activeTooltip === 'on_time_rate'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 ring-2 ring-emerald-400/40'
                    : 'text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60'
                }`}
                aria-label={isEn ? "On-Time Rate info" : "Thông tin chỉ số Đúng cam kết hạn"}
                title={isEn ? "View mechanism & formula for On-Time Rate" : "Xem cơ chế & cách tính Đúng cam kết hạn"}
              >
                <Info size={11} strokeWidth={2.2} />
              </button>
            </div>

            <div className="flex items-baseline justify-between my-0.5">
              <b className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {pct(metrics.onTime)}
              </b>
              <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
                {isEn ? 'Real data' : 'Dữ liệu thật'}
              </span>
            </div>

            <span className="text-[9px] text-gray-400 block truncate mt-0.5">
              {isEn ? 'Standard 23:59:59 deadline cutoff' : 'Mốc deadline 23:59:59 chuẩn hóa toàn hệ thống'}
            </span>

            {/* Tooltip Popover positioned neatly below Card 4 */}
            {activeTooltip === 'on_time_rate' && (
              <div
                role="tooltip"
                data-tooltip-container="true"
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={cancelCloseTooltip}
                onMouseLeave={scheduleCloseTooltip}
                className="absolute z-40 right-0 top-[calc(100%+8px)] w-72 sm:w-80 p-4 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-gray-200/80 dark:border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] text-left pointer-events-auto before:absolute before:-top-3 before:inset-x-0 before:h-3 before:content-[''] transition-all animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100 dark:border-slate-800">
                  <span className="p-1 rounded-md bg-emerald-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400">
                    <Info size={12} strokeWidth={2.5} />
                  </span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {isEn ? 'On-Time Rate' : 'Đúng cam kết hạn'}
                  </span>
                </div>

                <div className="space-y-2 text-[11px] text-gray-600 dark:text-slate-300">
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-slate-200">{isEn ? 'Mechanism: ' : 'Cơ chế: '}</span>
                    <span>{isEn ? 'Measures the percentage of technical tasks approved on or before the committed deadline.' : 'Đo lường tỷ lệ các đầu việc kỹ thuật được nghiệm thu đúng hoặc trước deadline cam kết ban đầu.'}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-800 text-[10px] leading-relaxed">
                    <span className="font-semibold text-gray-500 dark:text-slate-400 block mb-0.5">{isEn ? 'Formula:' : 'Cách tính:'}</span>
                    <code className="text-primary dark:text-blue-400 font-mono text-[10px] break-words font-semibold">
                      {isEn ? '(On-time completed tasks / Total completed tasks) × 100%' : '(Số task hoàn thành đúng hạn / Tổng số task đã hoàn thành) × 100%'}
                    </code>
                  </div>

                  <div className="text-[10px] text-gray-500 dark:text-slate-400 italic">
                    {isEn ? '💡 System automatically audits completion time against the 23:59:59 deadline cutoff.' : '💡 Hệ thống tự động đối soát thời điểm chốt Done với hạn chót 23:59:59 của ngày deadline.'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
  </>);
}
