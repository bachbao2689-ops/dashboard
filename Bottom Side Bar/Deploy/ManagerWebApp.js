/**
 * Manager-only Apps Script Web App API for ManagerApp.html.
 * Execute the web app as the accessing user; do not deploy as the owner.
 */

function doGet(e) {
  try {
    const activeEmail = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
    const html = HtmlService.createTemplateFromFile('ManagerApp');
    
    html.activeEmail = activeEmail;
    // Deep link support
    html.deepLinkAsset = (e && e.parameter && e.parameter.asset) ? e.parameter.asset : null;
    
    // The bootstrap includes identity and access flags, so it must be read for
    // the current visitor rather than reused from the script-wide cache.
    const freshData = apiGetManagerDashboard();
    if (!freshData.ok) throw new Error(freshData.error || 'Không tải được dữ liệu.');
    html.snapshotData = JSON.stringify(freshData.data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    
    return html.evaluate()
      .setTitle('K Coffee · Management Asset')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    return HtmlService.createHtmlOutput(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Không có quyền truy cập</title><main style="max-width:560px;margin:12vh auto;padding:28px;font:16px system-ui;color:#172033">' +
      '<h1>Management Asset</h1><p>' + escapeHtml_(error && error.message || 'Tài khoản không được phép truy cập.') + '</p>' +
      '<p>Đăng nhập bằng tài khoản Google rồi mở lại link Web App.</p></main>'
    ).setTitle('Không có quyền truy cập');
  }
}

function apiGetManagerDashboard() {
  return managerApi_(function (activeEmail) {
    const readStarted = Date.now();
    const ss = managementSpreadsheet_();
    const form = requireManagerSheet_(ss, CONFIG.FORM_SHEET);
    const log = requireManagerSheet_(ss, CONFIG.LOG_SHEET);
    const assetsSheet = requireManagerSheet_(ss, CONFIG.ASSET_SHEET);
    const requests = managerReadRequests_(form, ss);
    const logs = managerReadLogs_(log, requests);
    const assets = managerReadAssets_(assetsSheet);
    
    let taskData = { tasks: [], activity: [], meta: { ok: false, error: 'Chưa kết nối Task' } };
    let users = [];
    try {
      const taskSs = SpreadsheetApp.openById(TASK_HUB.SPREADSHEET_ID);
      users = managerReadUsers_(taskSs);
      taskData = managerReadTaskDashboard_(taskSs, users);
    } catch (e) {
      taskData.meta.error = String(e);
    }

    let currentUser = managerUniqueUserByEmail_(users, activeEmail);
    if (!currentUser) {
      currentUser = { email: activeEmail, name: '', role: 'Nhân viên', notRegistered: true };
    }
    
    if (currentUser.active === false) throw new Error('Tài khoản đã ngưng hoạt động.');
    const roleKey = hubNorm_(currentUser.role);
    const isManagerRole = ['admin','giam doc','director','ceo'].includes(roleKey) || /(^|\s)(lead|leader|manager)(\s|$)|quan ly|truong phong/.test(roleKey);
    const allowlist = [CONFIG.MANAGER_EMAIL]
      .concat(String(PropertiesService.getScriptProperties().getProperty('MANAGER_ALLOWLIST') || '').split(/[;,\n]/))
      .map(email => String(email || '').trim().toLowerCase())
      .filter(isEmail_);
      
    const canManage = isManagerRole || allowlist.indexOf(activeEmail) !== -1;

    const scoped = managerScopeDashboard_(currentUser, users, taskData, requests, logs);
    return {
      requests: scoped.requests,
      logs: scoped.logs,
      assets: assets,
      tasks: scoped.tasks,
      taskActivity: scoped.activity,
      taskMeta: taskData.meta,
      columns: managerFormColumnMap_(form),
      currentUser: currentUser,
      users: scoped.users,
      access: { canManage: canManage },
      meta: {
        taskSheetUrl: TASK_HUB.URL,
        assetSheetUrl: ss.getUrl(),
        deploymentUrl: ScriptApp.getService().getUrl(),
        readDurationMs: Date.now() - readStarted,
        fetchedAt: new Date().toISOString()
      }
    };
  });
}

const TASK_HUB = Object.freeze({
  SPREADSHEET_ID: '1PK6RkpgYfGq2V3SJpABXFtoF6Jq2V7bHA5JkBIcWQXU',
  SHEET_NAME: 'Task Master',
  SETUP_SHEET: 'List Setup',
  ACTIVITY_SHEET: 'TASK ACTIVITY',
  USER_SHEET: 'User',
  DATA_START: 2,
  WIDTH: 15,
  MAX_ROWS: 1000,
  URL: 'https://docs.google.com/spreadsheets/d/1PK6RkpgYfGq2V3SJpABXFtoF6Jq2V7bHA5JkBIcWQXU/edit?gid=1970101705#gid=1970101705'
});


/**
 * Read-only Task integration. A Task-source issue must never prevent Asset
 * reviews or returns from loading, so the error is returned as module state.
 */
function managerReadTaskDashboard_(taskSs, users) {
  const fallback = { tasks: [], activity: [], meta: { ok: false, url: TASK_HUB.URL, error: '', options: managerEmptyTaskOptions_(), activityAvailable: false } };
  try {
    taskSs = taskSs || SpreadsheetApp.openById(TASK_HUB.SPREADSHEET_ID);
    const sheet = taskSs.getSheetByName(TASK_HUB.SHEET_NAME);
    if (!sheet) throw new Error('Không tìm thấy sheet Task Master.');
    const options = managerReadTaskOptions_(taskSs, users);
    const lastRow = Math.min(sheet.getLastRow(), TASK_HUB.DATA_START + TASK_HUB.MAX_ROWS - 1);
    if (lastRow < TASK_HUB.DATA_START) {
      return { tasks: [], activity: managerReadTaskActivity_(taskSs), meta: { ok: true, url: TASK_HUB.URL, sheetName: TASK_HUB.SHEET_NAME, options: options, activityAvailable: Boolean(taskSs.getSheetByName(TASK_HUB.ACTIVITY_SHEET)) } };
    }
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(h => String(h).trim().toLowerCase());
    const idx = {
      id: headers.findIndex(h => h.includes('id')),
      department: headers.findIndex(h => h.includes('phòng ban') || h.includes('dept')),
      platform: headers.findIndex(h => h.includes('platform')),
      project: headers.findIndex(h => h === 'project' || h === 'dự án' || h === 'project/campaign' || h.includes('project')),
      campaign: headers.findIndex(h => h === 'campaign' || h === 'chiến dịch'),
      task: headers.findIndex(h => h === 'task' || h.includes('công việc')),
      priority: headers.findIndex(h => h.includes('priority') || h.includes('mức độ')),
      brief: headers.findIndex(h => h.includes('brief') || h.includes('nội dung')),
      deliverable: headers.findIndex(h => h.includes('deliverable') || h.includes('yêu cầu')),
      pic: headers.findIndex(h => h.includes('pic') || h.includes('phụ trách') || h.includes('người làm')),
      startDate: headers.findIndex(h => h.includes('start') || h.includes('bắt đầu')),
      deadline: headers.findIndex(h => h.includes('deadline') || h.includes('hạn chót')),
      airDate: headers.findIndex(h => h.includes('air') || h.includes('lịch đăng')),
      status: headers.findIndex(h => h.includes('status') || h.includes('trạng thái')),
      note: headers.findIndex(h => h.includes('note') || h.includes('ghi chú')),
      sourceLink: headers.findIndex(h => h.includes('link'))
    };

    const rows = sheet.getRange(TASK_HUB.DATA_START, 1,
      lastRow - TASK_HUB.DATA_START + 1, sheet.getLastColumn()).getDisplayValues();
    const tasks = rows.map((row, offset) => {
      if ((idx.id < 0 || !row[idx.id]) && (idx.task < 0 || !row[idx.task])) return null;
      return {
        row: TASK_HUB.DATA_START + offset,
        id: idx.id >= 0 ? row[idx.id] : '',
        department: idx.department >= 0 ? row[idx.department] : '',
        platform: idx.platform >= 0 ? row[idx.platform] : '',
        project: (idx.project >= 0 ? row[idx.project] : '') + (idx.campaign >= 0 && row[idx.campaign] ? ' (CP: ' + row[idx.campaign] + ')' : ''),
        campaign: idx.campaign >= 0 ? row[idx.campaign] : '',
        task: idx.task >= 0 ? row[idx.task] : '',
        priority: idx.priority >= 0 ? row[idx.priority] : '',
        brief: idx.brief >= 0 ? row[idx.brief] : '',
        deliverable: idx.deliverable >= 0 ? row[idx.deliverable] : '',
        pic: idx.pic >= 0 ? row[idx.pic] : '',
        startDate: idx.startDate >= 0 ? row[idx.startDate] : '',
        deadline: idx.deadline >= 0 ? row[idx.deadline] : '',
        airDate: idx.airDate >= 0 ? row[idx.airDate] : '',
        status: idx.status >= 0 ? row[idx.status] : '',
        note: idx.note >= 0 ? row[idx.note] : '',
        sourceLink: idx.sourceLink >= 0 ? row[idx.sourceLink] : ''
      };
    }).filter(Boolean);
    return { tasks: tasks, activity: managerReadTaskActivity_(taskSs), meta: { ok: true, url: TASK_HUB.URL, sheetName: TASK_HUB.SHEET_NAME, options: options, activityAvailable: Boolean(taskSs.getSheetByName(TASK_HUB.ACTIVITY_SHEET)) } };
  } catch (error) {
    fallback.meta.error = 'Không đọc được Task Master: ' + String(error && error.message || error);
    return fallback;
  }
}


/** Read a bounded append-only activity feed created by TaskGateway.gs. */
function managerReadTaskActivity_(taskSs) {
  const sheet = taskSs.getSheetByName(TASK_HUB.ACTIVITY_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const start = Math.max(2, sheet.getLastRow() - 299);
  const count = sheet.getLastRow() - start + 1;
  const values = sheet.getRange(start, 1, count, 9).getDisplayValues();
  return values.map(row => ({
    timestamp: row[0] || '', action: row[1] || '', id: row[2] || '', project: row[3] || '',
    task: row[4] || '', pic: row[5] || '', deadline: row[6] || '', detail: row[7] || '', actor: row[8] || ''
  })).filter(item => item.timestamp || item.action || item.id).reverse();
}

/**
 * Creates a Task Master row and sends one assignment email from this Hub.
 * Apps Script writes do not fire the independent Task project's onEdit trigger;
 * sending here therefore avoids a silent task and avoids duplicate mail.
 */

function managerEmptyTaskOptions_() {
  return { statuses: [], priorities: [], platforms: [], departments: [], pics: [], picEmails: {} };
}

function managerReadTaskOptions_(taskSs, users) {
  const setup = taskSs.getSheetByName(TASK_HUB.SETUP_SHEET);
  if (!setup) return managerEmptyTaskOptions_();
  const end = Math.min(setup.getLastRow(), 502);
  if (end < 2) return managerEmptyTaskOptions_();
  // List Setup has 5 cols: Status | Priority | Platform | Department | PIC
  const rows = setup.getRange(2, 1, end - 1, 5).getDisplayValues();
  const unique = index => rows.map(row => String(row[index] || '').trim()).filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index);

  const picEmails = {};
  (users || managerReadUsers_(taskSs)).filter(user => user.active !== false).forEach(user => {
    if (user.pic && isEmail_(user.email)) picEmails[user.pic.trim()] = user.email;
  });

  return { statuses: unique(0), priorities: unique(1), platforms: unique(2), departments: unique(3), pics: unique(4), picEmails: picEmails };
}

function managerValidateNewTask_(payload) {
  const body = payload || {};
  const text = key => String(body[key] || '').trim();
  const pic = text('pic');

  // Resolve email: use direct assigneeEmail if provided, otherwise look up from User sheet via picEmails map
  let resolvedEmail = text('assigneeEmail');
  if (!resolvedEmail && pic) {
    try {
      const taskSs = SpreadsheetApp.openById(TASK_HUB.SPREADSHEET_ID);
      const opts = managerReadTaskOptions_(taskSs);
      resolvedEmail = (opts.picEmails && opts.picEmails[pic]) || '';
    } catch (e) { /* non-fatal */ }
  }

  const emails = resolvedEmail.split(/[;,\n]/).map(email => email.trim()).filter(Boolean);
  const task = {
    department: text('department'), platform: text('platform'), project: text('project'), task: text('task'),
    priority: text('priority'), brief: text('brief'), deliverable: text('deliverable'), pic: pic,
    startDate: managerTaskDate_(text('startDate'), 'Ngày bắt đầu', true),
    deadline: managerTaskDate_(text('deadline'), 'Deadline', true),
    airDate: managerTaskDate_(text('airDate'), 'Ngày đăng bài', false),
    status: text('status') || 'Pending', note: text('note'), sourceLink: text('sourceLink'),
    assigneeEmails: emails
  };
  ['department', 'project', 'task', 'priority', 'pic'].forEach(key => {
    if (!task[key]) throw new Error('Thiếu trường bắt buộc: ' + ({ department: 'Phòng ban', project: 'Dự án', task: 'Tên công việc', priority: 'Mức ưu tiên', pic: 'PIC' }[key]) + '.');
  });
  if (task.deadline.getTime() < task.startDate.getTime()) throw new Error('Deadline không thể sớm hơn ngày bắt đầu.');
  if (!emails.length || emails.some(email => !isEmail_(email))) {
    throw new Error('PIC "' + pic + '" chưa có email trong sheet User. Thêm email vào cột Email của sheet User rồi thử lại.');
  }
  if (task.sourceLink && !/^https?:\/\//i.test(task.sourceLink)) throw new Error('Link nguồn phải bắt đầu bằng http:// hoặc https://.');
  return task;
}


function managerTaskDate_(text, label, required) {
  if (!text) {
    if (required) throw new Error('Thiếu ' + label + '.');
    return '';
  }
  const match = String(text).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(label + ' không đúng định dạng ngày.');
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3])) {
    throw new Error(label + ' không hợp lệ.');
  }
  return date;
}

