import type {Task} from '../hooks/useTasks';
import {taskKey} from './taskTracking.ts';
import {computeDeliverableQuantity, getCachedDeliverable, type TaskDeliverableMeta} from './taskDeliverables';

const visibleParent=(parent:any)=>!parent||!['deleted','archived'].includes(parent.status||'');

export function mapWorkspaceTasks(
  real:any[],
  projects:any[],
  campaigns:any[],
  details:ReadonlyMap<string,TaskDeliverableMeta>=new Map()
):Task[]{
  const legacy=(rows:any[],kind:'project'|'campaign')=>rows.filter(row=>row[`${kind}s`]&&visibleParent(row[`${kind}s`])).map(row=>{
    const parent=row[`${kind}s`];
    return {
      ...row,
      id:taskKey(`${kind}_subtask`,row.id),
      raw_id: row.id,
      task_ref:'',
      priority:parent.priority||'',
      status:row.status||'todo',
      workspace_id:parent.workspace_id,
      assignee_id:row.assignee_id,
      [kind]:{id:parent.id,name:parent.name,department_id:parent.department_id,department:parent.department},
      department_id:parent.department_id,
      department:parent.department
    };
  });

  return [...real.filter(row=>visibleParent(row.project)&&visibleParent(row.campaign)),...legacy(projects,'project'),...legacy(campaigns,'campaign')]
    .filter(row=>!['deleted','archived'].includes(row.status||''))
    .map(row=>{
      const key = String(row.id);
      const cached = getCachedDeliverable(key) || (row.raw_id ? getCachedDeliverable(`${row.project ? 'project_subtask' : 'campaign_subtask'}:${row.raw_id}`) : undefined) || getCachedDeliverable(`task:${row.id}`);
      const meta = { ...(details.get(key) || {}), ...(cached || {}) };
      const { baseQuantity, checklistQuantity, totalQuantity } = computeDeliverableQuantity(meta);

      return {
        ...row,
        description: meta.description ?? row.description,
        quantity: meta.quantity ?? (baseQuantity > 0 ? baseQuantity : null),
        checklist_quantity: checklistQuantity,
        deliverable_quantity: totalQuantity,
        target_department_id: meta.target_department_id ?? null,
        target_department_name: meta.target_department_name ?? null,
        checklist_items: meta.checklist_items ?? [],
      };
    }) as Task[];
}
