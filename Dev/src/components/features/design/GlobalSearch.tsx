import React, { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { Search, ArrowRight, Clock, Folder, CheckSquare, User, Package, X } from 'lucide-react';
import { cn } from '../../common/KpiCard';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const MOCK_DATA = [
  { id: '1', title: 'Dashboard Redesign', category: 'PROJECTS', icon: Folder },
  { id: '2', title: 'Mobile App Updates', category: 'PROJECTS', icon: Folder },
  { id: '3', title: 'Fix Navigation Bug', category: 'TASKS', icon: CheckSquare },
  { id: '4', title: 'Review PR #42', category: 'TASKS', icon: CheckSquare },
  { id: '5', title: 'Alice Chen', category: 'MEMBERS', icon: User },
  { id: '6', title: 'Bob Smith', category: 'MEMBERS', icon: User },
  { id: '7', title: 'Logo Vector', category: 'ASSETS', icon: Package },
  { id: '8', title: 'Brand Guidelines', category: 'ASSETS', icon: Package },
];

const RECENT_SEARCHES = ['Dashboard', 'Alice', 'Logo'];

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setDebouncedQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setSelectedIndex(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = debouncedQuery 
    ? MOCK_DATA.filter(item => item.title.toLowerCase().includes(debouncedQuery.toLowerCase()))
    : [];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (debouncedQuery && results.length > 0) {
        onClose();
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const groupedResults = results.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof MOCK_DATA>);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/20 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div 
        ref={containerRef}
        className={cn(
          "w-full max-w-[600px] mx-4 flex flex-col",
          "glass-panel rounded-2xl overflow-hidden shadow-2xl",
          "border border-gray-100 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95"
        )}
      >
        <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 px-3 py-2 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 text-lg"
            placeholder="Search projects, tasks, members..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {!debouncedQuery ? (
            <div className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 px-2">RECENT SEARCHES</h3>
              <div className="space-y-1">
                {RECENT_SEARCHES.map((search, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuery(search);
                      inputRef.current?.focus();
                    }}
                    className="w-full flex items-center px-2 py-2 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Clock className="w-4 h-4 mr-3 text-gray-400" />
                    {search}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-4 p-4">
              {Object.entries(groupedResults).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-2">{category}</h3>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const isSelected = results.indexOf(item) === selectedIndex;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={onClose}
                          className={cn(
                            "w-full flex items-center px-2 py-2 rounded-xl text-sm transition-colors",
                            isSelected 
                              ? "bg-primary/10 text-primary dark:text-white" 
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                          )}
                        >
                          <Icon className={cn("w-4 h-4 mr-3", isSelected ? "text-primary" : "text-gray-400")} />
                          <span className="flex-1 text-left">{item.title}</span>
                          {isSelected && <ArrowRight className="w-4 h-4 opacity-50" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No results found for "{debouncedQuery}"
            </div>
          )}
        </div>
        
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
          <div className="flex space-x-4">
            <span className="flex items-center"><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 mr-1.5 shadow-sm font-sans">↑↓</kbd> navigate</span>
            <span className="flex items-center"><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 mr-1.5 shadow-sm font-sans">↵</kbd> select</span>
          </div>
          <span className="flex items-center"><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 mr-1.5 shadow-sm font-sans">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
};
