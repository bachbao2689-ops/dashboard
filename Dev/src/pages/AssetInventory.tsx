import React, { useState } from 'react';
import { Plus, Search, MoreHorizontal, Camera, Laptop, HardDrive, Box } from 'lucide-react';
import { useAssets } from '../hooks/useAssets';
import { AssetModal } from '../components/features/assets/AssetModal';
import { AssetDetailPanel } from '../components/features/assets/AssetDetailPanel';
import { AssetQRCodeModal } from '../components/features/assets/AssetQRCodeModal';
import { QrCode } from 'lucide-react';

const getIcon = (cat: string | undefined) => {
  if (!cat) return <Box size={16} className="text-gray-500" />;
  const c = cat.toLowerCase();
  if (c.includes('camera') || c.includes('lens')) return <Camera size={16} className="text-primary" />;
  if (c.includes('laptop')) return <Laptop size={16} className="text-blue-500" />;
  if (c.includes('storage')) return <HardDrive size={16} className="text-emerald-500" />;
  return <Box size={16} className="text-gray-500" />;
};

export const AssetInventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [qrAsset, setQrAsset] = useState<any>(null);
  const { assets, loading, refetch } = useAssets();

  const handleNewAsset = () => {
    setIsModalOpen(true);
  };

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.asset_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-100px)] flex -mx-4 md:-mx-8 px-4 md:px-8 z-10 relative">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden pr-0 lg:pr-4">
      <AssetModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={refetch} 
      />
      
      <div className="flex justify-between items-center mb-6 px-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Asset Inventory</h2>
        <div className="flex gap-3">
          <div className="relative group hidden sm:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
            <input 
              type="text" 
              placeholder="Search assets..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-white/60 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-gray-100"
            />
          </div>
          <button onClick={handleNewAsset} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
            <Plus size={16} /> <span className="hidden sm:inline">Add Asset</span>
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden border border-white/50 dark:border-gray-700/50 flex-1">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset Code</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Condition</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading assets...</td></tr>
              ) : filteredAssets.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No assets found</td></tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} onClick={() => setSelectedAsset(asset)} className="hover:bg-white/40 dark:hover:bg-gray-800/40 transition-colors group cursor-pointer">
                    <td className="p-4">
                      <span className="font-mono text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700">{asset.asset_code}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                          {getIcon(asset.category?.name)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-200">{asset.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{asset.category?.name || 'Uncategorized'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-600 dark:text-gray-300">{asset.condition || 'N/A'}</span>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{asset.location || 'N/A'}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                        ${asset.status === 'available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' : 
                          asset.status === 'borrowed' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50' : 
                          'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${asset.status === 'available' ? 'bg-emerald-500' : asset.status === 'borrowed' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                        {asset.status === 'available' ? 'Available' : asset.status === 'borrowed' ? 'Borrowed' : 'Maintenance'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); setQrAsset(asset); }} className="p-2 text-primary hover:text-primary/80 transition-colors rounded-lg hover:bg-primary/10" title="View QR Code">
                          <QrCode size={18} />
                        </button>
                        <button onClick={(e) => e.stopPropagation()} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                          <MoreHorizontal size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    
      </div>
      <AssetDetailPanel asset={selectedAsset} isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)} />
      <AssetQRCodeModal asset={qrAsset} isOpen={!!qrAsset} onClose={() => setQrAsset(null)} />
</div>
  );
};
