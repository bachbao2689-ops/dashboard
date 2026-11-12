import {useState} from 'react';
import {WorkflowTimelineToolbar} from './WorkflowTimelineToolbar';
import {WorkflowStageTimeline} from './WorkflowStageTimeline';
import {WorkflowPhaseDetails} from './WorkflowPhaseDetails';
import {WorkflowUnplannedTasks} from './WorkflowUnplannedTasks';
import type {WorkflowModel} from '../../../hooks/useWorkflowManagement';

export function WorkflowTimeline({model}: {model: WorkflowModel}) {
  const {isEn, canManagePhases, currentEntity, activeTooltip, phases} = model;
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  if (!currentEntity) return null;
  return (<>
<div className={`card-hub p-5 rounded-[8px] space-y-5 transition-all relative ${
        activeTooltip === 'task_statuses' ? 'z-30' : 'z-10'
      }`}>

        {/* Board Header with Task Status Bar, Dropdown Phase Selector & Collapse Toggle (Requirement 3) */}
        <WorkflowTimelineToolbar model={model}/>

        {!phases.length && (
          <div className="py-8 text-center text-sm">
            {!canManagePhases ? (
              <div className="space-y-1.5">
                <div className="font-bold text-amber-600 dark:text-amber-400">
                  {isEn ? 'You are not authorized to create Phases' : 'Bạn không được phân quyền tạo Phase'}
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  {isEn ? 'Please contact Project/Campaign PIC or Leader to add phases.' : 'Vui lòng liên hệ PIC hoặc Trưởng bộ phận để thiết lập lộ trình giai đoạn.'}
                </div>
              </div>
            ) : (
              <div className="text-gray-500">
                {currentEntity.root
                  ? (isEn ? 'No phases yet. Add a phase to assign PIC & sub-PIC.' : 'Chưa có phase. Thêm chặng để giao PIC và sub-PIC.')
                  : (isEn ? 'Not assigned to any phase. Contact PIC to join.' : 'Chưa được giao phase. Liên hệ PIC để tham gia đúng giai đoạn.')}
              </div>
            )}
          </div>
        )}

        {/* Luồng UX/UI Slide 6: Khi bấm Xem chi tiết thì thay đổi UX/UI ở trong bảng Lộ trình giai đoạn luôn kèm nút mũi tên back */}
        {model.isDetailOpen && model.activePhase ? (
          <div className="space-y-4">
            <WorkflowPhaseDetails model={model}/>
          </div>
        ) : (
          <>
            {/* Timeline Connected Stepper Nodes with Slide Navigation Buttons (Requirement 1) */}
            <WorkflowStageTimeline
              model={model}
              draggingTaskId={draggingTaskId}
              setDraggingTaskId={setDraggingTaskId}
            />

            {/* Dropdown & Lưới thẻ "Task chưa gắn phase" */}
            <WorkflowUnplannedTasks
              model={model}
              draggingTaskId={draggingTaskId}
              setDraggingTaskId={setDraggingTaskId}
            />
          </>
        )}

      </div>
  </>);
}
