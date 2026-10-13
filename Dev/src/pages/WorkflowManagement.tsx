import '../styles/workflow.css';
import {useNavigate} from 'react-router-dom';
import {useWorkflowManagement} from '../hooks/useWorkflowManagement';
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
 const {hub,currentEntity,selectedKey,entityFilter,handleFilterChange,selectedTask,setSelectedTask}=model;
 if (hub.error) return <div role="alert" className="card-hub p-6 m-4"><p className="text-red-500">{hub.error}</p><button onClick={()=>void hub.refresh()} className="mt-3 underline">Thử lại</button></div>;
  if (hub.loading) return <div className="p-6 space-y-5 animate-pulse"><div className="card-hub h-40"/><div className="card-hub h-64"/></div>;
  if (!currentEntity) return <div className="card-hub m-4 p-6 space-y-4"><h1 className="font-bold">Workflow Management</h1><p className="text-sm text-gray-500">{selectedKey ? 'Project/Campaign không còn trong phạm vi được xem.' : 'Chưa có Project/Campaign trong phạm vi được xem.'}</p><div className="flex gap-3"><button onClick={()=>handleFilterChange(entityFilter === 'project' ? 'campaign':'project')} className="text-sm underline">Xem {entityFilter === 'project' ? 'Campaigns':'Projects'}</button><button onClick={()=>navigate('/projects')} className="text-sm underline">Projects/Campaigns →</button></div></div>;

 return <div className="workflow-management-page w-full flex flex-col p-3 sm:p-6 pb-28 md:pb-32 space-y-6 relative">
 <WorkflowHeader model={model}/>
 <WorkflowTimeline model={model}/>
 <WorkflowCharts model={model}/>
 {selectedTask && (selectedTask.id.startsWith('ps-') || selectedTask.id.startsWith('cs-') ? <SubtaskDetailPanel subtask={{...selectedTask,id:selectedTask.id.slice(3),assignee_id:Number(selectedTask.assignee_id)}} profile={hub.profile} people={hub.people} parentName={currentEntity.name} entityType={selectedTask.id.startsWith('ps-')?'project_subtask':'campaign_subtask'} onClose={()=>setSelectedTask(null)} onUpdated={()=>{void hub.refresh();}}/> : <TaskDetailPanel task={hub.tasks.find(t=>t.id===selectedTask.id) || selectedTask} isOpen onClose={()=>setSelectedTask(null)} onTaskUpdated={()=>{void hub.refresh();}}/>)}
 <WorkflowModals model={model}/>
 </div>;
}
