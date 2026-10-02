import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] border border-white/60 dark:border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Decorative top glare */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent"></div>

        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-slate-700/50 bg-white/30 dark:bg-slate-800/30">
          <h3 className="text-xl font-extrabold text-gray-900 dark:text-white drop-shadow-sm">{title}</h3>
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
