
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConfirmDeleteModal } from '../components/common/ConfirmDeleteModal';
import { supabase } from '../services/supabase';
import { TaskListToolbar } from '../components/features/tasks/list/TaskListToolbar';
import { TaskListLayout } from '../components/features/tasks/list/TaskListLayout';
import { TaskListCollection } from '../components/features/tasks/list/TaskListCollection';
import { TaskListBulkActions } from '../components/features/tasks/list/TaskListBulkActions';
import { mapStatus, mapPriority } from '../components/features/tasks/list/taskListPresentation';
import '../components/features/tasks/list/TaskList.css';
import { useTasks } from '../hooks/useTasks';
import { TaskModal } from '../components/features/tasks/TaskModal';
import { TaskDetailPanel } from '../components/features/tasks/TaskDetailPanel';
import { SubtaskDetailPanel } from '../components/features/projects/SubtaskDetailPanel';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { recordTaskDeletion } from '../services/taskDeletionLog';
import { useTranslation } from '../i18n/translations';

export const TaskList: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  // const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);


  
  const profileId = useAuthStore(state => state.profile?.id);
  const profile = useAuthStore(state => state.profile);
  const roleStr = (profile?.role || '').toLowerCase();
  const levelStr = (profile?.employment_level || '').toLowerCase();
  const canCreateTask = ['admin', 'manager', 'leader'].includes(roleStr) || ['admin', 'manager', 'leader'].includes(levelStr);
  const [filters, setFilters] = useState({ 
    status: searchParams.get('status') || 'all', 
    priority: searchParams.get('priority') || 'all', 
    assignee: searchParams.get('assignee') || 'all', 
    department: 'all', 
    dateRange: 'all' 
  });
  const activeFiltersCount = Object.values(filters).filter(v => v !== 'all').length;
  const [groupBy, setGroupBy] = useState('none');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<any>(null);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  const { tasks, loading, refetch } = useTasks();
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const toggleGroup = (group: string) => setCollapsedGroups(prev => prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]);

  const handleNewTask = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

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
    });    const csvString = [headers.join(','), ...csvContent].join('\n');
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
    setDeletingIds(prev => [...prev, ...selectedTasks]);
    const cachedSelected = [...selectedTasks];
    setIsBulkDeleteModalOpen(false);
    
    setTimeout(async () => {
      let deletedCount = 0;
      for (const taskId of cachedSelected) {
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
      if (deletedCount < cachedSelected.length) toast.error(`Không xóa được ${cachedSelected.length - deletedCount} task`);
      setSelectedTasks([]);
      window.dispatchEvent(new Event('tasks:changed'));
      refetch();
      setDeletingIds(prev => prev.filter(id => !cachedSelected.includes(id)));
    }, 300);
  };

  const handleSingleDelete = async () => {
    if (!taskToDelete) return;
    const taskId = taskToDelete.id;
    let entityType: 'task' | 'project_subtask' | 'campaign_subtask';
    let rawId = taskId;
    let error: any;
    
    setDeletingIds(prev => [...prev, taskId]);
    const cachedTask = taskToDelete;
    setTaskToDelete(null);
    
    setTimeout(async () => {
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
        const { error: logError } = await recordTaskDeletion({ userId: profileId, taskId: rawId, entityType, title: cachedTask.title, parentName: cachedTask.project?.name, parentType: entityType === 'project_subtask' ? 'project' : entityType === 'campaign_subtask' ? 'campaign' : null });
        if (logError) toast.error('Task đã xóa nhưng chưa ghi được vào Log');
      }
      toast.success(`Đã chuyển task vào thùng rác`);
      window.dispatchEvent(new Event('tasks:changed'));
      refetch();
      setDeletingIds(prev => prev.filter(id => id !== taskId));
    }, 300);
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
    });    return groups;
  }, [filteredTasks, groupBy]);

  return (
    <TaskListLayout panelKey={isModalOpen ? 'create' : selectedTask?.id || null}>
      <div className="task-list-main" data-detail-open={!!selectedTask}>
      
      <TaskListToolbar searchTerm={searchTerm} onSearchChange={setSearchTerm} groupBy={groupBy} onGroupChange={setGroupBy} showFilters={showFilters} setShowFilters={setShowFilters} filters={filters} setFilters={setFilters} activeFiltersCount={activeFiltersCount} onExport={exportCSV} onCreate={handleNewTask} canCreateTask={canCreateTask} />

      {shortcutScope && <div className="task-list-scope">{t('tasks.filteringScope', { scope: shortcutScope === 'mine' ? t('tasks.filterMine') : shortcutScope === 'due-soon' ? t('tasks.filterDueSoon') : t('tasks.filterOverdue') })}</div>}
      
      <TaskListCollection loading={loading} filteredTasks={filteredTasks} groupedTasks={groupedTasks} groupBy={groupBy} collapsedGroups={collapsedGroups} toggleGroup={toggleGroup} selectedTasks={selectedTasks} setSelectedTasks={setSelectedTasks} toggleSelectTask={toggleSelectTask} onOpenTask={task => { setIsModalOpen(false); setSelectedTask(task); }} deletingIds={deletingIds} />

      <TaskListBulkActions selectedTasks={selectedTasks} onDelete={() => setIsBulkDeleteModalOpen(true)} onClear={() => setSelectedTasks([])} />
      </div>
      {selectedTask && (selectedTask.id.startsWith('ps-') || selectedTask.id.startsWith('cs-')) ? <SubtaskDetailPanel subtask={{ ...selectedTask, id: selectedTask.id.slice(3) }} entityType={selectedTask.id.startsWith('ps-') ? 'project_subtask' : 'campaign_subtask'} parentName={selectedTask.project?.name || selectedTask.campaign?.name} profile={profile} people={tasks.filter(t => t.assignee_id && t.assignee?.name).map(t => ({ id: Number(t.assignee_id), name: t.assignee!.name })).filter((p, i, list) => list.findIndex(v => v.id === p.id) === i)} onClose={() => setSelectedTask(null)} onUpdated={updated => { if (updated) setSelectedTask((current: any) => ({ ...current, ...updated, id: current.id })); void refetch(); }} /> : <TaskDetailPanel task={selectedTask} isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} onTaskUpdated={(updated) => { if (updated) setSelectedTask((current: any) => ({ ...current, ...updated })); refetch(); }} />}
      <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={refetch} />
      <ConfirmDeleteModal isOpen={isBulkDeleteModalOpen} title={t('tasks.deleteSelectedTitle')} message={t('tasks.deleteSelectedConfirm')} onConfirm={handleBulkDelete} onCancel={() => setIsBulkDeleteModalOpen(false)} />
      <ConfirmDeleteModal isOpen={!!taskToDelete} title={t('tasks.deleteTaskTitle')} message={t('tasks.deleteTaskConfirm')} onConfirm={handleSingleDelete} onCancel={() => setTaskToDelete(null)} />
    </TaskListLayout>
  );
};
