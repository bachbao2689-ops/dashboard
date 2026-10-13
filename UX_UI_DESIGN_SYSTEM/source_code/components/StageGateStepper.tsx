import React, { useState } from 'react';

export interface StagePhase {
  id: number;
  name: string;
  desc?: string;
  progress: number; // 0 - 100
  status: 'completed' | 'in_progress' | 'pending';
}

export interface StageGateStepperProps {
  phases: StagePhase[];
  activePhaseId: number;
  onSelectPhase: (phaseId: number) => void;
  onAddPhase?: (afterIndex: number) => void;
  renderDetailContent?: (activePhase: StagePhase) => React.ReactNode;
}

/**
 * StageGateStepper: Circular Stage-Gate Timeline Stepper.
 * Follows the progressive disclosure UX pattern: clicking a phase selects it,
 * clicking "Xem chi tiết" expands the details drawer below.
 */
export const StageGateStepper: React.FC<StageGateStepperProps> = ({
  phases,
  activePhaseId,
  onSelectPhase,
  onAddPhase,
  renderDetailContent,
}) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const activePhase = phases.find((p) => p.id === activePhaseId) || phases[0];

  return (
    <div className="space-y-5">
      {/* Horizontal Stepper Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {phases.map((phase, idx) => {
          const isSelected = phase.id === activePhaseId;
          const isDone = phase.status === 'completed';
          const isRunning = phase.status === 'in_progress';

          return (
            <React.Fragment key={phase.id}>
              {/* Circular Phase Node */}
              <div
                onClick={() => onSelectPhase(phase.id)}
                className={`group flex-1 min-w-[210px] p-4 rounded-2xl border transition-all cursor-pointer flex flex-col items-center text-center relative ${
                  isSelected
                    ? 'border-blue-500/80 bg-blue-50/40 dark:bg-slate-800/90 shadow-md ring-2 ring-blue-500/30'
                    : 'border-gray-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-800/40 hover:border-blue-300'
                }`}
              >
                {/* Stage Tag */}
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Chặng {idx + 1}/{phases.length}
                </span>

                {/* Circular Gauge / Icon */}
                <div className="relative w-16 h-16 flex items-center justify-center my-1">
                  {isDone ? (
                    <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                      <span className="text-xl font-bold">✓</span>
                    </div>
                  ) : (
                    <div className="relative w-14 h-14 rounded-full border-4 border-gray-100 dark:border-slate-700 flex items-center justify-center">
                      <span className={`text-xs font-extrabold ${isRunning ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                        {phase.progress}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Phase Title */}
                <span className="text-xs font-bold text-gray-900 dark:text-white mt-2 truncate w-full">
                  {phase.name}
                </span>

                {/* Detail Toggle Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPhase(phase.id);
                    setIsDetailOpen(!isDetailOpen);
                  }}
                  className={`mt-3 px-3 py-1 rounded-xl text-[10.5px] font-bold border transition-all ${
                    isSelected && isDetailOpen
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-blue-400'
                  }`}
                >
                  {isSelected && isDetailOpen ? 'Thu gọn' : 'Xem chi tiết'}
                </button>
              </div>

              {/* Dynamic Connector with Plus icon */}
              {idx < phases.length - 1 && (
                <div className="shrink-0 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => onAddPhase?.(idx)}
                    title="Chèn thêm giai đoạn mới"
                    className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-blue-100 text-gray-500 hover:text-blue-600 flex items-center justify-center text-xs font-bold transition-all shadow-2xs"
                  >
                    +
                  </button>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Expanded Progressive Disclosure Drawer */}
      {isDetailOpen && activePhase && (
        <div className="p-4 sm:p-5 rounded-2xl border border-blue-200/80 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                Chi tiết chặng đang chọn:
              </span>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                {activePhase.name}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsDetailOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              ✕ Đóng
            </button>
          </div>

          {renderDetailContent ? (
            renderDetailContent(activePhase)
          ) : (
            <p className="text-xs text-gray-500">
              {activePhase.desc || 'Nội dung quản lý đầu việc và tiêu chí của chặng này.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
