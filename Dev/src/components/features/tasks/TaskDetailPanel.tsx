import {useReadEntityNotifications} from '../../../hooks/useReadEntityNotifications';
import {useTaskDetailVisibility} from '../../../hooks/useTaskDetailVisibility';
import React, { useEffect, useState } from 'react';
import { X, Clock, User, Calendar, AlignLeft, Edit3, Save, ListTodo, Plus, Trash2 } from 'lucide-react';
import { TaskComments } from '../comments/TaskComments';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { notifyTaskParticipants } from '../../../services/taskNotifications';
import { Avatar } from '../../common/Avatar';
import { useTranslation } from '../../../i18n/translations';
import toast from 'react-hot-toast';
import {useMobileReadOnly} from '../../../hooks/useMobileReadOnly';
import { TaskPinButton } from './TaskPinButton';
import { TaskActivityLogPopover } from './TaskActivityLogPopover';
import { logTaskActivity } from '../../../services/taskActivityLogger';
import { displayDate, inputDate } from '../../../lib/workflowHub';
import { WorkflowStatusPicker, canonicalWorkflowStatus, type WorkflowTaskStatus } from './WorkflowStatusPicker';
import { TaskDescriptionViewer } from './TaskDescriptionViewer';
import { TaskDescriptionEditor } from './TaskDescriptionEditor';
import { canCompleteTrackedTask, completeTrackedTask, updateTrackedTask } from '../../../services/workspaceTasks';
import { EntityActionBadges } from '../projects/EntityActionBadges';
import { saveTaskDeliverables, fetchTaskDeliverableMeta, setCachedDeliverable, type DeliverableChecklistItem } from '../../../lib/taskDeliverables';
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
  assignablePeople?: { id: number; name: string; avatar_url?: string | null }[];
}

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({ task, isOpen, onClose, onTaskUpdated, floating = false, embedded = false, commentsFocusToken = 0, assignablePeople }) => {
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
  const checklistQuantity = checklistItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  const totalChecklistQuantity = checklistQuantity > 0 ? checklistQuantity : (Number(taskQuantity) || 0);
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
    const meta = await fetchTaskDeliverableMeta('task', taskId);
    const detailsResult = await supabase.from('activity_log').select('metadata').eq('entity_type', 'task').eq('entity_id', String(taskId)).eq('action', 'details_updated').order('created_at', { ascending: false }).limit(1);
    const details = detailsResult.data?.[0]?.metadata || {};
    const loadedChecklist = Array.isArray(details.checklist_items) ? details.checklist_items : (meta?.checklist_items || []);
    const chkQty = loadedChecklist.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0);

    let rawBase: string = '';
    if ((task as any)?.quantity != null && (task as any)?.quantity !== '') {
      rawBase = String((task as any).quantity);
    } else if (meta?.base_quantity != null) {
      rawBase = String(meta.base_quantity);
    } else if (details.base_quantity != null) {
      rawBase = String(details.base_quantity);
    } else if (chkQty === 0) {
      if (meta?.quantity != null) rawBase = String(meta.quantity);
      else if (details.quantity != null) rawBase = String(details.quantity);
    }
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
        void reload();
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
    void reload();
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

      const nextItems = [...checklistItems, newItem];
      const nextChecklistQuantity = nextItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
      const baseQuantityValue = Number(taskQuantity) || null;
      const effectiveQuantity = nextChecklistQuantity > 0 ? nextChecklistQuantity : baseQuantityValue;

      await supabase.from('activity_log').insert({
        workspace_id: task.workspace_id,
        user_id: profileId,
        action: 'details_updated',
        entity_type: 'task',
        entity_id: String(task.id),
        metadata: {
          description: task.description || description,
          checklist_items: nextItems,
          quantity: effectiveQuantity,
          base_quantity: baseQuantityValue,
          target_department_id: targetDepartmentId,
          target_department_name: targetDepartmentName,
          is_internal_detail_sync: true,
        },
      });

      setCachedDeliverable(`task:${task.id}`, {
        description: task.description || description,
        checklist_items: nextItems,
        quantity: effectiveQuantity,
        base_quantity: baseQuantityValue,
        target_department_id: targetDepartmentId,
        target_department_name: targetDepartmentName,
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
    const nextItems = checklistItems.map(i => i.id === itemId ? { ...i, completed: nextCompleted } : i);
    const nextChecklistQuantity = nextItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
    const baseQuantityValue = Number(taskQuantity) || null;
    const effectiveQuantity = nextChecklistQuantity > 0 ? nextChecklistQuantity : baseQuantityValue;

    setChecklistItems(nextItems);
    try {
      await supabase.from('activity_log').insert({
        workspace_id: task.workspace_id,
        user_id: profileId,
        action: 'details_updated',
        entity_type: 'task',
        entity_id: String(task.id),
        metadata: {
          description: task.description || description,
          checklist_items: nextItems,
          quantity: effectiveQuantity,
          base_quantity: baseQuantityValue,
          target_department_id: targetDepartmentId,
          target_department_name: targetDepartmentName,
          is_internal_detail_sync: true,
        },
      });
      setCachedDeliverable(`task:${task.id}`, {
        description: task.description || description,
        checklist_items: nextItems,
        quantity: effectiveQuantity,
        base_quantity: baseQuantityValue,
        target_department_id: targetDepartmentId,
        target_department_name: targetDepartmentName,
      });

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
      console.warn('Failed to update checklist item state', err);
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!task || !profileId) return;
    const targetItem = checklistItems.find(i => i.id === itemId);
    if (!targetItem) return;
    const nextItems = checklistItems.filter(i => i.id !== itemId);
    const nextChecklistQuantity = nextItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
    const baseQuantityValue = Number(taskQuantity) || null;
    const effectiveQuantity = nextChecklistQuantity > 0 ? nextChecklistQuantity : baseQuantityValue;

    setChecklistItems(nextItems);
    try {
      await supabase.from('activity_log').insert({
        workspace_id: task.workspace_id,
        user_id: profileId,
        action: 'details_updated',
        entity_type: 'task',
        entity_id: String(task.id),
        metadata: {
          description: task.description || description,
          checklist_items: nextItems,
          quantity: effectiveQuantity,
          base_quantity: baseQuantityValue,
          target_department_id: targetDepartmentId,
          target_department_name: targetDepartmentName,
          is_internal_detail_sync: true,
        },
      });
      setCachedDeliverable(`task:${task.id}`, {
        description: task.description || description,
        checklist_items: nextItems,
        quantity: effectiveQuantity,
        base_quantity: baseQuantityValue,
        target_department_id: targetDepartmentId,
        target_department_name: targetDepartmentName,
      });

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
      console.warn('Failed to delete checklist item', err);
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
      const effectiveQuantity = nextChecklistQuantity > 0 ? nextChecklistQuantity : baseQuantityValue;

      await supabase.from('activity_log').insert({
        workspace_id: task.workspace_id,
        user_id: profileId,
        action: 'details_updated',
        entity_type: 'task',
        entity_id: String(task.id),
        metadata: {
          description: task.description || description,
          checklist_items: nextItems,
          quantity: effectiveQuantity,
          base_quantity: baseQuantityValue,
          target_department_id: targetDepartmentId,
          target_department_name: targetDepartmentName,
          is_internal_detail_sync: true,
        },
      });
      setCachedDeliverable(`task:${task.id}`, {
        description: task.description || description,
        checklist_items: nextItems,
        quantity: effectiveQuantity,
        base_quantity: baseQuantityValue,
        target_department_id: targetDepartmentId,
        target_department_name: targetDepartmentName,
      });

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
    const effectiveQuantity = checklistQuantity > 0
      ? checklistQuantity
      : baseQuantityValue;

    await saveTaskDeliverables(
      'task',
      task.id,
      {
        quantity: effectiveQuantity,
        base_quantity: baseQuantityValue,
        checklist_items: checklistItems,
        description: task.description || description,
        target_department_id: targetDepartmentId,
        target_department_name: targetDepartmentName,
      },
      profileId,
      task.workspace_id,
    );
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
        inert={!isOpen} 
        aria-hidden={!isOpen} 
        style={{ '--task-panel-width': `${width}px` } as React.CSSProperties}
        className={embedded ? 'flex flex-col h-full min-h-0 w-full bg-white dark:bg-slate-800' : `dashboard-detail-drawer bg-white dark:bg-slate-800 shrink-0 ${isOpen ? 'w-full max-w-full xl:max-w-[calc(100vw-32px)] xl:w-[var(--task-panel-width)] xl:max-w-[min(var(--task-panel-width),50vw)] shadow-drawer-task border border-blue-500/20 opacity-100 pointer-events-auto drawer-slide-in' : 'w-0 min-w-0 shadow-none border-0 opacity-0 pointer-events-none'} ${floating ? 'z-[110]' : 'z-[70]'} ${!resizing ? 'transition-[width,opacity] duration-300 ease-out' : ''}`}
      >
        {isOpen && !embedded && <div onMouseDown={() => setResizing(true)} className="hidden xl:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <div><span className="text-xs font-semibold px-3 py-1.5 rounded-lg uppercase tracking-wider border border-gray-200 dark:border-slate-700">{task?.task_ref || 'TASK'}</span><span className="ml-2 text-xs capitalize text-gray-500">{task?.priority || 'medium'} {t('common.priority').toLowerCase()}</span></div>
          <div className="flex items-center gap-1"><TaskActivityLogPopover entityType="task" entityId={task?.id} workspaceId={task?.workspace_id} /><TaskPinButton taskId={task?.id} /><button aria-label={t('common.closeTaskDetail')} onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400"><X className="w-5 h-5" /></button></div>
        </div>
        {task && <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-6 md:px-8 space-y-7">
<section>
            <div className="grid grid-cols-[1fr_auto] items-start gap-3">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">{task.title}</h2>
              {canEdit && !readOnly && (
                <button
                  type="button"
                  onClick={() => setEditingTask(value => !value)}
                  className="inline-grid grid-flow-col auto-cols-max shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5 dark:border-slate-700 min-h-[44px] sm:min-h-0"
                  aria-expanded={editingTask}
                >
                  <Edit3 className="h-3.5 w-3.5" />{editingTask ? (lang === 'en' ? 'Cancel edit' : 'Hủy sửa') : t('common.edit')}
                </button>
              )}
            </div>
            <div className="mt-4">
              <EntityActionBadges
                priority={task.priority || 'medium'}
                status={task.status || 'planning'}
                onPriorityChange={canEdit && !readOnly ? handleTaskPriorityChange : undefined}
                onStatusChange={canEdit && !readOnly ? handleTaskStatusChange : undefined}
                canManage={canEdit && !readOnly}
              >
                {totalChecklistQuantity > 0 && (
                  <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-2xs">
                    {lang === 'en' ? 'Total Qty' : 'Tổng số lượng'}: {totalChecklistQuantity}
                  </span>
                )}
                {Boolean(targetDepartmentName || (task as any).target_department_name) && (
                  <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-2xs">
                    → {targetDepartmentName || (task as any).target_department_name}
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
            <section className="space-y-4 rounded-2xl border border-primary/20 bg-gray-50 p-4 dark:bg-slate-800/50">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">{lang === 'en' ? 'Task title' : 'Tiêu đề task'}
                <input value={editTitle} onChange={event => setEditTitle(event.target.value)} maxLength={500} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">{t('common.assignee')}
                  <select value={editAssigneeId} onChange={event => setEditAssigneeId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    <option value="">{t('common.unassigned')}</option>
                    {(assignablePeople || mentionPeople).map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
                    {task.assignee_id != null && task.assignee?.name && !(assignablePeople || mentionPeople).some(person => String(person.id) === String(task.assignee_id)) && <option value={task.assignee_id}>{task.assignee.name}</option>}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">{t('common.priority')}
                  <select value={editPriority} onChange={event => setEditPriority(event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
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
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500"
                  />
                </label>
              </div>
              <div className="flex justify-end"><button type="button" disabled={saving || !editTitle.trim()} onClick={() => void saveTaskDetails()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? (lang === 'en' ? 'Saving…' : 'Đang lưu…') : (lang === 'en' ? 'Save task' : 'Lưu task')}</button></div>
            </section>
          ) : (
            <section className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-200 dark:border-slate-700"><div className="min-w-0"><p className="text-xs text-gray-500 uppercase mb-2"><User className="w-3.5 h-3.5 inline mr-1" />{t('common.assignee')}</p>{task.assignee ? <div className="flex items-center gap-2"><Avatar name={task.assignee.name} src={task.assignee.avatar_url || undefined} /><b className="text-sm">{task.assignee.name}</b></div> : <span className="text-sm text-gray-500">{t('common.unassigned')}</span>}</div><div className="min-w-0"><p className="text-xs text-gray-500 uppercase mb-2"><Calendar className="w-3.5 h-3.5 inline mr-1" />{task.start_date ? t('common.timeline') : t('common.dueDate')}</p>{task.start_date ? <div className="text-sm flex items-center gap-1.5 flex-wrap"><span className="font-normal text-gray-700 dark:text-gray-300">{new Date(task.start_date).toLocaleDateString('vi-VN')}</span><span className="text-gray-400">–</span><span className="font-bold text-red-600 dark:text-red-400">{task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : t('common.noDueDate')}</span></div> : <b className="text-sm font-bold text-red-600 dark:text-red-400">{task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : t('common.noDueDate')}</b>}</div><div className="min-w-0"><p className="text-xs text-gray-500 uppercase mb-2">{t('tasks.col.projectCampaign')}</p>{task.project?.name ? <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800 max-w-full"><span className="truncate">{task.project.name}</span></span> : task.campaign?.name ? <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 max-w-full"><span className="truncate">{task.campaign.name}</span></span> : <b className="text-sm text-gray-400">{t('common.unlinked')}</b>}</div><div className="min-w-0"><p className="text-xs text-gray-500 uppercase mb-2">{t('common.department')}</p><b className="text-sm">{task.department?.name || 'N/A'}</b></div></section>
          )}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{task.created_at ? new Date(task.created_at).toLocaleString(lang === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</span>
            {task.created_at && task.updated_at && new Date(task.updated_at).getTime() > new Date(task.created_at).getTime() + 1000 && <span>· {lang === 'en' ? 'Edited' : 'Đã chỉnh sửa'}</span>}
          </p>

          {/* CHECKLIST / ĐẦU VIỆC */}
          <section className="space-y-3">
            <div className="grid grid-flow-col auto-cols-max items-center gap-2">
              {(() => {
                const done = checklistItems.filter(i => i.completed).length;
                const total = checklistItems.length;
                const isAllDone = done === total && total > 0;
                return (
                  <>
                    <ListTodo className={`w-4 h-4 ${isAllDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'}`} />
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      {lang === 'en' ? 'Checklist' : 'Việc phát sinh'}
                    </h3>
                    {total > 0 && (
                      <span
                        title={lang === 'en' ? `Checklist: ${done}/${total} completed` : `Việc phát sinh: ${done}/${total} hoàn thành`}
                        className={`inline-grid grid-flow-col auto-cols-max items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border ${
                          isAllDone
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60'
                            : 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-800/60'
                        }`}
                      >
                        <span>{done}/{total}</span>
                      </span>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Checklist Items List */}
            {checklistItems.length > 0 ? (
              <div className="space-y-2">
                {checklistItems.map(item => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-gray-100/60 dark:hover:bg-slate-800/70 transition-all group relative space-y-2 text-sm min-w-0 overflow-hidden"
                  >
                    {/* Hover action buttons in top-right */}
                    {canAddChecklistItem && !readOnly && editingItemId !== item.id && (
                      <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity grid grid-flow-col auto-cols-max items-center gap-1 z-10">
                        <button
                          type="button"
                          onClick={() => handleStartEditChecklistItem(item)}
                          title={lang === 'en' ? 'Edit item' : 'Chỉnh sửa'}
                          aria-label={lang === 'en' ? 'Edit item' : 'Chỉnh sửa'}
                          className="p-1 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteChecklistItem(item.id)}
                          title={lang === 'en' ? 'Delete item' : 'Xóa'}
                          aria-label={lang === 'en' ? 'Delete item' : 'Xóa'}
                          className="p-1 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}

                    {/* Inline edit form if active */}
                    {editingItemId === item.id ? (
                      <div className="space-y-3 pt-1">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {lang === 'en' ? 'Checklist Item Title' : 'Tên đầu việc'} <span className="text-red-500">*</span>
                          <input
                            type="text"
                            value={editItemTitle}
                            onChange={(e) => setEditItemTitle(e.target.value)}
                            maxLength={500}
                            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:border-primary"
                            autoFocus
                          />
                        </label>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {lang === 'en' ? 'Description / Brief' : 'Mô tả / Brief nội dung'}
                          <textarea
                            value={editItemDescription}
                            onChange={(e) => setEditItemDescription(e.target.value)}
                            rows={2}
                            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:border-primary resize-none"
                          />
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {t('common.priority')}
                            <select
                              value={editItemPriority}
                              onChange={(e) => setEditItemPriority(e.target.value as any)}
                              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:border-primary lowercase cursor-pointer"
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
                              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:border-primary"
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
                              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                            className="px-3 py-1.5 text-xs rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 cursor-pointer"
                          >
                            {t('common.cancel')}
                          </button>
                          <button
                            type="button"
                            disabled={savingItem || !editItemTitle.trim()}
                            onClick={() => void handleSaveEditChecklistItem(item.id)}
                            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#002e6d] text-white hover:bg-[#002150] disabled:opacity-50 cursor-pointer shadow-sm"
                          >
                            {savingItem ? (lang === 'en' ? 'Saving…' : 'Đang lưu…') : (lang === 'en' ? 'Save' : 'Lưu')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <label className="grid grid-cols-[auto_1fr] items-start gap-2.5 cursor-pointer min-h-[32px] select-none pr-14">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            disabled={readOnly || !canEdit}
                            onChange={() => void handleToggleChecklistItem(item.id)}
                            className="mt-0.5 w-4 h-4 rounded text-primary border-gray-300 dark:border-slate-600 focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div className="min-w-0">
                            <span className={`text-xs block font-medium break-words line-clamp-2 ${item.completed ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-900 dark:text-gray-100'}`}>
                              {item.title}
                            </span>
                            <div className="grid grid-flow-col auto-cols-max items-center gap-2 mt-1 overflow-x-auto scrollbar-none">
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold lowercase ${priorityClass((item.priority as any) || 'medium')}`}>
                                {t(`common.${item.priority || 'medium'}` as any).toLowerCase()}
                              </span>
                              {Boolean(item.quantity) && (
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                  SL: {item.quantity}
                                </span>
                              )}
                              {item.due_date && (
                                <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                                  <Calendar size={11} /> {displayDate(item.due_date)}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                        {item.description && (
                          <p className="text-[11px] text-gray-600 dark:text-gray-300 bg-white/70 dark:bg-slate-900/50 p-2 rounded-lg border border-gray-100 dark:border-slate-700/60 leading-relaxed whitespace-pre-wrap break-words min-w-0">
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
                <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-700 p-3 text-center text-xs text-gray-400 dark:text-slate-500">
                  {lang === 'en'
                    ? `No checklist items yet. ${canAddChecklistItem ? 'Click "Add item" to assign work.' : ''}`
                    : `Chưa có việc phát sinh nào. ${canAddChecklistItem ? 'Bấm "Thêm việc phát sinh" để giao thêm việc.' : ''}`}
                </div>
              )
            )}

            {/* Trigger button: full-width dashed button matching Projects.tsx */}
            {canAddChecklistItem && !readOnly && !showAddItemForm && (
              <button
                type="button"
                onClick={() => setShowAddItemForm(true)}
                className="mt-3 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20 w-full text-center border-dashed cursor-pointer"
              >
                <Plus size={16} className="inline mr-1" />
                <span>{lang === 'en' ? 'Add item' : 'Thêm việc phát sinh'}</span>
              </button>
            )}

            {/* Form thêm đầu việc */}
            {showAddItemForm && (
              <div className="mt-3 p-3.5 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3 animate-in fade-in duration-150">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {lang === 'en' ? 'Checklist Item Title' : 'Tên đầu việc'} <span className="text-red-500">*</span>
                  <input
                    type="text"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    placeholder={lang === 'en' ? 'Enter item title...' : 'Nhập tên đầu việc cần giao...'}
                    maxLength={500}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:border-primary"
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
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:border-primary resize-none"
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t('common.priority')}
                    <select
                      value={newItemPriority}
                      onChange={(e) => setNewItemPriority(e.target.value as any)}
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:border-primary lowercase cursor-pointer"
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
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:border-primary"
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
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                    className="px-3 py-1.5 text-xs rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    disabled={addingItem || !newItemTitle.trim()}
                    onClick={() => void handleAddChecklistItem()}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#002e6d] text-white hover:bg-[#002150] disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {addingItem ? (lang === 'en' ? 'Adding…' : 'Đang thêm…') : (lang === 'en' ? 'Add' : 'Thêm')}
                  </button>
                </div>
              </div>
            )}
          </section>
          <section>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-bold"><AlignLeft className="w-4 h-4 inline mr-2" />{t('common.description')}</p>
              {canEdit && !readOnly && !editingDescription && (
                <button onClick={() => setEditingDescription(true)} className="text-xs text-primary font-semibold cursor-pointer hover:underline">
                  <Edit3 className="w-3.5 h-3.5 inline mr-1" />{t('common.edit')}
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
