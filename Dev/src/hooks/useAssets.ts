import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

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
      const { data, error } = await supabase
        .from('assets')
        .select(`
          id, asset_code, name, condition, location, status,
          category:category_id(name, icon)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets(data as any);
    } catch (err) {
      console.error('Error fetching assets', err);
    } finally {
      setLoading(false);
    }
  };

  return { assets, loading, refetch: fetchAssets };
}
