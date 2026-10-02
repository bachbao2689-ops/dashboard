import toast from "react-hot-toast";
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export interface BorrowRequest {
  id: string;
  asset?: { name: string };
  requester?: { name: string };
  department?: { name: string; color?: string };
  borrow_date: string;
  due_date: string;
  requested_at: string;
  purpose: string;
  approval_status: string;
}

export function useBorrowRequests() {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
    
    const channel = supabase
      .channel('borrow_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'borrow_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('borrow_requests')
        .select(`
          id, borrow_date, due_date, requested_at, purpose, approval_status,
          asset:asset_id(name),
          requester:requester_id(name),
          department:department_id(name)
        `)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests(data as any);
    } catch (err) {
      console.error('Error fetching borrow requests', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await supabase
        .from('borrow_requests')
        .update({ approval_status: status })
        .eq('id', id);
      toast.success('Request updated');
    } catch (err) {
      console.error('Update err', err);
      toast.error('Failed to update request');
    }
  };

  return { requests, loading, updateStatus, refetch: fetchRequests };
}
