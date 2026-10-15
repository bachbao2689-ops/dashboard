import {supabase} from './supabase';
import {readAllRows} from './readAllRows';
import {taskIdentity,taskUIId} from '../lib/taskTracking';
export const weeklyEntity=(id:string)=>{const t=taskIdentity(id);return {entity_type:t.kind,entity_id:t.id};};
export async function readWeeklyReports(ids:string[],start:string,end:string,userId?:number|null){
  if(!ids.length)return [];
  const rows:any[]=[];
  for(let i=0;i<ids.length;i+=300){
    const part=ids.slice(i,i+300);
    let q=supabase.from('activity_log').select('id,user_id,entity_type,entity_id,created_at,metadata').in('entity_type',['task','project_subtask','campaign_subtask']).eq('action','weekly_report').in('entity_id',part.map(id=>taskIdentity(id).id)).contains('metadata',{week_start:start,week_end:end}).order('created_at',{ascending:false}).order('id');
    if(userId)q=q.eq('user_id',userId);
    const selected=new Set(part);
    rows.push(...(await readAllRows(q)).map(r=>({...r,entity_id:taskUIId(r.entity_type,r.entity_id)})).filter(r=>selected.has(r.entity_id)));
  }
  return [...new Map(rows.map(r=>[r.id,r])).values()].sort((a,b)=>b.created_at.localeCompare(a.created_at));
}
