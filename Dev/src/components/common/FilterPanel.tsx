import React, { useState } from 'react';
import { X, Filter } from 'lucide-react';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: any;
  setFilters: (filters: any) => void;
  onApply: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ isOpen, onClose, filters, setFilters, onApply }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleApply = () => {
    setFilters(localFilters);
    onApply();
    onClose();
  };

  const handleReset = () => {
    const resetState = { status: 'all', priority: 'all', assignee: 'all', department: 'all', dateRange: 'all' };
    setLocalFilters(resetState);
    setFilters(resetState);
    onApply();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[60] transition-opacity"
          onClick={onClose}
        ></div>
      )}
      
      {/* Slide-out Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-gray-800 shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100 font-semibold text-lg">
            <Filter className="w-5 h-5" />
            <h2>Advanced Filters</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {['all', 'todo', 'in_progress', 'review', 'done', 'overdue'].map(s => (
                <button 
                  key={s}
                  onClick={() => setLocalFilters({ ...localFilters, status: s })}
                  className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${localFilters.status === s ? 'bg-primary text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Priority</label>
            <div className="flex flex-wrap gap-2">
              {['all', 'low', 'medium', 'high', 'urgent'].map(p => (
                <button 
                  key={p}
                  onClick={() => setLocalFilters({ ...localFilters, priority: p })}
                  className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${localFilters.priority === p ? 'bg-primary text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Assignee</label>
            <select 
              value={localFilters.assignee}
              onChange={(e) => setLocalFilters({ ...localFilters, assignee: e.target.value })}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            >
              <option value="all">Any Assignee</option>
              <option value="me">Assigned to Me</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Due Date</label>
            <select 
              value={localFilters.dateRange}
              onChange={(e) => setLocalFilters({ ...localFilters, dateRange: e.target.value })}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            >
              <option value="all">Any Date</option>
              <option value="overdue">Overdue</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
            </select>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex justify-between items-center gap-3">
          <button 
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors w-1/3"
          >
            Clear All
          </button>
          <button 
            onClick={handleApply}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30 w-2/3"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
};
