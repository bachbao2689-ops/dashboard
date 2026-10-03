/**
 * ASSET MANAGEMENT AUTOMATION — NHẬT KÝ UI MỚI
 *
 * 1. Paste into Extensions → Apps Script of the management spreadsheet.
 * 2. Set MANAGER_EMAIL (blank = script owner's email when available).
 * 3. If the existing email triggers are already working: only Save this source.
 *    Run install() once only when this is a new Apps Script project or triggers are missing.
 *
 * UI used in NHẬT KÝ ĐĂNG KÝ THIẾT BỊ:
 * FORM ĐĂNG KÝ (schema hiện tại): P = quyết định mượn; Q = dấu thời gian manager quyết định.
 * NHẬT KÝ ĐĂNG KÝ THIẾT BỊ (UI hiện tại):
 * A timestamp, B người đăng ký, C phòng ban, D ngày mượn, E hạn trả,
 * F mã thiết bị, G tên/model (formula), H tình trạng bàn giao, I mục đích,
 * J trạng thái sau xử lý, K người xác nhận, L tình trạng khi nhận lại,
 * M ghi chú, N thời gian xác nhận, O trạng thái xác nhận.
 */

const CONFIG = Object.freeze({
  SPREADSHEET_ID: '1aHNi-ZWdsT4MRkP1B_vmLD6rcbB-rTY-PrIDsoo29xA',
  MANAGER_EMAIL: 'bachbao2689@gmail.com',
  FORM_SHEET: 'FORM ĐĂNG KÝ',
  RESPONSE_SHEET: 'Câu trả lời biểu mẫu 1',
  LOG_SHEET: 'NHẬT KÝ ĐĂNG KÝ THIẾT BỊ',
  SETUP_SHEET: 'LIST SEP UP THIẾT BỊ',
  ASSET_SHEET: 'DANH SÁCH THIẾT BỊ',
  FORM_DATA_START: 2,
  LOG_DATA_START: 5,
  MAX_TRACKED_ROWS: 500,
  ASSET_MASTER_FIRST_ROW: 513,
  FORM_SOURCE_ID_COLUMN: 19
});

const BORROW_APPROVED = 'Đồng ý cho mượn';
const BORROW_REJECTED = 'Từ chối';
const PENDING = 'Chờ duyệt';
const RETURN_CONFIRMED = 'Xác nhận';
const RETURN_REJECTED = 'Từ chối';

const LOG = Object.freeze({
  DATA_START: CONFIG.LOG_DATA_START,
  TIMESTAMP: 1, APPLICANT: 2, DEPARTMENT: 3, LOAN_DATE: 4, DUE_DATE: 5,
  ASSET_CODE: 6, ASSET_MODEL: 7, BORROW_CONDITION: 8, PURPOSE: 9,
  ASSET_STATUS: 10, MANAGER: 11, RETURN_CONDITION: 12,
  RETURN_NOTE: 13, RETURN_TIMESTAMP: 14, RETURN_DECISION: 15,
  REQUEST_ID: 16,
  WIDTH: 15
});

