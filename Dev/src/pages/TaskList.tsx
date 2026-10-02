import React, { useState } from 'react';
import { Filter, Plus, Search, MoreHorizontal } from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { Avatar } from '../components/common/Avatar';
import { useTasks } from '../hooks/useTasks';

const mapStatus = (status: string | undefined) => {
  if (!status) return 'Pending';
  const s = status.toLowerCase();
  if (s.includes('done')) return 'Complete';
  if (s.includes('progress')) return 'In Progress';
  if (s.includes('todo')) return 'Pending';
  return 'Pending';
};

const mapPriority = (prio: string | undefined) => {
  if (!prio) return 'Medium';
  const p = prio.toLowerCase();
  if (p.includes('urgent') || p.includes('high')) return 'High';
  if (p.includes('low')) return 'Low';
  return 'Medium';
};

export const TaskList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { tasks, loading } = useTasks();

  const filteredTasks = tasks.filter(t => 
    t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.task_ref?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Tasks</h1>
        <button className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      <div className="glass-panel p-4 flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-gray-100"
          />
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </button>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Task Ref</th>
                <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Title</th>
                <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Project</th>
                <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Assignee</th>
                <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Priority</th>
                <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Due Date</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500 dark:text-gray-400">Loading tasks...</td></tr>
              ) : filteredTasks.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500 dark:text-gray-400">No tasks found</td></tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group">
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400 font-medium">#{task.task_ref || task.id.split('-')[0]}</td>
                    <td className="p-4">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{task.title}</div>
                      {task.department && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{task.department.name}</div>}
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{task.project?.name || '---'}</td>
                    <td className="p-4">
                      {task.assignee ? (
                        <div className="flex items-center space-x-2">
                          <Avatar name={task.assignee.name} src={task.assignee.avatar_url} />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{task.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={mapStatus(task.status) as any} />
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium
                        ${mapPriority(task.priority) === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                        mapPriority(task.priority) === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                        {mapPriority(task.priority)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4">
                      <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
