import { QuickStatusDropdown } from '../../common/QuickStatusDropdown';
import { EntityNoteCell, getCachedNote } from './EntityNoteCell';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useWorkspaceRealtime } from '../../../hooks/useWorkspaceRealtime';
import { useResizableColumns } from '../../../hooks/useResizableColumns';
import { Avatar } from '../../common/Avatar';
import { ChevronDown, ChevronRight, Megaphone, Trash2, EyeOff, ListTodo, Plus, X, Eye, Pencil, Check, FileText } from 'lucide-react';
import { ConfirmDeleteModal } from '../../common/ConfirmDeleteModal';
import { ConfirmHideModal } from '../../common/ConfirmHideModal';
import toast from 'react-hot-toast';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useTranslation } from '../../../i18n/translations';
import { isGlobalManager, isAdmin, isDepartmentLeader, isPersonLeader } from '../../../lib/roleScope';
import { useWorkspaceDirectory } from '../../../hooks/useWorkspaceData';
import {isTaskDone} from '../../../lib/taskTracking';
import { EntityInfoPopover } from './EntityInfoPopover';
import { CommentPreviewPopover } from '../../common/CommentPreviewPopover';
import { getCampaignPriority, priorityClass } from './projectPresentation';
import { displayDate, type HubTrack } from '../../../lib/workflowHub';

export interface CampaignFilters {
  searchTerm: string;
  status: string;
  picId: string;
  calendar: string;
  customStartDate?: string;
  customEndDate?: string;
  priority: string;
  departmentId?: string;
}

export const checkDateMatch = (
  startDateStr: string | null | undefined,
  dueDateStr: string | null | undefined,
  filter: string,
  customStart?: string,
  customEnd?: string,
  isCompleted?: boolean
): boolean => {
  if (filter === 'all' && !customStart && !customEnd) return true;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  const start = startDateStr ? new Date(startDateStr).setHours(0, 0, 0, 0) : null;
  const due = dueDateStr ? new Date(dueDateStr).setHours(0, 0, 0, 0) : null;

  if (filter === 'ongoing') {
    if (isCompleted) return false;
    if (start && start > today) return false;
    if (due && due < today) return false;
    return true;
  }

  if (filter === 'due_soon') {
    if (isCompleted || !due) return false;
    const diff = (due - today) / ONE_DAY;
    return diff >= 0 && diff <= 7;
  }

  if (filter === 'overdue') {
    if (isCompleted || !due) return false;
    return due < today;
  }

  if (filter === 'this_week') {
    const day = now.getDay();
    const diffToMon = (day === 0 ? -6 : 1) - day;
    const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon).setHours(0, 0, 0, 0);
    const sun = mon + 6 * ONE_DAY;
    const itemStart = start || due;
    const itemEnd = due || start;
    if (!itemStart && !itemEnd) return false;
    return itemStart! <= sun && itemEnd! >= mon;
  }

  if (filter === 'this_month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).setHours(0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).setHours(23, 59, 59, 999);
    const itemStart = start || due;
    const itemEnd = due || start;
    if (!itemStart && !itemEnd) return false;
    return itemStart! <= endOfMonth && itemEnd! >= startOfMonth;
  }

  if (filter === 'custom' || customStart || customEnd) {
    const cs = customStart ? new Date(customStart).setHours(0, 0, 0, 0) : null;
    const ce = customEnd ? new Date(customEnd).setHours(23, 59, 59, 999) : null;
    const itemStart = start || due;
    const itemEnd = due || start;
    if (!itemStart && !itemEnd) return false;
    if (cs && itemEnd! < cs) return false;
    if (ce && itemStart! > ce) return false;
    return true;
  }

  return true;
};

const strictFormatVN = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  const ymd = dateStr.split('T')[0];
  const parts = ymd.split('-');
  if (parts.length === 3) return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  return displayDate(dateStr);
};
const formatDate = strictFormatVN;
const campaignPriority = getCampaignPriority;


const getDueStatusColor = (endDateStr?: string | null, status?: string | null) => {
  if (!endDateStr) return 'border-transparent';
  const isDone = ['done', 'complete', 'completed'].includes((status || '').toLowerCase());
  if (isDone) return 'border-emerald-500';
  const parts = endDateStr.split('T')[0].split('-').map(Number);
  if (parts.length !== 3) return 'border-transparent';
  const end = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 3) return 'border-emerald-500';
  if (diffDays >= 0) return 'border-amber-500';
  return 'border-red-500';
};

