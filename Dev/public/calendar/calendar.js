/* ── Calendar Picker Component ── */
const calMonths=['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
const calDays=['T2','T3','T4','T5','T6','T7','CN'];
let _calState=null;

function openCalendar(opts, event){
  const {displayId, startId, endId, mode='range'}=opts;
  const inputEl=document.getElementById(displayId);
  if(!inputEl)return;
  const startEl=startId?document.getElementById(startId):null;
  const endEl=endId?document.getElementById(endId):null;
  const parseLocal = s => {
    if(!s)return null;
    const p=s.split(/[-/]/);
    if(p.length===3) {
       if(p[0].length===4) return new Date(p[0], p[1]-1, p[2]);
       if(p[2].length===4) return new Date(p[2], p[1]-1, p[0]);
    }
    return new Date(s);
  };
  // Restore controlled field values before opening: dismissing an unchanged
  // picker must not clear a previously selected deadline.
  const displayDates=(inputEl.value||'').split(' - ');
  const validDate=value=>{const d=parseLocal(value);return d&&!Number.isNaN(d.getTime())?d:null;};
  const sDate=validDate(startEl?.value||displayDates[0]);
  const eDate=validDate(endEl?.value||(mode==='range'?displayDates[1]:displayDates[0]));
  const initDate=sDate||new Date();
  
  _calState={month:initDate.getMonth(),year:initDate.getFullYear(),start:sDate,end:eDate,preset:null,displayId,startId,endId,mode,hover:null,compact:!!inputEl.closest('.tw-create-body')};
  
  let dropdown=document.getElementById('cal-dropdown');
  if(!dropdown){
    dropdown=document.createElement('div');dropdown.id='cal-dropdown';dropdown.className='cal-dropdown';dropdown.setAttribute('popover','manual');dropdown.setAttribute('role','dialog');dropdown.setAttribute('aria-label','Chọn ngày');
    document.body.appendChild(dropdown);
    document.addEventListener('mousedown', e => {
       if(_calState && !dropdown.contains(e.target) && e.target.id!==_calState.displayId) calSave();
    });
  }
  
  // Build static HTML skeleton ONCE
  dropdown.innerHTML=`<div class="cal-popup">
    <div class="cal-trip-header">
      <div class="cal-trip-title">Chọn ngày</div><button type="button" class="cal-dismiss" onclick="closeCalendar()" aria-label="Đóng lịch">${icon('left')}</button>
      <div id="cal-badge-container"></div>
    </div>
    <div class="cal-inputs-row" id="cal-inputs-container"></div>
    <div class="cal-matrix-header">
      <button type="button" onclick="calNav(-1)" class="cal-nav" aria-label="Tháng trước">${icon('left')}</button>
      <span class="cal-month-title" id="cal-title"></span>
      <button type="button" onclick="calNav(1)" class="cal-nav" aria-label="Tháng tiếp theo">${icon('right')}</button>
    </div>
    <div class="cal-weekdays">${calDays.map(d=>`<span>${d}</span>`).join('')}</div>
    <div class="cal-grid" id="cal-grid" onmouseleave="calHover()"></div>
    <div class="cal-footer">
      <div class="cal-presets" id="cal-presets-container"></div>
      <button type="button" class="cal-clear" onclick="calClear()">Xóa ngày</button>
    </div><button type="button" class="cal-apply" onclick="calSave()">Áp dụng</button>
  </div>`;
  
  const parent = inputEl.closest('dialog') || document.body;
  parent.appendChild(dropdown);
  const rect=inputEl.getBoundingClientRect();
  dropdown.style.position='fixed';
  dropdown.style.right='auto';
  dropdown.style.left=Math.max(12,Math.min(rect.right-300,window.innerWidth-312))+'px';
  dropdown.style.top=Math.max(12,Math.min(rect.bottom+8,window.innerHeight-490))+'px';
  dropdown.classList.add('cal-open');
  if(dropdown.showPopover&&!dropdown.matches(':popover-open'))dropdown.showPopover();
  // Force full render first time
  _calState.fullRender = true;
  calRender();
}

document.addEventListener('keydown',e=>{if(e.key==='Escape'&&_calState){e.preventDefault();e.stopImmediatePropagation();const id=_calState.displayId;closeCalendar();document.getElementById(id)?.focus();}},true);
function closeCalendar(){const o=document.getElementById('cal-dropdown');if(o){if(o.hidePopover&&o.matches(':popover-open'))o.hidePopover();o.classList.remove('cal-open');}_calState=null;}
function calNav(dir){if(!_calState)return;_calState.month+=dir;if(_calState.month>11){_calState.month=0;_calState.year++;}if(_calState.month<0){_calState.month=11;_calState.year--;}_calState.fullRender=true;calRender();}
function calHover(y,m,d){if(!_calState)return; _calState.hover = (y!==undefined) ? new Date(y,m,d) : null; if(_calState.start && !_calState.end) calRender();}

function autoTheme(s, e) {
  if(!s || !e) return 'default';
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 2) return '3days';
  if (diff === 6) return '1week';
  if (diff === 13) return '2weeks';
  return 'default';
}

