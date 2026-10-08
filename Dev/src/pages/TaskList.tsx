
import React, { useState, useMemo, useEffect } from 'react';
import { Filter, Plus, Search, MoreHorizontal, Download, Trash2, CheckCircle2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { FilterPanel } from '../components/common/FilterPanel';
import { ConfirmDeleteModal } from '../components/common/ConfirmDeleteModal';
import { supabase } from '../services/supabase';
import { TableSkeleton } from '../components/common/Skeleton';
import { StatusBadge } from '../components/common/StatusBadge';
import { Avatar } from '../components/common/Avatar';
import { useTasks } from '../hooks/useTasks';
import { TaskModal } from '../components/features/tasks/TaskModal';
import { TaskDetailPanel } from '../components/features/tasks/TaskDetailPanel';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { recordTaskDeletion } from '../services/taskDeletionLog';

const mapStatus = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes('done') || s.includes('hoàn thành')) return 'done';
  if (s.includes('progress') || s.includes('đang')) return 'in-progress';
  if (s.includes('review')) return 'review';
  if (s.includes('overdue')) return 'overdue';
  return 'todo';
};

const mapPriority = (prio: string | undefined) => {
  if (!prio) return 'Medium';
  const p = prio.toLowerCase();
  if (p.includes('high') || p.includes('cao')) return 'High';
  if (p.includes('low') || p.includes('thấp')) return 'Low';
  return 'Medium';
};

