import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Download, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface AssetQRCodeModalProps {
  asset: any;
  isOpen: boolean;
  onClose: () => void;
}

export const AssetQRCodeModal: React.FC<AssetQRCodeModalProps> = ({ asset, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !asset) return null;

  const qrData = `${window.location.origin}/assets?code=${encodeURIComponent(asset.asset_code || '')}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrData);
      setCopied(true);
      toast.success('Đã sao chép liên kết thiết bị!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Không thể sao chép liên kết.');
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById('asset-qr-code-svg');
    if (!svg) {
      toast.error('Không tìm thấy mã QR để tải.');
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR-${asset.asset_code || 'asset'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Đã tải xuống mã QR.');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center p-4 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-[#f4f6f8] dark:bg-[#1e2330] border border-white/60 dark:border-slate-700/80 rounded-[32px] w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-2xl z-10 my-auto">
        
        <button 
          onClick={onClose}
          aria-label="Đóng"
          className="absolute top-4 right-4 p-2 min-h-[44px] min-w-[44px] grid place-items-center text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all z-10"
        >
          <X size={20} />
        </button>

        <div className="p-6 sm:p-8 grid justify-items-center text-center">
          <div className="w-12 h-12 rounded-full bg-[#002e6d]/10 dark:bg-white/10 grid place-items-center mb-4">
            <ScanLine className="w-6 h-6 text-[#002e6d] dark:text-cyan-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Mã QR Thiết Bị</h3>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 truncate max-w-full px-2">{asset.name}</p>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 mb-3 group relative grid place-items-center">
            <QRCodeSVG 
              id="asset-qr-code-svg"
              value={qrData} 
              size={180} 
              bgColor="#ffffff"
              fgColor="#000000"
              level="Q"
              includeMargin={false}
            />
          </div>

          <div className="bg-gray-100 dark:bg-black/30 px-4 py-1.5 rounded-lg font-mono text-xs sm:text-sm text-gray-800 dark:text-gray-200 tracking-wider mb-3 border border-gray-200 dark:border-slate-700/50">
            {asset.asset_code}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mb-6 leading-relaxed">
            Quét mã bằng camera điện thoại để truy cập nhanh thông tin thiết bị hoặc sao chép liên kết chia sẻ.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
            <button 
              type="button"
              onClick={handleCopyLink}
              className="min-h-[44px] py-2 px-3 grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all shadow-xs"
            >
              {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
              <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
            </button>
            <button 
              type="button"
              onClick={handleDownload}
              className="min-h-[44px] py-2 px-3 grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold transition-colors"
            >
              <Download size={15} />
              <span>Tải về</span>
            </button>
            <button 
              type="button"
              onClick={handlePrint}
              className="min-h-[44px] py-2 px-3 grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 bg-[#002e6d] hover:bg-[#001f4d] text-white rounded-xl text-xs font-semibold transition-colors shadow-lg shadow-[#002e6d]/20"
            >
              <Printer size={15} />
              <span>In mã</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ScanLine = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
    <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
    <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
    <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
    <line x1="7" y1="12" x2="17" y2="12"></line>
  </svg>
);