function managerValidateTaskOptions_(task, options) {
  const checks = [
    ['department', 'departments', 'Phòng ban'], ['platform', 'platforms', 'Nền tảng'],
    ['priority', 'priorities', 'Mức ưu tiên'], ['pic', 'pics', 'PIC'], ['status', 'statuses', 'Trạng thái']
  ];
  checks.forEach(check => {
    const allowed = options[check[1]] || [];
    if (allowed.length && allowed.indexOf(task[check[0]]) === -1) {
      throw new Error(check[2] + ' không còn nằm trong List Setup. Tải lại trang rồi chọn lại.');
    }
  });
}

function managerFirstTaskBlankRow_(sheet) {
  const start = TASK_HUB.DATA_START;
  const end = Math.max(start, Math.min(sheet.getMaxRows(), start + TASK_HUB.MAX_ROWS - 1));
  const rows = sheet.getRange(start, 1, end - start + 1, TASK_HUB.WIDTH).getDisplayValues();
  const index = rows.findIndex(row => row.every(value => !String(value || '').trim()));
  if (index === -1) throw new Error('Task Master đã hết vùng nhập liệu trống.');
  return start + index;
}

function managerNextTaskId_(sheet) {
  const end = Math.max(TASK_HUB.DATA_START, Math.min(sheet.getLastRow(), TASK_HUB.DATA_START + TASK_HUB.MAX_ROWS - 1));
  const ids = sheet.getRange(TASK_HUB.DATA_START, 1, Math.max(1, end - TASK_HUB.DATA_START + 1), 1).getDisplayValues().flat();
  let max = 0;
  ids.forEach(id => { const match = String(id || '').trim().match(/^TK(\d+)$/i); if (match) max = Math.max(max, Number(match[1])); });
  const next = max + 1;
  return 'TK' + String(next).padStart(Math.max(2, String(next).length), '0');
}

function managerSendTaskAssignmentMail_(record) {
  const task = record.task;
  const recipients = task.assigneeEmails.join(',');
  const key = 'TASK_CREATE_MAIL|' + record.id + '|' + task.assigneeEmails.slice().sort().join(',').toLowerCase();
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty(key)) return '';
  try {
    const date = value => value ? Utilities.formatDate(value, Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy') : '—';
    const h = value => escapeHtml_(String(value || '—'));
    const subject = '[MANAGEMENT TASK K COFFEE] New Task Assigned: ' + task.task;
    const logoUrl = 'https://kcoffee.vn/images/logos/9/Logo_2kfk-ii.png';
    
    const html = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:28px 24px;color:#111827;background:#ffffff">' +
      '<div style="margin:0 0 26px"><img src="' + escapeHtml_(logoUrl) + '" alt="K COFFEE" style="height:48px;width:auto;display:block"></div>' +
      '<h1 style="font-size:25px;line-height:1.2;color:#1f3b76;margin:0 0 24px;font-weight:800">Dear ' + h(task.pic) + '</h1>' +
      '<div style="font-size:16px;line-height:1.45;color:#151515;margin:0 0 5px">MỞ VỊ TASK MỚI</div>' +
      '<div style="font-size:13px;line-height:1.5;color:#666666;margin:0 0 22px">Bạn vừa được mở vị task mới ở K COFFEE:</div>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border:1px solid #b9cceb;border-radius:7px;border-collapse:separate;overflow:hidden">' +
        '<tr><td colspan="2" style="padding:12px 11px;background:#f5f6f8;color:#111111;font-size:13px;font-weight:700">[' + h(record.id) + '] ' + h(task.task) + '</td></tr>' +
        '<tr><td style="padding:14px 10px 3px;width:72px;color:#222222;font-size:11px">Project:</td><td style="padding:14px 10px 3px;color:#111111;font-size:11px;font-weight:700">' + h(task.project) + '</td></tr>' +
        '<tr><td style="padding:3px 10px;color:#222222;font-size:11px">Priority:</td><td style="padding:3px 10px"><span style="display:inline-block;border-radius:8px;background:#eaf1ff;color:#2d5dab;padding:2px 9px;font-size:9px;font-weight:700">' + h(task.priority) + '</span></td></tr>' +
        '<tr><td style="padding:3px 10px 14px;color:#222222;font-size:11px">Deadline:</td><td style="padding:3px 10px 14px;color:#f21c17;font-size:11px;font-weight:800">' + h(date(task.deadline)) + '</td></tr>' +
      '</table>' +
      '<div style="margin:18px 0 12px;padding:8px 12px;border-radius:6px;background:#f6f7f9;font-size:11px;line-height:1.4;color:#525252;font-style:italic">Vào Google Sheets để đọc kỹ phần Nội dung đã Brief. Chúc bạn vượt biên thành công!</div>' +
      '<a href="' + h(TASK_HUB.URL) + '" target="_blank" style="display:inline-block;border-radius:5px;background:#1f4e9b;color:#ffffff;padding:9px 13px;font-size:11px;font-weight:700;text-decoration:none">View in Task Master Sheet</a>' +
      '</div>';
      
    MailApp.sendEmail({ 
      to: recipients, 
      subject: subject, 
      htmlBody: html, 
      body: 'Bạn có Task mới: ' + task.task + '. Deadline: ' + date(task.deadline) + '. Mở Task Master: ' + TASK_HUB.URL, 
      name: 'K Coffee · Management' 
    });
    props.setProperty(key, new Date().toISOString());
    return '';
  } catch (error) {
    return 'Task đã tạo nhưng chưa gửi được email: ' + String(error && error.message || error);
  }
}

/**
 * Creates a Task directly in Task Master.
 * Writes the row, logs to TASK ACTIVITY, sends one assignment email.
 * Idempotent via clientRequestId stored in Script Properties.
 */
