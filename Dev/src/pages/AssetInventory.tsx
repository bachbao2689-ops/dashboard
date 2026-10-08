import React, { useState } from 'react';
import { useTranslation } from '../i18n/translations';
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
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
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
    <div className="h-full flex z-10 relative">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden pr-0 lg:pr-4">
      <AssetModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={refetch} 
      />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-2 relative z-50">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Asset Inventory</h2>
        
        <div className="flex flex-nowrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className={`flex items-center transition-all duration-300 ${isSearchExpanded ? 'w-48 sm:w-64' : 'w-10'} bg-white dark:bg-slate-800 border border-gray-200 dark:border-[#8fa8d0] rounded-xl overflow-hidden shadow-sm h-8 sm:h-10`}>
            <button onClick={() => setIsSearchExpanded(!isSearchExpanded)} className="w-8 h-8 sm:w-10 sm:h-8 sm:h-10 flex items-center justify-center text-gray-500 hover:text-primary transition-colors flex-shrink-0">
              <Search className="w-5 h-5" />
            </button>
            <input
              type="text"
              placeholder={t("assets.search")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-gray-700 dark:text-gray-300 pr-3 transition-opacity duration-300 ${isSearchExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            />
          </div>
          
          <button onClick={handleNewAsset} className="flex items-center gap-1 sm:gap-2 h-8 sm:h-8 sm:h-10 px-3 sm:px-4 bg-[#002e6d] flex-shrink-0 hover:bg-[#001f4d] text-white rounded-xl text-sm font-semibold transition-all shadow-sm">
            <Plus size={18} /> <span className="hidden sm:inline">Add Asset</span>
          </button>
        </div>
      </div>

      <div className="card-hub rounded-2xl overflow-hidden flex-1 shadow-sm">
        <div className="overflow-x-auto h-full">
          <table className="w-full min-w-max text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[#8fa8d0]">
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset Code</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Condition</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#8fa8d0]/50">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading assets...</td></tr>
              ) : filteredAssets.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No assets found</td></tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} onClick={() => setSelectedAsset(asset)} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer">
                    <td className="p-4">
                      <span className="font-mono text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-md border border-gray-200 dark:border-[#8fa8d0]">{asset.asset_code}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-[#8fa8d0]">
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
                        {asset.status === 'available' ? 'Active' : asset.status === 'borrowed' ? 'Borrowed' : 'Maintenance'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); setQrAsset(asset); }} className="p-2 text-primary hover:text-primary/80 transition-colors rounded-lg hover:bg-primary/10" title="View QR Code">
                          <QrCode size={18} />
                        </button>
                        <button onClick={(e) => e.stopPropagation()} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
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