/** Stable spreadsheet access also works when called from a deployed Web App. */
function managementSpreadsheet_() {
  return CONFIG.SPREADSHEET_ID
    ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * EMAIL UI CONFIG
 * - THEME: đổi 'light' hoặc 'dark' trước khi Save Apps Script.
 * - Muốn ẩn nhóm/field của một form: xoá group/field tương ứng trong template đó.
 * - Thứ tự group và fields bên dưới chính là thứ tự hiển thị trên email.
 * - key là tên dữ liệu track từ FORM ĐĂNG KÝ hoặc NHẬT KÝ ĐĂNG KÝ THIẾT BỊ.
 */
const EMAIL_UI = Object.freeze({
  THEME: 'light',
  LOGO_LIGHT: 'https://kcoffee.vn/images/logos/9/Logo_2kfk-ii.png',
  LOGO_DARK: 'https://kcoffee.vn/images/blog/10/logo-kcoffee-white.png',
  FRAME_COLORS: { reject: '#e05b54', accept: '#58b96d', notice: '#394d84' },
  TEMPLATES: {
    request: {
      frame: 'notice', statusColor: '#159947', badge: 'CHỜ DUYỆT', greeting: 'Dear Manager',
      title: 'Có yêu cầu mượn thiết bị mới',
      message: 'Bạn vừa nhận được yêu cầu mượn thiết bị. Vui lòng kiểm tra thông tin và xác nhận trên bảng quản lý tài sản.',
      summary: 'Trạng thái yêu cầu',
      groups: [
        { name: 'Người mượn', fields: [['Tên', 'name'], ['Phòng ban', 'department']] },
        { name: 'Yêu cầu mượn', fields: [['Số lượng', 'quantity'], ['Mã thiết bị', 'assetCode'], ['Lý do mượn', 'purpose']] },
        { name: 'Tình trạng thiết bị', fields: [['Tình trạng', 'condition'], ['Khả dụng', 'availability']] },
        { name: 'Thời gian', fields: [['Ngày mượn', 'loanDate'], ['Ngày trả', 'returnDate']] }
      ]
    },
    borrowApproved: {
      frame: 'accept', statusColor: '#159947', badge: 'CÓ THỂ MƯỢN', greetingKey: 'name',
      title: 'Đăng ký mượn đã được xác nhận',
      message: 'Yêu cầu mượn của bạn đã được Manager xác nhận. Vui lòng liên hệ phòng ban đang giữ thiết bị để nhận đúng lịch.',
      summary: 'Xác nhận của Manager',
      groups: [
        { name: 'Người mượn', fields: [['Tên', 'name'], ['Phòng ban', 'department']] },
        { name: 'Yêu cầu mượn', fields: [['Số lượng', 'quantity'], ['Mã thiết bị', 'assetCode'], ['Lý do mượn', 'purpose']] },
        { name: 'Tình trạng thiết bị', fields: [['Tình trạng bàn giao', 'condition'], ['Vị trí', 'location']] },
        { name: 'Thời gian', fields: [['Ngày mượn', 'loanDate'], ['Ngày trả', 'returnDate']] }
      ],
      note: ['Ghi chú của Manager', 'managerNote']
    },
    borrowRejected: {
      frame: 'reject', statusColor: '#d92828', badge: 'KHÔNG THỂ MƯỢN', greetingKey: 'name',
      title: 'Từ chối đăng ký mượn thiết bị',
      message: 'Yêu cầu mượn thiết bị của bạn chưa được phê duyệt. Vui lòng xem ghi chú hoặc liên hệ phòng ban quản lý thiết bị.',
      summary: 'Xác nhận của Manager',
      groups: [
        { name: 'Người mượn', fields: [['Tên', 'name'], ['Phòng ban', 'department']] },
        { name: 'Yêu cầu mượn', fields: [['Số lượng', 'quantity'], ['Mã thiết bị', 'assetCode'], ['Lý do mượn', 'purpose']] },
        { name: 'Tình trạng thiết bị', fields: [['Tình trạng', 'condition']] },
        { name: 'Thời gian', fields: [['Ngày mượn', 'loanDate'], ['Ngày trả', 'returnDate']] }
      ],
      note: ['Ghi chú của Manager', 'managerNote']
    },
    returnApproved: {
      frame: 'accept', statusColor: '#159947', badge: 'XÁC NHẬN', greetingKey: 'name',
      title: 'Trả thiết bị thành công',
      message: 'Thiết bị của bạn đã được xác nhận trả lại. Cảm ơn bạn đã bàn giao thiết bị.',
      summary: 'Xác nhận của Manager',
      groups: [
        { name: 'Người mượn', fields: [['Tên', 'name'], ['Phòng ban', 'department']] },
        { name: 'Thời gian', fields: [['Ngày mượn', 'loanDate'], ['Ngày trả', 'returnDate']] },
        { name: 'Thiết bị trả', fields: [['Số lượng', 'quantity'], ['Mã thiết bị', 'assetCode']] },
        { name: 'Xác nhận trả', fields: [['Trạng thái xác nhận trả', 'returnDecision'], ['Thời gian xác nhận', 'confirmedAt'], ['Tình trạng khi nhận lại', 'returnCondition']] }
      ],
      note: ['Ghi chú Manager', 'managerNote']
    },
    returnRejected: {
      frame: 'reject', statusColor: '#d92828', badge: 'TỪ CHỐI', greetingKey: 'name',
      title: 'Trả thiết bị từ chối',
      message: 'Thông tin trả thiết bị chưa được xác nhận. Vui lòng xem ghi chú của Manager và liên hệ lại nếu cần.',
      summary: 'Xác nhận của Manager',
      groups: [
        { name: 'Người mượn', fields: [['Tên', 'name'], ['Phòng ban', 'department']] },
        { name: 'Thời gian', fields: [['Ngày mượn', 'loanDate'], ['Ngày trả', 'returnDate']] },
        { name: 'Thiết bị trả', fields: [['Số lượng', 'quantity'], ['Mã thiết bị', 'assetCode']] },
        { name: 'Xác nhận trả', fields: [['Trạng thái xác nhận trả', 'returnDecision'], ['Thời gian xác nhận', 'confirmedAt'], ['Tình trạng khi nhận lại', 'returnCondition']] }
      ],
      note: ['Ghi chú Manager', 'managerNote']
    }
  }
});

function formDataEnd_() {
  return CONFIG.FORM_DATA_START + CONFIG.MAX_TRACKED_ROWS - 1;
}

function logDataEnd_() {
  return LOG.DATA_START + CONFIG.MAX_TRACKED_ROWS - 1;
}

/** Run once after pasting. Safe to rerun. */
function install() {
  const ss = managementSpreadsheet_();
  const names = ['onRequestSubmit', 'onManagerEdit'];
  ScriptApp.getProjectTriggers()
    .filter(t => names.indexOf(t.getHandlerFunction()) !== -1)
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onRequestSubmit').forSpreadsheet(ss).onFormSubmit().create();
  ScriptApp.newTrigger('onManagerEdit').forSpreadsheet(ss).onEdit().create();
  ensureSheetCapacity_(ss.getSheetByName(CONFIG.SETUP_SHEET), 4 + CONFIG.MAX_TRACKED_ROWS);
  ensureSheetCapacity_(ss.getSheetByName(CONFIG.ASSET_SHEET), CONFIG.ASSET_MASTER_FIRST_ROW + CONFIG.MAX_TRACKED_ROWS - 1);
  ensureFormSchema_(ss.getSheetByName(CONFIG.FORM_SHEET));
  ensureLogSchema_(ss.getSheetByName(CONFIG.LOG_SHEET));
  syncTracking500();
}

/** One-time reset after clearing the Form and Nhật ký for a fresh test cycle. */
function resetTrackingState() {
  const props = PropertiesService.getScriptProperties();
  const keys = Object.keys(props.getProperties()).filter(key =>
    /^(BORROW_LOG|BORROW_DECISION|BORROW_MAIL|RETURN_MAIL_BATCH|REQUEST_MAIL)\|/.test(key)
  );
  keys.forEach(key => props.deleteProperty(key));
  managementSpreadsheet_().toast(
    'Đã xoá trạng thái chống gửi trùng cho chu kỳ test mới.',
    'Asset management', 5
  );
}

/** Restores the helper formulas through exactly 500 request/log rows. */
function syncTracking500() {
  const ss = managementSpreadsheet_();
  const form = ss.getSheetByName(CONFIG.FORM_SHEET);
  const log = ss.getSheetByName(CONFIG.LOG_SHEET);
  if (!form || !log) throw new Error('Không tìm thấy FORM ĐĂNG KÝ hoặc NHẬT KÝ ĐĂNG KÝ THIẾT BỊ.');

  // Keep the grid large enough for the documented 500-row tracking limit.
  // This avoids a silent cutoff when a new response or log is created near the end.
  ensureSheetCapacity_(form, formDataEnd_());
  ensureSheetCapacity_(log, logDataEnd_());
  ensureLogSchema_(log);

  // L:N are written from the exact asset codes at submit time. Do not overwrite
  // past requests here: manual reruns must never replace their tracked values.

  // G is the display-only "Tên Thiết Bị / Model" formula.  Never write a
  // condition into it: the current UI inserted this column before H.
  log.getRange(LOG.DATA_START, LOG.ASSET_MODEL, 1, 1).copyTo(
    log.getRange(LOG.DATA_START, LOG.ASSET_MODEL, CONFIG.MAX_TRACKED_ROWS, 1),
    SpreadsheetApp.CopyPasteType.PASTE_FORMULA,
    false
  );
}

function ensureLogSchema_(log) {
  const requiredColumns = LOG.REQUEST_ID;
  if (log.getMaxColumns() < requiredColumns) {
    log.insertColumnsAfter(log.getMaxColumns(), requiredColumns - log.getMaxColumns());
  }
  const header = log.getRange(LOG.DATA_START - 1, LOG.REQUEST_ID);
  const headerText = String(header.getDisplayValue() || '').trim();
  if (headerText && normalize_(headerText) !== normalize_('ID Yêu Cầu')) {
    throw new Error('Cột ID Yêu Cầu đang có tiêu đề khác: ' + headerText + '. Cần đối soát cấu trúc Nhật ký trước khi tiếp tục.');
  }
  if (!headerText) header.setValue('ID Yêu Cầu');
  // P may inherit O's strict return-decision dropdown when inserted/copied.
  // It stores request identifiers, so that validation must not reject the ID
  // after the visible fields for the first asset have already been written.
  log.getRange(LOG.DATA_START, LOG.REQUEST_ID, CONFIG.MAX_TRACKED_ROWS, 1)
    .clearDataValidations().setNumberFormat('@');
  log.hideColumns(LOG.REQUEST_ID);
}

/** Hidden response-row key makes raw Google Form ingestion idempotent. */
function ensureFormSchema_(form) {
  if (!form) throw new Error('Không tìm thấy sheet ' + CONFIG.FORM_SHEET + '.');
  if (form.getMaxColumns() < CONFIG.FORM_SOURCE_ID_COLUMN) {
    form.insertColumnsAfter(form.getMaxColumns(), CONFIG.FORM_SOURCE_ID_COLUMN - form.getMaxColumns());
  }
  const header = form.getRange(1, CONFIG.FORM_SOURCE_ID_COLUMN);
  if (!String(header.getDisplayValue() || '').trim()) header.setValue('ID Phản Hồi Gốc');
  form.hideColumns(CONFIG.FORM_SOURCE_ID_COLUMN);
}

/** Repair the hidden journal ID schema without approving loans or sending mail. */
function repairJournalRequestIdSchema() {
  const log = managementSpreadsheet_().getSheetByName(CONFIG.LOG_SHEET);
  ensureSheetCapacity_(log, logDataEnd_());
  ensureLogSchema_(log);
  SpreadsheetApp.flush();
  console.log('ID Yêu Cầu: đã sửa định dạng và bỏ dropdown xác nhận trả khỏi cột ID.');
}

/** Read-only verification of the same approval checks used by the Web App. */
function auditPendingBorrowApprovals() {
  const ss = managementSpreadsheet_();
  const form = ss.getSheetByName(CONFIG.FORM_SHEET);
  const approvalCol = findHeaderColumn_(form, ['Xác Nhận Cho Mượn', 'Xác Nhận']);
  const end = Math.min(form.getLastRow(), formDataEnd_());
  const result = [];
  for (let row = CONFIG.FORM_DATA_START; row <= end; row++) {
    const request = readRequest_(form, row);
    if (!request.equipment) continue;
    const decision = String(form.getRange(row, approvalCol).getDisplayValue() || '').trim();
    if (decision && normalize_(decision) !== normalize_(PENDING)) continue;
    const assets = resolveAssets_(ss, request.equipment);
    const state = borrowLogState_(form, request);
    result.push({
      row: row,
      canApprove: canApproveBorrow_(null, row, 0, request, assets, state),
      existingJournalCodes: Object.keys(state.existingCodes),
      missingJournalCodes: assets.items.filter(asset => !state.existingCodes[assetKey_(asset.code)]).map(asset => asset.code),
      duplicateJournalCodes: state.duplicateCodes
    });
  }
  console.log(JSON.stringify(result));
  return result;
}

function ensureSheetCapacity_(sheet, requiredLastRow) {
  const currentLastRow = sheet.getMaxRows();
  if (currentLastRow < requiredLastRow) {
    sheet.insertRowsAfter(currentLastRow, requiredLastRow - currentLastRow);
  }
}

/** A Google Form response has been appended to FORM ĐĂNG KÝ. */
function onRequestSubmit(e) {
  if (!e || !e.range || e.range.getRow() < CONFIG.FORM_DATA_START) return;
  const source = e.range.getSheet();
  if (source.getName() === CONFIG.RESPONSE_SHEET) {
    const imported = ingestResponseRow_(source, e.range.getRow());
    if (imported) processNewRequest_(imported.form, imported.row, imported.sourceKey);
    return;
  }
  if (source.getName() !== CONFIG.FORM_SHEET) return;
  processNewRequest_(source, e.range.getRow(), 'FORM:' + source.getSheetId() + ':' + e.range.getRow());
}

/** Normalizes a linked Form response into the manager-facing tracking sheet. */
function ingestResponseRow_(source, sourceRow) {
  const ss = managementSpreadsheet_();
  const form = ss.getSheetByName(CONFIG.FORM_SHEET);
  if (!form) throw new Error('Không tìm thấy sheet ' + CONFIG.FORM_SHEET + '.');
  ensureFormSchema_(form);
  const sourceKey = 'RESPONSE:' + source.getSheetId() + ':' + sourceRow;
  const sourceIdValues = form.getRange(CONFIG.FORM_DATA_START, CONFIG.FORM_SOURCE_ID_COLUMN,
    CONFIG.MAX_TRACKED_ROWS, 1).getDisplayValues();
  const existingOffset = sourceIdValues.findIndex(row => row[0] === sourceKey);
  if (existingOffset >= 0) return { form: form, row: CONFIG.FORM_DATA_START + existingOffset, sourceKey: sourceKey };

  const sourceHeaders = source.getRange(1, 1, 1, source.getLastColumn()).getDisplayValues()[0];
  const sourceValues = source.getRange(sourceRow, 1, 1, source.getLastColumn()).getDisplayValues()[0];
  const request = responseRequest_(sourceHeaders, sourceValues);
  const codes = extractAssetCodes_(request.equipment);
  const assets = resolveAssets_(ss, request.equipment);
  const formRows = form.getRange(CONFIG.FORM_DATA_START, 1, CONFIG.MAX_TRACKED_ROWS, CONFIG.FORM_SOURCE_ID_COLUMN).getDisplayValues();
  const emptyOffset = formRows.findIndex(row => !String(row[0] || '').trim() && !String(row[CONFIG.FORM_SOURCE_ID_COLUMN - 1] || '').trim());
  if (emptyOffset < 0) throw new Error('FORM ĐĂNG KÝ đã đủ 500 dòng.');
  const destinationRow = CONFIG.FORM_DATA_START + emptyOffset;
  const headers = form.getRange(1, 1, 1, form.getLastColumn()).getDisplayValues()[0];
  const rowValues = new Array(form.getLastColumn()).fill('');
  setRowField_(headers, rowValues, ['Dấu thời gian'], request.timestamp);
  setRowField_(headers, rowValues, ['Họ và Tên Người Mượn', 'Người đăng ký'], request.name);
  setRowField_(headers, rowValues, ['Phòng ban'], request.department);
  setRowFieldContaining_(headers, rowValues, 'Mã Thiết Bị', request.equipment);
  setRowField_(headers, rowValues, ['Số Lượng', 'Số lượng'], request.quantity || String(codes.length || ''));
  setRowField_(headers, rowValues, ['Lý do mượn', 'Mục đích'], request.purpose);
  setRowField_(headers, rowValues, ['Ngày Mượn', 'Ngày mượn'], request.loanDate);
  setRowField_(headers, rowValues, ['Ngày Trả', 'Ngày trả'], request.returnDate);
  setRowField_(headers, rowValues, ['Email', 'Địa chỉ Email', 'Email Address'], request.email);
  setRowField_(headers, rowValues, ['Ghi chú'], request.note);
  setRowField_(headers, rowValues, ['Tình trạng'], assets.condition);
  setRowField_(headers, rowValues, ['Khả Dụng', 'Khả dụng'], assets.availability);
  setRowField_(headers, rowValues, ['Vị Trí', 'Vị trí'], assets.location);
  setRowField_(headers, rowValues, ['Xác Nhận Cho Mượn', 'Xác Nhận'], PENDING);
  rowValues[CONFIG.FORM_SOURCE_ID_COLUMN - 1] = sourceKey;
  form.getRange(destinationRow, 1, 1, rowValues.length).setValues([rowValues]);
  return { form: form, row: destinationRow, sourceKey: sourceKey };
}

function responseRequest_(headers, values) {
  const pick = aliases => getField_(headers, values, aliases);
  const equipment = getByContains_(headers, values, 'Mã Thiết Bị') ||
    getByContains_(headers, values, 'Tên Thiết Bị') || pick(['Danh Sách Thiết Bị']);
  return {
    timestamp: pick(['Dấu thời gian']),
    name: pick(['Họ và Tên Người Mượn', 'Họ và Tên', 'Người đăng ký']),
    department: pick(['Phòng ban']),
    equipment: equipment,
    quantity: pick(['Số Lượng', 'Số lượng']),
    purpose: pick(['Lý do mượn', 'Mục đích']),
    loanDate: pick(['Ngày Mượn', 'Ngày mượn']),
    returnDate: pick(['Ngày Trả', 'Ngày trả']),
    email: pick(['Email', 'Địa chỉ Email', 'Email Address']),
    note: pick(['Ghi chú'])
  };
}

function setRowField_(headers, values, aliases, value) {
  const targets = aliases.map(normalize_);
  for (let i = 0; i < headers.length; i++) {
    if (targets.indexOf(normalize_(headers[i])) !== -1) { values[i] = value || ''; return; }
  }
}

function setRowFieldContaining_(headers, values, text, value) {
  const target = normalize_(text);
  for (let i = 0; i < headers.length; i++) {
    if (normalize_(headers[i]).indexOf(target) !== -1) { values[i] = value || ''; return; }
  }
}

function processNewRequest_(form, row, sourceKey) {
  assertFormRow_(row);
  let request = readRequest_(form, row);
  const assets = resolveAssets_(form.getParent(), request.equipment);
  writeAssetInfo_(form, row, assets);
  SpreadsheetApp.flush();
  request = readRequest_(form, row);

  const approvalCol = findHeaderColumn_(form, ['Xác Nhận Cho Mượn', 'Xác Nhận']);
  if (approvalCol && !form.getRange(row, approvalCol).getValue()) {
    form.getRange(row, approvalCol).setValue(PENDING);
  }
  setBorrowDecisionNote_(form, row, approvalCol, assets.invalidCodes);
  const props = PropertiesService.getScriptProperties();
  const mailKey = 'REQUEST_MAIL|' + sourceKey;
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let reserved = false;
  try {
    if (!props.getProperty(mailKey)) {
      // Reserve before sending so simultaneous/retried Form events cannot
      // produce duplicate manager alerts.
      props.setProperty(mailKey, 'SENDING|' + new Date().toISOString());
      reserved = true;
    }
  } finally {
    lock.releaseLock();
  }
  if (reserved) {
    try {
      emailManager_(request, assets);
      props.setProperty(mailKey, 'SENT|' + new Date().toISOString());
    } catch (error) {
      props.setProperty(mailKey, 'FAILED|' + new Date().toISOString());
      throw error;
    }
  }
}

/** Handles both Form approval and final physical-return confirmation. */
function onManagerEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() === CONFIG.FORM_SHEET) handleBorrowDecision_(e);
  if (sheet.getName() === CONFIG.LOG_SHEET) handleReturnDecision_(e);
}