function apiUpdateTask(payload) {
  return managerApi_(function (activeEmail) {
    if (!payload || !payload.id) throw new Error('Thiếu mã task.');
    const taskSs = SpreadsheetApp.openById(TASK_HUB.SPREADSHEET_ID);
    const actor = hubActor_(activeEmail, taskSs);
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const sheet = requireManagerSheet_(taskSs, TASK_HUB.SHEET_NAME);
      const record = hubTaskRow_(sheet, payload);
      const headers = record.headers.map(h => String(h).trim().toLowerCase());
      const aliases = {
        department:['phòng ban','department','dept'],platform:['platform','nền tảng'],
        project:['project','dự án','project/campaign'],campaign:['campaign','chiến dịch'],
        task:['task','công việc'],priority:['priority','mức độ','mức ưu tiên'],brief:['brief','nội dung'],
        deliverable:['deliverable','yêu cầu'],pic:['pic','phụ trách','người làm'],
        startDate:['start','bắt đầu'],deadline:['deadline','hạn chót'],airDate:['air','lịch đăng'],
        status:['status','trạng thái'],note:['note','ghi chú'],sourceLink:['link']
      };
      const cols = {};
      Object.keys(aliases).forEach(key => {cols[key] = headers.findIndex(h => aliases[key].some(alias => h === alias || (!['task','project','campaign','pic'].includes(alias) && h.includes(alias))));});
      if (cols.department < 0 || cols.pic < 0 || cols.status < 0) throw new Error('Thiếu cột phòng ban, PIC hoặc trạng thái.');
      const changed = Object.keys(cols).filter(key => payload[key] !== undefined && cols[key] >= 0);
      if (!changed.length) throw new Error('Không có thông tin cần cập nhật.');
      hubAssertTaskAccess_(actor, {department:record.values[cols.department],pic:record.values[cols.pic]}, changed);
      if (payload.expectedStatus !== undefined && String(record.values[cols.status]) !== String(payload.expectedStatus)) throw new Error('Trạng thái đã được người khác cập nhật. Hãy đồng bộ lại.');
      if (payload.status !== undefined) {
        const allowed = managerReadTaskOptions_(taskSs).statuses.concat(['Pending','On going','Feedback','Done','Đã xóa']);
        if (!allowed.includes(payload.status)) throw new Error('Trạng thái không hợp lệ.');
        if (payload.status === 'Đã xóa' && !actor.global && !actor.lead) throw new Error('Chỉ quản lý được xóa task.');
      }
      if (payload.department !== undefined || payload.pic !== undefined) {
        managerTaskAssigneeForCreator_(activeEmail, {
          department:payload.department === undefined ? record.values[cols.department] : payload.department,
          pic:payload.pic === undefined ? record.values[cols.pic] : payload.pic
        }, managerReadUsers_(taskSs));
      }
      const dates = {};
      ['startDate','deadline','airDate'].forEach(key => {
        if (cols[key] < 0) return;
        const value = payload[key] === undefined ? record.values[cols[key]] : payload[key];
        dates[key] = value instanceof Date ? value : value ? managerTaskDate_(String(value), key, false) : '';
      });
      if (dates.startDate && dates.deadline && dates.deadline < dates.startDate) throw new Error('Deadline không thể trước ngày bắt đầu.');
      if (payload.sourceLink && !/^https?:\/\//i.test(payload.sourceLink)) throw new Error('Link nguồn không hợp lệ.');
      changed.forEach(key => {
        const value = key in dates ? dates[key] : String(payload[key] == null ? '' : payload[key]).trim();
        sheet.getRange(record.row,cols[key]+1).setValue(value);
        if (key in dates) sheet.getRange(record.row,cols[key]+1).setNumberFormat('dd/mm/yyyy');
      });
      SpreadsheetApp.flush();
      const activity = taskSs.getSheetByName(TASK_HUB.ACTIVITY_SHEET);
      if (activity) {
        const value = key => payload[key] === undefined ? record.values[cols[key]] || '' : payload[key];
        try { activity.appendRow([new Date(),'Cập nhật Task',payload.id,value('project'),value('task'),value('pic'),'', '', activeEmail]); } catch (error) { console.warn(String(error)); }
      }
      return {updated:true,id:payload.id,row:record.row};
    } finally { lock.releaseLock(); }
  });
}

function managerTaskAssigneeForCreator_(activeEmail, payload, users) {
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').trim().toLowerCase();
  const deptKey = value => { const key = norm(value); return ['desgin','design','design team'].indexOf(key) !== -1 ? 'design' : key; };
  const inDept = (value, department) => Boolean(department) && String(value || '').split(/[,;\n]/).some(part => deptKey(part) === deptKey(department));
  const creator = managerUniqueUserByEmail_(users, activeEmail);
  if (!creator || creator.active === false) throw new Error('Email đang đăng nhập chưa có tài khoản nhân sự hoạt động.');
  const role = norm(creator.role);
  const global = ['admin','giam doc','director','ceo'].indexOf(role) !== -1;
  const lead = /(^|\s)(lead|leader|manager)(\s|$)/.test(role) || role.indexOf('quan ly') !== -1 || role.indexOf('truong phong') !== -1;
  if (!global && !lead) throw new Error('Chỉ Lead, Manager, Giám đốc hoặc ADMIN được giao task.');
  const department = String(payload && payload.department || '').trim();
  if (!global && !inDept(department, creator.department)) throw new Error('Bạn chỉ được giao task trong phòng ban gắn với email của mình.');
  const pic = norm(payload && payload.pic);
  const matches = users.filter(user => user.active !== false && norm(user.pic) === pic && inDept(user.department, department));
  if (matches.length !== 1) throw new Error('PIC chưa có email duy nhất trong phòng ban đã chọn. Kiểm tra lại sheet User.');
  return matches[0];
}

function apiCreateTask(payload) {
  return managerApi_(function (activeEmail) {
    const props = PropertiesService.getScriptProperties();
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const taskSs = SpreadsheetApp.openById(TASK_HUB.SPREADSHEET_ID);
      const sheet  = taskSs.getSheetByName(TASK_HUB.SHEET_NAME);
      if (!sheet) throw new Error('Không tìm thấy sheet Task Master.');
      const users = managerReadUsers_(taskSs);
      const options = managerReadTaskOptions_(taskSs, users);
      const assignee = managerTaskAssigneeForCreator_(activeEmail, payload, users);
      const task = managerValidateNewTask_(Object.assign({}, payload, {assigneeEmail:assignee.email}));
      managerValidateTaskOptions_(task, options);

      // Idempotency: skip duplicate submissions
      const clientRequestId = String(payload && payload.clientRequestId || '').trim();
      const idempotencyKey   = 'TASK_CREATE|' + activeEmail + '|' + clientRequestId;
      if (clientRequestId && props.getProperty(idempotencyKey)) {
        const cached = JSON.parse(props.getProperty(idempotencyKey));
        return { created: false, id: cached.id, row: cached.row, taskUrl: TASK_HUB.URL, warning: 'Task đã tồn tại (idempotent retry).' };
      }

            const row = managerFirstTaskBlankRow_(sheet);
      const id  = managerNextTaskId_(sheet);
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(h => String(h).trim().toLowerCase());
      const newRow = new Array(headers.length).fill('');
      headers.forEach((h, i) => {
        if(h.includes('id')) newRow[i] = id;
        else if(h.includes('phòng ban') || h.includes('dept')) newRow[i] = task.department;
        else if(h.includes('platform')) newRow[i] = task.platform;
        else if(h === 'project' || h === 'dự án' || h === 'project/campaign' || h.includes('project')) newRow[i] = task.project;
        else if(h === 'campaign' || h === 'chiến dịch') newRow[i] = task.campaign || '';
        else if(h === 'task' || h.includes('công việc')) newRow[i] = task.task;
        else if(h.includes('priority') || h.includes('mức độ')) newRow[i] = task.priority;
        else if(h.includes('brief') || h.includes('nội dung')) newRow[i] = task.brief;
        else if(h.includes('deliverable') || h.includes('yêu cầu')) newRow[i] = task.deliverable;
        else if(h.includes('pic') || h.includes('phụ trách') || h.includes('người làm')) newRow[i] = task.pic;
        else if(h.includes('start') || h.includes('bắt đầu')) newRow[i] = task.startDate;
        else if(h.includes('deadline') || h.includes('hạn chót')) newRow[i] = task.deadline;
        else if(h.includes('air') || h.includes('lịch đăng')) newRow[i] = task.airDate;
        else if(h.includes('status') || h.includes('trạng thái')) newRow[i] = task.status;
        else if(h.includes('note') || h.includes('ghi chú')) newRow[i] = task.note;
        else if(h.includes('link')) newRow[i] = task.sourceLink;
      });
      sheet.getRange(row, 1, 1, newRow.length).setValues([newRow]);
      sheet.getRange(row, 10, 1, 3).setNumberFormat('dd/mm/yyyy');
      SpreadsheetApp.flush();

      // Log to TASK ACTIVITY (non-fatal)
      try {
        const actSheet = taskSs.getSheetByName(TASK_HUB.ACTIVITY_SHEET);
        if (actSheet) {
          actSheet.appendRow([
            new Date(), 'Tạo Task', id, task.project, task.task,
            task.pic, task.deadline ? Utilities.formatDate(task.deadline, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy') : '',
            '', String(Session.getActiveUser().getEmail() || 'Manager')
          ]);
        }
      } catch (e) { /* non-fatal */ }

      // Persist before email so retrying after a mail timeout cannot create another row.
      if (clientRequestId) props.setProperty(idempotencyKey, JSON.stringify({ id: id, row: row }));
      const warning = managerSendTaskAssignmentMail_({ id: id, row: row, task: task });
      return { created: true, id: id, row: row, taskUrl: TASK_HUB.URL, warning: warning };
    } finally {
      lock.releaseLock();
    }
  });
}



