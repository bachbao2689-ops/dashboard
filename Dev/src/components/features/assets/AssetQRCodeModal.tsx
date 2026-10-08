import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Download } from 'lucide-react';

interface AssetQRCodeModalProps {
  asset: any;
  isOpen: boolean;
  onClose: () => void;
}

export const AssetQRCodeModal: React.FC<AssetQRCodeModalProps> = ({ asset, isOpen, onClose }) => {
  if (!isOpen || !asset) return null;

  const qrData = `KCOFFEE-ASSET:${asset.asset_code}`;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-[#f4f6f8] dark:bg-[#1e2330] border border-white/60 dark:border-[#8fa8d0]/80 rounded-[32px] w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white rounded-full transition-all z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[#002e6d]/10 dark:bg-white flex items-center justify-center mb-4">
            <ScanLine className="w-6 h-6 text-[#002e6d] dark:text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-1">Asset QR Code</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">{asset.name}</p>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 group relative">
            <QRCodeSVG 
              value={qrData} 
              size={180} 
              bgColor="#ffffff"
              fgColor="#000000"
              level="Q"
              includeMargin={false}
            />
          </div>

          <div className="bg-gray-100 dark:bg-black/20 px-4 py-2 rounded-lg font-mono text-gray-800 dark:text-gray-200 tracking-wider mb-8">
            {asset.asset_code}
          </div>

          <div className="flex gap-3 w-full">
            <button className="flex-1 py-2.5 flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-bold transition-colors">
              <Download size={16} /> Save
            </button>
            <button className="flex-1 py-2.5 flex items-center justify-center gap-2 bg-[#002e6d] hover:bg-[#001f4d] text-white rounded-xl font-bold transition-colors shadow-lg shadow-[#002e6d]/20">
              <Printer size={16} /> Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
// Add ScanLine icon locally inside the file since it's not imported at top
const ScanLine = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
    <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
    <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
    <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
    <line x1="7" y1="12" x2="17" y2="12"></line>
  </svg>
);