function handleBorrowDecision_(e) {
  if (e.range.getRow() < CONFIG.FORM_DATA_START) return;
  const form = e.range.getSheet();
  const approvalCol = findHeaderColumn_(form, ['Xác Nhận Cho Mượn', 'Xác Nhận']);
  if (!approvalCol || e.range.getColumn() !== approvalCol) return;

  const decision = String(e.range.getDisplayValue() || '').trim();
  if ([BORROW_APPROVED, BORROW_REJECTED].indexOf(decision) === -1) return;
  assertFormRow_(e.range.getRow());
  const row = e.range.getRow();
  const request = readRequest_(form, row);
  try {
    const result = processBorrowDecision_(form, row, decision, true);
    if (!result || result.processed !== true) {
      rollbackBorrowDecisionIfUncommitted_(form, row, approvalCol, decision, request);
    }
  } catch (error) {
    rollbackBorrowDecisionIfUncommitted_(form, row, approvalCol, decision, request);
    throw error;
  }
}

/** Optional recovery: creates missing old log rows, without re-sending old email. */
function backfillBorrowDecisions() {
  const form = managementSpreadsheet_().getSheetByName(CONFIG.FORM_SHEET);
  const approvalCol = findHeaderColumn_(form, ['Xác Nhận Cho Mượn', 'Xác Nhận']);
  if (!approvalCol) throw new Error('Không tìm thấy cột Xác Nhận Cho Mượn.');
  for (let row = CONFIG.FORM_DATA_START; row <= Math.min(form.getLastRow(), formDataEnd_()); row++) {
    const decision = String(form.getRange(row, approvalCol).getDisplayValue() || '').trim();
    if ([BORROW_APPROVED, BORROW_REJECTED].indexOf(decision) !== -1) {
      processBorrowDecision_(form, row, decision, false);
    }
  }
}

function processBorrowDecision_(form, row, decision, sendMail, lockAlreadyHeld) {
  const lock = LockService.getScriptLock();
  if (!lockAlreadyHeld) lock.waitLock(30000);
  try {
    let mailWarning = '';
    const ss = form.getParent();
    let request = readRequest_(form, row);
    const assets = resolveAssets_(ss, request.equipment);
    const approvalCol = findHeaderColumn_(form, ['Xác Nhận Cho Mượn', 'Xác Nhận']);
    const actualDecision = approvalCol ? String(form.getRange(row, approvalCol).getDisplayValue() || '').trim() : '';
    if (actualDecision !== decision) return false;
    const props = PropertiesService.getScriptProperties();
    const logKey = 'BORROW_LOG|' + requestId_(request) + '|' + decision;
    const decisionKey = 'BORROW_DECISION|' + requestId_(request);
    const opposite = decision === BORROW_APPROVED ? BORROW_REJECTED : BORROW_APPROVED;
    const previous = props.getProperty(decisionKey) ||
      (props.getProperty('BORROW_LOG|' + requestId_(request) + '|' + BORROW_APPROVED) ? BORROW_APPROVED :
        (props.getProperty('BORROW_LOG|' + requestId_(request) + '|' + BORROW_REJECTED) ? BORROW_REJECTED : ''));
    if (previous && previous !== decision) {
      if (approvalCol) form.getRange(row, approvalCol).setValue(previous);
      return false;
    }
    const alreadyProcessed = Boolean(previous);

    // Approval is blocked until email, exact codes, quantity and current
    // availability have all been validated against the source tables.
    const logState = decision === BORROW_APPROVED
      ? borrowLogState_(form, request)
      : { existingCodes: Object.create(null), duplicateCodes: [], legacyRows: [] };
    if (decision === BORROW_APPROVED && !alreadyProcessed &&
        !canApproveBorrow_(form, row, approvalCol, request, assets, logState)) return false;

    if (!alreadyProcessed) {
      writeAssetInfo_(form, row, assets);
      SpreadsheetApp.flush();
      request = readRequest_(form, row);
      if (sendMail) recordBorrowDecisionTimestamp_(form, row, approvalCol);
      setBorrowDecisionNote_(form, row, approvalCol, assets.invalidCodes);
    }
    // Reconcile the complete per-asset journal on every approved retry. The
    // hidden request ID makes this idempotent, and also repairs a prior run
    // that stopped after writing only part of a multi-asset request.
    if (decision === BORROW_APPROVED) {
      appendBorrowLogRows_(ss, request, assets, decision);
      writeBorrowManagerNoteToLog_(ss, request);
      props.setProperty(logKey, new Date().toISOString());
    }
    // Commit the dedupe marker only after all required journal rows are present.
    if (!alreadyProcessed) props.setProperty(decisionKey, decision);

    const mailKey = 'BORROW_MAIL|' + requestId_(request) + '|' + decision;
    if (sendMail && isEmail_(request.email) && !props.getProperty(mailKey)) {
      const managerNote = uniqueJoin_([
        request.note,
        managerNoteForRequest_(ss, request)
      ]);
      props.setProperty(mailKey, 'SENDING|' + new Date().toISOString());
      try {
        emailApplicantBorrowDecision_(request, assets, decision, managerNote);
        props.setProperty(mailKey, 'SENT|' + new Date().toISOString());
      } catch (error) {
        props.setProperty(mailKey, 'FAILED|' + new Date().toISOString());
        mailWarning = 'Đã lưu quyết định và nhật ký, nhưng gửi email thất bại. Kiểm tra quyền/hạn mức gửi mail và Gmail đã gửi trước khi gửi thủ công.';
      }
    } else if (sendMail && !isEmail_(request.email)) {
      mailWarning = 'Đã lưu quyết định nhưng không gửi được email vì Form chưa có Email hợp lệ của người đăng ký.';
    }
    return { processed: true, warning: mailWarning };
  } finally {
    if (!lockAlreadyHeld) lock.releaseLock();
  }
}

