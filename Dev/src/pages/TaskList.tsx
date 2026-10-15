import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { checkDateMatch } from '../components/features/projects/CampaignPanel';
import type { FilterPerson } from '../components/common/filters';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { recordTaskDeletion } from '../services/taskDeletionLog';
import { completeTrackedTask } from '../services/taskTracking';
import { useTranslation } from '../i18n/translations';

export const TaskList: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  const profileId = useAuthStore(state => state.profile?.id);
  const profile = useAuthStore(state => state.profile);
  const roleStr = (profile?.role || '').toLowerCase();
  const levelStr = (profile?.employment_level || '').toLowerCase();
  const canCreateTask = ['admin', 'manager', 'leader'].includes(roleStr) || ['admin', 'manager', 'leader'].includes(levelStr);

  // Modular filter states matching Projects.tsx
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>(searchParams.get('assignee') || 'all');
  const [calendarFilter, setCalendarFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>(searchParams.get('priority') || 'all');
  const [groupBy, setGroupBy] = useState<string>('none');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [completing, setCompleting] = useState(false);
  const completeSelected = async () => {
    if(completing)return;
    setCompleting(true);
    const results=await Promise.allSettled(selectedTasks.map(completeTrackedTask));
    const failed=selectedTasks.filter((_,index)=>results[index].status==='rejected');
    const count=selectedTasks.length-failed.length;
    if(count)toast.success(`Đã hoàn thành ${count} công việc`);
    if(failed.length)toast.error(`Không thể hoàn thành ${failed.length} công việc. Kiểm tra quyền hoặc tải lại.`);
    setSelectedTasks(failed);setCompleting(false);void refetch();
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<any>(null);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  const { tasks, loading, error:taskError, refetch } = useTasks();
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const toggleGroup = (group: string) => setCollapsedGroups(prev => prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]);

  // People list from Supabase for PIC filter
  const [people, setPeople] = useState<FilterPerson[]>([]);

  useEffect(() => {
    supabase
      .from('users')
      .select('id, name, avatar_url, departments(name)')
      .eq('is_active', true)
      .order('name')
      .then(res => {
        if (res.data) {
          setPeople(res.data as any);
        }
      });
  }, []);

  // Merge people with any task assignees not yet in people
  const allPeople = useMemo<FilterPerson[]>(() => {
    const list = [...people];
    tasks.forEach(t => {
      if (t.assignee_id && t.assignee?.name) {
        if (!list.some(p => String(p.id) === String(t.assignee_id))) {
          list.push({
            id: t.assignee_id,
            name: t.assignee.name,
            avatar_url: t.assignee.avatar_url
          });
        }
      }
    });
    return list;
  }, [people, tasks]);

  // Click outside to close dropdowns
  const toolbarContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarContainerRef.current && !toolbarContainerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeDropdown]);

  const handleNewTask = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (searchParams.has('search')) {
      setSearchTerm(searchParams.get('search') || '');
    }
    if (searchParams.has('status')) {
      setStatusFilter(searchParams.get('status') || 'all');
    }
    if (searchParams.has('priority')) {
      setPriorityFilter(searchParams.get('priority') || 'all');
    }
    if (searchParams.has('assignee')) {
      setAssigneeFilter(searchParams.get('assignee') || 'all');
    }
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

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    statusFilter !== 'all' ||
    assigneeFilter !== 'all' ||
    calendarFilter !== 'all' ||
    customStartDate ||
    customEndDate ||
    priorityFilter !== 'all'
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setAssigneeFilter('all');
    setCalendarFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setPriorityFilter('all');
    setActiveDropdown(null);
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
    if (statusFilter !== 'all') {
      const ms = mapStatus(t.status || '');
      const mapped = ms === 'in-progress' ? 'in_progress' : ms;
      if (mapped !== statusFilter && t.status?.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
    }

    // 2. Priority Filter
    if (priorityFilter !== 'all') {
      const p = mapPriority(t.priority).toLowerCase();
      if (p !== priorityFilter.toLowerCase()) {
        return false;
      }
    }

    // 3. Assignee Filter
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'me') {
        if (String(t.assignee_id) !== String(profileId)) return false;
      } else if (assigneeFilter === 'unassigned') {
        if (t.assignee_id || t.assignee) return false;
      } else {
        const match = String(t.assignee_id) === String(assigneeFilter) || String(t.assignee?.id) === String(assigneeFilter);
        if (!match) return false;
      }
    }

    // 4. Department
    if (departmentParam && t.department?.name !== departmentParam) {
      return false;
    }

    // 5. Calendar Filter (Custom inline calendar & presets)
    const isDone = ['done', 'completed', 'complete'].includes((t.status || '').toLowerCase());
    if (calendarFilter !== 'all') {
      if (!checkDateMatch(t.start_date, t.due_date, calendarFilter, customStartDate, customEndDate, isDone)) {
        return false;
      }
    } else if (customStartDate || customEndDate) {
      if (!checkDateMatch(t.start_date, t.due_date, 'custom', customStartDate, customEndDate, isDone)) {
        return false;
      }
    } else if (startParam || endParam) {
      if (startParam && t.due_date && new Date(t.due_date) < new Date(`${startParam}T00:00:00`)) return false;
      if (endParam && t.due_date && new Date(t.due_date) > new Date(`${endParam}T23:59:59`)) return false;
    }

    // 6. Shortcut scope
    if (shortcutScope) {
      if (String(t.assignee_id) !== String(profileId)) {
        return false;
      }
      if (shortcutScope === 'due-soon') {
        if (!(isOpenTask(t) && !!t.due_date && new Date(t.due_date) >= today && new Date(t.due_date) <= inSevenDays)) {
          return false;
        }
      } else if (shortcutScope === 'overdue') {
        if (!(isOpenTask(t) && !!t.due_date && new Date(t.due_date) < today)) {
          return false;
        }
      }
    }

    // 7. Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const match = (t.title?.toLowerCase().includes(term) || t.task_ref?.toLowerCase().includes(term));
      if (!match) return false;
    }

    return true;
  });

  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') return { 'All Tasks': filteredTasks };
    const groups: Record<string, typeof filteredTasks> = {};
    filteredTasks.forEach(t => {
      let key = 'Other';
      if (groupBy === 'project') key = t.project?.name || t.campaign?.name || 'No Project';
      if (groupBy === 'assignee') key = t.assignee?.name || 'Unassigned';
      if (groupBy === 'status') key = mapStatus(t.status).toUpperCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [filteredTasks, groupBy]);

  return (
    <TaskListLayout panelKey={isModalOpen ? 'create' : selectedTask?.id || null}>
      <div className="task-list-main" data-detail-open={!!selectedTask}>
        <div ref={toolbarContainerRef} className="w-full">
          <TaskListToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            assigneeFilter={assigneeFilter}
            onAssigneeChange={setAssigneeFilter}
            calendarFilter={calendarFilter}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onSelectCalendarPreset={preset => {
              setCalendarFilter(preset);
              setCustomStartDate('');
              setCustomEndDate('');
            }}
            onApplyCustomDateRange={(start, end) => {
              setCalendarFilter('custom');
              setCustomStartDate(start);
              setCustomEndDate(end);
            }}
            onClearDateRange={() => {
              setCalendarFilter('all');
              setCustomStartDate('');
              setCustomEndDate('');
            }}
            priorityFilter={priorityFilter}
            onPriorityChange={setPriorityFilter}
            groupBy={groupBy}
            onGroupChange={setGroupBy}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={handleResetFilters}
            people={allPeople}
            currentUserId={profile?.id}
            currentUserName={profile?.name || 'Me'}
            currentUserAvatar={profile?.avatar_url}
            activeDropdown={activeDropdown}
            setActiveDropdown={setActiveDropdown}
            onCreate={handleNewTask}
            canCreateTask={canCreateTask}
          />
        </div>

        {shortcutScope && (
          <div className="task-list-scope mb-4">
            {t('tasks.filteringScope', {
              scope: shortcutScope === 'mine'
                ? t('tasks.filterMine')
                : shortcutScope === 'due-soon'
                ? t('tasks.filterDueSoon')
                : t('tasks.filterOverdue')
            })}
          </div>
        )}

        {taskError && <div role="alert" className="card-hub p-4 text-sm text-red-600"><p>{taskError}</p><button onClick={()=>void refetch()} className="mt-2 underline">Thử lại</button></div>}
        {!taskError && <TaskListCollection
          loading={loading}
          filteredTasks={filteredTasks}
          groupedTasks={groupedTasks}
          groupBy={groupBy}
          collapsedGroups={collapsedGroups}
          toggleGroup={toggleGroup}
          selectedTasks={selectedTasks}
          setSelectedTasks={setSelectedTasks}
          toggleSelectTask={toggleSelectTask}
          onOpenTask={task => { setIsModalOpen(false); setSelectedTask(task); }}
          deletingIds={deletingIds}
        />}

        <TaskListBulkActions
          busy={completing}
          onComplete={completeSelected}
          selectedTasks={selectedTasks}
          onDelete={() => setIsBulkDeleteModalOpen(true)}
          onClear={() => setSelectedTasks([])}
        />
      </div>

      {selectedTask && (selectedTask.id.startsWith('ps-') || selectedTask.id.startsWith('cs-')) ? (
        <SubtaskDetailPanel
          subtask={{ ...selectedTask, id: selectedTask.id.slice(3) }}
          entityType={selectedTask.id.startsWith('ps-') ? 'project_subtask' : 'campaign_subtask'}
          parentName={selectedTask.project?.name || selectedTask.campaign?.name}
          profile={profile}
          people={allPeople as any}
          onClose={() => setSelectedTask(null)}
          onUpdated={updated => {
            if (updated) setSelectedTask((current: any) => ({ ...current, ...updated, id: current.id }));
            void refetch();
          }}
        />
      ) : (
        <TaskDetailPanel
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={(updated) => {
            if (updated) setSelectedTask((current: any) => ({ ...current, ...updated }));
            refetch();
          }}
        />
      )}

      <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={refetch} />
      <ConfirmDeleteModal
        isOpen={isBulkDeleteModalOpen}
        title={t('tasks.deleteSelectedTitle')}
        message={t('tasks.deleteSelectedConfirm')}
        onConfirm={handleBulkDelete}
        onCancel={() => setIsBulkDeleteModalOpen(false)}
      />
      <ConfirmDeleteModal
        isOpen={!!taskToDelete}
        title={t('tasks.deleteTaskTitle')}
        message={t('tasks.deleteTaskConfirm')}
        onConfirm={handleSingleDelete}
        onCancel={() => setTaskToDelete(null)}
      />
    </TaskListLayout>
  );
};
