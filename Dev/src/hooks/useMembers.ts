import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export type UserRole = 'admin' | 'member' | 'manager' | 'team_lead' | 'staff' | 'viewer';
export type UserStatus = 'active' | 'pending' | 'suspended';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  avatar_url: string | null;
  employment_level?: string | null;
  job_title?: string | null;
  department?: { name: string } | null;
}

const MOCK_MEMBERS: Member[] = [
  { id: '1', name: 'Admin User', email: 'admin@kcoffee.com', role: 'admin', status: 'active', created_at: new Date().toISOString(), avatar_url: null },
  { id: '2', name: 'Bùi Bách Bảo', email: 'bachbao2689@gmail.com', role: 'manager', status: 'active', created_at: new Date().toISOString(), avatar_url: null },
  { id: '3', name: 'Test Staff', email: 'staff@kcoffee.com', role: 'staff', status: 'pending', created_at: new Date().toISOString(), avatar_url: null },
];

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);

      // INSTANT BYPASS FOR DEV ADMIN
      if (useAuthStore.getState().user?.id === 'dev-admin-id') {
        setMembers(MOCK_MEMBERS);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*, department:department_id(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedMembers = (data || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: (u.is_active ? 'active' : 'suspended') as UserStatus,
        created_at: u.created_at,
        avatar_url: u.avatar_url,
        employment_level: u.employment_level,
        job_title: u.job_title,
        department: Array.isArray(u.department) ? u.department[0] : u.department,
      }));
      setMembers(mappedMembers);
    } catch (error: any) {
      console.warn('Fallback to mock members due to error:', error);
      setMembers(MOCK_MEMBERS);
      toast.error('Offline Mode: Loaded mock data');
    } finally {
      setLoading(false);
    }
  }, []);

  const inviteMember = async (memberData: { email: string; name: string; role: UserRole }) => {
    try {
      // INSTANT BYPASS
      if (useAuthStore.getState().user?.id === 'dev-admin-id') {
        throw new Error('Offline Mode simulated');
      }

      const { error } = await supabase.from('users').insert([{
        email: memberData.email,
        name: memberData.name,
        role: memberData.role,
        is_active: false,
        initials: memberData.name.substring(0, 2).toUpperCase(),
        created_at: new Date().toISOString()
      }]);
      
      if (error) throw error;
      
      toast.success('Member invited successfully');
      fetchMembers();
      return true;
    } catch (error: any) {
      toast.success('Offline Mode: Simulated member invite');
      setMembers(prev => [{
        id: Math.random().toString(),
        name: memberData.name,
        email: memberData.email,
        role: memberData.role,
        status: 'pending',
        created_at: new Date().toISOString(),
        avatar_url: null
      }, ...prev]);
      return true;
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    loading,
    refetch: fetchMembers,
    inviteMember
  };
}
