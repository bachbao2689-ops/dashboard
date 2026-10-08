import React, { useMemo, useState } from 'react';
import { CheckCircle2, ArrowRightLeft, Package } from 'lucide-react';
import { useProfileWorkload } from '../../../hooks/useProfileWorkload';

type ActivityFilter = 'All' | 'Tasks' | 'Assets';

const formatDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'Chưa có thời gian';

export const ProfileActivityTab: React.FC = () => {
  const [filter, setFilter] = useState<ActivityFilter>('All');
  const { tasks, borrowRequests, loading } = useProfileWorkload();

  const activities = useMemo(() => {
    const taskActivities = tasks.map(task => {
      const completed = ['done', 'completed', 'complete'].includes((task.status || '').toLowerCase());
      return {
        id: `task-${task.id}`,
        type: 'task',
        icon: completed ? <CheckCircle2 size={16} /> : <ArrowRightLeft size={16} />,
        color: completed ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600',
        time: task.updated_at || task.created_at,
        title: completed ? `Hoàn thành ${task.task_ref || 'task'}: ${task.title}` : `Cập nhật ${task.task_ref || 'task'}: ${task.title}`,
        desc: `Trạng thái: ${task.status || 'Chưa cập nhật'}`,
      };
    });
    const borrowActivities = borrowRequests.map(request => ({
      id: `asset-${request.id}`,
      type: 'asset',
      icon: <Package size={16} />,
      color: 'bg-blue-100 text-blue-600',
      time: request.requested_at || request.created_at,
      title: `Yêu cầu mượn thiết bị: ${request.asset?.name || 'Thiết bị'}`,
      desc: `Trạng thái: ${request.approval_status || 'pending'}`,
    }));
    return [...taskActivities, ...borrowActivities].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [tasks, borrowRequests]);

  const visibleActivities = activities.filter(activity => filter === 'All' || (filter === 'Tasks' ? activity.type === 'task' : activity.type === 'asset'));

  return (
    <div className="card-hub p-6 rounded-2xl shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Hoạt động của tôi</h3>
        <div className="flex gap-2">
          {(['All', 'Tasks', 'Assets'] as ActivityFilter[]).map(item => (
            <button key={item} onClick={() => setFilter(item)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === item ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
              {item === 'All' ? 'Tất cả' : item === 'Tasks' ? 'Tasks' : 'Thiết bị'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-sm text-gray-500">Đang tải hoạt động…</p> : visibleActivities.length === 0 ? (
        <p className="text-sm text-gray-500">Chưa có hoạt động nào được ghi nhận cho tài khoản này.</p>
      ) : (
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 dark:before:via-slate-600 before:to-transparent">
          {visibleActivities.map(item => (
            <div key={item.id} className="relative flex items-center gap-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-800 shrink-0 shadow-sm ${item.color} z-10`}>{item.icon}</div>
              <div className="flex-1 p-4 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm">
                <time className="text-xs font-medium text-gray-500 dark:text-gray-400">{formatDate(item.time)}</time>
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1">{item.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
