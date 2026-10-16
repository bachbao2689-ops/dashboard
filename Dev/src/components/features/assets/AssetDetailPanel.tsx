import React, { useState, useEffect, useCallback } from 'react';
import { X, Box, QrCode, Tag, User, Hash, AlertCircle, Maximize2, ChevronsRight, Camera, Laptop, HardDrive } from 'lucide-react';
import { useTranslation } from '../../../i18n/translations';

const getIcon = (cat: string | undefined) => {
  if (!cat) return <Box className="w-5 h-5 text-gray-500" />;
  const c = cat.toLowerCase();
  if (c.includes('camera') || c.includes('lens')) return <Camera className="w-5 h-5 text-blue-500" />;
  if (c.includes('laptop')) return <Laptop className="w-5 h-5 text-indigo-500" />;
  if (c.includes('storage')) return <HardDrive className="w-5 h-5 text-emerald-500" />;
  return <Box className="w-5 h-5 text-gray-500" />;
};

interface AssetDetailPanelProps {
  asset: any | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenQR?: () => void;
}

export const AssetDetailPanel: React.FC<AssetDetailPanelProps> = ({ asset, isOpen, onClose, onOpenQR }) => {
  const { t } = useTranslation();
  const [width, setWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = document.body.clientWidth - e.clientX;
      if (newWidth > 320 && newWidth < 800) setWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/30 dark:bg-slate-900/60 z-[65] xl:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div 
        style={{ '--drawer-width': `${width}px` } as React.CSSProperties}
        className={`dashboard-detail-drawer bg-white dark:bg-slate-800 shrink-0 ${isOpen ? 'w-full max-w-full xl:max-w-[calc(100vw-32px)] xl:w-[var(--drawer-width)] xl:max-w-[min(var(--drawer-width),50vw)] shadow-drawer-task border border-blue-500/20 opacity-100 pointer-events-auto drawer-slide-in' : 'w-0 min-w-0 shadow-none border-0 opacity-0 pointer-events-none'} z-[70] ${!isResizing ? 'transition-[width,opacity] duration-300 ease-in-out' : ''}`}
      >
        {isOpen && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-2 hover:w-3 bg-transparent hover:bg-primary/20 cursor-col-resize z-50 transition-all -translate-x-1/2 group hidden xl:flex items-center justify-center"
            onMouseDown={startResizing}
          >
            <div className="h-12 w-1 bg-gray-400/50 dark:bg-slate-800 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        )}

        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-1">
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 transition-colors flex items-center gap-1 text-xs font-medium" title="Close side peek">
              <ChevronsRight className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 transition-colors" title="Open as page">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {asset && (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-6 md:px-8 space-y-8">
              
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-slate-700 flex items-center justify-center">
                    {getIcon(asset.category?.name)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{asset.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{asset.asset_code}</p>
                      <button onClick={onOpenQR} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors text-primary" title="View QR Code">
                        <QrCode size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-y-4 gap-x-6 text-sm mt-6">
                  <div className="grid grid-cols-[120px_1fr] items-center">
                    <div className="text-gray-500 flex items-center gap-1.5"><Tag className="w-4 h-4" /> {t('assets.category')}</div>
                    <div className="text-gray-900 dark:text-gray-100 font-medium">{asset.category?.name || t('common.unassigned')}</div>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] items-center">
                    <div className="text-gray-500 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {t('common.status')}</div>
                    <div>
                      <span className={`inline-flex px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                        (asset.status || '') === 'available' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        (asset.status || '') === 'reserved' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        (asset.status || '') === 'borrowed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {asset.status === 'available' ? t('assets.statusAvailable') : asset.status === 'reserved' ? t('assets.statusReserved') : asset.status === 'borrowed' ? t('assets.statusBorrowed') : t('assets.statusUnavailable')}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] items-center">
                    <div className="text-gray-500 flex items-center gap-1.5"><Hash className="w-4 h-4" /> {t('assets.serial')}</div>
                    <div className="text-gray-900 dark:text-gray-100 font-mono text-xs">{asset.serial_number || 'N/A'}</div>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] items-center">
                    <div className="text-gray-500 flex items-center gap-1.5"><User className="w-4 h-4" /> {asset.status === 'reserved' ? t('assets.requester') : t('assets.col.borrower')}</div>
                    <div className="text-gray-900 dark:text-gray-100 font-medium">{asset.current_borrower?.name || asset.pending_requester?.name || t('common.none')}</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  {t('assets.maintenanceNotes')}
                </h3>
                <div className="bg-gray-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-gray-300 min-h-[100px]">
                  {asset.notes || t('assets.noNotes')}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  );
};
