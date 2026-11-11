import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import {useWorkspaceRealtime} from './useWorkspaceRealtime';
import toast from 'react-hot-toast';
import {isAdmin} from '../lib/roleScope';
import {createMemberProfile, saveMemberAccess, type MemberAccess} from '../services/memberAccounts';

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
}


export function useMembers() {
  const profile = useAuthStore(state => state.profile);
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedProfileId, setLoadedProfileId] = useState<number | null>(null);
  const request = useRef(0);

  const fetchMembers = useCallback(async () => {
    const token = ++request.current;
    setLoading(true);
    try {
      if (!profile) { setMembers([]); setDepartments([]); setLoadedProfileId(null); return; }
      const usersQuery = supabase.from('users').select('id,name,email,role,is_active,created_at,avatar_url,employment_level,job_title,department_id').order('created_at', { ascending: false });
      const departmentsQuery = supabase.from('departments').select('id,name').order('name');
      const [usersResult, departmentsResult] = await Promise.all([
        usersQuery,
        departmentsQuery,
      ]);
      if (usersResult.error) throw usersResult.error;
      if (departmentsResult.error) throw departmentsResult.error;
      if (token !== request.current) return;

      const departmentOptions = (departmentsResult.data || []) as DepartmentOption[];
      const names = new Map(departmentOptions.map(department => [department.id, department.name]));
      setDepartments(departmentOptions);
      setMembers((usersResult.data || []).map(user => ({
        id: user.id, name: user.name, email: user.email, role: user.role as UserRole,
        status: user.is_active ? 'active' : 'removed', created_at: user.created_at,
        avatar_url: user.avatar_url, employment_level: user.employment_level, job_title: user.job_title,
        department_id: user.department_id,
        department: user.department_id ? {name: names.get(user.department_id) || 'Chưa cập nhật team'} : null,
      })));
      setLoadedProfileId(profile.id);
    } catch (error) {
      if (token === request.current) toast.error(error instanceof Error ? error.message : 'Không tải được danh sách thành viên');
    } finally {
      if (token === request.current) setLoading(false);
    }
  }, [profile?.id, profile?.role, profile?.employment_level, profile?.department_id]);

  const requireAdmin = () => {
    const profile = useAuthStore.getState().profile;
    const original=useAuthStore.getState().originalProfile;
    if (original && original.id!==profile?.id) throw new Error('Khôi phục tài khoản Admin gốc trước khi quản lý thành viên');
    if (!profile || !profile.is_active || !isAdmin(profile)) {
      throw new Error('Chỉ Admin được quản lý tài khoản thành viên');
    }
    return profile;
  };

  const actionError = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message;
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.trim()) {
      const code = 'code' in error && typeof error.code === 'string' ? ` (${error.code})` : '';
      return `${error.message}${code}`;
    }
    return fallback;
  };

  const addMember = async (memberData: NewMember): Promise<number | null> => {
    try {
      requireAdmin();
      const id=await createMemberProfile(supabase,memberData);
      await fetchMembers();
      toast.success('Đã tạo hồ sơ. Tiếp tục phân quyền.');
      return id;
    } catch (error) {
      toast.error(actionError(error, 'Không thêm được thành viên'));
      return null;
    }
  };

  const updateMemberAccess = async (member: Member, access: MemberAccess): Promise<boolean> => {
    try {
      const actor=requireAdmin();
      await saveMemberAccess(supabase,actor,member,access,departments.map(department=>department.id));
      await fetchMembers();
      toast.success('Đã lưu phân quyền');
      return true;
    } catch (error) {
      toast.error(actionError(error, 'Không lưu được phân quyền'));
      return false;
    }
  };

  const setMemberRemoved = async (member: Member, removed: boolean) => {
    try {
      const profile = requireAdmin();
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
      toast.error(actionError(error, 'Không cập nhật được thành viên'));
      return false;
    }
  };

  useEffect(() => { void fetchMembers(); return () => { request.current++; }; }, [fetchMembers]);
  const actor=useAuthStore(state=>state.profile?.id);
  useWorkspaceRealtime(['users','departments'],fetchMembers,actor);

  return { members: loadedProfileId === profile?.id ? members : [], departments: loadedProfileId === profile?.id ? departments : [], loading: loading || loadedProfileId !== profile?.id, refetch: fetchMembers, addMember, updateMemberAccess, setMemberRemoved };
}
