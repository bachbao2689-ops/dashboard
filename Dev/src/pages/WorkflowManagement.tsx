import '../styles/workflow.css';
import {useWorkflowManagement} from '../hooks/useWorkflowManagement';
import {WorkflowHeader} from '../components/features/workflow/WorkflowHeader';
import {WorkflowTimeline} from '../components/features/workflow/WorkflowTimeline';
import {WorkflowCharts} from '../components/features/workflow/WorkflowCharts';
import {WorkflowModals} from '../components/features/workflow/WorkflowModals';
import {WorkflowHubView} from '../components/features/workflow/WorkflowHubView';
import {TaskDetailPanel} from '../components/features/tasks/TaskDetailPanel';
import {SubtaskDetailPanel} from '../components/features/projects/SubtaskDetailPanel';
import type {Task} from '../hooks/useTasks';
export {WORKFLOW_STATUS_CONFIG,MARKETING_STATUS_GUIDES,STATUS_MARKETING_SUBTITLE,WorkflowHexagonIcon} from '../components/features/tasks/WorkflowStatusPicker';
export type {WorkflowTaskStatus} from '../components/features/tasks/WorkflowStatusPicker';
export function WorkflowManagement() {
 const model=useWorkflowManagement();
 const {hub,currentEntity,selectedTask,setSelectedTask,commentsFocusToken}=model;
 if (hub.error) return <div role="alert" className="card-hub p-6 m-4"><p className="text-red-500">{hub.error}</p><button onClick={()=>void hub.refresh()} className="mt-3 underline">Thử lại</button></div>;
 if (hub.loading) return <div className="p-6 space-y-5 animate-pulse"><div className="card-hub h-40"/><div className="card-hub h-64"/></div>;
  if (!currentEntity) {
    return (
      <div className="workflow-management-page w-full p-3 sm:p-6 pb-28 md:pb-32 space-y-6 relative">
        <WorkflowHubView model={model} />
      </div>
    );
  }

 return <div className="workflow-management-page w-full flex flex-col p-3 sm:p-6 pb-28 md:pb-32 space-y-6 relative">
 <WorkflowHeader model={model}/>
 <WorkflowTimeline model={model}/>
 <WorkflowCharts model={model}/>
 {selectedTask && (selectedTask.id.startsWith('ps-') || selectedTask.id.startsWith('cs-') ? <SubtaskDetailPanel commentsFocusToken={commentsFocusToken} subtask={{...selectedTask,id:selectedTask.id.slice(3),assignee_id:Number(selectedTask.assignee_id)}} profile={hub.profile} people={hub.people} assignablePeople={model.taskPeople} parentName={currentEntity.name} entityType={selectedTask.id.startsWith('ps-')?'project_subtask':'campaign_subtask'} onClose={()=>setSelectedTask(null)} onUpdated={updated=>{if(updated)setSelectedTask(current=>current?({...current,...updated,id:current.id,status:updated.status||current.status,due_date:updated.due_date||'',assignee_id:updated.assignee_id==null?undefined:String(updated.assignee_id),assignee:updated.assignee?{id:String(updated.assignee_id||''),name:updated.assignee.name||'',avatar_url:updated.assignee.avatar_url||''}:null} as Task):current);void hub.refresh();}}/> : <TaskDetailPanel commentsFocusToken={commentsFocusToken} task={hub.tasks.find(t=>t.id===selectedTask.id) || selectedTask} assignablePeople={model.taskPeople} isOpen onClose={()=>setSelectedTask(null)} onTaskUpdated={updated=>{if(updated)setSelectedTask(current=>current?{...current,...updated}:current);void hub.refresh();}}/>)}
 <WorkflowModals model={model}/>
 </div>;
}
