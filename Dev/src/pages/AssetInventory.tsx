import React, { useState } from 'react';
import { useTranslation } from '../i18n/translations';
import { Plus, Search, Camera, Laptop, HardDrive, Box } from 'lucide-react';
import { useAssets } from '../hooks/useAssets';
import { AssetModal } from '../components/features/assets/AssetModal';
import { AssetDetailPanel } from '../components/features/assets/AssetDetailPanel';
import { AssetQRCodeModal } from '../components/features/assets/AssetQRCodeModal';
import { BorrowDrawer } from '../components/features/assets/BorrowDrawer';

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

  const [cart, setCart] = useState<any[]>([]);
  const [isBorrowDrawerOpen, setIsBorrowDrawerOpen] = useState(false);
  const [bounce, setBounce] = useState(false);

  const toggleCart = (asset: any) => {
    if (asset.status !== "available" && !cart.find(a => a.id === asset.id)) return;
    if (cart.find(a => a.id === asset.id)) {
      setCart(cart.filter(a => a.id !== asset.id));
    } else {
      setCart([...cart, asset]);
      setBounce(true);
      setTimeout(() => setBounce(false), 300);
    }
  };


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
          <div className={`flex items-center transition-all duration-300 ${isSearchExpanded ? 'w-48 sm:w-64' : 'w-10'} bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm h-8 sm:h-10`}>
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
          
          
          <button onClick={() => setIsBorrowDrawerOpen(true)} className={`relative flex items-center gap-1 sm:gap-2 h-8 sm:h-10 px-3 sm:px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all shadow-sm ${bounce ? '-translate-y-1' : ''}`}>
            <Box size={18} /> <span className="hidden sm:inline">Mượn thiết bị</span>
            {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm animate-bounce-short">{cart.length}</span>}
          </button>
          <button onClick={handleNewAsset} className="flex items-center gap-1 sm:gap-2 h-8 sm:h-10 px-3 sm:px-4 bg-[#002e6d] flex-shrink-0 hover:bg-[#001f4d] text-white rounded-xl text-sm font-semibold transition-all shadow-sm">
            <Plus size={18} /> <span className="hidden sm:inline">Add Asset</span>
          </button>

        </div>
      </div>

      <div className="card-hub rounded-2xl overflow-hidden flex-1 shadow-sm">
        <div className="overflow-x-auto h-full">
          <table className="w-full min-w-max text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset Code</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Condition</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading assets...</td></tr>
              ) : filteredAssets.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No assets found</td></tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} onClick={() => setSelectedAsset(asset)} className="hover-row-effect hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer">
                    <td className="p-4">
                      <span className="font-mono text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-md border border-gray-200 dark:border-slate-600">{asset.asset_code}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
                          {getIcon(asset.category?.name)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-200">{asset.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{asset.category?.name || 'Uncategorized'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{asset.condition || 'N/A'}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{asset.location || 'N/A'}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                      {(asset as any).current_borrower?.name ? <span className="font-semibold text-primary">{(asset as any).current_borrower.name}</span> : <span className="text-gray-400">---</span>}
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                      {(asset as any).due_date ? <span className="font-medium text-red-500">{new Date((asset as any).due_date).toLocaleDateString('vi-VN')}</span> : <span className="text-gray-400">---</span>}
                    </td>
                    <td className="p-4">
                      {(() => {
                        const inCart = cart.find(a => a.id === asset.id);
                        if (inCart) {
                          return (
                            <button onClick={(e) => { e.stopPropagation(); toggleCart(asset); }} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 text-white shadow-sm transition-all hover:bg-emerald-600">
                              Đang trong giỏ
                            </button>
                          );
                        }
                        if (asset.status === 'borrowed') {
                          return (
                            <button disabled className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-400 text-black shadow-sm opacity-90">
                              Đang mượn
                            </button>
                          );
                        }
                        if (asset.status === 'maintenance' || asset.status === 'broken') {
                          return (
                            <button disabled className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500 text-white shadow-sm opacity-90">
                              Bảo trì
                            </button>
                          );
                        }
                        return (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); toggleCart(asset); }} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
                              Mượn thiết bị
                            </button>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    
      </div>
      <AssetDetailPanel asset={selectedAsset} isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)} onOpenQR={() => setQrAsset(selectedAsset)} />
      <BorrowDrawer isOpen={isBorrowDrawerOpen} onClose={() => setIsBorrowDrawerOpen(false)} cartAssets={cart} setCartAssets={setCart} onSuccess={() => { setCart([]); refetch(); }} />
      <AssetQRCodeModal asset={qrAsset} isOpen={!!qrAsset} onClose={() => setQrAsset(null)} />
</div>
  );
};
