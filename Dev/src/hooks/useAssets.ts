import { useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import {readAll} from '../services/workspaceTasks';
import {useWorkspaceRealtime} from './useWorkspaceRealtime';

export interface Asset {
  id: string;
  asset_code: string;
  name: string;
  condition: string;
  location: string;
  status: string;
  is_available?: boolean;
  due_date?: string | null;
  category?: { name: string; icon: string };
  current_borrower?: { name: string; department?: { name: string } };
  pending_requester?: { name: string };
}

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const actor=useAuthStore(state=>state.profile?.id);
  const generation=useRef(0),loaded=useRef<number|undefined>(undefined);
  useEffect(()=>{loaded.current=undefined;setAssets([]);void fetchAssets();return()=>{generation.current++;};},[actor]);
  useWorkspaceRealtime(['assets','borrow_requests'],()=>void fetchAssets(),actor);

  const fetchAssets = async () => {
    const token=++generation.current;
    try {
      setLoading(loaded.current!==actor);
      setError(null);

      if(!actor){setAssets([]);return;}
      const [assetRows, requestRows] = await Promise.all([
        readAll(supabase.from('assets')
          .select('id, asset_code, name, condition, location, status, is_available, category:category_id(name, icon)')
          .order('created_at', { ascending: false }).order('id')),
        readAll(supabase.from('borrow_requests')
          .select('asset_id, due_date, requested_at, approval_status, requester:requester_id(name)')
          .in('approval_status', ['pending', 'approved']).is('returned_at', null)
          .order('requested_at', { ascending: false }).order('id')),
      ]);

      const openRequests = requestRows as unknown as Array<{
        asset_id: string;
        due_date: string;
        requested_at: string;
        approval_status: string;
        requester: { name: string } | null;
      }>;
      
      const mappedData = assetRows.map(asset => {
        const requests = openRequests.filter(request => request.asset_id === asset.id);
        const activeRequest = requests.find(r => r.approval_status === 'approved');
        const pendingRequest = requests.find(r => r.approval_status === 'pending');
        return {
          ...asset,
          status: activeRequest ? 'borrowed' : pendingRequest ? 'reserved' : asset.status,
          is_available: !activeRequest && !pendingRequest && asset.is_available,
          current_borrower: activeRequest ? { name: activeRequest.requester?.name || 'Không rõ' } : undefined,
          pending_requester: pendingRequest ? { name: pendingRequest.requester?.name || 'Không rõ' } : undefined,
          due_date: activeRequest?.due_date || null,
        };
      });
      if(token===generation.current){loaded.current=actor;setAssets(mappedData as any);}

    } catch (err: any) {
      console.warn('Error fetching assets', err);
      if(token===generation.current){setAssets([]);setError(err.message||'Không tải được kho thiết bị.');}
    } finally {
      if(token===generation.current)setLoading(false);
    }
  };

  return { assets:loaded.current===actor?assets:[], loading, error, refetch: fetchAssets };
}
