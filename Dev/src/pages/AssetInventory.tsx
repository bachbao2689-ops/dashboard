import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from '../i18n/translations';
import { Plus, Search, Camera, Laptop, HardDrive, Box, ChevronRight } from 'lucide-react';
import { useAssets } from '../hooks/useAssets';
import type { Asset } from '../hooks/useAssets';
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
  const { assets, loading, error, refetch } = useAssets();
  const [searchParams] = useSearchParams();

  const [cart, setCart] = useState<Asset[]>([]);
  const [isBorrowDrawerOpen, setIsBorrowDrawerOpen] = useState(searchParams.get('borrow') === '1');
  const [bounce, setBounce] = useState(false);

  const toggleCart = (asset: Asset) => {
    if (asset.status !== 'available' && !cart.some(a => a.id === asset.id)) return;
    if (asset.is_available === false && !cart.some(a => a.id === asset.id)) return;
    if (cart.some(a => a.id === asset.id)) {
      setCart(current => current.filter(a => a.id !== asset.id));
    } else {
      setCart(current => [...current, asset]);
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
    <div className="relative z-10 flex min-h-full min-w-0">
      <div className="flex min-w-0 flex-1 flex-col pr-0 lg:pr-4">
      <AssetModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={refetch} 
      />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 sm:py-2.5 mb-4 px-1 shrink-0 relative z-50">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">Kho thiết bị</h2>
        
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className={`flex items-center transition-all duration-300 ${isSearchExpanded ? 'w-48 sm:w-64' : 'w-10'} bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm h-10`}>
            <button onClick={() => setIsSearchExpanded(!isSearchExpanded)} className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-primary transition-colors flex-shrink-0">
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
          
          <button onClick={() => setIsBorrowDrawerOpen(true)} aria-label="Mở phiếu mượn" className={`hover-magnetic-btn magnetic-emerald flex shrink-0 items-center gap-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all shadow-sm ${bounce ? '-translate-y-1' : ''}`}>
            <Box size={18} /> <span className="text-xs sm:text-sm">Phiếu mượn</span>
            {cart.length > 0 && <span className="bg-white/20 text-white text-[11px] font-bold min-w-5 h-5 px-1 flex items-center justify-center rounded-full" aria-label={`${cart.length} thiết bị trong phiếu`}>{cart.length}</span>}
          </button>
          <button onClick={handleNewAsset} aria-label="Thêm thiết bị" className="btn-add-new flex items-center gap-2 h-10 px-4 text-white rounded-xl text-sm font-medium transition-all shadow-sm">
            <Plus size={18} /> <span className="text-xs sm:text-sm"><span className="sm:hidden">Thêm</span><span className="hidden sm:inline">Thêm thiết bị</span></span>
          </button>
        </div>
      </div>

      <div className="card-hub flex-1 overflow-hidden rounded-2xl shadow-sm">
        <div className="divide-y divide-gray-100 dark:divide-slate-700 md:hidden">
          {loading ? <p className="p-6 text-center text-sm text-gray-500">Đang tải thiết bị...</p> : filteredAssets.length === 0 ? <p className="p-6 text-center text-sm text-gray-500">{error || 'Không tìm thấy thiết bị.'}</p> : filteredAssets.map(asset => {
            const inCart = cart.some(item => item.id === asset.id);
            const canBorrow = asset.status === 'available' && asset.is_available !== false;
            const statusLabel = canBorrow ? 'Sẵn sàng' : asset.status === 'reserved' ? 'Chờ duyệt' : asset.status === 'borrowed' ? 'Đang mượn' : 'Không khả dụng';
            return <div key={asset.id} className="px-3 py-3">
              <button type="button" onClick={() => setSelectedAsset(asset)} className="flex w-full min-w-0 items-center gap-2.5 text-left">
                <span className="shrink-0">{getIcon(asset.category?.name)}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{asset.name}</span>
                <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-gray-400" />
              </button>
              <p className="ml-6 mt-1 truncate text-[11px] text-gray-500 dark:text-gray-400">{asset.asset_code} · {asset.category?.name || 'Chưa phân loại'}</p>
              <div className="ml-6 mt-2 flex min-w-0 items-center justify-between gap-2">
                <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${canBorrow ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : asset.status === 'reserved' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : asset.status === 'borrowed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>{statusLabel}</span>
                {(canBorrow || inCart) ? <button type="button" onClick={() => toggleCart(asset)} className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white ${inCart ? 'bg-emerald-600' : 'bg-primary'}`}>{inCart ? 'Bỏ khỏi phiếu' : 'Thêm vào phiếu'}</button> : asset.due_date ? <span className="min-w-0 truncate text-[11px] text-gray-500 dark:text-gray-400">Hạn {new Date(`${asset.due_date}T00:00:00`).toLocaleDateString('vi-VN')}</span> : null}
              </div>
            </div>;
          })}
        </div>
        <div className="hidden h-full overflow-x-auto md:block">
          <table className="w-full min-w-max text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset Code</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Condition</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trạng thái</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Người mượn</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hạn trả</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500">Đang tải thiết bị...</td></tr>
              ) : filteredAssets.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500">{error || 'Không tìm thấy thiết bị.'}</td></tr>
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
                          <p className="max-w-[340px] truncate font-medium text-gray-800 dark:text-gray-200">{asset.name}</p>
                          <p className="mt-0.5 max-w-[340px] truncate text-xs text-gray-500 dark:text-gray-400">{asset.category?.name || 'Uncategorized'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{asset.condition || 'N/A'}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{asset.location || 'N/A'}</td>
                    <td className="p-4 text-sm">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${asset.status === 'available' && asset.is_available !== false ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : asset.status === 'reserved' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : asset.status === 'borrowed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {asset.status === 'available' && asset.is_available !== false ? 'Sẵn sàng' : asset.status === 'reserved' ? 'Chờ duyệt' : asset.status === 'borrowed' ? 'Đang mượn' : 'Không khả dụng'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                      {asset.current_borrower?.name ? <span className="font-semibold text-primary">{asset.current_borrower.name}</span> : <span className="text-gray-400">---</span>}
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                      {asset.due_date ? <span className="font-medium">{new Date(`${asset.due_date}T00:00:00`).toLocaleDateString('vi-VN')}</span> : <span className="text-gray-400">---</span>}
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
                        if (asset.status === 'reserved') {
                          return <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Đang chờ duyệt</span>;
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
                        if (asset.status !== 'available' || asset.is_available === false) {
                          return <span className="text-xs text-gray-500">Không khả dụng</span>;
                        }
                        return (
                          <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); toggleCart(asset); }} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
                              Thêm vào phiếu
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
      <BorrowDrawer isOpen={isBorrowDrawerOpen} onClose={() => setIsBorrowDrawerOpen(false)} cartAssets={cart} setCartAssets={setCart} onSuccess={refetch} />
      <AssetQRCodeModal asset={qrAsset} isOpen={!!qrAsset} onClose={() => setQrAsset(null)} />
</div>
  );
};
