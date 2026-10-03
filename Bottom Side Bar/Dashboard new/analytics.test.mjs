import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const {parseDate,filterTasks,summarize,staffMetrics,health,weeklyDeadlines,managementMetrics}=vm.runInNewContext(fs.readFileSync(new URL('./analytics.js',import.meta.url),'utf8')+';({parseDate,filterTasks,summarize,staffMetrics,health,weeklyDeadlines,managementMetrics})',{Date});
const today=new Date(2026,8,29);
test('Dates, cancelled and 3-day deadline boundaries are counted correctly',()=>{
  assert.equal(parseDate('31/02/2026'),null);
  assert.equal(parseDate('2026-09-29').getDate(),29);
  const rows=[{status:'Done',deadline:'28/09/2026'},{status:'Cancelled',deadline:'28/09/2026'},{status:'On going',deadline:'28/09/2026'},{status:'Pending',deadline:'02/10/2026'},{status:'Pending',deadline:'03/10/2026'},{status:'Pending',deadline:''}];
  const s=summarize(rows,today);assert.equal(s.done,1);assert.equal(s.cancelled,1);assert.equal(s.overdue,1);assert.equal(s.dueSoon,1);assert.equal(s.undated,1);assert.equal(s.completion,20);
});
test('Multi-PIC filtering is exact and accents do not split a person',()=>{
  const rows=[{pic:'LUNA, VŨ TRẦN',status:'Done'},{pic:'LUNAR',status:'Pending'},{pic:'BART',status:'Pending'}];
  assert.equal(filterTasks(rows,{pic:'LUNA'}).length,1);
  const roster=staffMetrics(rows,[{name:'BART',pic:'ADMIN'},{name:'Vũ',pic:'Vu Tran'},{name:'Bảo',pic:'BART'}],['VŨ TRẦN'],today);
  assert.equal(roster.find(p=>p.pic==='ADMIN').total,0);assert.equal(roster.find(p=>p.pic==='BART').total,1);assert.equal(roster.find(p=>p.pic==='Vu Tran').total,1);
});
test('Weekly is Mon–Sun including cross-month deadlines',()=>{
  const bins=weeklyDeadlines([{deadline:'28/09/2026',status:'Done'},{deadline:'04/10/2026',status:'Pending'},{deadline:'05/10/2026',status:'Pending'}],today);
  assert.equal(bins[0].date,'2026-09-28');assert.equal(bins[6].date,'2026-10-04');assert.equal(bins.reduce((s,b)=>s+b.count,0),2);
});
test('Actual snapshot preserves duplicate business IDs and all rows',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('./data/snapshot.json',import.meta.url)));
  assert.equal(data.tasks.length,106);assert.equal(summarize(data.tasks,today).done,56);assert.equal(new Set(data.tasks.map(t=>t.key)).size,106);assert.equal(health(data.tasks).duplicateIds.length,13);assert.equal(filterTasks(data.tasks,{hideDone:false}).length,106);assert.equal(filterTasks(data.tasks,{hideDone:true}).length,50);
});

test('Management indicators exclude closed risks and keep launch plans separate',()=>{
  const rows=[{status:'Pending',priority:'High',deadline:'28/09/2026',pic:'LUNA, Vu Tran',airDate:'06/10/2026'}, {status:'Feedback',priority:'Urgent',deadline:'02/10/2026'}, {status:'Done',priority:'High',deadline:'28/09/2026',airDate:'29/09/2026'}, {status:'Cancelled',priority:'Urgent',airDate:'29/09/2026'}, {status:'Pending',deadline:'invalid',airDate:'07/10/2026'}];
  const m=managementMetrics(rows,today);
  assert.equal(m.overdue,1);assert.equal(m.dueSoon,1);assert.equal(m.urgent,2);assert.equal(m.feedback,1);assert.equal(m.unassigned,2);assert.equal(m.undated,1);assert.equal(m.upcomingAir,2);assert.equal(m.missingAir,1);assert.equal(m.pics,2);assert.equal(m.nextDeadline.getDate(),2);assert.equal(m.completion,25);
});
