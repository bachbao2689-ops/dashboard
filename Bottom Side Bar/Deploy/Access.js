/** Shared server authorization; UI visibility never grants write permission. */
function hubNorm_(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').trim().toLowerCase();
}
function hubDepartmentKey_(value) {
  const key = hubNorm_(value);
  return ['desgin', 'design', 'design team'].includes(key) ? 'design' : key;
}
function hubDepartmentMatches_(value, department) {
  return Boolean(department) && String(value || '').split(/[,;\n]/).some(part => hubDepartmentKey_(part) === hubDepartmentKey_(department));
}
function hubActor_(email, taskSs) {
  const user = managerUniqueUserByEmail_(managerReadUsers_(taskSs || SpreadsheetApp.openById(TASK_HUB.SPREADSHEET_ID)), email);
  if (!user || user.active === false) throw new Error('Tài khoản chưa đăng ký hoặc đã ngưng hoạt động.');
  const role = hubNorm_(user.role);
  return {user: user, role: role, global: ['admin','giam doc','director','ceo'].includes(role), lead: /(^|\s)(lead|leader|manager)(\s|$)/.test(role) || /quan ly|truong phong/.test(role)};
}
function hubAssertAssetManager_(actor) {
  if (!actor.global && !(actor.lead && hubDepartmentKey_(actor.user.department) === 'design')) throw new Error('Chỉ ADMIN, Giám đốc hoặc Lead Design được duyệt tài sản.');
}
function hubAssertTaskAccess_(actor, task, fields) {
  if (!actor.global && !hubDepartmentMatches_(task.department, actor.user.department)) throw new Error('Task này thuộc phòng ban khác.');
  if (actor.global || actor.lead) return;
  const assigned = String(task.pic || '').split(/[,;\n]/).some(pic => hubNorm_(pic) === hubNorm_(actor.user.pic));
  if (!assigned || fields.some(field => field !== 'status')) throw new Error('Chỉ quản lý được sửa nội dung; PIC chỉ được cập nhật trạng thái task của mình.');
}
function hubTaskRow_(sheet, payload) {
  const width = sheet.getLastColumn();
  const headers = sheet.getRange(1,1,1,width).getDisplayValues()[0];
  const idCol = headers.findIndex(header => hubNorm_(header) === 'id' || hubNorm_(header) === 'task id');
  if (idCol < 0) throw new Error('Thiếu cột ID Task.');
  let row = Number(payload.row);
  if (!payload.row) {
    const count = Math.max(0, sheet.getLastRow() - TASK_HUB.DATA_START + 1);
    const ids = count ? sheet.getRange(TASK_HUB.DATA_START,idCol+1,count,1).getDisplayValues() : [];
    const matches = ids.map((cells,index) => String(cells[0]) === String(payload.id) ? index + TASK_HUB.DATA_START : 0).filter(Boolean);
    if (matches.length !== 1) throw new Error('Mã Task không duy nhất hoặc không tồn tại. Hãy đồng bộ và chọn đúng dòng.');
    row = matches[0];
  }
  if (!Number.isInteger(row) || row < TASK_HUB.DATA_START || row > sheet.getLastRow()) throw new Error('Dòng task không hợp lệ.');
  const values = sheet.getRange(row,1,1,width).getValues()[0];
  if (String(values[idCol]) !== String(payload.id)) throw new Error('Task đã di chuyển. Hãy đồng bộ lại.');
  return {row:row, headers:headers, values:values};
}