const getDueStatusLabel = (endDateStr?: string | null, status?: string | null, isEn?: boolean) => {
  if (!endDateStr) return null;
  const isDone = ['done', 'complete', 'completed'].includes((status || '').toLowerCase());
  if (isDone) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-[6px] font-bold whitespace-nowrap text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30">
        {isEn ? 'Completed' : 'Hoàn thành'}
      </span>
    );
  }
  const parts = endDateStr.split('T')[0].split('-').map(Number);
  if (parts.length !== 3) return null;
  const end = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  const color = diffDays > 3
    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
    : diffDays >= 0
    ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30'
    : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
  const label = diffDays < 0
    ? (isEn ? `${Math.abs(diffDays)}d overdue` : `Trễ ${Math.abs(diffDays)} ngày`)
    : diffDays === 0
    ? (isEn ? 'Due today' : 'Hôm nay')
    : (isEn ? `${diffDays}d left` : `Còn ${diffDays} ngày`);
  
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-[6px] font-bold whitespace-nowrap ${color}`}>{label}</span>;
};

export const CampaignPanel: React.FC<{ 
  onSelect?: (campaign: any) => void;
  filters?: CampaignFilters;
  rootCampaignIds?: ReadonlySet<string>;
  workflowTracks?: HubTrack[];
  people?: any[];
  onOpenSubtask?: (subtask: any) => void;
}> = ({ onSelect, filters, rootCampaignIds, workflowTracks, people: propPeople, onOpenSubtask }) => {
  const { t, lang } = useTranslation();
  const { tableRef: campaignTableRef, widths: campaignColWidths, startResize: startCampaignColResize } = useResizableColumns({
    tableKey: 'campaigns_table_v2',
    initialWidths: [300, 170, 250, 120, 150, 220],
    minWidth: 95,
  });
  const profile = useAuthStore(s => s.profile);
  const directory = useWorkspaceDirectory();
  const departments = useMemo(() => directory.data?.departments || [], [directory.data]);
  const rawDeptId = profile?.department_id ? String(profile.department_id) : null;
  const resolvedDeptId = useMemo(() => {
    if (rawDeptId) return rawDeptId;
    if (profile?.department_name && departments.length) {
      const match = departments.find(d => d.name.trim().toLowerCase() === profile.department_name?.trim().toLowerCase());
      if (match?.id) return String(match.id);
    }
    return null;
  }, [rawDeptId, profile?.department_name, departments]);
  const isManager = isGlobalManager(profile) || isAdmin(profile);
  const isLeader = isDepartmentLeader(profile);
  const isStaff = !isManager && !isLeader;
  const userIsRestricted = !isManager && Boolean(resolvedDeptId || profile?.department_name);

  const filterCampaignSubtasksForUser = React.useCallback((items: any[], camp: any) => {
    if (isManager || isLeader) return items;
    const myId = profile?.id != null ? Number(profile.id) : null;
    if (!myId) return items;
    const isPrimaryLeadOrCreator = Boolean(
      (camp?.lead_id && Number(camp.lead_id) === myId) ||
      (camp?.creator?.id && Number(camp.creator.id) === myId)
    );
    if (isPrimaryLeadOrCreator) return items;
    return items.filter(st => {
      if (st.assignee_id != null && Number(st.assignee_id) === myId) return true;
      if (st.created_by != null && Number(st.created_by) === myId) return true;
      return false;
    });
  }, [isManager, isLeader, profile?.id]);
  const canManage = (campaign: {id: string; created_by?: number | null}) => Boolean(profile && (campaign.created_by === profile.id || rootCampaignIds?.has(campaign.id)));
  const [expanded, setExpanded] = useState(true);
  const [campaignToDelete, setCampaignToDelete] = useState<any>(null);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [campaignToHide, setCampaignToHide] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [subtaskMap, setSubtaskMap] = useState<Record<string, any[]>>({});
  const [hasComments, setHasComments] = useState<Record<string, boolean>>({});
  const [hasUnread, setHasUnread] = useState<Record<string, boolean>>({});
  const [people, setPeople] = useState<any[]>(propPeople || []);
  const request = useRef(0);

  // Tree View States (Campaign -> Subtask -> Đầu việc / Checklist)
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
  const [openNoteEntityIds, setOpenNoteEntityIds] = useState<Record<string, boolean>>({});
  const [campaignSubtasksMap, setCampaignSubtasksMap] = useState<Record<string, any[]>>({});
  const [subtaskChecklistMap, setSubtaskChecklistMap] = useState<Record<string, any[]>>({});
  const [subtaskCommentMap, setSubtaskCommentMap] = useState<Record<string, number>>({});

  // Inline Creation: Subtask
  const [creatingSubtaskCampaignId, setCreatingSubtaskCampaignId] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskPic, setNewSubtaskPic] = useState('');
  const [newSubtaskDue, setNewSubtaskDue] = useState('');
  const [newSubtaskPriority, setNewSubtaskPriority] = useState('medium');

  // Quick Edit States (Subtask & Checklist Title)
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemTitle, setEditingItemTitle] = useState('');

  const toIsoDate = (val?: string) => {
    if (!val) return null;
    if (val.includes('/')) return val.split('/').reverse().join('-');
    return val;
  };

  // Inline Creation: Đầu việc (Checklist item)
  const [creatingItemSubtaskId, setCreatingItemSubtaskId] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDue, setNewItemDue] = useState('');
  const [newItemPriority, setNewItemPriority] = useState('medium');
  const [newItemQuantity, setNewItemQuantity] = useState('');

  const toggleCampaignExpand = (id: string) => {
    setExpandedCampaigns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSubtaskExpand = (id: string) => {
    setExpandedSubtasks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const load = async () => {
    const token = ++request.current;
    if (!profile) { setCampaigns([]); setSubtaskMap({}); return; }
    let query = supabase.from('campaigns').select('*, lead:lead_id(name,avatar_url), creator:created_by(name,avatar_url)').neq('status', 'archived').neq('status', 'deleted').order('created_at', { ascending: false });
    const [{ data, error }, { data: allSubtasks }, { data: canonicalTasks }, { data: members }, { data: commentsData }, { data: unreadData }, { data: peopleData }] = await Promise.all([
      query,
      supabase.from('campaign_subtasks').select('*, assignee:assignee_id(id,name,avatar_url)').neq('status', 'deleted').neq('status', 'archived').order('created_at', { ascending: true }),
      supabase.from('tasks').select('campaign_id, assignee:assignee_id(id,name,avatar_url)').not('campaign_id', 'is', null).is('project_id', null).neq('status', 'deleted').neq('status', 'archived'),
      supabase.from('campaign_members').select('campaign_id, assignee:user_id(id,name,avatar_url)'),
      supabase.from('activity_log').select('entity_id').eq('entity_type', 'campaign').eq('action', 'comment'),
      profile?.id ? supabase.from('notifications').select('entity_id').eq('user_id', profile.id).eq('entity_type', 'campaign').is('read_at', null) : Promise.resolve({ data: [] } as any),
      propPeople?.length ? Promise.resolve({ data: propPeople } as any) : supabase.from('profiles').select('id, name, avatar_url')
    ]);
    if (token !== request.current) return;
    if (error) { toast.error('Không thể tải Campaign'); return; }
    if (peopleData?.length) setPeople(peopleData);

    const stMap: Record<string, any[]> = {};
    [...(allSubtasks || []), ...(canonicalTasks || []), ...(members || [])].forEach(st => {
      if (!st.assignee) return;
      if (!stMap[st.campaign_id]) stMap[st.campaign_id] = [];
      if (!stMap[st.campaign_id].find(x => x.id === (st.assignee as any).id)) stMap[st.campaign_id].push(st.assignee);
    });
    setSubtaskMap(stMap);

    // Group full subtasks per campaign
    const cSubMap: Record<string, any[]> = {};
    (allSubtasks || []).forEach((st: any) => {
      if (!cSubMap[st.campaign_id]) cSubMap[st.campaign_id] = [];
      cSubMap[st.campaign_id].push(st);
    });
    setCampaignSubtasksMap(cSubMap);

    // Fetch checklist items (đầu việc) for all subtasks
    const subtaskIds = (allSubtasks || []).map((s: any) => s.id);
    if (subtaskIds.length > 0) {
      const [{ data: detailsData }, { data: stCommentsData }] = await Promise.all([
        supabase
          .from('activity_log')
          .select('entity_id, metadata, created_at')
          .eq('entity_type', 'campaign_subtask')
          .eq('action', 'details_updated')
          .in('entity_id', subtaskIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('activity_log')
          .select('entity_id')
          .eq('entity_type', 'campaign_subtask')
          .eq('action', 'comment')
          .in('entity_id', subtaskIds),
      ]);

      const cMap: Record<string, number> = {};
      (stCommentsData || []).forEach((row: any) => {
        cMap[row.entity_id] = (cMap[row.entity_id] || 0) + 1;
      });
      setSubtaskCommentMap(cMap);

      const chkMap: Record<string, any[]> = {};
      (detailsData || []).forEach((row: any) => {
        if (!chkMap[row.entity_id] && row.metadata && Array.isArray(row.metadata.checklist_items)) {
          chkMap[row.entity_id] = row.metadata.checklist_items;
        }
      });
      setSubtaskChecklistMap(chkMap);
    }

    const commentMap: Record<string, boolean> = {};
    (commentsData || []).forEach((c: any) => { if (c.entity_id) commentMap[c.entity_id] = true; });
    setHasComments(commentMap);

    const unreadMap: Record<string, boolean> = {};
    (unreadData || []).forEach((n: any) => { if (n.entity_id) unreadMap[n.entity_id] = true; });
    setHasUnread(unreadMap);
    
    // Do not re-filter by department: RLS already scopes explicit cross-team invites.
    setCampaigns(data || []);
  };

  const handleQuickCreateSubtask = async (campaignId: string, customTitle: string) => {
    if (!customTitle.trim()) return;
    const { error } = await supabase.from('campaign_subtasks').insert({
      campaign_id: campaignId,
      title: customTitle.trim(),
      priority: 'medium',
      status: 'planning',
    });
    if (error) { toast.error(error.message); return; }
    toast.success(lang === 'en' ? 'Subtask created' : 'Đã tạo subtask');
    setExpandedCampaigns(prev => ({ ...prev, [campaignId]: true }));
    await load();
    window.dispatchEvent(new Event('tasks:changed'));
  };

  const handleQuickCreateChecklistItem = async (subtaskId: string, customTitle: string) => {
    if (!customTitle.trim() || !profile?.id) return;
    const currentList = subtaskChecklistMap[subtaskId] || [];
    const newItem: any = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: customTitle.trim(),
      completed: false,
      priority: 'medium',
      created_by: profile.id,
      created_by_name: profile.name || (lang === 'en' ? 'Member' : 'Thành viên'),
      created_at: new Date().toISOString(),
    };
    const nextItems = [...currentList, newItem];
    const { error } = await supabase.from('activity_log').insert({
      workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca',
      user_id: profile.id,
      action: 'details_updated',
      entity_type: 'campaign_subtask',
      entity_id: subtaskId,
      metadata: { checklist_items: nextItems, is_internal_detail_sync: true },
    });
    if (error) { toast.error(lang === 'en' ? 'Cannot save subtask' : 'Không thể lưu subtask'); return; }
    toast.success(lang === 'en' ? 'Subtask added' : 'Đã thêm subtask');
    setExpandedSubtasks(prev => ({ ...prev, [subtaskId]: true }));
    setSubtaskChecklistMap(prev => ({ ...prev, [subtaskId]: nextItems }));
    window.dispatchEvent(new Event('tasks:changed'));
  };
  const handleSaveEditSubtask = async (subtaskId: string) => {
    if (!editingSubtaskTitle.trim()) { setEditingSubtaskId(null); return; }
    const { error } = await supabase.from('campaign_subtasks').update({ title: editingSubtaskTitle.trim() }).eq('id', subtaskId);
    if (error) { toast.error(lang === 'en' ? 'Cannot update task title' : 'Không thể cập nhật tên task'); return; }
    setEditingSubtaskId(null);
    await load();
    window.dispatchEvent(new Event('tasks:changed'));
  };

  const handleSaveEditChecklistItem = async (subtaskId: string, itemId: string) => {
    if (!editingItemTitle.trim() || !profile?.id) { setEditingItemId(null); return; }
    const currentList = subtaskChecklistMap[subtaskId] || [];
    const nextItems = currentList.map(item => item.id === itemId ? { ...item, title: editingItemTitle.trim() } : item);
    const { error } = await supabase.from('activity_log').insert({
      workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca',
      user_id: profile.id,
      action: 'details_updated',
      entity_type: 'campaign_subtask',
      entity_id: subtaskId,
      metadata: { checklist_items: nextItems, is_internal_detail_sync: true },
    });
    if (error) { toast.error(lang === 'en' ? 'Cannot update subtask' : 'Không thể cập nhật subtask'); return; }
    setEditingItemId(null);
    setSubtaskChecklistMap(prev => ({ ...prev, [subtaskId]: nextItems }));
    window.dispatchEvent(new Event('tasks:changed'));
  };


  const handleCreateSubtask = async (campaignId: string) => {
    if (!newSubtaskTitle.trim()) {
      toast.error(lang === 'en' ? 'Please enter task title' : 'Vui lòng nhập tên task');
      return;
    }
    const { data, error } = await supabase.from('campaign_subtasks').insert({
      campaign_id: campaignId,
      title: newSubtaskTitle.trim(),
      assignee_id: newSubtaskPic ? Number(newSubtaskPic) : null,
      due_date: toIsoDate(newSubtaskDue),
      priority: newSubtaskPriority || 'medium',
      status: 'planning',
    }).select('*, assignee:assignee_id(id,name,avatar_url)').single();

    if (error || !data) {
      toast.error(error?.message || (lang === 'en' ? 'Cannot create task' : 'Không thể tạo task'));
      return;
    }
    toast.success(lang === 'en' ? 'Task created' : 'Đã tạo task thành công');
    setCreatingSubtaskCampaignId(null);
    setNewSubtaskTitle('');
    setNewSubtaskPic('');
    setNewSubtaskDue('');
    setNewSubtaskPriority('medium');
    setExpandedCampaigns(prev => ({ ...prev, [campaignId]: true }));
    await load();
    window.dispatchEvent(new Event('tasks:changed'));
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    const { error } = await supabase.from('campaign_subtasks').update({ status: 'deleted' }).eq('id', subtaskId);
    if (error) {
      toast.error(lang === 'en' ? 'Cannot delete task' : 'Không thể xóa task');
      return;
    }
    toast.success(lang === 'en' ? 'Task deleted' : 'Đã xóa task');
    await load();
    window.dispatchEvent(new Event('tasks:changed'));
  };

  const handleQuickChangeCampaignStatus = async (campaignId: string, nextStatus: string) => {
    const { error } = await supabase.from('campaigns').update({ status: nextStatus }).eq('id', campaignId);
    if (error) {
      toast.error(lang === 'en' ? 'Failed to update status' : 'Không thể cập nhật trạng thái');
      return;
    }
    toast.success(lang === 'en' ? 'Status updated' : 'Đã cập nhật trạng thái');
    await load();
    window.dispatchEvent(new Event('campaigns:changed'));
    window.dispatchEvent(new Event('tasks:changed'));
  };

  const handleQuickChangeCampaignSubtaskStatus = async (subtaskId: string, nextStatus: string) => {
    const { error } = await supabase.from('campaign_subtasks').update({ status: nextStatus }).eq('id', subtaskId);
    if (error) {
      toast.error(lang === 'en' ? 'Failed to update status' : 'Không thể cập nhật trạng thái');
      return;
    }
    toast.success(lang === 'en' ? 'Status updated' : 'Đã cập nhật trạng thái');
    await load();
    window.dispatchEvent(new Event('tasks:changed'));
  };

  const campaignStatusOptions = useMemo(() => [
    { value: 'planning', label: lang === 'en' ? 'Planning' : 'Lên kế hoạch', dotColor: 'bg-purple-500' },
    { value: 'active', label: lang === 'en' ? 'In Progress' : 'Đang thực hiện', dotColor: 'bg-sky-500' },
    { value: 'completed', label: lang === 'en' ? 'Completed' : 'Hoàn thành', dotColor: 'bg-emerald-500' },
    { value: 'on_hold', label: lang === 'en' ? 'On Hold' : 'Tạm dừng', dotColor: 'bg-amber-500' },
  ], [lang]);

  const campaignSubtaskStatusOptions = useMemo(() => [
    { value: 'planning', label: lang === 'en' ? 'Planning' : 'Lên kế hoạch', dotColor: 'bg-purple-500' },
    { value: 'in_progress', label: lang === 'en' ? 'In Progress' : 'Đang thực hiện', dotColor: 'bg-sky-500' },
    { value: 'completed', label: lang === 'en' ? 'Completed' : 'Hoàn thành', dotColor: 'bg-emerald-500' },
    { value: 'on_hold', label: lang === 'en' ? 'On Hold' : 'Tạm dừng', dotColor: 'bg-amber-500' },
  ], [lang]);

  const handleCreateChecklistItem = async (subtaskId: string) => {
    if (!newItemTitle.trim() || !profile?.id) {
      toast.error(lang === 'en' ? 'Please enter subtask title' : 'Vui lòng nhập tên subtask');
      return;
    }
    const currentList = subtaskChecklistMap[subtaskId] || [];
    const numQ = Number(newItemQuantity);
    const newItem: any = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newItemTitle.trim(),
      completed: false,
      priority: newItemPriority || 'medium',
      due_date: toIsoDate(newItemDue),
      created_by: profile.id,
      created_by_name: profile.name || (lang === 'en' ? 'Member' : 'Thành viên'),
      created_at: new Date().toISOString(),
      quantity: Number.isFinite(numQ) && numQ > 0 ? numQ : null,
    };
    const nextItems = [...currentList, newItem];
    const { error } = await supabase.from('activity_log').insert({
      workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca',
      user_id: profile.id,
      action: 'details_updated',
      entity_type: 'campaign_subtask',
      entity_id: subtaskId,
      metadata: {
        checklist_items: nextItems,
        is_internal_detail_sync: true,
      },
    });
    if (error) {
      toast.error(lang === 'en' ? 'Cannot save subtask' : 'Không thể lưu subtask');
      return;
    }
    toast.success(lang === 'en' ? 'Subtask added' : 'Đã thêm subtask thành công');
    setCreatingItemSubtaskId(null);
    setNewItemTitle('');
    setNewItemDue('');
    setNewItemPriority('medium');
    setNewItemQuantity('');
    setExpandedSubtasks(prev => ({ ...prev, [subtaskId]: true }));
    setSubtaskChecklistMap(prev => ({ ...prev, [subtaskId]: nextItems }));
    window.dispatchEvent(new Event('tasks:changed'));
  };

  const handleToggleChecklistItem = async (subtaskId: string, itemId: string) => {
    if (!profile?.id) return;
    const currentList = subtaskChecklistMap[subtaskId] || [];
    const nextItems = currentList.map(item => item.id === itemId ? { ...item, completed: !item.completed } : item);
    const { error } = await supabase.from('activity_log').insert({
      workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca',
      user_id: profile.id,
      action: 'details_updated',
      entity_type: 'campaign_subtask',
      entity_id: subtaskId,
      metadata: {
        checklist_items: nextItems,
        is_internal_detail_sync: true,
      },
    });
    if (error) {
      toast.error(lang === 'en' ? 'Cannot update subtask' : 'Không thể cập nhật subtask');
      return;
    }
    setSubtaskChecklistMap(prev => ({ ...prev, [subtaskId]: nextItems }));
    window.dispatchEvent(new Event('tasks:changed'));
  };

  const handleDeleteChecklistItem = async (subtaskId: string, itemId: string) => {
    if (!profile?.id) return;
    const currentList = subtaskChecklistMap[subtaskId] || [];
    const nextItems = currentList.filter(item => item.id !== itemId);
    const { error } = await supabase.from('activity_log').insert({
      workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca',
      user_id: profile.id,
      action: 'details_updated',
      entity_type: 'campaign_subtask',
      entity_id: subtaskId,
      metadata: {
        checklist_items: nextItems,
        is_internal_detail_sync: true,
      },
    });
    if (error) {
      toast.error(lang === 'en' ? 'Cannot delete subtask' : 'Không thể xóa subtask');
      return;
    }
    toast.success(lang === 'en' ? 'Subtask deleted' : 'Đã xóa subtask');
    setSubtaskChecklistMap(prev => ({ ...prev, [subtaskId]: nextItems }));
    window.dispatchEvent(new Event('tasks:changed'));
  };

  useEffect(() => {
    void load();
    const handleChanged = () => { void load(); };
    window.addEventListener('campaigns:changed', handleChanged);
    window.addEventListener('tasks:changed', handleChanged);
    return () => {
      request.current++;
      window.removeEventListener('campaigns:changed', handleChanged);
      window.removeEventListener('tasks:changed', handleChanged);
    };
  }, [profile?.id, profile?.department_id]);
  useWorkspaceRealtime(['campaigns', 'campaign_members', 'campaign_subtasks', 'tasks', 'workflow_phase_members', 'activity_log', 'notifications'], load, profile?.id);

  
  
  const executeHide = async () => {
    if (!campaignToHide) return;
    if (!canManage(campaignToHide)) { toast.error('Bạn không có quyền ẩn Campaign này.'); setCampaignToHide(null); return; }
    const { data, error } = await supabase.from('campaigns').update({ status: 'archived' }).eq('id', campaignToHide.id).select('id').maybeSingle();
    if (error || !data) {
      toast.error('Không thể ẩn Campaign');
    } else {
      await load();
      toast.success('Đã ẩn Campaign');
    }
    setCampaignToHide(null);
  };

  const archive = (campaign: any) => {
    if (!canManage(campaign)) return toast.error('Bạn không có quyền ẩn Campaign này.');
    setCampaignToHide(campaign);
  };


  
  const executeRemove = async () => {
    if (!campaignToDelete) return;
    if (!canManage(campaignToDelete)) { toast.error('Bạn không có quyền xóa Campaign này.'); setCampaignToDelete(null); return; }
    setDeletingIds(prev => [...prev, campaignToDelete.id]);
    const cached = campaignToDelete;
    setCampaignToDelete(null);
    setTimeout(async () => {
      const { data, error } = await supabase.from('campaigns').update({ status: 'deleted' }).eq('id', cached.id).select('id').maybeSingle();
      if (!error && data) {
        await supabase.from('campaign_subtasks').update({ status: 'deleted' }).eq('campaign_id', cached.id);
        toast.success('Đã chuyển Campaign vào thùng rác');
        await load();
        window.dispatchEvent(new Event('tasks:changed'));
      } else {
        toast.error('Lỗi khi xóa Campaign');
      }
      setDeletingIds(prev => prev.filter(id => id !== cached.id));
    }, 300);
  };

  const remove = (campaign: any) => {
    if (!canManage(campaign)) return toast.error('Bạn không có quyền xóa Campaign này.');
    setCampaignToDelete(campaign);
  };


  const isCompleted = (c: any) => ['done', 'complete', 'completed'].includes((c.status || '').toLowerCase());

  const visibleCampaigns = useMemo(() => {
    const { searchTerm, status, picId, calendar, customStartDate, customEndDate, priority, departmentId } = filters || {};
    const term = (searchTerm || '').trim().toLowerCase();

    return campaigns.filter(c => {
      // 0. Phân quyền tầm view theo 3 cấp: Manager/Admin -> Leader -> Staff
      if (!isManager) {
        const myId = profile?.id != null ? Number(profile.id) : null;
        const isLead = myId && Number(c.lead_id) === myId;
        const isCreator = myId && Number(c.creator?.id) === myId;
        const isSub = myId && (subtaskMap[c.id] || []).some((a: any) => Number(a.id) === myId);

        if (isStaff) {
          // Staff thường: KHÔNG dùng inDept, chỉ thấy khi được giao / tham gia
          if (!isLead && !isCreator && !isSub) return false;
        } else if (isLeader) {
          // Leader: Thấy hết Campaign thuộc phòng ban mình HOẶC có nhân sự phòng ban tham gia HOẶC có Leader đồng cấp tham gia
          const inDept = Boolean(resolvedDeptId && c.department_id && String(c.department_id) === String(resolvedDeptId));
          const targetDeptId = resolvedDeptId;
          const targetDeptName = profile?.department_name?.trim().toLowerCase();
          const hasDeptMember = (
            Boolean(c.lead_id && people.some(pe => Number(pe.id) === Number(c.lead_id) && ((targetDeptId && String((pe as any).department_id || '') === String(targetDeptId)) || (targetDeptName && ((pe as any).departments?.name || '').trim().toLowerCase() === targetDeptName)))) ||
            (subtaskMap[c.id] || []).some((a: any) => {
              const person = people.find(pe => Number(pe.id) === Number(a.id));
              return person && ((targetDeptId && String((person as any).department_id || '') === String(targetDeptId)) || (targetDeptName && ((person as any).departments?.name || '').trim().toLowerCase() === targetDeptName));
            })
          );
          const isPeerLeaderCampaign = (
            Boolean(c.lead_id && people.some(pe => Number(pe.id) === Number(c.lead_id) && isPersonLeader(pe as any))) ||
            Boolean(c.creator?.id && people.some(pe => Number(pe.id) === Number(c.creator.id) && isPersonLeader(pe as any))) ||
            (subtaskMap[c.id] || []).some((a: any) => people.some(pe => Number(pe.id) === Number(a.id) && isPersonLeader(pe as any)))
          );
          if (!inDept && !hasDeptMember && !isPeerLeaderCampaign && !isLead && !isCreator && !isSub) return false;
        }
      }

      if (!filters) return true;

      // 1. Search filter
      if (term) {
        const nameMatch = (c.name || '').toLowerCase().includes(term);
        const objMatch = (c.objective || '').toLowerCase().includes(term);
        if (!nameMatch && !objMatch) return false;
      }

      // 2. Status filter
      if (status === 'open' && isTaskDone(c.status)) return false;
      if (status && status !== 'all' && status !== 'open') {
        const norm = (c.status || 'planning').toLowerCase();
        if (status === 'in_progress') {
          if (!['active', 'in_progress', 'in-progress'].includes(norm)) return false;
        } else if (status === 'completed') {
          if (!['done', 'complete', 'completed'].includes(norm)) return false;
        } else if (status === 'planning') {
          if (!['planning', 'draft', 'pending'].includes(norm)) return false;
        } else if (status !== norm) {
          return false;
        }
      }

      // 3. PIC filter
      if (picId && picId !== 'all') {
        if (picId === 'me') {
          const myId = profile?.id;
          const isLead = myId && Number(c.lead_id) === Number(myId);
          const isCreator = myId && Number(c.creator?.id) === Number(myId);
          const isSub = myId && (subtaskMap[c.id] || []).some((a: any) => Number(a.id) === Number(myId));
          if (!isLead && !isCreator && !isSub) return false;
        } else if (picId === 'unassigned') {
          if (c.lead_id || c.lead?.name) return false;
        } else {
          const targetId = Number(picId);
          const isLead = Number(c.lead_id) === targetId;
          const isCreator = Number(c.creator?.id) === targetId;
          const isSub = (subtaskMap[c.id] || []).some((a: any) => Number(a.id) === targetId);
          if (!isLead && !isCreator && !isSub) return false;
        }
      }

      // 4. Priority filter
      if (priority && priority !== 'all') {
        const p = campaignPriority(c).toLowerCase();
        if (p !== priority.toLowerCase()) return false;
      }

      // 5. Calendar filter
      if (calendar && calendar !== 'all') {
        if (!checkDateMatch(c.start_date, c.end_date, calendar, customStartDate, customEndDate, isCompleted(c))) {
          return false;
        }
      } else if (customStartDate || customEndDate) {
        if (!checkDateMatch(c.start_date, c.end_date, 'custom', customStartDate, customEndDate, isCompleted(c))) {
          return false;
        }
      }

      // 6. Department filter
      if (departmentId) {
        if (String(c.department_id || '') !== String(departmentId)) {
          return false;
        }
      }

      return true;
    });
  }, [campaigns, filters, subtaskMap, profile?.id, profile?.department_name, isManager, isLeader, isStaff, resolvedDeptId, people, userIsRestricted]);

  return (
    <section className="card-hub rounded-[8px] overflow-hidden shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
        <button onClick={() => setExpanded(value => !value)} aria-expanded={expanded} className="inline-flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
          <ChevronDown className={`text-gray-500 transition-transform ${expanded ? '' : '-rotate-90'}`} size={17} />
          <Megaphone className="text-amber-500" size={16} /> {t('projects.campaignsAccordion')}
          <span className="rounded-full bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
            {visibleCampaigns.length}{visibleCampaigns.length !== campaigns.length ? ` / ${campaigns.length}` : ''}
          </span>
        </button>
      </div>
      {expanded && <>
      <div className="space-y-3 p-3 xl:hidden">
        {visibleCampaigns.map(c => {
          const isCampaignExpanded = Boolean(expandedCampaigns[c.id]);
          const rawSubtasks = campaignSubtasksMap[c.id] || [];
          const subtasks = filterCampaignSubtasksForUser(rawSubtasks, c);
          const campNote = getCachedNote('campaign', c.id);
          const isNoteOpen = Boolean(openNoteEntityIds[c.id]);
          const leadPerson = c.lead || (c.creator ? { name: c.creator.name, avatar_url: c.creator.avatar_url } : null);
          const campaignTrack = workflowTracks?.find(t => t.entity_type === 'campaign' && String(t.entity_id).trim() === String(c.id).trim());
          const hasPhases = (campaignTrack?.phases?.length || 0) > 0;

          return (
            <article key={c.id} className={`min-w-0 rounded-[8px] border border-gray-200/90 bg-white/90 p-3 dark:border-slate-800 dark:bg-[#071325]/70 shadow-xs ${deletingIds.includes(c.id) ? 'animate-fade-out' : ''}`}>
              {/* Hàng 1: Expand chevron, (i) icon, Title + subtask count + note icon, Status ở góc phải */}
              <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleCampaignExpand(c.id)}
                  className="p-1 -ml-1 text-slate-400 hover:text-amber-500 rounded-[6px] transition-transform cursor-pointer shrink-0"
                  title={isCampaignExpanded ? (lang === 'en' ? 'Collapse tasks' : 'Thu gọn task') : (lang === 'en' ? 'Expand tasks' : 'Mở rộng task')}
                >
                  <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isCampaignExpanded ? 'rotate-90 text-amber-500' : ''}`} />
                </button>
                {hasPhases && (
                  <EntityInfoPopover
                    entityType="campaign"
                    entity={c}
                    track={campaignTrack}
                    leadPerson={leadPerson}
                    subPersons={(() => {
                      const leadIdStr = c.lead_id ? String(c.lead_id) : '';
                      const leadName = String(c.lead?.name || '').trim().toLowerCase();
                      return (subtaskMap[c.id] || []).filter((assignee: any) => {
                        if (leadIdStr && String(assignee.id) === leadIdStr) return false;
                        if (leadName && String(assignee.name || '').trim().toLowerCase() === leadName) return false;
                        return true;
                      });
                    })()}
                  />
                )}
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => onSelect?.(c)}
                    className="font-bold text-sm text-gray-900 dark:text-white truncate cursor-pointer text-left"
                  >
                    {c.name}
                  </button>
                  {(() => {
                    const phases = campaignTrack?.phases || [];
                    const phaseCount = phases.length;
                    const unassignedSubtasks = subtasks.filter(s => s.status !== 'deleted' && (!phaseCount || !s.workflow_phase_id));
                    const unassignedCount = unassignedSubtasks.length;
                    const isAllUnassignedDone = unassignedCount > 0 && unassignedSubtasks.every(s => isTaskDone(s.status));

                    return (
                      <>
                        {unassignedCount > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-[4px] font-bold shrink-0 ${
                            isAllUnassignedDone
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            ({unassignedCount} Tasks)
                          </span>
                        )}
                      </>
                    );
                  })()}
                  {hasComments[c.id] && (
                    <CommentPreviewPopover
                      entityType="campaign"
                      entityId={c.id}
                      entityTitle={c.name}
                      hasUnreadDot={Boolean(Number(c.lead_id) === Number(profile?.id) || hasUnread[c.id])}
                    />
                  )}
                  {Boolean(campNote && campNote.trim()) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenNoteEntityIds(prev => ({ ...prev, [c.id]: !prev[c.id] }));
                      }}
                      className="p-0.5 text-blue-500 hover:text-blue-600 dark:text-blue-400 shrink-0 cursor-pointer"
                      title="Xem ghi chú"
                    >
                      <FileText size={13} />
                    </button>
                  )}
                </div>
                {/* Status badge đưa lên góc phải */}
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <QuickStatusDropdown
                    currentStatus={c.status || 'planning'}
                    options={campaignStatusOptions}
                    onSelect={(nextStatus) => handleQuickChangeCampaignStatus(c.id, nextStatus)}
                    disabled={!canManage(c)}
                  />
                </div>
              </div>

              {/* Hàng 2: Timeline và PIC */}
              <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2 text-[11px] text-gray-500 dark:text-slate-400">
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 min-w-0">
                  <span className="min-w-0 truncate">
                    {c.end_date ? `${t('common.due')} ${formatDate(c.end_date)}` : t('common.noDueDate')}
                  </span>
                  {c.end_date && getDueStatusLabel(c.end_date, c.status, lang === 'en')}
                </div>
                {leadPerson && (
                  <div className="grid grid-flow-col auto-cols-max items-center gap-1 shrink-0">
                    <Avatar name={leadPerson.name} src={leadPerson.avatar_url} className="w-4 h-4 text-[8px]" />
                    <span className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate max-w-[100px]">{leadPerson.name}</span>
                  </div>
                )}
              </div>

              {/* Dropdown nội dung ghi chú nếu được bấm mở */}
              {isNoteOpen && campNote && (
                <div className="mt-2.5 p-2 rounded-[6px] bg-blue-50/70 dark:bg-[#071325] border border-blue-200/60 dark:border-slate-800 text-xs text-gray-700 dark:text-gray-300 animate-in fade-in duration-150">
                  <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 mb-0.5 grid grid-flow-col auto-cols-max items-center gap-1">
                    <FileText size={10} />
                    <span>{lang === 'en' ? 'Note' : 'Ghi chú'}</span>
                  </div>
                  <div className="text-xs leading-relaxed whitespace-pre-wrap">{campNote}</div>
                </div>
              )}

              {/* Mobile Subtasks List (KHÔNG có gạch phân cấp) */}
              {isCampaignExpanded && (
                <div className="mt-3 pt-3 border-t border-amber-200/50 dark:border-slate-800 space-y-2">
                  {subtasks.map((st) => {
                    const items = subtaskChecklistMap[st.id] || [];
                    const isSubtaskExpanded = Boolean(expandedSubtasks[st.id]);

                    return (
                      <div key={st.id} className="p-2.5 rounded-[8px] bg-amber-50/40 dark:bg-[#071325] border border-amber-200/60 dark:border-slate-800 text-xs space-y-2">
                        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleSubtaskExpand(st.id)}
                            className="p-1 text-slate-400 hover:text-amber-600 rounded transition-transform cursor-pointer"
                            title={isSubtaskExpanded ? (lang === 'en' ? 'Collapse subtasks' : 'Thu gọn subtask') : (lang === 'en' ? 'Expand subtasks' : 'Xem các subtask')}
                          >
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isSubtaskExpanded ? 'rotate-90 text-amber-600' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenSubtask) onOpenSubtask(st);
                              else onSelect?.(c);
                            }}
                            className="font-semibold text-slate-900 dark:text-white truncate text-left cursor-pointer"
                          >
                            {st.title}
                          </button>
                          <div onClick={(e) => e.stopPropagation()}>
                            <QuickStatusDropdown
                              currentStatus={st.status || 'planning'}
                              options={campaignSubtaskStatusOptions}
                              onSelect={(nextStatus) => handleQuickChangeCampaignSubtaskStatus(st.id, nextStatus)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <div>PIC: <span className="font-medium text-slate-700 dark:text-slate-200">{st.assignee?.name || '—'}</span></div>
                          <div>Hạn: <span className="font-medium text-slate-700 dark:text-slate-200">{st.due_date ? formatDate(st.due_date) : '—'}</span></div>
                        </div>

                        {/* Mobile Checklist Items (KHÔNG có gạch phân cấp, tick hình tròn) */}
                        {isSubtaskExpanded && (
                          <div className="mt-2 pt-2 border-t border-amber-200/40 dark:border-slate-800/80 space-y-1.5">
                            {items.map((it) => (
                              <div key={it.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5 text-[11.5px]">
                                <button
                                  type="button"
                                  onClick={() => handleToggleChecklistItem(st.id, it.id)}
                                  className={`w-4 h-4 rounded-full border grid place-items-center transition-colors cursor-pointer ${
                                    it.completed
                                      ? 'bg-emerald-500 border-emerald-500 text-white'
                                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0a192f] hover:border-emerald-400'
                                  }`}
                                >
                                  {it.completed && <Check size={10} className="stroke-[3]" />}
                                </button>
                                <span className={it.completed ? 'line-through text-slate-400 dark:text-slate-500 truncate' : 'text-slate-800 dark:text-slate-200 truncate'}>
                                  {it.title}
                                </span>
                                <button type="button" onClick={() => handleDeleteChecklistItem(st.id, it.id)} className="text-slate-400 hover:text-red-500 p-0.5 cursor-pointer">
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            ))}
                            {/* Mobile Thêm subtask */}
                            <button
                              type="button"
                              onClick={() => {
                                const title = prompt(lang === 'en' ? 'Subtask title:' : 'Tiêu đề subtask:');
                                if (title && title.trim()) {
                                  void handleQuickCreateChecklistItem(st.id, title);
                                }
                              }}
                              className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5 px-3 py-1 rounded-[8px] border border-dashed border-slate-300/80 dark:border-slate-700/80 bg-transparent text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/60 dark:hover:bg-amber-950/30 text-[11px] font-semibold transition-all cursor-pointer mt-1"
                            >
                              <Plus size={11} />
                              <span>{lang === 'en' ? '+ Add Subtask' : '+ Thêm Subtask'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Mobile Thêm task */}
                  <button
                    type="button"
                    onClick={() => {
                      const title = prompt(lang === 'en' ? 'Task title:' : 'Tiêu đề task:');
                      if (title && title.trim()) {
                        void handleQuickCreateSubtask(c.id, title);
                      }
                    }}
                    className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] border border-dashed border-slate-300/80 dark:border-slate-700/80 bg-transparent text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/60 dark:hover:bg-amber-950/30 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>{lang === 'en' ? '+ Add Task' : '+ Thêm Task'}</span>
                  </button>
                </div>
              )}
            </article>
          );
        })}
        {!visibleCampaigns.length && (
          <p className="p-6 text-center text-sm text-gray-500">
            {campaigns.length > 0 ? (lang === 'en' ? 'No campaigns match current filters.' : 'Không có chiến dịch phù hợp bộ lọc.') : t('projects.noCampaigns')}
          </p>
        )}
      </div>
      <div className="hidden overflow-x-auto xl:block">
        <table ref={campaignTableRef} className="w-full table-fixed text-left border-collapse">
          <colgroup>
            {campaignColWidths.map((w, idx) => (
              <col key={idx} style={{ width: `${w}px` }} />
            ))}
          </colgroup>
          <thead className="bg-gray-50 dark:bg-slate-800 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="p-4 relative text-left">
                <span className="truncate block text-left">{t('projects.col.campaign')}</span>
                <div onMouseDown={(e) => startCampaignColResize(0, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
              </th>
              <th className="p-4 relative text-center">
                <span className="truncate block text-center">{t('projects.col.owner')}</span>
                <div onMouseDown={(e) => startCampaignColResize(1, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
              </th>
              <th className="p-4 relative text-center">
                <span className="truncate block text-center">{t('projects.col.dates')}</span>
                <div onMouseDown={(e) => startCampaignColResize(2, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
              </th>
              <th className="p-4 relative text-center">
                <span className="truncate block text-center">{t('projects.col.priority')}</span>
                <div onMouseDown={(e) => startCampaignColResize(3, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
              </th>
              <th className="p-4 relative text-center">
                <span className="truncate block text-center">{t('projects.col.status')}</span>
                <div onMouseDown={(e) => startCampaignColResize(4, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
              </th>
              <th className="p-4 relative text-center">
                <span className="truncate block text-center">{t('projects.col.notes')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
  {visibleCampaigns.map(c => {
    const isCampaignExpanded = Boolean(expandedCampaigns[c.id]);
    const rawSubtasks = campaignSubtasksMap[c.id] || [];
    const subtasks = filterCampaignSubtasksForUser(rawSubtasks, c);

    return (
      <React.Fragment key={c.id}>
        {/* Cấp 1: Hàng Campaign */}
        <tr
          onClick={() => onSelect?.(c)}
          className={`group border-t border-gray-100 dark:border-slate-800 hover-row-effect hover-row-campaign transition-all duration-200 ${onSelect ? 'cursor-pointer' : ''} ${deletingIds.includes(c.id) ? 'animate-fade-out' : ''} ${isCampaignExpanded ? 'bg-amber-50/20 dark:bg-[#071325]/50' : ''}`}
        >
          {/* Cột 1: Title có icon dropdown trước title */}
          <td className="p-4 relative overflow-hidden">
            <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 overflow-hidden">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCampaignExpand(c.id);
                }}
                className="p-1 -ml-1 text-slate-400 hover:text-amber-500 rounded-[6px] transition-transform hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer shrink-0"
                title={isCampaignExpanded ? (lang === 'en' ? 'Collapse tasks' : 'Thu gọn task') : (lang === 'en' ? 'Expand tasks' : 'Xem các task')}
                aria-label={isCampaignExpanded ? 'Collapse tasks' : 'Expand tasks'}
              >
                <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isCampaignExpanded ? 'rotate-90 text-amber-500' : ''}`} />
              </button>
              {(() => {
                const track = workflowTracks?.find(t => t.entity_type === 'campaign' && String(t.entity_id).trim() === String(c.id).trim());
                const leadIdStr = c.lead_id ? String(c.lead_id) : '';
                const leadName = String(c.lead?.name || '').trim().toLowerCase();
                const filteredSubs = (subtaskMap[c.id] || []).filter((assignee: any) => {
                  if (leadIdStr && String(assignee.id) === leadIdStr) return false;
                  if (leadName && String(assignee.name || '').trim().toLowerCase() === leadName) return false;
                  return true;
                });
                return (track?.phases?.length || 0) > 0 ? (
                  <EntityInfoPopover
                    entityType="campaign"
                    entity={c}
                    track={track}
                    leadPerson={c.lead || (c.creator ? { name: c.creator.name, avatar_url: c.creator.avatar_url } : null)}
                    subPersons={filteredSubs}
                  />
                ) : null;
              })()}
              <b className="block truncate text-gray-900 dark:text-white">{c.name}</b>
              {(() => {
                const track = workflowTracks?.find(t => t.entity_type === 'campaign' && String(t.entity_id).trim() === String(c.id).trim());
                const phases = track?.phases || [];
                const phaseCount = phases.length;
                const unassignedSubtasks = subtasks.filter(s => s.status !== 'deleted' && (!phaseCount || !s.workflow_phase_id));
                const unassignedCount = unassignedSubtasks.length;
                const isAllUnassignedDone = unassignedCount > 0 && unassignedSubtasks.every(s => isTaskDone(s.status));

                return (
                  <>
                    {unassignedCount > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-[5px] font-bold shrink-0 ${
                        isAllUnassignedDone
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-amber-100/90 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60'
                      }`}>
                        ({unassignedCount} Tasks)
                      </span>
                    )}
                  </>
                );
              })()}
              {hasComments[c.id] && (
                <CommentPreviewPopover
                  entityType="campaign"
                  entityId={c.id}
                  entityTitle={c.name}
                  hasUnreadDot={Boolean(Number(c.lead_id) === Number(profile?.id) || hasUnread[c.id])}
                />
              )}
            </div>
            {c.objective?.trim() ? <p className="text-xs text-gray-500 truncate mt-1 pl-6">{c.objective}</p> : null}
            {canManage(c) && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-[#0a192f]/95 shadow-sm rounded-lg px-1 py-0.5 border border-gray-200/80 dark:border-slate-700/80 z-10 grid grid-flow-col auto-cols-max items-center gap-0.5"
              >
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); void archive(c); }} 
                  className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-md transition-colors" 
                  title={t('common.hide')}
                >
                  <EyeOff size={14}/>
                </button>
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); void remove(c); }} 
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors" 
                  title={t('common.delete')}
                >
                  <Trash2 size={14}/>
                </button>
              </div>
            )}
          </td>

          {/* Cột 2: OWNER / PIC */}
          <td className="p-4 overflow-hidden text-center">
            <div className="grid place-content-center">
              <div className="grid grid-flow-col auto-cols-max items-center justify-center gap-2 overflow-hidden mx-auto">
                <div className="grid grid-flow-col auto-cols-max -space-x-2 shrink-0">
                  <Avatar name={c.lead?.name || t('common.unassigned')} src={c.lead?.avatar_url || undefined} className="w-7 h-7 text-[10px] border-2 border-white dark:border-slate-900 shadow-sm z-10" />
                </div>
                {(() => {
                  const leadIdStr = c.lead_id ? String(c.lead_id) : '';
                  const leadName = String(c.lead?.name || '').trim().toLowerCase();
                  const filteredSubs = (subtaskMap[c.id] || []).filter((assignee: any) => {
                    if (leadIdStr && String(assignee.id) === leadIdStr) return false;
                    if (leadName && String(assignee.name || '').trim().toLowerCase() === leadName) return false;
                    return true;
                  });
                  if (filteredSubs.length === 0) return null;
                  return (
                    <>
                      <span className="text-gray-300 dark:text-gray-600 px-1 shrink-0">|</span>
                      <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full border border-amber-100 dark:border-amber-800 shrink-0">
                        <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400">SUB</span>
                        <div className="grid grid-flow-col auto-cols-max -space-x-2">
                          {filteredSubs.slice(0,4).map((assignee: any) => <Avatar key={'s'+assignee.id} name={(assignee.name || 'Unknown') + ' (Subtask)'} src={assignee.avatar_url || undefined} className="w-6 h-6 text-[9px] border-2 border-white dark:border-slate-900 shadow-sm z-10 opacity-90" />)}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </td>

          {/* Cột 3: DATES */}
          <td className="p-4 overflow-hidden text-center text-sm text-gray-600 dark:text-gray-300">
            <div className="grid place-content-center">
              <div className="grid grid-flow-col auto-cols-max items-center justify-center gap-2 truncate mx-auto">
                <span>{formatDate(c.start_date)} – {formatDate(c.end_date)}</span>
                {c.end_date && (
                  <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 shrink-0">
                    <div className={`w-3 h-3 rounded-full border-[2.5px] ${getDueStatusColor(c.end_date, c.status)}`} title={`${t('common.dueDate')}: ${formatDate(c.end_date)}`} />
                    {getDueStatusLabel(c.end_date, c.status, lang === 'en')}
                  </div>
                )}
              </div>
            </div>
          </td>

          {/* Cột 4: PRIORITY */}
          <td className="p-4 overflow-hidden text-center">
            <div className="grid place-content-center">
              <div className="truncate">
                <span className={`px-2 py-1 rounded-[6px] text-xs font-semibold capitalize truncate ${priorityClass(campaignPriority(c))}`}>
                  {campaignPriority(c)}
                </span>
              </div>
            </div>
          </td>

          {/* Cột 6: STATUS */}
          <td className="p-4 overflow-hidden text-center" onClick={(e) => e.stopPropagation()}>
            <div className="grid place-content-center">
              <QuickStatusDropdown
                currentStatus={c.status || 'planning'}
                options={campaignStatusOptions}
                onSelect={(nextStatus) => handleQuickChangeCampaignStatus(c.id, nextStatus)}
                disabled={!canManage(c)}
              />
            </div>
          </td>

          {/* Cột 7: NOTES */}
          <td className="p-4 overflow-hidden text-center">
            <EntityNoteCell
              entityId={c.id}
              entityType="campaign"
              workspaceId={c.workspace_id}
              canEdit={canManage(c)}
              alignCenter={true}
            />
          </td>
        </tr>

        {/* Tree view lồng cấp 2 & cấp 3 khi Campaign được mở rộng */}
        {isCampaignExpanded && (
          <>
            {subtasks.map((st: any) => {
              const items = subtaskChecklistMap[st.id] || [];
              const doneCount = items.filter((i: any) => i.completed).length;
              const isSubtaskExpanded = Boolean(expandedSubtasks[st.id]);

              return (
                <React.Fragment key={st.id}>
                  {/* Cấp 2: Hàng Subtask */}
                  <tr
                    onClick={() => onOpenSubtask?.(st)}
                    className="group bg-amber-50/20 dark:bg-[#071325]/70 hover:bg-amber-50/40 dark:hover:bg-[#0c1f3b] border-t border-dashed border-amber-200/50 dark:border-slate-800/80 transition-colors cursor-pointer"
                  >
                    {/* Cột 1: Title subtask thụt lề pl-12, dây dọc left-6 */}
                    <td className="p-3 pl-10 relative overflow-hidden">
                      
                      <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 overflow-hidden">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSubtaskExpand(st.id);
                          }}
                          className="p-1 text-slate-400 hover:text-amber-600 rounded-[5px] transition-transform cursor-pointer shrink-0"
                          title={isSubtaskExpanded ? (lang === 'en' ? 'Collapse subtasks' : 'Thu gọn subtask') : (lang === 'en' ? 'Expand subtasks' : 'Xem các subtask')}
                        >
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isSubtaskExpanded ? 'rotate-90 text-amber-600' : ''}`} />
                        </button>
                        <ListTodo className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        
                        {editingSubtaskId === st.id ? (
                          <input
                            type="text"
                            value={editingSubtaskTitle}
                            onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                            onBlur={() => void handleSaveEditSubtask(st.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void handleSaveEditSubtask(st.id);
                              if (e.key === 'Escape') setEditingSubtaskId(null);
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-0.5 text-xs font-semibold rounded border border-amber-400 bg-white dark:bg-[#0a192f] text-slate-900 dark:text-white outline-none"
                          />
                        ) : (
                          <>
                            <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                              {st.title}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSubtaskId(st.id);
                                setEditingSubtaskTitle(st.title);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-opacity cursor-pointer shrink-0"
                              title={lang === 'en' ? 'Quick edit title' : 'Chỉnh sửa nhanh tên'}
                            >
                              <Pencil size={11} />
                            </button>
                          </>
                        )}

                        {Boolean(st.quantity) && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-[4px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                            SL: {st.quantity}
                          </span>
                        )}

                        {items.length > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-[4px] font-bold ${doneCount === items.length ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100/90 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'}`}>
                            ({doneCount}/{items.length} Subtasks)
                          </span>
                        )}

                        {(subtaskCommentMap[st.id] || 0) > 0 && (
                          <CommentPreviewPopover
                            entityType="campaign_subtask"
                            entityId={st.id}
                            entityTitle={st.title}
                            count={subtaskCommentMap[st.id]}
                            onOpenFull={() => onOpenSubtask?.(st)}
                          />
                        )}

                        {Array.isArray(st.tags) && st.tags.map((tag: string, tIdx: number) => (
                          <span
                            key={tIdx}
                            className="px-1.5 py-0.2 rounded-[4px] bg-amber-100/80 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px] font-semibold border border-amber-200/60 dark:border-amber-800/60 shrink-0"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {/* Hover action overlay on Column 1 */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-[#0a192f]/95 shadow-sm rounded-lg px-1 py-0.5 border border-gray-200/80 dark:border-slate-700/80 z-10 grid grid-flow-col auto-cols-max items-center gap-0.5"
                      >
                        {onOpenSubtask && (
                          <button
                            type="button"
                            onClick={() => onOpenSubtask(st)}
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition-colors"
                            title={lang === 'en' ? 'View details' : 'Xem chi tiết'}
                          >
                            <Eye size={13} />
                          </button>
                        )}
                        {canManage(c) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSubtask(st.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                            title={lang === 'en' ? 'Delete task' : 'Xóa task'}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Cột 2: OWNER / PIC */}
                    <td className="p-3 overflow-hidden text-center">
                      <div className="grid place-content-center">
                        <div className="grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 mx-auto">
                          <Avatar name={st.assignee?.name || t('common.unassigned')} src={st.assignee?.avatar_url} className="w-6 h-6 text-[9px] border-2 border-white dark:border-slate-900 shadow-xs" />
                          <span className="text-xs text-slate-700 dark:text-slate-300 truncate max-w-[110px]">{st.assignee?.name || '—'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Cột 3: DATES */}
                    <td className="p-3 overflow-hidden text-center text-xs text-slate-600 dark:text-slate-300">
                      <div className="grid place-content-center">
                        <div className="grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 truncate mx-auto">
                          <span>{st.start_date ? formatDate(st.start_date) : '—'} – {st.due_date ? formatDate(st.due_date) : '—'}</span>
                          {st.due_date && getDueStatusLabel(st.due_date, st.status, lang === 'en')}
                        </div>
                      </div>
                    </td>

                    {/* Cột 4: PRIORITY */}
                    <td className="p-3 overflow-hidden text-center">
                      <div className="grid place-content-center">
                        <span className={`px-2 py-0.5 rounded-[6px] text-[11px] font-semibold capitalize truncate ${priorityClass(st.priority || 'medium')}`}>
                          {st.priority || 'medium'}
                        </span>
                      </div>
                    </td>

                    {/* Cột 6: STATUS */}
                    <td className="p-3 overflow-hidden text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="grid place-content-center">
                        <QuickStatusDropdown
                          currentStatus={st.status || 'planning'}
                          options={campaignSubtaskStatusOptions}
                          onSelect={(nextStatus) => handleQuickChangeCampaignSubtaskStatus(st.id, nextStatus)}
                        />
                      </div>
                    </td>

                    {/* Cột 7: GHI CHÚ (EntityNoteCell) */}
                    <td className="p-3 overflow-hidden text-center">
                      <EntityNoteCell
                        entityId={st.id}
                        entityType="campaign_subtask"
                        workspaceId={c.workspace_id}
                        canEdit={canManage(c)}
                        alignCenter={true}
                      />
                    </td>
                  </tr>

                  {/* Cấp 3: Danh sách Đầu việc (Checklist Items bên trong Subtask) */}
                  {isSubtaskExpanded && (
                    <>
                      {items.map((item: any) => (
                        <tr
                          key={item.id}
                          onClick={() => onOpenSubtask?.({ ...st, checklist_item_id: item.id })}
                          className="group bg-amber-50/40 dark:bg-[#06101e] hover:bg-amber-50/60 dark:hover:bg-[#0a1e38] border-t border-dotted border-slate-200/80 dark:border-slate-800/80 transition-colors cursor-pointer"
                        >
                          {/* Cột 1: Title đầu việc thụt lề sâu pl-20, dây nối left-6 & left-14 */}
                          <td className="py-2 px-4 pl-16 relative overflow-hidden">
                            
                            <div className="grid grid-flow-col auto-cols-max items-center gap-2 overflow-hidden">
                              {/* Vòng tròn checkmark */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleToggleChecklistItem(st.id, item.id);
                                }}
                                className={`w-4 h-4 rounded-full border transition-all grid place-items-center cursor-pointer shrink-0 ${
                                  item.completed
                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-2xs'
                                    : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500 bg-white dark:bg-transparent'
                                }`}
                                title={item.completed ? (lang === 'en' ? 'Completed' : 'Hoàn thành') : (lang === 'en' ? 'Todo' : 'Cần làm')}
                              >
                                {item.completed && <Check size={10} strokeWidth={3} className="text-white" />}
                              </button>

                              {editingItemId === item.id ? (
                                <input
                                  type="text"
                                  value={editingItemTitle}
                                  onChange={(e) => setEditingItemTitle(e.target.value)}
                                  onBlur={() => void handleSaveEditChecklistItem(st.id, item.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') void handleSaveEditChecklistItem(st.id, item.id);
                                    if (e.key === 'Escape') setEditingItemId(null);
                                  }}
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                  className="px-2 py-0.5 text-xs rounded border border-amber-400 bg-white dark:bg-[#0a192f] text-slate-900 dark:text-white outline-none"
                                />
                              ) : (
                                <>
                                  <span className={`text-xs truncate ${item.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200 font-medium'}`}>
                                    {item.title}
                                  </span>
                                  {Boolean(item.quantity) && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-[4px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                                      SL: {item.quantity}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingItemId(item.id);
                                      setEditingItemTitle(item.title);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-opacity cursor-pointer shrink-0"
                                    title={lang === 'en' ? 'Quick edit' : 'Chỉnh sửa nhanh'}
                                  >
                                    <Pencil size={11} />
                                  </button>
                                </>
                              )}
                            </div>

                            {/* Hover delete button on Title cell */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDeleteChecklistItem(st.id, item.id);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-opacity cursor-pointer"
                              title={lang === 'en' ? 'Delete subtask' : 'Xóa subtask'}
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>

                          {/* Cột 2: OWNER / PIC */}
                          <td className="py-2 px-4 overflow-hidden text-center">
                            <div className="grid place-content-center">
                              <div className="grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 mx-auto">
                                <Avatar
                                  name={item.created_by_name || 'ADMIN'}
                                  src={item.created_by_avatar || (people || []).find((p: any) => p.id === item.created_by || p.name === item.created_by_name)?.avatar_url}
                                  className="w-5 h-5 text-[8.5px] border border-white dark:border-slate-900 shadow-2xs"
                                />
                                <span className="text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[110px]">
                                  {item.created_by_name || 'ADMIN'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Cột 3: DATES */}
                          <td className="py-2 px-4 overflow-hidden text-center text-[11px] text-slate-500 dark:text-slate-400">
                            <div className="grid place-content-center">
                              <div className="grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 truncate mx-auto">
                                <span>{item.due_date ? formatDate(item.due_date) : (item.created_at ? formatDate(item.created_at) : '—')}</span>
                                {item.due_date && getDueStatusLabel(item.due_date, item.completed ? 'completed' : 'todo', lang === 'en')}
                              </div>
                            </div>
                          </td>

                          {/* Cột 4: PRIORITY */}
                          <td className="py-2 px-4 overflow-hidden text-center">
                            <div className="grid place-content-center">
                              <span className={`px-1.5 py-0.5 rounded-[6px] text-[10px] font-semibold capitalize truncate ${priorityClass(item.priority || 'medium')}`}>
                                {item.priority || 'medium'}
                              </span>
                            </div>
                          </td>

                          {/* Cột 6: STATUS */}
                          <td className="py-2 px-4 overflow-hidden text-center">
                            <div className="grid place-content-center">
                              <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold ${item.completed ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50' : 'bg-slate-100 text-slate-600 dark:bg-[#0a192f] dark:text-slate-300 border border-slate-200 dark:border-slate-700/80'}`}>
                                {item.completed ? (lang === 'en' ? 'Done' : 'Đã xong') : (lang === 'en' ? 'Todo' : 'Cần làm')}
                              </span>
                            </div>
                          </td>

                          {/* Cột 7: GHI CHÚ (EntityNoteCell) */}
                          <td className="py-2 px-4 overflow-hidden text-center">
                            <EntityNoteCell
                              entityId={item.id}
                              entityType="campaign_item"
                              workspaceId={c.workspace_id}
                              canEdit={canManage(c)}
                              alignCenter={true}
                            />
                          </td>
                        </tr>
                      ))}

                      {/* Thanh tạo đầu việc mới */}
                      <tr className="bg-amber-50/20 dark:bg-[#06101e] border-t border-dotted border-slate-200/60 dark:border-slate-800/60">
                        <td colSpan={6} className="py-2 px-4 pl-16 relative">
                          
                          {creatingItemSubtaskId === st.id ? (
                            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-2 p-2 rounded-[8px] bg-white dark:bg-[#0a192f] border border-amber-300/80 dark:border-amber-700/60 shadow-xs">
                              <input
                                type="text"
                                value={newItemTitle}
                                onChange={(e) => setNewItemTitle(e.target.value)}
                                placeholder={lang === 'en' ? 'Subtask title...' : 'Tiêu đề subtask mới...'}
                                className="px-2.5 py-1 text-xs rounded-[6px] border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-0"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') void handleCreateChecklistItem(st.id);
                                  if (e.key === 'Escape') setCreatingItemSubtaskId(null);
                                }}
                              />
                              <div className="tw-calendar-picker relative">
                                <input
                                  type="text"
                                  id={`inline-camp-chk-due-${st.id}`}
                                  readOnly
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if ((window as any).openCalendar) {
                                      (window as any).openCalendar({ displayId: `inline-camp-chk-due-${st.id}`, mode: 'single' }, e);
                                    }
                                  }}
                                  value={newItemDue}
                                  onChange={(e) => setNewItemDue(e.target.value)}
                                  placeholder="dd/mm/yyyy"
                                  className="w-28 px-2 py-1 text-[11px] rounded-[6px] border border-slate-300 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-300 cursor-pointer text-center"
                                />
                              </div>
                              <select
                                value={newItemPriority}
                                onChange={(e) => setNewItemPriority(e.target.value)}
                                className="px-2 py-1 text-[11px] rounded-[6px] border border-slate-300 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-300"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                              </select>
                              <input
                                type="number"
                                value={newItemQuantity}
                                onChange={(e) => setNewItemQuantity(e.target.value)}
                                placeholder="SL"
                                className="w-14 px-2 py-1 text-[11px] rounded-[6px] border border-slate-300 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-300"
                                title="Sản lượng"
                              />
                              <button
                                type="button"
                                onClick={() => void handleCreateChecklistItem(st.id)}
                                className="px-3 py-1 rounded-[6px] bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors shadow-2xs cursor-pointer"
                              >
                                {lang === 'en' ? 'Add' : 'Thêm'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCreatingItemSubtaskId(null);
                                  setNewItemTitle('');
                                }}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setCreatingItemSubtaskId(st.id);
                                setNewItemTitle('');
                                setNewItemDue('');
                                setNewItemPriority('medium');
                                setNewItemQuantity('');
                              }}
                              className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5 px-3 py-1 rounded-[8px] border border-dashed border-slate-300/80 dark:border-slate-700/80 bg-transparent text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-300 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/60 dark:hover:bg-amber-950/30 text-[11px] font-semibold transition-all cursor-pointer"
                            >
                              <Plus size={12} />
                              <span>{lang === 'en' ? '+ Add Subtask' : '+ Thêm Subtask'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    </>
                  )}
                </React.Fragment>
              );
            })}

            {/* Thanh tạo task mới cho Campaign */}
            <tr className="bg-amber-50/15 dark:bg-[#071325]/50 border-t border-dashed border-amber-200/50 dark:border-slate-800/80">
              <td colSpan={6} className="py-2.5 px-4 pl-10 relative">
                {creatingSubtaskCampaignId === c.id ? (
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-2 p-2.5 rounded-[8px] bg-white dark:bg-[#0a192f] border border-amber-300 dark:border-amber-700 shadow-sm">
                    <input
                      type="text"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      placeholder={lang === 'en' ? 'Task title...' : 'Tiêu đề task mới...'}
                      className="px-2.5 py-1 text-xs rounded-[6px] border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-0"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleCreateSubtask(c.id);
                        if (e.key === 'Escape') setCreatingSubtaskCampaignId(null);
                      }}
                    />
                    <select
                      value={newSubtaskPic}
                      onChange={(e) => setNewSubtaskPic(e.target.value)}
                      className="px-2 py-1 text-[11px] rounded-[6px] border border-slate-300 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-300"
                    >
                      <option value="">{lang === 'en' ? '-- Select PIC --' : '-- Chọn PIC --'}</option>
                      {(people || []).map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <div className="tw-calendar-picker relative">
                      <input
                        type="text"
                        id={`inline-camp-st-due-${c.id}`}
                        readOnly
                        onClick={(e) => {
                          e.stopPropagation();
                          if ((window as any).openCalendar) {
                            (window as any).openCalendar({ displayId: `inline-camp-st-due-${c.id}`, mode: 'single' }, e);
                          }
                        }}
                        value={newSubtaskDue}
                        onChange={(e) => setNewSubtaskDue(e.target.value)}
                        placeholder="dd/mm/yyyy"
                        className="w-28 px-2 py-1 text-[11px] rounded-[6px] border border-slate-300 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-300 cursor-pointer text-center"
                      />
                    </div>
                    <select
                      value={newSubtaskPriority}
                      onChange={(e) => setNewSubtaskPriority(e.target.value)}
                      className="px-2 py-1 text-[11px] rounded-[6px] border border-slate-300 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-300"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleCreateSubtask(c.id)}
                      className="px-3 py-1 rounded-[6px] bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors shadow-2xs cursor-pointer"
                    >
                      {lang === 'en' ? 'Save Task' : 'Lưu Task'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreatingSubtaskCampaignId(null);
                        setNewSubtaskTitle('');
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingSubtaskCampaignId(c.id);
                      setNewSubtaskTitle('');
                      setNewSubtaskPic('');
                      setNewSubtaskDue('');
                      setNewSubtaskPriority('medium');
                    }}
                    className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] border border-dashed border-slate-300/80 dark:border-slate-700/80 bg-transparent text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-300 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/60 dark:hover:bg-amber-950/30 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>{lang === 'en' ? '+ Add Task' : '+ Thêm Task'}</span>
                  </button>
                )}
              </td>
            </tr>
          </>
        )}
      </React.Fragment>
    );
  })}
</tbody>
        </table>
        {!visibleCampaigns.length && (
          <p className="p-8 text-center text-sm text-gray-400">
            {campaigns.length > 0 ? (lang === 'en' ? 'No campaigns match current filters.' : 'Không có chiến dịch phù hợp bộ lọc.') : t('projects.noCampaigns')}
          </p>
        )}
      </div></>}
    <ConfirmDeleteModal isOpen={!!campaignToDelete} title="Xóa Chiến dịch" message={`Bạn có chắc muốn xóa "${campaignToDelete?.name}"? Tất cả subtask thuộc chiến dịch này cũng sẽ bị xóa.`} onConfirm={executeRemove} onCancel={() => setCampaignToDelete(null)} />
    <ConfirmHideModal isOpen={!!campaignToHide} title="Ẩn Chiến dịch" message={`Bạn có chắc muốn ẩn chiến dịch "${campaignToHide?.name}"? Chiến dịch sẽ được đưa vào lưu trữ và có thể khôi phục sau.`} onConfirm={executeHide} onCancel={() => setCampaignToHide(null)} />
    </section>
  );
};