function appendBorrowLogRows_(ss, request, assets, decision, onlyCodes) {
  const log = ss.getSheetByName(CONFIG.LOG_SHEET);
  if (!log) throw new Error('Không tìm thấy sheet ' + CONFIG.LOG_SHEET);
  ensureSheetCapacity_(log, logDataEnd_());
  ensureLogSchema_(log);

  // One submitted request becomes one log row per submitted asset code.  Do not
  // store a comma/newline-separated list in F: each physical asset needs its
  // own return confirmation and live availability status.
  const resolvedByKey = {};
  assets.items.forEach(asset => { resolvedByKey[assetKey_(asset.code)] = asset; });
  const submittedCodes = extractAssetCodes_(request.equipment);
  let entries = (submittedCodes.length ? submittedCodes : [request.equipment])
    .map(code => resolvedByKey[assetKey_(code)] || {
      code: String(code || '').trim(),
      condition: request.condition || ''
    })
    .filter(asset => asset.code);
  if (onlyCodes && onlyCodes.length) {
    const allowed = onlyCodes.map(assetKey_);
    entries = entries.filter(asset => allowed.indexOf(assetKey_(asset.code)) !== -1);
  }
  const logState = borrowLogState_(ss.getSheetByName(CONFIG.FORM_SHEET), request);
  if (logState.duplicateCodes.length) {
    throw new Error('Đã có nhiều dòng Nhật ký cho cùng mã của yêu cầu: ' + logState.duplicateCodes.join(', ') + '. Cần đối soát trước khi tiếp tục.');
  }
  const requestId = requestId_(request);
  // A previous deployment could have stopped after writing the visible log
  // columns but before storing the hidden request ID. Adopt only rows that map
  // uniquely back to this exact Form request; this makes a retry idempotent.
  logState.legacyRows.forEach(item => log.getRange(item.row, LOG.REQUEST_ID).setValue(requestId));
  const existingCodes = logState.existingCodes;
  entries = entries.filter(asset => !existingCodes[assetKey_(asset.code)]);
  if (!entries.length) return;
  if (decision !== BORROW_APPROVED) return;
  // G contains formulas through row 504, so getLastRow() is not a safe append
  // pointer. Append below the last occupied asset-code row; this leaves old
  // holes untouched and gives a multi-asset request one contiguous write.
  const codeValues = log.getRange(LOG.DATA_START, LOG.ASSET_CODE, CONFIG.MAX_TRACKED_ROWS, 1).getDisplayValues();
  let lastOccupiedOffset = -1;
  codeValues.forEach((r, index) => { if (String(r[0] || '').trim()) lastOccupiedOffset = index; });
  const destinationRow = LOG.DATA_START + lastOccupiedOffset + 1;
  if (destinationRow + entries.length - 1 > logDataEnd_()) {
    throw new Error('NHẬT KÝ ĐĂNG KÝ THIẾT BỊ đã đủ 500 dòng tracking. Hãy mở rộng giới hạn trước khi duyệt thêm.');
  }
  const timestamp = new Date();
  const firstModelRow = 5;
  const lastModelRow = firstModelRow + CONFIG.MAX_TRACKED_ROWS - 1;
  const setupSheetName = String(CONFIG.SETUP_SHEET).replace(/'/g, "''");
  const rows = entries.map((asset, index) => {
    const targetRow = destinationRow + index;
    const modelFormula = '=IF(F' + targetRow + '="";"";IFERROR(VLOOKUP(F' + targetRow + ";'" +
      setupSheetName + "'!$A$" + firstModelRow + ':$D$' + lastModelRow + ';4;FALSE);""))';
    return [
      timestamp, request.name, request.department, request.loanDate, request.returnDate,
      asset.code, modelFormula, asset.condition || request.condition || '', request.purpose,
      'Đang mượn', managerIdentity_(), '', '', '', '', requestId
    ];
  });
  // One contiguous setValues call prevents a mid-request exception from leaving
  // only the first asset tracked as borrowed.
  log.getRange(destinationRow, 1, rows.length, LOG.REQUEST_ID).setValues(rows);
}

/**
 * Repairs only missing confirmation timestamps using the already-recorded log timestamp in A.
 * It never guesses from form-submission time and never sends email.  A timestamp
 * is written only when the matching log timestamp is unambiguous.
 */
function backfillMissingBorrowDecisionTimestamps() {
  const ss = managementSpreadsheet_();
  const form = ss.getSheetByName(CONFIG.FORM_SHEET);
  const log = ss.getSheetByName(CONFIG.LOG_SHEET);
  if (!form || !log) throw new Error('Không tìm thấy FORM ĐĂNG KÝ hoặc NHẬT KÝ ĐĂNG KÝ THIẾT BỊ.');

  const approvalCol = findHeaderColumn_(form, ['Xác Nhận Cho Mượn', 'Xác Nhận']);
  const timestampCol = findBorrowConfirmationTimestampColumn_(form, approvalCol);
  if (!approvalCol || !timestampCol) throw new Error('Không tìm thấy cột O/P xác nhận cho mượn.');

  const formRows = Math.min(CONFIG.MAX_TRACKED_ROWS, Math.max(0, form.getLastRow() - CONFIG.FORM_DATA_START + 1));
  const logRows = Math.min(CONFIG.MAX_TRACKED_ROWS, Math.max(0, log.getLastRow() - LOG.DATA_START + 1));
  if (!formRows || !logRows) return;

  const formValues = form.getRange(CONFIG.FORM_DATA_START, 1, formRows, Math.max(timestampCol, approvalCol)).getValues();
  const logValues = log.getRange(LOG.DATA_START, 1, logRows, LOG.WIDTH).getValues();

  const exactLogCandidates = (request) => {
    const required = extractAssetCodes_(request.equipment).map(assetKey_);
    const candidates = logValues.filter(row => {
      const loggedAt = row[LOG.TIMESTAMP - 1];
      if (!(loggedAt instanceof Date) || isNaN(loggedAt)) return false;
      if (normalize_(row[LOG.APPLICANT - 1]) !== normalize_(request.name)) return false;
      if (normalize_(row[LOG.DEPARTMENT - 1]) !== normalize_(request.department)) return false;
      if (formatDate_(row[LOG.LOAN_DATE - 1]) !== formatDate_(request.loanDate)) return false;
      if (formatDate_(row[LOG.DUE_DATE - 1]) !== formatDate_(request.returnDate)) return false;
      return required.indexOf(assetKey_(row[LOG.ASSET_CODE - 1])) !== -1;
    });
    return [...new Set(candidates.map(row => row[LOG.TIMESTAMP - 1].getTime()))];
  };

  let repaired = 0;
  formValues.forEach((row, offset) => {
    const decision = String(row[approvalCol - 1] || '').trim();
    if ([BORROW_APPROVED, BORROW_REJECTED].indexOf(decision) === -1 || row[timestampCol - 1]) return;
    const request = readRequest_(form, CONFIG.FORM_DATA_START + offset);
    const times = exactLogCandidates(request);
    if (times.length === 1) {
      form.getRange(CONFIG.FORM_DATA_START + offset, timestampCol)
        .setValue(new Date(times[0]))
        .setNumberFormat('dd/MM/yyyy HH:mm');
      repaired++;
    }
  });
  managementSpreadsheet_().toast('Đã khôi phục ' + repaired + ' dấu thời gian xác nhận có đối soát.', 'Asset management', 6);
}

/**
 * One-time, non-mail recovery for the existing 500-row window.
 *
 * It fixes the column shift created when G "Tên Thiết Bị / Model" was added,
 * ensures every approved form code has its own log row, restores the Form P
 * timestamp when an unambiguous log time exists, and applies already-selected
 * return decisions to J/N. It deliberately never sends historical emails.
 */
function repairExistingTracking() {
  const ss = managementSpreadsheet_();
  const form = ss.getSheetByName(CONFIG.FORM_SHEET);
  const log = ss.getSheetByName(CONFIG.LOG_SHEET);
  if (!form || !log) throw new Error('Không tìm thấy FORM ĐĂNG KÝ hoặc NHẬT KÝ ĐĂNG KÝ THIẾT BỊ.');

  syncTracking500();
  ensureLogSchema_(log);
  const approvalCol = findHeaderColumn_(form, ['Xác Nhận Cho Mượn', 'Xác Nhận']);
  if (!approvalCol) throw new Error('Không tìm thấy cột Xác Nhận Cho Mượn trong FORM ĐĂNG KÝ.');

  const formEnd = Math.min(form.getLastRow(), formDataEnd_());
  const approvedRequests = [];
  for (let row = CONFIG.FORM_DATA_START; row <= formEnd; row++) {
    const decision = String(form.getRange(row, approvalCol).getDisplayValue() || '').trim();
    if (decision !== BORROW_APPROVED) continue;
    const request = readRequest_(form, row);
    const assets = resolveAssets_(ss, request.equipment);
    approvedRequests.push({ request: request, assets: assets, decision: decision });
  }

  const requestByAsset = {};
  approvedRequests.forEach(entry => {
    extractAssetCodes_(entry.request.equipment).forEach(code => {
      requestByAsset[trackingKey_(entry.request, code)] = entry;
    });
  });

  const rows = log.getRange(LOG.DATA_START, 1, CONFIG.MAX_TRACKED_ROWS, LOG.REQUEST_ID).getValues();
  const existing = {};
  let repairedRows = 0;
  rows.forEach(row => {
    const code = String(row[LOG.ASSET_CODE - 1] || '').trim();
    if (!code) return;
    const key = trackingKeyFromLogRow_(row);
    existing[key] = true;
    const entry = requestByAsset[key];
    if (!entry) return;

    const expectedStatus = entry.decision === BORROW_APPROVED ? 'Đang mượn' : BORROW_REJECTED;
    const statusInJ = String(row[LOG.ASSET_STATUS - 1] || '').trim();
    const statusInI = String(row[LOG.PURPOSE - 1] || '').trim();
    const needsShiftRepair = isAssetStatus_(statusInI) && !isAssetStatus_(statusInJ);
    if (needsShiftRepair || !statusInJ) {
      row[LOG.BORROW_CONDITION - 1] = entry.assets.items
        .filter(asset => assetKey_(asset.code) === assetKey_(code))
        .map(asset => asset.condition)[0] || entry.request.condition || '';
      row[LOG.PURPOSE - 1] = entry.request.purpose || '';
      row[LOG.ASSET_STATUS - 1] = needsShiftRepair ? statusInI : expectedStatus;
      if (!String(row[LOG.MANAGER - 1] || '').trim() || isEmail_(row[LOG.MANAGER - 1])) {
        row[LOG.MANAGER - 1] = managerIdentity_();
      }
      repairedRows++;
    }
    // These rows were already confirmed by a manager but the old mapping never
    // wrote J/N. Apply status once, without retroactively emailing the user.
    const outcome = returnOutcome_(row[LOG.RETURN_DECISION - 1]);
    if (outcome && !row[LOG.RETURN_TIMESTAMP - 1]) {
      row[LOG.ASSET_STATUS - 1] = outcome === 'confirmed'
        ? assetStatusAfterReturn_(row[LOG.RETURN_CONDITION - 1])
        : 'Đang mượn';
      row[LOG.MANAGER - 1] = managerIdentity_();
      row[LOG.RETURN_TIMESTAMP - 1] = new Date();
      repairedRows++;
    }
  });
  // H:O contains only manager-facing values/dropdowns;
  // writing the existing values back preserves validation and never touches
  // G's model formula.
  log.getRange(LOG.DATA_START, LOG.BORROW_CONDITION, CONFIG.MAX_TRACKED_ROWS, 8)
    .setValues(rows.map(row => row.slice(LOG.BORROW_CONDITION - 1, LOG.WIDTH)));

  let appended = 0;
  approvedRequests.forEach(entry => {
    const missingCodes = extractAssetCodes_(entry.request.equipment)
      .filter(code => !existing[trackingKey_(entry.request, code)]);
    if (missingCodes.length) {
      appendBorrowLogRows_(ss, entry.request, entry.assets, entry.decision, missingCodes);
      appended += missingCodes.length;
    }
  });

  backfillMissingBorrowDecisionTimestamps();
  ss.toast('Đã sửa ' + repairedRows + ' dòng và bổ sung ' + appended + ' dòng Nhật ký. Không gửi lại email cũ.', 'Asset management', 8);
}

function trackingKey_(request, code) {
  return [request.name, request.department, formatDate_(request.loanDate), formatDate_(request.returnDate), assetKey_(code)]
    .map(normalize_).join('|');
}

function trackingKeyFromLogRow_(row) {
  return [row[LOG.APPLICANT - 1], row[LOG.DEPARTMENT - 1],
    formatDate_(row[LOG.LOAN_DATE - 1]), formatDate_(row[LOG.DUE_DATE - 1]),
    assetKey_(row[LOG.ASSET_CODE - 1])].map(normalize_).join('|');
}

function isAssetStatus_(value) {
  return ['chờ duyệt', 'đang mượn', 'sẵn sàng', 'bảo trì', 'mất/hỏng', 'quá hạn', 'từ chối']
    .indexOf(normalize_(value)) !== -1;
}

/**
 * K and L are manager text fields. N is final action.
 * Confirm => Sẵn sàng, except fault wording in K => Bảo trì.
 * Reject => Đang mượn, so the asset cannot be borrowed by another person.
 */
function handleReturnDecision_(e, lockAlreadyHeld) {
  const log = e.range.getSheet();
  const row = e.range.getRow();
  if (row < LOG.DATA_START || e.range.getColumn() !== LOG.RETURN_DECISION) {
    return { processed: false, warning: 'Dòng hoặc cột xác nhận trả không hợp lệ.' };
  }

  ensureLogSchema_(log);
  const lock = LockService.getScriptLock();
  if (!lockAlreadyHeld && !lock.tryLock(30000)) {
    return { processed: false, warning: 'Đã ghi quyết định nhưng luồng đang bận; tải lại để kiểm tra trạng thái xử lý.' };
  }
  try {
    const outcome = returnOutcome_(e.range.getDisplayValue());
    if (!outcome) return { processed: false, warning: 'Trạng thái xác nhận trả không hợp lệ.' };
    const decision = outcome === 'confirmed' ? RETURN_CONFIRMED : RETURN_REJECTED;
    const returnCondition = String(log.getRange(row, LOG.RETURN_CONDITION).getDisplayValue() || '').trim();
    const assetStatus = outcome === 'confirmed' ? assetStatusAfterReturn_(returnCondition) : 'Đang mượn';
    const timestampCell = log.getRange(row, LOG.RETURN_TIMESTAMP);
    const confirmedAt = timestampCell.getValue() || new Date();

    log.getRange(row, LOG.ASSET_STATUS).setValue(assetStatus);
    log.getRange(row, LOG.MANAGER).setValue(managerIdentity_());
    if (!timestampCell.getValue()) timestampCell.setValue(confirmedAt).setNumberFormat('dd/MM/yyyy HH:mm');

    const values = log.getRange(row, 1, 1, LOG.REQUEST_ID).getValues()[0];
    const applicantEmail = resolveLogApplicantEmail_(log, row, values);
    const batch = returnBatchRows_(log, values);
    // Serialize the whole read/decision/mail sequence so sibling edits can
    // only release one consolidated notification for this request.
    if (!batch.length || batch.some(item => !returnOutcome_(item.row[LOG.RETURN_DECISION - 1]))) {
      return { processed: true, waitingForBatch: true, warning: '' };
    }
    const batchRows = batch.map(item => item.row);
    const outcomes = batchRows.map(item => returnOutcome_(item[LOG.RETURN_DECISION - 1]));
    const batchDecision = outcomes.every(item => item === 'confirmed') ? RETURN_CONFIRMED : RETURN_REJECTED;
    const returnMailKey = returnNotificationKey_(values, 'batch', applicantEmail);
    const legacyConfirmedKey = returnNotificationKey_(values, RETURN_CONFIRMED, applicantEmail);
    const legacyRejectedKey = returnNotificationKey_(values, RETURN_REJECTED, applicantEmail);
    const props = PropertiesService.getScriptProperties();
    const alreadySent = props.getProperty(returnMailKey) ||
      props.getProperty(legacyConfirmedKey) || props.getProperty(legacyRejectedKey);
    let mailWarning = '';
    if (isEmail_(applicantEmail) && !alreadySent) {
      const dates = batchRows.map(item => item[LOG.RETURN_TIMESTAMP - 1])
        .filter(item => item instanceof Date && !isNaN(item));
      const latest = dates.length
        ? dates.sort((a, b) => a.getTime() - b.getTime())[dates.length - 1]
        : confirmedAt;
      props.setProperty(returnMailKey, 'SENDING|' + new Date().toISOString());
      try {
        emailApplicantReturnDecision_(batchRows, applicantEmail, batchDecision, assetStatus, latest);
        props.setProperty(returnMailKey, 'SENT|' + new Date().toISOString());
      } catch (error) {
        props.setProperty(returnMailKey, 'FAILED|' + new Date().toISOString());
        mailWarning = 'Đã lưu xác nhận trả, nhưng gửi email thất bại. Kiểm tra quyền/hạn mức gửi mail và Gmail đã gửi trước khi gửi thủ công.';
      }
    } else if (!isEmail_(applicantEmail) && !alreadySent) {
      mailWarning = 'Đã lưu xác nhận trả nhưng không tìm được Email của người đăng ký trong FORM ĐĂNG KÝ; chưa gửi email.';
    }
    return { processed: true, warning: mailWarning };
  } finally {
    if (!lockAlreadyHeld) lock.releaseLock();
  }
}

/** Supports both the current dropdown and legacy labels without breaking UI. */
function returnOutcome_(value) {
  const decision = normalize_(value);
  if (['xác nhận', 'đã nhận', 'đồng ý xác nhận'].indexOf(decision) !== -1) return 'confirmed';
  if (['từ chối', 'không xác nhận'].indexOf(decision) !== -1) return 'rejected';
  return '';
}

function returnBatchRows_(log, row) {
  const rows = log.getRange(LOG.DATA_START, 1, CONFIG.MAX_TRACKED_ROWS, LOG.REQUEST_ID).getValues();
  const requestId = String(row[LOG.REQUEST_ID - 1] || '').trim();
  if (requestId) {
    return rows.map((item, index) => ({ row: item, rowNumber: LOG.DATA_START + index }))
      .filter(item => item.row[LOG.REQUEST_ID - 1] === requestId)
      .filter(item => String(item.row[LOG.ASSET_CODE - 1] || '').trim());
  }
  const key = [
    formatDateTime_(row[LOG.TIMESTAMP - 1]), row[LOG.APPLICANT - 1], row[LOG.DEPARTMENT - 1],
    formatDate_(row[LOG.LOAN_DATE - 1]), formatDate_(row[LOG.DUE_DATE - 1]),
    row[LOG.PURPOSE - 1]
  ].map(normalize_).join('|');
  return rows.map((item, index) => ({ row: item, rowNumber: LOG.DATA_START + index }))
    .filter(item => String(item.row[LOG.ASSET_CODE - 1] || '').trim())
    .filter(item => {
      const candidate = item.row;
      const candidateKey = [
        formatDateTime_(candidate[LOG.TIMESTAMP - 1]), candidate[LOG.APPLICANT - 1], candidate[LOG.DEPARTMENT - 1],
        formatDate_(candidate[LOG.LOAN_DATE - 1]), formatDate_(candidate[LOG.DUE_DATE - 1]),
        candidate[LOG.PURPOSE - 1]
      ].map(normalize_).join('|');
      return candidateKey === key;
    });
}

function returnNotificationKey_(row, decision, applicantEmail) {
  const requestId = String(row[LOG.REQUEST_ID - 1] || '').trim();
  if (requestId) {
    return ['RETURN_MAIL_BATCH', 'ID:' + requestId, applicantEmail, decision].map(String).join('|');
  }
  // Preserve the exact legacy key layout so upgrading does not resend a
  // message that an older version already marked as sent.
  return [
    'RETURN_MAIL_BATCH',
    applicantEmail,
    formatDateTime_(row[LOG.TIMESTAMP - 1]),
    row[LOG.APPLICANT - 1],
    row[LOG.DEPARTMENT - 1],
    formatDate_(row[LOG.LOAN_DATE - 1]),
    formatDate_(row[LOG.DUE_DATE - 1]),
    row[LOG.PURPOSE - 1],
    decision
  ].map(String).join('|');
}

/**
 * Email is resolved from the exact form request, never from visible manager or
 * status columns in the log. This keeps the approved A:O layout stable.
 */
function resolveLogApplicantEmail_(log, rowNumber, row) {
  const ss = log.getParent();
  const form = ss.getSheetByName(CONFIG.FORM_SHEET);
  if (!form) return '';
  const maxRows = Math.min(CONFIG.MAX_TRACKED_ROWS, Math.max(0, form.getLastRow() - CONFIG.FORM_DATA_START + 1));
  if (!maxRows) return '';
  const headers = form.getRange(1, 1, 1, form.getLastColumn()).getDisplayValues()[0];
  const values = form.getRange(CONFIG.FORM_DATA_START, 1, maxRows, form.getLastColumn()).getValues();
  const code = assetKey_(row[LOG.ASSET_CODE - 1]);
  const candidates = values.map((item, offset) => ({
    request: readRequest_(form, CONFIG.FORM_DATA_START + offset), offset: offset
  })).filter(item => {
    const request = item.request;
    if (row[LOG.REQUEST_ID - 1]) {
      return requestId_(request) === String(row[LOG.REQUEST_ID - 1]) && isEmail_(request.email);
    }
    return normalize_(request.name) === normalize_(row[LOG.APPLICANT - 1]) &&
      normalize_(request.department) === normalize_(row[LOG.DEPARTMENT - 1]) &&
      formatDate_(request.loanDate) === formatDate_(row[LOG.LOAN_DATE - 1]) &&
      formatDate_(request.returnDate) === formatDate_(row[LOG.DUE_DATE - 1]) &&
      extractAssetCodes_(request.equipment).map(assetKey_).indexOf(code) !== -1 &&
      isEmail_(request.email);
  });
  if (candidates.length !== 1) return '';
  return String(candidates[0].request.email).trim();
}

function assetStatusAfterReturn_(condition) {
  return /(hỏng|lỗi|cần sửa|bảo trì|không hoạt động)/.test(normalize_(condition))
    ? 'Bảo trì'
    : 'Sẵn sàng';
}

function emailManager_(request, assets) {
  const manager = managerEmail_();
  if (!manager) return;
  sendEmail_(manager, '[Asset] Có yêu cầu mượn thiết bị mới', 'request',
    requestEmailData_(request, assets));
}

function emailApplicantBorrowDecision_(request, assets, decision, managerNote) {
  const template = decision === BORROW_APPROVED ? 'borrowApproved' : 'borrowRejected';
  const data = requestEmailData_(request, assets);
  data.managerNote = uniqueJoin_([managerNote, data.managerNote]);
  sendEmail_(request.email, '[Asset] Kết quả đăng ký mượn: ' + decision,
    template, data);
}

function writeBorrowManagerNoteToLog_(ss, request) {
  const note = String(request.note || '').trim();
  if (!note) return;
  const log = ss.getSheetByName(CONFIG.LOG_SHEET);
  if (!log) return;
  const requested = extractAssetCodes_(request.equipment).map(assetKey_);
  const rows = log.getRange(LOG.DATA_START, 1, CONFIG.MAX_TRACKED_ROWS, LOG.REQUEST_ID).getValues();
  rows.forEach((row, offset) => {
    if (row[LOG.REQUEST_ID - 1] && row[LOG.REQUEST_ID - 1] !== requestId_(request)) return;
    const code = assetKey_(row[LOG.ASSET_CODE - 1]);
    if (!code || requested.indexOf(code) === -1) return;
    if (normalize_(row[LOG.APPLICANT - 1]) !== normalize_(request.name)) return;
    if (normalize_(row[LOG.DEPARTMENT - 1]) !== normalize_(request.department)) return;
    if (formatDate_(row[LOG.LOAN_DATE - 1]) !== formatDate_(request.loanDate)) return;
    if (formatDate_(row[LOG.DUE_DATE - 1]) !== formatDate_(request.returnDate)) return;
    log.getRange(LOG.DATA_START + offset, LOG.RETURN_NOTE).setValue(note);
  });
}

function managerNoteForRequest_(ss, request) {
  const log = ss.getSheetByName(CONFIG.LOG_SHEET);
  if (!log) return '';
  const rows = log.getRange(LOG.DATA_START, 1, CONFIG.MAX_TRACKED_ROWS, LOG.REQUEST_ID).getValues();
  const requested = extractAssetCodes_(request.equipment).map(assetKey_);
  return uniqueJoin_(rows.filter(row => {
    if (row[LOG.REQUEST_ID - 1] && row[LOG.REQUEST_ID - 1] !== requestId_(request)) return false;
    const code = assetKey_(row[LOG.ASSET_CODE - 1]);
    return code && requested.indexOf(code) !== -1 &&
      normalize_(row[LOG.APPLICANT - 1]) === normalize_(request.name) &&
      normalize_(row[LOG.DEPARTMENT - 1]) === normalize_(request.department) &&
      formatDate_(row[LOG.LOAN_DATE - 1]) === formatDate_(request.loanDate) &&
      formatDate_(row[LOG.DUE_DATE - 1]) === formatDate_(request.returnDate);
  }).map(row => row[LOG.RETURN_NOTE - 1]));
}

function emailApplicantReturnDecision_(rows, applicantEmail, decision, assetStatus, confirmedAt) {
  const template = decision === RETURN_CONFIRMED ? 'returnApproved' : 'returnRejected';
  const first = rows[0] || [];
  const data = {
    name: first[LOG.APPLICANT - 1],
    department: first[LOG.DEPARTMENT - 1],
    assetCode: uniqueJoin_(rows.map(row => row[LOG.ASSET_CODE - 1])),
    quantity: String(rows.length),
    purpose: first[LOG.PURPOSE - 1],
    loanDate: formatDate_(first[LOG.LOAN_DATE - 1]),
    returnDate: formatDate_(first[LOG.DUE_DATE - 1]),
    returnDecision: decision,
    borrowCondition: uniqueJoin_(rows.map(row => row[LOG.BORROW_CONDITION - 1])),
    returnCondition: uniqueJoin_(rows.map(row => row[LOG.RETURN_CONDITION - 1])),
    assetStatus: uniqueJoin_(rows.map(row => row[LOG.ASSET_STATUS - 1])) || assetStatus,
    confirmedAt: formatDateTime_(confirmedAt),
    managerNote: uniqueJoin_(rows.map(row => row[LOG.RETURN_NOTE - 1]))
  };
  sendEmail_(applicantEmail, '[Asset] Xác nhận trả thiết bị: ' + decision,
    template, data);
}

function requestEmailData_(request, assets) {
  return {
    name: request.name,
    department: request.department,
    assetCode: request.equipment,
    quantity: request.quantity,
    purpose: request.purpose,
    loanDate: formatDate_(request.loanDate),
    returnDate: formatDate_(request.returnDate),
    condition: request.condition || assets.condition,
    availability: request.availability || assets.availability,
    location: request.location || assets.location,
    // FORM ĐĂNG KÝ hiện có một cột "Ghi chú" (K). Manager dùng chính ô này
    // để nhập ghi chú khi duyệt/từ chối mượn; email chỉ hiển thị nếu ô có dữ liệu.
    managerNote: request.note
  };
}

function sendEmail_(to, subject, templateId, data) {
  if (!isEmail_(to)) return;
  const plainText = emailPlainText_(templateId, data);
  MailApp.sendEmail(to, subject, plainText, {
    htmlBody: emailHtml_(templateId, data)
  });
}

function readRequest_(sheet, row) {
  const width = sheet.getLastColumn();
  const headerRange = sheet.getRange(1, 1, 1, width);
  const rowRange = sheet.getRange(row, 1, 1, width);
  const headers = headerRange.getDisplayValues()[0];
  const values = rowRange.getValues()[0];
  const displayValues = rowRange.getDisplayValues()[0];
  return readRequestFromValues_(headers, values, displayValues);
}

/**
 * Parse a Form row without touching the Sheet.  Keeping this parser in the
 * automation file lets recovery work even when the optional Web App source is
 * not present in the Apps Script project.
 */
function readRequestFromValues_(headers, values, displayValues) {
  const request = {
    timestamp: getField_(headers, values, ['Dấu thời gian']),
    name: getField_(headers, values, ['Họ và Tên Người Mượn', 'Người đăng ký']),
    department: getField_(headers, values, ['Phòng ban']),
    // FORM ĐĂNG KÝ currently names this header "Mã Thiết Bị" (with a line-break instruction below it).
    equipment: getByContains_(headers, values, 'Mã Thiết Bị') || getByContains_(headers, values, 'Tên Thiết Bị'),
    quantity: getField_(headers, values, ['Số Lượng', 'Số lượng']),
    purpose: getField_(headers, values, ['Lý do mượn', 'Mục đích']),
    loanDate: getField_(headers, values, ['Ngày Mượn', 'Ngày mượn']),
    returnDate: getField_(headers, values, ['Ngày Trả', 'Ngày trả']),
    email: getField_(headers, values, ['Email', 'Địa chỉ Email', 'Email Address']),
    note: getField_(headers, values, ['Ghi chú']),
    condition: getField_(headers, values, ['Tình trạng']),
    availability: getField_(headers, values, ['Khả Dụng', 'Khả dụng']),
    location: getField_(headers, values, ['Vị Trí', 'Vị trí'])
  };
  // A Sheet Date value can be rounded one second differently from its displayed
  // form timestamp.  The displayed timestamp is what both the manager UI and
  // the response sheet expose, so use it as the stable request-ID source.
  if (displayValues && displayValues.length) {
    request.timestamp = getField_(headers, displayValues, ['Dấu thời gian']) || request.timestamp;
  }
  return request;
}

/** Read the bounded Form window once for legacy-journal reconciliation. */
function readBorrowRequests_(form) {
  const end = Math.min(form.getLastRow(), formDataEnd_());
  if (end < CONFIG.FORM_DATA_START) return [];
  const width = form.getLastColumn();
  const headers = form.getRange(1, 1, 1, width).getDisplayValues()[0];
  const range = form.getRange(CONFIG.FORM_DATA_START, 1, end - CONFIG.FORM_DATA_START + 1, width);
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  return values
    .map((row, index) => readRequestFromValues_(headers, row, displayValues[index]))
    .filter(request => request.timestamp || request.name || request.equipment);
}

function writeAssetInfo_(sheet, row, assets) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  setField_(sheet, row, headers, ['Tình trạng'], assets.condition);
  setField_(sheet, row, headers, ['Khả Dụng', 'Khả dụng'], assets.availability);
  setField_(sheet, row, headers, ['Vị Trí', 'Vị trí'], assets.location);
}

