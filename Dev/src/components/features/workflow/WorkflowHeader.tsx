import { useState } from "react";
import { WorkflowScopeHeader } from "./WorkflowScopeHeader";
import { WorkflowKpis } from "./WorkflowKpis";
import type { WorkflowModel } from "../../../hooks/useWorkflowManagement";
import { ChevronRight, ChevronLeft, BarChart2 } from "lucide-react";

export function WorkflowHeader({ model }: { model: WorkflowModel }) {
  const [showKpis, setShowKpis] = useState(true);

  return (
    <div className="card-hub p-4 sm:p-5 rounded-[12px] grid grid-cols-1 xl:grid-cols-[auto_1fr] gap-4 lg:gap-6 items-center relative z-20">
      {/* Cột trái: Scope header & Box title co dãn theo độ dài của title */}
      <div className="min-w-0 max-w-full">
        <WorkflowScopeHeader
          model={model}
          showKpis={showKpis}
          onToggleKpis={() => setShowKpis((v) => !v)}
        />
      </div>

      {/* Cột phải: Hàng 6 thẻ Performance metrics kèm nút đóng mở ở mép phải */}
      {showKpis ? (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-2 min-w-0">
          <WorkflowKpis model={model} />
          {/* Nút toggle đóng Performance metrics cards theo đúng vị trí khoanh đỏ */}
          <button
            type="button"
            onClick={() => setShowKpis(false)}
            className="hidden sm:grid place-items-center w-7 h-16 rounded-[8px] border border-gray-200/80 dark:border-slate-700/80 bg-gray-50/80 hover:bg-rose-50 dark:bg-slate-800/80 dark:hover:bg-rose-950/30 text-gray-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0 shadow-2xs"
            title={model.isEn ? "Collapse Performance cards" : "Đóng các thẻ Performance"}
            aria-label={model.isEn ? "Collapse Performance cards" : "Đóng các thẻ Performance"}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      ) : (
        <div className="justify-self-end">
          <button
            type="button"
            onClick={() => setShowKpis(true)}
            className="px-3 py-1.5 rounded-[8px] text-xs font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-700/80 hover:bg-gray-50 dark:hover:bg-slate-700/60 shadow-2xs transition-all grid grid-flow-col auto-cols-max items-center gap-1.5 cursor-pointer"
            title={model.isEn ? "Expand Performance cards" : "Mở các thẻ Performance"}
            aria-label={model.isEn ? "Expand Performance cards" : "Mở các thẻ Performance"}
          >
            <BarChart2 size={13} className="text-primary" />
            <span>{model.isEn ? "Performance" : "Performance"}</span>
            <ChevronLeft size={13} className="text-gray-400" />
          </button>
        </div>
      )}
    </div>
  );
}
