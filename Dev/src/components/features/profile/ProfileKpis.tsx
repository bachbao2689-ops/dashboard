import React from 'react';
import { useProfileWorkload } from '../../../hooks/useProfileWorkload';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';

export const ProfileKpis: React.FC<{ role: string }> = ({ role }) => {
  const { summary, loading } = useProfileWorkload();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const count = loading ? '—' : summary.total;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div onClick={() => navigate(`/tasks?assignee=${user?.id}`)} className="card-hub p-4 rounded-2xl shadow-sm hover:ring-2 hover:ring-primary/20 cursor-pointer transition-all">
        <div className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1 uppercase tracking-wider">
          {role === 'manager' ? 'Task đã giao (Team)' : 'Task được giao'}
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {count}
        </div>
      </div>
      
      <div onClick={() => navigate(`/tasks?status=done&assignee=${user?.id}`)} className="card-hub p-4 rounded-2xl shadow-sm hover:ring-2 hover:ring-primary/20 cursor-pointer transition-all">
        <div className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1 uppercase tracking-wider">
          Hoàn thành Rate
        </div>
        <div className="text-2xl font-bold text-primary">{loading ? '—' : `${summary.completionRate}%`}</div>
      </div>
      
      <div onClick={() => navigate(`/borrow-requests`)} className="card-hub p-4 rounded-2xl shadow-sm hover:ring-2 hover:ring-primary/20 cursor-pointer transition-all">
        <div className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1 uppercase tracking-wider">
          Borrow Requests
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {loading ? '—' : `${summary.pendingBorrow} Pending`}
        </div>
        {role === 'manager' && <div className="text-xs text-primary cursor-pointer mt-1 font-medium hover:underline">View Requests →</div>}
      </div>
      
      <div onClick={() => navigate(`/tasks?status=overdue&assignee=${user?.id}`)} className="bg-red-50/40 border border-red-200 dark:bg-red-950/20 dark:border-red-900/40 p-4 rounded-2xl shadow-sm hover:ring-2 hover:ring-red-400/30 cursor-pointer transition-all">
        <div className="text-red-500 dark:text-red-400 text-xs font-medium mb-1 uppercase tracking-wider">
          Overdue Tasks
        </div>
        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{loading ? '—' : summary.overdue}</div>
      </div>
    </div>
  );
};
