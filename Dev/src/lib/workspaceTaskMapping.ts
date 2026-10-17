import type {Task} from '../hooks/useTasks';
import {taskKey} from './taskTracking.ts';
const visibleParent=(parent:any)=>!parent||!['deleted','archived'].includes(parent.status||'');
export function mapWorkspaceTasks(real:any[],projects:any[],campaigns:any[],details:ReadonlyMap<string,{description?:string}>=new Map()):Task[]{
 const legacy=(rows:any[],kind:'project'|'campaign')=>rows.filter(row=>row[`${kind}s`]&&visibleParent(row[`${kind}s`])).map(row=>{
  const parent=row[`${kind}s`];return {...row,id:taskKey(`${kind}_subtask`,row.id),task_ref:'',priority:parent.priority||'',status:row.status||'todo',workspace_id:parent.workspace_id,assignee_id:row.assignee_id,[kind]:{id:parent.id,name:parent.name,department_id:parent.department_id,department:parent.department},department_id:parent.department_id,department:parent.department};
 });
 return [...real.filter(row=>visibleParent(row.project)&&visibleParent(row.campaign)),...legacy(projects,'project'),...legacy(campaigns,'campaign')].filter(row=>!['deleted','archived'].includes(row.status||'')).map(row=>({...row,description:details.get(row.id)?.description??row.description})) as Task[];
}
