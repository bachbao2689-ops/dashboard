import type {Task} from '../hooks/useTasks';
import {taskKey,taskState,taskActive} from './taskTracking.ts';
import {computeDeliverableQuantity, type TaskDeliverableMeta} from './taskDeliverables.ts';
import {checklistTaskKey} from './taskChecklist.ts';

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
    .flatMap(row=>{
      const key = String(row.id);
      const meta = details.get(key) || {};
      const { baseQuantity, checklistQuantity, totalQuantity } = computeDeliverableQuantity(meta);

      const parent = {
        ...row,
        status: taskActive(row) ? taskState(row) : row.status,
        description: meta.description ?? row.description,
        quantity: baseQuantity || null,
        base_quantity: baseQuantity || null,
        checklist_quantity: checklistQuantity,
        deliverable_quantity: baseQuantity,
        tracking_quantity: baseQuantity,
        subtask_total_quantity: totalQuantity,
        target_department_id: meta.target_department_id ?? null,
        target_department_name: meta.target_department_name ?? null,
        checklist_items: meta.checklist_items ?? [],
      };
      const items = [...new Map((meta.checklist_items || []).filter(item => item.id).map(item => [item.id, item])).values()];
      return [parent, ...items.map(item => {
        const quantity = computeDeliverableQuantity({quantity: item.quantity}).totalQuantity;
        const canceled = ['cancelled','canceled'].includes(String(row.status).toLowerCase()) || ['cancelled','canceled'].includes(String(row.workflow_status).toLowerCase());
        return {...parent, id: checklistTaskKey(key, item.id), parent_task_id: key, checklist_item_id: item.id, checklist_parent: parent,
          title: item.title, description: item.description || '', task_ref: '',
          status: canceled ? 'cancelled' : item.completed ? 'done' : ['done','complete','completed'].includes((item as any).status) ? 'todo' : (item as any).status || 'todo',
          workflow_status: canceled ? 'canceled' : item.completed ? 'completed' : (item as any).workflow_status === 'completed' ? 'backlog' : (item as any).workflow_status || 'backlog',
          priority: item.priority || parent.priority, created_at: item.created_at || parent.created_at,
          start_date: (item as any).start_date || null, due_date: item.due_date || parent.due_date,
          completed_at: item.completed ? item.completed_at || null : null,
          quantity, base_quantity: quantity, tracking_quantity: quantity, deliverable_quantity: quantity, subtask_total_quantity: quantity,
          checklist_quantity: 0, checklist_items: [],
        };
      })];
    }) as Task[];
}
