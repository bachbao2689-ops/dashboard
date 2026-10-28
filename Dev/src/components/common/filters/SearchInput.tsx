import { useEffect, useRef, useState, useId } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}: SearchInputProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  const hasValue = Boolean(value && value.trim().length > 0);

  return (
    <div
      ref={containerRef}
      className={`relative inline-block shrink-0 transition-all duration-300 ${
        isExpanded ? 'z-20 w-48 sm:w-64 max-w-[calc(100vw-3rem)]' : 'w-9 sm:w-10'
      } ${className}`}
    >
      <div
        className={`relative h-9 sm:h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs transition-all duration-300 overflow-hidden ${
          isExpanded
            ? 'w-full ring-2 ring-primary/20 border-primary dark:border-[#85df7d]/70'
            : 'w-9 sm:w-10 hover:border-gray-300 dark:hover:border-slate-600'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            if (!isExpanded) {
              setIsExpanded(true);
            }
          }}
          aria-label={placeholder}
          aria-expanded={isExpanded}
          title={placeholder}
          className={`absolute left-0 top-0 h-full w-9 sm:w-10 grid place-items-center text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors cursor-pointer z-10 ${
            isExpanded ? 'pointer-events-none text-gray-400 dark:text-slate-400' : ''
          }`}
        >
          <Search size={16} />
          {!isExpanded && hasValue && (
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-white dark:ring-slate-800 pointer-events-none"
              aria-hidden="true"
            />
          )}
        </button>

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          tabIndex={isExpanded ? 0 : -1}
          className={`w-full h-full pl-9 pr-8 text-xs sm:text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none border-none transition-opacity duration-200 ${
            isExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        />

        {isExpanded && hasValue && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            aria-label="Xóa từ khóa"
            title="Xóa từ khóa"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded cursor-pointer grid place-items-center transition-colors z-10"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