function resolveAssets_(ss, equipmentText) {
  const requestedCodes = extractAssetCodes_(equipmentText);
  if (!requestedCodes.length) {
    return { items: [], invalidCodes: [], requestedCodes: [], condition: '', availability: '', location: '' };
  }

  const setup = ss.getSheetByName(CONFIG.SETUP_SHEET);
  ensureSheetCapacity_(setup, 4 + CONFIG.MAX_TRACKED_ROWS);
  const setupRows = setup.getRange(5, 1, CONFIG.MAX_TRACKED_ROWS, 8).getValues();
  const masterSheet = ss.getSheetByName(CONFIG.ASSET_SHEET);
  ensureSheetCapacity_(masterSheet, CONFIG.ASSET_MASTER_FIRST_ROW + CONFIG.MAX_TRACKED_ROWS - 1);
  const master = masterSheet.getRange(CONFIG.ASSET_MASTER_FIRST_ROW, 1, CONFIG.MAX_TRACKED_ROWS, 11).getValues();
  const masterByKey = {};
  master.forEach(row => {
    if (!row[0]) return;
    const key = assetKey_(row[0]);
    if (masterByKey[key]) return;
    masterByKey[key] = {
      model: String(row[1] || ''),
      status: String(row[5] || ''), borrower: String(row[6] || ''),
      department: String(row[7] || ''), dueDate: row[8] || '', availability: String(row[9] || '')
    };
  });

  // Asset code is an identifier, not a free-text search. Build an exact lookup so
  // a 3-code request creates exactly 3 log rows; unknown/typo codes remain visible
  // to the manager and cannot be approved accidentally.
  const assetByKey = {};
  setupRows.forEach(r => {
    const key = assetKey_(r[0]);
    if (!key || assetByKey[key]) return;
    assetByKey[key] = {
      code: String(r[0]).replace(/[\r\n]+/g, '').trim(),
      model: masterByKey[key] ? masterByKey[key].model : '',
      condition: String(r[7] || ''),
      status: masterByKey[key] ? masterByKey[key].status : '',
      borrower: masterByKey[key] ? masterByKey[key].borrower : '',
      department: masterByKey[key] ? masterByKey[key].department : '',
      dueDate: masterByKey[key] ? masterByKey[key].dueDate : '',
      availability: masterByKey[key] ? masterByKey[key].availability : '',
      location: String(r[5] || '')
    };
  });

  const seen = {};
  const items = [];
  const invalidCodes = [];
  requestedCodes.forEach(input => {
    const key = assetKey_(input);
    if (!key || seen[key]) return;
    seen[key] = true;
    if (assetByKey[key]) items.push(assetByKey[key]);
    else invalidCodes.push(String(input).trim());
  });
  return {
    items: items,
    invalidCodes: invalidCodes,
    requestedCodes: requestedCodes,
    condition: uniqueJoin_(items.map(i => i.condition)),
    availability: uniqueJoin_(items.map(i => i.availability)),
    location: uniqueJoin_(items.map(i => i.location))
  };
}

