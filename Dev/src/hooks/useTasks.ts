import {useAuthStore} from '../store/authStore';
import {useSharedResource} from './useSharedResource';
import {taskResource,workspaceScope} from '../services/workspaceResources';
export {readWorkspaceTasks as readVisibleTasks} from '../services/workspaceTasks';

export interface Task {
  id: string; task_ref: string; title: string; status: string; priority: string; due_date: string;
  start_date?: string; completed_at?: string; description?: string; project_id?: string; campaign_id?: string;
  department_id?: string; workspace_id?: string; workflow_phase_id?: string; created_by?: number | null; created_at?: string; updated_at?: string;
  workflow_status?: string | null;
  project?: { id?: string; name: string; department_id?: string | null; department?: {name:string} | null }; campaign?: { id?: string; name: string; department_id?: string | null; department?: {name:string} | null }; assignee_id?: string;
  assignee?: { id?: string; name: string; avatar_url: string }; department?: { id?: string; name: string }; column?: { name: string };
  quantity?: number | null;
  checklist_quantity?: number;
  deliverable_quantity?: number;
  target_department_id?: string | null;
  target_department_name?: string | null;
  checklist_items?: Array<{ id: string; title: string; quantity?: number | null; completed?: boolean; [key: string]: any }>;
}
const emptyTasks:Task[]=[];
export function useTasks(){
 const profile=useAuthStore(state=>state.profile);
 const state=useSharedResource(taskResource,workspaceScope(),Boolean(profile));
 return {tasks:state.data||emptyTasks,loading:state.loading,error:state.error,refetch:state.refetch};
}
