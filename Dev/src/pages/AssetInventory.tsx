import {SearchInput} from '../components/common/filters';
import {ActionButton} from '../components/common/ActionButton';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from '../i18n/translations';
import { Plus, Check, Camera, Laptop, HardDrive, Box, ChevronRight } from 'lucide-react';
import { useAssets } from '../hooks/useAssets';
import type { Asset } from '../hooks/useAssets';
import { AssetModal } from '../components/features/assets/AssetModal';
import { AssetDetailPanel } from '../components/features/assets/AssetDetailPanel';
import { AssetQRCodeModal } from '../components/features/assets/AssetQRCodeModal';
import { BorrowDrawer } from '../components/features/assets/BorrowDrawer';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import {canSubmitAssetRequest} from '../lib/roleScope';
import { useRememberedState } from '../hooks/useRememberedState';
import { useResizableColumns } from '../hooks/useResizableColumns';

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
  const { widths: assetColWidths, startResize: startAssetColResize, totalTableWidth: assetTableWidth } = useResizableColumns({
    tableKey: 'assets_table',
    initialWidths: [110, 280, 120, 140, 120, 140, 110, 100],
    minWidth: 50,
  });
  const profile = useAuthStore(state => state.profile);
  const canBorrowAsset=canSubmitAssetRequest(profile);
  const roleStr = (profile?.role || '').toLowerCase();
  const levelStr = (profile?.employment_level || '').toLowerCase();
  const canAddAsset = ['admin', 'manager', 'leader'].includes(roleStr) || ['admin', 'manager', 'leader'].includes(levelStr);
  const [searchTerm, setSearchTerm] = useRememberedState('assets.search', '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [isScanMode, setIsScanMode] = useState(false);
  const [qrAsset, setQrAsset] = useState<any>(null);
  const { assets, loading, error, refetch } = useAssets();
  const [searchParams, setSearchParams] = useSearchParams();

  const [cart, setCart] = useState<Asset[]>([]);
  const [isBorrowDrawerOpen, setIsBorrowDrawerOpen] = useState(searchParams.get('borrow') === '1');
  const [bounce, setBounce] = useState(false);

  useEffect(() => {
    return () => {
      useUiStore.getState().setIsScanMode(false);
    };
  }, []);

  useEffect(() => {
    if (!assets || assets.length === 0) return;
    const codeParam = searchParams.get('code');
    const assetParam = searchParams.get('asset');
    if (!codeParam && !assetParam) {
      if (isScanMode) {
        setSelectedAsset(null);
        setIsScanMode(false);
        useUiStore.getState().setIsScanMode(false);
      }
      return;
    }

    let found: Asset | undefined;
    if (codeParam) {
      const target = codeParam.trim().toLowerCase();
      found = assets.find(a => a.asset_code?.toLowerCase() === target);
    } else if (assetParam) {
      const target = assetParam.trim().toLowerCase();
      found = assets.find(a => String(a.id).toLowerCase() === target);
    }

    if (found) {
      setSelectedAsset(found);
      setIsScanMode(true);
      useUiStore.getState().setIsScanMode(true);
      if (searchParams.get('borrow') === '1' && canBorrowAsset) {
        setCart(current => {
          if (current.some(a => a.id === found!.id)) return current;
          return [...current, found!];
        });
        setIsBorrowDrawerOpen(true);
      }
    }
  }, [assets, searchParams, canBorrowAsset]);

  const handleCloseDetail = () => {
    setSelectedAsset(null);
    setIsScanMode(false);
    useUiStore.getState().setIsScanMode(false);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('code');
      next.delete('asset');
      next.delete('borrow');
      return next;
    }, { replace: true });
  };

  const toggleCart = (asset: Asset) => {
    if (!canBorrowAsset) return;
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

  const filteredAssets = (assets || []).filter(a => 
    (a.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
    (a.asset_code || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  return (
    <div className="relative z-10 flex min-h-full min-w-0">
      <div className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${selectedAsset || (canBorrowAsset && isBorrowDrawerOpen) ? 'hidden xl:flex xl:mr-[500px] pr-2' : 'pr-0 lg:pr-4'}`}>
      <AssetModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={refetch} 
      />
      
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 py-2 sm:py-2.5 mb-4 px-1 shrink-0 relative z-50">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">{t('assets.title')}</h2>
        
        <div className="mobile-actions-row flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder={t('assets.search')} />

          {canBorrowAsset && <ActionButton badge={cart.length || undefined} icon={<Box size={18} />} onClick={() => setIsBorrowDrawerOpen(true)} aria-label={t('assets.borrowSlip')} className={`hover-magnetic-btn magnetic-emerald flex shrink-0 items-center gap-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all shadow-sm ${bounce ? '-translate-y-1' : ''}`}>
             <span className="text-xs sm:text-sm">{t('assets.borrowSlip')}</span>
          </ActionButton>}
          {canAddAsset && (
            <ActionButton icon={<Plus size={18} />} onClick={handleNewAsset} aria-label={t('assets.addAsset')} className="btn-add-new flex items-center gap-2 h-10 px-4 text-white rounded-xl text-sm font-medium transition-all shadow-sm">
               <span className="text-xs sm:text-sm"><span className="sm:hidden">{t('assets.add')}</span><span className="hidden sm:inline">{t('assets.addAsset')}</span></span>
            </ActionButton>
          )}
        </div>
      </div>

      <div className="card-hub flex-1 overflow-hidden rounded-2xl shadow-sm">
        <div className="divide-y divide-gray-100 dark:divide-slate-700 xl:hidden">
          {loading ? <p className="p-6 text-center text-sm text-gray-500">{t('assets.loading')}</p> : filteredAssets.length === 0 ? <p className="p-6 text-center text-sm text-gray-500">{error || t('assets.noAssets')}</p> : filteredAssets.map(asset => {
            const inCart = cart.some(item => item.id === asset.id);
            const canBorrow = asset.status === 'available' && asset.is_available !== false;
            const statusLabel = canBorrow ? t('assets.statusAvailable') : asset.status === 'reserved' ? t('assets.statusReserved') : asset.status === 'borrowed' ? t('assets.statusBorrowed') : t('assets.statusUnavailable');
            return <div key={asset.id} className="px-3 py-3">
              <button type="button" onClick={() => { setSelectedAsset(asset); setIsScanMode(false); }} className="flex w-full min-w-0 items-center gap-2.5 text-left">
                <span className="shrink-0">{getIcon(asset.category?.name)}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{asset.name}</span>
                <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-gray-400" />
              </button>
              <p className="ml-6 mt-1 truncate text-[11px] text-gray-500 dark:text-gray-400">{asset.asset_code} · {asset.category?.name || t('common.unassigned')}</p>
              <div className="ml-6 mt-2 flex min-w-0 items-center justify-between gap-2">
                <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${canBorrow ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : asset.status === 'reserved' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : asset.status === 'borrowed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>{statusLabel}</span>
                {canBorrowAsset && (canBorrow || inCart) ? <ActionButton icon={inCart ? <Check size={16}/> : <Plus size={16}/>} type="button" onClick={() => toggleCart(asset)} className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white ${inCart ? 'bg-emerald-600' : 'bg-primary'}`}>{inCart ? t('assets.removeFromSlip') : t('assets.addToSlip')}</ActionButton> : asset.due_date ? <span className="min-w-0 truncate text-[11px] text-gray-500 dark:text-gray-400">{t('common.due')} {new Date(`${asset.due_date}T00:00:00`).toLocaleDateString('vi-VN')}</span> : null}
              </div>
            </div>;
          })}
        </div>
        <div className="hidden h-full overflow-x-auto xl:block">
          <table className="w-full table-fixed text-left border-collapse" style={{ minWidth: `${assetTableWidth}px` }}>
            <colgroup>
              {assetColWidths.map((w, idx) => (
                <col key={idx} style={{ width: `${w}px` }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider relative border-r border-gray-200/80 dark:border-slate-700/80">
                  <span className="truncate block">{t('assets.col.code')}</span>
                  <div onMouseDown={(e) => startAssetColResize(0, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-2.5 translate-x-1/2 cursor-col-resize z-20 group/handle hover:bg-primary/30 transition-colors" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-full mx-auto group-hover/handle:bg-primary transition-colors" /></div>
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider relative border-r border-gray-200/80 dark:border-slate-700/80">
                  <span className="truncate block">{t('assets.col.asset')}</span>
                  <div onMouseDown={(e) => startAssetColResize(1, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-2.5 translate-x-1/2 cursor-col-resize z-20 group/handle hover:bg-primary/30 transition-colors" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-full mx-auto group-hover/handle:bg-primary transition-colors" /></div>
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider relative border-r border-gray-200/80 dark:border-slate-700/80">
                  <span className="truncate block">{t('assets.col.condition')}</span>
                  <div onMouseDown={(e) => startAssetColResize(2, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-2.5 translate-x-1/2 cursor-col-resize z-20 group/handle hover:bg-primary/30 transition-colors" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-full mx-auto group-hover/handle:bg-primary transition-colors" /></div>
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider relative border-r border-gray-200/80 dark:border-slate-700/80">
                  <span className="truncate block">{t('assets.col.location')}</span>
                  <div onMouseDown={(e) => startAssetColResize(3, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-2.5 translate-x-1/2 cursor-col-resize z-20 group/handle hover:bg-primary/30 transition-colors" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-full mx-auto group-hover/handle:bg-primary transition-colors" /></div>
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider relative border-r border-gray-200/80 dark:border-slate-700/80">
                  <span className="truncate block">{t('assets.col.status')}</span>
                  <div onMouseDown={(e) => startAssetColResize(4, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-2.5 translate-x-1/2 cursor-col-resize z-20 group/handle hover:bg-primary/30 transition-colors" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-full mx-auto group-hover/handle:bg-primary transition-colors" /></div>
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider relative border-r border-gray-200/80 dark:border-slate-700/80">
                  <span className="truncate block">{t('assets.col.borrower')}</span>
                  <div onMouseDown={(e) => startAssetColResize(5, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-2.5 translate-x-1/2 cursor-col-resize z-20 group/handle hover:bg-primary/30 transition-colors" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-full mx-auto group-hover/handle:bg-primary transition-colors" /></div>
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider relative border-r border-gray-200/80 dark:border-slate-700/80">
                  <span className="truncate block">{t('assets.col.dueDate')}</span>
                  <div onMouseDown={(e) => startAssetColResize(6, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-2.5 translate-x-1/2 cursor-col-resize z-20 group/handle hover:bg-primary/30 transition-colors" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-full mx-auto group-hover/handle:bg-primary transition-colors" /></div>
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider relative text-right">
                  <span className="truncate block">{t('assets.col.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500">{t('assets.loading')}</td></tr>
              ) : filteredAssets.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500">{error || t('assets.noAssets')}</td></tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} onClick={() => { setSelectedAsset(asset); setIsScanMode(false); }} className="hover-row-effect hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer">
                    <td className="p-4 border-r border-gray-200/80 dark:border-slate-700/80 overflow-hidden">
                      <span className="font-mono text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-md border border-gray-200 dark:border-slate-600 truncate block">{asset.asset_code}</span>
                    </td>
                    <td className="p-4 border-r border-gray-200/80 dark:border-slate-700/80 overflow-hidden">
                      <div className="flex items-center gap-3 overflow-hidden min-w-0">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 shrink-0">
                          {getIcon(asset.category?.name)}
                        </div>
                        <div className="overflow-hidden min-w-0">
                          <p className="truncate font-medium text-gray-800 dark:text-gray-200">{asset.name}</p>
                          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{asset.category?.name || t('common.unassigned')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300 border-r border-gray-200/80 dark:border-slate-700/80 overflow-hidden"><span className="truncate block">{asset.condition || 'N/A'}</span></td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300 border-r border-gray-200/80 dark:border-slate-700/80 overflow-hidden"><span className="truncate block">{asset.location || 'N/A'}</span></td>
                    <td className="p-4 text-sm border-r border-gray-200/80 dark:border-slate-700/80 overflow-hidden">
                      <div className="truncate">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold truncate inline-block ${asset.status === 'available' && asset.is_available !== false ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : asset.status === 'reserved' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : asset.status === 'borrowed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {asset.status === 'available' && asset.is_available !== false ? t('assets.statusAvailable') : asset.status === 'reserved' ? t('assets.statusReserved') : asset.status === 'borrowed' ? t('assets.statusBorrowed') : t('assets.statusUnavailable')}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300 border-r border-gray-200/80 dark:border-slate-700/80 overflow-hidden">
                      {asset.current_borrower?.name ? <span className="font-semibold text-primary truncate block">{asset.current_borrower.name}</span> : <span className="text-gray-400 truncate block">---</span>}
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300 border-r border-gray-200/80 dark:border-slate-700/80 overflow-hidden">
                      {asset.due_date ? <span className="font-medium truncate block">{new Date(`${asset.due_date}T00:00:00`).toLocaleDateString('vi-VN')}</span> : <span className="text-gray-400 truncate block">---</span>}
                    </td>
                    <td className="p-4 text-right overflow-hidden">
                      {(() => {
                        const inCart = cart.find(a => a.id === asset.id);
                        if (canBorrowAsset && inCart) {
                          return (
                            <button onClick={(e) => { e.stopPropagation(); toggleCart(asset); }} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 text-white shadow-sm transition-all hover:bg-emerald-600 truncate">
                              {t('assets.inSlip')}
                            </button>
                          );
                        }
                        if (asset.status === 'reserved') {
                          return <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 truncate inline-block">{t('assets.pendingApproval')}</span>;
                        }
                        if (asset.status === 'borrowed') {
                          return (
                            <button disabled className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-400 text-black shadow-sm opacity-90 truncate">
                              {t('assets.statusBorrowed')}
                            </button>
                          );
                        }
                        if (asset.status === 'maintenance' || asset.status === 'broken') {
                          return (
                            <button disabled className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500 text-white shadow-sm opacity-90 truncate">
                              {t('assets.maintenance')}
                            </button>
                          );
                        }
                        if (asset.status !== 'available' || asset.is_available === false) {
                          return <span className="text-xs text-gray-500 truncate inline-block">{t('assets.statusUnavailable')}</span>;
                        }
                        if (!canBorrowAsset) return <span className="text-xs text-gray-500 truncate inline-block">{t('assets.statusAvailable')}</span>;
                        return (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={(e) => { e.stopPropagation(); toggleCart(asset); }} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all truncate">
                              {t('assets.addToSlip')}
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
      <AssetDetailPanel
        asset={selectedAsset}
        isOpen={!!selectedAsset}
        onClose={handleCloseDetail}
        onOpenQR={() => setQrAsset(selectedAsset)}
        isScanMode={isScanMode}
        onBorrowNow={(asset) => {
          if (!cart.some(a => a.id === asset.id)) {
            setCart(current => [...current, asset]);
          }
          setIsBorrowDrawerOpen(true);
        }}
      />
      <BorrowDrawer isOpen={canBorrowAsset && isBorrowDrawerOpen} onClose={() => setIsBorrowDrawerOpen(false)} cartAssets={cart} setCartAssets={setCart} onSuccess={refetch} />
      <AssetQRCodeModal asset={qrAsset} isOpen={!!qrAsset} onClose={() => setQrAsset(null)} />
    </div>
  );
};
