import React, { useState } from 'react';
import { Filter, Plus, Search, MoreHorizontal } from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { Avatar } from '../components/common/Avatar';
import tasksData from '../data/tasks.json';

// Mapping English statuses for the UI to match StatusBadge and styles
const mapStatus = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes('done')) return 'Complete';
  if (s.includes('progress') || s.includes('on going')) return 'In Progress';
  if (s.includes('feedback')) return 'Pending'; // or feedback
  if (s.includes('todo') || s.includes('chưa bắt đầu')) return 'Pending';
  return 'Pending';
};

const mapPriority = (prio: string) => {
  const p = prio.toLowerCase();
  if (p.includes('urgent')) return 'Urgent';
  if (p.includes('high')) return 'High';
  if (p.includes('medium')) return 'Medium';
  return 'Low';
};

export const TaskList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const tasks = tasksData.map(t => ({
    id: t['ID'],
    project: t['Dự án'] || 'N/A',
    title: t['Tên công việc'] || 'Untitled',
    priority: mapPriority(t['Mức ưu tiên']),
    dept: t['Phòng ban'] || 'N/A',
    assignee: t['Người phụ trách'] || 'Unassigned',
    due: t['Ngày kết thúc'] || '',
    status: mapStatus(t['Trạng thái'])
  }));

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col z-10 relative">
      <div className="flex justify-between items-center mb-6 px-2">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">All Tasks</h2>
        <div className="flex gap-3">
          <div className="relative group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/40 backdrop-blur-md border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button className="flex items-center gap-2 bg-white/40 hover:bg-white/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/60 shadow-sm text-sm font-medium text-gray-700 transition-colors">
            <Filter size={16} /> Filters
          </button>
          <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl shadow-md text-sm font-medium transition-colors">
            <Plus size={16} /> New Task
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-xs uppercase bg-white/50 border-b border-white/60 text-gray-500 font-bold sticky top-0 z-10 backdrop-blur-xl">
              <tr>
                <th className="px-6 py-4">Task ID</th>
                <th className="px-6 py-4">Title / Project</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Assignee</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id} className="border-b border-white/40 hover:bg-white/30 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">{task.id}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-800">{task.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{task.project}</div>
                  </td>
                  <td className="px-6 py-4 font-medium">{task.dept}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Avatar name={task.assignee} className="w-6 h-6 text-[10px]" />
                      <span>{task.assignee}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${
                      task.priority === 'Urgent' ? 'bg-red-100 text-red-700 border-red-200' :
                      task.priority === 'High' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                      task.priority === 'Medium' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                      'bg-green-100 text-green-700 border-green-200'
                    }`}>{task.priority}</span>
                  </td>
                  <td className="px-6 py-4">{task.due}</td>
                  <td className="px-6 py-4"><StatusBadge status={task.status as any} /></td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-primary"><MoreHorizontal size={18} /></button>
                  </td>
                </tr>
              ))}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-500 font-medium">No tasks found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
