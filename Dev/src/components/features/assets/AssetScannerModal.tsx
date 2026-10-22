import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, QrCode, Camera, CameraOff, ChevronRight } from "lucide-react";
import type { Asset } from "../../../hooks/useAssets";
import toast from "react-hot-toast";

interface AssetScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (asset: Asset) => void;
  assets?: Asset[];
}

function extractAssetCode(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes("?code=") || trimmed.includes("&code=")) {
    try {
      const url = new URL(trimmed, window.location.origin);
      const code = url.searchParams.get("code");
      if (code) return code.trim();
    } catch {
      const match = trimmed.match(/[?&]code=([^&]+)/);
      if (match) return decodeURIComponent(match[1]).trim();
    }
  }
  if (trimmed.startsWith("KCOFFEE-ASSET:")) {
    return trimmed.replace("KCOFFEE-ASSET:", "").trim();
  }
  return trimmed;
}

export const AssetScannerModal: React.FC<AssetScannerModalProps> = ({
  isOpen,
  onClose,
  onSelectAsset,
  assets = [],
}) => {
  const [inputCode, setInputCode] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const handleSelectCode = useCallback(
    (rawCode: string) => {
      const cleanCode = extractAssetCode(rawCode);
      if (!cleanCode) return;

      const found = assets.find(
        (a) =>
          a.asset_code?.toLowerCase() === cleanCode.toLowerCase() ||
          String(a.id).toLowerCase() === cleanCode.toLowerCase()
      );

      if (found) {
        stopCamera();
        onSelectAsset(found);
        toast.success(`Đã tìm thấy: ${found.name}`);
        onClose();
      } else {
        toast.error(`Không tìm thấy thiết bị có mã "${cleanCode}" trong danh sách.`);
      }
    },
    [assets, onClose, onSelectAsset, stopCamera]
  );

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Trình duyệt không hỗ trợ truy cập camera.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      if ("BarcodeDetector" in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ["qr_code", "code_128", "code_39", "ean_13"],
          });

          scanIntervalRef.current = window.setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState === 4) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  handleSelectCode(barcodes[0].rawValue);
                }
              } catch {
                // Ignore detection frame error
              }
            }
          }, 400);
        } catch {
          // BarcodeDetector initialization fallback
        }
      }
    } catch (err: any) {
      console.warn("Camera access error:", err);
      setCameraError(
        err?.name === "NotAllowedError"
          ? "Quyền truy cập camera bị từ chối. Vui lòng cho phép quyền hoặc nhập mã thủ công."
          : "Không thể mở camera trên thiết bị này. Vui lòng nhập mã thiết bị."
      );
      stopCamera();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setInputCode("");
      setCameraError(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, stopCamera]);

  if (!isOpen) return null;

  const trimmedQuery = inputCode.trim().toLowerCase();
  const matchingAssets = trimmedQuery
    ? assets
        .filter(
          (a) =>
            Boolean(a.name?.toLowerCase().includes(trimmedQuery) ||
            a.asset_code?.toLowerCase().includes(trimmedQuery))
        )
        .slice(0, 5)
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    handleSelectCode(inputCode);
  };

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white dark:bg-[#1e2330] border border-white/60 dark:border-slate-700/80 rounded-[32px] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-2xl z-10 my-auto">
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 p-4 sm:p-6 border-b border-gray-100 dark:border-slate-700/60">
          <div className="grid grid-cols-[auto_1fr] items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#002e6d]/10 dark:bg-cyan-500/10 grid place-items-center text-[#002e6d] dark:text-cyan-400 shrink-0">
              <QrCode size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight truncate">
                Quét & Tra Cứu Thiết Bị
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                Quét mã QR bằng camera hoặc tra cứu mã tài sản nhanh
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="min-h-[44px] min-w-[44px] grid place-items-center rounded-full text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Camera Viewfinder Area */}
          <div className="relative w-full aspect-video sm:h-56 bg-slate-900 rounded-2xl overflow-hidden grid place-items-center border border-gray-200/50 dark:border-slate-700/60 shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
            />

            {cameraActive ? (
              <>
                {/* Scanner laser and overlay reticle */}
                <div className="absolute inset-6 pointer-events-none border-2 border-cyan-400/50 rounded-xl grid place-items-center">
                  <div className="w-full h-0.5 bg-cyan-400 shadow-[0_0_12px_#38bdf8] animate-pulse" />
                </div>
                <div className="absolute bottom-3 inset-x-3 grid justify-items-center">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="min-h-[44px] px-3 py-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-medium rounded-lg grid grid-flow-col auto-cols-max items-center gap-1.5 transition-colors border border-white/20"
                  >
                    <CameraOff size={14} />
                    <span>Tắt camera</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="grid justify-items-center text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-white/10 grid place-items-center text-gray-300">
                  <Camera size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Quét bằng Camera</p>
                  <p className="text-xs text-gray-400 max-w-xs mt-1">
                    Cho phép camera để nhận diện mã QR tự động trên thiết bị
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startCamera}
                  className="min-h-[44px] px-4 py-2 bg-[#002e6d] hover:bg-[#001f4d] text-white rounded-xl text-xs sm:text-sm font-semibold grid grid-flow-col auto-cols-max items-center gap-2 transition-all shadow-md shadow-[#002e6d]/30"
                >
                  <Camera size={16} />
                  <span>Bật camera quét</span>
                </button>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-300 text-xs leading-relaxed">
              {cameraError}
            </div>
          )}

          {/* Manual Input Search */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Hoặc nhập mã thiết bị / dán link QR:
            </label>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="Vd: AST-0001, AST-LAP-01..."
                  className="w-full min-h-[44px] px-4 py-2 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={!inputCode.trim()}
                className="min-h-[44px] px-5 bg-[#002e6d] hover:bg-[#001f4d] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-xs sm:text-sm grid place-items-center transition-all shadow-sm shadow-[#002e6d]/20"
              >
                Tra cứu
              </button>
            </form>
          </div>

          {/* Real-time search suggestions */}
          {matchingAssets.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                Kết quả phù hợp ({matchingAssets.length})
              </p>
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {matchingAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      stopCamera();
                      onSelectAsset(asset);
                      toast.success(`Đã chọn: ${asset.name}`);
                      onClose();
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 hover:bg-primary/5 dark:hover:bg-primary/20 border border-gray-100 dark:border-slate-700/60 transition-all grid grid-cols-[auto_1fr_auto] items-center gap-3 min-h-[44px] group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700/60 grid place-items-center text-primary dark:text-cyan-400 border border-gray-200/50 dark:border-slate-600/50">
                      <QrCode size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors">
                        {asset.name}
                      </p>
                      <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate">
                        {asset.asset_code} · {asset.category?.name || "Thiết bị"}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
