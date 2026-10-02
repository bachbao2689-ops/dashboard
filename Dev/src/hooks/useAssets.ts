import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import mockData from '../data/mock_generated.json';
import toast from 'react-hot-toast';

export interface Asset {
  id: string;
  asset_code: string;
  name: string;
  condition: string;
  location: string;
  status: string;
  category?: { name: string; icon: string };
  current_borrower?: { name: string; department?: { name: string } };
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('assets')
        .select(`
          id, asset_code, name, condition, location, status,
          category:category_id(name, icon)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets(data as any);
    } catch (err: any) {
      console.warn('Error fetching assets', err);
      // OFFLINE FALLBACK TO IMPORTED GOOGLE SHEETS
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
      setError(err.message || 'Offline Mode');
      toast.error('Offline Mode: Loaded Assets from Google Sheets');
    } finally {
      setLoading(false);
    }
  };

  return { assets, loading, error, refetch: fetchAssets };
}
