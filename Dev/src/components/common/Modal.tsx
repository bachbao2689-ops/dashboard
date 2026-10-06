import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  variant?: 'dialog' | 'drawer';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, variant = 'dialog' }) => {
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
    <div className={`fixed inset-0 z-[100] flex ${variant === 'drawer' ? 'items-stretch justify-end' : 'items-center justify-center p-4 sm:p-6'}`}>
      <div 
        className="absolute inset-0 bg-slate-900/40 dark:bg-slate-900/70 transition-opacity"
        onClick={onClose}
      />
      
      <div className={`relative bg-white dark:bg-slate-800 shadow-xl border border-gray-200 dark:border-slate-700 w-full overflow-hidden flex flex-col ${variant === 'drawer' ? 'max-w-[620px] h-full rounded-l-3xl border-l-4 border-l-amber-400 drawer-slide-in' : 'max-w-2xl rounded-3xl max-h-[95vh] animate-in fade-in zoom-in-95 duration-200'}`}>
        
        <div className={`flex items-center justify-between p-6 md:px-8 ${variant === 'drawer' ? 'py-4 border-b border-gray-200 dark:border-slate-700' : 'pt-8'}`}>
          <h3 className={`${variant === 'drawer' ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>{title}</h3>
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className={`p-6 md:p-8 overflow-y-auto custom-scrollbar ${variant === 'drawer' ? 'flex-1' : 'pt-2'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};
