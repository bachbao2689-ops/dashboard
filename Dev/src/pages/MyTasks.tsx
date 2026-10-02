import React, { useState, useMemo } from 'react';
import { useMyTasks } from '../hooks/useMyTasks';
import { CheckCircle2, Clock, ArrowLeft, Filter, CheckSquare } from 'lucide-react';

export const MyTasks: React.FC = () => {
  const { tasks, loading, markComplete } = useMyTasks();
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'all' | 'completed'>('today');
  const [showHighPriority, setShowHighPriority] = useState(false);
  const [showOverdue, setShowOverdue] = useState(false);
  const [showDueToday, setShowDueToday] = useState(false);
  const [taskToConfirm, setTaskToConfirm] = useState<string | null>(null);

  const getTodayDateString = () => new Date().toISOString().split('T')[0];

  const filteredTasks = useMemo(() => {
    const today = getTodayDateString();
    let result = tasks;

    // Apply Tab Filter
    if (activeTab === 'today') {
      result = result.filter(t => t.due_date === today || (t.due_date < today && t.status !== 'done'));
    } else if (activeTab === 'week') {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];
      result = result.filter(t => t.due_date >= today && t.due_date <= nextWeekStr);
    } else if (activeTab === 'completed') {
      result = result.filter(t => t.status === 'done');
    }

    // Apply Chip Filters
    if (showHighPriority) {
      result = result.filter(t => t.priority?.toLowerCase() === 'high');
    }
    if (showOverdue) {
      result = result.filter(t => t.due_date < today && t.status !== 'done');
    }
    if (showDueToday) {
      result = result.filter(t => t.due_date === today && t.status !== 'done');
    }

    return result;
  }, [tasks, activeTab, showHighPriority, showOverdue, showDueToday]);

  const kpis = useMemo(() => {
    const today = getTodayDateString();
    return {
      myTasksCount: tasks.filter(t => t.status !== 'done').length,
      dueSoonCount: tasks.filter(t => t.due_date === today && t.status !== 'done').length
    };
  }, [tasks]);

  const handleMarkComplete = (id: string) => {
    setTaskToConfirm(id);
  };

  const confirmMarkComplete = () => {
    if (taskToConfirm) {
      markComplete(taskToConfirm);
      setTaskToConfirm(null);
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-[#002e6d] dark:text-white">
        <Clock className="animate-spin w-8 h-8 mr-3" />
        <span className="text-lg">Loading tasks...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#002e6d] dark:text-white flex items-center">
          <CheckSquare className="mr-3 w-8 h-8" />
          My Tasks
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-panel p-6 rounded-xl flex items-center bg-white/50 dark:bg-gray-800/50">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full text-blue-600 dark:text-blue-400 mr-4">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Pending Tasks</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.myTasksCount}</p>
          </div>
        </div>
        <div className="glass-panel p-6 rounded-xl flex items-center bg-white/50 dark:bg-gray-800/50">
          <div className="bg-orange-100 dark:bg-orange-900/30 p-4 rounded-full text-orange-600 dark:text-orange-400 mr-4">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Due Soon (Today)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.dueSoonCount}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {(['today', 'week', 'all', 'completed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab 
                  ? 'border-[#002e6d] dark:border-blue-500 text-[#002e6d] dark:text-blue-500' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300'
                }
              `}
            >
              {tab === 'today' ? 'Today' : tab === 'week' ? 'This Week' : tab === 'all' ? 'All' : 'Completed'}
            </button>
          ))}
        </nav>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-gray-500 mr-2" />
        <button 
          onClick={() => setShowHighPriority(!showHighPriority)}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${showHighPriority ? 'bg-red-100 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400' : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'}`}
        >
          High Priority
        </button>
        <button 
          onClick={() => setShowOverdue(!showOverdue)}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${showOverdue ? 'bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400' : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'}`}
        >
          Overdue
        </button>
        <button 
          onClick={() => setShowDueToday(!showDueToday)}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${showDueToday ? 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400' : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'}`}
        >
          Due Today
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="glass-panel flex flex-col items-center justify-center p-12 rounded-xl bg-white/50 dark:bg-gray-800/50">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">All caught up! No tasks right now</h3>
            <button className="flex items-center text-[#002e6d] dark:text-blue-400 hover:underline mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </button>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div key={task.id} className="glass-panel p-4 rounded-xl flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-4">
                <input 
                  type="checkbox"
                  checked={task.status === 'done'}
                  onChange={() => task.status !== 'done' && handleMarkComplete(task.id)}
                  className="w-5 h-5 text-[#002e6d] rounded border-gray-300 focus:ring-[#002e6d] cursor-pointer"
                  disabled={task.status === 'done'}
                />
                <div>
                  <h4 className={`text-lg font-medium ${task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                    {task.title} <span className="text-xs text-gray-400 ml-2">#{task.id.slice(0, 8)}</span>
                  </h4>
                  <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {task.due_date}
                    </span>
                    {task.priority && (
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        task.priority.toLowerCase() === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        task.priority.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  task.status === 'done' ? 'bg-gray-100 border-gray-200 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300' :
                  'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                }`}>
                  {task.status.toUpperCase()}
                </span>
                {task.status !== 'done' && (
                  <button 
                    onClick={() => handleMarkComplete(task.id)}
                    className="text-sm bg-[#002e6d] hover:bg-[#002e6d]/90 text-white px-3 py-1.5 rounded-md transition-colors"
                  >
                    Complete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirm Dialog */}
      {taskToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Mark Complete?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to mark this task as done?</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setTaskToConfirm(null)}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmMarkComplete}
                className="px-4 py-2 rounded-md bg-[#002e6d] text-white hover:bg-[#002e6d]/90 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