function apiCreateBorrowRequest(payload) {
  return managerApi_(function (activeEmail) {
    payload = payload || {};
    const actor = hubActor_(activeEmail);
    const from = managerTaskDate_(String(payload.from || ''),'Ngày mượn',true);
    const to = managerTaskDate_(String(payload.to || ''),'Ngày trả',true);
    if (to < from) throw new Error('Ngày trả không thể trước ngày mượn.');
    const codes = Array.from(new Set(extractAssetCodes_(payload.device)));
    if (!codes.length || !String(payload.reason || '').trim()) throw new Error('Cần chọn thiết bị và nhập mục đích mượn.');
    const ss = managementSpreadsheet_();
    const assetMap = managerBuildAssetMap_(ss);
    if (codes.some(code => !assetMap[assetKey_(code)])) throw new Error('Có mã thiết bị không tồn tại.');
    const props = PropertiesService.getScriptProperties();
    const requestKey = String(payload.clientRequestId || '').trim();
    const key = 'BORROW_CREATE|' + activeEmail + '|' + requestKey;
    const lock = LockService.getScriptLock();
    const sheet = requireManagerSheet_(ss, CONFIG.FORM_SHEET);
    let newRowIndex, sourceKey;
    lock.waitLock(30000);
    try {
      if (requestKey && props.getProperty(key)) return {created:false,row:Number(props.getProperty(key))};
      ensureFormSchema_(sheet);
      const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0];
      const row = new Array(headers.length).fill('');
      const put = (aliases, value, contains) => {
        const col = headers.findIndex(header => aliases.some(alias => contains ? normalize_(header).includes(normalize_(alias)) : normalize_(header) === normalize_(alias)));
        if (col >= 0) row[col] = value;
        return col;
      };
      put(['Dấu thời gian'],new Date());
      put(['Email','Địa chỉ Email','Email Address'],activeEmail);
      put(['Họ và Tên Người Mượn','Người đăng ký'],actor.user.name);
      put(['Phòng ban'],actor.user.department);
      if (put(['Mã Thiết Bị','Tên Thiết Bị','Thiết bị'],codes.join('\n'),true) < 0) throw new Error('Thiếu cột thiết bị trong phiếu mượn.');
      put(['Số Lượng'],codes.length);
      put(['Lý do mượn','Mục đích'],String(payload.reason).trim());
      put(['Ngày Mượn','Từ ngày'],from);
      put(['Ngày Trả','Đến ngày'],to);
      put(['Ghi chú'],String(payload.note || '').trim());
      sourceKey = 'API:' + Utilities.getUuid();
      if (CONFIG.FORM_SOURCE_ID_COLUMN <= row.length) row[CONFIG.FORM_SOURCE_ID_COLUMN-1] = sourceKey;
      const capacity = Math.min(CONFIG.MAX_TRACKED_ROWS,sheet.getMaxRows()-CONFIG.FORM_DATA_START+1);
      const existing = sheet.getRange(CONFIG.FORM_DATA_START,1,capacity,headers.length).getDisplayValues();
      const offset = existing.findIndex(cells=>!String(cells[0]||'').trim()&&!String(cells[CONFIG.FORM_SOURCE_ID_COLUMN-1]||'').trim());
      newRowIndex = offset < 0 ? formDataEnd_()+1 : CONFIG.FORM_DATA_START+offset;
      if (newRowIndex > formDataEnd_()) throw new Error('Phiếu mượn đã đạt giới hạn dòng. ADMIN cần mở rộng cấu hình trước khi tạo thêm.');
      const targetRange = sheet.getRange(newRowIndex,1,1,row.length);
      const formulas = targetRange.getFormulas()[0];
      targetRange.setValues([row.map((value,index)=>value === '' && formulas[index] ? formulas[index] : value)]);
      if (requestKey) props.setProperty(key,String(newRowIndex));
    } finally { lock.releaseLock(); }
    // The processor owns its email lock; never call it while holding this lock.
    let warning = '';
    try { processNewRequest_(sheet,newRowIndex,sourceKey); }
    catch (error) { warning = 'Phiếu đã lưu, nhưng xử lý thông báo chưa hoàn tất: ' + String(error.message || error); }
    return {created:true,row:newRowIndex,warning:warning};
  });
}

function apiSaveBorrowReview(id, review) {
  return managerApi_(function (activeEmail) {
    hubAssertAssetManager_(hubActor_(activeEmail));
    const ss = managementSpreadsheet_();
    const form = requireManagerSheet_(ss, CONFIG.FORM_SHEET);
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const record = managerResolveRowId_(form, id, 'F');
      const request = readRequest_(form, record.row);
      managerRequirePending_(form, record.row);
      managerWriteBorrowReview_(form, record.row, review);
      SpreadsheetApp.flush();
      return { saved: true };
    } finally {
      lock.releaseLock();
    }
  });
}

function apiDecideBorrow(id, decision, review) {
  return managerApi_(function (activeEmail) {
    hubAssertAssetManager_(hubActor_(activeEmail));
    const ss = managementSpreadsheet_();
    const form = requireManagerSheet_(ss, CONFIG.FORM_SHEET);
    if ([BORROW_APPROVED, BORROW_REJECTED].indexOf(String(decision || '').trim()) === -1) {
      throw new Error('Quyết định mượn không hợp lệ.');
    }
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const record = managerResolveRowId_(form, id, 'F');
      const row = record.row;
      const request = readRequest_(form, row);
      managerRequirePending_(form, row);
      const approvalCol = findHeaderColumn_(form, ['Xác Nhận Cho Mượn', 'Xác Nhận']);
      if (!approvalCol) throw new Error('Không tìm thấy cột Xác Nhận Cho Mượn.');
      if (decision === BORROW_APPROVED) {
        const assets = resolveAssets_(ss, request.equipment);
        const logState = borrowLogState_(form, request);
        if (!canApproveBorrow_(form, row, approvalCol, request, assets, logState)) {
          const detail = String(form.getRange(row, approvalCol).getNote() || '').trim();
          throw new Error(detail || 'Chưa thể xác nhận: dữ liệu hoặc trạng thái thiết bị chưa đáp ứng điều kiện duyệt.');
        }
      }
      // Do not persist Manager edits on a rejected approval attempt. The explicit
      // “Lưu thông tin” action remains available for saving a draft review.
      managerWriteBorrowReview_(form, row, review);
      form.getRange(row, approvalCol).setValue(decision);
      SpreadsheetApp.flush();
      let processed;
      try {
        // Process while holding the same lock as the sheet decision write; this
        // prevents concurrent Manager actions from leaving a half-committed row.
        processed = processBorrowDecision_(form, row, decision, true, true);
      } catch (error) {
        rollbackBorrowDecisionIfUncommitted_(form, row, approvalCol, decision, request);
        throw error;
      }
      if (!processed || processed.processed !== true) {
        rollbackBorrowDecisionIfUncommitted_(form, row, approvalCol, decision, request);
        const detail = String(form.getRange(row, approvalCol).getNote() || '').trim();
        throw new Error(detail || 'Yêu cầu chưa được xử lý hoàn tất. Trạng thái đã được đưa về Chờ duyệt để có thể thử lại.');
      }
      return { saved: true, warning: processed.warning || '' };
    } finally {
      lock.releaseLock();
    }
  });
}

function managerFormColumnMap_(form) {
  return {
    note: findHeaderColumn_(form, ['Ghi chú']),
    condition: findHeaderColumn_(form, ['Tình trạng']),
    availability: findHeaderColumn_(form, ['Khả Dụng', 'Khả dụng']),
    location: findHeaderColumn_(form, ['Vị Trí', 'Vị trí']),
    borrowDecision: findHeaderColumn_(form, ['Xác Nhận Cho Mượn', 'Xác Nhận']),
    borrowConfirmedAt: findBorrowConfirmationTimestampColumn_(form,
      findHeaderColumn_(form, ['Xác Nhận Cho Mượn', 'Xác Nhận']))
  };
}

function apiSaveReturnDecision(id, payload) {
  return managerApi_(function (activeEmail) {
    hubAssertAssetManager_(hubActor_(activeEmail));
    const ss = managementSpreadsheet_();
    const log = requireManagerSheet_(ss, CONFIG.LOG_SHEET);
    const body = payload || {};
    const returnCondition = String(body.returnCondition || '').trim();
    const note = String(body.note || '').trim();
    const decision = String(body.returnDecision || '').trim();
    if (!returnCondition) throw new Error('Cần nhập tình trạng thiết bị khi nhận lại.');
    if ([RETURN_CONFIRMED, RETURN_REJECTED].indexOf(decision) === -1) throw new Error('Trạng thái xác nhận trả không hợp lệ.');

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const record = managerResolveRowId_(log, id, 'L');
      const row = record.row;
      // Manager row signatures are checked against the original A:O layout;
      // create the hidden P id column only after that check.
      ensureLogSchema_(log);
      const existing = log.getRange(row, 1, 1, LOG.REQUEST_ID).getValues()[0];
      if (returnOutcome_(existing[LOG.RETURN_DECISION - 1])) {
        throw new Error('Dòng thiết bị này đã có quyết định trả; không thể ghi đè để tránh gửi mail trùng.');
      }
      if (normalize_(existing[LOG.ASSET_STATUS - 1]) !== normalize_('Đang mượn')) {
        throw new Error('Thiết bị không ở trạng thái Đang mượn nên không thể xác nhận trả.');
      }
      const priorState = existing.slice(LOG.ASSET_STATUS - 1, LOG.RETURN_DECISION);
      log.getRange(row, LOG.RETURN_CONDITION).setValue(returnCondition);
      log.getRange(row, LOG.RETURN_NOTE).setValue(note);
      log.getRange(row, LOG.RETURN_DECISION).setValue(decision);
      SpreadsheetApp.flush();
      let processed;
      try {
        // Sheet edits and Web App calls share one critical section. Apps Script
        // programmatic writes do not fire onEdit, so call the same handler here.
        processed = handleReturnDecision_({ range: log.getRange(row, LOG.RETURN_DECISION) }, true);
      } catch (error) {
        log.getRange(row, LOG.ASSET_STATUS, 1, LOG.RETURN_DECISION - LOG.ASSET_STATUS + 1)
          .setValues([priorState]);
        SpreadsheetApp.flush();
        throw error;
      }
      if (!processed || processed.processed !== true) {
        log.getRange(row, LOG.ASSET_STATUS, 1, LOG.RETURN_DECISION - LOG.ASSET_STATUS + 1)
          .setValues([priorState]);
        SpreadsheetApp.flush();
        throw new Error(processed && processed.warning || 'Chưa xử lý được xác nhận trả; dữ liệu đã được khôi phục để thử lại.');
      }
      return { saved: true, warning: processed.warning || '' };
    } finally {
      lock.releaseLock();
    }
  });
}