function calPreset(key){
  if(!_calState)return;
  const now=new Date();
  let baseDate = key==='today'?new Date(now.getFullYear(),now.getMonth(),now.getDate()):(_calState.start || new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  let s=new Date(baseDate), e=new Date(baseDate);
  if(key==='today')e.setDate(e.getDate()+0);
  else if(key==='3days')e.setDate(e.getDate()+2);
  else if(key==='1week')e.setDate(e.getDate()+6);
  else if(key==='2weeks')e.setDate(e.getDate()+13);
  _calState.start=s;_calState.end=e;
  if(_calState.month !== s.getMonth() || _calState.year !== s.getFullYear()) {
    _calState.month=s.getMonth();_calState.year=s.getFullYear();
    _calState.fullRender = true;
  }
  calRender();
}

function calClear(){if(!_calState)return;_calState.start=null;_calState.end=null;_calState.hover=null;calRender();}

function calSave(){
  if(!_calState)return;
  const {start, end, displayId, startId, endId, mode} = _calState;
  const fmtDate = d => d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '';
  const dFmt = d => d ? `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}` : '';
  
  if(startId) {const el=document.getElementById(startId); if(el) el.value = fmtDate(start);}
  if(endId) {const el=document.getElementById(endId); if(el) el.value = fmtDate(end||start);}
  
  if(displayId) {
    const el = document.getElementById(displayId);
    if(el) {
       const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
       const val = mode==='range' ? (start ? (end ? `${dFmt(start)} - ${dFmt(end)}` : dFmt(start)) : '') : (start ? dFmt(start) : '');
       if(nativeSetter) {
         nativeSetter.call(el, val);
       } else {
         el.value = val;
       }
       el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
       el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
  }
  closeCalendar();
}

const shortFmt = d => d ? d.toLocaleDateString('vi-VN') : 'Chưa chọn';

function calRender(){
  if(!_calState)return;
  const {month,year,start,end,hover,mode,fullRender}=_calState;
  const dropdown=document.getElementById('cal-dropdown');if(!dropdown)return;
  
  dropdown.dataset.mode=_calState.mode;
  const theme = autoTheme(start, end);
  dropdown.className = `cal-dropdown cal-open theme-${theme}${_calState.compact?' cal-compact':''}`;
  
  const diffDays = (start && end) ? Math.round((end.getTime() - start.getTime()) / 86400000) : 0;
  
  document.getElementById('cal-badge-container').innerHTML = (start && end) ? `<span class="cal-trip-badge">${diffDays} ngày</span>` : `<span class="cal-trip-badge cal-trip-badge-empty">Chọn ngày</span>`;
  
  document.getElementById('cal-inputs-container').innerHTML = `
      <div class="cal-input-box">
        <span class="cal-input-label">Bắt đầu</span>
        <span class="cal-input-val ${!start?'empty':''}">${shortFmt(start)}</span>
      </div>
      <div class="cal-input-box">
        <span class="cal-input-label">${_calState.mode==='range'?'Kết thúc':'Ngày chọn'}</span>
        <span class="cal-input-val ${!end?'empty':''}">${shortFmt(end)}</span>
      </div>
  `;
  
  document.getElementById('cal-presets-container').innerHTML = `
        <button type="button" class="cal-preset ${theme==='today'?'active':''}" onclick="calPreset('today')">Hôm nay</button>
        <button type="button" class="cal-preset ${theme==='3days'?'active':''}" onclick="calPreset('3days')">3 ngày</button>
        <button type="button" class="cal-preset ${theme==='1week'?'active':''}" onclick="calPreset('1week')">1 tuần</button>
        <button type="button" class="cal-preset ${theme==='2weeks'?'active':''}" onclick="calPreset('2weeks')">2 tuần</button>
  `;
  
  document.getElementById('cal-title').textContent = `${calMonths[month]} ${year}`;
  
  const grid = document.getElementById('cal-grid');
  
  const first=new Date(year,month,1);const startDay=(first.getDay()+6)%7;
  const daysInMonth=new Date(year,month+1,0).getDate();
  const today=new Date();const todayD=new Date(today.getFullYear(),today.getMonth(),today.getDate()).getTime();
  
  const sT = start?start.getTime():0;
  const eT = end?end.getTime():0;
  const hT = hover?hover.getTime():0;
  
  if (fullRender) {
    let html = '';
    for(let i=0;i<startDay;i++)html+=`<span class="cal-day cal-empty"></span>`;
    for(let d=1;d<=daysInMonth;d++) {
       html+=`<button type="button" id="cal-day-btn-${d}" class="cal-day" onclick="calSelect(${year},${month},${d})" onmouseenter="calHover(${year},${month},${d})">${d}</button>`;
    }
    grid.innerHTML = html;
    _calState.fullRender = false;
  }
  
  // Update classes without recreating DOM elements!
  for(let d=1;d<=daysInMonth;d++){
    const btn = document.getElementById(`cal-day-btn-${d}`);
    if(!btn) continue;
    const date=new Date(year,month,d); const dT=date.getTime();
    const isToday=dT===todayD;
    const isStart=sT===dT;
    const isEnd=eT===dT || (sT===dT && !end && mode!=='range');
    const isSolidRange=(sT && eT && dT>sT && dT<eT);
    const isHoverRange=(sT && !eT && hT && dT>Math.min(sT,hT) && dT<Math.max(sT,hT)) || (sT && !eT && hT && dT===hT && hT!==sT);
    
    let cls='cal-day';
    if(isToday && !isStart && !isEnd)cls+=' cal-today';
    if(isStart)cls+=' cal-selected cal-start';
    if(isEnd)cls+=' cal-selected cal-end';
    if(isSolidRange)cls+=' cal-range';
    if(isHoverRange)cls+=' cal-range-hover';
    
    btn.className = cls;
  }
  positionCalendar();
}

function positionCalendar(){
  if(!_calState)return;
  const dropdown=document.getElementById('cal-dropdown');
  const input=document.getElementById(_calState.displayId);
  if(!dropdown||!input)return;
  const anchor=(input.closest('.tw-calendar-picker')||input).getBoundingClientRect();
  const gap=8, edge=12;
  dropdown.style.maxHeight=(innerHeight-edge*2)+'px';
  const box=dropdown.getBoundingClientRect();
  const below=innerHeight-anchor.bottom-gap-edge, above=anchor.top-gap-edge;
  const openBelow=below>=box.height||below>=above;
  const available=Math.max(60,openBelow?below:above);
  dropdown.style.maxHeight=available+'px';
  const height=Math.min(box.height,available);
  dropdown.style.left=Math.max(edge,Math.min(anchor.right-box.width,innerWidth-box.width-edge))+'px';
  dropdown.style.top=Math.max(edge,openBelow?anchor.bottom+gap:anchor.top-gap-height)+'px';
}

window.addEventListener('resize',positionCalendar);
document.addEventListener('scroll',e=>{if(_calState&&!document.getElementById('cal-dropdown')?.contains(e.target))positionCalendar();},true);

function calSelect(y,m,d){
  if(!_calState)return;
  const clicked = new Date(y,m,d);
  let shouldClose = false;
  if(_calState.mode==='range') {
    if(!_calState.start || (_calState.start && _calState.end)) {
      _calState.start = clicked; _calState.end = null;
    } else {
      if(clicked < _calState.start) {
         _calState.end = _calState.start; _calState.start = clicked;
      } else {
         _calState.end = clicked;
      }
      shouldClose = true;
    }
  } else {
    _calState.start = clicked;
    shouldClose = true;
  }
  calRender();
  if(shouldClose) {
    calSave();
  }
}
