import React from 'react';

export const ProfileKpis: React.FC<{ role: string }> = ({ role }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="card-hub p-4 rounded-2xl shadow-sm">
        <div className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1 uppercase tracking-wider">
          {role === 'manager' ? 'Tasks Assigned (Team)' : 'My Tasks'}
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {role === 'manager' ? '34' : '12'}
        </div>
      </div>
      
      <div className="card-hub p-4 rounded-2xl shadow-sm">
        <div className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1 uppercase tracking-wider">
          Completed Rate
        </div>
        <div className="text-2xl font-bold text-primary">92%</div>
      </div>
      
      <div className="card-hub p-4 rounded-2xl shadow-sm">
        <div className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1 uppercase tracking-wider">
          Borrow Requests
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {role === 'manager' ? '2 Pending' : '3 Active'}
        </div>
        {role === 'manager' && <div className="text-xs text-primary cursor-pointer mt-1 font-medium hover:underline">View Requests →</div>}
      </div>
      
      <div className="bg-red-50/40 border border-red-200 dark:bg-red-950/20 dark:border-red-900/40 p-4 rounded-2xl shadow-sm">
        <div className="text-red-500 dark:text-red-400 text-xs font-medium mb-1 uppercase tracking-wider">
          Overdue Tasks
        </div>
        <div className="text-2xl font-bold text-red-600 dark:text-red-400">3</div>
      </div>
    </div>
  );
};