function rollbackBorrowDecisionIfUncommitted_(form, row, approvalCol, decision, request) {
  const decisionKey = 'BORROW_DECISION|' + requestId_(request);
  if (PropertiesService.getScriptProperties().getProperty(decisionKey)) return;
  const cell = form.getRange(row, approvalCol);
  if (String(cell.getDisplayValue() || '').trim() !== decision) return;
  cell.setValue(PENDING);
  const timestampCol = findBorrowConfirmationTimestampColumn_(form, approvalCol);
  if (timestampCol) form.getRange(row, timestampCol).clearContent();
  SpreadsheetApp.flush();
}

function managerApi_(work) {
  try {
    const activeEmail = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
    if (!activeEmail) throw new Error('Không xác định được tài khoản đang đăng nhập.');
    return { ok: true, data: work(activeEmail) };
  } catch (error) {
    return { ok: false, error: String(error && error.message || error || 'Có lỗi xảy ra.') };
  }
}

function assertManagerWebAccess_(activeEmail) {
  // Hard block only if no email at all (running wrong deployment type)
  if (!activeEmail) {
    throw new Error('Không xác định được tài khoản đang đăng nhập. Web App cần deploy theo chế độ "User accessing the web app".');
  }
}

function requireManagerSheet_(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Spreadsheet thiếu sheet bắt buộc: ' + name + '.');
  return sheet;
}

function apiRegisterUser(payload) {
  return managerApi_(function (activeEmail) {
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const taskSs = SpreadsheetApp.openById(TASK_HUB.SPREADSHEET_ID);
      let sheet = taskSs.getSheetByName(TASK_HUB.USER_SHEET) || taskSs.getSheetByName('USERS');
      if (!sheet) {
        sheet = taskSs.insertSheet(TASK_HUB.USER_SHEET);
        sheet.appendRow(['Email', 'Họ tên', 'Vai trò', 'Phòng ban', 'PIC', 'SĐT', 'Trạng thái', 'Nhận thông báo', 'Ghi chú']);
      }
      
      const width = Math.min(20, Math.max(1, sheet.getLastColumn()));
      const headers = sheet.getRange(1, 1, 1, width).getDisplayValues()[0];
      
      // Check if already registered
      const users = managerReadUsers_(taskSs);
      const existingUser = managerUniqueUserByEmail_(users, activeEmail);
      if (existingUser) throw new Error('Tài khoản đã tồn tại. Hãy đồng bộ và cập nhật tại Hồ sơ.');
      let newRow = new Array(width).fill('');
      let rowIndex = -1;
      
      if (existingUser && existingUser.row) {
          rowIndex = existingUser.row;
          // Pre-fill newRow with existing data so we don't overwrite other columns
          newRow = sheet.getRange(rowIndex, 1, 1, width).getDisplayValues()[0];
      }
      
      const setField = (aliases, value) => {
        const targets = aliases.map(normalize_);
        for (let i = 0; i < headers.length; i++) {
          if (targets.indexOf(normalize_(headers[i])) !== -1) {
            newRow[i] = value;
            return;
          }
        }
      };
      
      setField(['Email', 'Email Address', 'Địa chỉ Email', 'Tài khoản'], activeEmail);
      setField(['Họ tên', 'Tên', 'Họ và tên', 'Name', 'Họ Và Tên'], String(payload.name || '').trim());
      // Registration never changes the role of an existing account.
      if (rowIndex === -1) setField(['Vai trò', 'Role', 'Phân quyền', 'Quyền'], 'Nhân viên');
      setField(['Phòng ban', 'Bộ phận', 'Department', 'Team'], String(payload.department || '').trim());
      setField(['PIC', 'Nickname'], String(payload.pic || '').trim().toUpperCase());
      setField(['Chức vụ', 'Chức danh', 'Job Title', 'Position'], String(payload.jobTitle || '').trim());
      setField(['SĐT', 'Số điện thoại', 'Phone'], String(payload.phone || '').trim());
      setField(['Trạng thái', 'Active', 'Hoạt động', 'Kích hoạt'], 'Đang làm việc');
      setField(['Nhận thông báo', 'Email Notification', 'Nhận Email', 'Nhận email'], 'Có');
      
      if (rowIndex !== -1) {
          // Update existing row
          sheet.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
          SpreadsheetApp.flush();
      } else {
          // New User
          let maxId = 0;
          for (const u of users) {
              const mnv = u.employeeId;
              if (mnv && String(mnv).toUpperCase().startsWith('NV')) {
                  const num = parseInt(String(mnv).substring(2));
                  if (!isNaN(num) && num > maxId) maxId = num;
              }
          }
          const nextIdStr = 'NV' + String(maxId + 1).padStart(2, '0');
          setField(['Mã Nhân viên', 'Mã NV', 'MNV', 'ID'], nextIdStr);
          
          const dataToInsert = newRow.length > 0 && newRow.some(Boolean) ? newRow : [
            activeEmail, String(payload.name || '').trim(), 'Nhân viên', String(payload.department || '').trim(), String(payload.pic || '').trim().toUpperCase(), '', 'Đang làm việc', 'Có'
          ];
          
          // Append to actual bottom
          const allEmails = sheet.getRange(1, Math.max(1, headers.findIndex(h => normalize_(h).includes('email') || normalize_(h) === 'tàikhoản') + 1), sheet.getMaxRows(), 1).getDisplayValues();
          let targetRow = 1;
          for (let i = 0; i < allEmails.length; i++) {
              if (!allEmails[i][0]) {
                  targetRow = i + 1;
                  break;
              }
              targetRow = i + 2;
          }
          if (targetRow > sheet.getMaxRows()) sheet.insertRowAfter(sheet.getMaxRows());
          sheet.getRange(targetRow, 1, 1, dataToInsert.length).setValues([dataToInsert]);
          SpreadsheetApp.flush();
      }
      
      if (rowIndex === -1) {
      // Gửi email chào mừng báo đăng ký thành công
      try {
        const subject = '[Management Hub] Đăng ký thành công';
        const html = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:28px 24px;color:#111827;background:#ffffff;border:1px solid #b9cceb;border-radius:12px;">' +
          '<div style="margin:0 0 26px"><img src="https://kcoffee.vn/images/logos/9/Logo_2kfk-ii.png" alt="K COFFEE" style="height:48px;width:auto;display:block"></div>' +
          '<h1 style="font-size:24px;line-height:1.2;color:#1f3b76;margin:0 0 20px;font-weight:800">Welcome to Management Hub!</h1>' +
          '<p style="font-size:14px;color:#151515;margin-bottom:12px;">Chào <b>' + escapeHtml_(String(payload.name).trim()) + '</b>,</p>' +
          '<p style="font-size:14px;color:#151515;line-height:1.5;">Tài khoản email <b>' + escapeHtml_(activeEmail) + '</b> của bạn đã được tạo thành công trên hệ thống với định danh PIC là <b>' + escapeHtml_(String(payload.pic).trim().toUpperCase()) + '</b>.</p>' +
          '<p style="font-size:14px;color:#151515;line-height:1.5;">Từ bây giờ, hệ thống sẽ tự động gửi email thông báo về đây mỗi khi bạn được giao Task mới.</p>' +
          '<div style="margin:24px 0 0;"><a href="' + escapeHtml_(TASK_HUB.URL) + '" target="_blank" style="display:inline-block;border-radius:5px;background:#1f4e9b;color:#ffffff;padding:10px 16px;font-size:13px;font-weight:700;text-decoration:none">Mở Management Hub</a></div>' +
          '</div>';
        MailApp.sendEmail({
          to: activeEmail,
          subject: subject,
          htmlBody: html,
          name: 'K Coffee · Management Hub'
        });
      } catch (e) { /* non-fatal */ }
      
      // Báo cho Manager biết có người mới đăng ký
      try {
        const managerHtml = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #b9cceb;border-radius:12px;">' +
          '<h2 style="color:#1f3b76;margin-bottom:16px;">Có nhân viên mới đăng ký</h2>' +
          '<p>Một nhân viên vừa đăng ký tài khoản trên Management Hub:</p>' +
          '<ul>' +
          '<li>Họ tên: <b>' + escapeHtml_(String(payload.name).trim()) + '</b></li>' +
          '<li>PIC: <b>' + escapeHtml_(String(payload.pic).trim().toUpperCase()) + '</b></li>' +
          '<li>Email: <b>' + escapeHtml_(activeEmail) + '</b></li>' +
          '<li>Phòng ban: <b>' + escapeHtml_(String(payload.department).trim()) + '</b></li>' +
          '</ul>' +
          '<p>Tài khoản này đã được tự động thêm vào sheet USERS với vai trò <b>Nhân viên</b>.</p>' +
          '<p>Hãy vào file Google Sheet Task Master để thay đổi Vai trò (thành Manager/Admin) nếu cần cấp quyền duyệt thiết bị.</p>' +
          '</div>';
        MailApp.sendEmail({
          to: CONFIG.MANAGER_EMAIL,
          subject: '[Management Hub] Nhân viên mới đăng ký: ' + String(payload.name).trim(),
          htmlBody: managerHtml,
          name: 'K Coffee · Hệ thống'
        });
      } catch(e) {}
      
      }
      return { registered: true };
    } finally {
      lock.releaseLock();
    }
  });
}

