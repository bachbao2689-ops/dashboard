import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Search, X} from 'lucide-react';
import {ActionButton} from '../ActionButton';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}
export function SearchInput({value, onChange, placeholder = 'Search...', className = ''}: SearchInputProps) {
  const [top, setTop] = useState<number | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (top === null) return;
    input.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) setTop(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {setTop(null); trigger.current?.focus();}
    };
    const reposition = () => {
      if (!window.matchMedia('(max-width: 767px)').matches) setTop(null);
      else if (trigger.current) setTop(Math.max(8, Math.min(window.innerHeight - 80, trigger.current.getBoundingClientRect().bottom + 8)));
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', reposition);
    return () => {document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); window.removeEventListener('resize', reposition);};
  }, [top]);
  return <div className={`mobile-search relative flex items-center ${className}`}>
    <div className="mobile-search-trigger">
      <ActionButton ref={trigger} icon={<Search size={16}/>} label={placeholder} aria-expanded={top !== null}
        badge={value ? '•' : undefined}
        onClick={() => setTop(top === null ? Math.max(8, Math.min(window.innerHeight - 80, (trigger.current?.getBoundingClientRect().bottom || 60) + 8)) : null)}
        className="rounded-xl border border-gray-200 bg-white text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300" />
    </div>
    <div className="mobile-search-desktop relative flex items-center">
      <Search size={14} className="absolute left-3 text-gray-400 pointer-events-none" />
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        className="h-9 pl-8 pr-7 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all w-36 sm:w-48 focus:w-60 shadow-2xs" />
      {value && <button type="button" onClick={() => onChange('')} className="absolute right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded cursor-pointer" aria-label="Clear search"><X size={12}/></button>}
    </div>
    {top !== null && createPortal(<div ref={panel} className="mobile-search-panel" style={{top}} role="search">
      <input ref={input} type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}/>
      <ActionButton icon={<X size={18}/>} label="Đóng tìm kiếm" onClick={() => {setTop(null); trigger.current?.focus();}} className="rounded-xl text-gray-500 dark:text-gray-300" />
    </div>, document.body)}
  </div>;
}
