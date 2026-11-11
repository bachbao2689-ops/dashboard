import type {SupabaseClient} from '@supabase/supabase-js';
import {isAdmin} from '../lib/roleScope.ts';

type Client = Pick<SupabaseClient, 'from' | 'rpc'>;
type Actor = {id: number; role: string; employment_level: string | null; is_active: boolean};
export type MemberAccess = {role: 'admin' | 'manager' | 'leader' | 'member'; department_id: string; job_title: string};
const initials = (name: string) => name.split(/\s+/).filter(Boolean).map(word => word[0]).join('').slice(0,2).toUpperCase();

export function memberPermissionId(value: string | null): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const id=Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export async function createMemberProfile(client: Client, input: {name: string; email: string}): Promise<number> {
  const name=input.name.trim(), email=input.email.trim().toLowerCase();
  if (!name || name.length>120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254)
    throw Error('Vui lòng nhập tên và email hợp lệ');
  // Escape ILIKE wildcards: an underscore in an email is a literal character.
  const pattern=email.replace(/[\\%_]/g, value=>'\\'+value);
  const existing=await client.from('users').select('id,is_active').ilike('email',pattern).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) throw Error(existing.data.is_active ? 'Email này đã có trong danh sách thành viên' : 'Email này đã bị xóa. Hãy khôi phục thành viên trong bộ lọc Đã xóa.');
  const result=await client.from('users').insert({
    name,email,initials:initials(name),role:'member',employment_level:'Nhân viên',
    department_id:null,job_title:null,is_active:true,
  }).select('id').single();
  if (result.error) throw result.error;
  const id=memberPermissionId(String(result.data?.id || ''));
  if (!id) throw Error('Không xác nhận được hồ sơ đã tạo');
  return id;
}

export async function saveMemberAccess(client: Client, actor: Actor, target: {id: number; role: string}, input: MemberAccess, departmentIds: string[]) {
  if (!actor.is_active || !isAdmin(actor)) throw Error('Chỉ Admin được phân quyền tài khoản');
  if (actor.id===target.id) throw Error('Bạn không thể thay đổi quyền tài khoản của mình');
  if (!['admin','manager','leader','member'].includes(input.role)) throw Error('Vai trò không hợp lệ');
  if ((input.department_id && !departmentIds.includes(input.department_id)) ||
      (!input.department_id && !['admin','manager'].includes(input.role))) throw Error('Vui lòng chọn phòng ban hợp lệ');
  const title=input.job_title.trim();
  if (title.length>120) throw Error('Chức danh tối đa 120 ký tự');
  const result=await client.rpc('account_set_member_permissions', {
    p_member_id:target.id,p_role:input.role,p_department_id:input.department_id || null,p_job_title:title || null,
  });
  if (result.error) throw result.error;
  if (Number(result.data)!==target.id) throw Error('Không lưu được quyền. Tài khoản hoặc quyền quản lý đã thay đổi; hãy tải lại trang.');

}
