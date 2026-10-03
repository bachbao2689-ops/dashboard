import React from 'react';
import { AlertCircle } from 'lucide-react';

const bottlenecks = [
  { id: 1, task: 'Q4 Campaign Assets', department: 'Design', delay: '14 days', status: 'Blocked by Legal' },
  { id: 2, task: 'Shopify Checkout Optimization', department: 'E-Commerce', delay: '7 days', status: 'Waiting on API' },
  { id: 3, task: 'Onboarding Portal', department: 'HR & Admin', delay: '5 days', status: 'Resource Reallocated' },
];

export const Bottlenecks: React.FC = () => {
  return (
    <div className="bg-red-50 border border-red-200 dark:bg-red-900/10 dark:border-red-900/50 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="text-red-500" size={20} />
        <h3 className="font-bold text-red-900 dark:text-red-400">Critical Bottlenecks</h3>
      </div>
      <div className="space-y-3">
        {bottlenecks.map(b => (
          <div key={b.id} className="bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/30 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {b.task}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Department: <span className="font-medium text-gray-700 dark:text-gray-300">{b.department}</span>
              </p>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1">
              <span className="text-red-600 dark:text-red-400 font-bold text-sm bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded">
                Delayed {b.delay}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {b.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
