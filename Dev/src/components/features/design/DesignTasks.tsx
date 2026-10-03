import React from 'react';
import { Clock, CheckCircle2, AlertCircle, User } from 'lucide-react';
import { useTasks } from '../../../hooks/useTasks';

function parseDate(dateStr: string): Date {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  }
  return new Date(dateStr);
}

function getDaysRemaining(dateStr: string): number {
  const due = parseDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDueLabel(dateStr: string): string {
  const days = getDaysRemaining(dateStr);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `${days}d left`;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  'todo': { label: 'To Do', color: 'text-blue-500', icon: <Clock size={14} /> },
  'in-progress': { label: 'In Progress', color: 'text-yellow-500', icon: <Clock size={14} /> },
  'in_progress': { label: 'In Progress', color: 'text-yellow-500', icon: <Clock size={14} /> },
  'review': { label: 'Review', color: 'text-purple-500', icon: <AlertCircle size={14} /> },
  'done': { label: 'Done', color: 'text-green-500', icon: <CheckCircle2 size={14} /> },
};

export const DesignTasks: React.FC<{ onOpenTaskDetail?: () => void }> = ({ onOpenTaskDetail }) => {
  const { tasks, loading } = useTasks();

  if (loading && tasks.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="glass-panel bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-pulse">
            <div className="h-28 bg-gray-200 dark:bg-gray-700"></div>
            <div className="p-5 space-y-3">
              <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="flex gap-4">
                <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Quick stats */}
      <div className="flex items-center gap-6 text-sm font-medium text-gray-500 dark:text-gray-400">
        <span>{tasks.length} tasks</span>
        <span className="text-yellow-500">{tasks.filter(t => t.status === 'todo').length} pending</span>
        <span className="text-red-500">{tasks.filter(t => t.due_date && getDaysRemaining(t.due_date) < 0 && t.status !== 'done').length} overdue</span>
      </div>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {tasks.map(task => {
          const isTaskOverdue = task.due_date && getDaysRemaining(task.due_date) < 0 && task.status !== 'done';
          const statusInfo = statusConfig[task.status] || statusConfig['todo'];

          return (
            <div
              key={task.id}
              onClick={() => onOpenTaskDetail?.()}
              className={`glass-panel bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border cursor-pointer hover:shadow-lg transition-all duration-300 ${
                isTaskOverdue
                  ? 'border-red-400 dark:border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.08)]'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* Color top bar based on priority */}
              <div className={`h-1.5 w-full ${
                task.priority === 'urgent' ? 'bg-red-500' :
                task.priority === 'high' ? 'bg-orange-500' :
                task.priority === 'medium' ? 'bg-yellow-400' : 'bg-gray-300'
              }`}></div>

              <div className="p-5">
                {/* Header: ref + project */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                    #{task.task_ref}
                  </span>
                  {task.project?.name && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70 bg-primary/5 px-2 py-0.5 rounded-full truncate max-w-[140px]">
                      {task.project.name}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-bold text-base text-gray-900 dark:text-white mb-3 line-clamp-2 leading-tight">
                  {task.title}
                </h3>

                {/* Priority badge (only high+) */}
                {(task.priority === 'high' || task.priority === 'urgent') && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mb-3 ${
                    task.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                  }`}>
                    {task.priority === 'urgent' ? '🔴' : '🟠'} {task.priority}
                  </span>
                )}

                {/* Footer row */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                  {/* Assignee */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                      {task.assignee?.name ? task.assignee.name.charAt(0) : <User size={12} />}
                    </div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {task.assignee?.name || 'Unassigned'}
                    </span>
                  </div>

                  {/* Due date + status */}
                  <div className="flex items-center gap-3">
                    {task.due_date && (
                      <span className={`text-xs font-medium flex items-center gap-1 ${isTaskOverdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                        <Clock size={12} />
                        {formatDueLabel(task.due_date)}
                      </span>
                    )}
                    <span className={`flex items-center gap-1 text-xs font-bold ${statusInfo.color}`}>
                      {statusInfo.icon} {statusInfo.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
