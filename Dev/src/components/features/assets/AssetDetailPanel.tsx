import React, { useState, useEffect, useCallback } from 'react';
import { X, Box, Tag, User, Hash, AlertCircle, Maximize2, ChevronsRight, Camera, Laptop, HardDrive } from 'lucide-react';

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
}

export const AssetDetailPanel: React.FC<AssetDetailPanelProps> = ({ asset, isOpen, onClose }) => {
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
    <div 
      style={{ width: isOpen ? width : 0, minWidth: isOpen ? width : 0, opacity: isOpen ? 1 : 0 }}
      className={`h-full glass-panel rounded-l-3xl !rounded-r-none border-l border-white/40 shadow-[-10px_0_30px_-15px_rgba(31,38,135,0.15)] shrink-0 relative flex flex-col z-40 ${!isResizing ? 'transition-[width,min-width,opacity] duration-300 ease-in-out' : ''}`}
    >
      {isOpen && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-2 hover:w-3 bg-transparent hover:bg-primary/20 cursor-col-resize z-50 transition-all -translate-x-1/2 group flex items-center justify-center"
          onMouseDown={startResizing}
        >
          <div className="h-12 w-1 bg-gray-400/50 dark:bg-gray-500/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
      )}

      <div className="w-full h-full flex flex-col overflow-hidden" style={{ minWidth: isOpen ? 320 : 0 }}>
        
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/20 dark:border-gray-700/50 shrink-0">
          <div className="flex items-center gap-1">
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/50 dark:hover:bg-gray-700/50 text-gray-500 transition-colors flex items-center gap-1 text-xs font-medium" title="Close side peek">
              <ChevronsRight className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-md hover:bg-white/50 dark:hover:bg-gray-700/50 text-gray-500 transition-colors" title="Open as page">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/60 dark:hover:bg-gray-700/60 text-gray-500 hover:text-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {asset && (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-6 md:px-8 space-y-8">
              
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/60 dark:bg-gray-800/60 shadow-sm border border-white/40 flex items-center justify-center">
                    {getIcon(asset.category?.name)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{asset.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{asset.asset_code}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-y-4 gap-x-6 text-sm mt-6">
                  <div className="grid grid-cols-[120px_1fr] items-center">
                    <div className="text-gray-500 flex items-center gap-1.5"><Tag className="w-4 h-4" /> Category</div>
                    <div className="text-gray-900 dark:text-gray-100 font-medium">{asset.category?.name || 'Uncategorized'}</div>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] items-center">
                    <div className="text-gray-500 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Status</div>
                    <div>
                      <span className={`inline-flex px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                        (asset.status || '') === 'available' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        (asset.status || '') === 'in_use' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {(asset.status || '').replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] items-center">
                    <div className="text-gray-500 flex items-center gap-1.5"><Hash className="w-4 h-4" /> Serial</div>
                    <div className="text-gray-900 dark:text-gray-100 font-mono text-xs">{asset.serial_number || 'N/A'}</div>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] items-center">
                    <div className="text-gray-500 flex items-center gap-1.5"><User className="w-4 h-4" /> Assignee</div>
                    <div className="text-gray-900 dark:text-gray-100 font-medium">{asset.current_assignee?.name || 'Unassigned'}</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  Maintenance Notes
                </h3>
                <div className="bg-white/40 dark:bg-gray-800/40 p-5 rounded-2xl border border-white/50 shadow-glass-inset text-sm text-gray-700 dark:text-gray-300 min-h-[100px]">
                  {asset.notes || 'No maintenance notes available.'}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};
