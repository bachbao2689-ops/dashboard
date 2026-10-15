import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import {useWorkspaceRealtime} from './useWorkspaceRealtime';
import toast from 'react-hot-toast';

export type UserRole = 'admin' | 'member' | 'manager' | 'leader';
export type UserStatus = 'active' | 'removed';

export interface DepartmentOption { id: string; name: string }

export interface Member {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  avatar_url: string | null;
  employment_level: string | null;
  job_title: string | null;
  department: { name: string } | null;
  department_id: string | null;
}

export interface NewMember {
  email: string;
  name: string;
  role: UserRole;
  department_id: string;
  job_title: string;
}

const initialsFromName = (name: string) => name.trim().split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const [usersResult, departmentsResult] = await Promise.all([
        supabase.from('users').select('id,name,email,role,is_active,created_at,avatar_url,employment_level,job_title,department_id').order('created_at', { ascending: false }),
        supabase.from('departments').select('id,name').order('name'),
      ]);
      if (usersResult.error) throw usersResult.error;
      if (departmentsResult.error) throw departmentsResult.error;

      const departmentOptions = (departmentsResult.data || []) as DepartmentOption[];
      const names = new Map(departmentOptions.map(department => [department.id, department.name]));
      setDepartments(departmentOptions);
      setMembers((usersResult.data || []).map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as UserRole,
        status: user.is_active ? 'active' : 'removed',
        created_at: user.created_at,
        avatar_url: user.avatar_url,
        employment_level: user.employment_level,
        job_title: user.job_title,
        department_id: user.department_id,
        department: user.department_id ? { name: names.get(user.department_id) || 'Chưa cập nhật team' } : null,
      })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không tải được danh sách thành viên');
    } finally {
      setLoading(false);
    }
  }, []);

  const requireManager = () => {
    const profile = useAuthStore.getState().profile;
    if (!profile || !(profile.role === 'admin' || profile.employment_level === 'manager' || (profile.role === 'manager' && profile.employment_level !== 'Leader'))) {
      throw new Error('Bạn không có quyền quản lý thành viên');
    }
    return profile;
  };

  const addMember = async (memberData: NewMember) => {
    try {
      const profile = requireManager();
      const name = memberData.name.trim();
      const email = memberData.email.trim().toLowerCase();
      if (!name || !email || !memberData.department_id) throw new Error('Vui lòng nhập tên, email và phòng ban');
      if (!departments.some(department => department.id === memberData.department_id)) throw new Error('Phòng ban không hợp lệ');
      if (memberData.role === 'admin' && profile.role !== 'admin') throw new Error('Chỉ Admin được thêm Admin');

      const { data: existing, error: lookupError } = await supabase.from('users').select('id,is_active').ilike('email', email).maybeSingle();
      if (lookupError) throw lookupError;
      if (existing) throw new Error(existing.is_active ? 'Email này đã có trong danh sách thành viên' : 'Email này đã bị xóa. Hãy khôi phục thành viên trong bộ lọc Đã xóa.');

      const { data, error } = await supabase.from('users').insert({
        name, email, role: memberData.role, department_id: memberData.department_id,
        job_title: memberData.job_title.trim() || null,
        employment_level: memberData.role === 'member' ? 'Nhân viên' : memberData.role === 'admin' ? 'ADMIN' : 'Leader',
        initials: initialsFromName(name), is_active: true,
      }).select('id').single();
      if (error) throw error;
      if (!data) throw new Error('Không xác nhận được hồ sơ đã tạo');
      await fetchMembers();
      toast.success('Đã thêm thành viên');
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thêm được thành viên');
      return false;
    }
  };

  const setMemberRemoved = async (member: Member, removed: boolean) => {
    try {
      const profile = requireManager();
      if (member.id === profile.id) throw new Error('Bạn không thể xóa tài khoản của mình');
      if (member.role === 'admin' && profile.role !== 'admin') throw new Error('Chỉ Admin được quản lý Admin');
      if (removed && member.role === 'admin' && members.filter(item => item.role === 'admin' && item.status === 'active').length <= 1) {
        throw new Error('Không thể xóa Admin cuối cùng');
      }
      const { data, error } = await supabase.from('users').update({ is_active: !removed })
        .eq('id', member.id).eq('is_active', removed).select('id').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Trạng thái thành viên đã thay đổi. Hãy tải lại trang.');
      await fetchMembers();
      toast.success(removed ? 'Đã xóa thành viên khỏi danh sách' : 'Đã khôi phục thành viên');
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không cập nhật được thành viên');
      return false;
    }
  };

  useEffect(() => { void fetchMembers(); }, [fetchMembers]);
  const actor=useAuthStore(state=>state.profile?.id);
  useWorkspaceRealtime(['users','departments'],fetchMembers,actor);

  return { members, departments, loading, refetch: fetchMembers, addMember, setMemberRemoved };
}
