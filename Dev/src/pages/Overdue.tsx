import React, { useState } from 'react';
import { useOverdueTasks } from '../hooks/useOverdueTasks';
import { AlertTriangle, Clock, Users, ArrowRight, CheckCircle, CalendarDays } from 'lucide-react';

export const Overdue: React.FC = () => {
  const { tasks, loading, grantExtension } = useOverdueTasks();
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const calculateDaysOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = Math.abs(today.getTime() - due.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getUrgencyClass = (days: number) => {
    if (days >= 7) return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800'; // Critical
    if (days >= 3) return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800'; // Danger
    return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800'; // Warning
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedTasks(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === tasks.length) setSelectedTasks(new Set());
    else setSelectedTasks(new Set(tasks.map(t => t.id)));
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-red-700 dark:text-red-500">
        <Clock className="animate-spin w-8 h-8 mr-3" />
        <span className="text-lg font-medium">Loading overdue tasks...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-red-500 pb-4">
        <h1 className="text-3xl font-bold text-red-700 dark:text-red-500 flex items-center tracking-tight">
          <AlertTriangle className="mr-3 w-8 h-8" />
          OVERDUE TASKS
        </h1>
        <div className="bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 px-4 py-2 rounded-full font-bold text-lg flex items-center">
          {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'} Overdue
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedTasks.size > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-4 rounded-lg flex items-center justify-between">
          <span className="text-red-800 dark:text-red-300 font-medium">
            {selectedTasks.size} tasks selected
          </span>
          <div className="flex space-x-3">
            <button className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
              Bulk Extend
            </button>
            <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors shadow-sm">
              Bulk Reassign
            </button>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-4">
        {tasks.length > 0 && (
          <div className="px-4 py-2 flex items-center">
            <input 
              type="checkbox" 
              checked={selectedTasks.size === tasks.length && tasks.length > 0}
              onChange={handleSelectAll}
              className="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer mr-4"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Select All</span>
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="glass-panel flex flex-col items-center justify-center p-16 rounded-2xl bg-white/50 dark:bg-gray-800/50 border-dashed border-2 border-green-200 dark:border-green-900/30">
            <CheckCircle className="w-20 h-20 text-green-500 mb-6 drop-shadow-md" />
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">All caught up!</h3>
            <p className="text-gray-500 dark:text-gray-400 text-lg">No overdue tasks right now. Great job!</p>
          </div>
        ) : (
          tasks.map(task => {
            const daysOverdue = calculateDaysOverdue(task.due_date);
            const urgencyClass = getUrgencyClass(daysOverdue);

            return (
              <div key={task.id} className="glass-panel p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-gray-800 border-l-4 border-l-red-500 border-y border-r border-gray-100 dark:border-y-gray-700 dark:border-r-gray-700 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start md:items-center space-x-4 mb-4 md:mb-0">
                  <input 
                    type="checkbox"
                    checked={selectedTasks.has(task.id)}
                    onChange={() => handleSelect(task.id)}
                    className="w-5 h-5 mt-1 md:mt-0 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${urgencyClass}`}>
                        +{daysOverdue} DAYS OVERDUE
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">#{task.id.slice(0, 8)}</span>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                      {task.title}
                    </h4>
                    <div className="flex flex-wrap items-center mt-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center">
                        <Users className="w-4 h-4 mr-1.5 opacity-70" />
                        {task.assignee_name}
                      </span>
                      <span className="flex items-center text-red-600 dark:text-red-400 font-medium">
                        <CalendarDays className="w-4 h-4 mr-1.5 opacity-70" />
                        Was due: {task.due_date}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 ml-9 md:ml-0">
                  <button 
                    onClick={() => {
                      const newDate = new Date();
                      newDate.setDate(newDate.getDate() + 2);
                      grantExtension(task.id, newDate.toISOString().split('T')[0]);
                    }}
                    className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors text-sm font-medium"
                  >
                    Grant Extension
                  </button>
                  <button 
                    className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium"
                  >
                    Reassign <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