function managerReadRequests_(form, ss) {
  const end = Math.min(form.getLastRow(), formDataEnd_());
  if (end < CONFIG.FORM_DATA_START) return [];
  const width = Math.max(form.getLastColumn(), CONFIG.FORM_SOURCE_ID_COLUMN);
  const headers = form.getRange(1, 1, 1, width).getDisplayValues()[0];
  const rows = form.getRange(CONFIG.FORM_DATA_START, 1, end - CONFIG.FORM_DATA_START + 1, width).getDisplayValues();
  const setupCodes = managerBuildAssetMap_(ss);
  return rows.map((values, offset) => {
    const row = CONFIG.FORM_DATA_START + offset;
    const request = managerRequestFromRow_(headers, values);
    if (!request.timestamp && !request.name && !request.equipment) return null;
    request.id = managerRowId_('F', row, values);
    request.requestId = requestId_(request);
    request.codes = extractAssetCodes_(request.equipment);
    request.invalidCodes = request.codes.filter(code => !setupCodes[assetKey_(code)]);
    request.duplicateCodes = request.codes.filter((code, i, all) => all.findIndex(item => assetKey_(item) === assetKey_(code)) !== i);
    request.missingEmail = !isEmail_(request.email);
    request.needsData = request.missingEmail || !request.codes.length || request.invalidCodes.length > 0 || request.duplicateCodes.length > 0;
    request.borrowDecision = String(request.borrowDecision || '').trim();
    return request;
  }).filter(Boolean);
}

function managerRequestFromRow_(headers, values) {
  const exact = (aliases) => managerValueByHeader_(headers, values, aliases);
  const equipment = managerValueContainingHeader_(headers, values, 'Mã Thiết Bị') ||
    managerValueContainingHeader_(headers, values, 'Tên Thiết Bị');
  return {
    timestamp: exact(['Dấu thời gian']),
    name: exact(['Họ và Tên Người Mượn', 'Người đăng ký']),
    department: exact(['Phòng ban']),
    equipment: equipment,
    quantity: exact(['Số Lượng', 'Số lượng']),
    purpose: exact(['Lý do mượn', 'Mục đích']),
    loanDate: exact(['Ngày Mượn', 'Ngày mượn']),
    returnDate: exact(['Ngày Trả', 'Ngày trả']),
    email: exact(['Email', 'Địa chỉ Email', 'Email Address']),
    note: exact(['Ghi chú']),
    condition: exact(['Tình trạng']),
    availability: exact(['Khả Dụng', 'Khả dụng']),
    location: exact(['Vị Trí', 'Vị trí']),
    borrowDecision: exact(['Xác Nhận Cho Mượn', 'Xác Nhận']),
    borrowConfirmedAt: exact(['Dấu Thời Gian Xác Nhận', 'Dấu Thời Gian Duyệt'])
  };
}

function managerReadLogs_(log, requests) {
  const end = Math.min(log.getLastRow(), logDataEnd_());
  if (end < LOG.DATA_START) return [];
  const width = Math.min(LOG.REQUEST_ID, Math.max(LOG.WIDTH, log.getLastColumn()));
  const rows = log.getRange(LOG.DATA_START, 1, end - LOG.DATA_START + 1, width).getDisplayValues();
  const requestById = {};
  requests.forEach(request => { requestById[request.requestId] = request; });
  return rows.map((values, offset) => {
    const row = LOG.DATA_START + offset;
    if (!values[LOG.ASSET_CODE - 1]) return null;
    const requestId = width >= LOG.REQUEST_ID ? String(values[LOG.REQUEST_ID - 1] || '') : '';
    const linkedRequest = requestId ? requestById[requestId] : managerMatchRequestForLog_(requests, values);
    return {
      id: managerRowId_('L', row, values),
      requestId: requestId || (linkedRequest ? linkedRequest.requestId : ''),
      timestamp: values[LOG.TIMESTAMP - 1] || '',
      applicant: values[LOG.APPLICANT - 1] || '',
      department: values[LOG.DEPARTMENT - 1] || '',
      loanDate: values[LOG.LOAN_DATE - 1] || '',
      dueDate: values[LOG.DUE_DATE - 1] || '',
      code: values[LOG.ASSET_CODE - 1] || '',
      model: values[LOG.ASSET_MODEL - 1] || '',
      condition: values[LOG.BORROW_CONDITION - 1] || '',
      purpose: values[LOG.PURPOSE - 1] || '',
      status: values[LOG.ASSET_STATUS - 1] || '',
      manager: values[LOG.MANAGER - 1] || '',
      returnCondition: values[LOG.RETURN_CONDITION - 1] || '',
      note: values[LOG.RETURN_NOTE - 1] || '',
      returnTimestamp: values[LOG.RETURN_TIMESTAMP - 1] || '',
      returnDecision: values[LOG.RETURN_DECISION - 1] || ''
    };
  }).filter(Boolean);
}

function managerMatchRequestForLog_(requests, row) {
  const code = assetKey_(row[LOG.ASSET_CODE - 1]);
  const matches = requests.filter(request =>
    normalize_(request.name) === normalize_(row[LOG.APPLICANT - 1]) &&
    normalize_(request.department) === normalize_(row[LOG.DEPARTMENT - 1]) &&
    formatDate_(request.loanDate) === formatDate_(row[LOG.LOAN_DATE - 1]) &&
    formatDate_(request.returnDate) === formatDate_(row[LOG.DUE_DATE - 1]) &&
    extractAssetCodes_(request.equipment).map(assetKey_).indexOf(code) !== -1
  );
  return matches.length === 1 ? matches[0] : null;
}

function managerReadAssets_(sheet) {
  // A dashboard read must never add rows to the operational sheet. Besides
  // being surprising, insertRows can queue behind onEdit/form triggers and
  // make the Web App look stuck. Installation owns capacity; the dashboard
  // simply reads the rows that already exist.
  const firstRow = CONFIG.ASSET_MASTER_FIRST_ROW;
  const count = Math.max(0, Math.min(CONFIG.MAX_TRACKED_ROWS, sheet.getLastRow() - firstRow + 1));
  if (!count) return [];
  const rows = sheet.getRange(firstRow, 1, count, 11).getDisplayValues();
  return rows.map(row => row[0] ? ({
    code: row[0], model: row[1], group: row[2], serial: row[3], location: row[4],
    status: row[5], borrower: row[6], department: row[7], dueDate: row[8],
    availability: row[9], condition: row[10]
  }) : null).filter(Boolean);
}

function managerBuildAssetMap_(ss) {
  ss = ss || managementSpreadsheet_();
  const setup = requireManagerSheet_(ss, CONFIG.SETUP_SHEET);
  const firstRow = 5;
  const count = Math.max(0, Math.min(CONFIG.MAX_TRACKED_ROWS, setup.getLastRow() - firstRow + 1));
  if (!count) return {};
  const rows = setup.getRange(firstRow, 1, count, 8).getDisplayValues();
  const result = {};
  rows.forEach(row => { if (row[0]) result[assetKey_(row[0])] = true; });
  return result;
}

function managerValueByHeader_(headers, values, aliases) {
  const targets = aliases.map(normalize_);
  for (let i = 0; i < headers.length; i++) {
    if (targets.indexOf(normalize_(headers[i])) !== -1) return values[i] == null ? '' : values[i];
  }
  return '';
}

function managerValueContainingHeader_(headers, values, text) {
  const target = normalize_(text);
  for (let i = 0; i < headers.length; i++) {
    if (normalize_(headers[i]).indexOf(target) !== -1) return values[i] == null ? '' : values[i];
  }
  return '';
}

function managerWriteBorrowReview_(form, row, review) {
  const body = review || {};
  const headers = form.getRange(1, 1, 1, form.getLastColumn()).getDisplayValues()[0];
  setField_(form, row, headers, ['Ghi chú'], String(body.note || '').trim());
  setField_(form, row, headers, ['Tình trạng'], String(body.condition || '').trim());
  setField_(form, row, headers, ['Khả Dụng', 'Khả dụng'], String(body.availability || '').trim());
  setField_(form, row, headers, ['Vị Trí', 'Vị trí'], String(body.location || '').trim());
}

function managerRequirePending_(form, row) {
  const decisionCol = findHeaderColumn_(form, ['Xác Nhận Cho Mượn', 'Xác Nhận']);
  if (!decisionCol) throw new Error('Không tìm thấy cột quyết định mượn.');
  const decision = String(form.getRange(row, decisionCol).getDisplayValue() || '').trim();
  if (decision && normalize_(decision) !== normalize_(PENDING)) {
    throw new Error('Yêu cầu này đã được xử lý. Tải lại trang để tránh ghi đè quyết định.');
  }
}

function managerResolveRowId_(sheet, id, prefix) {
  const parts = String(id || '').split(':');
  if (parts.length !== 3 || parts[0] !== prefix) throw new Error('Mã dòng không hợp lệ. Hãy tải lại dữ liệu.');
  const row = Number(parts[1]);
  const maxLastRow = prefix === 'F' ? formDataEnd_() : logDataEnd_();
  const minRow = prefix === 'F' ? CONFIG.FORM_DATA_START : LOG.DATA_START;
  if (!Number.isInteger(row) || row < minRow || row > maxLastRow || row > sheet.getMaxRows()) {
    throw new Error('Dòng dữ liệu không còn hợp lệ. Hãy tải lại trang.');
  }
  const width = Math.min(prefix === 'F' ? Math.max(sheet.getLastColumn(), CONFIG.FORM_SOURCE_ID_COLUMN) : LOG.REQUEST_ID,
    sheet.getMaxColumns());
  const values = sheet.getRange(row, 1, 1, width).getDisplayValues()[0];
  if (managerRowId_(prefix, row, values) !== id) throw new Error('Dữ liệu đã thay đổi bởi người khác. Tải lại trước khi xử lý.');
  return { row: row, values: values };
}

