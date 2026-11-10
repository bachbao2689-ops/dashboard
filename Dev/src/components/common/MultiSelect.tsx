import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
export const MultiSelect = ({ options, value, onChange, placeholder, maxSelected = Infinity, primaryValue, onPrimaryChange, buttonClassName }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClick); return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = options.filter((o: any) => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={wrapperRef}>
      <button type="button" aria-label={placeholder} aria-expanded={isOpen} onKeyDown={e => { if (e.key === 'Escape') setIsOpen(false); }} onClick={() => setIsOpen(!isOpen)} className={`w-full text-left px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium cursor-pointer inline-grid grid-flow-col auto-cols-max items-center gap-1 min-h-[38px] overflow-x-auto shadow-sm transition-colors ${buttonClassName || ''}`}>
        {value.length === 0 && <span className="text-gray-400 text-xs truncate">{placeholder}</span>}
        {value.map((v: string) => {
           const opt = options.find((o: any) => o.value === v);
           return <span key={v} className="px-2 py-0.5 bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300 rounded-md text-xs font-semibold inline-grid grid-flow-col auto-cols-max items-center gap-1">{opt?.label}{onPrimaryChange && primaryValue === v && <span className="font-bold"> · Chính</span>} <X size={12} onClick={(e) => { e.stopPropagation(); onChange(value.filter((x: string) => x !== v)); }} className="cursor-pointer hover:text-red-500"/></span>
        })}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-[100] p-2">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm kiếm PIC..." className="w-full p-2 text-sm border-b border-gray-100 dark:border-slate-700 outline-none bg-transparent mb-2 text-gray-900 dark:text-white"/>
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
             {filtered.map((o: any) => (
               <div key={o.value} className="grid grid-cols-[1fr_auto] items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg">
               <label className="grid grid-flow-col auto-cols-max items-center gap-2 min-w-0 cursor-pointer">
                 <input type="checkbox" checked={value.includes(o.value)} onChange={(e) => {
                    if (e.target.checked) onChange(maxSelected === 1 ? [o.value] : [...value, o.value].slice(0, maxSelected));
                    else onChange(value.filter((v: string) => v !== o.value));
                 }} className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"/>
                 <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{o.label}</span>
               </label>
               {onPrimaryChange && value.includes(o.value) && <button type="button" aria-label={`Đặt ${o.label} làm PIC chính`} aria-pressed={primaryValue === o.value} onClick={() => onPrimaryChange(o.value)} className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-primary dark:text-blue-300 hover:bg-primary/10 cursor-pointer">{primaryValue === o.value ? '✓ Chính' : 'Đặt chính'}</button>}
               </div>
             ))}
             {filtered.length === 0 && <div className="text-center text-sm text-gray-400 p-2">Không tìm thấy</div>}
          </div>
        </div>
      )}
    </div>
  );
};
