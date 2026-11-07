import {useReadEntityNotifications} from '../../../hooks/useReadEntityNotifications';
import {useTaskDetailVisibility} from '../../../hooks/useTaskDetailVisibility';
import React, { useEffect, useState, useRef } from 'react';
import { X, Clock, User, Calendar, AlignLeft, Edit3, Save, ListTodo, Plus, Trash2, Check, ChevronDown } from 'lucide-react';
import { TaskComments } from '../comments/TaskComments';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { notifyTaskParticipants } from '../../../services/taskNotifications';
import { Avatar } from '../../common/Avatar';
import { useTranslation } from '../../../i18n/translations';
import toast from 'react-hot-toast';
import {useMobileReadOnly} from '../../../hooks/useMobileReadOnly';
import { logTaskActivity } from '../../../services/taskActivityLogger';
import { displayDate, displayDateTime, inputDate } from '../../../lib/workflowHub';
import { WorkflowStatusPicker, canonicalWorkflowStatus, type WorkflowTaskStatus } from './WorkflowStatusPicker';
import { TaskDescriptionViewer } from './TaskDescriptionViewer';
import { TaskDescriptionEditor } from './TaskDescriptionEditor';
import { canCompleteTrackedTask, completeTrackedTask, updateTrackedTask } from '../../../services/workspaceTasks';
import { EntityActionBadges } from '../projects/EntityActionBadges';
import { saveTaskDeliverables, computeDeliverableQuantity, fetchTaskDeliverableMeta, type DeliverableChecklistItem } from '../../../lib/taskDeliverables';
import { priorityClass } from '../projects/projectPresentation';
import { isGlobalManager, isDepartmentLeader, type RoleProfile } from '../../../lib/roleScope';

interface TaskDetailPanelProps {
  task: any | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: (task?: any) => void;
  floating?: boolean;
  embedded?: boolean;
  commentsFocusToken?: number;
  focusChecklistItemId?: string;
  assignablePeople?: { id: number; name: string; avatar_url?: string | null }[];
}

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = (props) => {
  const parent = (props.task as any)?.checklist_parent;
  const resolved = parent ? {...parent, id: parent.raw_id || parent.id} : props.task;
  return <TaskDetailPanelContent {...props} task={resolved} focusChecklistItemId={(props.task as any)?.checklist_item_id || props.focusChecklistItemId} />;
};