function managerRowId_(prefix, row, values) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify((values || []).map(value => String(value == null ? '' : value))),
    Utilities.Charset.UTF_8
  );
  const signature = Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, '');
  return prefix + ':' + row + ':' + signature;
}

function apiUpdateProfile(payload) {
  return managerApi_(function(activeEmail) {
    const taskSs = SpreadsheetApp.openById(TASK_HUB.SPREADSHEET_ID);
    payload = payload || {};
    const actor = hubActor_(activeEmail, taskSs);
    if (payload.department !== undefined && hubNorm_(payload.department) !== hubNorm_(actor.user.department)) throw new Error('Phòng ban do ADMIN quản lý.');
    if (payload.avatarUrl !== undefined && (String(payload.avatarUrl).length > 45000 || (payload.avatarUrl && !/^data:image\/(?:png|jpeg|webp);base64,/.test(payload.avatarUrl)))) throw new Error('Ảnh đại diện không hợp lệ hoặc quá lớn.');
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      let sheet = taskSs.getSheetByName(TASK_HUB.USER_SHEET) || taskSs.getSheetByName('USERS');
      if (!sheet) throw new Error('Không tìm thấy sheet USERS.');
      
      const data = sheet.getDataRange().getDisplayValues();
      const headers = data[0];
      const emailCol = headers.findIndex(h => ['email', 'emailaddress', 'địachỉemail', 'tàikhoản'].includes(normalize_(h).replace(/\s+/g, '')));
      const nameCol = headers.findIndex(h => ['họtên', 'tên', 'họvàtên', 'name', 'họvàtênngườimượn', 'ngườiđăngký'].includes(normalize_(h).replace(/\s+/g, '')));
      const deptCol = headers.findIndex(h => ['phòngban', 'bộphận', 'department', 'team'].includes(normalize_(h).replace(/\s+/g, '')));
      const titleCol = headers.findIndex(h => ['chứcvụ', 'chứcdanh', 'jobtitle', 'title', 'position'].includes(normalize_(h).replace(/\s+/g, '')));
      const phoneCol = headers.findIndex(h => ['sđt', 'sốđiệnthoại', 'phone'].includes(normalize_(h).replace(/\s+/g, '')));
      let avatarCol = headers.findIndex(h => ['avatar', 'hìnhảnh', 'ảnhđạidiện'].includes(normalize_(h).replace(/\s+/g, '')));
      
      if (emailCol === -1) throw new Error('Không tìm thấy cột Email trong sheet USERS.');
      
      if (avatarCol === -1 && payload.avatarUrl !== undefined) {
         avatarCol = headers.length;
         sheet.getRange(1, avatarCol + 1).setValue('Avatar');
      }
      
      let found = false;
      const targetEmail = activeEmail; 
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][emailCol]).toLowerCase().trim() === targetEmail) {
          if (nameCol !== -1 && payload.name !== undefined) sheet.getRange(i + 1, nameCol + 1).setValue(String(payload.name).trim());
          if (deptCol !== -1 && payload.department !== undefined) sheet.getRange(i + 1, deptCol + 1).setValue(String(payload.department).trim());
          if (titleCol !== -1 && payload.jobTitle !== undefined) sheet.getRange(i + 1, titleCol + 1).setValue(String(payload.jobTitle).trim());
          if (phoneCol !== -1 && payload.phone !== undefined) sheet.getRange(i + 1, phoneCol + 1).setValue(String(payload.phone).trim());
          if (avatarCol !== -1 && payload.avatarUrl !== undefined) sheet.getRange(i + 1, avatarCol + 1).setValue(payload.avatarUrl);
          found = true;
          break;
        }
      }
      
      if (!found) throw new Error('Không tìm thấy hồ sơ của bạn trong hệ thống.');
      SpreadsheetApp.flush();
      return { success: true };
    } finally {
      lock.releaseLock();
    }
  });
}

function apiUpdateUserRole(payload) {
  return managerApi_(function(activeEmail) {
    const taskSs = SpreadsheetApp.openById(TASK_HUB.SPREADSHEET_ID);
    
    const actor = hubActor_(activeEmail, taskSs);
    if (actor.role !== 'admin') throw new Error('Chỉ ADMIN được thay đổi quyền tài khoản.');
    if (!payload || !payload.email || !payload.role) throw new Error('Thiếu email hoặc role.');
    if (!['admin','leader','lead','manager','nhan vien','staff','giam doc','director','ceo'].includes(hubNorm_(payload.role))) throw new Error('Vai trò không hợp lệ.');
    managerUniqueUserByEmail_(managerReadUsers_(taskSs), payload.email);
    
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      let sheet = taskSs.getSheetByName(TASK_HUB.USER_SHEET) || taskSs.getSheetByName('USERS');
      if (!sheet) throw new Error('Không tìm thấy sheet USERS.');
      
      const data = sheet.getDataRange().getDisplayValues();
      const headers = data[0];
      const emailCol = headers.findIndex(h => ['email', 'emailaddress', 'địachỉemail', 'tàikhoản'].includes(normalize_(h).replace(/\s+/g, '')));
      const roleCol = headers.findIndex(h => ['vaitrò', 'role', 'phânquyền', 'quyền'].includes(normalize_(h).replace(/\s+/g, '')));
      
      if (emailCol === -1 || roleCol === -1) throw new Error('Không tìm thấy cột Email hoặc Vai trò.');
      
      let found = false;
      const targetEmail = String(payload.email).toLowerCase().trim();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][emailCol]).toLowerCase().trim() === targetEmail) {
          sheet.getRange(i + 1, roleCol + 1).setValue(payload.role);
          found = true;
          break;
        }
      }
      
      if (!found) throw new Error('Không tìm thấy email: ' + payload.email);
      SpreadsheetApp.flush();
      return { success: true };
    } finally {
      lock.releaseLock();
    }
  });
}

function managerReadUsers_(taskSs) {
  const sheet = taskSs.getSheetByName(TASK_HUB.USER_SHEET) || taskSs.getSheetByName('USERS');
  if (!sheet) return [];
  const end = Math.min(sheet.getLastRow(), 500);
  if (end < 2) return [];
  const width = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, width).getDisplayValues()[0];
  const rows = sheet.getRange(2, 1, end - 1, width).getDisplayValues();
  
  return rows.map((row, index) => {
    const email = managerValueByHeader_(headers, row, ['Email', 'Email Address', 'Địa chỉ Email', 'Tài khoản']);
    if (!email || !isEmail_(email)) return null;
    return {
      row: index + 2,
      email: email.toLowerCase().trim(),
      name: managerValueByHeader_(headers, row, ['Họ tên', 'Tên', 'Họ và tên', 'Name', 'Họ Và Tên']),
      role: managerValueByHeader_(headers, row, ['Vai trò', 'Role', 'Phân quyền', 'Quyền']),
      department: managerValueByHeader_(headers, row, ['Phòng ban', 'Bộ phận', 'Department', 'Team']),
      jobTitle: managerValueByHeader_(headers, row, ['Chức vụ', 'Chức danh', 'Job Title', 'Title', 'Position']),
      pic: managerValueByHeader_(headers, row, ['PIC', 'Nickname']),
      phone: managerValueByHeader_(headers, row, ['SĐT', 'Số điện thoại', 'Phone']),
      employeeId: managerValueByHeader_(headers, row, ['Mã nhân viên', 'Employee ID', 'Mã NV']),
      active: !['false','0','không','khong','inactive','nghỉ việc','nghi viec','ngưng hoạt động'].includes(String(managerValueByHeader_(headers, row, ['Kích hoạt','Trạng thái','Active','Hoạt động'])).trim().toLowerCase()),
      receiveEmail: managerValueByHeader_(headers, row, ['Nhận thông báo', 'Email Notification', 'Nhận Email']) === 'Có',
      note: managerValueByHeader_(headers, row, ['Ghi chú', 'Note']),
      avatarUrl: managerValueByHeader_(headers, row, ['Avatar', 'Hình ảnh', 'Ảnh đại diện'])
    };
  }).filter(Boolean);
}

function managerUniqueUserByEmail_(users, email) {
  const normalized = String(email || '').trim().toLowerCase();
  const matches = users.filter(user => String(user.email || '').trim().toLowerCase() === normalized);
  if (matches.length > 1) throw new Error('Email ' + normalized + ' xuất hiện nhiều lần trong sheet USERS. Cần sửa email trùng trước khi hiển thị task để tránh nhầm phòng ban.');
  return matches[0] || null;
}

/** Keep task, activity and asset history inside the viewer's department. */
function managerScopeDashboard_(user, users, taskData, requests, logs) {
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').trim().toLowerCase();
  const deptKey = value => { const key = norm(value); return ['desgin', 'design', 'design team'].indexOf(key) !== -1 ? 'design' : key; };
  const inDept = (value, department) => Boolean(department) && String(value || '').split(/[,;\n]/).some(part => deptKey(part) === deptKey(department));
  const role = norm(user.role);
  if (['admin', 'giam doc', 'director', 'ceo'].indexOf(role) !== -1) {
    return {users:users, tasks:taskData.tasks, activity:taskData.activity, requests:requests, logs:logs};
  }
  const dept = norm(user.department);
  const assetLead = deptKey(dept) === 'design' && (/(^|\s)(lead|leader|manager)(\s|$)/.test(role) || role.indexOf('quan ly') !== -1 || role.indexOf('truong phong') !== -1);
  const allTasks = taskData.tasks || [];
  const tasks = allTasks.filter(task => inDept(task.department, dept));
  const members = users.filter(member => inDept(member.department, dept));
  const idCounts = {};
  allTasks.forEach(task => { const id = String(task.id || '').trim(); if (id) idCounts[id] = (idCounts[id] || 0) + 1; });
  const visibleIds = new Set(tasks.map(task => String(task.id || '').trim()).filter(id => id && idCounts[id] === 1));
  const activity = (taskData.activity || []).filter(event => visibleIds.has(String(event.id || '').trim()));
  if (taskData.meta && taskData.meta.options) {
    const options = taskData.meta.options;
    const memberPics = new Set(members.map(member => norm(member.pic)).filter(Boolean));
    if (Array.isArray(options.pics)) options.pics = options.pics.filter(value => memberPics.has(norm(value)));
    if (Array.isArray(options.departments)) options.departments = options.departments.filter(value => inDept(value, dept));
    if (options.picEmails) options.picEmails = Object.fromEntries(Object.entries(options.picEmails).filter(([key]) => memberPics.has(norm(key))));
  }
  return {
    users:members, tasks:tasks, activity:activity,
    requests:assetLead ? requests : requests.filter(request => inDept(request.department, dept)),
    logs:assetLead ? logs : logs.filter(log => inDept(log.department, dept))
  };
}





