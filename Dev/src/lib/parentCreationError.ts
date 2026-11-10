/** PostgREST errors are plain objects, not necessarily Error instances. */
export function parentCreationError(error: unknown): string {
 const e=error as {code?:string;message?:string}|null;
 if(e?.code==='42501')return 'Không có quyền tạo với phòng ban hoặc PIC đã chọn. Hãy chọn người phụ trách trong phạm vi được giao.';
 if(['23502','23514','22P02','22007','22008'].includes(e?.code||''))return 'Thông tin tạo mới chưa hợp lệ. Kiểm tra tên, ngày, phòng ban và người phụ trách.';
 if(error instanceof Error&&error.message)return error.message;
 return 'Chưa thể tạo mới. Vui lòng thử lại; nếu lỗi còn xảy ra, liên hệ Admin.';
}
