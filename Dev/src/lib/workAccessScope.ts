import {isGlobalManager,isDepartmentLeader} from './roleScope.ts';
type Person={id?:string|number;department_id?:string|null;role?:string|null;employment_level?:string|null;is_active?:boolean};
type Actor=Person|null|undefined;
export const sameWorkDepartment=(actor:Actor,departmentId:unknown)=>Boolean(actor?.department_id && departmentId && String(actor.department_id)===String(departmentId));
export function workAssignmentPeople<T extends Person>(actor:Actor,people:T[]):T[]{
 if(!actor || actor.is_active===false)return [];
 if(isGlobalManager(actor)||!isDepartmentLeader(actor))return people.filter(p=>p.is_active!==false);
 return people.filter(p=>p.is_active!==false&&(String(p.id)===String(actor.id)||sameWorkDepartment(actor,p.department_id)||isDepartmentLeader(p)));
}
export function leaderParentVisible(actor:Actor,departmentId:unknown,invitedIds:(string|number)[]=[]){
 if(!actor || actor.is_active===false)return false;
 if(!isDepartmentLeader(actor))return true;
 return sameWorkDepartment(actor,departmentId)||invitedIds.some(id=>String(id)===String(actor.id));
}
export function leaderTaskVisible(actor:Actor,task:{assignee_id?:unknown;created_by?:unknown;department_id?:unknown;parent_pic_ids?:(string|number)[]},people:Person[]=[]){
 if(!actor||actor.is_active===false)return false;
 if(!isDepartmentLeader(actor))return true;
 const own=(id:unknown)=>id!=null&&String(id)===String(actor.id);
 const team=(id:unknown)=>people.some(p=>id!=null&&String(p.id)===String(id)&&sameWorkDepartment(actor,p.department_id));
 return sameWorkDepartment(actor,task.department_id)||own(task.assignee_id)||own(task.created_by)||team(task.assignee_id)||team(task.created_by)||(task.parent_pic_ids||[]).some(own);
}
export function trackLeaderVisible(actor:Actor,track:{department_id?:unknown;pics:{id:string|number}[];sub_pics?:{id:string|number}[]}){
 return leaderParentVisible(actor,track.department_id,[...track.pics,...(track.sub_pics||[])].map(p=>p.id));
}
