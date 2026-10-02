import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

export type UserRole = 'admin' | 'manager' | 'team_lead' | 'staff' | 'viewer';
export type UserStatus = 'active' | 'pending' | 'suspended';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  avatar_url: string | null;
}

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch members');
    } finally {
      setLoading(false);
    }
  }, []);

  const inviteMember = async (memberData: { email: string; name: string; role: UserRole }) => {
    try {
      const { error } = await supabase.from('users').insert([{
        ...memberData,
        status: 'pending',
        created_at: new Date().toISOString()
      }]);
      
      if (error) throw error;
      
      toast.success('Member invited successfully');
      fetchMembers();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to invite member');
      return false;
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
