import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X } from 'lucide-react';
import { getCroppedImg } from '../../utils/cropImage';

interface CropModalProps {
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => void;
}

export const CropModal: React.FC<CropModalProps> = ({ imageSrc, onClose, onCropComplete }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    try {
      setIsProcessing(true);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedBlob);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-100 dark:border-[#8fa8d0]">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#8fa8d0] flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Chỉnh sửa ảnh đại diện</h2>
          <button onClick={onClose} disabled={isProcessing} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors text-gray-500 disabled:opacity-50">
            <X size={20} />
          </button>
        </div>
        
        <div className="relative w-full h-80 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={handleCropComplete}
            onZoomChange={setZoom}
          />
        </div>
        
        <div className="p-6 bg-white dark:bg-slate-800 space-y-6">
          <div>
            <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
              <span>Thu nhỏ</span>
              <span>Phóng to</span>
            </div>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
          
          <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-[#8fa8d0]">
            <button 
              onClick={onClose} 
              disabled={isProcessing}
              className="flex-1 px-4 py-2.5 font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors"
            >
              Hủy bỏ
            </button>
            <button 
              onClick={handleSave} 
              disabled={isProcessing}
              className="flex-1 px-4 py-2.5 font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-sm transition-colors flex items-center justify-center"
            >
              {isProcessing ? 'Đang xử lý...' : 'Áp dụng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
