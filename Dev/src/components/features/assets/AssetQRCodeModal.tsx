import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Download, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface AssetQRCodeModalProps {
  asset: any;
  isOpen: boolean;
  onClose: () => void;
}

// Vector Logo Phúc Sinh Consumers nhúng trực tiếp để template SVG tải về độc lập không phụ thuộc link ngoài
const PhucSinhLogoVector: React.FC = () => (
  <g>
    <g>
      {/* Dấu sắc ú */}
      <polygon fill="#00a4d8" points="355.9 237.63 363.63 225.97 374.74 225.97 363.53 237.63 355.9 237.63" />
      {/* Chữ phúc */}
      <g>
        <path fill="#d91f33" d="M252.62,298.81v-34.98c0-3.07.13-5.39.39-6.96.79-4.69,3.06-8.54,6.81-11.53,3.67-2.91,7.91-4.37,12.71-4.37,5.9,0,10.74,1.96,14.52,5.89,3.7,3.88,5.55,8.78,5.55,14.7s-1.85,10.85-5.55,14.7c-3.75,3.93-8.59,5.89-14.52,5.89-1.6,0-3.42-.21-5.47-.63v-13.03c2.2.68,3.87,1.02,5,1.02,2.39,0,4.27-.72,5.65-2.17,1.38-1.45,2.07-3.37,2.07-5.77s-.64-4.21-1.92-5.68c-1.29-1.46-3.08-2.19-5.38-2.19-4.94,0-7.42,2.96-7.42,8.89v36.2h-12.43Z" />
        <path fill="#d91f33" d="M298.22,281.65v-56.34h12.51v19.04c2.52-2.26,5.55-3.38,9.09-3.38,5.09,0,8.96,2.09,11.61,6.26,2.26,3.51,3.38,7.97,3.38,13.38v21.05h-12.43v-22.23c0-1.81-.52-3.31-1.58-4.5-1.05-1.19-2.47-1.79-4.26-1.79s-3.17.6-4.22,1.81c-1.06,1.21-1.58,2.7-1.58,4.49v22.23h-12.51Z" />
        <path fill="#d91f33" d="M353.81,241.76v22.23c0,1.81.51,3.29,1.54,4.45,1.08,1.23,2.51,1.85,4.3,1.85s3.21-.62,4.26-1.85c1.03-1.15,1.54-2.64,1.54-4.45v-22.23h12.51v20.22c0,5.93-1.55,10.74-4.64,14.44-3.3,3.96-7.86,5.94-13.65,5.94-4.09,0-7.76-1.19-11.02-3.58s-5.4-5.53-6.45-9.44c-.55-1.99-.83-4.45-.83-7.36v-20.22h12.43Z" />
        <path fill="#d91f33" d="M411.29,253.92c-4.17,0-6.35.01-6.53.04-2.57.21-4.59.9-6.06,2.09-1.76,1.47-2.64,3.37-2.64,5.7s.88,4.21,2.64,5.63c1.47,1.18,3.49,1.88,6.06,2.09.16.03,2.33.04,6.53.04v12.16h-4.68c-6.64,0-12.08-1.64-16.33-4.92-4.69-3.62-7.04-8.64-7.04-15.07s2.35-11.44,7.04-15.03c4.28-3.25,9.72-4.88,16.33-4.88h4.68v12.16Z" />
      </g>
      {/* Chữ sinh */}
      <g>
        <path fill="#d91f33" d="M318.19,319.59h14.97c1.51,0,2.27-.51,2.27-1.52,0-.73-.36-1.25-1.09-1.56-5.5-2.32-8.92-3.95-10.28-4.89-3.47-2.42-5.2-5.58-5.2-9.46s1.45-6.59,4.34-8.52c2.48-1.64,5.69-2.46,9.65-2.46h13.52v10.67h-13.37c-1.28,0-1.92.51-1.92,1.52,0,.7.35,1.2,1.06,1.49,5.84,2.48,9.41,4.16,10.71,5.04,3.75,2.53,5.63,5.73,5.63,9.61,0,1.9-.42,3.63-1.25,5.2-1.46,2.68-3.7,4.46-6.72,5.32-1.85.52-4.75.78-8.72.78h-13.6v-11.22Z" />
        <path fill="#d91f33" d="M354.38,330.81v-39.63h12.66v39.63h-12.66Z" />
        <path fill="#d91f33" d="M397.88,330.81v-22.08c0-1.8-.51-3.29-1.55-4.47-1.03-1.19-2.44-1.78-4.21-1.78s-3.19.59-4.23,1.78c-1.05,1.19-1.57,2.68-1.57,4.47v22.08h-12.35v-20.09c0-5.89,1.52-10.68,4.57-14.38,3.28-3.96,7.82-5.94,13.6-5.94,4.04,0,7.69,1.19,10.94,3.58,3.26,2.38,5.41,5.5,6.45,9.36.52,1.95.78,4.42.78,7.39v20.09h-12.43Z" />
        <path fill="#d91f33" d="M417.23,330.81v-55.97h12.43v18.92c2.5-2.24,5.51-3.36,9.03-3.36,5.05,0,8.9,2.07,11.53,6.21,2.24,3.49,3.36,7.92,3.36,13.29v20.91h-12.35v-22.08c0-1.8-.52-3.29-1.57-4.47-1.04-1.19-2.46-1.78-4.23-1.78s-3.15.6-4.19,1.8c-1.05,1.2-1.57,2.68-1.57,4.46v22.08h-12.43Z" />
      </g>
    </g>
    {/* Cánh buồm đỏ */}
    <path fill="#d91f33" d="M113.35,371.2s21.86-14.14,80.36-15.79c28.94-2.44,61.26,3.55,63.43,5.74,0,0-41.39-46.01-41.04-108.65.34-62.66,36.8-109.17,66.46-140.77-25.34,13.01-71.83,33.67-118.53,111.61-27.04,45.13-46.86,110.55-50.68,147.87Z" />
    {/* Dải sóng xanh */}
    <path fill="#00a4d8" d="M202.23,411.97s14.51-24.06,40.11-34.55c25.6-10.53,56.46-9.79,78.37-6.22,21.89,3.57,50.81,8.44,73.68,7.27,22.87-1.17,46.74-8.17,59.19-24.64-4.09,7.69-20.55,37.11-65.14,38.56-44.57,1.44-66.1-14.51-107.17-9.06,6.44.19,28.14,3.99,42.26,9.15,14.1,5.14,34.27,9.63,74.37,6.62-11.3,4.57-40.5,13.33-78.95,3.11-38.45-10.23-73.49-18.3-116.72,9.75Z" />
    {/* Chữ CONSUMERS */}
    <g>
      <path fill="#00a4d8" d="M207.98,453.86c-1.59-.82-2.82-1.98-3.69-3.46-.86-1.48-1.3-3.2-1.3-5.14v-9.36c0-1.94.43-3.66,1.3-5.14.86-1.48,2.09-2.63,3.69-3.44s3.44-1.22,5.55-1.22,3.91.39,5.49,1.15c1.58.77,2.81,1.86,3.69,3.28s1.32,3.06,1.32,4.92c0,.24-.16.39-.49.45l-4.74.28h-.08c-.27,0-.41-.15-.41-.45,0-1.43-.44-2.58-1.32-3.44s-2.03-1.3-3.46-1.3-2.63.43-3.5,1.3-1.32,2.01-1.32,3.44v9.76c0,1.4.44,2.54,1.32,3.4.88.86,2.05,1.3,3.5,1.3s2.59-.43,3.46-1.3c.88-.86,1.32-2,1.32-3.4,0-.3.16-.45.49-.45l4.74.2c.13,0,.25.04.34.12.09.08.14.18.14.28,0,1.86-.44,3.51-1.32,4.94s-2.1,2.54-3.69,3.32c-1.58.78-3.41,1.17-5.49,1.17s-3.96-.41-5.55-1.23Z" />
      <path fill="#00a4d8" d="M235.79,453.92c-1.61-.86-2.85-2.07-3.75-3.63s-1.34-3.34-1.34-5.37v-8.67c0-2,.45-3.77,1.34-5.31.89-1.54,2.14-2.73,3.75-3.58,1.61-.85,3.46-1.28,5.57-1.28s4,.43,5.61,1.28c1.61.85,2.85,2.05,3.75,3.58.89,1.54,1.34,3.31,1.34,5.31v8.67c0,2.02-.45,3.82-1.34,5.39-.89,1.57-2.14,2.77-3.75,3.62-1.61.85-3.48,1.28-5.61,1.28s-3.96-.43-5.57-1.29ZM244.96,448.89c.92-.94,1.38-2.2,1.38-3.77v-8.91c0-1.56-.45-2.83-1.36-3.79-.9-.96-2.11-1.44-3.62-1.44s-2.68.48-3.58,1.44c-.91.96-1.36,2.22-1.36,3.79v8.91c0,1.57.45,2.82,1.36,3.77.9.95,2.1,1.42,3.58,1.42s2.69-.47,3.6-1.42Z" />
      <path fill="#00a4d8" d="M275.92,426.56c.09-.09.21-.14.34-.14h4.74c.13,0,.25.05.34.14.09.1.14.21.14.34v27.38c0,.14-.05.25-.14.34s-.21.14-.34.14h-4.58c-.27,0-.46-.11-.57-.32l-10.49-17.33c-.05-.08-.11-.11-.16-.1s-.08.07-.08.18l.08,17.09c0,.14-.05.25-.14.34s-.21.14-.34.14h-4.74c-.13,0-.25-.05-.34-.14-.1-.09-.14-.21-.14-.34v-27.38c0-.13.05-.25.14-.34.1-.09.21-.14.34-.14h4.58c.27,0,.46.11.57.32l10.45,17.25c.05.08.11.12.16.1.05-.01.08-.07.08-.18l-.04-17.01c0-.13.05-.25.14-.34Z" />
      <path fill="#00a4d8" d="M293.56,454.06c-1.62-.69-2.87-1.67-3.75-2.96-.88-1.28-1.32-2.77-1.32-4.48v-.89c0-.13.05-.25.14-.34.09-.1.21-.14.34-.14h4.62c.13,0,.25.05.34.14.09.1.14.21.14.34v.61c0,1.08.5,1.99,1.5,2.73,1,.74,2.35,1.11,4.05,1.11,1.43,0,2.5-.3,3.2-.91.7-.61,1.05-1.36,1.05-2.25,0-.65-.22-1.19-.65-1.64s-1.02-.84-1.76-1.17c-.74-.34-1.92-.8-3.54-1.4-1.81-.62-3.34-1.26-4.6-1.9-1.26-.65-2.31-1.53-3.16-2.65-.85-1.12-1.28-2.5-1.28-4.15s.42-3.04,1.26-4.25c.84-1.22,2-2.15,3.48-2.79,1.48-.65,3.2-.97,5.14-.97,2.05,0,3.88.36,5.49,1.09s2.86,1.75,3.77,3.06c.91,1.31,1.36,2.83,1.36,4.56v.61c0,.13-.05.25-.14.34-.1.09-.21.14-.34.14h-4.66c-.13,0-.25-.05-.34-.14-.09-.1-.14-.21-.14-.34v-.33c0-1.13-.47-2.1-1.4-2.9-.93-.8-2.21-1.19-3.83-1.19-1.27,0-2.26.27-2.98.81-.72.54-1.07,1.28-1.07,2.23,0,.68.21,1.24.63,1.7.42.46,1.04.87,1.86,1.23.82.36,2.1.86,3.83,1.48,1.92.7,3.42,1.32,4.52,1.86,1.09.54,2.08,1.34,2.96,2.41s1.32,2.45,1.32,4.15c0,2.54-.93,4.54-2.79,6.01-1.86,1.47-4.39,2.21-7.57,2.21-2.16,0-4.05-.34-5.67-1.03Z" />
      <path fill="#00a4d8" d="M321.48,453.88c-1.58-.81-2.81-1.95-3.69-3.42s-1.32-3.17-1.32-5.08v-18.47c0-.13.05-.25.14-.34s.21-.14.34-.14h4.74c.13,0,.25.05.34.14.09.1.14.21.14.34v18.51c0,1.43.44,2.59,1.32,3.46.88.88,2.03,1.32,3.46,1.32s2.59-.44,3.46-1.32c.88-.88,1.32-2.03,1.32-3.46v-18.51c0-.13.05-.25.14-.34.1-.09.21-.14.34-.14h4.74c.13,0,.25.05.34.14.1.1.14.21.14.34v18.47c0,1.92-.44,3.61-1.32,5.08s-2.1,2.61-3.69,3.42c-1.58.81-3.41,1.21-5.49,1.21s-3.91-.4-5.49-1.21Z" />
      <path fill="#00a4d8" d="M364.03,426.42h4.74c.13,0,.25.05.34.14.09.1.14.21.14.34v27.38c0,.14-.05.25-.14.34s-.21.14-.34.14h-4.74c-.13,0-.25-.05-.34-.14-.1-.09-.14-.21-.14-.34v-17.86c0-.11-.03-.16-.08-.16s-.11.04-.16.12l-4.29,6.72c-.14.22-.32.32-.57.32h-2.39c-.24,0-.43-.11-.57-.32l-4.29-6.72c-.05-.08-.11-.11-.16-.1s-.08.07-.08.18v17.82c0,.14-.05.25-.14.34s-.21.14-.34.14h-4.74c-.13,0-.25-.05-.34-.14-.1-.09-.14-.21-.14-.34v-27.38c0-.13.05-.25.14-.34.1-.09.21-.14.34-.14h4.74c.24,0,.43.11.57.32l6.07,9.44c.08.16.16.16.24,0l6.12-9.44c.13-.22.32-.32.57-.32Z" />
      <path fill="#00a4d8" d="M396.81,431.18c-.1.1-.21.14-.34.14h-13.28c-.13,0-.2.07-.2.2v6.28c0,.13.07.2.2.2h8.71c.13,0,.25.05.34.14.1.1.14.21.14.34v3.93c0,.13-.05.25-.14.34s-.21.14-.34.14h-8.71c-.13,0-.2.07-.2.2v6.56c0,.13.07.2.2.2h13.28c.13,0,.25.05.34.14s.14.21.14.34v3.93c0,.14-.05.25-.14.34s-.21.14-.34.14h-18.71c-.13,0-.25-.05-.34-.14-.1-.09-.14-.21-.14-.34v-27.38c0-.13.05-.25.14-.34.1-.09.21-.14.34-.14h18.71c.13,0,.25.05.34.14.09.1.14.21.14.34v3.93c0,.14-.05.25-.14.34Z" />
      <path fill="#00a4d8" d="M418.99,454.4l-5.06-11.22c-.05-.11-.13-.16-.24-.16h-3.77c-.13,0-.2.07-.2.2v11.06c0,.14-.05.25-.14.34s-.21.14-.34.14h-4.74c-.13,0-.25-.05-.34-.14-.1-.09-.14-.21-.14-.34v-27.38c0-.13.05-.25.14-.34.1-.09.21-.14.34-.14h11.58c1.73,0,3.25.35,4.56,1.05,1.31.7,2.32,1.7,3.04,3,.71,1.3,1.07,2.79,1.07,4.5,0,1.84-.46,3.41-1.38,4.72-.92,1.31-2.2,2.24-3.85,2.77-.14.05-.18.15-.12.28l5.51,11.46c.05.11.08.19.08.24,0,.22-.15.32-.45.32h-4.98c-.27,0-.46-.12-.57-.36ZM409.71,431.52v6.93c0,.14.07.2.2.2h5.31c1.13,0,2.06-.34,2.77-1.01.71-.67,1.07-1.55,1.07-2.63s-.36-1.96-1.07-2.65c-.72-.69-1.64-1.03-2.77-1.03h-5.31c-.13,0-.2.07-.2.2Z" />
      <path fill="#00a4d8" d="M436,454.06c-1.62-.69-2.87-1.67-3.75-2.96-.88-1.28-1.32-2.77-1.32-4.48v-.89c0-.13.05-.25.14-.34.09-.1.21-.14.34-.14h4.62c.13,0,.25.05.34.14.09.1.14.21.14.34v.61c0,1.08.5,1.99,1.5,2.73,1,.74,2.35,1.11,4.05,1.11,1.43,0,2.5-.3,3.2-.91.7-.61,1.05-1.36,1.05-2.25,0-.65-.22-1.19-.65-1.64s-1.02-.84-1.76-1.17c-.74-.34-1.92-.8-3.54-1.4-1.81-.62-3.34-1.26-4.6-1.9-1.26-.65-2.31-1.53-3.16-2.65-.85-1.12-1.28-2.5-1.28-4.15s.42-3.04,1.26-4.25c.84-1.22,2-2.15,3.48-2.79,1.48-.65,3.2-.97,5.14-.97,2.05,0,3.88.36,5.49,1.09s2.86,1.75,3.77,3.06c.91,1.31,1.36,2.83,1.36,4.56v.61c0,.13-.05.25-.14.34-.1.09-.21.14-.34.14h-4.66c-.13,0-.25-.05-.34-.14-.09-.1-.14-.21-.14-.34v-.33c0-1.13-.47-2.1-1.4-2.9-.93-.8-2.21-1.19-3.83-1.19-1.27,0-2.26.27-2.98.81-.72.54-1.07,1.28-1.07,2.23,0,.68.21,1.24.63,1.7.42.46,1.04.87,1.86,1.23.82.36,2.1.86,3.83,1.48,1.92.7,3.42,1.32,4.52,1.86,1.09.54,2.08,1.34,2.96,2.41s1.32,2.45,1.32,4.15c0,2.54-.93,4.54-2.79,6.01-1.86,1.47-4.39,2.21-7.57,2.21-2.16,0-4.05-.34-5.67-1.03Z" />
    </g>
  </g>
);

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
    const templateSvg = document.getElementById('asset-qr-template-svg');
    if (!templateSvg) {
      toast.error('Không tìm thấy mẫu mã QR để tải.');
      return;
    }
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(templateSvg);

    // Đảm bảo namespace xmlns
    if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
      svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const fullSvgContent = `<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`;
    const blob = new Blob([fullSvgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR-${asset.asset_code || 'asset'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Đã tải xuống mã QR (chuẩn 3x4).');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* CSS dành riêng cho In nhãn Sticker 3x4 nét chuẩn */}
      <style>{`
        @media print {
          @page {
            size: 75mm 100mm;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #asset-qr-print-sticker,
          #asset-qr-print-sticker * {
            visibility: visible !important;
          }
          #asset-qr-print-sticker {
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            display: grid !important;
            place-items: center !important;
            background: #ffffff !important;
            z-index: 999999 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #asset-qr-print-sticker svg {
            width: 75mm !important;
            height: 100mm !important;
            max-width: 100% !important;
            max-height: 100% !important;
          }
        }
      `}</style>

      {/* Modal Popup hiển thị trên màn hình */}
      <div className="fixed inset-0 z-[110] grid place-items-center p-4 overflow-y-auto print:hidden">
        {/* Backdrop mờ */}
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Khung Card Modal chuẩn UI Ref done layout popup.png */}
        <div role="dialog" aria-modal="true" aria-labelledby="asset-qr-title" className="relative bg-white dark:bg-[#151c2c] border border-slate-100 dark:border-slate-700/80 rounded-[32px] w-full max-w-[360px] sm:max-w-[380px] overflow-hidden shadow-2xl z-10 my-auto p-6 sm:p-7 grid justify-items-center text-center animate-in fade-in zoom-in-95 duration-200">
          
          {/* Nút Đóng X */}
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="absolute top-4 right-4 p-2.5 min-h-[44px] min-w-[44px] grid place-items-center rounded-full text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
          >
            <X size={20} />
          </button>

          {/* 1. Logo Phúc Sinh Consumers ở trên cùng */}
          <div className="w-full grid place-items-center mt-1 mb-4">
            <img
              src="/logo-phuc-sinh.svg"
              alt="Phúc Sinh Consumers"
              className="h-16 w-auto object-contain mx-auto"
            />
          </div>

          {/* 2. Khung chứa mã QR bo góc màu xanh nhạt - QR luôn giữ nền trắng theo yêu cầu */}
          <div className="bg-[#f2f7fc] dark:bg-white p-4 rounded-[28px] border border-blue-100/70 dark:border-slate-300 shadow-xs grid place-items-center mb-4">
            <QRCodeSVG
              id="asset-qr-code-svg"
              value={qrData}
              size={180}
              bgColor="#ffffff"
              fgColor="#000000"
              level="Q"
              includeMargin={false}
              className="rounded-xl"
            />
          </div>

          {/* 3. Tên thiết bị - Bold Navy */}
          <h3 id="asset-qr-title" className="text-lg sm:text-xl font-bold text-[#002e6d] dark:text-white leading-snug tracking-tight mb-1 px-2 line-clamp-2">
            {asset.name}
          </h3>

          {/* 4. Mã thiết bị - Italic Xám xanh */}
          <p className="text-sm font-medium italic text-[#4b6b94] dark:text-sky-300 tracking-wide mb-6">
            {asset.asset_code}
          </p>

          {/* 5. 3 Nút chức năng ở dưới: Sao chép, Tải về, In mã */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full">
            {/* Nút 1: Sao chép */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="min-h-[44px] px-2.5 py-2.5 grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-semibold transition-all shadow-xs active:scale-95"
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
            </button>

            {/* Nút 2: Tải về */}
            <button
              type="button"
              onClick={handleDownload}
              className="min-h-[44px] px-2.5 py-2.5 grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 bg-[#e2edfa] hover:bg-[#d0e2f7] dark:bg-sky-950/70 dark:hover:bg-sky-900/90 text-[#002e6d] dark:text-sky-300 rounded-2xl text-xs sm:text-sm font-semibold transition-all shadow-xs active:scale-95"
            >
              <Download size={16} />
              <span>Tải về</span>
            </button>

            {/* Nút 3: In mã */}
            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[44px] px-2.5 py-2.5 grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 bg-[#002e6d] hover:bg-[#00204d] text-white rounded-2xl text-xs sm:text-sm font-semibold transition-all shadow-md shadow-[#002e6d]/25 active:scale-95"
            >
              <Printer size={16} />
              <span>In mã</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mẫu Template SVG chuẩn 3x4 (width 300, height 400) theo temp tải về.png - Dùng để In & Tải file SVG */}
      <div id="asset-qr-print-sticker" className="hidden print:grid">
        <svg
          id="asset-qr-template-svg"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 300 400"
          width="300"
          height="400"
          className="w-[300px] h-[400px] bg-white"
        >
          {/* Viền xanh navy bo góc ngoài theo temp tải về.png */}
          <rect
            x="7"
            y="7"
            width="286"
            height="386"
            rx="24"
            fill="#ffffff"
            stroke="#002e6d"
            strokeWidth="10"
          />

          {/* Logo Phúc Sinh Consumers vector */}
          <g transform="translate(150, 66) scale(0.24) translate(-276.5, -280)">
            <PhucSinhLogoVector />
          </g>

          {/* Khung QR code bo góc màu xanh nhạt */}
          <rect
            x="50"
            y="118"
            width="200"
            height="200"
            rx="20"
            fill="#f2f7fc"
            stroke="#e1edfa"
            strokeWidth="1.5"
          />

          {/* QR code bên trong khung */}
          <QRCodeSVG
            x={65}
            y={133}
            width={170}
            height={170}
            size={170}
            value={qrData}
            bgColor="#ffffff"
            fgColor="#000000"
            level="Q"
            includeMargin={false}
          />

          {/* Tên thiết bị - Bold Navy */}
          <text
            x="150"
            y="346"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="15"
            fontWeight="700"
            fill="#002e6d"
            textAnchor="middle"
          >
            {asset.name && asset.name.length > 28 ? `${asset.name.slice(0, 26)}...` : asset.name}
          </text>

          {/* Mã thiết bị - Italic Xám xanh */}
          <text
            x="150"
            y="370"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="13"
            fontStyle="italic"
            fontWeight="500"
            fill="#4b6b94"
            textAnchor="middle"
          >
            {asset.asset_code}
          </text>
        </svg>
      </div>
    </>
  );
};