export const TaskList: React.FC = () => {
  const [searchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  // const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  
  const profileId = useAuthStore(state => state.profile?.id);
  const canCreateTask = true;
  const [filters, setFilters] = useState({ 
    status: searchParams.get('status') || 'all', 
    priority: searchParams.get('priority') || 'all', 
    assignee: searchParams.get('assignee') || 'all', 
    department: 'all', 
    dateRange: 'all' 
  });
  const [groupBy, setGroupBy] = useState('none');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<any>(null);

  const { tasks, loading, refetch } = useTasks();
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const toggleGroup = (group: string) => setCollapsedGroups(prev => prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]);

  const handleNewTask = () => setIsModalOpen(true);

  useEffect(() => {
    if (searchParams.has('search')) {
      setSearchTerm(searchParams.get('search') || '');
    }
  }, [searchParams]);

  useEffect(() => {
    setFilters(current => ({ ...current, status: searchParams.get('status') || 'all', priority: searchParams.get('priority') || 'all', assignee: searchParams.get('assignee') || 'all' }));
  }, [searchParams]);

  useEffect(() => {
    const taskId = searchParams.get('task');
    if (taskId && tasks.length) {
      const task = tasks.find(item => item.id === taskId);
      if (task) setSelectedTask(task);
    }
  }, [searchParams, tasks]);


  const toggleSelectTask = (id: string) => {
    if (selectedTasks.includes(id)) {
      setSelectedTasks(selectedTasks.filter(taskId => taskId !== id));
    } else {
      setSelectedTasks([...selectedTasks, id]);
    }
  };

  const exportCSV = () => {
    const headers = ['Task Ref', 'Title', 'Project', 'Assignee', 'Status', 'Priority', 'Due Date'];
    const csvContent = filteredTasks.map(t => {
      return [`"${t.task_ref || ''}"`, `"${t.title || ''}"`, `"${t.project?.name || ''}"`, `"${t.assignee?.name || ''}"`, `"${t.status || ''}"`, `"${t.priority || ''}"`, `"${t.due_date ? new Date(t.due_date).toLocaleDateString() : ''}"`].join(',');
    });
    const csvString = [headers.join(','), ...csvContent].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'tasks_export.csv';
    link.click();
    toast.success('Xuất file CSV thành công');
  };

  const shortcutScope = searchParams.get('scope');
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');
  const departmentParam = searchParams.get('department');
  const isOpenTask = (task: any) => !['done', 'completed', 'complete', 'cancelled', 'canceled'].includes((task.status || '').toLowerCase());
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const inSevenDays = new Date(today); inSevenDays.setDate(today.getDate() + 7);
  
  const handleBulkDelete = async () => {
    let deletedCount = 0;
    for (const taskId of selectedTasks) {
      const task = tasks.find(item => item.id === taskId);
      let entityType: 'task' | 'project_subtask' | 'campaign_subtask';
      let rawId = taskId;
      let error: any;
      if (taskId.startsWith('ps-')) {
        entityType = 'project_subtask'; rawId = taskId.replace('ps-', '');
        ({ error } = await supabase.from('project_subtasks').update({ status: 'deleted' }).eq('id', rawId));
      } else if (taskId.startsWith('cs-')) {
        entityType = 'campaign_subtask'; rawId = taskId.replace('cs-', '');
        ({ error } = await supabase.from('campaign_subtasks').update({ status: 'deleted' }).eq('id', rawId));
      } else {
        entityType = 'task';
        ({ error } = await supabase.from('tasks').update({ status: 'deleted' }).eq('id', taskId));
      }
      if (!error) {
        deletedCount++;
        if (profileId && task) {
          const { error: logError } = await recordTaskDeletion({ userId: profileId, taskId: rawId, entityType, title: task.title, parentName: task.project?.name, parentType: entityType === 'project_subtask' ? 'project' : entityType === 'campaign_subtask' ? 'campaign' : null });
          if (logError) toast.error(`Đã xóa "${task.title}" nhưng chưa ghi được vào Log`);
        }
      }
    }
    if (deletedCount) toast.success(`Đã chuyển ${deletedCount} task vào thùng rác`);
    if (deletedCount < selectedTasks.length) toast.error(`Không xóa được ${selectedTasks.length - deletedCount} task`);
    setSelectedTasks([]);
    setIsBulkDeleteModalOpen(false);
    window.dispatchEvent(new Event('tasks:changed'));
    refetch();
  };

  const handleSingleDelete = async () => {
    if (!taskToDelete) return;
    const taskId = taskToDelete.id;
    let entityType: 'task' | 'project_subtask' | 'campaign_subtask';
    let rawId = taskId;
    let error: any;
    if (taskId.startsWith('ps-')) {
      entityType = 'project_subtask'; rawId = taskId.replace('ps-', '');
      ({ error } = await supabase.from('project_subtasks').update({ status: 'deleted' }).eq('id', rawId));
    } else if (taskId.startsWith('cs-')) {
      entityType = 'campaign_subtask'; rawId = taskId.replace('cs-', '');
      ({ error } = await supabase.from('campaign_subtasks').update({ status: 'deleted' }).eq('id', rawId));
    } else {
      entityType = 'task';
      ({ error } = await supabase.from('tasks').update({ status: 'deleted' }).eq('id', taskId));
    }
    if (error) { toast.error('Không thể xóa task'); return; }
    if (profileId) {
      const { error: logError } = await recordTaskDeletion({ userId: profileId, taskId: rawId, entityType, title: taskToDelete.title, parentName: taskToDelete.project?.name, parentType: entityType === 'project_subtask' ? 'project' : entityType === 'campaign_subtask' ? 'campaign' : null });
      if (logError) toast.error('Task đã xóa nhưng chưa ghi được vào Log');
    }
    toast.success(`Đã chuyển task vào thùng rác`);
    setTaskToDelete(null);
    window.dispatchEvent(new Event('tasks:changed'));
    refetch();
  };

  const filteredTasks = tasks.filter(t => {
    // 1. Status Filter
    let statusMatch = true;
    if (filters.status !== 'all') {
      const ms = mapStatus(t.status || '');
      const mapped = ms === 'in-progress' ? 'in_progress' : ms;
      statusMatch = (mapped === filters.status) || (t.status?.toLowerCase() === filters.status.toLowerCase());
    }
    
    // 2. Priority
    let priorityMatch = true;
    if (filters.priority !== 'all') {
      priorityMatch = mapPriority(t.priority).toLowerCase() === filters.priority.toLowerCase();
    }
    
    // 3. Assignee
    let assigneeMatch = true;
    if (filters.assignee !== 'all') {
      if (filters.assignee === 'me') {
        assigneeMatch = String(t.assignee_id) === String(profileId);
      } else if (filters.assignee === 'unassigned') {
        assigneeMatch = !t.assignee_id && !t.assignee;
      } else {
        assigneeMatch = t.assignee?.id === filters.assignee || String(t.assignee_id) === filters.assignee;
      }
    }
    
    // 4. Department
    let deptMatch = true;
    if (departmentParam) {
      deptMatch = t.department?.name === departmentParam;
    }
    
    // 5. Date Range
    let dateMatch = true;
    if (startParam && t.due_date) {
      dateMatch = dateMatch && new Date(t.due_date) >= new Date(`${startParam}T00:00:00`);
    }
    if (endParam && t.due_date) {
      dateMatch = dateMatch && new Date(t.due_date) <= new Date(`${endParam}T23:59:59`);
    }

    // 6. Shortcut scope
    let shortcutMatch = true;
    if (shortcutScope) {
      if (String(t.assignee_id) !== String(profileId)) {
        shortcutMatch = false;
      } else {
        if (shortcutScope === 'due-soon') {
          shortcutMatch = isOpenTask(t) && !!t.due_date && new Date(t.due_date) >= today && new Date(t.due_date) <= inSevenDays;
        } else if (shortcutScope === 'overdue') {
          shortcutMatch = isOpenTask(t) && !!t.due_date && new Date(t.due_date) < today;
        }
      }
    }

    // 7. Search
    let searchMatch = true;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      searchMatch = (t.title?.toLowerCase().includes(term) || t.task_ref?.toLowerCase().includes(term));
    }

    return statusMatch && priorityMatch && assigneeMatch && deptMatch && dateMatch && shortcutMatch && searchMatch;
  });

  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') return { 'All Tasks': filteredTasks };
    const groups: Record<string, typeof filteredTasks> = {};
    filteredTasks.forEach(t => {
      let key = 'Other';
      if (groupBy === 'project') key = t.project?.name || 'No Project';
      if (groupBy === 'assignee') key = t.assignee?.name || 'Unassigned';
      if (groupBy === 'status') key = mapStatus(t.status).toUpperCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [filteredTasks, groupBy]);

  return (
    <div className="flex h-full min-h-0 min-w-0 overflow-hidden">
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col transition-[flex-basis] duration-300 ease-out pr-0 lg:pr-4">
      <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={refetch} />
      
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Tasks</h1>
        <div className="flex items-center gap-2 sm:gap-3 relative z-50 overflow-x-auto scrollbar-hide w-full sm:w-auto">
          {/* Expanding Search */}
          <div className="flex items-center relative h-10">
            <div className={`transition-all duration-300 ease-out overflow-hidden flex items-center ${isSearchExpanded ? 'w-40 sm:w-64 opacity-100 mr-2' : 'w-0 opacity-0'}`}>
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-gray-900 dark:text-gray-100 transition-colors"
                />
              </div>
            </div>
            <button 
              onClick={() => setIsSearchExpanded(!isSearchExpanded)} 
              className={`p-2.5 rounded-xl border transition-colors flex items-center justify-center ${isSearchExpanded ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Group By Filter */}
          <div className="flex items-center">
            <select 
              value={groupBy} 
              onChange={(e) => setGroupBy(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
            >
              <option value="none">None</option>
              <option value="project">Project</option>
              <option value="assignee">Assignee</option>
              <option value="status">Status</option>
            </select>
          </div>

          {/* Filters Panel Toggle */}
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center space-x-2 border px-4 py-2.5 rounded-xl transition-colors ${showFilters ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters</span>
          </button>

          <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1"></div>

          <button onClick={exportCSV} className="flex items-center space-x-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Export</span>
          </button>
          
          {canCreateTask && <button onClick={handleNewTask} className="flex items-center space-x-1 sm:space-x-2 bg-primary text-white px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl hover:bg-primary/90 transition-colors shadow-sm flex-shrink-0">
            <Plus className="w-4 h-4" />
            <span className="text-xs sm:text-sm font-medium hidden sm:inline">New Task</span>
          </button>}
          <FilterPanel isOpen={showFilters} onClose={() => setShowFilters(false)} filters={filters} setFilters={setFilters} onApply={() => {}} />
        </div>
      </div>

      {shortcutScope && <div className="text-sm text-primary bg-primary/5 border border-primary/15 rounded-xl px-4 py-2 mb-4">Đang lọc: {shortcutScope === 'mine' ? 'task của tôi' : shortcutScope === 'due-soon' ? 'task của tôi sắp đến hạn' : 'task của tôi quá hạn'}.</div>}
      
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-12 pr-1">
      

      {loading ? (
        <div className="card-hub rounded-2xl p-2"><TableSkeleton rows={8} /></div>
      ) : filteredTasks.length === 0 ? (
        <div className="card-hub rounded-2xl p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No tasks found</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Try adjusting your filters or search term.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
            <div key={groupName} className="card-hub rounded-2xl overflow-hidden">
              {groupBy !== 'none' && (
                <div 
                  className="bg-gray-50/80 hover:bg-gray-100/80 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center cursor-pointer transition-colors"
                  onClick={() => toggleGroup(groupName)}
                >
                  <div className="flex items-center gap-2 sm:gap-3 relative z-50 overflow-x-auto scrollbar-hide w-full sm:w-auto">
                    <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center justify-center">
                      {collapsedGroups.includes(groupName) ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide text-sm">{groupName}</h3>
                    <span className="bg-white dark:bg-slate-700 px-2 py-1 rounded-md text-xs font-medium text-gray-500 dark:text-gray-300 shadow-sm border border-black/5 dark:border-slate-600">{groupTasks.length} tasks</span>
                  </div>
                </div>
              )}
              {!collapsedGroups.includes(groupName) && (
                <div className="overflow-x-auto animate-in slide-in-from-top-1 fade-in duration-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                      <th className="p-4 w-12">
                        <input 
                          type="checkbox" 
                          checked={groupTasks.length > 0 && groupTasks.every(t => selectedTasks.includes(t.id))}
                          onChange={() => {
                            const allIds = groupTasks.map(t => t.id);
                            const allSelected = groupTasks.every(t => selectedTasks.includes(t.id));
                            if (allSelected) {
                              setSelectedTasks(selectedTasks.filter(id => !allIds.includes(id)));
                            } else {
                              const newSelected = new Set([...selectedTasks, ...allIds]);
                              setSelectedTasks(Array.from(newSelected));
                            }
                          }}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </th>
                      <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Task Ref</th>
                      <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Title</th>
                      <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Project/Campaign</th>
                      <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Assignee</th>
                      <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                      <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Priority</th>
                      <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Due Date</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {groupTasks.map((task) => (
                      <tr key={task.id} onClick={() => setSelectedTask(task as any)} className={`cursor-pointer hover:bg-gray-50/80 dark:hover:bg-slate-700/50 transition-colors group ${selectedTasks.includes(task.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                        <td className="p-4">
                          <input 
                            type="checkbox" 
                            checked={selectedTasks.includes(task.id)}
                            onClick={(e) => e.stopPropagation()} onChange={() => toggleSelectTask(task.id)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </td>
                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400 font-medium">#{task.task_ref || task.id.split('-')[0]}</td>
                        <td className="p-4">
                          <div className="font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-primary transition-colors line-clamp-2">{task.title}</div>
                          {task.department && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{task.department.name}</div>}
                        </td>
                        <td className="p-4 text-sm text-gray-600 dark:text-gray-400 hidden lg:table-cell">{task.project?.name || '---'}</td>
                        <td className="p-4">
                          {task.assignee ? (
                            <div className="flex items-center space-x-2">
                              <Avatar name={task.assignee.name} src={task.assignee.avatar_url} />
                              <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{task.assignee.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-md">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4 cursor-pointer" onClick={(e) => { e.stopPropagation(); toast('Inline edit status coming soon', { icon: '🚧' }); }}>
                          <StatusBadge status={mapStatus(task.status) as any} />
                        </td>
                        <td className="p-4 cursor-pointer" onClick={(e) => { e.stopPropagation(); toast('Inline edit priority coming soon', { icon: '🚧' }); }}>
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold
                            ${mapPriority(task.priority) === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            mapPriority(task.priority) === 'Medium' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                            {mapPriority(task.priority)}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
                          {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-4">
                          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Batch Actions Toolbar */}
      {selectedTasks.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-fade-in-up border border-gray-700">
          <div className="flex items-center gap-2 border-r border-gray-700 pr-4">
            <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{selectedTasks.length}</span>
            <span className="text-sm font-medium">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toast.success(`Marked ${selectedTasks.length} tasks as Done`)} className="p-2 hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2 text-sm text-gray-300 hover:text-white">
              <CheckCircle2 className="w-4 h-4 text-green-400" /> Mark Done
            </button>
            <button onClick={() => setIsBulkDeleteModalOpen(true)} className="p-2 hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2 text-sm text-gray-300 hover:text-red-400">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
          <button onClick={() => setSelectedTasks([])} className="ml-2 p-1 hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      )}</div>
    
      </div>
      <TaskDetailPanel task={selectedTask} isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} onTaskUpdated={(updated) => { if (updated) setSelectedTask((current: any) => ({ ...current, ...updated })); refetch(); }} />
      <ConfirmDeleteModal isOpen={isBulkDeleteModalOpen} title="Xóa các Task đã chọn" message={`Bạn có chắc muốn xóa ${selectedTasks.length} task đã chọn vào thùng rác?`} onConfirm={handleBulkDelete} onCancel={() => setIsBulkDeleteModalOpen(false)} />
      <ConfirmDeleteModal isOpen={!!taskToDelete} title="Xóa Task" message={`Bạn có chắc muốn xóa task "${taskToDelete?.title}" vào thùng rác?`} onConfirm={handleSingleDelete} onCancel={() => setTaskToDelete(null)} />
    </div>
  );
};
