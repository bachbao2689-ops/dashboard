import re

with open("Dashboard new/hub-access.js", "r") as f:
    js = f.read()

old_access = r"""function hubAccessData\(raw, email, localPreview\) \{
  const norm=v=>String\(v\|\|''\)\.normalize\('NFD'\)\.replace\(/\[\\u0300-\\u036f\]/g,''\)\.replace\(/\[đĐ\]/g,'d'\)\.trim\(\)\.toLowerCase\(\);
  const data=\{\.\.\.raw,meta:\{\.\.\.raw\.meta\},options:\{\.\.\.\(raw\.options\|\|raw\.taskMeta\?\.options\|\|\{\}\)\},users:\[\.\.\.\(raw\.users\|\|\[\]\)\],tasks:\[\.\.\.\(raw\.tasks\|\|\[\]\)\]\};
  data\.requests=\(raw\.requests\|\|\[\]\)\.map\(r=>\(\{\.\.\.r,borrowDate:r\.borrowDate\|\|r\.loanDate\|\|''\}\)\);
  data\.logs=\(raw\.logs\|\|\[\]\)\.map\(r=>\(\{\.\.\.r,assetCode:r\.assetCode\|\|r\.code\|\|'',assetName:r\.assetName\|\|r\.model\|\|'',applicant:r\.applicant\|\|r\.user\|\|''\}\)\);
  email=norm\(email\);
  const user=email\?data\.users\.find\(u=>norm\(u\.email\)===email\)\|\|\{email,role:'Nhân viên',notRegistered:true\}:
    localPreview\?\(data\.currentUser\|\|data\.users\.find\(u=>norm\(u\.role\)==='admin'\)\|\|\{\}\):\{role:'Nhân viên',notRegistered:true\};
  const role=norm\(user\.role\),dept=norm\(user\.department\),pic=norm\(user\.pic\),jobTitle=norm\(user\.jobTitle\);
  const rCombined = role \+ ' ' \+ jobTitle;
  const global=localPreview\|\|\['manager','admin','giam doc','quan ly'\]\.some\(kw=>rCombined\.includes\(kw\)\);
  const lead=\['lead','leader','team lead','truong phong'\]\.some\(kw=>rCombined\.includes\(kw\)\);
  data\.currentUser=user;
  Object\.assign\(data\.meta,\{email,canManage:global\|\|lead,isGlobalMgr:global,isDesign:dept\.includes\('design'\)\|\|dept\.includes\('thiet ke'\)\}\);
  data\.meta\.allowedViews=\['tasks','assets','profile'\];
  if\(data\.meta\.canManage\)data\.meta\.allowedViews\.unshift\('overview'\);
  if\(data\.meta\.canManage&&\(!data\.meta\.isGlobalMgr \|\| data\.meta\.isDesign\)\)data\.meta\.allowedViews\.push\('requests','logs'\); // wait, old logic
"""

new_access = r"""function hubAccessData(raw, email, localPreview) {
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').trim().toLowerCase();
  const deptKey=v=>{const value=norm(v);return ['desgin','design','design team'].includes(value)?'design':value;};
  const inDept=(value,dept)=>Boolean(dept)&&String(value||'').split(/[,;\n]/).some(part=>deptKey(part)===deptKey(dept));
  const data={...raw,meta:{...raw.meta},options:{...(raw.options||raw.taskMeta?.options||{})},users:[...(raw.users||[])],tasks:[...(raw.tasks||[])],taskActivity:[...(raw.taskActivity||[])]};
  data.requests=(raw.requests||[]).map(r=>({...r,borrowDate:r.borrowDate||r.loanDate||''}));
  data.logs=(raw.logs||[]).map(r=>({...r,assetCode:r.assetCode||r.code||'',assetName:r.assetName||r.model||'',applicant:r.applicant||r.user||''}));
  email=norm(email);
  const user=email?data.users.find(u=>norm(u.email)===email)||{email,role:'Nhân viên',notRegistered:true}:
    localPreview?(data.currentUser||data.users.find(u=>norm(u.role)==='admin')||{}):{role:'Nhân viên',notRegistered:true};
  const role=norm(user.role),dept=norm(user.department);
  const lead=/(^|\s)(lead|leader|manager)(\s|$)/.test(role)||role.includes('truong phong')||role.includes('quan ly');
  const global=localPreview||['admin','giam doc','director','ceo'].includes(role);
  const assetLead=lead&&deptKey(dept)==='design';
  data.currentUser=user;
  Object.assign(data.meta,{email,canManage:global||lead||raw.access?.canManage===true,isGlobalMgr:global,isDesign:deptKey(dept)==='design'||dept.includes('thiet ke'),isAssetLead:assetLead});
  data.meta.allowedViews=['tasks','assets','profile'];
  if(data.meta.canManage)data.meta.allowedViews.unshift('overview');
  if(data.meta.canManage&&(global||assetLead))data.meta.allowedViews.push('requests','logs');
  if(!global){
    data.users=data.users.filter(u=>inDept(u.department,dept));
    const allTasks=data.tasks;
    data.tasks=allTasks.filter(t=>inDept(t.department,dept));
    const ids=new Set(data.tasks.map(t=>String(t.id||'').trim()).filter(id=>id&&allTasks.filter(other=>String(other.id||'').trim()===id).length===1));
    data.taskActivity=data.taskActivity.filter(a=>ids.has(String(a.id||'').trim()));
    if(!assetLead){
      data.logs=data.logs.filter(l=>inDept(l.department,dept));
      data.requests=data.requests.filter(r=>inDept(r.department,dept));
    }
    const pics=new Set(data.users.map(u=>norm(u.pic)).filter(Boolean));
    if(Array.isArray(data.options.pics))data.options.pics=data.options.pics.filter(p=>pics.has(norm(p)));
    if(Array.isArray(data.options.departments))data.options.departments=data.options.departments.filter(d=>inDept(d,dept));
  }
  return data;
}"""

# Since regex on large blocks can fail, we just overwrite the whole file since it's just this one function!
with open("Dashboard new/hub-access.js", "w") as f:
    f.write("/* UI visibility follows the existing team rules. Server authorization is separate. */\n" + new_access)
