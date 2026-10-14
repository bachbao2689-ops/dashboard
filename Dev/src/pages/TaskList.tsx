import {taskOverdue,taskDueWithin} from '../lib/taskTracking';
import {calendarDay} from '../lib/profileCalendar';
import {useTrackingAvailability} from '../hooks/useTrackingAvailability';
import {useTaskListActions} from '../hooks/useTaskListActions';
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
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n/translations';

export const TaskList: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<any>(null);

  const { tasks, loading, error, refetch } = useTasks();
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

  const canBulkComplete=useTrackingAvailability();
  const actions=useTaskListActions(tasks,profileId,refetch);
  const {deletingIds}=actions;
  const handleBulkComplete=async()=>{if(await actions.complete(selectedTasks))setSelectedTasks([]);};
  useEffect(()=>{setSelectedTask((current:any)=>current?tasks.find(t=>t.id===current.id)||null:null);},[tasks]);
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
    priorityFilter !== 'all' ||
    ['scope','start','end','department','department_id','project_id','campaign_id'].some(key => searchParams.has(key))
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
    const query = new URLSearchParams(searchParams);
    ['search','status','priority','assignee','scope','start','end','department','department_id','project_id','campaign_id'].forEach(key => query.delete(key));
    setSearchParams(query, {replace:true});
  };

  const shortcutScope = searchParams.get('scope');
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');
  const departmentParam = searchParams.get('department');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const inSevenDays = new Date(today); inSevenDays.setDate(today.getDate() + 7);

  const handleBulkDelete=async()=>{setIsBulkDeleteModalOpen(false);const removed=await actions.remove(selectedTasks);setSelectedTasks(current=>current.filter(id=>!removed.includes(id)));};
  const handleSingleDelete=async()=>{if(!taskToDelete)return;const key=taskToDelete.id;setTaskToDelete(null);await actions.remove([key]);};

  const filteredTasks = tasks.filter(t => {
    if(searchParams.get('department_id')&&((t.department_id||'unassigned')!==searchParams.get('department_id')))return false;
    if(searchParams.get('project_id')&&t.project_id!==searchParams.get('project_id'))return false;
    if(searchParams.get('campaign_id')&&(t.campaign_id!==searchParams.get('campaign_id')||t.project_id))return false;
    // 1. Status Filter
    if(statusFilter==='overdue'){if(!taskOverdue(t,calendarDay(today.toISOString())!))return false;}
    else if (statusFilter !== 'all') {
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
      if (startParam && t.due_date && calendarDay(t.due_date)! < startParam) return false;
      if (endParam && t.due_date && calendarDay(t.due_date)! > endParam) return false;
    }

    // 6. Shortcut scope
    if (shortcutScope) {
      if (String(t.assignee_id) !== String(profileId)) {
        return false;
      }
      if (shortcutScope === 'due-soon') {
        if (!(taskDueWithin(t,calendarDay(today.toISOString())!,calendarDay(inSevenDays.toISOString())!))) {
          return false;
        }
      } else if (shortcutScope === 'overdue') {
        if (!(taskOverdue(t,calendarDay(today.toISOString())!))) {
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
        {error && <p role="alert">{error}</p>}
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

        <TaskListCollection
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
        />

        <TaskListBulkActions
          selectedTasks={selectedTasks}
          onComplete={handleBulkComplete}
          busy={actions.busy}
          canComplete={canBulkComplete}
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
          onClose={() => {setSelectedTask(null); const query=new URLSearchParams(searchParams);query.delete("task");setSearchParams(query,{replace:true});}}
          onUpdated={updated => {
            if (updated) setSelectedTask((current: any) => ({ ...current, ...updated, id: current.id }));
            void refetch();
          }}
        />
      ) : (
        <TaskDetailPanel
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => {setSelectedTask(null); const query=new URLSearchParams(searchParams);query.delete("task");setSearchParams(query,{replace:true});}}
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
