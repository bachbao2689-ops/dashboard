import {useReadEntityNotifications} from '../../../hooks/useReadEntityNotifications';
import {useTaskDetailVisibility} from '../../../hooks/useTaskDetailVisibility';
import {hasCanonicalNotifications} from '../../../store/notificationStore';
import React, { useCallback, useEffect, useState } from 'react';
import { workflowDateError } from '../../../lib/workflowCalendar';
import { TaskComments } from '../comments/TaskComments';
import { Avatar } from '../../common/Avatar';

import { AlignLeft, Calendar, CheckCircle2, Edit3, ImagePlus, MessageSquare, User, X, Clock, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import {useMobileReadOnly} from '../../../hooks/useMobileReadOnly';
import { supabase } from '../../../services/supabase';
import { canCompleteTrackedTask, completeTrackedTask, updateTrackedTask } from '../../../services/workspaceTasks';
import { taskKey } from '../../../lib/taskTracking';
import { TaskPinButton } from '../tasks/TaskPinButton';
import { TaskActivityLogPopover } from '../tasks/TaskActivityLogPopover';
import { TaskDescriptionViewer } from '../tasks/TaskDescriptionViewer';
import { TaskDescriptionEditor } from '../tasks/TaskDescriptionEditor';
import { useTranslation } from '../../../i18n/translations';
import { canonicalWorkflowStatus, workflowStage, type WorkflowTaskStatus } from '../tasks/WorkflowStatusPicker';
import { logTaskActivity } from '../../../services/taskActivityLogger';
import { isGlobalManager, isDepartmentLeader, type RoleProfile } from '../../../lib/roleScope';
import { inputDate } from '../../../lib/workflowHub';
import { ListTodo, Plus, Trash2 } from 'lucide-react';
import { priorityClass } from './projectPresentation';

type Person = { id: number; name: string; avatar_url?: string | null };
export interface SubtaskChecklistItem {
  id: string;
  title: string;
  description?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  completed: boolean;
  due_date?: string | null;
  created_by?: number | null;
  created_by_name?: string | null;
  created_at: string;
}

type Subtask = {
  id: string;
  title: string;
  status?: string | null;
  due_date?: string | null;
  start_date?: string | null;
  assignee_id?: number | string | null;
  assignee?: { name?: string; avatar_url?: string | null } | null;
  workflow_status?: string | null;
  project_id?: string | number | null;
  campaign_id?: string | number | null;
  priority?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};
type ParentDetails = { name: string; priority?: string | null; departmentName?: string | null; start_date?: string | null; due_date?: string | null; end_date?: string | null };
const workspaceId = '9000eae0-528c-47a2-b6f3-eba019d4edca';
const isDone = (status?: string | null) => ['done', 'complete', 'completed'].includes((status || '').toLowerCase());
const displayDate = (date?: string | null) => date ? new Date(date).toLocaleDateString('vi-VN') : '---';

interface SubtaskDetailPanelProps {
  embedded?: boolean;
  commentsFocusToken?: number;
  entityType?: 'project_subtask' | 'campaign_subtask';
  assignablePeople?: Person[];
  parentName?: string;
  subtask: Subtask | null;
  profile: { id?: number; name?: string } | null;
  people: Person[];
  onClose: () => void;
  onUpdated: (subtask?: Subtask) => void;
}

export const SubtaskDetailPanel: React.FC<SubtaskDetailPanelProps> = ({ subtask, profile, people, onClose, onUpdated, entityType = 'project_subtask', parentName, embedded = false, commentsFocusToken = 0, assignablePeople }) => {
  const { t, lang } = useTranslation();
  useTaskDetailVisibility(Boolean(subtask));
  useReadEntityNotifications(entityType,subtask?.id,Boolean(subtask));
  const readOnly=useMobileReadOnly(false);
  const [parentDetails, setParentDetails] = useState<ParentDetails | null>(null);
  const [parentLoading, setParentLoading] = useState(false);
  const [commentFocus, setCommentFocus] = useState(0);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftImageUrl, setDraftImageUrl] = useState('');
  const [width, setWidth] = useState(560);
  const [resizing, setResizing] = useState(false);
  
  useEffect(() => {
    if (!resizing) return;
    const move = (e: MouseEvent) => setWidth(Math.max(400, Math.min(window.innerWidth - e.clientX, 800)));
    const up = () => setResizing(false);
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
  }, [resizing]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canCompleteTask, setCanCompleteTask] = useState(false);
  const [editingTask, setEditingTask] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatus, setEditStatus] = useState<WorkflowTaskStatus>('planned');
  const [checklistItems, setChecklistItems] = useState<SubtaskChecklistItem[]>([]);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemPriority, setNewItemPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newItemDueDate, setNewItemDueDate] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [currentUpdatedAt, setCurrentUpdatedAt] = useState<string | null | undefined>(subtask?.updated_at);

  useEffect(() => {
    let active = true;
    setCanEdit(false);
    setEditing(false);
    if (subtask?.id && profile?.id) {
      const kind = entityType === 'project_subtask' ? 'project' : 'campaign';
      void supabase.rpc('workflow_old_task_access', { k: kind, tid: subtask.id, editing: true })
        .then(({ data }) => { if (active) setCanEdit(data === true); });
    }
    return () => { active = false; };
  }, [subtask?.id, entityType, profile?.id]);

  useEffect(() => {
    let active = true;
    setCanCompleteTask(false);
    if (subtask?.id && profile?.id) {
      void canCompleteTrackedTask(taskKey(entityType, subtask.id))
        .then(value => { if (active) setCanCompleteTask(value); })
        .catch(() => { if (active) setCanCompleteTask(false); });
    }
    return () => { active = false; };
  }, [subtask?.id, entityType, profile?.id]);

  useEffect(() => {
    const parentId = entityType === 'campaign_subtask' ? subtask?.campaign_id : subtask?.project_id;
    if (!parentId) { setParentDetails(null); setParentLoading(false); return; }
    let active = true;
    setParentDetails(null);
    setParentLoading(true);
    const loadParent = async () => {
      const { data: parent, error } = await (entityType === 'project_subtask'
        ? supabase.from('projects').select('name,priority,department_id,start_date,due_date').eq('id', parentId).maybeSingle()
        : supabase.from('campaigns').select('name,department_id,start_date,due_date,end_date').eq('id', parentId).maybeSingle());
      if (!active) return;
      if (error || !parent) {
        if (error) console.warn('Could not load subtask parent', error.message);
        setParentLoading(false);
        return;
      }
      let departmentName: string | null = null;
      if (parent.department_id) {
        const { data: department, error: departmentError } = await supabase.from('departments').select('name').eq('id', parent.department_id).maybeSingle();
        if (departmentError) console.warn('Could not load parent department', departmentError.message);
        departmentName = department?.name || null;
      }
      if (active) {
        setParentDetails({ name: parent.name, priority: 'priority' in parent ? parent.priority as string : null, departmentName, start_date: (parent as any).start_date || null, due_date: (parent as any).due_date || null, end_date: (parent as any).end_date || null });
        setParentLoading(false);
      }
    };
    void loadParent();
    return () => { active = false; };
  }, [subtask?.id, subtask?.project_id, subtask?.campaign_id, entityType]);

  const [subtaskCollaborators, setSubtaskCollaborators] = useState<(string | number)[]>([]);
  useEffect(() => {
    let active = true;
    const parentId = entityType === 'campaign_subtask' ? subtask?.campaign_id : subtask?.project_id;
    const ids = new Set<string | number>();
    if (subtask?.assignee_id) ids.add(subtask.assignee_id);

    if (parentId) {
      const table = entityType === 'campaign_subtask' ? 'campaign_subtasks' : 'project_subtasks';
      const parentKey = entityType === 'campaign_subtask' ? 'campaign_id' : 'project_id';
      supabase
        .from(table)
        .select('assignee_id')
        .eq(parentKey, parentId)
        .neq('status', 'deleted')
        .then(({ data }) => {
          if (!active) return;
          (data || []).forEach(r => {
            if (r.assignee_id) ids.add(r.assignee_id);
          });
          setSubtaskCollaborators(Array.from(ids));
        });
    } else {
      setSubtaskCollaborators(Array.from(ids));
    }
    return () => {
      active = false;
    };
  }, [subtask?.id, subtask?.assignee_id, subtask?.project_id, subtask?.campaign_id, entityType]);


  const subtaskId = subtask?.id;
  const reload = useCallback(async () => {
    if (!subtaskId) return;
    const detailsResult = await supabase.from('activity_log').select('metadata').eq('entity_type',entityType).eq('entity_id',subtaskId).eq('action','details_updated').order('created_at',{ascending:false}).limit(1);
    const details = detailsResult.data?.[0]?.metadata || {};
    setDescription(details.description || '');
    setImageUrl(details.image_url || '');
    setChecklistItems(Array.isArray(details.checklist_items) ? details.checklist_items : []);
  }, [subtaskId, entityType]);

  useEffect(() => {
    setCommentFocus(0);
    setEditing(false);
    setEditingTask(false);
    setEditTitle(subtask?.title || '');
    setEditAssigneeId(subtask?.assignee_id == null ? '' : String(subtask.assignee_id));
    setEditStartDate(subtask?.start_date?.slice(0, 10) || '');
    setEditDueDate(subtask?.due_date?.slice(0, 10) || '');
    setEditStatus(workflowStage(subtask?.status, subtask?.workflow_status));
    setCurrentUpdatedAt(subtask?.updated_at);
    void reload();
  }, [reload, subtask?.id, subtask?.title, subtask?.assignee_id, subtask?.start_date, subtask?.due_date, subtask?.status, subtask?.workflow_status]);

  const notifyMentionedPeople = async (_body: string, mentions: number[]) => {
    if (hasCanonicalNotifications() || !subtask || !profile?.id) return;
    const targets = people.filter(person => person.id !== profile.id && mentions.includes(person.id));
    if (!targets.length) return;
    await supabase.from('notifications').insert(targets.map(person => ({
      user_id: person.id,
      type: 'system',
      message: `${profile.name || 'Một thành viên'} đã nhắc bạn trong subtask: ${subtask.title}`,
      entity_type: entityType,
      entity_id: subtask.id
    })));
  };

  const saveDetails = async () => {
    if (readOnly||!canEdit||!subtask || !profile?.id) return;
    setSaving(true);
    const { error } = await supabase.from('activity_log').insert({
      workspace_id: workspaceId,
      user_id: profile.id,
      action: 'details_updated',
      entity_type: entityType,
      entity_id: subtask.id,
      metadata: { description: draftDescription.trim(), image_url: draftImageUrl.trim() || null }
    });
    setSaving(false);
    if (error) return toast.error('Không thể lưu thông tin subtask');
    setDescription(draftDescription.trim());
    setImageUrl(draftImageUrl.trim());
    setEditing(false);
    toast.success('Đã lưu subtask');
  };

  const isLeaderOrHigher = Boolean(profile && (isGlobalManager(profile as RoleProfile) || isDepartmentLeader(profile as RoleProfile)));
  const canAddSubtaskItem = canEdit || isLeaderOrHigher;

  const handleAddChecklistItem = async () => {
    if (!newItemTitle.trim() || !subtask || !profile?.id) return;
    setAddingItem(true);
    try {
      const currentDue = (subtask.due_date || '').slice(0, 10);
      const itemDue = (newItemDueDate || '').slice(0, 10);
      const parentDue = (parentDetails?.due_date || parentDetails?.end_date) ? (parentDetails.due_date || parentDetails.end_date)!.slice(0, 10) : '';
      if (itemDue && parentDue && itemDue > parentDue) {
        toast.error(lang === 'en' ? 'Checklist item deadline cannot exceed project deadline.' : 'Hạn chót đầu việc không được vượt quá hạn chót của Project/Campaign cha.');
        return;
      }
      const extendsDeadline = Boolean(itemDue && (!currentDue || itemDue > currentDue));

      const newItem: SubtaskChecklistItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: newItemTitle.trim(),
        description: newItemDescription.trim() || null,
        priority: newItemPriority,
        completed: false,
        due_date: itemDue || null,
        created_by: profile.id,
        created_by_name: profile.name || (lang === 'en' ? 'Member' : 'Thành viên'),
        created_at: new Date().toISOString(),
      };

      if (extendsDeadline) {
        const nowIso = new Date().toISOString();
        await updateTrackedTask(
          taskKey(entityType, subtask.id),
          { due_date: itemDue, updated_at: nowIso },
          currentUpdatedAt || subtask.updated_at
        );
        setCurrentUpdatedAt(nowIso);
        setEditDueDate(itemDue);
        onUpdated({ ...subtask, due_date: itemDue, updated_at: nowIso });

        void logTaskActivity({
          workspaceId,
          userId: profile.id,
          action: 'deadline_extended',
          entityType,
          entityId: subtask.id,
          oldValue: { due_date: subtask.due_date },
          newValue: { due_date: itemDue },
          metadata: {
            title: `${profile.name || 'Thành viên'} đã kéo dài hạn chót đến ${displayDate(itemDue)} (do giao thêm việc)`,
            reason: `Thêm đầu việc "${newItemTitle.trim()}" có hạn chót dài hơn`,
            old_due_date: subtask.due_date,
            new_due_date: itemDue,
            item_title: newItemTitle.trim(),
            actor_name: profile.name,
          },
        });
      }

      void logTaskActivity({
        workspaceId,
        userId: profile.id,
        action: 'subtask_item_added',
        entityType,
        entityId: subtask.id,
        metadata: {
          title: `${profile.name || (lang === 'en' ? 'Member' : 'Thành viên')} ${lang === 'en' ? 'added checklist item' : 'đã thêm đầu việc'}: ${newItemTitle.trim()}`,
          item_title: newItemTitle.trim(),
          description: newItemDescription.trim() || null,
          priority: newItemPriority,
          due_date: itemDue || null,
          actor_name: profile.name,
        },
      });

      const nextItems = [...checklistItems, newItem];
      await supabase.from('activity_log').insert({
        workspace_id: workspaceId,
        user_id: profile.id,
        action: 'details_updated',
        entity_type: entityType,
        entity_id: subtask.id,
        metadata: {
          description,
          image_url: imageUrl || null,
          checklist_items: nextItems,
          is_internal_detail_sync: true,
        },
      });

      setChecklistItems(nextItems);
      setNewItemTitle('');
      setNewItemDescription('');
      setNewItemPriority('medium');
      setNewItemDueDate('');
      setShowAddItemForm(false);
      if (!extendsDeadline) {
        onUpdated?.();
      }
      toast.success(extendsDeadline ? (lang === 'en' ? 'Added checklist item and extended subtask due date' : 'Đã thêm đầu việc và kéo dài hạn chót subtask') : (lang === 'en' ? 'Added checklist item' : 'Đã thêm đầu việc'));
    } catch (err: any) {
      toast.error(err?.message || 'Không thể thêm đầu việc');
    } finally {
      setAddingItem(false);
    }
  };

  const handleToggleChecklistItem = async (itemId: string) => {
    if (!subtask || !profile?.id) return;
    const targetItem = checklistItems.find(i => i.id === itemId);
    if (!targetItem) return;
    const nextCompleted = !targetItem.completed;
    const nextItems = checklistItems.map(i => i.id === itemId ? { ...i, completed: nextCompleted } : i);

    setChecklistItems(nextItems);
    try {
      await supabase.from('activity_log').insert({
        workspace_id: workspaceId,
        user_id: profile.id,
        action: 'details_updated',
        entity_type: entityType,
        entity_id: subtask.id,
        metadata: {
          description,
          image_url: imageUrl || null,
          checklist_items: nextItems,
          is_internal_detail_sync: true,
        },
      });

      void logTaskActivity({
        workspaceId,
        userId: profile.id,
        action: 'subtask_item_toggled',
        entityType,
        entityId: subtask.id,
        metadata: {
          title: `${profile.name || 'Thành viên'} đã đánh dấu ${nextCompleted ? 'hoàn thành' : 'chưa hoàn thành'} đầu việc: ${targetItem.title}`,
          item_title: targetItem.title,
          completed: nextCompleted,
          actor_name: profile.name,
        },
      });
      onUpdated?.();
    } catch (err) {
      console.warn('Failed to update checklist item state', err);
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!subtask || !profile?.id) return;
    const targetItem = checklistItems.find(i => i.id === itemId);
    if (!targetItem) return;
    const nextItems = checklistItems.filter(i => i.id !== itemId);

    setChecklistItems(nextItems);
    try {
      await supabase.from('activity_log').insert({
        workspace_id: workspaceId,
        user_id: profile.id,
        action: 'details_updated',
        entity_type: entityType,
        entity_id: subtask.id,
        metadata: {
          description,
          image_url: imageUrl || null,
          checklist_items: nextItems,
          is_internal_detail_sync: true,
        },
      });

      void logTaskActivity({
        workspaceId,
        userId: profile.id,
        action: 'subtask_item_deleted',
        entityType,
        entityId: subtask.id,
        metadata: {
          title: `${profile.name || 'Thành viên'} đã xóa đầu việc: ${targetItem.title}`,
          item_title: targetItem.title,
          actor_name: profile.name,
        },
      });
      onUpdated?.();
    } catch (err) {
      console.warn('Failed to delete checklist item', err);
    }
  };

  const saveTaskFields = async () => {
    if (readOnly || !canEdit || !subtask || !editTitle.trim()) return;
    const bounds = {
      start: parentDetails?.start_date ? parentDetails.start_date.slice(0, 10) : '',
      due: (parentDetails?.due_date || parentDetails?.end_date) ? (parentDetails.due_date || parentDetails.end_date)!.slice(0, 10) : '',
    };
    const dateErr = workflowDateError(editStartDate, editDueDate, bounds);
    if (dateErr === 'order') {
      toast.error(lang === 'en' ? 'Start date must be before the due date.' : 'Ngày bắt đầu phải trước hạn chót.');
      return;
    }
    if (dateErr) {
      toast.error(lang === 'en' ? 'Subtask dates must fit Project/Campaign calendar bounds.' : 'Lịch subtask phải nằm trong khoảng thời gian của Project/Campaign cha.');
      return;
    }
    setSaving(true);
    const nowIso = new Date().toISOString();
    const values = {
      title: editTitle.trim(),
      assignee_id: editAssigneeId ? Number(editAssigneeId) : null,
      start_date: editStartDate || null,
      due_date: editDueDate || null,
      workflow_status: editStatus,
      status: canonicalWorkflowStatus[editStatus],
      updated_at: nowIso,
    };
    try {
      await updateTrackedTask(taskKey(entityType, subtask.id), values, currentUpdatedAt || subtask.updated_at);
      setCurrentUpdatedAt(nowIso);
      const assignee = (assignablePeople || []).find(person => String(person.id) === editAssigneeId)
        || people.find(person => String(person.id) === editAssigneeId);

      const actorName = profile?.name || 'Thành viên';
      if (editTitle.trim() !== (subtask.title || '').trim()) {
        void logTaskActivity({
          workspaceId,
          userId: profile?.id,
          action: 'task_updated',
          entityType,
          entityId: subtask.id,
          oldValue: { title: subtask.title },
          newValue: { title: editTitle.trim() },
          metadata: {
            field: 'title',
            title: `${actorName} đã đổi tiêu đề: "${subtask.title}" → "${editTitle.trim()}"`,
            actor_name: actorName,
          },
        });
      }
      const oldDue = (subtask.due_date || '').slice(0, 10);
      const newDue = (editDueDate || '').slice(0, 10);
      if (newDue !== oldDue) {
        void logTaskActivity({
          workspaceId,
          userId: profile?.id,
          action: 'task_updated',
          entityType,
          entityId: subtask.id,
          oldValue: { due_date: subtask.due_date },
          newValue: { due_date: editDueDate || null },
          metadata: {
            field: 'due_date',
            title: `${actorName} đã đổi hạn chót: ${displayDate(oldDue)} → ${displayDate(newDue)}`,
            actor_name: actorName,
          },
        });
      }
      const oldStart = (subtask.start_date || '').slice(0, 10);
      const newStart = (editStartDate || '').slice(0, 10);
      if (newStart !== oldStart) {
        void logTaskActivity({
          workspaceId,
          userId: profile?.id,
          action: 'task_updated',
          entityType,
          entityId: subtask.id,
          oldValue: { start_date: subtask.start_date },
          newValue: { start_date: editStartDate || null },
          metadata: {
            field: 'start_date',
            title: `${actorName} đã đổi ngày bắt đầu: ${displayDate(oldStart)} → ${displayDate(newStart)}`,
            actor_name: actorName,
          },
        });
      }
      const oldAssigneeId = subtask.assignee_id == null ? '' : String(subtask.assignee_id);
      if (editAssigneeId !== oldAssigneeId) {
        const oldName = subtask.assignee?.name || 'Chưa gán';
        const newPerson = (assignablePeople || []).find(p => String(p.id) === editAssigneeId) || people.find(p => String(p.id) === editAssigneeId);
        const newName = newPerson?.name || (editAssigneeId ? 'Thành viên' : 'Chưa gán');
        void logTaskActivity({
          workspaceId,
          userId: profile?.id,
          action: 'task_updated',
          entityType,
          entityId: subtask.id,
          oldValue: { assignee_id: subtask.assignee_id },
          newValue: { assignee_id: editAssigneeId ? Number(editAssigneeId) : null },
          metadata: {
            field: 'assignee',
            title: `${actorName} đã đổi người thực hiện: ${oldName} → ${newName}`,
            actor_name: actorName,
          },
        });
      }
      const oldStatus = workflowStage(subtask.status, subtask.workflow_status);
      if (editStatus !== oldStatus) {
        void logTaskActivity({
          workspaceId,
          userId: profile?.id,
          action: 'task_updated',
          entityType,
          entityId: subtask.id,
          oldValue: { status: oldStatus },
          newValue: { status: editStatus },
          metadata: {
            field: 'status',
            title: `${actorName} đã đổi trạng thái: ${oldStatus} → ${editStatus}`,
            actor_name: actorName,
          },
        });
      }

      setEditingTask(false);
      onUpdated({ ...subtask, ...values, assignee: assignee ? { name: assignee.name, avatar_url: assignee.avatar_url } : null });
      toast.success(lang === 'en' ? 'Task updated' : 'Đã cập nhật task');
    } catch (error: any) {
      toast.error(error?.message || (lang === 'en' ? 'Could not save task' : 'Không thể lưu task'));
    } finally {
      setSaving(false);
    }
  };



  const complete = async () => {
    if (readOnly || !subtask || !canCompleteTask || saving || isDone(subtask.status)) return;
    setSaving(true);
    try {
      await completeTrackedTask(taskKey(entityType, subtask.id));
      onUpdated({ ...subtask, status: 'completed' });
      toast.success('Đã hoàn thành subtask');
    } catch (error: any) { toast.error(error.message || 'Không thể hoàn thành subtask'); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    if (!subtask?.id) return;
    const channel = supabase.channel(`realtime-activity_log-${subtask?.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log', filter: `entity_id=eq.${subtask?.id}` }, () => {
        void reload();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [subtask?.id, reload]);

  if (!subtask) return null;
  const completed = isDone(subtask.status);
  const canComplete = canCompleteTask;
  const priority = subtask.priority || parentDetails?.priority || 'Chưa đặt';

  return (
    <>
      {!embedded && <div
        className="fixed inset-0 bg-slate-900/30 dark:bg-slate-900/60 z-[85] xl:hidden backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />}
      <aside 
        style={{ '--panel-width': `${width}px` } as React.CSSProperties} 
        className={embedded ? 'flex flex-col h-full min-h-0 w-full bg-white dark:bg-slate-800' : `dashboard-detail-drawer bg-white dark:bg-slate-800 shrink-0 w-full max-w-full xl:max-w-[calc(100vw-32px)] xl:w-[var(--panel-width)] xl:max-w-[min(var(--panel-width),50vw)] shadow-drawer-subtask z-[90] drawer-slide-in ${!resizing ? 'transition-[width] duration-300' : ''}`}
      >
      {!embedded && <div onMouseDown={() => setResizing(true)} className="hidden xl:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />}
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
        <div><span className="text-xs font-semibold px-3 py-1.5 rounded-lg uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">SUBTASK</span><span className="ml-2 text-xs capitalize text-gray-500">{priority} {t('common.priority').toLowerCase()}</span></div>
        <div className="flex items-center gap-1"><TaskActivityLogPopover entityType={entityType} entityId={subtask ? subtask.id : null} workspaceId={workspaceId} /><TaskPinButton taskId={subtask ? taskKey(entityType, subtask.id) : null} /><button aria-label={t('common.close')} onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400"><X className="w-5 h-5" /></button></div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-6 md:px-8 space-y-7">
        <section><div className="flex items-start justify-between gap-3"><h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">{subtask.title}</h2>{canEdit && !readOnly && <button type="button" onClick={() => setEditingTask(value => !value)} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5 dark:border-slate-700 min-h-[44px] sm:min-h-0" aria-expanded={editingTask}><Edit3 className="h-3.5 w-3.5" />{editingTask ? (lang === 'en' ? 'Cancel edit' : 'Hủy sửa') : t('common.edit')}</button>}</div><div className="flex flex-wrap gap-2 mt-4"><span className="px-3 py-1.5 rounded-full text-sm border border-gray-200 dark:border-slate-700"><CheckCircle2 className="w-4 h-4 inline mr-1 text-primary" />{completed ? t('common.completed') : subtask.status || 'To do'}</span><span className="px-3 py-1.5 rounded-full text-sm border border-gray-200 dark:border-slate-700"><Clock className="w-4 h-4 inline mr-1 text-red-500" />{priority}</span></div></section>
        
        {editingTask ? <section className="space-y-4 rounded-2xl border border-primary/20 bg-gray-50 p-4 dark:bg-slate-800/50">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">{lang === 'en' ? 'Task title' : 'Tiêu đề task'}
            <input value={editTitle} onChange={event => setEditTitle(event.target.value)} maxLength={500} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">{t('common.assignee')}
              <select value={editAssigneeId} onChange={event => setEditAssigneeId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                <option value="">{t('common.unassigned')}</option>
                {(assignablePeople || []).map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
                {subtask.assignee_id != null && subtask.assignee?.name && !(assignablePeople || []).some(person => String(person.id) === String(subtask.assignee_id)) && <option value={subtask.assignee_id}>{subtask.assignee.name}</option>}
              </select>
            </label>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">{lang === 'en' ? 'Status' : 'Trạng thái'}
              <select value={editStatus} onChange={event => setEditStatus(event.target.value as WorkflowTaskStatus)} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                <option value="backlog">{lang === 'en' ? 'Backlog' : 'Chờ xử lý'}</option><option value="planned">{lang === 'en' ? 'Planned' : 'Đã lên kế hoạch'}</option><option value="scoping">{lang === 'en' ? 'Scoping' : 'Làm rõ phạm vi'}</option><option value="in_progress">{lang === 'en' ? 'In progress' : 'Đang triển khai'}</option><option value="in_qa">{lang === 'en' ? 'In review' : 'Rà soát & duyệt'}</option><option value="completed" disabled={!canComplete && !completed}>{t('common.completed')}</option><option value="canceled">{lang === 'en' ? 'Canceled' : 'Đã hủy'}</option>
              </select>
            </label>
            <div className="tw-calendar-picker relative">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                {lang === 'en' ? 'Start date' : 'Ngày bắt đầu'}
              </label>
              <input
                type="text"
                id={`subtask-edit-start-${subtask.id}`}
                readOnly
                onClick={(e) => {
                  if ((window as any).openCalendar) {
                    (window as any).openCalendar({
                      displayId: `subtask-edit-start-${subtask.id}`,
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
                id={`subtask-edit-due-${subtask.id}`}
                readOnly
                onClick={(e) => {
                  if ((window as any).openCalendar) {
                    (window as any).openCalendar({
                      displayId: `subtask-edit-due-${subtask.id}`,
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
          </div>
          <div className="flex justify-end"><button type="button" disabled={saving || !editTitle.trim()} onClick={() => void saveTaskFields()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? (lang === 'en' ? 'Saving…' : 'Đang lưu…') : (lang === 'en' ? 'Save task' : 'Lưu task')}</button></div>
        </section> : <section className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-200 dark:border-slate-700">
          <div><p className="text-xs text-gray-500 uppercase mb-2"><User className="w-3.5 h-3.5 inline mr-1" />{t('common.assignee')}</p>{subtask.assignee ? <div className="flex items-center gap-2"><Avatar name={subtask.assignee.name || t('common.unassigned')} src={(subtask.assignee as any)?.avatar_url} /><b className="text-sm">{subtask.assignee.name}</b></div> : <span className="text-sm text-gray-500">{t('common.unassigned')}</span>}</div>
          <div><p className="text-xs text-gray-500 uppercase mb-2"><Calendar className="w-3.5 h-3.5 inline mr-1" />{t('common.dueDate')}</p><b className="text-sm font-bold text-red-600 dark:text-red-400">{subtask.due_date ? displayDate(subtask.due_date) : t('common.noDueDate')}</b></div>
          <div><p className="text-xs text-gray-500 uppercase mb-2">{entityType === 'campaign_subtask' ? t('projects.col.campaign') : t('projects.col.project')}</p>{entityType === 'campaign_subtask' ? <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 line-clamp-1 ${parentLoading ? 'h-4 w-24 animate-pulse' : ''}`}>{parentLoading ? '' : parentDetails?.name || parentName || t('projects.col.campaign')}</span> : <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800 line-clamp-1 ${parentLoading ? 'h-4 w-24 animate-pulse' : ''}`}>{parentLoading ? '' : parentDetails?.name || parentName || t('projects.col.project')}</span>}</div>
          <div><p className="text-xs text-gray-500 uppercase mb-2">{t('common.department')}</p><b className={`text-sm ${parentLoading ? 'inline-block h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-slate-700' : ''}`}>{parentLoading ? '' : parentDetails?.departmentName || t('common.unassigned')}</b></div>
        </section>}

        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{subtask.created_at ? new Date(subtask.created_at).toLocaleString(lang === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</span>
          {subtask.created_at && subtask.updated_at && new Date(subtask.updated_at).getTime() > new Date(subtask.created_at).getTime() + 1000 && <span>· {lang === 'en' ? 'Edited' : 'Đã chỉnh sửa'}</span>}
        </p>

        {/* CHECKLIST / ĐẦU VIỆC */}
        <section className="space-y-3">
          <div className="grid grid-cols-[1fr_auto] items-center justify-between">
            <div className="grid grid-flow-col auto-cols-max items-center gap-2">
              <ListTodo className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                {lang === 'en' ? 'Checklist' : 'Đầu việc'} {checklistItems.length > 0 && `(${checklistItems.filter(i => i.completed).length}/${checklistItems.length})`}
              </h3>
            </div>
            {canAddSubtaskItem && !readOnly && !showAddItemForm && (
              <button
                type="button"
                onClick={() => setShowAddItemForm(true)}
                className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20 cursor-pointer min-h-[36px]"
              >
                <Plus size={14} />
                <span>{lang === 'en' ? 'Add item' : 'Thêm đầu việc'}</span>
              </button>
            )}
          </div>

          {/* Checklist Items List */}
          {checklistItems.length > 0 ? (
            <div className="space-y-2">
              {checklistItems.map(item => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/40 hover:bg-gray-100/60 dark:hover:bg-slate-800/70 transition-colors space-y-1.5"
                >
                  <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                    <label className="grid grid-cols-[auto_1fr] items-start gap-2.5 cursor-pointer min-h-[32px] select-none">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        disabled={readOnly || !canEdit}
                        onChange={() => void handleToggleChecklistItem(item.id)}
                        className="mt-0.5 w-4 h-4 rounded text-primary border-gray-300 dark:border-slate-600 focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="min-w-0">
                        <span className={`text-xs block font-medium ${item.completed ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-900 dark:text-gray-100'}`}>
                          {item.title}
                        </span>
                        <div className="grid grid-flow-col auto-cols-max items-center gap-2 mt-1">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${priorityClass(item.priority || 'medium')}`}>
                            {t(`common.${item.priority || 'medium'}`)}
                          </span>
                          {item.due_date && (
                            <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                              <Calendar size={11} /> {displayDate(item.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                    {canAddSubtaskItem && !readOnly && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteChecklistItem(item.id)}
                        title={lang === 'en' ? 'Delete item' : 'Xóa đầu việc'}
                        aria-label={lang === 'en' ? 'Delete item' : 'Xóa đầu việc'}
                        className="min-h-[32px] min-w-[32px] grid place-items-center rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-200/50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-[11px] text-gray-600 dark:text-gray-300 bg-white/70 dark:bg-slate-900/50 p-2 rounded-lg border border-gray-100 dark:border-slate-700/60 leading-relaxed whitespace-pre-wrap break-words">
                      {item.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            !showAddItemForm && (
              <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-700 p-3 text-center text-xs text-gray-400 dark:text-slate-500">
                {lang === 'en'
                  ? `No checklist items yet. ${canAddSubtaskItem ? 'Click "Add item" to assign work.' : ''}`
                  : `Chưa có đầu việc nào. ${canAddSubtaskItem ? 'Bấm "Thêm đầu việc" để giao thêm việc.' : ''}`}
              </div>
            )
          )}

          {/* Form thêm đầu việc */}
          {showAddItemForm && (
            <div className="rounded-2xl border border-primary/25 bg-primary/5 dark:bg-slate-800/70 p-3.5 space-y-3 animate-in fade-in duration-150">
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

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t('common.priority')}
                  <select
                    value={newItemPriority}
                    onChange={(e) => setNewItemPriority(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:border-primary capitalize cursor-pointer"
                  >
                    <option value="low">{t('common.low')}</option>
                    <option value="medium">{t('common.medium')}</option>
                    <option value="high">{t('common.high')}</option>
                    <option value="urgent">{t('common.urgent')}</option>
                  </select>
                </label>

                <div className="tw-calendar-picker relative">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {lang === 'en' ? 'Due Date' : 'Hạn chót đầu việc'}
                  </label>
                  <input
                    type="text"
                    id={`subtask-new-item-due-${subtask.id}`}
                    readOnly
                    onClick={(e) => {
                      if ((window as any).openCalendar) {
                        (window as any).openCalendar({
                          displayId: `subtask-new-item-due-${subtask.id}`,
                          mode: 'single',
                          maxDate: (parentDetails?.due_date || parentDetails?.end_date) ? (parentDetails.due_date || parentDetails.end_date)!.slice(0, 10) : undefined,
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

              {Boolean(newItemDueDate && (!subtask.due_date || newItemDueDate > subtask.due_date.slice(0, 10))) && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
                  ⚡ {lang === 'en'
                    ? `This deadline extends beyond subtask deadline (${displayDate(subtask.due_date)}). Subtask deadline will be automatically extended to ${displayDate(newItemDueDate)}.`
                    : `Hạn chót này dài hơn hạn chót subtask (${displayDate(subtask.due_date)}). Hạn chót của subtask sẽ tự động được kéo dài đến ${displayDate(newItemDueDate)} khi lưu.`}
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
                  className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {addingItem ? (lang === 'en' ? 'Adding…' : 'Đang thêm…') : (lang === 'en' ? 'Add item' : 'Thêm đầu việc')}
                </button>
              </div>
            </div>
          )}
        </section>

        <section>
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-bold"><AlignLeft className="w-4 h-4 inline mr-2" />{t('common.description')}</p>
            {!editing && !readOnly && canEdit && (
              <button
                onClick={() => {
                  setDraftDescription(description);
                  setDraftImageUrl(imageUrl);
                  setEditing(true);
                }}
                className="text-xs text-primary font-semibold cursor-pointer hover:underline"
              >
                <Edit3 className="w-3.5 h-3.5 inline mr-1" />{t('common.edit')}
              </button>
            )}
          </div>
          {editing && !readOnly && canEdit ? (
            <TaskDescriptionEditor
              value={draftDescription}
              onChange={setDraftDescription}
              onSave={saveDetails}
              onCancel={() => setEditing(false)}
              saving={saving}
              placeholder={t('projects.subtaskPlaceholder')}
              autoFocus
            />
          ) : (
            <>
              <TaskDescriptionViewer description={description} />
              {imageUrl && (
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  <ImagePlus className="h-4 w-4" />{t('projects.openSubtaskImage')}
                </a>
              )}
            </>
          )}
        </section>

        <TaskComments key={`${profile?.id}:${entityType}:${subtask.id}`} target={{kind:entityType,id:subtask.id}} people={people} collaboratorIds={subtaskCollaborators} allowMobileEditing focusRequest={commentsFocusToken || commentFocus ? `${commentsFocusToken}:${commentFocus}` : undefined} onSent={async (body,mentions) => { onUpdated(); await notifyMentionedPeople(body,mentions); }} onDeleted={() => { onUpdated(); }}/>

      </div>

      <div className="sticky bottom-0 z-10 flex min-h-[76px] shrink-0 gap-3 border-t border-gray-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-800" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <button onClick={() => setCommentFocus(value => value + 1)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 px-3 py-2 text-sm font-bold transition-colors"><MessageSquare className="mr-2 inline h-4 w-4" />{t('common.comment')}</button>
        <button disabled={completed || saving || !canComplete} onClick={complete} className="min-h-11 min-w-0 flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 className="mr-2 inline h-4 w-4" />{completed ? t('common.completed') : t('common.complete')}</button>
      </div>
    </aside>
  </>
  );
};
