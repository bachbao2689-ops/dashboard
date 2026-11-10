import {isGlobalManager,isDepartmentLeader} from './roleScope.ts';
type Person={id?:string|number;department_id?:string|null;role?:string|null;employment_level?:string|null;is_active?:boolean};
type Actor=Person|null|undefined;
export const sameWorkDepartment=(actor:Actor,departmentId:unknown)=>Boolean(actor?.department_id && departmentId && String(actor.department_id)===String(departmentId));
export function workAssignmentPeople<T extends Person>(actor:Actor,people:T[]):T[]{
 if(!actor || actor.is_active===false)return [];
 if(isGlobalManager(actor)||!isDepartmentLeader(actor))return people.filter(p=>p.is_active!==false);
 return people.filter(p=>p.is_active!==false&&(String(p.id)===String(actor.id)||sameWorkDepartment(actor,p.department_id)||isDepartmentLeader(p)));
}
// Read authorization lives in RLS/workflow_hub_index. This module only limits
// assignment picker options; a directory snapshot must not decide data access.