function assertFormRow_(row) {
  if (row > formDataEnd_()) {
    throw new Error('FORM ĐĂNG KÝ chỉ tracking tối đa 500 dòng (hàng 2–' + formDataEnd_() + ').');
  }
}

function extractAssetCodes_(value) {
  return String(value || '')
    .split(/\r?\n|[,;]+|\s+-\s+/)
    .map(code => code.trim())
    .filter(Boolean);
}

function assetKey_(value) {
  return String(value || '').replace(/\s+/g, '').toLowerCase();
}

function borrowLogState_(form, request) {
  const log = form.getParent().getSheetByName(CONFIG.LOG_SHEET);
  if (!log) throw new Error('Không tìm thấy sheet ' + CONFIG.LOG_SHEET);
  const width = Math.min(LOG.REQUEST_ID, log.getMaxColumns());
  const rows = log.getRange(LOG.DATA_START, 1, CONFIG.MAX_TRACKED_ROWS, width).getValues();
  const expected = Object.create(null);
  extractAssetCodes_(request.equipment).forEach(code => { expected[assetKey_(code)] = true; });
  // Do not depend on ManagerWebApp.gs here.  A manager may run the spreadsheet
  // automation without deploying the Web App, and a partial legacy write must
  // still be recoverable in that configuration.
  let formRequests = null;
  const requestId = requestId_(request);
  const counts = Object.create(null);
  const legacyRows = [];

  rows.forEach((values, offset) => {
    const key = assetKey_(values[LOG.ASSET_CODE - 1]);
    if (!key || !expected[key]) return;
    const storedId = width >= LOG.REQUEST_ID ? String(values[LOG.REQUEST_ID - 1] || '').trim() : '';
    let belongsToRequest = storedId === requestId;
    let isLegacy = false;
    if (!storedId && isCommittedBorrowLogRow_(values)) {
      // Most rows already have a request ID.  Read the Form window only for a
      // genuinely legacy candidate, so normal approvals keep the fast path.
      formRequests = formRequests || readBorrowRequests_(form);
      belongsToRequest = legacyBorrowLogMatchesRequest_(formRequests, request, values);
      isLegacy = belongsToRequest;
    }
    if (!belongsToRequest) return;
    counts[key] = (counts[key] || 0) + 1;
    if (isLegacy) legacyRows.push({ row: LOG.DATA_START + offset, code: String(values[LOG.ASSET_CODE - 1]).trim() });
  });

  const existingCodes = Object.create(null);
  const duplicateCodes = [];
  Object.keys(counts).forEach(key => {
    existingCodes[key] = true;
    if (counts[key] > 1) duplicateCodes.push(key);
  });
  return { existingCodes: existingCodes, duplicateCodes: duplicateCodes, legacyRows: legacyRows };
}

