import '../styles/workflow.css';
import {useNavigate} from 'react-router-dom';
import {useWorkflowManagement} from '../hooks/useWorkflowManagement';
import {FolderKanban, Megaphone, ArrowRight} from 'lucide-react';
import {WorkflowHeader} from '../components/features/workflow/WorkflowHeader';
import {WorkflowTimeline} from '../components/features/workflow/WorkflowTimeline';
import {WorkflowCharts} from '../components/features/workflow/WorkflowCharts';
import {WorkflowModals} from '../components/features/workflow/WorkflowModals';
import {TaskDetailPanel} from '../components/features/tasks/TaskDetailPanel';
import {SubtaskDetailPanel} from '../components/features/projects/SubtaskDetailPanel';
export {WORKFLOW_STATUS_CONFIG,MARKETING_STATUS_GUIDES,STATUS_MARKETING_SUBTITLE,WorkflowHexagonIcon} from '../components/features/tasks/WorkflowStatusPicker';
export type {WorkflowTaskStatus} from '../components/features/tasks/WorkflowStatusPicker';
export function WorkflowManagement() {
 const model=useWorkflowManagement();
 const navigate=useNavigate();
 const {hub,currentEntity,selectedKey,entityFilter,handleFilterChange,selectedTask,setSelectedTask,commentsFocusToken}=model;
 if (hub.error) return <div role="alert" className="card-hub p-6 m-4"><p className="text-red-500">{hub.error}</p><button onClick={()=>void hub.refresh()} className="mt-3 underline">Thử lại</button></div>;
 if (hub.loading) return <div className="p-6 space-y-5 animate-pulse"><div className="card-hub h-40"/><div className="card-hub h-64"/></div>;
  if (!currentEntity) return (
    <div className="card-hub m-4 p-6 sm:p-8 space-y-4 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/80">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${
          entityFilter === 'campaign'
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/50 text-amber-600 dark:text-amber-400'
            : 'bg-violet-50 dark:bg-violet-950/40 border-violet-200/80 dark:border-violet-800/50 text-violet-600 dark:text-violet-400'
        }`}>
          {entityFilter === 'campaign' ? (
            <Megaphone className="w-5 h-5" />
          ) : (
            <FolderKanban className="w-5 h-5" />
          )}
        </div>
        <div>
          <h1 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-white tracking-tight">
            Workflow Management
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {selectedKey ? 'Project/Campaign không còn trong phạm vi được xem.' : 'Chưa có Project/Campaign trong phạm vi được xem.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100 dark:border-slate-800/80">
        {/* Toggle Project / Campaign Button */}
        <button
          type="button"
          onClick={() => handleFilterChange(entityFilter === 'project' ? 'campaign' : 'project')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer ${
            entityFilter === 'project'
              ? 'bg-gradient-to-b from-amber-50 to-amber-100/70 hover:from-amber-100 hover:to-amber-200/80 text-amber-700 border-amber-200/90 dark:from-amber-950/40 dark:to-amber-900/30 dark:text-amber-300 dark:border-amber-800/60 shadow-2xs hover:scale-[1.02]'
              : 'bg-gradient-to-b from-violet-50 to-violet-100/70 hover:from-violet-100 hover:to-violet-200/80 text-violet-700 border-violet-200/90 dark:from-violet-950/40 dark:to-violet-900/30 dark:text-violet-300 dark:border-violet-800/60 shadow-2xs hover:scale-[1.02]'
          }`}
        >
          {entityFilter === 'project' ? (
            <>
              <Megaphone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Xem Campaigns</span>
            </>
          ) : (
            <>
              <FolderKanban className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
              <span>Xem Projects</span>
            </>
          )}
        </button>

        {/* Go to Projects / Campaigns Hub Button */}
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 bg-white hover:bg-slate-50 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 shadow-2xs hover:scale-[1.02] cursor-pointer"
        >
          <div className="flex items-center -space-x-1 shrink-0">
            <span className="w-5 h-5 rounded-md bg-violet-100/80 dark:bg-violet-950/60 flex items-center justify-center border border-violet-200/60 dark:border-violet-800/60">
              <FolderKanban className="w-3 h-3 text-violet-600 dark:text-violet-400" />
            </span>
            <span className="w-5 h-5 rounded-md bg-amber-100/80 dark:bg-amber-950/60 flex items-center justify-center border border-amber-200/60 dark:border-amber-800/60">
              <Megaphone className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            </span>
          </div>
          <span>Projects / Campaigns</span>
          <ArrowRight className="w-3 h-3 text-slate-400 ml-0.5" />
        </button>
      </div>
    </div>
  );

 return <div className="workflow-management-page w-full flex flex-col p-3 sm:p-6 pb-28 md:pb-32 space-y-6 relative">
 <WorkflowHeader model={model}/>
 <WorkflowTimeline model={model}/>
 <WorkflowCharts model={model}/>
 {selectedTask && (selectedTask.id.startsWith('ps-') || selectedTask.id.startsWith('cs-') ? <SubtaskDetailPanel commentsFocusToken={commentsFocusToken} subtask={{...selectedTask,id:selectedTask.id.slice(3),assignee_id:Number(selectedTask.assignee_id)}} profile={hub.profile} people={hub.people} parentName={currentEntity.name} entityType={selectedTask.id.startsWith('ps-')?'project_subtask':'campaign_subtask'} onClose={()=>setSelectedTask(null)} onUpdated={()=>{void hub.refresh();}}/> : <TaskDetailPanel commentsFocusToken={commentsFocusToken} task={hub.tasks.find(t=>t.id===selectedTask.id) || selectedTask} isOpen onClose={()=>setSelectedTask(null)} onTaskUpdated={()=>{void hub.refresh();}}/>)}
 <WorkflowModals model={model}/>
 </div>;
}
