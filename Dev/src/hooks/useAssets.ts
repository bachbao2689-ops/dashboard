import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import mockData from '../data/mock_generated.json';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    fetchAssets();
    
    const channel = supabase
      .channel('assets_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => {
        fetchAssets();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'borrow_requests' }, () => { fetchAssets(); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError(null);

      // INSTANT BYPASS FOR DEV ADMIN
      if (useAuthStore.getState().user?.id === 'dev-admin-id') {
        const mapped = mockData.assets.map((a: any) => ({
          id: a.id,
          asset_code: a.asset_ref || a.id,
          name: a.name,
          condition: 'good',
          location: 'Kho tổng',
          status: 'available',
          category: { name: 'Thiết bị', icon: 'Box' }
        }));
        setAssets(mapped as any);
        setError('Instant Offline Mode');
        return;
      }

      const [assetResult, requestResult] = await Promise.all([
        supabase.from('assets')
          .select('id, asset_code, name, condition, location, status, is_available, category:category_id(name, icon)')
          .order('created_at', { ascending: false }),
        supabase.from('borrow_requests')
          .select('asset_id, due_date, requested_at, approval_status, requester:requester_id(name)')
          .in('approval_status', ['pending', 'approved']).is('returned_at', null)
          .order('requested_at', { ascending: false }),
      ]);

      if (assetResult.error) throw assetResult.error;
      if (requestResult.error) throw requestResult.error;
      const openRequests = (requestResult.data || []) as unknown as Array<{
        asset_id: string;
        due_date: string;
        requested_at: string;
        approval_status: string;
        requester: { name: string } | null;
      }>;
      
      const mappedData = (assetResult.data as any[]).map(asset => {
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
      setAssets(mappedData as any);

    } catch (err: any) {
      console.warn('Error fetching assets', err);
      setAssets([]);
      setError(err.message || 'Không tải được kho thiết bị.');
      toast.error('Không tải được kho thiết bị từ Supabase.');
    } finally {
      setLoading(false);
    }
  };

  return { assets, loading, error, refetch: fetchAssets };
}