function apiGetDashboardFresh() {
  // Dashboard responses depend on the signed-in user and must not use a shared cache key.
  return apiGetManagerDashboard();
}


// --- Merged from StaffTracking.js ---
/** Google-authenticated session and task snapshot for each staff member. */
function apiRecordStaffSession(payload) {
  return managerApi_(function(email) {
    const event = String(payload && payload.event || '').toUpperCase();
    if (['LOGIN', 'LOGOUT', 'HEARTBEAT'].indexOf(event) < 0) throw new Error('Sự kiện không hợp lệ.');
    const ss = SpreadsheetApp.openById(TASK_HUB.SPREADSHEET_ID);
    const user = managerUniqueUserByEmail_(managerReadUsers_(ss), email);
    if (!user || !user.name || user.active === false) throw new Error('Tài khoản chưa đăng ký hoặc đã ngưng hoạt động.');
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const headers = ['Email','Họ tên','PIC','Phòng ban','Vai trò','Đăng nhập gần nhất','Hoạt động gần nhất','Số lần đăng nhập','Task đang mở','Task hoàn tất','Task quá hạn'];
      let sheet = ss.getSheetByName('Staff Tracking');
      if (!sheet) { sheet = ss.insertSheet('Staff Tracking'); sheet.appendRow(headers); sheet.setFrozenRows(1); }
      const last = sheet.getLastRow();
      const emails = last > 1 ? sheet.getRange(2,1,last-1,1).getDisplayValues().map(r => String(r[0]).toLowerCase().trim()) : [];
      const found = emails.indexOf(email);
      const row = found >= 0 ? found + 2 : last + 1;
      const old = found >= 0 ? sheet.getRange(row,1,1,headers.length).getValues()[0] : new Array(headers.length).fill('');
      const now = new Date();
      const metrics = staffTrackingTaskMetrics_(ss,user.pic,user.department,now);
      const values = [email,user.name,user.pic||'',user.department||'',user.role||'',event==='LOGIN'?now:old[5],now,Number(old[7]||0)+(event==='LOGIN'?1:0),metrics.open,metrics.done,metrics.overdue];
      sheet.getRange(row,1,1,headers.length).setValues([values]);
      if (event !== 'HEARTBEAT') {
        let log = ss.getSheetByName('Staff Activity');
        if (!log) { log = ss.insertSheet('Staff Activity'); log.appendRow(['Thời gian','Email','Họ tên','PIC','Sự kiện']); log.setFrozenRows(1); }
        log.appendRow([now,email,user.name,user.pic||'',event]);
      }
      return {event:event,loggedAt:now.toISOString()};
    } finally { lock.releaseLock(); }
  });
}

function staffTrackingTaskMetrics_(ss,pic,department,now) {
  const result = {open:0,done:0,overdue:0};
  if (!pic || !department) return result;
  const sheet = ss.getSheetByName(TASK_HUB.SHEET_NAME);
  if (!sheet || sheet.getLastRow() < TASK_HUB.DATA_START) return result;
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0].map(staffTrackingNorm_);
  const picCol = headers.findIndex(h => h.includes('pic') || h.includes('phu trach') || h.includes('nguoi lam'));
  const deptCol = headers.findIndex(h => h.includes('phong ban') || h.includes('dept'));
  const statusCol = headers.findIndex(h => h.includes('status') || h.includes('trang thai'));
  const dueCol = headers.findIndex(h => h.includes('deadline') || h.includes('han chot'));
  if (picCol < 0 || deptCol < 0 || statusCol < 0) return result;
  const rows = sheet.getRange(TASK_HUB.DATA_START,1,Math.min(sheet.getLastRow()-TASK_HUB.DATA_START+1,TASK_HUB.MAX_ROWS),sheet.getLastColumn()).getDisplayValues();
  const current = staffTrackingNorm_(pic);
  const today = new Date(now.getFullYear(),now.getMonth(),now.getDate());
  for (const cells of rows) {
    if (!staffTrackingDepartmentMatch_(cells[deptCol],department)) continue;
    if (!String(cells[picCol]||'').split(/[,;\n]/).some(value => staffTrackingNorm_(value)===current)) continue;
    const status = staffTrackingNorm_(cells[statusCol]);
    if (['done','completed','hoan tat'].includes(status)) { result.done++; continue; }
    if (['cancelled','canceled','da huy','da xoa'].includes(status)) continue;
    result.open++;
    const due = dueCol < 0 ? null : staffTrackingDate_(cells[dueCol]);
    if (due && due < today) result.overdue++;
  }
  return result;
}
function staffTrackingDepartmentMatch_(value,department) {
  const key = text => { const normalized=staffTrackingNorm_(text); return ['desgin','design','design team'].includes(normalized)?'design':normalized; };
  return Boolean(department) && String(value||'').split(/[,;\n]/).some(part=>key(part)===key(department));
}
function staffTrackingNorm_(value) {
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').trim().toLowerCase();
}
function staffTrackingDate_(value) {
  const parts = String(value||'').match(/^(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})$/);
  if (!parts) return null;
  const iso = parts[1].length === 4;
  const date = new Date(Number(iso?parts[1]:parts[3]),Number(parts[2])-1,Number(iso?parts[3]:parts[1]));
  return Number.isNaN(date.getTime()) ? null : date;
}


// --- Merged from TaskWorkspace.js ---
/** Change only a task's status; row + ID and previous status protect duplicate IDs and concurrent edits. */
function apiMoveTask(payload) {
  return managerApi_(function(email) {
    if (!payload || !payload.id || !Number.isInteger(Number(payload.row))) throw new Error('Thiếu thông tin công việc.');
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const ss = SpreadsheetApp.openById(TASK_HUB.SPREADSHEET_ID);
      const sheet = ss.getSheetByName(TASK_HUB.SHEET_NAME);
      const row = Number(payload.row);
      if (!sheet || row < TASK_HUB.DATA_START || row > sheet.getLastRow()) throw new Error('Công việc đã thay đổi. Hãy đồng bộ lại.');
      const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0].map(h=>String(h).trim().toLowerCase());
      const idCol = headers.findIndex(h=>h.includes('id'));
      const statusCol = headers.findIndex(h=>h.includes('status')||h.includes('trạng thái'));
      const picCol = headers.findIndex(h=>h.includes('pic')||h.includes('phụ trách')||h.includes('người làm'));
      const deptCol = headers.findIndex(h=>h.includes('phòng ban')||h.includes('dept'));
      if(idCol<0 || statusCol<0 || picCol<0 || deptCol<0) throw new Error('Không tìm thấy cột ID, phòng ban, trạng thái hoặc PIC.');
      const values=sheet.getRange(row,1,1,sheet.getLastColumn()).getDisplayValues()[0];
      if(String(values[idCol])!==String(payload.id)) throw new Error('Dòng công việc đã di chuyển. Hãy đồng bộ lại.');
      const users=managerReadUsers_(ss);
      const user=managerUniqueUserByEmail_(users,email);
      if (!user || user.active === false) throw new Error('Tài khoản đã ngưng hoạt động.');
      const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').trim().toLowerCase();
      const managers=[CONFIG.MANAGER_EMAIL].concat(String(PropertiesService.getScriptProperties().getProperty('MANAGER_ALLOWLIST')||'').split(/[;,\n]/)).map(v=>String(v||'').trim().toLowerCase());
      const role=norm(user&&user.role);
      const global=['admin','giam doc','director','ceo'].includes(role);
      const canManage=managers.includes(email)||global||/(^|\s)(lead|leader|manager)(\s|$)/.test(role)||role.includes('quan ly')||role.includes('truong phong');
      const deptKey=v=>['desgin','design','design team'].includes(norm(v))?'design':norm(v);
      const inDepartment=Boolean(user&&user.department)&&String(values[deptCol]||'').split(/[,;\n]/).some(part=>deptKey(part)===deptKey(user.department));
      if(!global&&!inDepartment) throw new Error('Task này thuộc phòng ban khác.');
      const assigned=user&&user.pic&&String(values[picCol]).split(/[,;\n]/).some(p=>norm(p)===norm(user.pic));
      if(!canManage&&!assigned) throw new Error('Chỉ quản lý hoặc PIC của công việc được đổi trạng thái.');
      const allowed=managerReadTaskOptions_(ss).statuses.concat(['Pending','On going','Feedback','Done']);
      if(!allowed.includes(payload.status)) throw new Error('Trạng thái không hợp lệ.');
      if(String(values[statusCol])!==String(payload.expectedStatus||'')) throw new Error('Trạng thái đã được người khác cập nhật. Hãy đồng bộ lại.');
      sheet.getRange(row,statusCol+1).setValue(payload.status);
      SpreadsheetApp.flush();
      // The cached bootstrap must not restore the previous status on a new page load.
      try { CacheService.getScriptCache().remove('managerDashboardData_chunks'); } catch(error) { console.warn('Task cache invalidation failed: '+error); }
      return {id:payload.id,row:row,status:payload.status};
    } finally { lock.releaseLock(); }
  });
}
