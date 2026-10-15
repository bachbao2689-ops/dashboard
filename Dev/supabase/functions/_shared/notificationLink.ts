export type NotificationLinkMetadata={origin?:unknown;target?:unknown;phase_id?:unknown;parent_kind?:unknown;parent_id?:unknown};
export function notificationLink(kind?:string|null,id?:string|null,metadata?:NotificationLinkMetadata|null):string|null{
 if(kind==='weekly_report')return '/my-tasks?report=1';
 if(kind==='profile'||kind==='user')return '/my-tasks';
 if(!id)return null;
 const root=kind==='project'||kind==='campaign'?kind:metadata?.parent_kind;
 const parent=kind==='project'||kind==='campaign'?id:metadata?.parent_id;
 if(metadata?.origin==='dashboard:v2'&&metadata.target==='workflow'&&(root==='project'||root==='campaign')&&typeof parent==='string'&&typeof metadata.phase_id==='string'){
  return '/workflow?'+new URLSearchParams({[root]:parent,phase:metadata.phase_id});
 }
 if(['task','project_subtask','campaign_subtask'].includes(kind||''))return `/tasks?task=${encodeURIComponent((kind==='project_subtask'?'ps-':kind==='campaign_subtask'?'cs-':'')+id)}`;
 if(kind==='project'||kind==='campaign')return `/projects?${kind}=${encodeURIComponent(id)}`;
 if(['workflow','workflow2','workflow_track'].includes(kind||''))return '/workflow';
 if(kind==='asset')return `/assets?asset=${encodeURIComponent(id)}`;
 if(kind==='borrow_request')return `/borrow-requests?request=${encodeURIComponent(id)}`;
 return null;
}
