// Task workspace uses the existing Task Master schema and row identities.
(() => {
  const state = {view:'board', project:'all', priority:'all', status:'all', week:0, calendarStart:'', calendarEnd:'', pending:new Set()};
  const stages = [
    {id:'todo',label:'Cần làm',value:'Pending',tone:'slate'},
    {id:'doing',label:'Đang thực hiện',value:'On going',tone:'blue'},
    {id:'review',label:'Cần phản hồi',value:'Feedback',tone:'amber'},
    {id:'done',label:'Hoàn tất',value:'Done',tone:'green'},
    {id:'other',label:'Trạng thái khác',value:null,tone:'slate'}
  ];
  const stageOf = t => isDone(t)?'done':/^(feedback|on review|review)$/.test(normalize(t.status))?'review':/^(on going|ongoing|in progress|on process)$/.test(normalize(t.status))?'doing':/^(pending|to do|todo|)$/.test(normalize(t.status))?'todo':'other';
  const live = () => typeof google !== 'undefined' && !!google.script;
  const manager = () => !!(app.data?.meta?.canManage ?? app.data?.access?.canManage);
  const canEdit = t => manager() || people(t).some(p=>normalize(p)===normalize(app.data?.currentUser?.pic));
  const dateKey = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const taskFor = key => app.data.tasks.find(t=>t.key===key);
  const filtered = () => currentRows().filter(t=>(state.project==='all'||t.project===state.project)&&(state.priority==='all'||t.priority===state.priority)&&(state.status==='all'||stageOf(t)===state.status));
  const calendarTone = t => isDone(t)?'done':/^(on going|ongoing|in progress|on process)$/.test(normalize(t.status))?'doing':/^(pending|to do|todo|cancel|cancelled|canceled)$/.test(normalize(t.status))?'pending':/^(feedback|on review|review)$/.test(normalize(t.status))?'feedback':'feedback';
  const selectOptions = (values,selected,all) => `<option value="all">${all}</option>`+values.map(v=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(v||'Chưa gắn dự án')}</option>`).join('');
  const assignees = t => people(t).length?`<span class="tw-people" aria-label="${esc(t.pic)}">${people(t).slice(0,3).map(p=>{const u=app.data.users.find(u=>normalize(u.pic)===normalize(p));return `<span title="${esc(u?.name||p)}">${avatar(u||{name:p})}</span>`;}).join('')}${people(t).length>3?`<small>+${people(t).length-3}</small>`:''}</span>`:'<span class="tw-muted">Chưa giao</span>';
  const dateLabel = t => `<span class="tw-date ${isOpen(t)&&dueDays(t)<0?'tw-late':''}">${icon('calendar')}${parseDate(t.deadline)?esc(fmt(t.deadline)):'Chưa có hạn'}</span>`;
  function card(t,compact=false){
    const stage=stages.find(s=>s.id===stageOf(t));
    return `<button type="button" class="tw-card ${compact?'tw-compact':''} ${state.pending.has(t.key)?'tw-saving':''}" data-tw-task="${esc(t.key)}" draggable="${canEdit(t)&&!state.pending.has(t.key)}" aria-label="${esc(t.id+' · '+taskTitle(t))}" style="--stage:${{blue:'#4388dd',amber:'#ca941e',green:'#279561',slate:'#91a2b9'}[stage.tone]}"><span class="tw-card-top"><small>${esc(t.id||'Task')}</small>${priority(t)}</span><strong>${esc(taskTitle(t))}</strong><span class="tw-project">${esc(t.project||'Chưa gắn dự án')}</span>${!compact&&t.deliverable?`<span class="tw-deliverable">${icon('list')}<span>${esc(t.deliverable)}</span></span>`:''}<span class="tw-card-foot">${dateLabel(t)}${assignees(t)}</span>${state.pending.has(t.key)?'<span class="tw-muted">Đang lưu…</span>':''}</button>`;
  }
  function board(rows){
    return `<div class="tw-board">${stages.filter(s=>s.id!=='other'||rows.some(t=>stageOf(t)==='other')).map(s=>{const tasks=rows.filter(t=>stageOf(t)===s.id);return `<section class="tw-column tw-${s.tone}" data-tw-drop="${s.id}"><header><h3><i></i>${s.label}<span>${tasks.length}</span></h3>${manager()&&s.value?`<button type="button" data-tw-create="${esc(s.value)}" aria-label="Thêm task ${s.label}">+</button>`:''}</header><div class="tw-column-body">${tasks.map(t=>card(t)).join('')||'<div class="tw-column-empty">Chưa có công việc</div>'}</div></section>`;}).join('')}</div>`;
  }
  function list(rows){
    const visible=state.status==='all'?rows.filter(t=>!isDone(t)):rows;
    if(!visible.length)return empty('Không có công việc phù hợp','Chọn trạng thái Hoàn tất trong bộ lọc để xem task đã đóng.');
    return `<div class="tw-list">${stages.map(s=>{const tasks=visible.filter(t=>stageOf(t)===s.id);if(!tasks.length)return '';return `<section class="tw-list-group tw-${s.tone}"><h3><i></i>${s.label}<span>${tasks.length}</span></h3><div class="tw-table-scroll"><table><thead><tr><th>Công việc</th><th>Người phụ trách</th><th>Bắt đầu</th><th>Deadline</th><th>Ưu tiên</th></tr></thead><tbody>${tasks.map(t=>`<tr><td><button data-tw-task="${esc(t.key)}"><small>${esc(t.id)}</small><strong>${esc(taskTitle(t))}</strong><span>${esc(t.project||'Chưa gắn dự án')}</span></button></td><td>${assignees(t)}<small>${esc(t.pic)}</small></td><td>${esc(fmt(t.startDate))}</td><td>${dateLabel(t)}</td><td>${priority(t)}</td></tr>`).join('')}</tbody></table></div></section>`;}).join('')}${state.status==='all'?'<p class="tw-list-note">Task hoàn tất đang được ẩn. Chọn “Hoàn tất” trong bộ lọc để xem.</p>':''}</div>`;
  }
  function calendar(rows){
    const rangeStart=parseDate(state.calendarStart),rangeEnd=parseDate(state.calendarEnd||state.calendarStart);
    const anchor=rangeStart||new Date();
    const start=new Date(anchor);start.setHours(0,0,0,0);start.setDate(start.getDate()-(start.getDay()+6)%7+state.week*7);
    const rangeDays=rangeStart&&rangeEnd?Math.round((Date.UTC(rangeEnd.getFullYear(),rangeEnd.getMonth(),rangeEnd.getDate())-Date.UTC(rangeStart.getFullYear(),rangeStart.getMonth(),rangeStart.getDate()))/86400000)+1:7;
    const dates=Array.from({length:Math.max(1,rangeDays)},(_,i)=>{const d=new Date(rangeStart||start);d.setDate(d.getDate()+i);return d;});
    const inRange=value=>{const d=parseDate(value);return !!d&&(!rangeStart||(d>=rangeStart&&d<=rangeEnd));};
    const calendarRows=rangeStart?rows.filter(t=>inRange(t.deadline)||inRange(t.airDate)):rows;
    const unscheduled=rangeStart?[]:rows.filter(t=>!parseDate(t.deadline)&&!parseDate(t.airDate));
    const selectedLabel=rangeStart?(rangeEnd&&dateKey(rangeEnd)!==dateKey(rangeStart)?`${fmt(dateKey(rangeStart))} — ${fmt(dateKey(rangeEnd))}`:fmt(dateKey(rangeStart))):fmt(dateKey(state.week?start:anchor));
    return `<div class="tw-calendar-toolbar"><div><strong>${selectedLabel}</strong><p>${rangeStart?'Đang lọc task theo ngày đã chọn':'Chọn ngày để lọc task theo deadline hoặc lịch đăng'}</p></div><div class="tw-calendar-controls"><button data-tw-week="-1" aria-label="Tuần trước">${icon('left')}</button><div class="tw-calendar-picker" title="Chọn khoảng ngày để lọc task">${icon('calendar')}<input type="hidden" id="tw-calendar-start" value="${esc(state.calendarStart)}"><input type="hidden" id="tw-calendar-end" value="${esc(state.calendarEnd)}"><input type="text" id="tw-calendar-date-display" readonly value="${esc(selectedLabel)}" onclick="openCalendar({displayId:'tw-calendar-date-display',startId:'tw-calendar-start',endId:'tw-calendar-end',mode:'range'},event)" aria-label="Chọn ngày để lọc lịch tuần"></div><button data-tw-week="1" aria-label="Tuần sau">${icon('right')}</button></div></div><div class="tw-calendar">${dates.map((d,i)=>{const events=calendarRows.flatMap(t=>[['deadline','Deadline'],['airDate','Lịch đăng']].filter(([field])=>{const parsed=parseDate(t[field]);return parsed&&dateKey(parsed)===dateKey(d)&&inRange(t[field]);}).map(([field,label])=>({t,field,label})));return `<section class="tw-day ${dateKey(d)===dateKey(new Date())?'tw-today':''}"><header><span>${['CN','T2','T3','T4','T5','T6','T7'][d.getDay()]}</span><b>${d.getDate()}</b></header>${events.map(({t,field,label})=>`<div class="tw-event tw-status-${calendarTone(t)}"><small>${label} · ${esc(t.status||'Chưa đặt trạng thái')}</small>${card(t,true)}</div>`).join('')||'<p class="tw-day-empty">Không có lịch</p>'}</section>`;}).join('')}</div>${rangeStart?`<p class="tw-calendar-filter-note">${calendarRows.length} task phù hợp với khoảng ngày đã chọn.</p>`:`<details class="tw-unscheduled"><summary>Chưa có lịch <b>${unscheduled.length}</b></summary><div>${unscheduled.map(t=>card(t,true)).join('')||'<p>Tất cả công việc đã có lịch.</p>'}</div></details>`}`;
  }
  function taskFilterControls(){
    const rows=currentRows();
    return `<select data-tw-top-filter="project" aria-label="Lọc theo dự án">${selectOptions([...new Set(rows.map(t=>t.project||''))].sort(),state.project,'Tất cả dự án')}</select><select data-tw-top-filter="priority" aria-label="Lọc theo ưu tiên">${selectOptions([...new Set(rows.map(t=>t.priority).filter(Boolean))],state.priority,'Mọi ưu tiên')}</select><select data-tw-top-filter="status" aria-label="Lọc theo trạng thái"><option value="all">Mọi trạng thái</option>${stages.map(s=>`<option value="${s.id}" ${state.status===s.id?'selected':''}>${s.label}</option>`).join('')}</select>${state.project!=='all'||state.priority!=='all'||state.status!=='all'?'<button type="button" class="tw-top-reset" data-tw-top-reset>Xoá lọc</button>':''}`;
  }
  function installTaskFilters(){
    const bar=$('filter-bar');if(!bar)return;
    let controls=$('tw-top-filters');
    if(!controls){controls=document.createElement('span');controls.id='tw-top-filters';controls.className='tw-top-filters';bar.insertBefore(controls,$('reset-filters'));}
    controls.innerHTML=taskFilterControls();
  }
  function removeTaskFilters(){$('tw-top-filters')?.remove();}
  function renderWorkspace(){
    if(!app.data)return;
    installTaskFilters();
    const rows=filtered(),total=rows.length,done=rows.filter(isDone).length,late=rows.filter(t=>isOpen(t)&&dueDays(t)!==null&&dueDays(t)<0).length;
    $('secondary-view').innerHTML=`<section class="tw-workspace"><header class="tw-heading"><div><span class="eyebrow">TASK WORKSPACE</span><h2>Công việc của đội ngũ</h2><p><b>${total}</b> công việc <span>·</span> <b>${done}</b> hoàn tất <span>·</span> <b class="${late?'tw-late':''}">${late}</b> quá hạn</p></div><div class="tw-workspace-actions"><div class="tw-views" role="group" aria-label="Chế độ xem công việc">${[['board','grid','Kanban'],['list','list','Danh sách'],['calendar','calendar','Lịch tuần']].map(([v,i,label])=>`<button data-tw-view="${v}" aria-pressed="${state.view===v}" class="${state.view===v?'active':''}">${icon(i)}${label}</button>`).join('')}</div>${manager()?'<button class="tw-primary" data-tw-create="Pending">+ Tạo <span class="tw-create-wide">công việc</span></button>':''}</div></header><div class="tw-view-content">${!total?empty('Không có công việc phù hợp','Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm.'):state.view==='board'?board(rows):state.view==='list'?list(rows):calendar(rows)}</div><p class="tw-footnote">${live()?'Đồng bộ Task Master':'Bản xem local · thay đổi chỉ lưu trong phiên này'}${state.view==='board'?' · Kéo thẻ để đổi trạng thái, hoặc mở chi tiết để chọn trạng thái.':''}</p></section>`;
  }
  const previousRender=renderSecondary;
  renderSecondary=function(){if(app.view==='tasks')return renderWorkspace();return previousRender.apply(this,arguments);};
  const baseRender=render;
  render=function(){if(app.view!=='tasks')removeTaskFilters();const result=baseRender.apply(this,arguments);if($('source-status'))$('source-status').hidden=app.view==='tasks';return result;};
    
  let activeKey=null,returnFocus=null;
  async function updateStatus(key,status){
    const t=taskFor(key);if(!t||!canEdit(t)||!t.id||state.pending.has(key)||t.status===status)return;
    const before=t.status;state.pending.add(key);t.status=status;renderWorkspace();
    try{
      if(live())await new Promise((resolve,reject)=>google.script.run.withSuccessHandler(r=>r?.ok===false?reject(new Error(r.error)):resolve(r)).withFailureHandler(reject).apiMoveTask({id:t.id,row:t.row,status:status,expectedStatus:before||''}));
      toast(live()?'Đã cập nhật trạng thái':'Đã cập nhật trong phiên xem local');
    }catch(error){t.status=before;toast('Không lưu được: '+error.message);}
    finally{const current=taskFor(key);if(current)current.status=t.status;state.pending.delete(key);if(app.view==='tasks')renderWorkspace();}
  }
  function createTask(status){
    if(!manager())return;
    activeKey=null;
    modal('Tạo công việc mới', getTaskForm());
    setupTaskSubmit();
    const form=$('create-task-form'),control=form?.elements.namedItem('status');
    if(control&&[...control.options].some(o=>o.value===status))control.value=status;
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-tw-task')) window.showTask(b.dataset.twTask);
    if(b.hasAttribute('data-tw-view')){state.view=b.dataset.twView;renderWorkspace();}
    if(b.hasAttribute('data-tw-create'))createTask(b.dataset.twCreate);
    if(b.hasAttribute('data-tw-week')){state.week+=Number(b.dataset.twWeek);state.calendarStart=state.calendarEnd='';renderWorkspace();}
    if(b.hasAttribute('data-tw-top-reset')){state.project=state.priority=state.status='all';renderWorkspace();}
  });
  document.addEventListener('change',e=>{if(e.target.dataset.twTopFilter){state[e.target.dataset.twTopFilter]=e.target.value;renderWorkspace();}if(e.target.id==='tw-calendar-date-display'){state.calendarStart=$('tw-calendar-start')?.value||'';state.calendarEnd=$('tw-calendar-end')?.value||state.calendarStart;state.week=0;renderWorkspace();}if(e.target.dataset.twStatus)updateStatus(e.target.dataset.twStatus,e.target.value);});
  let dragging=null;
  document.addEventListener('dragstart',e=>{const c=e.target.closest('[data-tw-task]');if(!c||c.draggable!==true)return;dragging=c.dataset.twTask;e.dataTransfer.setData('text/plain',dragging);e.dataTransfer.effectAllowed='move';c.classList.add('tw-dragging');});
  document.addEventListener('dragover',e=>{const col=e.target.closest('[data-tw-drop]');if(!col||!dragging||col.dataset.twDrop==='other')return;e.preventDefault();e.dataTransfer.dropEffect='move';document.querySelectorAll('.tw-drop-target').forEach(n=>n.classList.remove('tw-drop-target'));col.classList.add('tw-drop-target');});
  document.addEventListener('drop',e=>{const col=e.target.closest('[data-tw-drop]');if(!col||!dragging)return;e.preventDefault();const stage=stages.find(s=>s.id===col.dataset.twDrop);if(stage?.value)updateStatus(dragging,stage.value);dragging=null;document.querySelectorAll('.tw-drop-target').forEach(n=>n.classList.remove('tw-drop-target'));});
  document.addEventListener('dragend',()=>{dragging=null;document.querySelectorAll('.tw-dragging,.tw-drop-target').forEach(n=>n.classList.remove('tw-dragging','tw-drop-target'));});
  if(app.data&&app.view==='tasks')renderWorkspace();
})();