/**
 * A pre-ID journal row can be adopted only when its visible request identity
 * maps to exactly one current Form response.  If two responses have the same
 * borrower, department, dates and asset code, the row is deliberately left
 * unlinked instead of risking a cross-request merge.
 */
function legacyBorrowLogMatchesRequest_(formRequests, request, logRow) {
  const code = assetKey_(logRow[LOG.ASSET_CODE - 1]);
  if (!code) return false;
  const matches = formRequests.filter(candidate =>
    normalize_(candidate.name) === normalize_(logRow[LOG.APPLICANT - 1]) &&
    normalize_(candidate.department) === normalize_(logRow[LOG.DEPARTMENT - 1]) &&
    formatDate_(candidate.loanDate) === formatDate_(logRow[LOG.LOAN_DATE - 1]) &&
    formatDate_(candidate.returnDate) === formatDate_(logRow[LOG.DUE_DATE - 1]) &&
    extractAssetCodes_(candidate.equipment).map(assetKey_).indexOf(code) !== -1
  );
  return matches.length === 1 && requestId_(matches[0]) === requestId_(request);
}

function isCommittedBorrowLogRow_(row) {
  const status = normalize_(row[LOG.ASSET_STATUS - 1]);
  if (status === normalize_('Từ chối')) return false;
  if (status === normalize_('Đang mượn') || status === normalize_('Sẵn sàng') ||
      status === normalize_('Bảo trì') || status === normalize_('Mất/Hỏng') ||
      status === normalize_('Quá hạn')) return true;
  return Boolean(returnOutcome_(row[LOG.RETURN_DECISION - 1]) || row[LOG.RETURN_TIMESTAMP - 1]);
}

function canApproveBorrow_(form, row, approvalCol, request, assets, logState) {
  const issues = [];
  if (!isEmail_(request.email)) issues.push('chưa có email người đăng ký hợp lệ (bật thu thập email trong Google Form)');
  if (!assets.requestedCodes.length) issues.push('chưa có Mã thiết bị');
  if (assets.invalidCodes.length) issues.push('mã không tồn tại: ' + assets.invalidCodes.join(', '));
  const normalizedCodes = assets.requestedCodes.map(assetKey_);
  if (normalizedCodes.length !== [...new Set(normalizedCodes)].length) issues.push('danh sách mã thiết bị đang bị trùng');

  const quantity = Number(String(request.quantity || '').replace(/\D/g, ''));
  if (!quantity) issues.push('Số lượng chưa hợp lệ');
  else if (assets.items.length !== quantity) {
    issues.push('Số lượng (' + quantity + ') chưa khớp ' + assets.items.length + ' mã hợp lệ');
  }
  const state = logState || { existingCodes: Object.create(null), duplicateCodes: [] };
  if (state.duplicateCodes && state.duplicateCodes.length) {
    issues.push('đã có nhiều dòng Nhật ký cho mã của chính yêu cầu này: ' + state.duplicateCodes.join(', '));
  }
  const unavailable = assets.items.filter(asset => !state.existingCodes[assetKey_(asset.code)] && (
    normalize_(asset.status) !== normalize_('Sẵn sàng') ||
    normalize_(asset.availability) !== normalize_('Có thể mượn')
  ));
  if (unavailable.length) {
    issues.push('thiết bị chưa sẵn sàng: ' + unavailable.map(asset => {
      const details = [
        'trạng thái ' + (asset.status || 'chưa có'),
        'khả dụng ' + (asset.availability || 'chưa có')
      ];
      if (asset.borrower) details.push('người nhận ' + asset.borrower);
      if (asset.dueDate) details.push('hạn trả ' + formatDate_(asset.dueDate));
      return asset.code + ' (' + details.join(', ') + ')';
    }).join('; '));
  }

  const cell = approvalCol ? form.getRange(row, approvalCol) : null;
  if (!issues.length) {
    if (cell) cell.clearNote();
    return true;
  }
  const message = 'Chưa thể xác nhận cho mượn: ' + issues.join('. ') + '.';
  if (cell) {
    cell.setValue(PENDING);
    cell.setNote(message);
  }
  return false;
}

function setBorrowDecisionNote_(form, row, approvalCol, invalidCodes) {
  if (!approvalCol) return;
  const cell = form.getRange(row, approvalCol);
  if (invalidCodes && invalidCodes.length) {
    cell.setNote('Mã chưa tồn tại trong LIST SEP UP THIẾT BỊ: ' + invalidCodes.join(', ') + '.');
  } else {
    cell.clearNote();
  }
}

function findBorrowConfirmationTimestampColumn_(form, approvalCol) {
  if (!approvalCol) return 0;
  const headers = form.getRange(1, 1, 1, form.getLastColumn()).getDisplayValues()[0];
  // P is intentionally found to the right of O so it can never be confused with
  // column A's form-submission timestamp, even when its short header is identical.
  for (let i = approvalCol; i < headers.length; i++) {
    const header = normalize_(headers[i]);
    if (header === normalize_('Dấu Thời Gian Xác Nhận') ||
        header === normalize_('Dấu Thời Gian Duyệt') ||
        header === normalize_('Dấu Thời Gian')) return i + 1;
  }
  return 0;
}

function recordBorrowDecisionTimestamp_(form, row, approvalCol) {
  const timestampCol = findBorrowConfirmationTimestampColumn_(form, approvalCol);
  if (!timestampCol) return;
  form.getRange(row, timestampCol)
    .setValue(new Date())
    .setNumberFormat('dd/MM/yyyy HH:mm');
}

