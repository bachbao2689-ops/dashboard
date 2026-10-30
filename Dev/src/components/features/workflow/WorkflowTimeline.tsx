import {WorkflowTimelineToolbar} from './WorkflowTimelineToolbar';
import {WorkflowStageTimeline} from './WorkflowStageTimeline';
import {WorkflowPhaseDetails} from './WorkflowPhaseDetails';
import {ArrowLeft} from 'lucide-react';
import type {WorkflowModel} from '../../../hooks/useWorkflowManagement';

export function WorkflowTimeline({model}: {model: WorkflowModel}) {
  const {hub, isEn, currentEntity, setSelectedTask, activeTooltip, phases, unplanned, linkTask} = model;
  if (!currentEntity) return null;
  return (<>
<div className={`card-hub p-5 rounded-2xl space-y-5 transition-all relative ${
        activeTooltip === 'task_statuses' ? 'z-30' : 'z-10'
      }`}>

        {/* Board Header with Task Status Bar, Dropdown Phase Selector & Collapse Toggle (Requirement 3) */}
        <WorkflowTimelineToolbar model={model}/>

        {!phases.length && <div className="py-8 text-center text-sm text-gray-500">{currentEntity.root ? (isEn ? 'No phases yet. Add a phase to assign PIC & sub-PIC.' : 'Chưa có phase. Thêm chặng để giao PIC và sub-PIC.') : (isEn ? 'Not assigned to any phase. Contact PIC to join.' : 'Chưa được giao phase. Liên hệ PIC để tham gia đúng giai đoạn.')}</div>}

        {/* Luồng UX/UI Slide 6: Khi bấm Xem chi tiết thì thay đổi UX/UI ở trong bảng Lộ trình giai đoạn luôn kèm nút mũi tên back */}
        {model.isDetailOpen && model.activePhase ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <button
                type="button"
                onClick={() => model.setIsDetailOpen(false)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/60 shadow-2xs transition-colors cursor-pointer"
                title={isEn ? "Back to all phases" : "Quay lại tổng quan các chặng"}
              >
                <ArrowLeft size={14} />
                <span>{isEn ? 'Back to all phases' : 'Quay lại tổng quan các chặng'}</span>
              </button>
            </div>
            <WorkflowPhaseDetails model={model}/>
          </div>
        ) : (
          <>
            {/* Timeline Connected Stepper Nodes with Slide Navigation Buttons (Requirement 1) */}
            <WorkflowStageTimeline model={model}/>

            {currentEntity.root && unplanned.length>0 && <section className="border-t border-gray-100 dark:border-slate-700 pt-3"><details><summary className="text-xs font-semibold cursor-pointer">{isEn ? `Unplanned tasks (${unplanned.length})` : `Task chưa gắn phase (${unplanned.length})`}</summary><div className="space-y-2 mt-3">{unplanned.map(t=><div key={t.id} className="flex flex-wrap items-center gap-2 text-xs"><button onClick={()=>setSelectedTask(t)} className="flex-1 min-w-0 text-left truncate">{t.title}</button><select aria-label={isEn ? 'Assign phase for '+t.title : 'Gắn phase cho '+t.title} className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 max-w-full" disabled={hub.busy} value="" onChange={e=>linkTask(t,e.target.value)}><option value="">{isEn ? 'Select phase...' : 'Chọn phase...'}</option>{phases.filter(p=>!['completed','cancelled'].includes(p.status)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>)}</div></details></section>}
          </>
        )}

      </div>
  </>);
}
