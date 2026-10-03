const normalize = v => String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').trim().replace(/\s+/g,' ').toLowerCase();
function parseDate(v){if(v instanceof Date)return isNaN(+v)?null:new Date(v);let a=String(v||'').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/),y,m,d,h=0,n=0,s=0;if(a)[,y,m,d,h=0,n=0,s=0]=a;else{a=String(v||'').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);if(!a)return null;[,d,m,y,h=0,n=0,s=0]=a;}const date=new Date(+y,+m-1,+d,+h,+n,+s);return date.getFullYear()===+y&&date.getMonth()===+m-1&&date.getDate()===+d&&+h<24&&+n<60&&+s<60?date:null;}
const day=d=>Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000;
const people=t=>[...new Set(String(t.pic||'').split(/[,;\n]/).map(s=>s.trim()).filter(Boolean))];
const isDone=t=>['done','completed','complete','da hoan thanh','hoan thanh','hoan tat'].includes(normalize(t.status));
const isCancelled=t=>['cancelled','canceled','huy','da huy'].includes(normalize(t.status));
const isOpen=t=>!isDone(t)&&!isCancelled(t);
const dueDays=(t,now=new Date())=>{const d=parseDate(t.deadline);return d?day(d)-day(now):null;};
const isTestTask=t=>/\btest\b|kiem thu/.test(normalize(t.project+' '+t.task));
const isCampaign=t=>/\bcampaign\b|\bcp\b/.test(normalize(typeof t==='string'?t:t.project));
function filterTasks(tasks,{query='',pic='all',project='all',department='all',status='all',hideDone=false,excludeTests=false}={}){return tasks.filter(t=>(!query||normalize([t.id,t.task,t.project,t.pic,t.department,t.priority,t.status].join(' ')).includes(normalize(query)))&&(pic==='all'||people(t).some(p=>normalize(p)===normalize(pic)))&&(project==='all'||normalize(t.project)===normalize(project))&&(department==='all'||String(t.department||'').split(/[,;\n]/).some(d=>normalize(d)===normalize(department)))&&(status==='all'||normalize(t.status)===normalize(status))&&(!hideDone||isOpen(t))&&(!excludeTests||!isTestTask(t)));}
function summarize(tasks,now=new Date()){const done=tasks.filter(isDone).length,cancelled=tasks.filter(isCancelled).length,open=tasks.filter(isOpen);return {total:tasks.length,done,cancelled,open:open.length,overdue:open.filter(t=>dueDays(t,now)!==null&&dueDays(t,now)<0).length,dueSoon:open.filter(t=>dueDays(t,now)!==null&&dueDays(t,now)>=0&&dueDays(t,now)<=3).length,undated:open.filter(t=>dueDays(t,now)===null).length,completion:tasks.length-cancelled?done/(tasks.length-cancelled)*100:0};}
function groupProjects(tasks,now=new Date()){const groups=new Map();for(const t of tasks){const name=t.project?.trim()||'Chưa gắn dự án',key=normalize(name);if(!groups.has(key))groups.set(key,{name,key,tasks:[]});groups.get(key).tasks.push(t);}return [...groups.values()].map(g=>({...g,...summarize(g.tasks,now)}));}
function staffMetrics(tasks,users=[],pics=[],now=new Date()){const roster=new Map();for(const u of users){const pic=String(u.pic||'').trim();if(!pic||['false','nghi viec','inactive','khong'].includes(normalize(u.active)))continue;roster.set(normalize(pic),{...u,name:u.name||pic,pic,tasks:[]});}for(const pic of pics.concat(tasks.flatMap(people))){if(!roster.has(normalize(pic)))roster.set(normalize(pic),{name:pic,pic,role:'Thành viên',tasks:[]});}for(const p of roster.values()){p.tasks=tasks.filter(t=>people(t).some(pic=>normalize(pic)===normalize(p.pic)));Object.assign(p,summarize(p.tasks,now));}return [...roster.values()];}
function health(tasks){const ids=new Map();for(const t of tasks){if(!t.id)continue;const k=normalize(t.id);if(!ids.has(k))ids.set(k,[]);ids.get(k).push(t);}return {duplicateIds:[...ids.values()].filter(ts=>ts.length>1).map(ts=>({id:ts[0].id,count:ts.length,rows:ts.map(t=>t.row),tasks:ts})),missingDeadline:tasks.filter(t=>isOpen(t)&&!parseDate(t.deadline)).length,missingPic:tasks.filter(t=>!people(t).length).length,missingTitle:tasks.filter(t=>!String(t.task||'').trim()).length,testTasks:tasks.filter(isTestTask).length};}
function weeklyDeadlines(tasks,now=new Date()){const start=new Date(now.getFullYear(),now.getMonth(),now.getDate());start.setDate(start.getDate()-(start.getDay()+6)%7);return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);const ts=tasks.filter(t=>{const date=parseDate(t.deadline);return date&&day(date)===day(d)&&!isCancelled(t);});return {date:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),label:['T2','T3','T4','T5','T6','T7','CN'][i],count:ts.length,done:ts.filter(isDone).length,open:ts.filter(isOpen).length};});}

// Operational indicators use task rows, never inferred effort or completion dates.
function managementMetrics(tasks,now=new Date()) {
  const open=tasks.filter(isOpen), summary=summarize(tasks,now);
  return {...summary,
    urgent:open.filter(t=>/^(high|urgent)$/.test(normalize(t.priority))).length,
    feedback:open.filter(t=>normalize(t.status)==='feedback').length,
    unassigned:open.filter(t=>!people(t).length).length,
    upcomingAir:tasks.filter(t=>!isCancelled(t)&&parseDate(t.airDate)&&day(parseDate(t.airDate))-day(now)>=0&&day(parseDate(t.airDate))-day(now)<=7).length,
    missingAir:open.filter(t=>!parseDate(t.airDate)).length,
    nextDeadline:open.map(t=>parseDate(t.deadline)).filter(d=>d&&day(d)>=day(now)).sort((a,b)=>a-b)[0]||null,
    pics:new Set(tasks.flatMap(people).map(normalize)).size,
    platforms:[...new Map(tasks.flatMap(t=>String(t.platform||'').split(/[,;\n]/)).map(v=>v.trim()).filter(Boolean).map(v=>[normalize(v),v])).values()]
  };
}