const TaskDetailPanelContent: React.FC<TaskDetailPanelProps> = ({ task, isOpen, onClose, onTaskUpdated, floating = false, embedded = false, commentsFocusToken = 0, assignablePeople, focusChecklistItemId }) => {
  const { t, lang } = useTranslation();
  useTaskDetailVisibility(isOpen);
  useReadEntityNotifications('task',task?.id,isOpen&&Boolean(task));
  const readOnly=useMobileReadOnly(false);
  const profileId = useAuthStore(state => state.profile?.id);
  const profile = useAuthStore(state => state.profile);
  const [width, setWidth] = useState(500);
  const [resizing, setResizing] = useState(false);
  const [description, setDescription] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [commentFocus, setCommentFocus] = useState(0);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canComplete, setCanComplete] = useState(false);
  const [mentionPeople, setMentionPeople] = useState<any[]>([]);
  const [taskCollaborators, setTaskCollaborators] = useState<(string | number)[]>([]);
  const [editingTask, setEditingTask] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editPriority, setEditPriority] = useState('medium');
  const [editStartDate, setEditStartDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [taskQuantity, setTaskQuantity] = useState<string>('');
  const [editTaskQuantity, setEditTaskQuantity] = useState<string>('');
  const [targetDepartmentId, setTargetDepartmentId] = useState<string | null>(null);
  const [targetDepartmentName, setTargetDepartmentName] = useState<string | null>(null);
  const [checklistItems, setChecklistItems] = useState<DeliverableChecklistItem[]>([]);
  const [checklistCollapsed, setChecklistCollapsed] = useState(false);
  const focusChecklistReady = Boolean(focusChecklistItemId && checklistItems.some(item => item.id === focusChecklistItemId));
  useEffect(() => {
    if (!focusChecklistItemId || !focusChecklistReady) return;
    const frame=requestAnimationFrame(() => document.getElementById(`checklist-item-${focusChecklistItemId}`)?.scrollIntoView({block:'center'}));
    return () => cancelAnimationFrame(frame);
  }, [focusChecklistItemId, focusChecklistReady]);
  const checklistQuantity = checklistItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  const totalChecklistQuantity = checklistQuantity + (Number(taskQuantity) || 0);
  const [currentUpdatedAt, setCurrentUpdatedAt] = useState<string | null | undefined>(task?.updated_at);

  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemPriority, setNewItemPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newItemQuantity, setNewItemQuantity] = useState<string>('');
  const [newItemDueDate, setNewItemDueDate] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemTitle, setEditItemTitle] = useState('');
  const [editItemDescription, setEditItemDescription] = useState('');
  const [editItemPriority, setEditItemPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [editItemQuantity, setEditItemQuantity] = useState<string>('');
  const [editItemDueDate, setEditItemDueDate] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  const isLeaderOrHigher = Boolean(profile && (isGlobalManager(profile as RoleProfile) || isDepartmentLeader(profile as RoleProfile)));
  const canAddChecklistItem = canEdit || isLeaderOrHigher;

  const taskId = task?.id;
  const reload = React.useCallback(async () => {
    if (!taskId) return;
    const meta = await fetchTaskDeliverableMeta('task', taskId, true);
    const details = meta || {};
    const loadedChecklist = meta?.checklist_items || [];
    const baseQuantity = computeDeliverableQuantity(meta || {quantity: (task as any)?.quantity}).baseQuantity;
    const rawBase = baseQuantity > 0 ? String(baseQuantity) : '';
    setTaskQuantity(rawBase);
    setEditTaskQuantity(rawBase);
    setTargetDepartmentId(meta?.target_department_id || details.target_department_id || (task as any)?.target_department_id || null);
    setTargetDepartmentName(meta?.target_department_name || details.target_department_name || (task as any)?.target_department_name || null);
    setChecklistItems(loadedChecklist);
  }, [taskId, (task as any)?.quantity]);

  useEffect(() => {
    if (!taskId) return;
    const channel = supabase.channel(`realtime-activity_log-task-${taskId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log', filter: `entity_id=eq.${taskId}` }, () => {
        void reload().catch(() => toast.error('Không thể đồng bộ thông tin công việc.'));
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [taskId, reload]);

  useEffect(() => {
    setDescription(task?.description || '');
    setEditingDescription(false);
    setCommentFocus(0);
    setEditingTask(false);
    setEditTitle(task?.title || '');
    setEditAssigneeId(task?.assignee_id == null ? '' : String(task.assignee_id));
    setEditPriority(task?.priority || 'medium');
    setEditStartDate(task?.start_date?.slice(0, 10) || '');
    setEditDueDate(task?.due_date?.slice(0, 10) || '');
    setEditingItemId(null);
    setEditItemTitle('');
    setEditItemDescription('');
    setEditItemPriority('medium');
    setEditItemQuantity('');
    setEditItemDueDate('');
    setNewItemQuantity('');
    setCurrentUpdatedAt(task?.updated_at);
    void reload().catch(() => toast.error('Không thể đồng bộ thông tin công việc.'));
  }, [task?.id, task?.title, task?.assignee_id, task?.priority, task?.start_date, task?.due_date, task?.description, isOpen, profileId, reload]);

  useEffect(() => {
    setCanEdit(false);
    setCanComplete(false);
    let active = true;
    if (isOpen && profileId != null && task?.id && !task.id.startsWith('ps-') && !task.id.startsWith('cs-')) {
      supabase.rpc('workflow_task_access', { tid: task.id, editing: true }).then(({ data }) => {
        if (!active) return;
        setCanEdit(data === true);
        if (data !== true) { setEditingDescription(false); setEditingTask(false); }
      });
      void canCompleteTrackedTask(task.id).then(value => { if (active) setCanComplete(value); }).catch(() => { if (active) setCanComplete(false); });
    }
    return () => { active = false; };
  }, [task?.id, task?.updated_at, task?.assignee_id, task?.project_id, task?.campaign_id, task?.workflow_phase_id, isOpen, profileId, profile?.role, profile?.employment_level]);

  useEffect(() => {
    let active = true;
    setMentionPeople([]);
    if (isOpen) {
      supabase
        .from('users')
        .select('id,name,avatar_url,role,employment_level,job_title,department_id,departments:department_id(id,name)')
        .eq('is_active', true)
        .order('name')
        .then(({ data }) => { if (active) setMentionPeople(data || []); });
    }
    return () => { active = false; };
  }, [isOpen, profileId]);

  useEffect(() => {
    let active = true;
    const ids = new Set<string | number>();
    if (task?.assignee_id) ids.add(task.assignee_id);
    if (task?.created_by) ids.add(task.created_by);
    if (task?.creator_id) ids.add(task.creator_id);

    if (task?.workflow_phase_id) {
      supabase.from('workflow_phase_members').select('user_id').eq('phase_id', task.workflow_phase_id).then(({ data }) => {
        if (!active) return;
        (data || []).forEach(m => { if (m.user_id) ids.add(m.user_id); });
        setTaskCollaborators(Array.from(ids));
      });
    } else {
      setTaskCollaborators(Array.from(ids));
    }
    return () => { active = false; };
  }, [task?.id, task?.assignee_id, task?.created_by, task?.creator_id, task?.workflow_phase_id]);


  useEffect(() => {
    if (!resizing) return;
    const move = (event: MouseEvent) => { const next = document.body.clientWidth - event.clientX; if (next >= 360 && next <= 800) setWidth(next); };
    const up = () => setResizing(false);
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
  }, [resizing]);

  const saveDescription = async (newDesc?: string) => {
    if (readOnly || !canEdit || !task) return;
    const textToSave = typeof newDesc === 'string' ? newDesc : description;
    setSaving(true);
    const { data, error } = await supabase.from('tasks').update({ description: textToSave, updated_at: new Date().toISOString() }).eq('id', task.id).select('id').maybeSingle();
    setSaving(false);
    if (error || !data) return toast.error('Không thể lưu mô tả. Kiểm tra lại quyền task.');
    await notifyTaskParticipants(task, { id: profileId, name: profile?.name, department_id: profile?.department_id }, 'task_updated');
    setDescription(textToSave);
    setEditingDescription(false); onTaskUpdated?.({ description: textToSave }); toast.success('Đã lưu mô tả');
  };

  const handleAddChecklistItem = async () => {
    if (!newItemTitle.trim() || !task || !profileId) return;
    setAddingItem(true);
    try {
      const currentDue = (task.due_date || '').slice(0, 10);
      const itemDue = (newItemDueDate || '').slice(0, 10);
      const parentDue = (task.project?.due_date || task.campaign?.due_date || task.campaign?.end_date)
        ? (task.project?.due_date || task.campaign?.due_date || task.campaign?.end_date).slice(0, 10)
        : '';
      if (itemDue && parentDue && itemDue > parentDue) {
        toast.error(lang === 'en' ? 'Checklist item deadline cannot exceed project deadline.' : 'Hạn chót đầu việc không được vượt quá hạn chót của Project/Campaign cha.');
        return;
      }
      const extendsDeadline = Boolean(itemDue && (!currentDue || itemDue > currentDue));

      const numItemQ = Number(newItemQuantity);
      const newItem: DeliverableChecklistItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: newItemTitle.trim(),
        description: newItemDescription.trim() || null,
        priority: newItemPriority,
        quantity: Number.isFinite(numItemQ) && numItemQ > 0 ? numItemQ : null,
        completed: false,
        due_date: itemDue || null,
        created_by: profileId,
        created_by_name: profile?.name || (lang === 'en' ? 'Member' : 'Thành viên'),
        created_at: new Date().toISOString(),
      };

      if (extendsDeadline) {
        const nowIso = new Date().toISOString();
        await updateTrackedTask(
          task.id,
          { due_date: itemDue, updated_at: nowIso },
          currentUpdatedAt || task.updated_at
        );
        setCurrentUpdatedAt(nowIso);
        setEditDueDate(itemDue);
        onTaskUpdated?.({ ...task, due_date: itemDue, updated_at: nowIso });
        window.dispatchEvent(new Event('tasks:changed'));

        void logTaskActivity({
          workspaceId: task.workspace_id,
          userId: profileId,
          action: 'deadline_extended',
          entityType: 'task',
          entityId: task.id,
          oldValue: { due_date: task.due_date },
          newValue: { due_date: itemDue },
          metadata: {
            title: `${profile?.name || 'Thành viên'} đã kéo dài hạn chót đến ${displayDate(itemDue)} (do giao thêm việc)`,
            reason: `Thêm việc phát sinh "${newItemTitle.trim()}" có hạn chót dài hơn`,
            old_due_date: task.due_date,
            new_due_date: itemDue,
            item_title: newItemTitle.trim(),
            actor_name: profile?.name,
          },
        });
      }



      const nextItems = [...checklistItems, newItem];
      const nextChecklistQuantity = nextItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
      const baseQuantityValue = Number(taskQuantity) || null;
      const effectiveQuantity = nextChecklistQuantity + (baseQuantityValue || 0);

      await saveTaskDeliverables('task', task.id, {
          description: task.description || description,
          checklist_items: nextItems,
          quantity: effectiveQuantity,
          base_quantity: baseQuantityValue,
          target_department_id: targetDepartmentId,
          target_department_name: targetDepartmentName,
          is_internal_detail_sync: true,
        }, profileId, task.workspace_id, checklistItems);

      void logTaskActivity({
        workspaceId: task.workspace_id,
        userId: profileId,
        action: 'subtask_item_added',
        entityType: 'task',
        entityId: task.id,
        metadata: {
          title: `${profile?.name || (lang === 'en' ? 'Member' : 'Thành viên')} ${lang === 'en' ? 'added checklist item' : 'đã thêm đầu việc'}: ${newItemTitle.trim()}`,
          item_title: newItemTitle.trim(),
          description: newItemDescription.trim() || null,
          priority: newItemPriority,
          due_date: itemDue || null,
          actor_name: profile?.name,
        },
      });

      setChecklistItems(nextItems);
      setNewItemTitle('');
      setNewItemDescription('');
      setNewItemPriority('medium');
      setNewItemQuantity('');
      setNewItemDueDate('');
      setShowAddItemForm(false);
      if (!extendsDeadline) {
        onTaskUpdated?.();
      }
      toast.success(extendsDeadline ? (lang === 'en' ? 'Added checklist item and extended task due date' : 'Đã thêm đầu việc và kéo dài hạn chót task') : (lang === 'en' ? 'Added checklist item' : 'Đã thêm đầu việc'));
    } catch (err: any) {
      toast.error(err?.message || 'Không thể thêm đầu việc');
    } finally {
      setAddingItem(false);
    }
  };

  const handleToggleChecklistItem = async (itemId: string) => {
    if (!task || !profileId) return;
    const targetItem = checklistItems.find(i => i.id === itemId);
    if (!targetItem) return;
    const nextCompleted = !targetItem.completed;
    const nextItems = checklistItems.map(i => i.id === itemId ? { ...i, completed: nextCompleted, completed_at: nextCompleted ? new Date().toISOString() : null } : i);
    const nextChecklistQuantity = nextItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
    const baseQuantityValue = Number(taskQuantity) || null;
    const effectiveQuantity = nextChecklistQuantity + (baseQuantityValue || 0);

    setChecklistItems(nextItems);
    try {
      await saveTaskDeliverables('task', task.id, {
          description: task.description || description,
          checklist_items: nextItems,
          quantity: effectiveQuantity,
          base_quantity: baseQuantityValue,
          target_department_id: targetDepartmentId,
          target_department_name: targetDepartmentName,
          is_internal_detail_sync: true,
        }, profileId, task.workspace_id, checklistItems);

      void logTaskActivity({
        workspaceId: task.workspace_id,
        userId: profileId,
        action: 'subtask_item_toggled',
        entityType: 'task',
        entityId: task.id,
        metadata: {
          title: `${profile?.name || 'Thành viên'} đã đánh dấu ${nextCompleted ? 'hoàn thành' : 'chưa hoàn thành'} đầu việc: ${targetItem.title}`,
          item_title: targetItem.title,
          completed: nextCompleted,
          actor_name: profile?.name,
        },
      });
      onTaskUpdated?.();
    } catch (err) {
      setChecklistItems(checklistItems);
      toast.error((err as any)?.message || 'Không thể lưu đầu việc');
      void reload().catch(() => {});
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!task || !profileId) return;
    const targetItem = checklistItems.find(i => i.id === itemId);
    if (!targetItem) return;
    const nextItems = checklistItems.filter(i => i.id !== itemId);
    const nextChecklistQuantity = nextItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
    const baseQuantityValue = Number(taskQuantity) || null;
    const effectiveQuantity = nextChecklistQuantity + (baseQuantityValue || 0);

    setChecklistItems(nextItems);
    try {
      await saveTaskDeliverables('task', task.id, {
          description: task.description || description,
          checklist_items: nextItems,
          quantity: effectiveQuantity,
          base_quantity: baseQuantityValue,
          target_department_id: targetDepartmentId,
          target_department_name: targetDepartmentName,
          is_internal_detail_sync: true,
        }, profileId, task.workspace_id, checklistItems);

      void logTaskActivity({
        workspaceId: task.workspace_id,
        userId: profileId,
        action: 'subtask_item_deleted',
        entityType: 'task',
        entityId: task.id,
        metadata: {
          title: `${profile?.name || 'Thành viên'} đã xóa đầu việc: ${targetItem.title}`,
          item_title: targetItem.title,
          actor_name: profile?.name,
        },
      });
      onTaskUpdated?.();
    } catch (err) {
      setChecklistItems(checklistItems);
      toast.error((err as any)?.message || 'Không thể lưu đầu việc');
      void reload().catch(() => {});
    }
  };

  const handleStartEditChecklistItem = (item: DeliverableChecklistItem) => {
    setEditingItemId(item.id);
    setEditItemTitle(item.title);
    setEditItemDescription(item.description || '');
    setEditItemPriority((item.priority as any) || 'medium');
    setEditItemQuantity(item.quantity != null ? String(item.quantity) : '');
    setEditItemDueDate((item.due_date || '').slice(0, 10));
  };

  const handleCancelEditChecklistItem = () => {
    setEditingItemId(null);
    setEditItemTitle('');
    setEditItemDescription('');
    setEditItemPriority('medium');
    setEditItemQuantity('');
    setEditItemDueDate('');
  };

  const handleSaveEditChecklistItem = async (itemId: string) => {
    if (!editItemTitle.trim() || !task || !profileId) return;
    setSavingItem(true);
    try {
      const currentDue = (task.due_date || '').slice(0, 10);
      const itemDue = (editItemDueDate || '').slice(0, 10);
      const parentDue = (task.project?.due_date || task.campaign?.due_date || task.campaign?.end_date)
        ? (task.project?.due_date || task.campaign?.due_date || task.campaign?.end_date).slice(0, 10)
        : '';
      if (itemDue && parentDue && itemDue > parentDue) {
        toast.error(lang === 'en' ? 'Checklist item deadline cannot exceed project deadline.' : 'Hạn chót đầu việc không được vượt quá hạn chót của Project/Campaign cha.');
        return;
      }
      const extendsDeadline = Boolean(itemDue && (!currentDue || itemDue > currentDue));

      if (extendsDeadline) {
        const nowIso = new Date().toISOString();
        await updateTrackedTask(
          task.id,
          { due_date: itemDue, updated_at: nowIso },
          currentUpdatedAt || task.updated_at
        );
        setCurrentUpdatedAt(nowIso);
        setEditDueDate(itemDue);
        onTaskUpdated?.({ ...task, due_date: itemDue, updated_at: nowIso });
        window.dispatchEvent(new Event('tasks:changed'));

        void logTaskActivity({
          workspaceId: task.workspace_id,
          userId: profileId,
          action: 'deadline_extended',
          entityType: 'task',
          entityId: task.id,
          oldValue: { due_date: task.due_date },
          newValue: { due_date: itemDue },
          metadata: {
            title: `${profile?.name || 'Thành viên'} đã kéo dài hạn chót đến ${displayDate(itemDue)} (do cập nhật đầu việc)`,
            reason: `Cập nhật đầu việc "${editItemTitle.trim()}" có hạn chót dài hơn`,
            old_due_date: task.due_date,
            new_due_date: itemDue,
            item_title: editItemTitle.trim(),
            actor_name: profile?.name,
          },
        });
      }

      const numItemQ = Number(editItemQuantity);
      const nextItems = checklistItems.map(i => i.id === itemId ? {
        ...i,
        title: editItemTitle.trim(),
        description: editItemDescription.trim() || null,
        priority: editItemPriority,
        quantity: Number.isFinite(numItemQ) && numItemQ > 0 ? numItemQ : null,
        due_date: itemDue || null,
      } : i);
      const nextChecklistQuantity = nextItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
      const baseQuantityValue = Number(taskQuantity) || null;
      const effectiveQuantity = nextChecklistQuantity + (baseQuantityValue || 0);

      await saveTaskDeliverables('task', task.id, {
          description: task.description || description,
          checklist_items: nextItems,
          quantity: effectiveQuantity,
          base_quantity: baseQuantityValue,
          target_department_id: targetDepartmentId,
          target_department_name: targetDepartmentName,
          is_internal_detail_sync: true,
        }, profileId, task.workspace_id, checklistItems);

      void logTaskActivity({
        workspaceId: task.workspace_id,
        userId: profileId,
        action: 'subtask_item_updated',
        entityType: 'task',
        entityId: task.id,
        metadata: {
          title: `${profile?.name || (lang === 'en' ? 'Member' : 'Thành viên')} ${lang === 'en' ? 'updated checklist item' : 'đã cập nhật đầu việc'}: ${editItemTitle.trim()}`,
          item_title: editItemTitle.trim(),
          description: editItemDescription.trim() || null,
          priority: editItemPriority,
          due_date: itemDue || null,
          actor_name: profile?.name,
        },
      });

      setChecklistItems(nextItems);
      handleCancelEditChecklistItem();
      if (!extendsDeadline) {
        onTaskUpdated?.();
      }
      toast.success(extendsDeadline ? (lang === 'en' ? 'Updated item and extended task deadline' : 'Đã cập nhật đầu việc và kéo dài hạn chót task') : (lang === 'en' ? 'Updated checklist item' : 'Đã cập nhật đầu việc'));
    } catch (err: any) {
      toast.error(err?.message || 'Không thể cập nhật đầu việc');
    } finally {
      setSavingItem(false);
    }
  };

  const saveTaskDetails = async () => {
    if (readOnly || !canEdit || !task || !editTitle.trim()) return;
    if (editStartDate && editDueDate && editStartDate > editDueDate) {
      toast.error(lang === 'en' ? 'Start date must be before the due date.' : 'Ngày bắt đầu phải trước hạn chót.');
      return;
    }
    setSaving(true);
    const nowIso = new Date().toISOString();
    const values = {
      title: editTitle.trim(),
      assignee_id: editAssigneeId ? Number(editAssigneeId) : null,
      priority: editPriority,
      start_date: editStartDate || null,
      due_date: editDueDate || null,
      updated_at: nowIso,
    };
    let query = supabase.from('tasks').update(values).eq('id', task.id);
    if (currentUpdatedAt || task.updated_at) {
      query = query.eq('updated_at', currentUpdatedAt || task.updated_at);
    }
    const { data, error } = await query.select('id').maybeSingle();
    setSaving(false);
    if (error || !data) {
      if (!data && (currentUpdatedAt || task.updated_at)) {
        return toast.error(lang === 'en' ? 'Task was modified by another user. Please refresh to view the latest version.' : 'Task đã được người khác chỉnh sửa. Vui lòng làm mới trang để xem phiên bản mới nhất.');
      }
      return toast.error(lang === 'en' ? 'Could not save task changes. Check task permissions.' : 'Không thể lưu task. Kiểm tra lại quyền chỉnh sửa.');
    }
    setCurrentUpdatedAt(nowIso);
    const actorName = profile?.name || 'Thành viên';
    if (editTitle.trim() !== (task.title || '').trim()) {
      void logTaskActivity({
        workspaceId: task.workspace_id,
        userId: profileId,
        action: 'task_updated',
        entityType: 'task',
        entityId: task.id,
        oldValue: { title: task.title },
        newValue: { title: editTitle.trim() },
        metadata: {
          field: 'title',
          title: `${actorName} đã đổi tiêu đề: "${task.title}" → "${editTitle.trim()}"`,
          actor_name: actorName,
        },
      });
    }
    const oldDue = (task.due_date || '').slice(0, 10);
    const newDue = (editDueDate || '').slice(0, 10);
    if (newDue !== oldDue) {
      void logTaskActivity({
        workspaceId: task.workspace_id,
        userId: profileId,
        action: 'task_updated',
        entityType: 'task',
        entityId: task.id,
        oldValue: { due_date: task.due_date },
        newValue: { due_date: editDueDate || null },
        metadata: {
          field: 'due_date',
          title: `${actorName} đã đổi hạn chót: ${displayDate(oldDue)} → ${displayDate(newDue)}`,
          actor_name: actorName,
        },
      });
    }
    const oldStart = (task.start_date || '').slice(0, 10);
    const newStart = (editStartDate || '').slice(0, 10);
    if (newStart !== oldStart) {
      void logTaskActivity({
        workspaceId: task.workspace_id,
        userId: profileId,
        action: 'task_updated',
        entityType: 'task',
        entityId: task.id,
        oldValue: { start_date: task.start_date },
        newValue: { start_date: editStartDate || null },
        metadata: {
          field: 'start_date',
          title: `${actorName} đã đổi ngày bắt đầu: ${displayDate(oldStart)} → ${displayDate(newStart)}`,
          actor_name: actorName,
        },
      });
    }
    const oldAssigneeId = task.assignee_id == null ? '' : String(task.assignee_id);
    if (editAssigneeId !== oldAssigneeId) {
      const oldName = task.assignee?.name || 'Chưa gán';
      const newPerson = (assignablePeople || mentionPeople).find(item => String(item.id) === editAssigneeId);
      const newName = newPerson?.name || (editAssigneeId ? 'Thành viên' : 'Chưa gán');
      void logTaskActivity({
        workspaceId: task.workspace_id,
        userId: profileId,
        action: 'task_updated',
        entityType: 'task',
        entityId: task.id,
        oldValue: { assignee_id: task.assignee_id },
        newValue: { assignee_id: editAssigneeId ? Number(editAssigneeId) : null },
        metadata: {
          field: 'assignee',
          title: `${actorName} đã đổi người thực hiện: ${oldName} → ${newName}`,
          actor_name: actorName,
        },
      });
    }
    if (editPriority !== (task.priority || 'medium')) {
      void logTaskActivity({
        workspaceId: task.workspace_id,
        userId: profileId,
        action: 'task_updated',
        entityType: 'task',
        entityId: task.id,
        oldValue: { priority: task.priority },
        newValue: { priority: editPriority },
        metadata: {
          field: 'priority',
          title: `${actorName} đã đổi độ ưu tiên: ${task.priority || 'medium'} → ${editPriority}`,
          actor_name: actorName,
        },
      });
    }

    const numQ = Number(editTaskQuantity);
    const baseQuantityValue = Number.isFinite(numQ) && numQ > 0 ? numQ : null;
    const effectiveQuantity = (baseQuantityValue || 0) + checklistQuantity;

    try {
      await saveTaskDeliverables(
        'task',
        task.id,
        {
          quantity: effectiveQuantity,
          base_quantity: baseQuantityValue,
          description: task.description || description,
          target_department_id: targetDepartmentId,
          target_department_name: targetDepartmentName,
        },
        profileId,
        task.workspace_id,
      );
    } catch (failure: any) {
      onTaskUpdated?.(values);
      return toast.error(failure?.message || 'Đã lưu thông tin task nhưng chưa lưu được số lượng. Vui lòng thử lại.');
    }
    setTaskQuantity(baseQuantityValue != null ? String(baseQuantityValue) : '');
    setEditTaskQuantity(baseQuantityValue != null ? String(baseQuantityValue) : '');

    const person = (assignablePeople || mentionPeople).find(item => String(item.id) === editAssigneeId);
    const updatedTask = { ...values, assignee: person ? { id: person.id, name: person.name, avatar_url: person.avatar_url } : null };
    await notifyTaskParticipants(task, { id: profileId, name: profile?.name, department_id: profile?.department_id }, 'task_updated');
    setEditingTask(false);
    onTaskUpdated?.(updatedTask);
    window.dispatchEvent(new Event('tasks:changed'));
    toast.success(lang === 'en' ? 'Task updated' : 'Đã cập nhật task');
  };

  const completeTask = async () => {
    if (readOnly||!canComplete||!task || ['done', 'completed', 'complete'].includes((task.status || '').toLowerCase())) return;
    setSaving(true);
    try { await completeTrackedTask(task.id); }
    catch (error: any) { setSaving(false); return toast.error(error?.message || 'Không thể hoàn thành task. Kiểm tra lại quyền task.'); }
    setSaving(false);
    await notifyTaskParticipants(task, { id: profileId, name: profile?.name, department_id: profile?.department_id }, 'task_completed');
    onTaskUpdated?.({ status: 'done',workflow_status:'completed' }); window.dispatchEvent(new Event('tasks:changed'));toast.success('Task đã hoàn thành');
  };

  const handleTaskPriorityChange = async (newPriority: string) => {
    if (readOnly || !canEdit || !task || saving) return;
    setSaving(true);
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('tasks')
      .update({ priority: newPriority, updated_at: nowIso })
      .eq('id', task.id);
    setSaving(false);
    if (error) {
      toast.error(error.message || 'Lỗi cập nhật mức ưu tiên');
      return;
    }
    onTaskUpdated?.({ priority: newPriority });
    window.dispatchEvent(new Event('tasks:changed'));
    toast.success(lang === 'en' ? 'Priority updated' : 'Đã cập nhật mức ưu tiên');
  };

  const handleTaskStatusChange = async (newStatus: string) => {
    if (readOnly || !canEdit || !task || saving) return;
    if (newStatus === 'completed') {
      if (!canComplete) {
        toast.error(lang === 'en' ? 'Cannot complete task' : 'Không thể hoàn thành task');
        return;
      }
      await completeTask();
      return;
    }
    setSaving(true);
    const nowIso = new Date().toISOString();
    const canonicalStatus = newStatus === 'active' ? 'in_progress' : newStatus;
    const { error } = await supabase
      .from('tasks')
      .update({ status: canonicalStatus, updated_at: nowIso })
      .eq('id', task.id);
    setSaving(false);
    if (error) {
      toast.error(error.message || 'Lỗi cập nhật trạng thái');
      return;
    }
    onTaskUpdated?.({ status: canonicalStatus });
    window.dispatchEvent(new Event('tasks:changed'));
    toast.success(lang === 'en' ? 'Status updated' : 'Đã cập nhật trạng thái');
  };

  const changePhaseTaskStatus = async (stage: WorkflowTaskStatus): Promise<void> => {
    if (readOnly||!canEdit || !task) return;
    setSaving(true);
    const status = canonicalWorkflowStatus[stage];
    const { data, error } = await supabase.from('tasks').update({ status, workflow_status: stage, updated_at: new Date().toISOString() }).eq('id', task.id).select('id').maybeSingle();
    setSaving(false);
    if (error || !data) { toast.error(error?.message || 'Bạn không còn quyền cập nhật task.'); throw new Error('Task status update denied'); }
    onTaskUpdated?.({ status, workflow_status: stage });
    window.dispatchEvent(new Event('tasks:changed'));
  };

  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-close detail drawer when clicking outside ("staff bấm chỗ khác thì tự crop vào")
  useEffect(() => {
    if (!isOpen || embedded) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (panelRef.current && panelRef.current.contains(target)) return;
      if (
        target.closest('.tw-calendar-popover') ||
        target.closest('[role="dialog"]') ||
        target.closest('[role="menu"]') ||
        target.closest('[role="listbox"]') ||
        target.closest('.toast') ||
        target.closest('#headlessui-portal-root')
      ) {
        return;
      }
      onClose();
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('touchstart', handlePointerDown);
    }, 60);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen, embedded, onClose]);

  return (
    <>
      {isOpen && !embedded && (
        <div 
          className="fixed inset-0 bg-slate-900/30 dark:bg-slate-900/60 z-[65] xl:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div 
        ref={panelRef}
        inert={!isOpen} 
        aria-hidden={!isOpen} 
        style={{ '--task-panel-width': `${width}px` } as React.CSSProperties}
        className={embedded ? 'flex flex-col h-full min-h-0 w-full bg-white dark:bg-slate-800' : `dashboard-detail-drawer bg-white dark:bg-slate-800 shrink-0 ${isOpen ? 'w-full max-w-full xl:max-w-[calc(100vw-32px)] xl:w-[var(--task-panel-width)] xl:max-w-[min(var(--task-panel-width),50vw)] shadow-drawer-task border border-blue-500/20 opacity-100 pointer-events-auto drawer-slide-in' : 'w-0 min-w-0 shadow-none border-0 opacity-0 pointer-events-none'} ${floating ? 'z-[110]' : 'z-[70]'} ${!resizing ? 'transition-[width,opacity] duration-300 ease-out' : ''}`}
      >
        {isOpen && !embedded && <div onMouseDown={() => setResizing(true)} className="hidden xl:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <div><span className="text-xs font-semibold px-3 py-1.5 rounded-[6px] uppercase tracking-wider border border-gray-200 dark:border-slate-700">{task?.task_ref || 'TASK'}</span><span className="ml-2 text-xs capitalize text-gray-500">{task?.priority || 'medium'} {t('common.priority').toLowerCase()}</span></div>
          <div className="flex items-center gap-1"><button aria-label={t('common.closeTaskDetail')} onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-[8px] hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400"><X className="w-5 h-5" /></button></div>
        </div>
        {task && <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-6 md:px-8 space-y-7">
<section>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">{task.title}</h2>
            </div>
            <div className="mt-4">
              <EntityActionBadges
                priority={task.priority || 'medium'}
                status={task.status || 'planning'}
                onPriorityChange={canEdit && !readOnly ? handleTaskPriorityChange : undefined}
                onStatusChange={canEdit && !readOnly ? handleTaskStatusChange : undefined}
                canManage={canEdit && !readOnly}
                onEdit={canEdit && !readOnly ? () => setEditingTask(v => !v) : undefined}
                entityType="task"
                entityId={task?.id}
                entityName={task?.title}
                workspaceId={task?.workspace_id}
              >
                {totalChecklistQuantity > 0 && (
                  <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 px-2.5 py-1 rounded-[6px] text-xs font-bold border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-2xs">
                    {lang === 'en' ? 'Total Qty' : 'Tổng số lượng'}: {totalChecklistQuantity}
                  </span>
                )}
                {Boolean(targetDepartmentName || (task as any).target_department_name) && (
                  <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 px-2.5 py-1 rounded-[6px] text-xs font-semibold border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-2xs">
                    {lang === 'en' ? 'Department' : 'Phòng ban'}: {targetDepartmentName || (task as any).target_department_name}
                  </span>
                )}
              </EntityActionBadges>
            </div>
            {task.workflow_phase_id && (
              <div className="mt-4">
                <WorkflowStatusPicker status={task.status} stage={task.workflow_status} disabled={!canEdit||readOnly} onChange={changePhaseTaskStatus}/>
              </div>
            )}
          </section>
          {editingTask ? (
            <section className="space-y-4 rounded-[8px] border border-primary/20 bg-gray-50 p-4 dark:bg-slate-800/50">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">{lang === 'en' ? 'Task title' : 'Tiêu đề task'}
                <input value={editTitle} onChange={event => setEditTitle(event.target.value)} maxLength={500} className="mt-1.5 w-full rounded-[8px] border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">{t('common.assignee')}
                  <select value={editAssigneeId} onChange={event => setEditAssigneeId(event.target.value)} className="mt-1.5 w-full rounded-[8px] border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    <option value="">{t('common.unassigned')}</option>
                    {(assignablePeople || mentionPeople).map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
                    {task.assignee_id != null && task.assignee?.name && !(assignablePeople || mentionPeople).some(person => String(person.id) === String(task.assignee_id)) && <option value={task.assignee_id}>{task.assignee.name}</option>}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">{t('common.priority')}
                  <select value={editPriority} onChange={event => setEditPriority(event.target.value)} className="mt-1.5 w-full rounded-[8px] border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    <option value="low">{t('common.low')}</option><option value="medium">{t('common.medium')}</option><option value="high">{t('common.high')}</option><option value="urgent">{t('common.urgent')}</option>
                  </select>
                </label>
                <div className="tw-calendar-picker relative">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                    {lang === 'en' ? 'Start date' : 'Ngày bắt đầu'}
                  </label>
                  <input
                    type="text"
                    id={`task-edit-start-${task.id}`}
                    readOnly
                    onClick={(e) => {
                      if ((window as any).openCalendar) {
                        (window as any).openCalendar({
                          displayId: `task-edit-start-${task.id}`,
                          mode: 'single',
                          maxDate: editDueDate || undefined,
                        }, e);
                      }
                    }}
                    value={editStartDate ? displayDate(editStartDate).replace('—', '') : ''}
                    onChange={(e) => setEditStartDate(inputDate(e.target.value) || '')}
                    placeholder="dd/mm/yyyy"
                    className="w-full rounded-[8px] border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="tw-calendar-picker relative">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                    {t('common.dueDate')}
                  </label>
                  <input
                    type="text"
                    id={`task-edit-due-${task.id}`}
                    readOnly
                    onClick={(e) => {
                      if ((window as any).openCalendar) {
                        (window as any).openCalendar({
                          displayId: `task-edit-due-${task.id}`,
                          mode: 'single',
                          minDate: editStartDate || undefined,
                        }, e);
                      }
                    }}
                    value={editDueDate ? displayDate(editDueDate).replace('—', '') : ''}
                    onChange={(e) => setEditDueDate(inputDate(e.target.value) || '')}
                    placeholder="dd/mm/yyyy"
                    className="w-full rounded-[8px] border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 sm:col-span-2">
                  {t('tasks.quantity')}
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={checklistQuantity > 0 ? checklistQuantity : editTaskQuantity}
                    onChange={event => setEditTaskQuantity(event.target.value)}
                    disabled={checklistQuantity > 0}
                    placeholder="0"
                    className="mt-1.5 w-full rounded-[8px] border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500"
                  />
                </label>
              </div>
              <div className="flex justify-end"><button type="button" disabled={saving || !editTitle.trim()} onClick={() => void saveTaskDetails()} className="inline-flex min-h-10 items-center gap-2 rounded-[8px] bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? (lang === 'en' ? 'Saving…' : 'Đang lưu…') : (lang === 'en' ? 'Save task' : 'Lưu task')}</button></div>
            </section>
          ) : (
            <section className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-[8px] border border-gray-200 dark:border-slate-700"><div className="min-w-0"><p className="text-xs text-gray-500 uppercase mb-2"><User className="w-3.5 h-3.5 inline mr-1" />{t('common.assignee')}</p>{task.assignee ? <div className="flex items-center gap-2"><Avatar name={task.assignee.name} src={task.assignee.avatar_url || undefined} /><b className="text-sm">{task.assignee.name}</b></div> : <span className="text-sm text-gray-500">{t('common.unassigned')}</span>}</div><div className="min-w-0"><p className="text-xs text-gray-500 uppercase mb-2"><Calendar className="w-3.5 h-3.5 inline mr-1" />{task.start_date ? t('common.timeline') : t('common.dueDate')}</p>{task.start_date ? <div className="text-sm flex items-center gap-1.5 flex-wrap"><span className="font-normal text-gray-700 dark:text-gray-300">{displayDate(task.start_date)}</span><span className="text-gray-400">–</span><span className="font-bold text-red-600 dark:text-red-400">{task.due_date ? displayDate(task.due_date) : t('common.noDueDate')}</span></div> : <b className="text-sm font-bold text-red-600 dark:text-red-400">{task.due_date ? displayDate(task.due_date) : t('common.noDueDate')}</b>}</div><div className="min-w-0"><p className="text-xs text-gray-500 uppercase mb-2">{t('tasks.col.projectCampaign')}</p>{task.project?.name ? <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800 max-w-full"><span className="truncate">{task.project.name}</span></span> : task.campaign?.name ? <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 max-w-full"><span className="truncate">{task.campaign.name}</span></span> : <b className="text-sm text-gray-400">{t('common.unlinked')}</b>}</div><div className="min-w-0"><p className="text-xs text-gray-500 uppercase mb-2">{t('common.department')}</p><b className="text-sm">{task.department?.name || 'N/A'}</b></div></section>
          )}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{displayDateTime(task.created_at)}</span>
            {task.created_at && task.updated_at && new Date(task.updated_at).getTime() > new Date(task.created_at).getTime() + 1000 && <span>· {lang === 'en' ? 'Edited' : 'Đã chỉnh sửa'}</span>}
          </p>

          {/* CHECKLIST / ĐẦU VIỆC */}
          <section className="space-y-3">
            {(() => {
              const total = checklistItems.length;
              const done = checklistItems.filter(i => i.completed).length;
              const open = total - done;
              return (
                <div className="grid grid-flow-col justify-between items-center mb-3">
                  <button
                    type="button"
                    onClick={() => setChecklistCollapsed(v => !v)}
                    className="grid grid-flow-col auto-cols-max items-center gap-2 font-bold text-sm text-gray-900 dark:text-white hover:text-primary transition-colors cursor-pointer select-none"
                    aria-expanded={!checklistCollapsed}
                    title={checklistCollapsed ? (lang === 'en' ? 'Expand subtasks' : 'Mở rộng subtask') : (lang === 'en' ? 'Collapse subtasks' : 'Thu gọn subtask')}
                  >
                    <ListTodo size={16} className="text-sky-600 dark:text-sky-400" />
                    <span>Subtask</span>
                    {done > 0 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-[6px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {done} {lang === 'en' ? 'completed' : 'hoàn thành'}
                      </span>
                    )}
                    {open > 0 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-[6px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {open} {lang === 'en' ? 'in progress' : 'chưa hoàn thành'}
                      </span>
                    )}
                    <ChevronDown size={15} className={`text-gray-400 transition-transform duration-200 ${checklistCollapsed ? '-rotate-90' : ''}`} />
                  </button>
                </div>
              );
            })()}

            {!checklistCollapsed && (
              <>

            {/* Checklist Items List */}
            {checklistItems.length > 0 ? (
              <div className="space-y-2">
                {checklistItems.map(item => (
                  <div
                    key={item.id}
                    id={`checklist-item-${item.id}`}
                    className="p-3 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-gray-100/60 dark:hover:bg-slate-800/70 transition-all group relative space-y-2 text-sm min-w-0 overflow-hidden"
                  >
                    {/* Hover action buttons in top-right */}
                    {canAddChecklistItem && !readOnly && editingItemId !== item.id && (
                      <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity grid grid-flow-col auto-cols-max items-center gap-1 z-10">
                        <button
                          type="button"
                          onClick={() => handleStartEditChecklistItem(item)}
                          title={lang === 'en' ? 'Edit item' : 'Chỉnh sửa'}
                          aria-label={lang === 'en' ? 'Edit item' : 'Chỉnh sửa'}
                          className="p-1 rounded-[6px] text-gray-400 hover:text-primary hover:bg-gray-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteChecklistItem(item.id)}
                          title={lang === 'en' ? 'Delete item' : 'Xóa'}
                          aria-label={lang === 'en' ? 'Delete item' : 'Xóa'}
                          className="p-1 rounded-[6px] text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}

                    {/* Inline edit form if active */}
                    {editingItemId === item.id ? (
                      <div className="space-y-3 pt-1">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {lang === 'en' ? 'Subtask Title' : 'Tên subtask'} <span className="text-red-500">*</span>
                          <input
                            type="text"
                            value={editItemTitle}
                            onChange={(e) => setEditItemTitle(e.target.value)}
                            maxLength={500}
                            className="mt-1 w-full rounded-[8px] border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:border-primary"
                            autoFocus
                          />
                        </label>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {lang === 'en' ? 'Description / Brief' : 'Mô tả / Brief nội dung'}
                          <textarea
                            value={editItemDescription}
                            onChange={(e) => setEditItemDescription(e.target.value)}
                            rows={2}
                            className="mt-1 w-full rounded-[8px] border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:border-primary resize-none"
                          />
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {t('common.priority')}
                            <select
                              value={editItemPriority}
                              onChange={(e) => setEditItemPriority(e.target.value as any)}
                              className="mt-1 w-full rounded-[8px] border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:border-primary lowercase cursor-pointer"
                            >
                              <option value="low">{t('common.low').toLowerCase()}</option>
                              <option value="medium">{t('common.medium').toLowerCase()}</option>
                              <option value="high">{t('common.high').toLowerCase()}</option>
                              <option value="urgent">{t('common.urgent').toLowerCase()}</option>
                            </select>
                          </label>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {t('tasks.quantity')}
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={editItemQuantity}
                              onChange={(e) => setEditItemQuantity(e.target.value)}
                              placeholder="0"
                              className="mt-1 w-full rounded-[8px] border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:border-primary"
                            />
                          </label>
                          <div className="tw-calendar-picker relative">
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                              {lang === 'en' ? 'Due date' : 'Hạn chót'}
                            </label>
                            <input
                              type="text"
                              id={`task-edit-item-due-${item.id}`}
                              readOnly
                              onClick={(e) => {
                                const parentDue = (task.project?.due_date || task.campaign?.due_date || task.campaign?.end_date)?.slice(0, 10);
                                if ((window as any).openCalendar) {
                                  (window as any).openCalendar({
                                    displayId: `task-edit-item-due-${item.id}`,
                                    mode: 'single',
                                    maxDate: parentDue || undefined,
                                  }, e);
                                }
                              }}
                              value={editItemDueDate ? displayDate(editItemDueDate).replace('—', '') : ''}
                              onChange={(e) => setEditItemDueDate(inputDate(e.target.value) || '')}
                              placeholder="dd/mm/yyyy"
                              className="w-full rounded-[8px] border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                        </div>
                        {Boolean(editItemDueDate && (!task.due_date || editItemDueDate > task.due_date.slice(0, 10))) && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
                            ⚡ {lang === 'en'
                              ? `This deadline extends beyond task deadline (${displayDate(task.due_date)}). Task deadline will be automatically extended to ${displayDate(editItemDueDate)}.`
                              : `Hạn chót này dài hơn hạn chót task (${displayDate(task.due_date)}). Hạn chót của task sẽ tự động được kéo dài đến ${displayDate(editItemDueDate)} khi lưu.`}
                          </p>
                        )}
                        <div className="grid grid-flow-col auto-cols-max justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleCancelEditChecklistItem}
                            className="px-3 py-1.5 text-xs rounded-[6px] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 cursor-pointer"
                          >
                            {t('common.cancel')}
                          </button>
                          <button
                            type="button"
                            disabled={savingItem || !editItemTitle.trim()}
                            onClick={() => void handleSaveEditChecklistItem(item.id)}
                            className="px-3.5 py-1.5 text-xs font-semibold rounded-[6px] bg-[#002e6d] text-white hover:bg-[#002150] disabled:opacity-50 cursor-pointer shadow-sm"
                          >
                            {savingItem ? (lang === 'en' ? 'Saving…' : 'Đang lưu…') : (lang === 'en' ? 'Save' : 'Lưu')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-[auto_1fr] items-start gap-2.5 min-h-[32px] select-text pr-14">
                          <button
                            type="button"
                            disabled={readOnly || !canEdit}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleToggleChecklistItem(item.id);
                            }}
                            className={`w-5 h-5 rounded-full grid place-items-center transition-colors cursor-pointer mt-0.5 shrink-0 ${
                              item.completed
                                ? 'bg-emerald-500 border border-emerald-500 text-white hover:bg-emerald-600'
                                : 'border-2 border-gray-300 dark:border-slate-600 hover:border-emerald-500 text-transparent hover:text-emerald-500 bg-transparent'
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                            title={item.completed ? (lang === 'en' ? 'Reopen' : 'Mở lại') : (lang === 'en' ? 'Mark complete' : 'Hoàn thành')}
                            aria-label={item.completed ? (lang === 'en' ? 'Reopen' : 'Mở lại') : (lang === 'en' ? 'Mark complete' : 'Hoàn thành')}
                          >
                            <Check size={11} strokeWidth={3} className={item.completed ? 'block' : 'opacity-0 hover:opacity-100'} />
                          </button>
                          <div className="min-w-0">
                            <span className={`text-xs block font-medium break-words line-clamp-2 ${item.completed ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-900 dark:text-gray-100'}`}>
                              {item.title}
                            </span>
                            <div className="grid grid-flow-col auto-cols-max items-center gap-2 mt-1 overflow-x-auto scrollbar-none">
                              <span className={`px-2 py-0.5 rounded-[6px] text-[11px] font-semibold lowercase ${priorityClass((item.priority as any) || 'medium')}`}>
                                {t(`common.${item.priority || 'medium'}` as any).toLowerCase()}
                              </span>
                              {Boolean(item.quantity) && (
                                <span className="px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                  SL: {item.quantity}
                                </span>
                              )}
                              {item.due_date && (
                                <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[6px] border border-red-200/80 dark:border-red-800/60 bg-red-50/80 text-red-600 dark:bg-red-950/30 dark:text-red-400">
                                  <Calendar size={11} /> {displayDate(item.due_date)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-gray-600 dark:text-gray-300 bg-white/70 dark:bg-slate-900/50 p-2 rounded-[6px] border border-gray-100 dark:border-slate-700/60 leading-relaxed whitespace-pre-wrap break-words min-w-0">
                            {item.description}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              !showAddItemForm && (
                <div className="rounded-[8px] border border-dashed border-gray-200 dark:border-slate-700 p-3 text-center text-xs text-gray-400 dark:text-slate-500">
                  {lang === 'en'
                    ? 'No subtasks yet. Click "Add Subtask" to assign work.'
                    : 'Chưa có subtask nào. Bấm "Thêm Subtask" để giao thêm việc.'}
                </div>
              )
            )}

            {/* Trigger button: full-width dashed button matching Projects.tsx */}
            {canAddChecklistItem && !readOnly && !showAddItemForm && (
              <button
                type="button"
                onClick={() => setShowAddItemForm(true)}
                className="mt-3 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-[8px] transition-colors border border-primary/20 w-full text-center border-dashed cursor-pointer"
              >
                <Plus size={16} className="inline mr-1" />
                <span>{lang === 'en' ? '+ Add Subtask' : '+ Thêm Subtask'}</span>
              </button>
            )}

            {/* Form thêm đầu việc */}
            {showAddItemForm && (
              <div className="mt-3 p-3.5 bg-gray-50 dark:bg-[#0a192f] rounded-[8px] border border-gray-200 dark:border-slate-700/80 space-y-3 animate-in fade-in duration-150">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {lang === 'en' ? 'Subtask Title' : 'Tên subtask'} <span className="text-red-500">*</span>
                  <input
                    type="text"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    placeholder={lang === 'en' ? 'Enter subtask title...' : 'Nhập tên subtask cần giao...'}
                    maxLength={500}
                    className="mt-1 w-full rounded-[8px] border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-[#071325] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:outline-none focus:ring-0 focus:border-[#002e6d] dark:focus:border-primary/60"
                    autoFocus
                  />
                </label>

                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {lang === 'en' ? 'Description / Brief' : 'Mô tả / Brief nội dung'}
                  <textarea
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    placeholder={lang === 'en' ? 'Brief description or requirements...' : 'Mô tả tóm tắt nội dung yêu cầu...'}
                    rows={2}
                    className="mt-1 w-full rounded-[8px] border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-[#071325] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:outline-none focus:ring-0 focus:border-[#002e6d] dark:focus:border-primary/60 resize-none"
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t('common.priority')}
                    <select
                      value={newItemPriority}
                      onChange={(e) => setNewItemPriority(e.target.value as any)}
                      className="mt-1 w-full rounded-[8px] border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-[#071325] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:outline-none focus:ring-0 focus:border-[#002e6d] dark:focus:border-primary/60 lowercase cursor-pointer"
                    >
                      <option value="low">{t('common.low').toLowerCase()}</option>
                      <option value="medium">{t('common.medium').toLowerCase()}</option>
                      <option value="high">{t('common.high').toLowerCase()}</option>
                      <option value="urgent">{t('common.urgent').toLowerCase()}</option>
                    </select>
                  </label>

                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t('tasks.quantity')}
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(e.target.value)}
                      placeholder="0"
                      className="mt-1 w-full rounded-[8px] border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-[#071325] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:outline-none focus:ring-0 focus:border-[#002e6d] dark:focus:border-primary/60"
                    />
                  </label>

                  <div className="tw-calendar-picker relative">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {lang === 'en' ? 'Due date' : 'Hạn chót'}
                    </label>
                    <input
                      type="text"
                      id={`task-new-item-due-${task.id}`}
                      readOnly
                      onClick={(e) => {
                        const parentDue = (task.project?.due_date || task.campaign?.due_date || task.campaign?.end_date)?.slice(0, 10);
                        if ((window as any).openCalendar) {
                          (window as any).openCalendar({
                            displayId: `task-new-item-due-${task.id}`,
                            mode: 'single',
                            maxDate: parentDue || undefined,
                          }, e);
                        }
                      }}
                      value={newItemDueDate ? displayDate(newItemDueDate).replace('—', '') : ''}
                      onChange={(e) => setNewItemDueDate(inputDate(e.target.value) || '')}
                      placeholder="dd/mm/yyyy"
                      className="w-full rounded-[8px] border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-[#071325] px-3 py-2 text-sm text-gray-900 dark:text-white cursor-pointer shadow-sm outline-none focus:outline-none focus:ring-0 focus:border-[#002e6d] dark:focus:border-primary/60"
                    />
                  </div>
                </div>

                {Boolean(newItemDueDate && (!task.due_date || newItemDueDate > task.due_date.slice(0, 10))) && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
                    ⚡ {lang === 'en'
                      ? `This deadline extends beyond task deadline (${displayDate(task.due_date)}). Task deadline will be automatically extended to ${displayDate(newItemDueDate)}.`
                      : `Hạn chót này dài hơn hạn chót task (${displayDate(task.due_date)}). Hạn chót của task sẽ tự động được kéo dài đến ${displayDate(newItemDueDate)} khi lưu.`}
                  </p>
                )}

                <div className="grid grid-flow-col auto-cols-max justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddItemForm(false);
                      setNewItemTitle('');
                      setNewItemDescription('');
                      setNewItemPriority('medium');
                      setNewItemQuantity('');
                      setNewItemDueDate('');
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-[6px] bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    disabled={addingItem || !newItemTitle.trim()}
                    onClick={() => void handleAddChecklistItem()}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-[6px] bg-[#002e6d] text-white hover:bg-[#002150] disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
                  >
                    {addingItem ? (lang === 'en' ? 'Adding…' : 'Đang thêm…') : (lang === 'en' ? 'Add' : 'Thêm')}
                  </button>
                </div>
              </div>
            )}
              </>
            )}
          </section>
          <section>
            <div className="grid grid-flow-col auto-cols-max items-center gap-2 mb-2">
              <p className="text-sm font-bold grid grid-flow-col auto-cols-max items-center gap-2">
                <AlignLeft className="w-4 h-4" />
                <span>{t('common.description')}</span>
              </p>
              {canEdit && !readOnly && !editingDescription && (
                <button
                  type="button"
                  onClick={() => setEditingDescription(true)}
                  className="p-1 rounded-[6px] text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800/60 transition-colors border-0 shadow-none grid place-items-center cursor-pointer"
                  title={lang === 'en' ? 'Edit description' : 'Chỉnh sửa mô tả'}
                  aria-label={lang === 'en' ? 'Edit description' : 'Chỉnh sửa mô tả'}
                >
                  <Edit3 size={14} />
                </button>
              )}
            </div>
            {editingDescription && !readOnly ? (
              <TaskDescriptionEditor
                value={description}
                onChange={setDescription}
                onSave={saveDescription}
                onCancel={() => {
                  setDescription(task.description || '');
                  setEditingDescription(false);
                }}
                saving={saving}
                placeholder={t('tasks.descPlaceholder')}
                autoFocus
              />
            ) : (
              <TaskDescriptionViewer description={description} />
            )}
          </section>
          <TaskComments key={`${profileId}:task:${task.id}`} target={{kind:'task',id:task.id}} people={mentionPeople} collaboratorIds={taskCollaborators} allowMobileEditing focusRequest={commentsFocusToken || commentFocus ? `${commentsFocusToken}:${commentFocus}` : undefined} onSent={async (_body,mentions) => { onTaskUpdated?.(); await notifyTaskParticipants(task, {id:profileId,name:profile?.name,department_id:profile?.department_id}, 'task_comment',mentions); }} onDeleted={() => { onTaskUpdated?.(); }}/>

        </div>}
      </div>
    </>
  );
};
