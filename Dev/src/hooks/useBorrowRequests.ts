import {readAll} from '../services/workspaceTasks';
import {useWorkspaceRealtime} from './useWorkspaceRealtime';
import toast from "react-hot-toast";
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { transitionBorrowRequest } from '../services/borrowWorkflow';
import type { BorrowAction } from '../services/borrowWorkflow';
import { useAuthStore } from '../store/authStore';

export interface BorrowRequest {
  id: string;
  requester_id: number;
  asset_id: string;
  asset?: { id: string; name: string; asset_code: string; condition: string; status: string };
  requester?: { name: string };
  department?: { name: string };
  borrow_date: string;
  due_date: string;
  requested_at: string;
  purpose: string;
  approval_status: string;
  returned_at: string | null;
}

export function useBorrowRequests() {
  const profile = useAuthStore(state => state.profile);
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generation=useRef(0),loaded=useRef<number|undefined>(undefined);
  useEffect(()=>{loaded.current=undefined;setRequests([]);void fetchRequests();return()=>{generation.current++;};},[profile?.id,profile?.role]);
  useWorkspaceRealtime(['borrow_requests','assets'],()=>void fetchRequests(),profile?.id);

  const fetchRequests = async () => {
    const token=++generation.current;
    try {
      setLoading(loaded.current!==profile?.id);
      setError(null);
      if (!profile?.id) {
        setRequests([]);
        return;
      }
      let query = supabase
        .from('borrow_requests')
        .select(`
          id, asset_id, requester_id, borrow_date, due_date, requested_at, purpose, approval_status, returned_at,
          asset:asset_id(id, name, asset_code, condition, status),
          requester:requester_id(name),
          department:department_id(name)
        `)
        .order('requested_at', { ascending: false });
      if (!['admin', 'manager'].includes(profile.role)) query = query.eq('requester_id', profile.id);
      const data=await readAll(query.order('id'));
      if(token===generation.current){loaded.current=profile?.id;setRequests(data as any);}
    } catch (err) {
      console.error('Error fetching borrow requests', err);
      if(token===generation.current){setError(err instanceof Error?err.message:'Không tải được yêu cầu mượn.');setRequests([]);}
    } finally {
      if(token===generation.current)setLoading(false);
    }
  };

  const updateStatus = async (id: string, action: BorrowAction): Promise<boolean> => {
    setBusyId(id);
    try {
      await transitionBorrowRequest(id, action, useAuthStore.getState().profile);
      toast.success(action === 'approve' ? 'Đã duyệt yêu cầu mượn.' : action === 'reject' ? 'Đã từ chối và mở lại thiết bị.' : 'Đã xác nhận trả thiết bị.');
      await fetchRequests();
      return true;
    } catch (err) {
      console.error('Update err', err);
      toast.error(err instanceof Error ? err.message : 'Không cập nhật được yêu cầu.');
      await fetchRequests();
      return false;
    } finally {
      setBusyId(null);
    }
  };

  return { requests:loaded.current===profile?.id?requests:[], loading, error, busyId, updateStatus, refetch: fetchRequests };
}