function findHeaderColumn_(sheet, aliases) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const targets = aliases.map(normalize_);
  for (let i = 0; i < headers.length; i++) if (targets.indexOf(normalize_(headers[i])) !== -1) return i + 1;
  return 0;
}

function getField_(headers, values, aliases) {
  const targets = aliases.map(normalize_);
  for (let i = 0; i < headers.length; i++) if (targets.indexOf(normalize_(headers[i])) !== -1) return values[i] || '';
  return '';
}

function getByContains_(headers, values, text) {
  const target = normalize_(text);
  for (let i = 0; i < headers.length; i++) if (normalize_(headers[i]).indexOf(target) !== -1) return values[i] || '';
  return '';
}

function setField_(sheet, row, headers, aliases, value) {
  const targets = aliases.map(normalize_);
  for (let i = 0; i < headers.length; i++) {
    if (targets.indexOf(normalize_(headers[i])) !== -1) {
      sheet.getRange(row, i + 1).setValue(value || '');
      return;
    }
  }
}

function requestId_(request) {
  return [stableRequestTimestamp_(request.timestamp), normalize_(request.email),
    extractAssetCodes_(request.equipment).map(assetKey_).join(',')].join('|');
}

function stableRequestTimestamp_(value) {
  if (value instanceof Date && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  }
  const text = String(value || '').trim();
  let match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2}:\d{2})$/);
  if (match) return match[3] + '-' + match[2] + '-' + match[1] + ' ' + match[4];
  match = text.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
  if (match) return match[1] + ' ' + match[2];
  return text;
}

function managerEmail_() {
  if (isEmail_(CONFIG.MANAGER_EMAIL)) return String(CONFIG.MANAGER_EMAIL).trim();
  const email = Session.getEffectiveUser().getEmail();
  return isEmail_(email) ? email : '';
}

function managerIdentity_() {
  const email = Session.getActiveUser().getEmail();
  return isEmail_(email) ? email : (managerEmail_() || 'Manager');
}

function uniqueJoin_(values) {
  return values.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join('\n');
}

function normalize_(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function formatDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  }
  const text = String(value || '').trim();
  // Form date answers are often stored as ISO text (yyyy-MM-dd), while
  // Sheet-backed log cells are Date objects. Convert both to one key/display
  // shape so matching is stable and idempotent across Form -> Log tracking.
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return iso[3] + '/' + iso[2] + '/' + iso[1];
  return text;
}

function formatDateTime_(value) {
  return Utilities.formatDate(value, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
}

function emailTemplate_(templateId) {
  const template = EMAIL_UI.TEMPLATES[templateId];
  if (!template) throw new Error('Không tìm thấy email template: ' + templateId);
  return template;
}

function emailPlainText_(templateId, data) {
  const template = emailTemplate_(templateId);
  const lines = [template.title, template.message, ''];
  template.groups.forEach(group => group.fields.forEach(field => {
    if (hasEmailValue_(data[field[1]])) lines.push(field[0] + ': ' + String(data[field[1]]));
  }));
  if (template.note && hasEmailValue_(data[template.note[1]])) lines.push(template.note[0] + ': ' + data[template.note[1]]);
  lines.push(template.summary + ': ' + template.badge);
  return lines.join('\n');
}

function emailHtml_(templateId, data) {
  const template = emailTemplate_(templateId);
  const theme = emailTheme_(template);
  const greeting = template.greeting || ('Dear ' + (data[template.greetingKey] || 'bạn'));
  const groupsHtml = emailGroupsHtml_(template, data, theme);
  const noteHtml = emailNoteHtml_(template, data, theme);
  const logo = theme.isDark ? EMAIL_UI.LOGO_DARK : EMAIL_UI.LOGO_LIGHT;
  const logoWidth = theme.isDark ? 142 : 168;

  return '<!doctype html><html><body style="margin:0;padding:0;background:' + theme.canvas + ';">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:' + theme.canvas + ';"><tr><td align="center" style="padding:22px 10px;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:' + theme.frameFallback + ';background-image:' + theme.frameBackground + ';border:1px solid ' + theme.frameBorder + ';border-radius:18px;font-family:Arial,Helvetica,sans-serif;color:' + theme.text + ';">' +
    '<tr><td align="center" style="padding:25px 26px 12px;"><img src="' + logo + '" width="' + logoWidth + '" alt="K Coffee" style="display:block;width:' + logoWidth + 'px;max-width:72%;height:auto;border:0;outline:none;text-decoration:none;"></td></tr>' +
    '<tr><td align="center" style="padding:4px 26px 0;"><span style="display:inline-block;width:40px;height:40px;line-height:40px;border-radius:50%;background:' + theme.statusSoft + ';color:' + template.statusColor + ';font-size:22px;font-weight:800;">' + (template.frame === 'reject' ? '!' : '&#10003;') + '</span></td></tr>' +
    '<tr><td align="center" style="padding:14px 26px 0;color:' + theme.text + ';font-size:22px;font-weight:800;line-height:28px;">' + escapeHtml_(template.title) + '</td></tr>' +
    '<tr><td align="center" style="padding:8px 28px 22px;color:' + theme.muted + ';font-size:13px;line-height:20px;">' + escapeHtml_(template.message) + '</td></tr>' +
    '<tr><td style="padding:0 18px 18px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:' + theme.surface + ';border:1px solid ' + theme.line + ';border-radius:13px;">' +
    '<tr><td style="padding:17px 17px 12px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="color:' + theme.text + ';font-size:15px;font-weight:800;line-height:20px;">Thông tin thiết bị</td><td align="right" style="padding-left:8px;"><span style="display:inline-block;background:' + template.statusColor + ';border-radius:7px;padding:6px 10px;color:#ffffff;font-size:10px;font-weight:800;line-height:12px;white-space:nowrap;">' + escapeHtml_(template.badge) + '</span></td></tr></table></td></tr>' +
    '<tr><td style="padding:0 17px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:' + theme.panel + ';border-radius:9px;">' + groupsHtml + '</table></td></tr>' +
    noteHtml +
    '<tr><td style="padding:15px 17px 17px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:' + theme.panel + ';border-radius:9px;"><tr><td style="padding:11px;color:' + theme.text + ';font-size:11px;font-weight:800;line-height:16px;">' + escapeHtml_(template.summary) + '</td><td align="right" style="padding:9px 11px;"><span style="display:inline-block;background:' + template.statusColor + ';border-radius:6px;padding:8px 10px;color:#ffffff;font-size:10px;font-weight:800;line-height:12px;white-space:nowrap;">' + escapeHtml_(template.badge) + '</span></td></tr></table></td></tr>' +
    '</table></td></tr>' +
    '<tr><td align="center" style="padding:0 22px 21px;color:' + theme.muted + ';font-size:10px;line-height:15px;">Email tự động từ hệ thống Quản lý Tài sản K Coffee.</td></tr>' +
    '</table></td></tr></table></body></html>';
}

function emailGroupsHtml_(template, data, theme) {
  return template.groups.map(group => {
    const rows = group.fields.map(field => emailFieldRow_(field[0], data[field[1]], theme)).filter(Boolean).join('');
    return rows ? '<tr><td style="padding:7px 11px;border-bottom:1px solid ' + theme.line + ';"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">' + rows + '</table></td></tr>' : '';
  }).filter(Boolean).join('');
}

function emailFieldRow_(label, value, theme) {
  if (!hasEmailValue_(value)) return '';
  return '<tr><td valign="top" style="width:43%;padding:4px 8px 4px 0;color:' + theme.muted + ';font-size:11px;font-weight:500;line-height:17px;">' +
    escapeHtml_(label) + ':</td><td valign="top" align="right" style="padding:4px 0;color:' + theme.text + ';font-size:11px;font-weight:800;line-height:17px;white-space:pre-line;">' +
    escapeHtml_(value) + '</td></tr>';
}

function emailNoteHtml_(template, data, theme) {
  if (!template.note || !hasEmailValue_(data[template.note[1]])) return '';
  return '<tr><td style="padding:12px 17px 0;"><div style="padding:10px 11px;border-radius:8px;background:' + theme.statusSoft + ';color:' + template.statusColor + ';font-size:11px;font-weight:800;line-height:17px;">' +
    escapeHtml_(template.note[0]) + ': ' + escapeHtml_(data[template.note[1]]) + '</div></td></tr>';
}

function emailTheme_(template) {
  const isDark = String(EMAIL_UI.THEME).toLowerCase() === 'dark';
  const frameColor = EMAIL_UI.FRAME_COLORS[template.frame] || EMAIL_UI.FRAME_COLORS.notice;
  if (isDark) {
    return {
      isDark: true, canvas: '#17191c', frameFallback: '#242424',
      frameBackground: 'linear-gradient(90deg,' + hexToRgba_(frameColor, 0.48) + ' 0%,#242424 92%)',
      frameBorder: hexToRgba_(frameColor, 0.62), panel: '#1b1b1b', surface: '#181818',
      text: '#f7f7f8', muted: '#a3a3a8', line: '#313136', statusSoft: hexToRgba_(template.statusColor, 0.13)
    };
  }
  const lightFrames = { reject: '#fffafa', accept: '#f7fcf8', notice: '#fbfcff' };
  return {
    isDark: false, canvas: '#e8ebee', frameFallback: lightFrames[template.frame] || '#fbfcff', frameBackground: 'none',
    frameBorder: frameColor, panel: '#ffffff', surface: '#f4f6f9', text: '#111827', muted: '#6b7280', line: '#e4e7ec',
    statusSoft: hexToRgba_(template.statusColor, 0.10)
  };
}

function hexToRgba_(hex, alpha) {
  const raw = String(hex || '').replace('#', '');
  const normalized = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
  const number = parseInt(normalized, 16);
  if (isNaN(number)) return 'rgba(0,0,0,' + alpha + ')';
  return 'rgba(' + ((number >> 16) & 255) + ',' + ((number >> 8) & 255) + ',' + (number & 255) + ',' + alpha + ')';
}

function hasEmailValue_(value) {
  return String(value == null ? '' : value).trim() !== '';
}

function escapeHtml_(value) {
  return String(value || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function isEmail_(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}
// force push
