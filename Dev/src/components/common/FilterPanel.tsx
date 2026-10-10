import React from 'react';
import { X, Filter } from 'lucide-react';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: any;
  setFilters: (filters: any) => void;
  onApply: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ isOpen, onClose, filters, setFilters, onApply }) => {

  const updateFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onApply();
  };

  const handleReset = () => {
    const resetState = { status: 'all', priority: 'all', assignee: 'all', department: 'all', dateRange: 'all' };
    setFilters(resetState);
    onApply();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Invisible backdrop to capture outside clicks */}
      <div 
        className="fixed inset-0 z-[60]"
        onClick={onClose}
      ></div>
      
      {/* Dropdown Popover (like a Calendar) */}
      <div 
        className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 z-[70] flex flex-col overflow-hidden animate-fade-in-up origin-top-right"
      >
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-semibold text-sm">
            <Filter className="w-4 h-4" />
            <span>Advanced Filters</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {['all', 'todo', 'in_progress', 'review', 'done', 'overdue'].map(s => (
                <button 
                  key={s}
                  onClick={() => updateFilter('status', s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filters.status === s ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Priority</label>
            <div className="flex flex-wrap gap-1.5">
              {['all', 'low', 'medium', 'high', 'urgent'].map(p => (
                <button 
                  key={p}
                  onClick={() => updateFilter('priority', p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filters.priority === p ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Assignee</label>
            <select 
              value={filters.assignee}
              onChange={(e) => updateFilter('assignee', e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none text-gray-700 dark:text-gray-300"
            >
              <option value="all">Any Assignee</option>
              <option value="me">Assigned to Me</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
          <button 
            onClick={handleReset}
            className="w-full px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </>
  );
};
