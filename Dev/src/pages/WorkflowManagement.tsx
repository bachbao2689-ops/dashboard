import '../styles/workflow.css';
import {useNavigate} from 'react-router-dom';
import {useWorkflowManagement} from '../hooks/useWorkflowManagement';
import {FolderKanban, Megaphone, ArrowRight, Search} from 'lucide-react';
import {WorkflowHeader} from '../components/features/workflow/WorkflowHeader';
import {WorkflowTimeline} from '../components/features/workflow/WorkflowTimeline';
import {WorkflowCharts} from '../components/features/workflow/WorkflowCharts';
import {WorkflowModals} from '../components/features/workflow/WorkflowModals';
import {TaskDetailPanel} from '../components/features/tasks/TaskDetailPanel';
import {SubtaskDetailPanel} from '../components/features/projects/SubtaskDetailPanel';
import type {Task} from '../hooks/useTasks';
export {WORKFLOW_STATUS_CONFIG,MARKETING_STATUS_GUIDES,STATUS_MARKETING_SUBTITLE,WorkflowHexagonIcon} from '../components/features/tasks/WorkflowStatusPicker';
export type {WorkflowTaskStatus} from '../components/features/tasks/WorkflowStatusPicker';
export function WorkflowManagement() {
 const model=useWorkflowManagement();
 const navigate=useNavigate();
 const {hub,currentEntity,selectedKey,entityFilter,handleFilterChange,selectedTask,setSelectedTask,commentsFocusToken,searchEntityQuery,setSearchEntityQuery,filteredEntities,handleSelectEntity,isEn}=model;
 if (hub.error) return <div role="alert" className="card-hub p-6 m-4"><p className="text-red-500">{hub.error}</p><button onClick={()=>void hub.refresh()} className="mt-3 underline">Thử lại</button></div>;
 if (hub.loading) return <div className="p-6 space-y-5 animate-pulse"><div className="card-hub h-40"/><div className="card-hub h-64"/></div>;
  if (!currentEntity) return (
    <div className="card-hub m-4 p-6 sm:p-8 space-y-4 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/80">
      <div className="grid grid-cols-[auto_1fr] items-center gap-3">
        <div className={`w-10 h-10 rounded-2xl border grid place-items-center shrink-0 ${
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
            {selectedKey ? (isEn ? 'Project/Campaign not in accessible scope.' : 'Project/Campaign không còn trong phạm vi được xem.') : (isEn ? 'No active Project/Campaign found. You can search completed items below.' : 'Chưa có Project/Campaign đang hoạt động. Bạn có thể tìm lại các mục đã hoàn thành bên dưới.')}
          </p>
        </div>
      </div>

      {/* Search Input for Completed or Any Project/Campaign */}
      <div className="pt-2 max-w-md space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchEntityQuery}
            onChange={e => setSearchEntityQuery(e.target.value)}
            placeholder={isEn ? "Search completed project or campaign..." : "Tìm dự án hoặc chiến dịch (kể cả đã hoàn thành)..."}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        {searchEntityQuery.trim().length > 0 && (
          <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1 p-1 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/60">
            {filteredEntities.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-400">
                {isEn ? 'No matching items found' : 'Không tìm thấy mục phù hợp'}
              </div>
            ) : (
              filteredEntities.map(e => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => handleSelectEntity(e.id)}
                  className="w-full text-left p-2.5 rounded-xl text-xs grid grid-cols-[1fr_auto] items-center gap-2 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <div className="grid grid-flow-col auto-cols-max items-center gap-2 min-w-0">
                    {e.type === 'campaign' ? (
                      <Megaphone size={14} className="shrink-0 text-amber-500" />
                    ) : (
                      <FolderKanban size={14} className="shrink-0 text-violet-500" />
                    )}
                    <span className="truncate font-semibold text-gray-800 dark:text-gray-200">{e.name}</span>
                  </div>
                  <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 shrink-0">
                    {(e as any).isCompletedEntity && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {isEn ? 'Done' : 'Hoàn thành'}
                      </span>
                    )}
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      e.type === 'campaign' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300' : 'bg-violet-500/15 text-violet-600 dark:text-violet-300'
                    }`}>
                      {e.type === 'campaign' ? 'Campaign' : 'Project'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="grid grid-flow-col auto-cols-max items-center gap-3 pt-3 border-t border-gray-100 dark:border-slate-800/80">
        {/* Toggle Project / Campaign Button */}
        <button
          type="button"
          onClick={() => handleFilterChange(entityFilter === 'project' ? 'campaign' : 'project')}
          className={`grid grid-flow-col auto-cols-max items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer ${
            entityFilter === 'project'
              ? 'bg-gradient-to-b from-amber-50 to-amber-100/70 hover:from-amber-100 hover:to-amber-200/80 text-amber-700 border-amber-200/90 dark:from-amber-950/40 dark:to-amber-900/30 dark:text-amber-300 dark:border-amber-800/60 shadow-2xs hover:scale-[1.02]'
              : 'bg-gradient-to-b from-violet-50 to-violet-100/70 hover:from-violet-100 hover:to-violet-200/80 text-violet-700 border-violet-200/90 dark:from-violet-950/40 dark:to-violet-900/30 dark:text-violet-300 dark:border-violet-800/60 shadow-2xs hover:scale-[1.02]'
          }`}
        >
          {entityFilter === 'project' ? (
            <>
              <Megaphone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{isEn ? 'View Campaigns' : 'Xem Campaigns'}</span>
            </>
          ) : (
            <>
              <FolderKanban className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
              <span>{isEn ? 'View Projects' : 'Xem Projects'}</span>
            </>
          )}
        </button>

        {/* Go to Projects / Campaigns Hub Button */}
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="grid grid-flow-col auto-cols-max items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 bg-white hover:bg-slate-50 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 shadow-2xs hover:scale-[1.02] cursor-pointer"
        >
          <div className="grid grid-flow-col auto-cols-max items-center -space-x-1 shrink-0">
            <span className="w-5 h-5 rounded-md bg-violet-100/80 dark:bg-violet-950/60 grid place-items-center border border-violet-200/60 dark:border-violet-800/60">
              <FolderKanban className="w-3 h-3 text-violet-600 dark:text-violet-400" />
            </span>
            <span className="w-5 h-5 rounded-md bg-amber-100/80 dark:bg-amber-950/60 grid place-items-center border border-amber-200/60 dark:border-amber-800/60">
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
 {selectedTask && (selectedTask.id.startsWith('ps-') || selectedTask.id.startsWith('cs-') ? <SubtaskDetailPanel commentsFocusToken={commentsFocusToken} subtask={{...selectedTask,id:selectedTask.id.slice(3),assignee_id:Number(selectedTask.assignee_id)}} profile={hub.profile} people={hub.people} assignablePeople={model.taskPeople} parentName={currentEntity.name} entityType={selectedTask.id.startsWith('ps-')?'project_subtask':'campaign_subtask'} onClose={()=>setSelectedTask(null)} onUpdated={updated=>{if(updated)setSelectedTask(current=>current?({...current,...updated,id:current.id,status:updated.status||current.status,due_date:updated.due_date||'',assignee_id:updated.assignee_id==null?undefined:String(updated.assignee_id),assignee:updated.assignee?{id:String(updated.assignee_id||''),name:updated.assignee.name||'',avatar_url:updated.assignee.avatar_url||''}:null} as Task):current);void hub.refresh();}}/> : <TaskDetailPanel commentsFocusToken={commentsFocusToken} task={hub.tasks.find(t=>t.id===selectedTask.id) || selectedTask} assignablePeople={model.taskPeople} isOpen onClose={()=>setSelectedTask(null)} onTaskUpdated={updated=>{if(updated)setSelectedTask(current=>current?{...current,...updated}:current);void hub.refresh();}}/>)}
 <WorkflowModals model={model}/>
 </div>;
}
