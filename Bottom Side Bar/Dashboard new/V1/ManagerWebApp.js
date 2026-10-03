/**
 * Manager-only Apps Script Web App API for ManagerApp.html.
 * Execute the web app as the accessing user; do not deploy as the owner.
 */

function doGet(e) {
  try {
    const activeEmail = String(Session.getActiveUser().getEmail() || '').replace(/[\u200B-\u200D\uFEFF\s]/g, '').toLowerCase();
    assertManagerWebAccess_(activeEmail);
    const template = HtmlService.createTemplateFromFile('ManagerApp');
    template.ACTIVE_EMAIL = activeEmail;
    return template.evaluate()
      .setTitle('K Coffee · Management Asset')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
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
    const ss = managementSpreadsheet_();
    const form = requireManagerSheet_(ss, CONFIG.FORM_SHEET);
    const log = requireManagerSheet_(ss, CONFIG.LOG_SHEET);
    const assetsSheet = requireManagerSheet_(ss, CONFIG.ASSET_SHEET);
    const requests = managerReadRequests_(form);
    const logs = managerReadLogs_(log, requests);
    const assets = managerReadAssets_(assetsSheet);
    
    let taskData = { tasks: [], activity: [], meta: { ok: false, error: 'Chưa kết nối Task' } };
    let users = [];
    try {
      taskData = managerReadTaskDashboard_();
      const taskSs = SpreadsheetApp.openById(TASK_HUB.SPREADSHEET_ID);
      users = managerReadUsers_(taskSs);
    } catch (e) {
      taskData.meta.error = String(e);
    }
    
    const baseData = {
      requests: requests,
      logs: logs,
      assets: assets,
      tasks: taskData.tasks,
      taskActivity: taskData.activity,
      taskMeta: taskData.meta,
      columns: managerFormColumnMap_(form),
      users: users,
      taskSheetUrl: TASK_HUB.URL,
      assetSheetUrl: ss.getUrl()
    };

    let currentUser = baseData.users.find(u => u.email === activeEmail);
    if (!currentUser) {
      currentUser = { email: activeEmail, name: '', role: 'Nhân viên', notRegistered: true };
    }
    
    const r = (String(currentUser.role) + ' ' + String(currentUser.jobTitle)).toLowerCase();
    const isManagerRole = r.indexOf('admin') !== -1 || r.indexOf('manager') !== -1 || r.indexOf('quản lý') !== -1 || r.indexOf('trưởng phòng') !== -1 || r.indexOf('lead') !== -1;
    const allowlist = [CONFIG.MANAGER_EMAIL]
      .concat(String(PropertiesService.getScriptProperties().getProperty('MANAGER_ALLOWLIST') || '').split(/[;,\n]/))
      .map(email => String(email || '').trim().toLowerCase())
      .filter(isEmail_);
      
    const canManage = isManagerRole || allowlist.indexOf(activeEmail) !== -1;

    return {
      requests: baseData.requests,
      logs: baseData.logs,
      assets: baseData.assets,
      tasks: baseData.tasks,
      taskActivity: baseData.taskActivity,
      taskMeta: baseData.taskMeta,
      columns: baseData.columns,
      currentUser: currentUser,
      users: baseData.users,
      access: { canManage: canManage },
      meta: {
        taskSheetUrl: baseData.taskSheetUrl,
        assetSheetUrl: baseData.assetSheetUrl
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
  URL: 'https://docs.google.com/spreadsheets/d/1PK6RkpgYfGq2V3SJpABXFtoF6Jq2V7bHA5JkBIcWQXU/edit?gid=1695489312#gid=1695489312'
});

const TASK_GATEWAY_CLIENT = Object.freeze({
  URL_PROPERTY: 'TASK_GATEWAY_URL',
  SECRET_PROPERTY: 'TASK_GATEWAY_SECRET'
});

/**
 * Read-only Task integration. A Task-source issue must never prevent Asset
 * reviews or returns from loading, so the error is returned as module state.
 */
function managerReadTaskDashboard_() {
  const fallback = { tasks: [], activity: [], meta: { ok: false, url: TASK_HUB.URL, error: '', options: managerEmptyTaskOptions_(), activityAvailable: false } };
  try {
    const taskSs = SpreadsheetApp.openById(TASK_HUB.SPREADSHEET_ID);
    const sheet = taskSs.getSheetByName(TASK_HUB.SHEET_NAME);
    if (!sheet) throw new Error('Không tìm thấy sheet Task Master.');
    const options = managerReadTaskOptions_(taskSs);
    const lastRow = Math.min(sheet.getLastRow(), TASK_HUB.DATA_START + TASK_HUB.MAX_ROWS - 1);
    if (lastRow < TASK_HUB.DATA_START) {
      return { tasks: [], activity: managerReadTaskActivity_(taskSs), meta: { ok: true, url: TASK_HUB.URL, sheetName: TASK_HUB.SHEET_NAME, options: options, activityAvailable: Boolean(taskSs.getSheetByName(TASK_HUB.ACTIVITY_SHEET)) } };
    }
    const rows = sheet.getRange(TASK_HUB.DATA_START, 1,
      lastRow - TASK_HUB.DATA_START + 1, TASK_HUB.WIDTH).getDisplayValues();
    const tasks = rows.map((row, offset) => {
      if (!row[0] && !row[4]) return null;
      return {
        row: TASK_HUB.DATA_START + offset,
        id: row[0] || '', department: row[1] || '', platform: row[2] || '',
        project: row[3] || '', task: row[4] || '', priority: row[5] || '',
        brief: row[6] || '', deliverable: row[7] || '', pic: row[8] || '',
        startDate: row[9] || '', deadline: row[10] || '', airDate: row[11] || '',
        status: row[12] || '', note: row[13] || '', sourceLink: row[14] || ''
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

function managerReadTaskOptions_(taskSs) {
  const setup = taskSs.getSheetByName(TASK_HUB.SETUP_SHEET);
  if (!setup) return managerEmptyTaskOptions_();
  const end = Math.min(setup.getLastRow(), 502);
  if (end < 2) return managerEmptyTaskOptions_();
  // List Setup has 5 cols: Status | Priority | Platform | Department | PIC
  const rows = setup.getRange(2, 1, end - 1, 5).getDisplayValues();
  const unique = index => rows.map(row => String(row[index] || '').trim()).filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index);

  // Build picEmails map from the User sheet (PIC name → email)
  const picEmails = {};
  try {
    const userSheet = taskSs.getSheetByName(TASK_HUB.USER_SHEET) || taskSs.getSheetByName('USERS');
    if (userSheet && userSheet.getLastRow() >= 2) {
      const uWidth = Math.min(20, userSheet.getLastColumn());
      const uHeaders = userSheet.getRange(1, 1, 1, uWidth).getDisplayValues()[0];
      const uRows = userSheet.getRange(2, 1, Math.min(userSheet.getLastRow() - 1, 500), uWidth).getDisplayValues();
      uRows.forEach(row => {
        const email = managerValueByKeywords_(uHeaders, row, ['email', 'mail', 'tài khoản']);
        const pic   = managerValueByKeywords_(uHeaders, row, ['pic', 'nickname', 'mã pic']);
        if (isEmail_(email) && pic) picEmails[pic.trim()] = email.toLowerCase().trim();
      });
    }
  } catch (e) { /* non-fatal */ }

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
  return managerApi_(function () {
    managerCacheClear_(CacheService.getScriptCache(), 'dashboard_base');
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      if (!payload || !payload.id) throw new Error('Missing task ID.');
      const taskSs = SpreadsheetApp.openById(TASK_HUB.SPREADSHEET_ID);
      const sheet  = taskSs.getSheetByName(TASK_HUB.SHEET_NAME);
      if (!sheet) throw new Error('Không tìm thấy sheet Task Master.');
      
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(payload.id)) {
          rowIndex = i + 1;
          break;
        }
      }
      if (rowIndex === -1) throw new Error('Không tìm thấy Task ' + payload.id);
      
      const cols = {
         'department': 2, 'platform': 3, 'project': 4, 'task': 5,
         'priority': 6, 'brief': 7, 'deliverable': 8, 'pic': 9,
         'startDate': 10, 'deadline': 11, 'airDate': 12, 'status': 13,
         'note': 14, 'sourceLink': 15
      };
      
      Object.keys(cols).forEach(k => {
         if (payload[k] !== undefined) {
            let val = payload[k];
            if (k === 'startDate' || k === 'deadline' || k === 'airDate') {
               if (val) {
                 const d = new Date(val);
                 val = isNaN(d.getTime()) ? val : d;
               } else {
                 val = '';
               }
            }
            sheet.getRange(rowIndex, cols[k]).setValue(val);
         }
      });
      
      sheet.getRange(rowIndex, 10, 1, 3).setNumberFormat('dd/mm/yyyy');
      SpreadsheetApp.flush();
      
      try {
        const actSheet = taskSs.getSheetByName(TASK_HUB.ACTIVITY_SHEET);
        if (actSheet) {
          actSheet.appendRow([
            new Date(), 'Cập nhật Task', payload.id, payload.project || '', payload.task || '',
            payload.pic || '', payload.deadline ? Utilities.formatDate(new Date(payload.deadline), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy') : '',
            '', String(Session.getActiveUser().getEmail() || 'Manager')
          ]);
        }
      } catch (e) { }
      
      return { updated: true, id: payload.id, row: rowIndex };
    } finally {
      lock.releaseLock();
    }
  });
}
function apiCreateTask(payload) {
  return managerApi_(function () {
    managerCacheClear_(CacheService.getScriptCache(), 'dashboard_base');
    const props = PropertiesService.getScriptProperties();

    const task = managerValidateNewTask_(payload);
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const taskSs = SpreadsheetApp.openById(TASK_HUB.SPREADSHEET_ID);
      const sheet  = taskSs.getSheetByName(TASK_HUB.SHEET_NAME);
      if (!sheet) throw new Error('Không tìm thấy sheet Task Master.');
      const options = managerReadTaskOptions_(taskSs);
      managerValidateTaskOptions_(task, options);

      // Idempotency: skip duplicate submissions
      const clientRequestId = String(payload && payload.clientRequestId || '').trim();
      const idempotencyKey   = 'TASK_CREATE|' + clientRequestId;
      if (clientRequestId && props.getProperty(idempotencyKey)) {
        const cached = JSON.parse(props.getProperty(idempotencyKey));
        return { created: false, id: cached.id, row: cached.row, taskUrl: TASK_HUB.URL, warning: 'Task đã tồn tại (idempotent retry).' };
      }

      const row = managerFirstTaskBlankRow_(sheet);
      const id  = managerNextTaskId_(sheet);
      sheet.getRange(row, 1, 1, TASK_HUB.WIDTH).setValues([[
        id, task.department, task.platform, task.project, task.task,
        task.priority, task.brief, task.deliverable, task.pic,
        task.startDate, task.deadline, task.airDate, task.status,
        task.note, task.sourceLink
      ]]);
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

      const warning = managerSendTaskAssignmentMail_({ id: id, row: row, task: task });

      if (clientRequestId) {
        try { props.setProperty(idempotencyKey, JSON.stringify({ id: id, row: row })); } catch(e) {}
      }
      return { created: true, id: id, row: row, taskUrl: TASK_HUB.URL, warning: warning };
    } finally {
      lock.releaseLock();
    }
  });
}


function managerTaskGatewayHmac_(raw, secret) {
  return Utilities.computeHmacSha256Signature(raw, secret)
    .map(byte => ('0' + (byte & 0xff).toString(16)).slice(-2)).join('');
}

function apiSubmitBorrowRequest(payload) {
  return managerApi_(function (activeEmail) {
    managerCacheClear_(CacheService.getScriptCache(), 'dashboard_base');
    const ss = managementSpreadsheet_();
    const sheet = ss.getSheetByName(CONFIG.FORM_SHEET || 'FORM ĐĂNG KÝ');
    if (!sheet) throw new Error('Không tìm thấy sheet FORM ĐĂNG KÝ');
    
    ensureFormSchema_(sheet);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
    const row = new Array(headers.length).fill('');
    
    const populate = (aliases, value) => {
      if (value === undefined || value === null) return;
      const hStr = aliases.map(a => String(a).toLowerCase().trim());
      const colIdx = headers.findIndex(h => hStr.includes(String(h).toLowerCase().trim()));
      if (colIdx !== -1) row[colIdx] = value;
    };
    
    populate(['Dấu thời gian'], new Date());
    populate(['Email', 'Địa chỉ Email', 'Email Address'], payload.email);
    populate(['Họ và Tên Người Mượn', 'Người đăng ký'], payload.name);
    populate(['Phòng ban'], payload.department);
    populate(['Mã Thiết Bị', 'Tên Thiết Bị', 'Thiết bị'], payload.device);
    populate(['Số Lượng', 'Số lượng'], payload.qty);
    populate(['Lý do mượn', 'Mục đích'], payload.reason);
    populate(['Ngày Mượn', 'Ngày mượn', 'Từ ngày'], payload.from);
    populate(['Ngày Trả', 'Ngày trả', 'Đến ngày'], payload.to);
    populate(['Ghi chú'], payload.note);
    
    if (CONFIG.FORM_SOURCE_ID_COLUMN && CONFIG.FORM_SOURCE_ID_COLUMN <= row.length) {
       row[CONFIG.FORM_SOURCE_ID_COLUMN - 1] = 'API:' + Date.now();
    }
    
    sheet.appendRow(row);
    const newRowIndex = sheet.getLastRow();
    
    processNewRequest_(sheet, newRowIndex, 'API:' + Date.now());
    
    return { ok: true };
  });
}

function apiSaveBorrowReview(id, review) {
  return managerApi_(function () {
    managerCacheClear_(CacheService.getScriptCache(), 'dashboard_base');
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
  return managerApi_(function () {
    managerCacheClear_(CacheService.getScriptCache(), 'dashboard_base');
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
  return managerApi_(function () {
    managerCacheClear_(CacheService.getScriptCache(), 'dashboard_base');
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
    const activeEmail = String(Session.getActiveUser().getEmail() || '').replace(/[\u200B-\u200D\uFEFF\s]/g, '').toLowerCase();
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

/**
 * Lightweight check: only reads User sheet to verify registration.
 * Called FIRST on page load before the heavy dashboard data.
 */
function apiCheckUser() {
  return managerApi_(function (activeEmail) {
    const taskSs = SpreadsheetApp.openById(TASK_HUB.SPREADSHEET_ID);
    const users = managerReadUsers_(taskSs);
    const user = users.find(function(u) { return u.email === activeEmail; });
    if (user) {
      return { registered: true, user: user };
    }
    return { registered: false, email: activeEmail };
  });
}

function apiRegisterUser(payload) {
  return managerApi_(function (activeEmail) {
    managerCacheClear_(CacheService.getScriptCache(), 'dashboard_base');
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const taskSs = SpreadsheetApp.openById(TASK_HUB.SPREADSHEET_ID);
      let sheet = taskSs.getSheetByName(TASK_HUB.USER_SHEET) || taskSs.getSheetByName('USERS');
            const defaultHeaders = ['Mã Nhân viên', 'Email', 'Họ tên', 'PIC', 'Kích hoạt', 'Nhận email', 'Ghi chú', 'Phòng ban', 'Chức vụ', 'Số điện thoại', 'Avatar', 'Vai Trò'];
      if (!sheet) {
        sheet = taskSs.insertSheet(TASK_HUB.USER_SHEET);
        sheet.appendRow(defaultHeaders);
        sheet.getRange(1, 1, 1, defaultHeaders.length).setFontWeight('bold').setBackground('#f3f4f6');
        sheet.setFrozenRows(1);
      } else if (sheet.getLastRow() === 0 || sheet.getDataRange().getDisplayValues().join('').trim() === '') {
        sheet.clear();
        sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders])
             .setFontWeight('bold')
             .setBackground('#f3f4f6');
        sheet.setFrozenRows(1);
      }
      
      // Check if already registered
      const users = managerReadUsers_(taskSs);
      if (users.find(u => u.email === activeEmail)) return { registered: true };
      
      const width = Math.min(20, Math.max(1, sheet.getLastColumn()));
      let headerRowIdx = 1;
      const topRows = sheet.getRange(1, 1, Math.min(5, Math.max(1, sheet.getLastRow())), width).getDisplayValues();
      for (let i = 0; i < topRows.length; i++) {
         const rowStr = topRows[i].join(' ').toLowerCase();
         if (rowStr.includes('email') || rowStr.includes('họ') || rowStr.includes('tên') || rowStr.includes('pic')) {
             headerRowIdx = i + 1;
             break;
         }
      }
      const headers = sheet.getRange(headerRowIdx, 1, 1, width).getDisplayValues()[0];
      const newRow = new Array(width).fill('');
      
      // Auto-generate Mã Nhân viên (NV001, NV002, ...)
      const empIdCol = managerFindColIndex_(headers, ['mã nhân viên', 'mã nv', 'employee']);
      let nextEmpId = 'NV001';
      if (empIdCol !== -1) {
        const lastDataRow = sheet.getLastRow();
        let maxNum = 0;
        if (lastDataRow > headerRowIdx) {
          const empIds = sheet.getRange(headerRowIdx + 1, empIdCol + 1, lastDataRow - headerRowIdx, 1).getDisplayValues();
          // Backfill missing NV codes for existing rows
          empIds.forEach(function(r, idx) {
            const val = String(r[0]).trim();
            const m = val.match(/^NV(\d+)$/i);
            if (m) { var n = parseInt(m[1], 10); if (n > maxNum) maxNum = n; }
          });
          // Fill empty cells
          empIds.forEach(function(r, idx) {
            if (!String(r[0]).trim()) {
              maxNum++;
              var code = 'NV' + String(maxNum).padStart(3, '0');
              sheet.getRange(headerRowIdx + 1 + idx, empIdCol + 1).setValue(code);
            }
          });
        }
        nextEmpId = 'NV' + String(maxNum + 1).padStart(3, '0');
        newRow[empIdCol] = nextEmpId;
      }
      
      const setField = (keywords, value) => {
         const idx = managerFindColIndex_(headers, keywords);
         if (idx !== -1) newRow[idx] = value;
      };
      setField(['email', 'mail', 'tài khoản'], activeEmail);
      setField(['họ', 'tên', 'name'], String(payload.name || '').trim());
      setField(['vai trò', 'role', 'phân quyền', 'quyền'], 'Nhân viên');
      setField(['phòng', 'ban', 'bộ phận', 'department', 'team'], String(payload.department || '').trim());
      setField(['pic', 'nickname', 'mã pic'], String(payload.pic || '').trim().toUpperCase());
      setField(['trạng thái', 'active', 'hoạt động', 'kích hoạt'], 'Đang làm việc');
      setField(['thông báo', 'notification', 'nhận email'], 'Có');
      setField(['chức vụ', 'chức danh', 'title', 'position'], String(payload.jobTitle || '').trim());
      setField(['sđt', 'điện thoại', 'phone', 'số điện thoại'], String(payload.phone || '').trim());
      
      const dataToInsert = newRow.length > 0 && newRow.some(Boolean) ? newRow : [
        nextEmpId, activeEmail, String(payload.name || '').trim(), String(payload.pic || '').trim().toUpperCase(), 'Đang làm việc', 'Có', '', String(payload.department || '').trim(), String(payload.jobTitle || '').trim(), String(payload.phone || '').trim(), '', 'Nhân viên'
      ];
      
      // Thêm nhân viên mới vào cuối sheet (dòng dưới cùng)
      const insertRow = sheet.getLastRow() + 1;
      sheet.getRange(insertRow, 1, 1, dataToInsert.length).setValues([dataToInsert]);
      SpreadsheetApp.flush();
      
      // Gửi email chào mừng báo đăng ký thành công
      try {
        const subject = '[Management Hub] Đăng ký thành công';
        const staffName = escapeHtml_(String(payload.name || '').trim());
        const staffPic = escapeHtml_(String(payload.pic || '').trim().toUpperCase());
        const staffDept = escapeHtml_(String(payload.department || '').trim());
        const staffJob = escapeHtml_(String(payload.jobTitle || '').trim());
        const staffPhone = escapeHtml_(String(payload.phone || '').trim());
        const staffEmail = escapeHtml_(activeEmail);
        const staffEmpId = escapeHtml_(nextEmpId);
        
        const infoRow = function(label, val) {
          if (!val) return '';
          return '<tr><td style="padding:6px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f0f0f0">' + label + '</td><td style="padding:6px 12px;font-size:13px;color:#111827;font-weight:600;border-bottom:1px solid #f0f0f0">' + val + '</td></tr>';
        };
        
        const html = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:28px 24px;color:#111827;background:#ffffff;border:1px solid #b9cceb;border-radius:12px;">' +
          '<div style="margin:0 0 26px"><img src="https://kcoffee.vn/images/logos/9/Logo_2kfk-ii.png" alt="K COFFEE" style="height:48px;width:auto;display:block"></div>' +
          '<h1 style="font-size:24px;line-height:1.2;color:#1f3b76;margin:0 0 20px;font-weight:800">Welcome to Management Hub!</h1>' +
          '<p style="font-size:14px;color:#151515;margin-bottom:16px;">Chào <b>' + staffName + '</b>, tài khoản của bạn đã được tạo thành công trên hệ thống.</p>' +
          '<table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">' +
          '<tr><td colspan="2" style="padding:10px 12px;font-size:14px;font-weight:700;color:#1f3b76;background:#f0f4ff;border-bottom:1px solid #e5e7eb">Thông tin tài khoản</td></tr>' +
          infoRow('Mã Nhân viên', staffEmpId) +
          infoRow('Email', staffEmail) +
          infoRow('Họ và tên', staffName) +
          infoRow('Mã PIC', staffPic) +
          infoRow('Phòng ban', staffDept) +
          infoRow('Chức vụ', staffJob) +
          infoRow('Số điện thoại', staffPhone) +
          infoRow('Vai trò', 'Nhân viên') +
          '</table>' +
          '<p style="font-size:13px;color:#6b7280;line-height:1.5;margin-top:16px;">Từ bây giờ, hệ thống sẽ tự động gửi email thông báo về đây mỗi khi bạn được giao Task mới.</p>' +
          '</div>';
        MailApp.sendEmail({
          to: activeEmail,
          subject: subject,
          htmlBody: html,
          name: 'K Coffee · Management Hub'
        });
      } catch (e) { /* non-fatal */ }
      
      
      
      return { registered: true };
    } finally {
      lock.releaseLock();
    }
  });
}

function managerReadRequests_(form) {
  const end = Math.min(form.getLastRow(), formDataEnd_());
  if (end < CONFIG.FORM_DATA_START) return [];
  const width = Math.max(form.getLastColumn(), CONFIG.FORM_SOURCE_ID_COLUMN);
  const headers = form.getRange(1, 1, 1, width).getDisplayValues()[0];
  const rows = form.getRange(CONFIG.FORM_DATA_START, 1, end - CONFIG.FORM_DATA_START + 1, width).getDisplayValues();
  const setupCodes = managerBuildAssetMap_();
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
  const exact = (aliases) => managerValueByKeywords_(headers, values, aliases.map(a => normalize_(a)));
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
  const count = Math.max(0, Math.min(CONFIG.MAX_TRACKED_ROWS, sheet.getMaxRows() - firstRow + 1));
  if (!count) return [];
  const rows = sheet.getRange(firstRow, 1, count, 11).getDisplayValues();
  return rows.map(row => row[0] ? ({
    code: row[0], model: row[1], group: row[2], serial: row[3], location: row[4],
    status: row[5], borrower: row[6], department: row[7], dueDate: row[8],
    availability: row[9], condition: row[10]
  }) : null).filter(Boolean);
}

function managerBuildAssetMap_() {
  const ss = managementSpreadsheet_();
  const setup = requireManagerSheet_(ss, CONFIG.SETUP_SHEET);
  const firstRow = 5;
  const count = Math.max(0, Math.min(CONFIG.MAX_TRACKED_ROWS, setup.getMaxRows() - firstRow + 1));
  if (!count) return {};
  const rows = setup.getRange(firstRow, 1, count, 8).getDisplayValues();
  const result = {};
  rows.forEach(row => { if (row[0]) result[assetKey_(row[0])] = true; });
  return result;
}

function managerFindColIndex_(headers, keywords) {
  const normKeywords = keywords.map(normalize_);
  for (let i = 0; i < headers.length; i++) {
    const n = normalize_(headers[i]);
    if (normKeywords.some(k => n.includes(k))) return i;
  }
  return -1;
}

function managerValueByKeywords_(headers, values, keywords) {
  const idx = managerFindColIndex_(headers, keywords);
  return idx !== -1 ? (values[idx] || '') : '';
}


function managerValueContainingHeader_(headers, values, text) {
  const target = normalize_(text);
  for (let i = 0; i < headers.length; i++) {
    if (normalize_(headers[i]).indexOf(target) !== -1) return values[i] || '';
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
    managerCacheClear_(CacheService.getScriptCache(), 'dashboard_base');
    const taskSs = SpreadsheetApp.openById(TASK_HUB.SPREADSHEET_ID);
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      let sheet = taskSs.getSheetByName(TASK_HUB.USER_SHEET) || taskSs.getSheetByName('USERS');
      if (!sheet) throw new Error('Không tìm thấy sheet USERS.');
      
            const data = sheet.getDataRange().getDisplayValues();
      let headerRowIdx = 1;
      for (let i = 0; i < Math.min(5, data.length); i++) {
         const rowStr = data[i].join(' ').toLowerCase();
         if (rowStr.includes('email') || rowStr.includes('họ') || rowStr.includes('tên') || rowStr.includes('pic')) {
             headerRowIdx = i + 1;
             break;
         }
      }
      const headers = data[headerRowIdx - 1];
      const emailCol = managerFindColIndex_(headers, ['email', 'mail', 'tài khoản']);
      const nameCol = managerFindColIndex_(headers, ['họ', 'tên', 'name']);
      const deptCol = managerFindColIndex_(headers, ['phòng', 'ban', 'bộ phận', 'department', 'team']);
      const titleCol = managerFindColIndex_(headers, ['chức vụ', 'chức danh', 'title', 'position']);
      const phoneCol = managerFindColIndex_(headers, ['sđt', 'điện thoại', 'phone']);
      let avatarCol = managerFindColIndex_(headers, ['avatar', 'hình', 'ảnh']);
      
      if (emailCol === -1) throw new Error('Không tìm thấy cột Email trong sheet USERS.');
      
      if (avatarCol === -1 && payload.avatarUrl !== undefined) {
         avatarCol = headers.length;
         sheet.getRange(headerRowIdx, avatarCol + 1).setValue('Avatar');
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
    managerCacheClear_(CacheService.getScriptCache(), 'dashboard_base');
    const taskSs = SpreadsheetApp.openById(TASK_HUB.SPREADSHEET_ID);
    
    // Auth check
    const users = managerReadUsers_(taskSs);
    let currentUser = users.find(u => u.email === activeEmail);
    if (!currentUser) currentUser = { email: activeEmail, name: '', role: 'Nhân viên' };
    const r = (String(currentUser.role) + ' ' + String(currentUser.jobTitle)).toLowerCase();
    const isManagerRole = r.indexOf('admin') !== -1 || r.indexOf('manager') !== -1 || r.indexOf('quản lý') !== -1 || r.indexOf('trưởng phòng') !== -1 || r.indexOf('lead') !== -1;
    const allowlist = [CONFIG.MANAGER_EMAIL]
      .concat(String(PropertiesService.getScriptProperties().getProperty('MANAGER_ALLOWLIST') || '').split(/[;,\n]/))
      .map(email => String(email || '').trim().toLowerCase())
      .filter(isEmail_);
    const canManage = isManagerRole || allowlist.indexOf(activeEmail) !== -1;
    
    if (!canManage) throw new Error('Chỉ Manager mới có thể cấp quyền cho user khác.');
    if (!payload.email || !payload.role) throw new Error('Thiếu email hoặc role.');
    
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      let sheet = taskSs.getSheetByName(TASK_HUB.USER_SHEET) || taskSs.getSheetByName('USERS');
      if (!sheet) throw new Error('Không tìm thấy sheet USERS.');
      
      const data = sheet.getDataRange().getDisplayValues();
      const headers = data[0];
      const emailCol = managerFindColIndex_(headers, ['email', 'mail', 'tài khoản']);
      const roleCol = managerFindColIndex_(headers, ['vai trò', 'role', 'phân quyền', 'quyền']);
      
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
  const end = sheet.getLastRow();
  if (end < 2) return [];
  const width = sheet.getLastColumn();
  
  // Find header row by looking for 'email' or 'họ tên' in the first 5 rows
  let headerRowIdx = 1;
  const topRows = sheet.getRange(1, 1, Math.min(5, end), width).getDisplayValues();
  for (let i = 0; i < topRows.length; i++) {
     const rowStr = topRows[i].join(' ').toLowerCase();
     if (rowStr.includes('email') || rowStr.includes('họ') || rowStr.includes('tên') || rowStr.includes('pic')) {
         headerRowIdx = i + 1;
         break;
     }
  }
  
  const headers = sheet.getRange(headerRowIdx, 1, 1, width).getDisplayValues()[0];
  if (end <= headerRowIdx) return [];
  const rows = sheet.getRange(headerRowIdx + 1, 1, end - headerRowIdx, width).getDisplayValues();
  
  return rows.map(row => {
    const email = managerValueByKeywords_(headers, row, ['email', 'mail', 'tài khoản']);
    if (!email || !isEmail_(email)) return null;
    return {
      email: email.replace(/[\u200B-\u200D\uFEFF\s]/g, '').toLowerCase(),
      name: managerValueByKeywords_(headers, row, ['họ', 'tên', 'name']),
      role: managerValueByKeywords_(headers, row, ['vai trò', 'role', 'phân quyền', 'quyền']),
      department: managerValueByKeywords_(headers, row, ['phòng', 'ban', 'bộ phận', 'department', 'team']),
      jobTitle: managerValueByKeywords_(headers, row, ['chức vụ', 'chức danh', 'title', 'position']),
      pic: managerValueByKeywords_(headers, row, ['pic', 'nickname', 'mã pic', 'biệt danh']),
      phone: managerValueByKeywords_(headers, row, ['sđt', 'điện thoại', 'phone']),
      employeeId: managerValueByKeywords_(headers, row, ['mã nhân viên', 'employee', 'mã nv']),
      active: managerValueByKeywords_(headers, row, ['trạng thái', 'active', 'hoạt động', 'kích hoạt']) !== 'Nghỉ việc',
      receiveEmail: managerValueByKeywords_(headers, row, ['thông báo', 'notification', 'nhận email']) === 'Có',
      note: managerValueByKeywords_(headers, row, ['ghi chú', 'note']),
      avatarUrl: managerValueByKeywords_(headers, row, ['avatar', 'hình', 'ảnh'])
    };
  }).filter(Boolean);
}


function managerCachePut_(cache, key, value, expiration) {
  try {
    const str = JSON.stringify(value);
    const chunkSize = 90000;
    const chunks = Math.ceil(str.length / chunkSize);
    if (chunks > 10) return;
    cache.put(key + '_chunks', String(chunks), expiration);
    for (let i = 0; i < chunks; i++) {
      cache.put(key + '_' + i, str.substring(i * chunkSize, (i + 1) * chunkSize), expiration);
    }
  } catch(e) {}
}

function managerCacheGet_(cache, key) {
  try {
    const chunksStr = cache.get(key + '_chunks');
    if (!chunksStr) return null;
    const chunks = parseInt(chunksStr, 10);
    let str = '';
    for (let i = 0; i < chunks; i++) {
      const c = cache.get(key + '_' + i);
      if (c === null) return null;
      str += c;
    }
    return JSON.parse(str);
  } catch(e) {
    return null;
  }
}

function managerCacheClear_(cache, key) {
  try {
    const chunksStr = cache.get(key + '_chunks');
    if (!chunksStr) return;
    const chunks = parseInt(chunksStr, 10);
    const keys = [key + '_chunks'];
    for (let i = 0; i < chunks; i++) {
      keys.push(key + '_' + i);
    }
    cache.removeAll(keys);
  } catch(e) {}
}
