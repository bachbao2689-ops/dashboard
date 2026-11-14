import {SearchInput} from '../components/common/filters';
import {FilterPopover} from '../components/common/filters/FilterPopover';
import {ActionButton} from '../components/common/ActionButton';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from '../i18n/translations';
import { Plus, Check, Camera, Laptop, HardDrive, Box, ChevronRight, ChevronDown, Search, X } from 'lucide-react';
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
import { displayDate } from '../lib/workflowHub';

const getIcon = (cat: string | undefined) => {
  if (!cat) return <Box size={16} className="text-gray-500" />;
  const c = cat.toLowerCase();
  if (c.includes('camera') || c.includes('lens')) return <Camera size={16} className="text-primary" />;
  if (c.includes('laptop')) return <Laptop size={16} className="text-blue-500" />;
  if (c.includes('storage')) return <HardDrive size={16} className="text-emerald-500" />;
  return <Box size={16} className="text-gray-500" />;
};

export const AssetInventory: React.FC = () => {
  const { t, lang } = useTranslation();
  const { widths: assetColWidths, startResize: startAssetColResize, tableRef: assetTableRef } = useResizableColumns({
    tableKey: 'assets_table',
    initialWidths: [120, 260, 120, 140, 125, 140, 115, 150],
    minWidth: 80,
  });
  const profile = useAuthStore(state => state.profile);
  const canBorrowAsset=canSubmitAssetRequest(profile);
  const roleStr = (profile?.role || '').toLowerCase();
  const levelStr = (profile?.employment_level || '').toLowerCase();
  const canAddAsset = ['admin', 'manager', 'leader'].includes(roleStr) || ['admin', 'manager', 'leader'].includes(levelStr);
  const [searchTerm, setSearchTerm] = useRememberedState('assets.search', '');
  const [categoryFilter, setCategoryFilter] = useRememberedState('assets.categoryFilter', 'all');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const categoryDropdownRef = React.useRef<HTMLDivElement>(null);
  const categoryPanelRef = React.useRef<HTMLDivElement>(null);
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
    if (!isCategoryDropdownOpen) {
      setCategorySearchQuery('');
      return;
    }
    const handleClick = (e: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node) &&
        !categoryPanelRef.current?.contains(e.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCategoryDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isCategoryDropdownOpen]);

  const categoriesWithCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    (assets || []).forEach(a => {
      const cat = a.category?.name || (lang === 'en' ? 'Other' : 'Khác');
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assets, lang]);

  const filteredCategoryOptions = React.useMemo(() => {
    const q = categorySearchQuery.trim().toLowerCase();
    if (!q) return categoriesWithCounts;
    return categoriesWithCounts.filter(({ name }) => name.toLowerCase().includes(q));
  }, [categoriesWithCounts, categorySearchQuery]);

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

  const filteredAssets = (assets || []).filter(a => {
    const matchSearch =
      (a.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
      (a.asset_code || '').toLowerCase().includes((searchTerm || '').toLowerCase());
    if (!matchSearch) return false;
    if (categoryFilter === 'all') return true;
    const cat = a.category?.name || (lang === 'en' ? 'Other' : 'Khác');
    return cat === categoryFilter;
  });

  return (
    <div className="relative z-10 flex min-h-full min-w-0">
      <div className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${selectedAsset || (canBorrowAsset && isBorrowDrawerOpen) ? 'hidden xl:flex xl:mr-[500px] pr-2' : 'pr-0 lg:pr-4'}`}>
      <AssetModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={refetch} 
      />
      
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] items-center justify-between gap-4 py-2 sm:py-2.5 mb-4 px-1 shrink-0 relative z-50">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">{t('assets.title')}</h2>
        
        <div className="mobile-actions-row grid grid-flow-row sm:grid-flow-col sm:auto-cols-max items-center justify-start sm:justify-end gap-2 max-w-full py-1">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t('assets.search')}
            className="!h-9 [&>div]:!h-9 [&>div]:!rounded-[8px]"
          />

          {/* Category Filter Dropdown */}
          <div className="relative inline-grid" ref={categoryDropdownRef}>
            <button
              type="button"
              onClick={() => setIsCategoryDropdownOpen(prev => !prev)}
              className={`h-9 px-3 rounded-[8px] border text-xs font-semibold inline-grid grid-flow-col auto-cols-max items-center gap-2 transition-all cursor-pointer shadow-2xs ${
                categoryFilter !== 'all'
                  ? 'border-blue-500 bg-blue-50/80 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-500/50 font-bold'
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/60'
              }`}
              title="Lọc theo loại thiết bị"
              aria-label="Lọc theo loại thiết bị"
              aria-expanded={isCategoryDropdownOpen}
            >
              <Box size={14} className={categoryFilter !== 'all' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-slate-400'} />
              <span className="truncate max-w-[130px] sm:max-w-[170px]">
                {categoryFilter === 'all' ? (lang === 'en' ? 'All categories' : 'Tất cả loại') : categoryFilter}
              </span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCategoryDropdownOpen && (
              <FilterPopover
                onClose={() => setIsCategoryDropdownOpen(false)}
                anchorRef={categoryDropdownRef}
                panelRef={categoryPanelRef}
                align="left"
                className="w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-[8px] shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200 grid grid-rows-[auto_1fr] gap-1.5 max-h-80"
                onClick={e => e.stopPropagation()}
              >
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={categorySearchQuery}
                    onChange={e => setCategorySearchQuery(e.target.value)}
                    placeholder={lang === 'en' ? 'Search category...' : 'Tìm loại thiết bị...'}
                    className="w-full text-xs pl-7 pr-6 py-1.5 rounded-[6px] bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                    autoFocus
                  />
                  {categorySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCategorySearchQuery('')}
                      aria-label={lang === 'en' ? 'Clear search' : 'Xóa tìm kiếm'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto custom-scrollbar grid grid-cols-1 gap-0.5 max-h-56">
                  {(!categorySearchQuery.trim() || (lang === 'en' ? 'all' : 'tất cả').includes(categorySearchQuery.trim().toLowerCase())) && (
                    <button
                      type="button"
                      onClick={() => { setCategoryFilter('all'); setIsCategoryDropdownOpen(false); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer ${
                        categoryFilter === 'all'
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold'
                          : 'text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {lang === 'en' ? 'All' : 'Tất cả'}
                    </button>
                  )}
                  {filteredCategoryOptions.length === 0 ? (
                    <div className="py-4 text-center text-xs text-gray-400">
                      {lang === 'en' ? 'No category found' : 'Không tìm thấy loại'}
                    </div>
                  ) : (
                    filteredCategoryOptions.map(({ name }) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => { setCategoryFilter(name); setIsCategoryDropdownOpen(false); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs font-semibold truncate transition-colors cursor-pointer ${
                          categoryFilter === name
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold'
                            : 'text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {name}
                      </button>
                    ))
                  )}
                </div>
              </FilterPopover>
            )}
          </div>

          {canBorrowAsset && (
            <ActionButton
              badge={cart.length || undefined}
              icon={<Box size={16} />}
              onClick={() => setIsBorrowDrawerOpen(true)}
              aria-label={t('assets.borrowSlip')}
              className={`hover-magnetic-btn magnetic-emerald !inline-grid grid-flow-col auto-cols-max shrink-0 items-center gap-2 h-9 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[8px] text-xs font-semibold transition-all shadow-sm ${bounce ? '-translate-y-1' : ''}`}
            >
              <span className="text-xs">{t('assets.borrowSlip')}</span>
            </ActionButton>
          )}
          {canAddAsset && (
            <ActionButton
              icon={<Plus size={16} />}
              onClick={handleNewAsset}
              aria-label={t('assets.addAsset')}
              className="btn-add-new !inline-grid grid-flow-col auto-cols-max items-center gap-2 h-9 px-3.5 text-white rounded-[8px] text-xs font-semibold transition-all shadow-sm"
            >
              <span className="text-xs">
                <span className="sm:hidden">{t('assets.add')}</span>
                <span className="hidden sm:inline">{t('assets.addAsset')}</span>
              </span>
            </ActionButton>
          )}
        </div>
      </div>

      <div className="card-hub flex-1 overflow-hidden rounded-[8px] shadow-sm">
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
                <span className={`shrink-0 rounded-[6px] px-2 py-1 text-[11px] font-semibold ${canBorrow ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : asset.status === 'reserved' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : asset.status === 'borrowed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>{statusLabel}</span>
                {canBorrowAsset && (canBorrow || inCart) ? <ActionButton icon={inCart ? <Check size={16}/> : <Plus size={16}/>} type="button" onClick={() => toggleCart(asset)} className={`shrink-0 rounded-[6px] px-2.5 py-1.5 text-[11px] font-semibold text-white ${inCart ? 'bg-emerald-600' : 'bg-primary'}`}>{inCart ? t('assets.removeFromSlip') : t('assets.addToSlip')}</ActionButton> : asset.due_date ? <span className="min-w-0 truncate text-[11px] text-gray-500 dark:text-gray-400">{t('common.due')} {displayDate(asset.due_date)}</span> : null}
              </div>
            </div>;
          })}
        </div>
        <div className="hidden h-full overflow-x-auto xl:block">
          <table ref={assetTableRef} className="w-full table-fixed text-left border-collapse">
            <colgroup>
              {assetColWidths.map((w, idx) => (
                <col key={idx} style={{ width: `${w}px` }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider relative">
                  <span className="truncate block">{t('assets.col.code')}</span>
                  <div onMouseDown={(e) => startAssetColResize(0, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider relative">
                  <span className="truncate block">{t('assets.col.asset')}</span>
                  <div onMouseDown={(e) => startAssetColResize(1, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider relative">
                  <span className="truncate block">{t('assets.col.condition')}</span>
                  <div onMouseDown={(e) => startAssetColResize(2, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider relative">
                  <span className="truncate block">{t('assets.col.location')}</span>
                  <div onMouseDown={(e) => startAssetColResize(3, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider relative">
                  <span className="truncate block">{t('assets.col.status')}</span>
                  <div onMouseDown={(e) => startAssetColResize(4, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider relative">
                  <span className="truncate block">{t('assets.col.borrower')}</span>
                  <div onMouseDown={(e) => startAssetColResize(5, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider relative">
                  <span className="truncate block">{t('assets.col.dueDate')}</span>
                  <div onMouseDown={(e) => startAssetColResize(6, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
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
                    <td className="p-4 overflow-hidden">
                      <span className="inline-block w-fit max-w-full font-mono text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-[6px] border border-gray-200 dark:border-slate-600 truncate">{asset.asset_code}</span>
                    </td>
                    <td className="p-4 overflow-hidden">
                      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 overflow-hidden min-w-0">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-[6px] shadow-sm border border-gray-100 dark:border-slate-700 shrink-0">
                          {getIcon(asset.category?.name)}
                        </div>
                        <div className="overflow-hidden min-w-0">
                          <p className="truncate font-medium text-gray-800 dark:text-gray-200">{asset.name}</p>
                          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{asset.category?.name || t('common.unassigned')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300 overflow-hidden"><span className="truncate block">{asset.condition || 'N/A'}</span></td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300 overflow-hidden"><span className="truncate block">{asset.location || 'N/A'}</span></td>
                    <td className="p-4 text-sm overflow-hidden">
                      <div className="truncate">
                        <span className={`px-2.5 py-1 rounded-[6px] text-xs font-semibold truncate inline-block ${asset.status === 'available' && asset.is_available !== false ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : asset.status === 'reserved' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : asset.status === 'borrowed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {asset.status === 'available' && asset.is_available !== false ? t('assets.statusAvailable') : asset.status === 'reserved' ? t('assets.statusReserved') : asset.status === 'borrowed' ? t('assets.statusBorrowed') : t('assets.statusUnavailable')}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300 overflow-hidden">
                      {asset.current_borrower?.name ? <span className="font-semibold text-primary truncate block">{asset.current_borrower.name}</span> : <span className="text-gray-400 truncate block">---</span>}
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300 overflow-hidden">
                      {asset.due_date ? <span className="font-medium truncate block">{displayDate(asset.due_date, '---')}</span> : <span className="text-gray-400 truncate block">---</span>}
                    </td>
                    <td className="p-4 text-right overflow-hidden">
                      {(() => {
                        const inCart = cart.find(a => a.id === asset.id);
                        if (canBorrowAsset && inCart) {
                          return (
                            <button onClick={(e) => { e.stopPropagation(); toggleCart(asset); }} className="px-3 py-1.5 text-xs font-semibold rounded-[8px] bg-emerald-500 text-white shadow-sm transition-all hover:bg-emerald-600 whitespace-nowrap shrink-0">
                              {t('assets.inSlip')}
                            </button>
                          );
                        }
                        if (asset.status === 'reserved') {
                          return <span className="px-3 py-1.5 text-xs font-semibold rounded-[6px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 truncate inline-block">{t('assets.pendingApproval')}</span>;
                        }
                        if (asset.status === 'borrowed') {
                          return (
                            <button disabled className="px-3 py-1.5 text-xs font-semibold rounded-[8px] bg-amber-400 text-black shadow-sm opacity-90 whitespace-nowrap shrink-0">
                              {t('assets.statusBorrowed')}
                            </button>
                          );
                        }
                        if (asset.status === 'maintenance' || asset.status === 'broken') {
                          return (
                            <button disabled className="px-3 py-1.5 text-xs font-semibold rounded-[8px] bg-red-500 text-white shadow-sm opacity-90 whitespace-nowrap shrink-0">
                              {t('assets.maintenance')}
                            </button>
                          );
                        }
                        if (asset.status !== 'available' || asset.is_available === false) {
                          return <span className="text-xs text-gray-500 truncate inline-block">{t('assets.statusUnavailable')}</span>;
                        }
                        if (!canBorrowAsset) return <span className="text-xs text-gray-500 truncate inline-block">{t('assets.statusAvailable')}</span>;
                        return (
                          <div className="grid grid-flow-col auto-cols-max items-center justify-end gap-1">
                            <button onClick={(e) => { e.stopPropagation(); toggleCart(asset); }} className="px-3 py-1.5 text-xs font-semibold rounded-[8px] bg-primary text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all whitespace-nowrap shrink-0">
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
