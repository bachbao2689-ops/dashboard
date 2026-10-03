import re

with open("Dashboard new/app.js", "r") as f:
    js = f.read()

old_completeTask = r"""window\.completeTask = async \(key, btn\) => \{
  const task = app\.data\.tasks\.find\(t=>t\.key===key\);
  if\(!task\)return toast\('Không tìm thấy dòng task\. Hãy đồng bộ lại\.'\);
  if\(!confirm\('Đánh dấu hoàn thành Task '\+task\.id\+'\?'\)\)return;
  if\(btn\)btn\.disabled=true;
  try \{
    if\(typeof google!=='undefined'&&google\.script\)\{
      await new Promise\(\(resolve,reject\)=>google\.script\.run\.withSuccessHandler\(r=>r\?\.ok===false\?reject\(new Error\(r\.error\)\):resolve\(r\)\)\.withFailureHandler\(reject\)\.apiUpdateTask\(\{id:task\.id,row:task\.row,status:'Done'\}\)\);
    \}
    task\.status='Done';closeModal\(\);render\(\);
    toast\(typeof google!=='undefined'&&google\.script\?'Đã hoàn thành task\.':'Đã hoàn thành trong phiên local\.'\);
  \}catch\(error\)\{toast\(error\.message\);\}
  finally\{if\(btn\)btn\.disabled=false;\}
\};"""

new_completeTask = r"""window.completeTask = async (key, btn) => {
  const task = app.data.tasks.find(t=>t.key===key);
  if(!task)return toast('Không tìm thấy dòng task. Hãy đồng bộ lại.');
  if(!confirm('Đánh dấu hoàn thành Task '+task.id+'?'))return;
  if(btn)btn.disabled=true;
  try {
    if(typeof google!=='undefined'&&google.script){
      await new Promise((resolve,reject)=>google.script.run.withSuccessHandler(r=>r?.ok===false?reject(new Error(r.error)):resolve(r)).withFailureHandler(reject).apiUpdateTask({id:task.id,row:task.row,status:'Done',expectedStatus:task.status}));
    }
    task.status='Done';closeModal();render();
    toast(typeof google!=='undefined'&&google.script?'Đã hoàn thành task.':'Đã hoàn thành trong phiên local.');
  }catch(error){toast(error.message);}
  finally{if(btn)btn.disabled=false;}
};"""

old_deleteTask = r"""window\.deleteTask = \(taskId, btn\) => \{
  const tr = btn \? btn\.closest\('tr'\) : null;
  if\(!confirm\('Xóa Task ' \+ taskId \+ '\? Hành động này không thể hoàn tác\.'\)\) return;
  if\(typeof google !== 'undefined' && google\.script\) \{
    google\.script\.run\.withSuccessHandler\(\(\) => \{
      if\(tr\) \{
        tr\.style\.transition = 'opacity 0\.4s, transform 0\.4s';
        tr\.style\.opacity = '0'; tr\.style\.transform = 'translateX\(-40px\)';
        setTimeout\(\(\) => \{ tr\.remove\(\); \}, 400\);
      \} else \{
        setTimeout\(\(\) => \{ load\(true\); \}, 400\);
      \}
      window\.addNotif\('🗑️ Task ' \+ taskId \+ ' đã bị xóa'\);
      toast\('Task ' \+ taskId \+ ' đã xóa!'\);
    \}\)\.withFailureHandler\(e => toast\('Lỗi: ' \+ e\.message\)\)\.apiUpdateTask\(\{id: taskId, status: 'Đã xóa'\}\);
  \} else \{
    if\(tr\) \{
      tr\.style\.transition = 'opacity 0\.4s, transform 0\.4s';
      tr\.style\.opacity = '0'; tr\.style\.transform = 'translateX\(-40px\)';
      setTimeout\(\(\) => \{ tr\.remove\(\); \}, 400\);
    \}
    window\.addNotif\('🗑️ Task ' \+ taskId \+ ' đã bị xóa'\);
    toast\('Task ' \+ taskId \+ ' đã xóa \(local\)!'\);
  \}
\};"""

new_deleteTask = r"""window.deleteTask = async (key, btn) => {
  const task = app.data.tasks.find(t=>t.key===key);
  if(!task)return toast('Không tìm thấy dòng task. Hãy đồng bộ lại.');
  if(!confirm('Ẩn Task '+task.id+' khỏi danh sách?'))return;
  if(btn)btn.disabled=true;
  try {
    if(typeof google!=='undefined'&&google.script){
      await new Promise((resolve,reject)=>google.script.run.withSuccessHandler(r=>r?.ok===false?reject(new Error(r.error)):resolve(r)).withFailureHandler(reject).apiUpdateTask({id:task.id,row:task.row,status:'Đã xóa',expectedStatus:task.status}));
      await load(false);
    }else{task.status='Đã xóa';render();}
    toast('Đã ẩn task.');
  }catch(error){toast(error.message);}finally{if(btn)btn.disabled=false;}
};"""

js = re.sub(old_completeTask, new_completeTask, js)
js = re.sub(old_deleteTask, new_deleteTask, js)

with open("Dashboard new/app.js", "w") as f:
    f.write(js)

