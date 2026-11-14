import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  variant?: "dialog" | "drawer";
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, variant = "dialog" }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[10050] grid ${variant === "drawer" ? "place-items-stretch justify-items-end" : "place-items-center p-3 sm:p-6"}`}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-slate-950/45 dark:bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div
        data-modal-surface="true"
        onClick={(e) => e.stopPropagation()}
        className={`modal-liquid-glass relative w-full border border-white/95 dark:border-slate-700/80 overflow-hidden grid grid-rows-[auto_1fr] ${variant === "drawer" ? "max-w-[620px] h-full rounded-l-3xl border-l border-blue-500/20 shadow-drawer-task drawer-slide-in" : "max-w-2xl rounded-2xl max-h-[92dvh] animate-in fade-in zoom-in-95 duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)]"}`}
      >
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200/75 dark:border-slate-800/80 grid grid-cols-[1fr_auto] items-center gap-3 shrink-0">
          {title ? (
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#002e6d] dark:text-white truncate">{title}</h3>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="min-h-[36px] min-w-[36px] grid place-items-center hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
