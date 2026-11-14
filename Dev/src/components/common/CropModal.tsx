import React, { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";
import { X } from "lucide-react";
import { getCroppedImg } from "../../utils/cropImage";

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

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => !isProcessing && onClose()}
      className="fixed inset-0 z-[10100] grid place-items-center p-4 bg-slate-950/65 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        data-modal-surface="true"
        onClick={(e) => e.stopPropagation()}
        className="modal-liquid-glass rounded-2xl w-full max-w-md overflow-hidden grid border border-white/95 dark:border-slate-700/80"
      >
        <div className="px-6 py-4 border-b border-slate-200/75 dark:border-slate-800/80 grid grid-cols-[1fr_auto] items-center gap-3">
          <h2 className="text-lg font-bold text-[#002e6d] dark:text-white">Chỉnh sửa ảnh đại diện</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="min-h-[36px] min-w-[36px] grid place-items-center hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-50 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative w-full h-80 bg-slate-950">
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

        <div className="p-6 space-y-5">
          <div>
            <div className="grid grid-cols-[auto_auto] justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
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
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#002e6d] dark:accent-sky-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/75 dark:border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-200 bg-white/90 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isProcessing}
              className="btn-add-new px-4 py-2.5 font-semibold text-white rounded-xl shadow-sm transition-colors grid place-items-center cursor-pointer"
            >
              {isProcessing ? "Đang xử lý..." : "Áp dụng"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
