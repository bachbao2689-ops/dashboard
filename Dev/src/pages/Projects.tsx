import {EntityStatusField} from '../components/features/projects/EntityStatusField';
import {useReadEntityNotifications} from '../hooks/useReadEntityNotifications';
import {ActionButton} from '../components/common/ActionButton';
import {MultiSelect} from '../components/common/MultiSelect';
import React from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {officialReadEnabled} from '../services/officialReadOnly';
import {WorkflowTrackingSummary} from '../components/features/projects/WorkflowTrackingSummary';
import {TaskDetailPanel} from '../components/features/tasks/TaskDetailPanel';
import {TaskDescriptionViewer} from '../components/features/tasks/TaskDescriptionViewer';
import {Avatar} from '../components/common/Avatar';
import {SmartCommentInput} from '../components/features/comments/SmartCommentInput';
import {CommentMessage} from '../components/features/comments/CommentMessage';
import {ChevronDown,ChevronRight,FolderKanban,MessageSquare,Plus,Users,X,Trash2,Calendar,Clock3,Eye,EyeOff,ListTodo,Check,CheckCircle2,Pencil,FileText,Edit3,Layers,Megaphone} from 'lucide-react';
import {ConfirmDeleteModal} from '../components/common/ConfirmDeleteModal';
import {ConfirmHideModal} from '../components/common/ConfirmHideModal';
import {CampaignPanel} from '../components/features/projects/CampaignPanel';
import {SubtaskDetailPanel} from '../components/features/projects/SubtaskDetailPanel';
import {DepartmentFilterDropdown,StatusFilterDropdown,PicFilterDropdown,DateFilterDropdown,PriorityFilterDropdown} from '../components/common/filters';
import {dateValue,priorityClass,getDueStatusColor,getDueStatusLabel} from '../components/features/projects/projectPresentation';
import {useProjectsController} from '../hooks/useProjectsController';
import {useResizableColumns} from '../hooks/useResizableColumns';
import {useRememberedState} from '../hooks/useRememberedState';
import {EntityActionBadges} from '../components/features/projects/EntityActionBadges';
import {EntityNoteCell, getCachedNote} from '../components/features/projects/EntityNoteCell';
import {useUiStore} from '../store/uiStore';
import {supabase} from '../services/supabase';
import toast from 'react-hot-toast';
import {CampaignDetailDrawer} from '../components/features/projects/CampaignDetailDrawer';
import {EntityInfoPopover} from '../components/features/projects/EntityInfoPopover';
import {CommentPreviewPopover} from '../components/common/CommentPreviewPopover';
import {TaskPinButton} from '../components/features/tasks/TaskPinButton';
import {taskKey,isTaskDone} from '../lib/taskTracking';
import {isGlobalManager, isDepartmentLeader, isAdmin} from '../lib/roleScope';
import {QuickStatusDropdown} from '../components/common/QuickStatusDropdown';
import {ProjectViewModeDropdown} from '../components/features/projects/ProjectViewModeDropdown';
import {ProjectsKanbanBoard} from '../components/features/projects/ProjectsKanbanBoard';
import {SlidingToolbarGroup} from '../components/common/SlidingToolbarGroup';
import {useTasks} from '../hooks/useTasks';
export const Projects:React.FC=()=>{
 const initialProjectColWidths = React.useMemo(() => [320, 180, 240, 120, 150, 220], []);
 const { tableRef: projectTableRef, widths: projectColWidths, startResize: startProjectColResize } = useResizableColumns({
   tableKey: 'projects_table_v2',
   initialWidths: initialProjectColWidths,
   minWidth: 95,
 });
 const [searchParams, setSearchParams] = useSearchParams();
 const state=useProjectsController();
 const sourceTaskResource=useTasks(Boolean(state.sourceTask));
 React.useEffect(() => {
   if (searchParams.get("action") === "new") {
     state.resetCreateForm();
     state.setCreationType("project");
     state.setSelected(null);
     state.setSelectedCampaign(null);
     state.setCreateOpen(true);
     const nextParams = new URLSearchParams(searchParams);
     nextParams.delete("action");
     setSearchParams(nextParams, { replace: true });
   }
 }, [searchParams]);
 const rootCampaignIds=React.useMemo(()=>new Set(state.workflow.tracks.filter(track=>track.entity_type==='campaign'&&track.root).map(track=>track.entity_id)),[state.workflow.tracks]);
         const {creationPeople,creationDepartments,userIsRestricted: _userIsRestricted,resolvedDeptId: _resolvedDeptId,viewMode,setViewMode,visibleCampaigns,handleUpdateProjectStatus,handleUpdateCampaignStatus,campaignStatus,setCampaignStatus,hasCampaignComments,departments,departmentId,setDepartmentId,departmentFilter,setDepartmentFilter,editStatus,setEditStatus,t,lang,setParams,workflow,sourceTask,setSourceTask,profile,canCreate,canManageProject,projects,setProjects,people,selected,setSelected,picMembers,selectedCampaign,setSelectedCampaign,selectedRoot,projectsExpanded,setProjectsExpanded,createOpen,setCreateOpen,creating,executionMemberIds,setExecutionMemberIds,projectPrimaryOwners,projectToDelete,setProjectToDelete,deletingIds,projectToHide,setProjectToHide,subtaskToDelete,setSubtaskToDelete,title,setTitle,description,setDescription,campaignSubtaskToDelete,setCampaignSubtaskToDelete,start,setStart,due,setDue,priority,setPriority,ownerIds,setOwnerIds,creationType,setCreationType,showAdvanced,setShowAdvanced,primaryOwnerId,setPrimaryOwnerId,parentCampaignId,campaignObjective,setCampaignObjective,campaignBudget,setCampaignBudget,campaignChannels,setCampaignChannels,attachmentUrl,setAttachmentUrl,attachmentFile,setAttachmentFile,campaigns,subtasks,setSubtasks,comments,selectedSubtask,setSelectedSubtask,subtaskCommentCounts,subtaskChecklistCounts,subtaskQuantities,hasMentionOrUnread,recentlyCompletedSubtaskId,setRecentlyCompletedSubtaskId,setRefreshDetailTrigger,removeComment,saveEditedComment,newSubtask,setNewSubtask,editMode,setEditMode,showSubtaskForm,setShowSubtaskForm,width,resizing,setResizing,subtaskOwner,setSubtaskOwner,subtaskDue,setSubtaskDue,subtaskQuantity,setSubtaskQuantity,subtaskPriority,setSubtaskPriority,comment,setComment,panelOpen,visiblePeople,projectCommentInput,hasComments,subtaskMembers,searchTerm: _searchTerm,setSearchTerm: _setSearchTerm,statusFilter,setStatusFilter,picFilter,setPicFilter,calendarFilter,setCalendarFilter,customStartDate,setCustomStartDate,customEndDate,setCustomEndDate,priorityFilter,setPriorityFilter,activeDropdown,setActiveDropdown,toolbarRef,hasActiveFilters,handleResetFilters,campaignFilters,visibleProjects,resetCreateForm,selectParentCampaign,createItem,executeRemoveSubtask,executeRemoveCampaignSubtask,removeSubtask,toggleSubtask,saveInlineEdit,executeHideProject,archiveProject,executeRemoveProject,removeProject,addSubtask,addComment}=state;
  const activeDepartments = React.useMemo(() => {
    return departments.filter(d =>
      projects.some(p => String(p.department_id) === String(d.id)) ||
      campaigns.some(c => String(c.department_id) === String(d.id))
    );
  }, [departments, projects, campaigns]);
  const [entityFilter, setEntityFilter] = useRememberedState<'all' | 'campaign' | 'project'>('projects.boardEntityFilter', 'all');
  const totalCampaigns = visibleCampaigns.length;
  const totalProjects = visibleProjects.length;
  const totalItems = totalCampaigns + totalProjects;
  const [projectSubtasksCollapsed, setProjectSubtasksCollapsed] = React.useState(false);
  const [isEditingProjectDesc, setIsEditingProjectDesc] = React.useState(false);
  const [projectDescDraft, setProjectDescDraft] = React.useState('');
  const [savingProjectDesc, setSavingProjectDesc] = React.useState(false);

  const detailDrawerRef = React.useRef<HTMLDivElement>(null);

  // Auto-close detail drawer when clicking outside ("staff bấm chỗ khác thì tự crop vào")
  React.useEffect(() => {
    if (!panelOpen) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (detailDrawerRef.current && detailDrawerRef.current.contains(target)) return;
      // Không đóng nếu click vào calendar portal, toast, dialog portal, menu
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
      setSelected(null);
      setSelectedCampaign(null);
      setSelectedSubtask(null);
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
  }, [panelOpen, setSelected, setSelectedCampaign, setSelectedSubtask]);

  const handleSaveProjectDesc = async () => {
    if (!selected) return;
    setSavingProjectDesc(true);
    try {
      const { error } = await supabase.from('projects').update({ description: projectDescDraft }).eq('id', selected.id);
      if (error) throw error;
      const updated = { ...selected, description: projectDescDraft };
      setSelected(updated);
      setProjects(items => items.map(p => p.id === selected.id ? { ...p, description: projectDescDraft } : p));
      window.dispatchEvent(new Event('projects:changed'));
      toast.success(lang === 'en' ? 'Description updated' : 'Đã cập nhật mô tả');
      setIsEditingProjectDesc(false);
    } catch (err: any) {
      toast.error(err?.message || (lang === 'en' ? 'Failed to update description' : 'Lỗi cập nhật mô tả'));
    } finally {
      setSavingProjectDesc(false);
    }
  };
  const formatCreatedAt = (value?: string | null) => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    return `${time} ${date}`;
  };
 const projectCollaboratorIds = React.useMemo(() => {
   if (!selected) return [];
   const ids = new Set<string>();
   if (selected.created_by) ids.add(String(selected.created_by));
   if (selected.lead_id) ids.add(String(selected.lead_id));
   (picMembers[selected.id] || []).forEach(id => ids.add(String(id)));
   (subtaskMembers[selected.id] || []).forEach(id => ids.add(String(id)));
   (comments || []).forEach(c => { if (c.user_id) ids.add(String(c.user_id)); });
   return Array.from(ids);
 }, [selected, picMembers, subtaskMembers, comments]);
 const canManageSelectedProject = React.useMemo(() => {
   if (!selected) return false;
   return Boolean(selectedRoot || canManageProject(selected) || isGlobalManager(profile) || isDepartmentLeader(profile));
 }, [selected, selectedRoot, canManageProject, profile]);
 useReadEntityNotifications(selectedCampaign ? 'campaign' : 'project', selectedCampaign?.id || selected?.id, Boolean(panelOpen && !createOpen && (selectedCampaign || selected)));
  // Tree View States (Project -> Subtask -> Đầu việc / Checklist)
  const [expandedProjects, setExpandedProjects] = React.useState<Record<string, boolean>>({});
  const [expandedProjectSubtasks, setExpandedProjectSubtasks] = React.useState<Record<string, boolean>>({});
  const [projectSubtasksMap, setProjectSubtasksMap] = React.useState<Record<string, any[]>>({});
  const [campaignSubtasksMap, setCampaignSubtasksMap] = React.useState<Record<string, any[]>>({});
  const [campaignSubtaskAssigneesMap, setCampaignSubtaskAssigneesMap] = React.useState<Record<string, any[]>>({});
  const [projectSubtaskChecklistMap, setProjectSubtaskChecklistMap] = React.useState<Record<string, any[]>>({});
  const [treeSubtaskCommentCounts, setTreeSubtaskCommentCounts] = React.useState<Record<string, number>>({});
  const projectTreeIds = React.useMemo(() => projects.map(project => String(project.id)).sort().join(','), [projects]);
  const campaignTreeIds = React.useMemo(() => campaigns.map(campaign => String(campaign.id)).sort().join(','), [campaigns]);
  const [openNoteEntityIds, setOpenNoteEntityIds] = React.useState<Record<string, boolean>>({});
  const setIsScanMode = useUiStore(s => s.setIsScanMode);
  const isDetailActive = Boolean(selected || selectedCampaign || selectedSubtask);

  const filterProjectSubtasksForUser = React.useCallback((items: any[], proj: any) => {
    if (isGlobalManager(profile) || isAdmin(profile) || isDepartmentLeader(profile)) return items;
    const myId = profile?.id != null ? Number(profile.id) : null;
    if (!myId) return items;
    const isPrimaryLeadOrCreator = Boolean(
      (proj?.lead_id && Number(proj.lead_id) === myId) ||
      (proj?.created_by && Number(proj.created_by) === myId) ||
      (proj?.id && String(projectPrimaryOwners[proj.id]) === String(myId))
    );
    if (isPrimaryLeadOrCreator) return items;
    return items.filter(st => {
      if (st.assignee_id != null && Number(st.assignee_id) === myId) return true;
      if (st.created_by != null && Number(st.created_by) === myId) return true;
      const checklist = projectSubtaskChecklistMap[st.id] || [];
      if (checklist.some((ci: any) => Number(ci.created_by) === myId || Number(ci.assignee_id) === myId)) return true;
      return false;
    });
  }, [profile, projectPrimaryOwners, projectSubtaskChecklistMap]);

  React.useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1280;
    if (isMobile && isDetailActive) {
      setIsScanMode(true);
    } else if (isMobile) {
      setIsScanMode(false);
    }
    return () => {
      if (isMobile) setIsScanMode(false);
    };
  }, [isDetailActive, setIsScanMode]);

  React.useEffect(() => {
    if (!panelOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (resizing) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('.dashboard-detail-drawer, [data-filter-popover], .tw-calendar-modal, .vanilla-calendar, [role="dialog"], [role="listbox"], .smart-mention-popup, .modal-backdrop')) {
        return;
      }
      if (target.closest('.hover-row-campaign, .hover-row-project, [data-board-card]')) {
        return;
      }
      setSelected(null);
      setSelectedCampaign(null);
      setSelectedSubtask(null);
      setParams({}, { replace: true });
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [panelOpen, resizing, setSelected, setSelectedCampaign, setSelectedSubtask, setParams]);

  // Inline Creation: Project Subtask
  const [creatingSubtaskProjectId, setCreatingSubtaskProjectId] = React.useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = React.useState('');
  const [newSubtaskPic, setNewSubtaskPic] = React.useState('');
  const [newSubtaskDue, setNewSubtaskDue] = React.useState('');
  const [newSubtaskPriority, setNewSubtaskPriority] = React.useState('medium');

  // Quick Edit States (Subtask & Checklist Title)
  const [editingSubtaskId, setEditingSubtaskId] = React.useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = React.useState('');
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [editingItemTitle, setEditingItemTitle] = React.useState('');

  const toIsoDate = (val?: string) => {
    if (!val) return null;
    if (val.includes('/')) return val.split('/').reverse().join('-');
    return val;
  };

  // Inline Creation: Đầu việc (Checklist item)
  const [creatingItemSubtaskId, setCreatingItemSubtaskId] = React.useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = React.useState('');
  const [newItemDue, setNewItemDue] = React.useState('');
  const [newItemPriority, setNewItemPriority] = React.useState('medium');
  const [newItemQuantity, setNewItemQuantity] = React.useState('');

  const toggleProjectExpand = (id: string) => {
    setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleProjectSubtaskExpand = (id: string) => {
    setExpandedProjectSubtasks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const loadProjectTreeData = React.useCallback(async () => {
    const projectIds = projectTreeIds ? projectTreeIds.split(',') : [];
    const campaignIds = campaignTreeIds ? campaignTreeIds.split(',') : [];
    if (!projectIds.length && !campaignIds.length) {
      setProjectSubtasksMap({});
      setCampaignSubtasksMap({});
      setCampaignSubtaskAssigneesMap({});
      setProjectSubtaskChecklistMap({});
      setTreeSubtaskCommentCounts({});
      return;
    }
    const [{ data: allProjectSubtasks }, { data: allCampaignSubtasks }, { data: canonicalTasks }] = await Promise.all([
      projectIds.length ? supabase
        .from('project_subtasks')
        .select('*, assignee:assignee_id(id,name,avatar_url)')
        .in('project_id', projectIds)
        .neq('status', 'deleted')
        .neq('status', 'archived')
        .order('created_at', { ascending: true }) : Promise.resolve({data:[],error:null} as any),
      campaignIds.length ? supabase
        .from('campaign_subtasks')
        .select('*, assignee:assignee_id(id,name,avatar_url)')
        .in('campaign_id', campaignIds)
        .neq('status', 'deleted')
        .neq('status', 'archived')
        .order('created_at', { ascending: true }) : Promise.resolve({data:[],error:null} as any),
      campaignIds.length ? supabase
        .from('tasks')
        .select('campaign_id, assignee:assignee_id(id,name,avatar_url)')
        .in('campaign_id', campaignIds)
        .not('campaign_id', 'is', null)
        .is('project_id', null)
        .neq('status', 'deleted')
        .neq('status', 'archived') : Promise.resolve({data:[],error:null} as any)
    ]);

    const pSubMap: Record<string, any[]> = {};
    (allProjectSubtasks || []).forEach((st: any) => {
      if (!pSubMap[st.project_id]) pSubMap[st.project_id] = [];
      pSubMap[st.project_id].push(st);
    });
    setProjectSubtasksMap(pSubMap);

    const cSubMap: Record<string, any[]> = {};
    (allCampaignSubtasks || []).forEach((st: any) => {
      if (!cSubMap[st.campaign_id]) cSubMap[st.campaign_id] = [];
      cSubMap[st.campaign_id].push(st);
    });
    setCampaignSubtasksMap(cSubMap);

    const cAssignees: Record<string, any[]> = {};
    [...(allCampaignSubtasks || []), ...(canonicalTasks || [])].forEach((st: any) => {
      if (!st.assignee || !st.campaign_id) return;
      if (!cAssignees[st.campaign_id]) cAssignees[st.campaign_id] = [];
      if (!cAssignees[st.campaign_id].find((x: any) => x.id === st.assignee.id)) {
        cAssignees[st.campaign_id].push(st.assignee);
      }
    });
    setCampaignSubtaskAssigneesMap(cAssignees);

    const subtaskIds = (allProjectSubtasks || []).map((s: any) => s.id);
    if (subtaskIds.length > 0) {
      const [{ data: detailsData }, { data: commentsData }] = await Promise.all([
        supabase
          .from('activity_log')
          .select('entity_id, metadata, created_at')
          .eq('entity_type', 'project_subtask')
          .eq('action', 'details_updated')
          .in('entity_id', subtaskIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('activity_log')
          .select('entity_id')
          .eq('entity_type', 'project_subtask')
          .eq('action', 'comment')
          .in('entity_id', subtaskIds),
      ]);

      const cMap: Record<string, number> = {};
      (commentsData || []).forEach((row: any) => {
        cMap[row.entity_id] = (cMap[row.entity_id] || 0) + 1;
      });
      setTreeSubtaskCommentCounts(cMap);

      const chkMap: Record<string, any[]> = {};
      (detailsData || []).forEach((row: any) => {
        if (!chkMap[row.entity_id] && row.metadata && Array.isArray(row.metadata.checklist_items)) {
          chkMap[row.entity_id] = row.metadata.checklist_items;
        }
      });
      setProjectSubtaskChecklistMap(chkMap);
    } else {
      setTreeSubtaskCommentCounts({});
      setProjectSubtaskChecklistMap({});
    }
  }, [projectTreeIds, campaignTreeIds]);

  React.useEffect(() => {
    void loadProjectTreeData();
    const handleTreeChanged = () => { void loadProjectTreeData(); };
    window.addEventListener('project-tree:changed', handleTreeChanged);
    return () => window.removeEventListener('project-tree:changed', handleTreeChanged);
  }, [loadProjectTreeData]);

  const handleCreateProjectSubtask = async (projectId: string) => {
    if (!newSubtaskTitle.trim()) {
      toast.error(lang === 'en' ? 'Please enter subtask title' : 'Vui lòng nhập tên subtask');
      return;
    }
    const { data, error } = await supabase.from('project_subtasks').insert({
      project_id: projectId,
      title: newSubtaskTitle.trim(),
      assignee_id: newSubtaskPic ? Number(newSubtaskPic) : null,
      due_date: toIsoDate(newSubtaskDue),
      priority: newSubtaskPriority || 'medium',
      status: 'planning',
    }).select('*, assignee:assignee_id(id,name,avatar_url)').single();

    if (error || !data) {
      toast.error(error?.message || 'Không thể tạo subtask');
      return;
    }
    toast.success(lang === 'en' ? 'Subtask created' : 'Đã tạo subtask thành công');
    setCreatingSubtaskProjectId(null);
    setNewSubtaskTitle('');
    setNewSubtaskPic('');
    setNewSubtaskDue('');
    setNewSubtaskPriority('medium');
    setExpandedProjects(prev => ({ ...prev, [projectId]: true }));
    await loadProjectTreeData();
    window.dispatchEvent(new Event('tasks:changed'));
  };

  const handleQuickCreateProjectSubtask = async (projectId: string, customTitle: string) => {
    if (!customTitle.trim()) return;
    const { error } = await supabase.from('project_subtasks').insert({
      project_id: projectId,
      title: customTitle.trim(),
      priority: 'medium',
      status: 'planning',
    });
    if (error) { toast.error(error.message); return; }
    toast.success(lang === 'en' ? 'Subtask created' : 'Đã tạo subtask');
    setExpandedProjects(prev => ({ ...prev, [projectId]: true }));
    await loadProjectTreeData();
    window.dispatchEvent(new Event('tasks:changed'));
  };

  const handleDeleteProjectSubtask = async (subtaskId: string) => {
    const { error } = await supabase.from('project_subtasks').update({ status: 'deleted' }).eq('id', subtaskId);
    if (error) {
      toast.error('Không thể xóa subtask');
      return;
    }
    toast.success('Đã xóa subtask');
    await loadProjectTreeData();
    window.dispatchEvent(new Event('tasks:changed'));
  };

  const handleQuickChangeProjectStatus = async (projectId: string, nextStatus: string) => {
    const { error } = await supabase.from('projects').update({ status: nextStatus }).eq('id', projectId);
    if (error) {
      toast.error(lang === 'en' ? 'Failed to update status' : 'Không thể cập nhật trạng thái');
      return;
    }
    toast.success(lang === 'en' ? 'Status updated' : 'Đã cập nhật trạng thái');
    await loadProjectTreeData();
    window.dispatchEvent(new Event('projects:changed'));
    window.dispatchEvent(new Event('tasks:changed'));
  };

  const handleQuickChangeProjectSubtaskStatus = async (subtaskId: string, nextStatus: string) => {
    const { error } = await supabase.from('project_subtasks').update({ status: nextStatus }).eq('id', subtaskId);
    if (error) {
      toast.error(lang === 'en' ? 'Failed to update status' : 'Không thể cập nhật trạng thái');
      return;
    }
    toast.success(lang === 'en' ? 'Status updated' : 'Đã cập nhật trạng thái');
    await loadProjectTreeData();
    window.dispatchEvent(new Event('tasks:changed'));
  };

  const projectStatusOptions = React.useMemo(() => [
    { value: 'draft', label: lang === 'en' ? 'Draft / To-do' : 'Bản nháp', dotColor: 'bg-slate-400' },
    { value: 'planning', label: lang === 'en' ? 'Planning' : 'Lên kế hoạch', dotColor: 'bg-purple-500' },
    { value: 'active', label: lang === 'en' ? 'In Progress' : 'Đang thực hiện', dotColor: 'bg-sky-500' },
    { value: 'on_hold', label: lang === 'en' ? 'On Hold' : 'Tạm dừng', dotColor: 'bg-amber-500' },
    { value: 'completed', label: lang === 'en' ? 'Completed' : 'Hoàn thành', dotColor: 'bg-emerald-500' },
  ], [lang]);

  const subtaskStatusOptions = React.useMemo(() => [
    { value: 'todo', label: lang === 'en' ? 'Draft / To-do' : 'Chưa bắt đầu', dotColor: 'bg-slate-400' },
    { value: 'planning', label: lang === 'en' ? 'Planning' : 'Lên kế hoạch', dotColor: 'bg-purple-500' },
    { value: 'in_progress', label: lang === 'en' ? 'In Progress' : 'Đang thực hiện', dotColor: 'bg-sky-500' },
    { value: 'on_hold', label: lang === 'en' ? 'On Hold' : 'Tạm dừng', dotColor: 'bg-amber-500' },
    { value: 'completed', label: lang === 'en' ? 'Completed' : 'Hoàn thành', dotColor: 'bg-emerald-500' },
  ], [lang]);

  const handleCreateProjectChecklistItem = async (subtaskId: string) => {
    if (!newItemTitle.trim() || !profile?.id) {
      toast.error(lang === 'en' ? 'Please enter subtask title' : 'Vui lòng nhập tên subtask');
      return;
    }
    const currentList = projectSubtaskChecklistMap[subtaskId] || [];
    const numQ = Number(newItemQuantity);
    const newItem: any = {
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
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
      entity_type: 'project_subtask',
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
    setExpandedProjectSubtasks(prev => ({ ...prev, [subtaskId]: true }));
    setProjectSubtaskChecklistMap(prev => ({ ...prev, [subtaskId]: nextItems }));
    window.dispatchEvent(new Event('tasks:changed'));
  };
  const handleSaveEditProjectSubtask = async (subtaskId: string) => {
    if (!editingSubtaskTitle.trim()) { setEditingSubtaskId(null); return; }
    const { error } = await supabase.from('project_subtasks').update({ title: editingSubtaskTitle.trim() }).eq('id', subtaskId);
    if (error) { toast.error(lang === 'en' ? 'Cannot update task' : 'Không thể cập nhật tên task'); return; }
    setEditingSubtaskId(null);
    await loadProjectTreeData();
    window.dispatchEvent(new Event('tasks:changed'));
  };

  const handleSaveEditProjectChecklistItem = async (subtaskId: string, itemId: string) => {
    if (!editingItemTitle.trim() || !profile?.id) { setEditingItemId(null); return; }
    const currentList = projectSubtaskChecklistMap[subtaskId] || [];
    const nextItems = currentList.map(item => item.id === itemId ? { ...item, title: editingItemTitle.trim() } : item);
    const { error } = await supabase.from('activity_log').insert({
      workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca',
      user_id: profile.id,
      action: 'details_updated',
      entity_type: 'project_subtask',
      entity_id: subtaskId,
      metadata: { checklist_items: nextItems, is_internal_detail_sync: true },
    });
    if (error) { toast.error(lang === 'en' ? 'Cannot update subtask' : 'Không thể cập nhật subtask'); return; }
    setEditingItemId(null);
    setProjectSubtaskChecklistMap(prev => ({ ...prev, [subtaskId]: nextItems }));
    window.dispatchEvent(new Event('tasks:changed'));
  };


  const handleQuickCreateProjectChecklistItem = async (subtaskId: string, customTitle: string) => {
    if (!customTitle.trim() || !profile?.id) return;
    const currentList = projectSubtaskChecklistMap[subtaskId] || [];
    const newItem: any = {
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
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
      entity_type: 'project_subtask',
      entity_id: subtaskId,
      metadata: { checklist_items: nextItems, is_internal_detail_sync: true },
    });
    if (error) { toast.error(lang === 'en' ? 'Cannot save subtask' : 'Không thể lưu subtask'); return; }
    toast.success(lang === 'en' ? 'Subtask added' : 'Đã thêm subtask');
    setExpandedProjectSubtasks(prev => ({ ...prev, [subtaskId]: true }));
    setProjectSubtaskChecklistMap(prev => ({ ...prev, [subtaskId]: nextItems }));
    window.dispatchEvent(new Event('tasks:changed'));
  };

  const handleToggleProjectChecklistItem = async (subtaskId: string, itemId: string) => {
    if (!profile?.id) return;
    const currentList = projectSubtaskChecklistMap[subtaskId] || [];
    const nextItems = currentList.map(item => item.id === itemId ? { ...item, completed: !item.completed } : item);
    const { error } = await supabase.from('activity_log').insert({
      workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca',
      user_id: profile.id,
      action: 'details_updated',
      entity_type: 'project_subtask',
      entity_id: subtaskId,
      metadata: { checklist_items: nextItems, is_internal_detail_sync: true },
    });
    if (error) {
      toast.error(lang === 'en' ? 'Cannot update subtask' : 'Không thể cập nhật subtask');
      return;
    }
    setProjectSubtaskChecklistMap(prev => ({ ...prev, [subtaskId]: nextItems }));
    window.dispatchEvent(new Event('tasks:changed'));
  };

  const handleDeleteProjectChecklistItem = async (subtaskId: string, itemId: string) => {
    if (!profile?.id) return;
    const currentList = projectSubtaskChecklistMap[subtaskId] || [];
    const nextItems = currentList.filter(item => item.id !== itemId);
    const { error } = await supabase.from('activity_log').insert({
      workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca',
      user_id: profile.id,
      action: 'details_updated',
      entity_type: 'project_subtask',
      entity_id: subtaskId,
      metadata: { checklist_items: nextItems, is_internal_detail_sync: true },
    });
    if (error) {
      toast.error(lang === 'en' ? 'Cannot delete subtask' : 'Không thể xóa subtask');
      return;
    }
    toast.success(lang === 'en' ? 'Subtask deleted' : 'Đã xóa subtask');
    setProjectSubtaskChecklistMap(prev => ({ ...prev, [subtaskId]: nextItems }));
    window.dispatchEvent(new Event('tasks:changed'));
  };

 return (
   <div style={{ '--panel-width': `${width}px` } as React.CSSProperties} className="relative flex min-h-full">
    {/* Mobile/Tablet Backdrop when Detail Drawer is open */}
    {panelOpen && (
      <div 
        className="fixed inset-0 bg-slate-900/30 dark:bg-slate-900/60 z-[65] xl:hidden backdrop-blur-xs transition-opacity"
        onClick={() => { setSelected(null); setSelectedCampaign(null); setSelectedSubtask(null); }}
      />
    )}

    {/* Left Side: Projects List */}
    <div className={`grid grid-cols-1 min-w-0 max-w-full w-full content-start p-1 transition-all duration-300 ${panelOpen ? 'hidden xl:grid xl:mr-[calc(var(--panel-width)+16px)] pr-2' : 'pr-1'}`}>
      {/* Hàng trên: H1 Projects/Campaigns đứng riêng làm tiêu đề trang */}
      <div className="py-2 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white inline-grid grid-flow-col auto-cols-max items-center gap-2 leading-none">
          <FolderKanban className="text-primary"/> {t('projects.title')}
        </h1>
      </div>

      {/* Hàng 2: Cụm 3 nút All, Projects, Campaigns bên trái + Cạnh bên phải là Xem Main & + Add New */}
      <div className="inline-grid grid-flow-col auto-cols-max items-center justify-start gap-2.5 py-1.5 mb-1.5 shrink-0 max-w-full overflow-x-auto no-scrollbar">
        {/* All, Projects, Campaigns với sliding pill */}
        <SlidingToolbarGroup
          className="p-0.5 rounded-[8px] bg-gray-100/90 dark:bg-slate-800/90 border border-gray-200/80 dark:border-slate-700/80 shadow-2xs inline-grid grid-flow-col auto-cols-max items-center gap-0.5 shrink-0"
          activeKey={entityFilter}
          showHoverPill={true}
          showActivePill={false}
        >
          {/* Nút Tất cả */}
          <button
            type="button"
            onClick={() => setEntityFilter('all')}
            className={`h-[28px] px-2.5 py-0.5 rounded-[6px] text-[11.5px] font-bold transition-all duration-200 inline-grid grid-flow-col auto-cols-max items-center gap-1.5 cursor-pointer z-10 ${
              entityFilter === 'all'
                ? 'bg-gradient-to-b from-blue-100/95 to-blue-200/80 text-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_2px_6px_rgba(37,99,235,.18)] ring-1 ring-blue-300/80 dark:from-sky-500/35 dark:to-blue-500/20 dark:!text-sky-100 dark:ring-sky-400/40'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <span>{lang === 'en' ? 'All' : 'Tất cả'}</span>
            <span className="text-[10.5px] font-bold opacity-80">({totalItems})</span>
          </button>

          {/* Nút Projects */}
          <button
            type="button"
            onClick={() => setEntityFilter('project')}
            className={`h-[28px] px-2.5 py-0.5 rounded-[6px] text-[11.5px] font-bold transition-all duration-200 inline-grid grid-flow-col auto-cols-max items-center gap-1.5 cursor-pointer z-10 ${
              entityFilter === 'project'
                ? 'bg-gradient-to-b from-violet-100/95 to-violet-200/80 text-violet-700 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_2px_6px_rgba(124,58,237,.18)] ring-1 ring-violet-300/80 dark:from-violet-500/35 dark:to-purple-500/20 dark:!text-violet-100 dark:ring-violet-400/40'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <FolderKanban
              size={13}
              className={entityFilter === 'project' ? 'text-violet-600 dark:text-violet-300' : ''}
            />
            <span>{lang === 'en' ? 'Projects' : 'Dự án'}</span>
            <span className="text-[10.5px] font-bold opacity-80">({totalProjects})</span>
          </button>

          {/* Nút Campaigns */}
          <button
            type="button"
            onClick={() => setEntityFilter('campaign')}
            className={`h-[28px] px-2.5 py-0.5 rounded-[6px] text-[11.5px] font-bold transition-all duration-200 inline-grid grid-flow-col auto-cols-max items-center gap-1.5 cursor-pointer z-10 ${
              entityFilter === 'campaign'
                ? 'bg-gradient-to-b from-amber-100/95 to-amber-200/80 text-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_2px_6px_rgba(217,119,6,.18)] ring-1 ring-amber-300/80 dark:from-amber-500/35 dark:to-orange-500/20 dark:!text-amber-100 dark:ring-amber-300/40'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <Megaphone
              size={13}
              className={entityFilter === 'campaign' ? 'text-amber-600 dark:text-amber-300' : ''}
            />
            <span>{lang === 'en' ? 'Campaigns' : 'Chiến dịch'}</span>
            <span className="text-[10.5px] font-bold opacity-80">({totalCampaigns})</span>
          </button>
        </SlidingToolbarGroup>

        {/* Cạnh bên phải: Button Xem Main và + Add New / + Thêm mới */}
        <div className="inline-grid grid-flow-col auto-cols-max items-center gap-2">
          {officialReadEnabled && (
            <Link to="/main-view" aria-label="Theo dõi Main chỉ đọc" title="Theo dõi Main chỉ đọc" className="inline-grid grid-flow-col auto-cols-max h-[32px] items-center gap-1.5 rounded-[8px] border border-blue-200 bg-blue-50 px-2.5 text-xs font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-200">
              <Eye size={16}/>
              <span className="hidden sm:inline">Xem Main</span>
            </Link>
          )}
          {canCreate && (
            <ActionButton icon={<FolderKanban className="w-4 h-4" />}
              onClick={() => { resetCreateForm(); setCreationType('project'); setSelected(null); setSelectedCampaign(null); setCreateOpen(true); }} 
              className="btn-add-new h-[32px] inline-grid grid-flow-col auto-cols-max items-center gap-1.5 px-3 rounded-[8px] text-[12px] font-semibold transition-all shadow-sm cursor-pointer"
            >
              <span>{t('projects.add')}</span>
            </ActionButton>
          )}
        </div>
      </div>

      {/* Hàng 3: Di chuyển hàng icon filter xuống dưới, xóa box xung quanh, scale nhỏ lại 10% (w-[34px] h-[34px]) kèm Sliding Motion */}
      <div className="inline-grid grid-flow-col auto-cols-max items-center gap-1 py-1 mb-3 shrink-0">
        <div ref={toolbarRef} className="inline-grid grid-flow-col auto-cols-max items-center gap-1">
          <SlidingToolbarGroup className="mobile-actions-row gap-1" showHoverPill={true} showActivePill={false}>
            {/* 0. View Mode Dropdown (1-click toggle giữa List và Board) */}
            <ProjectViewModeDropdown
              viewMode={viewMode}
              onChange={setViewMode}
              compact={true}
            />

            {/* Accessible invitation departments are already scoped; keep this filter available to invited Leaders. */}
            <DepartmentFilterDropdown
              value={departmentFilter}
              onChange={setDepartmentFilter}
              departments={activeDepartments}
              isOpen={activeDropdown === 'department'}
              onToggle={() => setActiveDropdown(activeDropdown === 'department' ? null : 'department')}
              onClose={() => setActiveDropdown(null)}
              compact={true /* compact={panelOpen} */}
              disabled={activeDepartments.length === 0}
            />

            {/* 2. Status Filter Button */}
            <StatusFilterDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              allKey="open"
              options={[
                { key: 'open', label: lang === 'en' ? 'Incomplete' : 'Chưa hoàn thành', dot: 'bg-blue-500' },
                { key: 'all', label: t('projects.allStatuses'), dot: 'bg-gray-400' },
                { key: 'planning', label: t('projects.statusPlanning'), dot: 'bg-amber-400' },
                { key: 'in_progress', label: t('projects.statusInProgress'), dot: 'bg-sky-400' },
                { key: 'completed', label: t('projects.statusCompleted'), dot: 'bg-emerald-500' },
                { key: 'draft', label: t('projects.statusDraft'), dot: 'bg-slate-400' },
                { key: 'on_hold', label: t('projects.statusOnHold'), dot: 'bg-rose-400' }
              ]}
              isOpen={activeDropdown === 'status'}
              onToggle={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
              onClose={() => setActiveDropdown(null)}
              compact={true /* compact={panelOpen} */}
            />

            {/* 3. PIC Filter Button */}
            <PicFilterDropdown
              value={picFilter}
              onChange={setPicFilter}
              people={people}
              currentUserId={profile?.id}
              currentUserName={profile?.name || 'Me'}
              currentUserAvatar={profile?.avatar_url}
              isOpen={activeDropdown === 'pic'}
              onToggle={() => setActiveDropdown(activeDropdown === 'pic' ? null : 'pic')}
              onClose={() => setActiveDropdown(null)}
              compact={true /* compact={panelOpen} */}
            />

            {/* 4. Calendar Filter Button (Fixed Custom Calendar, no native picker) */}
            <DateFilterDropdown
              calendarFilter={calendarFilter}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
              onSelectPreset={(preset) => {
                setCalendarFilter(preset);
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              onApplyCustomRange={(start, end) => {
                setCalendarFilter('custom');
                setCustomStartDate(start);
                setCustomEndDate(end);
              }}
              onClear={() => {
                setCalendarFilter('all');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              isOpen={activeDropdown === 'calendar'}
              onToggle={() => setActiveDropdown(activeDropdown === 'calendar' ? null : 'calendar')}
              onClose={() => setActiveDropdown(null)}
              compact={true /* compact={panelOpen} */}
            />

            {/* 5. Priority Filter Button */}
            <PriorityFilterDropdown
              value={priorityFilter}
              onChange={setPriorityFilter}
              isOpen={activeDropdown === 'priority'}
              onToggle={() => setActiveDropdown(activeDropdown === 'priority' ? null : 'priority')}
              onClose={() => setActiveDropdown(null)}
              compact={true /* compact={panelOpen} */}
            />

            {/* 6. Reset Filters Button (Compact icon-only) */}
            {hasActiveFilters && (
              <ActionButton icon={<X size={14} />}
                type="button"
                onClick={handleResetFilters}
                title={t('projects.clearFilters')}
                aria-label={t('projects.clearFilters')}
                className="w-[34px] h-[34px] p-0 rounded-[8px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold grid place-items-center transition-colors cursor-pointer"
              />
            )}
          </SlidingToolbarGroup>
        </div>
      </div>
      
      {viewMode === 'board' ? (
        <ProjectsKanbanBoard
          projects={visibleProjects}
          campaigns={visibleCampaigns}
          entityFilter={entityFilter}
          workflowTracks={workflow.tracks}
          people={people}
          picMembers={picMembers}
          subtaskMembers={subtaskMembers}
          projectPrimaryOwners={projectPrimaryOwners}
          projectSubtasksMap={projectSubtasksMap}
          campaignSubtasksMap={campaignSubtasksMap}
          campaignSubtaskAssigneesMap={campaignSubtaskAssigneesMap}
          hasComments={hasComments}
          hasCampaignComments={hasCampaignComments}
          hasMentionOrUnread={hasMentionOrUnread}
          canCreate={canCreate}
          canManageProject={canManageProject}
          canManageCampaign={(c) => Boolean(profile && (isGlobalManager(profile) || isDepartmentLeader(profile) || c.created_by === profile.id || rootCampaignIds.has(c.id)))}
          onSelectProject={(project) => { setSelectedCampaign(null); setCreateOpen(false); setSelected(project); }}
          onSelectCampaign={(campaign) => { setSelected(null); setCreateOpen(false); setSelectedCampaign(campaign); }}
          onCreateItem={(statusKey, defaultKind) => {
            resetCreateForm();
            setCreationType(defaultKind || 'project');
            setEditStatus(statusKey);
            setCampaignStatus(statusKey);
            setSelected(null);
            setSelectedCampaign(null);
            setCreateOpen(true);
          }}
          onUpdateProjectStatus={handleUpdateProjectStatus}
          onUpdateCampaignStatus={handleUpdateCampaignStatus}
          onHideProject={archiveProject}
          onDeleteProject={removeProject}
          profile={profile}
        />
      ) : (
        <div className="grid grid-cols-1 min-w-0 max-w-full space-y-6 pb-20 pr-1">
        {entityFilter !== 'project' && (
          <CampaignPanel
            onSelect={(campaign) => { setSelected(null); setCreateOpen(false); setSelectedCampaign(campaign); }}
            filters={campaignFilters}
            rootCampaignIds={rootCampaignIds}
            workflowTracks={workflow.tracks}
            people={people}
            onOpenSubtask={(st) => {
              setSelected(null);
              setSelectedCampaign(campaigns.find(c => c.id === st.campaign_id) || null);
              setSelectedSubtask(st);
            }}
          />
        )}
        {entityFilter !== 'campaign' && (
          <section className="card-hub rounded-[8px] overflow-hidden shrink-0 min-w-0 max-w-full"><div className="grid grid-cols-[1fr_auto] items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700"><button onClick={() => setProjectsExpanded(value => !value)} aria-expanded={projectsExpanded} className="inline-grid grid-flow-col auto-cols-max items-center gap-2 text-sm font-bold text-gray-900 dark:text-white"><ChevronDown className={`text-gray-500 transition-transform ${projectsExpanded ? '' : '-rotate-90'}`} size={17}/><FolderKanban className="text-violet-500" size={16}/> {t('projects.projectsAccordion')} <span className="rounded-full bg-violet-100 dark:bg-violet-500/20 px-2 py-0.5 text-xs font-bold text-violet-600 dark:text-violet-400">{visibleProjects.length}</span></button></div>{projectsExpanded && <>
  {/* Mobile Cards (xl:hidden) with 3-tier tree view */}
  <div className="space-y-3 p-3 xl:hidden">
    {visibleProjects.map(project => {
      const isProjectExpanded = Boolean(expandedProjects[project.id]);
      const rawSubtasks = projectSubtasksMap[project.id] || [];
      const subtasks = filterProjectSubtasksForUser(rawSubtasks, project);
      const projectNote = getCachedNote('project', project.id);
      const isNoteOpen = Boolean(openNoteEntityIds[project.id]);
      const leadId = projectPrimaryOwners[project.id] || (picMembers[project.id] || [])[0];
      const leadPerson = people.find(x => String(x.id) === String(leadId));
      const projectTrack = workflow.tracks.find(t => t.entity_type === 'project' && String(t.entity_id).trim() === String(project.id).trim());
      const hasPhases = (projectTrack?.phases?.length || 0) > 0;

      return (
        <article key={project.id} className={`min-w-0 rounded-[8px] border border-gray-200/90 bg-white/90 p-3 dark:border-slate-800 dark:bg-[#071325]/70 shadow-xs ${deletingIds.includes(project.id) ? 'animate-fade-out' : ''}`}>
          {/* Hàng 1: Expand chevron, (i) icon, Title + subtask count + note icon, Status ở góc phải */}
          <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-1.5">
            <button
              type="button"
              onClick={() => toggleProjectExpand(project.id)}
              className="p-1 -ml-1 text-slate-400 hover:text-violet-500 rounded-[6px] transition-transform cursor-pointer shrink-0"
              title={isProjectExpanded ? (lang === 'en' ? 'Collapse tasks' : 'Thu gọn task') : (lang === 'en' ? 'Expand tasks' : 'Mở rộng task')}
            >
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isProjectExpanded ? 'rotate-90 text-violet-500' : ''}`} />
            </button>
            {hasPhases && (
              <EntityInfoPopover
                entityType="project"
                entity={project}
                track={projectTrack}
                leadPerson={leadPerson ? { name: leadPerson.name, avatar_url: (leadPerson as any).avatar_url } : null}
                subPersons={(() => {
                  const primaryPicIds = new Set([
                    ...(picMembers[project.id] || []).map(String),
                    project.lead_id ? String(project.lead_id) : '',
                    projectPrimaryOwners[project.id] ? String(projectPrimaryOwners[project.id]) : '',
                  ].filter(Boolean));
                  return (subtaskMembers[project.id] || [])
                    .filter(id => !primaryPicIds.has(String(id)))
                    .map(id => {
                      const p = people.find(x => String(x.id) === String(id));
                      return { id, name: p?.name || 'Unknown', avatar_url: (p as any)?.avatar_url };
                    });
                })()}
              />
            )}
            <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => { setSelectedCampaign(null); setCreateOpen(false); setSelected(project); }}
                className="font-bold text-sm text-gray-900 dark:text-white truncate cursor-pointer text-left"
              >
                {project.name}
              </button>
              {(() => {
                const phases = projectTrack?.phases || [];
                const phaseCount = phases.length;
                const unassignedSubtasks = subtasks.filter(s => {
                  if (s.status === 'deleted') return false;
                  if (phaseCount === 0) return true;
                  return !s.workflow_phase_id;
                });
                const unassignedCount = unassignedSubtasks.length;
                const isAllUnassignedDone = unassignedCount > 0 && unassignedSubtasks.every(s => isTaskDone(s.status));

                return (
                  <>
                    {unassignedCount > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-[4px] font-bold shrink-0 ${
                        isAllUnassignedDone
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300'
                      }`}>
                        ({unassignedCount} Tasks)
                      </span>
                    )}
                  </>
                );
              })()}
              {hasComments[project.id] && (
                <CommentPreviewPopover
                  entityType="project"
                  entityId={project.id}
                  entityTitle={project.name}
                  hasUnreadDot={Number(project.lead_id) === Number(profile?.id) || hasMentionOrUnread?.[project.id]}
                  iconSize={13}
                  className="shrink-0"
                />
              )}
              {Boolean(projectNote && projectNote.trim()) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenNoteEntityIds(prev => ({ ...prev, [project.id]: !prev[project.id] }));
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
                currentStatus={project.status || 'active'}
                options={projectStatusOptions}
                onSelect={(nextStatus) => handleQuickChangeProjectStatus(project.id, nextStatus)}
                disabled={!canManageProject(project)}
              />
            </div>
          </div>

          {/* Hàng 2: Timeline và PIC */}
          <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2 text-[11px] text-gray-500 dark:text-slate-400">
            <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 min-w-0">
              <span className="min-w-0 truncate">
                {project.due_date ? `${t('common.due')} ${dateValue(project.due_date)}` : t('common.noDueDate')}
              </span>
              {project.due_date && getDueStatusLabel(project.due_date, project.status, lang === 'en')}
            </div>
            {leadPerson && (
              <div className="grid grid-flow-col auto-cols-max items-center gap-1 shrink-0">
                <Avatar name={leadPerson.name} src={(leadPerson as any).avatar_url} className="w-4 h-4 text-[8px]" />
                <span className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate max-w-[100px]">{leadPerson.name}</span>
              </div>
            )}
          </div>

          {/* Dropdown nội dung ghi chú nếu được bấm mở */}
          {isNoteOpen && projectNote && (
            <div className="mt-2.5 p-2 rounded-[6px] bg-blue-50/70 dark:bg-[#071325] border border-blue-200/60 dark:border-slate-800 text-xs text-gray-700 dark:text-gray-300 animate-in fade-in duration-150">
              <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 mb-0.5 grid grid-flow-col auto-cols-max items-center gap-1">
                <FileText size={10} />
                <span>{lang === 'en' ? 'Note' : 'Ghi chú'}</span>
              </div>
              <div className="text-xs leading-relaxed whitespace-pre-wrap">{projectNote}</div>
            </div>
          )}

          {/* Mobile Subtasks List (KHÔNG có gạch phân cấp) */}
          {isProjectExpanded && (
            <div className="mt-3 pt-3 border-t border-violet-200/50 dark:border-slate-800 space-y-2">
              {subtasks.map((st: any) => {
                const items = projectSubtaskChecklistMap[st.id] || [];
                const isSubtaskExpanded = Boolean(expandedProjectSubtasks[st.id]);

                return (
                  <div key={st.id} className="p-2.5 rounded-[8px] bg-violet-50/40 dark:bg-[#071325] border border-violet-200/60 dark:border-slate-800 text-xs space-y-2">
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleProjectSubtaskExpand(st.id)}
                        className="p-1 text-slate-400 hover:text-violet-600 rounded transition-transform cursor-pointer"
                        title={isSubtaskExpanded ? (lang === 'en' ? 'Collapse subtasks' : 'Thu gọn subtask') : (lang === 'en' ? 'Expand subtasks' : 'Xem các subtask')}
                      >
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isSubtaskExpanded ? 'rotate-90 text-violet-600' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(project);
                          setSelectedCampaign(null);
                          setSelectedSubtask(st);
                        }}
                        className="text-left font-semibold text-slate-900 dark:text-white truncate block cursor-pointer"
                      >
                        {st.title}
                      </button>
                      <div onClick={(e) => e.stopPropagation()}>
                        <QuickStatusDropdown
                          currentStatus={st.status || 'planning'}
                          options={subtaskStatusOptions}
                          onSelect={(nextStatus) => handleQuickChangeProjectSubtaskStatus(st.id, nextStatus)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-flow-col auto-cols-max items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{st.assignee?.name || t('common.unassigned')}</span>
                      {st.due_date && <span>· {dateValue(st.due_date)}</span>}
                      {st.quantity && <span className="text-emerald-600 dark:text-emerald-400 font-bold">· SL: {st.quantity}</span>}
                    </div>

                    {/* Checklist inside Subtask (KHÔNG có gạch phân cấp) */}
                    {isSubtaskExpanded && (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-1.5">
                        {items.map((item: any) => (
                          <div key={item.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-[11px]">
                            {/* Vòng tròn checkmark */}
                            <button
                              type="button"
                              onClick={() => void handleToggleProjectChecklistItem(st.id, item.id)}
                              className={`w-4 h-4 rounded-full border transition-all grid place-items-center cursor-pointer shrink-0 ${
                                item.completed
                                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-2xs'
                                  : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500 bg-white dark:bg-transparent'
                              }`}
                            >
                              {item.completed && <Check size={10} strokeWidth={3} className="text-white" />}
                            </button>
                            <span
                              onClick={() => {
                                setSelected(project);
                                setSelectedCampaign(null);
                                setSelectedSubtask(st);
                              }}
                              className={`cursor-pointer truncate ${item.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}
                            >
                              {item.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleDeleteProjectChecklistItem(st.id, item.id)}
                              className="text-slate-400 hover:text-red-500 p-0.5 cursor-pointer"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                        {/* Quick input for checklist */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const title = prompt(lang === 'en' ? 'Subtask title:' : 'Tiêu đề subtask:');
                              if (title && title.trim()) {
                                void handleQuickCreateProjectChecklistItem(st.id, title);
                              }
                            }}
                            className="inline-grid grid-flow-col auto-cols-max items-center gap-1 px-2.5 py-0.5 rounded-[8px] border border-dashed border-slate-300 dark:border-slate-700 bg-transparent text-[11px] font-semibold text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors cursor-pointer"
                          >
                            <Plus size={11} />
                            <span>{lang === 'en' ? '+ Add Subtask' : '+ Thêm Subtask'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Quick input to add task on mobile */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const title = prompt(lang === 'en' ? 'Task title:' : 'Tiêu đề task:');
                    if (title && title.trim()) {
                      void handleQuickCreateProjectSubtask(project.id, title);
                    }
                  }}
                  className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5 px-3 py-1 rounded-[8px] border border-dashed border-slate-300 dark:border-slate-700 bg-transparent text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-violet-700 dark:hover:text-violet-300 transition-colors cursor-pointer"
                >
                  <Plus size={13} />
                  <span>{lang === 'en' ? '+ Add Task' : '+ Thêm Task'}</span>
                </button>
              </div>
            </div>
          )}
        </article>
      );
    })}
    {visibleProjects.length === 0 && (
      <p className="p-6 text-center text-sm text-gray-500">
        {projects.length > 0 ? (lang === 'en' ? 'No projects match current filters.' : 'Không có dự án phù hợp bộ lọc.') : t('projects.noProjects')}
      </p>
    )}
  </div>

  {/* Desktop Table (hidden xl:block) with 3-tier tree view */}
  <div className="hidden overflow-x-auto xl:block min-w-0 max-w-full">
    <table ref={projectTableRef} className="w-full table-fixed text-left border-collapse">
      {(() => {
        const totalProjectColWidth = projectColWidths.reduce((sum, w) => sum + w, 0) || 1;
        return (
          <colgroup>
            {projectColWidths.map((w, idx) => (
              <col key={idx} style={{ width: `${((w / totalProjectColWidth) * 100).toFixed(3)}%` }} />
            ))}
          </colgroup>
        );
      })()}
      <thead className="bg-gray-50 dark:bg-slate-800 text-xs uppercase tracking-wide text-gray-500">
        <tr>
          <th className="p-4 relative text-left">
            <span className="truncate block text-left">{t('projects.col.project')}</span>
            <div onMouseDown={(e) => startProjectColResize(0, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
          </th>
          <th className="p-4 relative text-center">
            <span className="truncate block text-center">{t('projects.col.owner')}</span>
            <div onMouseDown={(e) => startProjectColResize(1, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
          </th>
          <th className="p-4 relative text-center">
            <span className="truncate block text-center">{t('projects.col.dates')}</span>
            <div onMouseDown={(e) => startProjectColResize(2, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
          </th>
          <th className="p-4 relative text-center">
            <span className="truncate block text-center">{t('projects.col.priority')}</span>
            <div onMouseDown={(e) => startProjectColResize(3, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
          </th>
          <th className="p-4 relative text-center">
            <span className="truncate block text-center">{t('projects.col.status')}</span>
            <div onMouseDown={(e) => startProjectColResize(4, e)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 grid place-items-center cursor-col-resize z-20 group/handle" title="Kéo để chỉnh độ rộng"><div className="w-[2px] h-3 rounded-full bg-gray-300/90 dark:bg-slate-600 group-hover/handle:bg-primary group-hover/handle:h-4 transition-all" /></div>
          </th>
          <th className="p-4 relative text-center">
            <span className="truncate block text-center">{t('projects.col.notes')}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {visibleProjects.map(project => {
          const isProjectExpanded = Boolean(expandedProjects[project.id]);
          const rawSubtasks = projectSubtasksMap[project.id] || [];
          const subtasks = filterProjectSubtasksForUser(rawSubtasks, project);

          return (
            <React.Fragment key={project.id}>
              {/* Cấp 1: Hàng Dự án */}
              <tr
                onClick={() => { setSelectedCampaign(null); setCreateOpen(false); setSelected(project); }}
                className={`group border-t border-gray-100 dark:border-slate-800 cursor-pointer hover-row-effect hover-row-project transition-all duration-200 ${selected?.id === project.id ? 'bg-violet-50/70 dark:bg-violet-950/20' : ''} ${deletingIds.includes(project.id) ? "animate-fade-out" : ""} ${isProjectExpanded ? 'bg-violet-50/20 dark:bg-[#071325]/50' : ''}`}
              >
                {/* Cột 1: Title có icon dropdown trước title */}
                <td className="p-4 relative overflow-hidden">
                  <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 overflow-hidden">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProjectExpand(project.id);
                      }}
                      className="p-1 -ml-1 text-slate-400 hover:text-violet-500 rounded-[6px] transition-transform hover:bg-violet-50 dark:hover:bg-violet-950/40 cursor-pointer shrink-0"
                      title={isProjectExpanded ? (lang === 'en' ? 'Collapse tasks' : 'Thu gọn task') : (lang === 'en' ? 'Expand tasks' : 'Xem các task')}
                      aria-label={isProjectExpanded ? 'Collapse tasks' : 'Expand tasks'}
                    >
                      <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isProjectExpanded ? 'rotate-90 text-violet-500' : ''}`} />
                    </button>
                    {(() => {
                      const track = workflow.tracks.find(t => t.entity_type === 'project' && String(t.entity_id).trim() === String(project.id).trim());
                      const primaryPicIds = new Set([
                        ...(picMembers[project.id] || []).map(String),
                        project.lead_id ? String(project.lead_id) : '',
                        projectPrimaryOwners[project.id] ? String(projectPrimaryOwners[project.id]) : '',
                      ].filter(Boolean));
                      const filteredSubPersons = (subtaskMembers[project.id] || [])
                        .filter(id => !primaryPicIds.has(String(id)))
                        .map(id => {
                          const p = people.find(x => String(x.id) === String(id));
                          return { id, name: p?.name || 'Unknown', avatar_url: (p as any)?.avatar_url };
                        });
                      return (track?.phases?.length || 0) > 0 ? (
                        <EntityInfoPopover
                          entityType="project"
                          entity={project}
                          track={track}
                          leadPerson={(() => {
                            const leadId = projectPrimaryOwners[project.id] || (picMembers[project.id] || [])[0];
                            const p = people.find(x => String(x.id) === String(leadId));
                            return p ? { name: p.name, avatar_url: (p as any).avatar_url } : null;
                          })()}
                          subPersons={filteredSubPersons}
                        />
                      ) : null;
                    })()}
                    <b className="block truncate text-gray-900 dark:text-white">{project.name}</b>
                    {(() => {
                      const track = workflow.tracks.find(t => t.entity_type === 'project' && String(t.entity_id).trim() === String(project.id).trim());
                      const phases = track?.phases || [];
                      const phaseCount = phases.length;
                      const unassignedSubtasks = subtasks.filter(s => {
                        if (s.status === 'deleted') return false;
                        if (phaseCount === 0) return true;
                        return !s.workflow_phase_id;
                      });
                      const unassignedCount = unassignedSubtasks.length;
                      const isAllUnassignedDone = unassignedCount > 0 && unassignedSubtasks.every(s => isTaskDone(s.status));

                      return (
                        <>
                          {unassignedCount > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-[5px] font-bold shrink-0 ${
                              isAllUnassignedDone
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                : 'bg-violet-100/90 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200/70 dark:border-violet-800/60'
                            }`}>
                              ({unassignedCount} Tasks)
                            </span>
                          )}
                        </>
                      );
                    })()}
                    {hasComments[project.id] && (
                      <CommentPreviewPopover
                        entityType="project"
                        entityId={project.id}
                        entityTitle={project.name}
                        hasUnreadDot={Boolean(Number(project.lead_id) === Number(profile?.id) || hasMentionOrUnread?.[project.id])}
                      />
                    )}
                  </div>
                  {project.description?.trim() ? <p className="text-xs text-gray-500 truncate mt-1 pl-6">{project.description}</p> : null}
                  {canManageProject(project) && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-[#0a192f]/95 shadow-sm rounded-lg px-1 py-0.5 border border-gray-200/80 dark:border-slate-700/80 z-10 grid grid-flow-col auto-cols-max items-center gap-0.5"
                    >
                      <ActionButton 
                        icon={<EyeOff size={14}/>} 
                        onClick={(e) => { e.stopPropagation(); void archiveProject(project); }} 
                        className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-md transition-colors" 
                        title={t('common.hide')}
                      />
                      <ActionButton 
                        icon={<Trash2 size={14}/>} 
                        onClick={(e) => { e.stopPropagation(); void removeProject(project); }} 
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors" 
                        title={t('common.delete')}
                      />
                    </div>
                  )}
                </td>

                {/* Cột 2: OWNER / PIC */}
                <td className="p-4 overflow-hidden text-center">
                  <div className="grid place-content-center">
                    <div className="grid grid-flow-col auto-cols-max items-center justify-center gap-2 overflow-hidden mx-auto">
                      <div className="grid grid-flow-col auto-cols-max -space-x-2 shrink-0">
                        {(picMembers[project.id] || []).slice(0,4).map(id => { const p = people.find(p=>String(p.id)===id); return <Avatar key={'o'+id} name={p?.name || '?'} src={(p as any)?.avatar_url || undefined} className="w-7 h-7 text-[10px] border-2 border-white dark:border-slate-900 shadow-sm z-10" /> })}
                      </div>
                      {(() => {
                        const primaryPicIds = new Set([
                          ...(picMembers[project.id] || []).map(String),
                          project.lead_id ? String(project.lead_id) : '',
                          projectPrimaryOwners[project.id] ? String(projectPrimaryOwners[project.id]) : '',
                        ].filter(Boolean));
                        const filteredSubIds = (subtaskMembers[project.id] || []).filter(id => !primaryPicIds.has(String(id)));
                        if (filteredSubIds.length === 0) return null;
                        return (
                          <>
                            <span className="text-gray-300 dark:text-gray-600 px-1 shrink-0">|</span>
                            <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 rounded-full border border-violet-100 dark:border-violet-800 shrink-0">
                              <span className="text-[9px] font-bold text-violet-700 dark:text-violet-400">SUB</span>
                              <div className="grid grid-flow-col auto-cols-max -space-x-2">
                                {filteredSubIds.slice(0,4).map(id => { const p = people.find(p=>String(p.id)===id); return <Avatar key={'s'+id} name={(p?.name || 'Unknown') + ' (Subtask)'} src={(p as any)?.avatar_url || undefined} className="w-6 h-6 text-[9px] border-2 border-white dark:border-slate-900 shadow-sm z-10 opacity-90" /> })}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </td>

                {/* Cột 3: DATES */}
                <td className="p-4 overflow-hidden text-sm text-gray-600 dark:text-gray-300 text-center">
                  <div className="grid place-content-center">
                    <div className="grid grid-flow-col auto-cols-max items-center justify-center gap-2 truncate mx-auto">
                      <span>{dateValue(project.start_date || '')} – {dateValue(project.due_date || '')}</span>
                      {project.due_date && (
                        <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 shrink-0">
                          <div className={`w-3.5 h-3.5 rounded-full border-[2.5px] ${getDueStatusColor(project.due_date, project.status)}`} title={`${t('common.dueDate')}: ${dateValue(project.due_date)}`} />
                          {getDueStatusLabel(project.due_date, project.status, lang === 'en')}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Cột 4: PRIORITY */}
                <td className="p-4 overflow-hidden text-center">
                  <div className="grid place-items-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize truncate ${priorityClass(project.priority || 'medium')}`}>
                      {project.priority || 'medium'}
                    </span>
                  </div>
                </td>

                {/* Cột 6: STATUS */}
                <td className="p-4 overflow-hidden text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="grid place-items-center">
                    <QuickStatusDropdown
                      currentStatus={project.status || 'active'}
                      options={projectStatusOptions}
                      onSelect={(nextStatus) => handleQuickChangeProjectStatus(project.id, nextStatus)}
                      disabled={!canManageProject(project)}
                    />
                  </div>
                </td>

                {/* Cột 7: NOTES */}
                <td className="p-4 overflow-hidden text-center">
                  <EntityNoteCell
                    entityId={project.id}
                    entityType="project"
                    workspaceId={(project as any).workspace_id}
                    canEdit={canManageProject(project)}
                    alignCenter={true}
                  />
                </td>
              </tr>

              {/* Tree view lồng cấp 2 & cấp 3 khi Project được mở rộng */}
              {isProjectExpanded && (
                <>
                  {subtasks.map((st: any) => {
                    const items = projectSubtaskChecklistMap[st.id] || [];
                    const doneCount = items.filter((i: any) => i.completed).length;
                    const isSubtaskExpanded = Boolean(expandedProjectSubtasks[st.id]);

                    return (
                      <React.Fragment key={st.id}>
                        {/* Cấp 2: Hàng Subtask */}
                        <tr
                          onClick={() => {
                            setSelected(project);
                            setSelectedCampaign(null);
                            setSelectedSubtask(st);
                            
                          }}
                          className="group bg-violet-50/20 dark:bg-[#071325]/70 hover:bg-violet-50/40 dark:hover:bg-[#0c1f3b] border-t border-dashed border-violet-200/50 dark:border-slate-800/80 transition-colors cursor-pointer"
                        >
                          {/* Cột 1: Title subtask thụt lề pl-12, dây dọc left-6 */}
                          <td className="p-3 pl-10 relative overflow-hidden">
                            
                            <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 overflow-hidden">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleProjectSubtaskExpand(st.id);
                                }}
                                className="p-1 text-slate-400 hover:text-violet-600 rounded-[5px] transition-transform cursor-pointer shrink-0"
                                title={isSubtaskExpanded ? (lang === 'en' ? 'Collapse subtasks' : 'Thu gọn subtask') : (lang === 'en' ? 'Expand subtasks' : 'Xem các subtask')}
                              >
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isSubtaskExpanded ? 'rotate-90 text-violet-600' : ''}`} />
                              </button>
                              <ListTodo className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                              
                              {editingSubtaskId === st.id ? (
                                <input
                                  type="text"
                                  value={editingSubtaskTitle}
                                  onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                                  onBlur={() => void handleSaveEditProjectSubtask(st.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') void handleSaveEditProjectSubtask(st.id);
                                    if (e.key === 'Escape') setEditingSubtaskId(null);
                                  }}
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                  className="px-2 py-0.5 text-xs font-semibold rounded border border-violet-400 bg-white dark:bg-[#0a192f] text-slate-900 dark:text-white outline-none"
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
                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-opacity cursor-pointer shrink-0"
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
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-[4px] font-bold ${doneCount === items.length ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-violet-100/90 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300'}`}>
                                  ({doneCount}/{items.length} Subtasks)
                                </span>
                              )}

                              {((treeSubtaskCommentCounts[st.id] ?? subtaskCommentCounts[st.id]) || 0) > 0 && (
                                <CommentPreviewPopover
                                  entityType="project_subtask"
                                  entityId={st.id}
                                  entityTitle={st.title}
                                  count={(treeSubtaskCommentCounts[st.id] ?? subtaskCommentCounts[st.id]) || 0}
                                  onOpenFull={() => {
                                    setSelected(project);
                                    setSelectedCampaign(null);
                                    setSelectedSubtask(st);
                                  }}
                                />
                              )}

                              {Array.isArray(st.tags) && st.tags.map((tag: string, tIdx: number) => (
                                <span
                                  key={tIdx}
                                  className="px-1.5 py-0.2 rounded-[4px] bg-violet-100/80 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 text-[10px] font-semibold border border-violet-200/60 dark:border-violet-800/60 shrink-0"
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
                              <button
                                type="button"
                                onClick={() => {
                                  setSelected(project);
                                  setSelectedCampaign(null);
                                  setSelectedSubtask(st);
                                  
                                }}
                                className="p-1 text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded transition-colors"
                                title={lang === 'en' ? 'View details' : 'Xem chi tiết'}
                              >
                                <Eye size={13} />
                              </button>
                              {canManageProject(project) && (
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteProjectSubtask(st.id)}
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
                                <span>{st.start_date ? dateValue(st.start_date) : '—'} – {st.due_date ? dateValue(st.due_date) : '—'}</span>
                                {st.due_date && getDueStatusLabel(st.due_date, st.status, lang === 'en')}
                              </div>
                            </div>
                          </td>

                          {/* Cột 4: PRIORITY */}
                          <td className="p-3 overflow-hidden text-center">
                            <div className="grid place-content-center">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize truncate ${priorityClass(st.priority || 'medium')}`}>
                                {st.priority || 'medium'}
                              </span>
                            </div>
                          </td>

                          {/* Cột 6: STATUS */}
                          <td className="p-3 overflow-hidden text-center">
                            <div className="grid place-content-center" onClick={(e) => e.stopPropagation()}>
                              <QuickStatusDropdown
                                currentStatus={st.status || 'planning'}
                                options={subtaskStatusOptions}
                                onSelect={(nextStatus) => handleQuickChangeProjectSubtaskStatus(st.id, nextStatus)}
                              />
                            </div>
                          </td>

                          {/* Cột 7: GHI CHÚ (EntityNoteCell) */}
                          <td className="p-3 overflow-hidden text-center">
                            <EntityNoteCell
                              entityId={st.id}
                              entityType="project_subtask"
                              workspaceId={(project as any).workspace_id}
                              canEdit={canManageProject(project)}
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
                                onClick={() => {
                                  setSelected(project);
                                  setSelectedCampaign(null);
                                  setSelectedSubtask({ ...st, checklist_item_id: item.id });
                                }}
                                className="group bg-violet-50/40 dark:bg-[#06101e] hover:bg-violet-50/60 dark:hover:bg-[#0a1e38] border-t border-dotted border-slate-200/80 dark:border-slate-800/80 transition-colors cursor-pointer"
                              >
                                {/* Cột 1: Title đầu việc thụt lề sâu pl-20, dây nối left-6 & left-14 */}
                                <td className="py-2 px-4 pl-16 relative overflow-hidden">
                                  
                                  <div className="grid grid-flow-col auto-cols-max items-center gap-2 overflow-hidden">
                                    {/* Vòng tròn checkmark */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void handleToggleProjectChecklistItem(st.id, item.id);
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
                                        onBlur={() => void handleSaveEditProjectChecklistItem(st.id, item.id)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') void handleSaveEditProjectChecklistItem(st.id, item.id);
                                          if (e.key === 'Escape') setEditingItemId(null);
                                        }}
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                        className="px-2 py-0.5 text-xs rounded border border-violet-400 bg-white dark:bg-[#0a192f] text-slate-900 dark:text-white outline-none"
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
                                          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-opacity cursor-pointer shrink-0"
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
                                      void handleDeleteProjectChecklistItem(st.id, item.id);
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
                                      <span>{item.due_date ? dateValue(item.due_date) : (item.created_at ? dateValue(item.created_at) : '—')}</span>
                                      {item.due_date && getDueStatusLabel(item.due_date, item.completed ? 'completed' : 'todo', lang === 'en')}
                                    </div>
                                  </div>
                                </td>

                                {/* Cột 4: PRIORITY */}
                                <td className="py-2 px-4 overflow-hidden text-center">
                                  <div className="grid place-content-center">
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold capitalize truncate ${priorityClass(item.priority || 'medium')}`}>
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
                                    entityType="project_item"
                                    workspaceId={(project as any).workspace_id}
                                    canEdit={canManageProject(project)}
                                    alignCenter={true}
                                  />
                                </td>
                              </tr>
                            ))}

                            {/* Thanh tạo đầu việc mới */}
                            <tr className="bg-violet-50/20 dark:bg-[#06101e] border-t border-dotted border-slate-200/60 dark:border-slate-800/60">
                              <td colSpan={6} className="py-2 px-4 pl-16 relative">
                                
                                {creatingItemSubtaskId === st.id ? (
                                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-2 p-2 rounded-[8px] bg-white dark:bg-[#0a192f] border border-violet-300/80 dark:border-violet-700/60 shadow-xs">
                                    <input
                                      type="text"
                                      value={newItemTitle}
                                      onChange={(e) => setNewItemTitle(e.target.value)}
                                      placeholder={lang === 'en' ? 'Subtask title...' : 'Tiêu đề subtask mới...'}
                                      className="px-2.5 py-1 text-xs rounded-[6px] border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-0"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') void handleCreateProjectChecklistItem(st.id);
                                        if (e.key === 'Escape') setCreatingItemSubtaskId(null);
                                      }}
                                    />
                                    <div className="tw-calendar-picker relative">
                                      <input
                                        type="text"
                                        id={`inline-proj-chk-due-${st.id}`}
                                        readOnly
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if ((window as any).openCalendar) {
                                            (window as any).openCalendar({ displayId: `inline-proj-chk-due-${st.id}`, mode: 'single' }, e);
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
                                      onClick={() => void handleCreateProjectChecklistItem(st.id)}
                                      className="px-3 py-1 rounded-[6px] bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors shadow-2xs cursor-pointer"
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
                                    className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5 px-3 py-1 rounded-[8px] border border-dashed border-slate-300/80 dark:border-slate-700/80 bg-transparent text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-300 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-50/60 dark:hover:bg-violet-950/30 text-[11px] font-semibold transition-all cursor-pointer"
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

                  {/* Thanh tạo task mới cho Project */}
                  <tr className="bg-violet-50/15 dark:bg-[#071325]/50 border-t border-dashed border-violet-200/50 dark:border-slate-800/80">
                    <td colSpan={6} className="py-2.5 px-4 pl-10 relative">
                      {creatingSubtaskProjectId === project.id ? (
                        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-2 p-2.5 rounded-[8px] bg-white dark:bg-[#0a192f] border border-violet-300 dark:border-violet-700 shadow-sm">
                          <input
                            type="text"
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            placeholder={lang === 'en' ? 'Task title...' : 'Tiêu đề task mới...'}
                            className="px-2.5 py-1 text-xs rounded-[6px] border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-0"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void handleCreateProjectSubtask(project.id);
                              if (e.key === 'Escape') setCreatingSubtaskProjectId(null);
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
                              id={`inline-proj-st-due-${project.id}`}
                              readOnly
                              onClick={(e) => {
                                e.stopPropagation();
                                if ((window as any).openCalendar) {
                                  (window as any).openCalendar({ displayId: `inline-proj-st-due-${project.id}`, mode: 'single' }, e);
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
                            onClick={() => void handleCreateProjectSubtask(project.id)}
                            className="px-3 py-1 rounded-[6px] bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors shadow-2xs cursor-pointer"
                          >
                            {lang === 'en' ? 'Create' : 'Tạo'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCreatingSubtaskProjectId(null);
                              setNewSubtaskTitle('');
                              setNewSubtaskPic('');
                              setNewSubtaskDue('');
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
                            setCreatingSubtaskProjectId(project.id);
                            setNewSubtaskTitle('');
                            setNewSubtaskPic('');
                            setNewSubtaskDue('');
                            setNewSubtaskPriority('medium');
                          }}
                          className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] border border-dashed border-slate-300/80 dark:border-slate-700/80 bg-transparent text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-300 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-50/60 dark:hover:bg-violet-950/30 text-xs font-semibold transition-all cursor-pointer"
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
      </tbody></table>{!visibleProjects.length && <div className="p-12 text-center text-gray-500">{projects.length > 0 ? (lang === 'en' ? 'No projects match current filters.' : 'Không có dự án phù hợp bộ lọc.') : t('projects.noProjects')}</div>}</div></>}</section>)}
  
  
    </div>)}</div>

    {sourceTask && <TaskDetailPanel task={sourceTaskResource.tasks.find(task => task.id === sourceTask.id) || sourceTask} isOpen onClose={() => setSourceTask(null)} onTaskUpdated={() => void workflow.refresh()} />}

    {/* Right Side: Detail Panel */}
    <div
      ref={detailDrawerRef}
      key={selected?.id || selectedCampaign?.id || 'empty'}
      style={{ '--panel-width': `${width}px` } as React.CSSProperties}
      className={`dashboard-detail-drawer bg-white dark:bg-[#0a192f] shrink-0 ${
        panelOpen
          ? 'w-full max-w-full xl:max-w-[calc(100vw-32px)] xl:w-[var(--panel-width)] xl:max-w-[min(var(--panel-width),50vw)] opacity-100 pointer-events-auto drawer-slide-in border ' +
            (selectedCampaign
              ? 'shadow-drawer-campaign border-amber-500/20'
              : 'shadow-drawer-project border-violet-500/20')
          : 'w-0 min-w-0 shadow-none border-0 opacity-0 pointer-events-none'
      } z-[70] ${!resizing ? 'transition-[width,opacity] duration-300 ease-out' : ''}`}
    >
      {panelOpen && <div onMouseDown={() => setResizing(true)} className="hidden xl:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />}
      {selectedSubtask ? (
        <SubtaskDetailPanel
          embedded
          subtask={selectedSubtask}
          entityType={selectedCampaign ? 'campaign_subtask' : 'project_subtask'}
          profile={profile}
          people={people}
          parentName={selected?.name || selectedCampaign?.name}
          onClose={() => setSelectedSubtask(null)}
          onUpdated={(updatedSubtask) => {
            if (updatedSubtask) {
              const updateItems = (current: any[]) => current.map(item => String(item.id) === String(updatedSubtask.id) ? { ...item, ...updatedSubtask } : item);
              if (selectedCampaign) state.setCampaignSubtasks(updateItems);
              else setSubtasks(updateItems);
              setSelectedSubtask(updatedSubtask);
              if ((updatedSubtask.status || '').toLowerCase() === 'completed') {
                setRecentlyCompletedSubtaskId(updatedSubtask.id);
                window.setTimeout(() => setRecentlyCompletedSubtaskId(current => current === updatedSubtask.id ? null : current), 900);
              }
            }
            setRefreshDetailTrigger(v=>v+1);
          }}
        />
      ) : (
        <>
          {selected && (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
            <div className="grid grid-flow-col auto-cols-max items-center gap-2 min-w-0">
              <h3 className="font-bold text-xl text-gray-900 dark:text-white line-clamp-1">{selected.name}</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800">{t('projects.projects')}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => { setSelected(null); setParams({}, { replace: true }); }} className="p-2 rounded-[8px] hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
            {editMode ? (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">{t('projects.nameLabel')}</label>
                  <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-2.5 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold outline-none mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div className="tw-calendar-picker relative"><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.startDate')}</label><input type="text" id="edit-proj-start-input" readOnly onClick={e => (window as any).openCalendar?.({ displayId: 'edit-proj-start-input', mode: 'single' }, e)} value={start} onChange={e=>setStart(e.target.value)} placeholder="dd/mm/yyyy" className="w-full p-2.5 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm cursor-pointer"/></div>
                   <div className="tw-calendar-picker relative"><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.endDate')}</label><input type="text" id="edit-proj-due-input" readOnly onClick={e => (window as any).openCalendar?.({ displayId: 'edit-proj-due-input', mode: 'single' }, e)} value={due} onChange={e=>setDue(e.target.value)} placeholder="dd/mm/yyyy" className="w-full p-2.5 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm cursor-pointer"/></div>
                </div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.priority')}</label><select value={priority} onChange={e=>setPriority(e.target.value)} className="w-full p-2.5 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"><option value="low">{t('common.low')}</option><option value="medium">{t('common.medium')}</option><option value="high">{t('common.high')}</option><option value="urgent">{t('common.urgent')}</option></select></div>
                <EntityStatusField value={editStatus} onChange={setEditStatus} />
                <div><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.owner')}</label><MultiSelect options={visiblePeople.map(p => ({ value: String(p.id), label: p.name + (p.departments?.name ? ' ('+p.departments.name+')' : '') }))} value={ownerIds} onChange={setOwnerIds} placeholder={t('common.selectPic') + '...'} /></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.department') || (lang === 'en' ? 'Department' : 'Phòng ban')}</label><select value={departmentId} onChange={e=>setDepartmentId(e.target.value)} className="w-full p-2.5 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm text-gray-900 dark:text-white"><option value="">{lang === 'en' ? 'Select department...' : 'Chọn phòng ban...'}</option>{departments.map((dept: any) => (<option key={dept.id} value={dept.id}>{dept.name}</option>))}</select></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.description')}</label><textarea value={description} onChange={e=>setDescription(e.target.value)} className="w-full p-2.5 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none min-h-24 mt-1 text-sm" placeholder={t('tasks.descPlaceholder')}/></div>
                <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <button onClick={() => setEditMode(false)} className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 rounded-[8px] text-sm font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">{t('common.cancel')}</button>
                  <button onClick={saveInlineEdit} className="px-5 py-2.5 bg-[#002e6d] text-white rounded-[8px] text-sm font-semibold shadow-sm hover:bg-[#002150] transition-colors">{t('common.save')}</button>
                </div>
              </div>
            ) : (
<div className="space-y-7 animate-in fade-in duration-200">
              <EntityActionBadges
                priority={selected.priority || 'medium'}
                status={selected.status || 'active'}
                onPriorityChange={async (newPriority) => {
                  if (!selected || !canManageSelectedProject) return;
                  const { error } = await supabase.from('projects').update({ priority: newPriority }).eq('id', selected.id);
                  if (error) return toast.error('Lỗi cập nhật mức ưu tiên');
                  const updated = { ...selected, priority: newPriority };
                  setSelected(updated);
                  setPriority(newPriority);
                  setProjects(items => items.map(p => p.id === selected.id ? { ...p, priority: newPriority } : p));
                  window.dispatchEvent(new Event('projects:changed'));
                  void workflow.refreshTracks();
                  toast.success('Đã cập nhật mức ưu tiên');
                }}
                onStatusChange={async (newStatus) => {
                  if (!selected || !canManageSelectedProject) return;
                  const { error } = await supabase.from('projects').update({ status: newStatus }).eq('id', selected.id);
                  if (error) return toast.error('Lỗi cập nhật trạng thái');
                  const updated = { ...selected, status: newStatus };
                  setSelected(updated);
                  setEditStatus(newStatus);
                  setProjects(items => items.map(p => p.id === selected.id ? { ...p, status: newStatus } : p));
                  window.dispatchEvent(new Event('projects:changed'));
                  void workflow.refreshTracks();
                  toast.success('Đã cập nhật trạng thái');
                }}
                onEdit={() => {
                  setTitle(selected.name);
                  setDescription(selected.description || '');
                  setStart(selected.start_date || '');
                  setDue(selected.due_date || '');
                  setPriority(selected.priority || 'medium');
                  setEditStatus(selected.status || 'active');
                  setOwnerIds(picMembers[selected.id] || []);
                  setDepartmentId(selected.department_id ? String(selected.department_id) : '');
                  setEditMode(true);
                }}
                canManage={canManageSelectedProject}
                entityType="project"
                entityId={selected.id}
                entityName={selected.name}
              >
                {Boolean(departments.find(d => String(d.id) === String(selected.department_id))?.name) && (
                  <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 px-2.5 py-1 rounded-[6px] text-xs font-semibold border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-2xs truncate max-w-full">
                    {lang === 'en' ? 'Department' : 'Phòng ban'}: {departments.find(d => String(d.id) === String(selected.department_id))?.name}
                  </span>
                )}
              </EntityActionBadges>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-[8px] bg-slate-50 dark:bg-[#071325]/50 border border-blue-100 dark:border-slate-700 text-sm">
                <div>
                  <p className="text-[10px] uppercase text-gray-400 mb-1">{t('common.owner')}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(picMembers[selected?.id || ''] || []).length > 0 ? (picMembers[selected?.id || ''] || []).map(id => {
                      const p = people.find(p=>String(p.id)===id);
                      return p ? (
                        <div key={id} className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 rounded-full pr-3 pl-1 py-1">
                          <Avatar name={p.name} src={(p as any).avatar_url || undefined} className="w-5 h-5 text-[10px]" />
                          <span className="text-xs font-semibold">{p.name}{Number(id) === Number(projectPrimaryOwners[selected.id]) && <span className="ml-1 text-primary">· {t('common.primary')}</span>}</span>
                        </div>
                      ) : null;
                    }) : t('common.unassigned')}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-400 mb-1">{t('common.timeline')}</p>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap text-sm">
                    <span className="font-normal text-gray-700 dark:text-gray-300">{dateValue(selected?.start_date || '')}</span>
                    <span className="text-gray-400">–</span>
                    <span className="font-bold text-red-600 dark:text-red-400">{dateValue(selected?.due_date || '')}</span>
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-[10px] uppercase text-gray-400">{t('common.creator')}</p>
                  <div className="mt-1 font-semibold flex items-center gap-2">
                    <Avatar name={(selected as any)?.creator?.name || '---'} src={(selected as any)?.creator?.avatar_url} className="w-5 h-5 text-[10px] shadow-sm" />
                    <span className="line-clamp-1">{(selected as any)?.creator?.name || '---'}</span>
                  </div>
                </div>
              </div>
              <div id="workflow-phases-summary">
                <WorkflowTrackingSummary
                  kind="project"
                  id={selected.id}
                  hub={workflow}
                  onOpenTask={(task) => {
                    if (task.id.startsWith('ps-') || task.id.startsWith('cs-')) {
                      const rawId = task.id.replace(/^(ps|cs)-/, '');
                      const found = (subtasks || []).find((s: any) => String(s.id) === rawId || String(s.id) === task.id);
                      if (found) {
                        setSelectedSubtask(found);
                        return;
                      }
                    }
                    setSourceTask(task);
                  }}
                  statusFilter={statusFilter}
                />
              </div>
              <section>
                <div className="grid grid-flow-col auto-cols-max items-center gap-2 mb-2">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">{t('common.description')}</h3>
                  {canManageSelectedProject && !isEditingProjectDesc && (
                    <button
                      type="button"
                      onClick={() => { setProjectDescDraft(selected.description || ''); setIsEditingProjectDesc(true); }}
                      className="p-1 rounded-[6px] text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800/60 transition-colors border-0 shadow-none grid place-items-center cursor-pointer"
                      title={lang === 'en' ? 'Quick edit description' : 'Chỉnh sửa nhanh mô tả'}
                      aria-label={lang === 'en' ? 'Quick edit description' : 'Chỉnh sửa nhanh mô tả'}
                    >
                      <Edit3 size={14} />
                    </button>
                  )}
                </div>
                {isEditingProjectDesc ? (
                  <div className="space-y-2">
                    <textarea value={projectDescDraft} onChange={e => setProjectDescDraft(e.target.value)} className="w-full p-2.5 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none min-h-24 text-sm text-gray-900 dark:text-white focus:border-primary" placeholder={t('tasks.descPlaceholder')} />
                    <div className="grid grid-flow-col auto-cols-max gap-2 justify-end">
                      <button type="button" onClick={() => setIsEditingProjectDesc(false)} className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-[6px] text-xs font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">{t('common.cancel')}</button>
                      <button type="button" disabled={savingProjectDesc} onClick={handleSaveProjectDesc} className="px-3 py-1.5 bg-[#002e6d] text-white rounded-[6px] text-xs font-semibold hover:bg-[#002150] transition-colors disabled:opacity-50">{savingProjectDesc ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : t('common.save')}</button>
                    </div>
                  </div>
                ) : (
                  <TaskDescriptionViewer description={selected?.description} />
                )}
              </section>
              <section>
                {(() => {
                  const filteredSubtasks = filterProjectSubtasksForUser(subtasks, selected);
                  const projectPhases = workflow.tracks.find(t => t.entity_type === 'project' && String(t.entity_id).trim() === String(selected?.id).trim())?.phases || [];
                  const hasPhases = projectPhases.length > 0;
                  const unassignedSubtasks = filteredSubtasks.filter(s => {
                    if (s.status === 'deleted') return false;
                    if (!hasPhases) return true;
                    return !s.workflow_phase_id;
                  });
                  const doneCount = unassignedSubtasks.filter(s => isTaskDone(s.status)).length;
                  const openCount = unassignedSubtasks.filter(s => !isTaskDone(s.status)).length;
                  return (
                    <div className="grid grid-flow-col justify-between items-center mb-3">
                      <button
                        type="button"
                        onClick={() => setProjectSubtasksCollapsed(v => !v)}
                        className="grid grid-flow-col auto-cols-max items-center gap-2 font-bold text-sm text-gray-900 dark:text-white hover:text-primary transition-colors cursor-pointer select-none"
                        aria-expanded={!projectSubtasksCollapsed}
                        title={projectSubtasksCollapsed ? (lang === 'en' ? 'Expand tasks' : 'Mở rộng task') : (lang === 'en' ? 'Collapse tasks' : 'Thu gọn task')}
                      >
                        <Users size={16}/>
                        <span>{t('projects.tasksInProject')}</span>
                        {doneCount > 0 && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-[6px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {doneCount} {lang === 'en' ? 'completed' : 'hoàn thành'}
                          </span>
                        )}
                        {openCount > 0 && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-[6px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            {openCount} {lang === 'en' ? 'in progress' : 'chưa hoàn thành'}
                          </span>
                        )}
                        <ChevronDown size={15} className={`text-gray-400 transition-transform duration-200 ${projectSubtasksCollapsed ? '-rotate-90' : ''}`} />
                      </button>
                    </div>
                  );
                })()}
                {!projectSubtasksCollapsed && (
                  <>
                    {(() => {
                      const filteredSubtasks = filterProjectSubtasksForUser(subtasks, selected);
                      const projectPhases = workflow.tracks.find(t => t.entity_type === 'project' && String(t.entity_id).trim() === String(selected?.id).trim())?.phases || [];
                      const hasPhases = projectPhases.length > 0;
                      const unassignedSubtasks = filteredSubtasks.filter(s => {
                        if (s.status === 'deleted') return false;
                        if (!hasPhases) return true;
                        return !s.workflow_phase_id;
                      });
                      const visibleSubtasks = unassignedSubtasks.filter(s => statusFilter === 'completed' ? isTaskDone(s.status) : true);

                      if (visibleSubtasks.length === 0) {
                        return null;
                      }

                      return (
                        <div className="space-y-2">
                          {visibleSubtasks.map(s => {
                            const canToggle = selectedRoot || isGlobalManager(profile) || Number(s.assignee_id) === Number(profile?.id);
                            const pIdx = s.workflow_phase_id ? projectPhases.findIndex(p => p.id === s.workflow_phase_id) : -1;
                            const assignedPhase = pIdx >= 0 ? projectPhases[pIdx] : null;

                            return (
                              <div
                                key={s.id}
                                onClick={() => setSelectedSubtask(s)}
                                className={`p-3 rounded-[8px] border text-sm group relative transition-all cursor-pointer min-w-0 overflow-hidden ${
                                  isTaskDone(s.status)
                                    ? 'border-emerald-400/70 dark:border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60'
                                    : 'border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-gray-100/60 dark:hover:bg-slate-800/70'
                                } ${recentlyCompletedSubtaskId === s.id ? 'subtask-complete-pulse' : ''}`}
                              >
                                {/* Hover action buttons in top-right */}
            <div
              className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity grid grid-flow-col auto-cols-max items-center gap-1 z-10"
              onClick={event => event.stopPropagation()}
            >
              {canToggle && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); void toggleSubtask(s); }}
                  title={isTaskDone(s.status) ? (lang === 'en' ? 'Reopen' : 'Mở lại') : (lang === 'en' ? 'Mark done' : 'Hoàn thành nhanh')}
                  aria-label={isTaskDone(s.status) ? (lang === 'en' ? 'Reopen' : 'Mở lại') : (lang === 'en' ? 'Mark done' : 'Hoàn thành nhanh')}
                  className="p-1 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                >
                  <Check size={13} strokeWidth={2.5} />
                </button>
              )}
              <TaskPinButton taskId={taskKey('project_subtask', s.id)} size={13} className="!p-1" />
              {selectedRoot && (
                <button
                  type="button"
                  onClick={() => removeSubtask(s.id)}
                  title={lang === 'en' ? 'Delete task' : 'Xóa task'}
                  aria-label={lang === 'en' ? 'Delete task' : 'Xóa task'}
                  className="p-1 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            {/* Main content layout: Title (with done checkmark icon) + Metadata (REQ-TOT-05 / Slide 4) */}
            <div className="min-w-0 grid grid-cols-1 gap-1.5 pr-14 select-none">
              {/* Row 1: Title */}
              <span className={`text-sm font-semibold inline-block break-words line-clamp-2 ${isTaskDone(s.status) ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-900 dark:text-white'}`}>
                {s.title}
                {isTaskDone(s.status) && (
                  <CheckCircle2 size={14} className="inline-block ml-1.5 text-emerald-500 dark:text-emerald-400 shrink-0 align-middle" />
                )}
              </span>

                {/* Row 2: Badges */}
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
                  <span className={`px-2 py-0.5 rounded-[6px] text-[11px] font-semibold lowercase ${priorityClass(s.priority || selected?.priority || 'medium')}`}>
                    {t(`common.${s.priority || selected?.priority || 'medium'}` as any).toLowerCase()}
                  </span>
                  {assignedPhase && (
                    <span
                      title={lang === 'en' ? `Assigned to phase: ${assignedPhase.title || pIdx + 1}` : `Giai đoạn: ${assignedPhase.title || pIdx + 1}`}
                      className="inline-grid grid-flow-col auto-cols-max items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[6px] border border-purple-200/80 dark:border-purple-800/60 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                    >
                      <Layers size={11} /> {assignedPhase.title?.trim() ? `${assignedPhase.position || pIdx + 1}. ${assignedPhase.title.trim()}` : `Phase ${assignedPhase.position || pIdx + 1}`}
                    </span>
                  )}
                  {Boolean(subtaskQuantities?.[s.id] || s.quantity) && (
                    <span className="px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                      SL: {subtaskQuantities?.[s.id] || s.quantity}
                    </span>
                  )}
                  {s.due_date && (
                    <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[6px] border border-red-200/80 dark:border-red-800/60 bg-red-50/80 text-red-600 dark:bg-red-950/30 dark:text-red-400">
                      <Calendar size={11} /> {dateValue(s.due_date)}
                    </span>
                  )}
                  {subtaskChecklistCounts[s.id]?.total > 0 && (() => {
                    const { done, total } = subtaskChecklistCounts[s.id];
                    const isAllDone = done === total && total > 0;
                    return (
                      <span
                        title={lang === 'en' ? `Subtask: ${done}/${total} completed` : `Subtask: ${done}/${total} hoàn thành`}
                        className={`inline-grid grid-flow-col auto-cols-max items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[6px] border ${
                          isAllDone
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60'
                            : 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-800/60'
                        }`}
                      >
                        <ListTodo size={11} />
                        <span>{done}/{total}</span>
                      </span>
                    );
                  })()}
                  {subtaskCommentCounts[s.id] > 0 && (
                    <CommentPreviewPopover
                      entityType="project_subtask"
                      entityId={s.id}
                      entityTitle={s.title}
                      count={subtaskCommentCounts[s.id]}
                      hasUnreadDot={Boolean(Number(s.assignee_id) === Number(profile?.id) || hasMentionOrUnread?.[s.id])}
                      onOpenFull={() => setSelectedSubtask(s)}
                    />
                  )}
                </div>

                {/* Row 3: Meta */}
                {(s.assignee || s.created_at) && (
                  <div className="grid grid-flow-col auto-cols-max items-center gap-2 text-xs text-gray-500 dark:text-gray-400 overflow-x-auto scrollbar-none">
                    {s.assignee && (
                      <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-md text-gray-700 dark:text-gray-300 text-[11px] font-medium">
                        <Avatar name={s.assignee.name} src={s.assignee.avatar_url || undefined} className="w-4 h-4 text-[9px]" />
                        <span className="line-clamp-1">{s.assignee.name}</span>
                      </span>
                    )}
                    {s.created_at && (
                      <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 text-[11px] font-normal text-gray-400 dark:text-gray-500">
                        <Clock3 size={11} />
                        <span>{formatCreatedAt(s.created_at)}</span>
                        {s.updated_at && new Date(s.updated_at).getTime() > new Date(s.created_at).getTime() + 1000 && (
                          <span>· {lang === 'en' ? 'Edited' : 'Đã chỉnh sửa'}</span>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  })()}
    {selectedRoot && !showSubtaskForm && <ActionButton icon={<Plus size={16} className="inline mr-1" />} onClick={() => setShowSubtaskForm(true)} className="mt-3 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-[8px] transition-colors border border-primary/20 w-full text-center border-dashed"> {t('projects.addSubtask')}</ActionButton>}
{selectedRoot && showSubtaskForm && (
  <div className="mt-3 p-3 bg-gray-50 dark:bg-[#0a192f] rounded-[8px] border border-gray-200 dark:border-slate-700 space-y-3">
    <input value={newSubtask} onChange={e=>setNewSubtask(e.target.value)} placeholder={t('projects.subtaskPlaceholder')} className="w-full p-2 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#071325] text-gray-900 dark:text-white outline-none text-sm"/>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
      <select value={subtaskOwner} onChange={e=>setSubtaskOwner(e.target.value)} className="p-2 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#071325] text-gray-900 dark:text-white outline-none text-sm">
        <option value="">{t('common.selectPic')}</option>
        {visiblePeople.map(p=><option key={p.id} value={p.id}>{p.name} {p.departments?.name ? '('+p.departments.name+')' : ''}</option>)}
      </select>
      <select value={subtaskPriority} onChange={e=>setSubtaskPriority(e.target.value)} className="p-2 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#071325] text-gray-900 dark:text-white outline-none text-sm font-medium">
        <option value="low">{t('common.low')}</option>
        <option value="medium">{t('common.medium')}</option>
        <option value="high">{t('common.high')}</option>
      </select>
      <input type="number" min="0" step="1" value={subtaskQuantity} onChange={e=>setSubtaskQuantity(e.target.value)} placeholder={t('tasks.quantity')} className="p-2 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#071325] text-gray-900 dark:text-white outline-none text-sm"/>
      <div className="tw-calendar-picker relative w-full">
        <input type="text" id="subtask-due-input" readOnly onClick={(e) => { if ((window as any).openCalendar) (window as any).openCalendar({ displayId: 'subtask-due-input', mode: 'single' }, e); }} value={subtaskDue} onChange={(e) => setSubtaskDue(e.target.value)} placeholder="dd/mm/yyyy" className="p-2 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#071325] text-gray-900 dark:text-white outline-none text-sm w-full cursor-pointer"/>
      </div>
    </div>
    <div className="grid grid-flow-col justify-end gap-2">
      <button type="button" onClick={() => setShowSubtaskForm(false)} className="px-3 py-1.5 text-sm font-medium rounded-[8px] hover:bg-gray-200/70 dark:hover:bg-slate-800 transition-colors">{t('common.cancel')}</button>
      <button type="button" onClick={() => { addSubtask(); setShowSubtaskForm(false); }} className="px-3.5 py-1.5 bg-[#002e6d] text-white text-sm font-semibold rounded-[8px] hover:bg-[#002557] transition-colors shadow-sm">{t('common.add')}</button>
    </div>
  </div>
)}</>)}</section>
      <section><h3 className="font-bold text-sm flex gap-2 items-center mb-3"><MessageSquare size={16}/> {t('common.activityComments')}</h3><div className="space-y-3">{comments.map(c => <CommentMessage key={c.id} id={c.id} authorId={c.author_id} actorId={profile?.id}
        authorName={c.author?.name || 'Member'} avatarUrl={c.author?.avatar_url} body={c.body} createdAt={c.created_at} editedAt={c.edited_at}
        onEdit={saveEditedComment} onDelete={removeComment}
        onReply={()=>{setComment(value=>`${value}${value && !value.endsWith(' ') ? ' ' : ''}@${(c.author?.name || 'Member').replace(/\s+/g,'')} `);window.setTimeout(()=>projectCommentInput.current?.focus(),0);}} />)}</div><div className="mt-4"><SmartCommentInput inputRef={projectCommentInput} value={comment} onChange={setComment} onSubmit={body => void addComment(body)} people={visiblePeople} collaboratorIds={projectCollaboratorIds} placeholder="Add a comment..." /></div></section>

            </div>
            )}
          </div>
        </div>
      )}
      <CampaignDetailDrawer state={state} />
        </>
      )}
    </div>

    {/* Mobile/Tablet Backdrop when Create Drawer is open */}
    {createOpen && (
      <div 
        className="fixed inset-0 bg-slate-900/30 dark:bg-slate-900/60 z-[70] xl:hidden backdrop-blur-xs transition-opacity"
        onClick={() => setCreateOpen(false)}
      />
    )}

    <div style={{ '--drawer-width': `${width}px` } as React.CSSProperties} className={`dashboard-detail-drawer bg-white dark:bg-[#0a192f] shrink-0 ${createOpen ? 'w-full max-w-full xl:max-w-[calc(100vw-32px)] xl:w-[var(--drawer-width)] shadow-drawer-task border border-blue-500/20 opacity-100 pointer-events-auto drawer-slide-in' : 'w-0 min-w-0 shadow-none border-0 opacity-0 pointer-events-none'} z-[75] ${!resizing ? 'transition-[width,opacity] duration-300 ease-out' : ''}`}>
      {createOpen && <>
      <div onMouseDown={() => setResizing(true)} className="hidden xl:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0"><h3 className="font-bold text-xl text-gray-900 dark:text-white">{t('projects.createTitle')}</h3><ActionButton icon={<X className="w-5 h-5 text-gray-500" />} disabled={creating} aria-label={t('common.close')} onClick={() => setCreateOpen(false)} className="p-2 rounded-[8px] hover:bg-gray-100 dark:hover:bg-slate-700"></ActionButton></div>
      <form onSubmit={createItem} aria-busy={creating} className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="min-h-0 min-w-0 p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-4">
        <fieldset disabled={creating} className="min-w-0 space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-[8px] bg-gray-100 dark:bg-slate-900 p-1" role="tablist" aria-label="Loại khởi tạo">
          <button
            type="button"
            role="tab"
            aria-selected={creationType === 'campaign'}
            onClick={() => {
              const currentStatus = creationType === 'campaign' ? campaignStatus : editStatus;
              setCreationType('campaign');
              if (!campaignObjective) setCampaignObjective(description);
              if (viewMode === 'board') {
                setCampaignStatus(currentStatus);
                setEditStatus(currentStatus);
              }
            }}
            className={`rounded-[6px] px-3 py-2 text-sm font-semibold transition-colors ${creationType === 'campaign' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-gray-500'}`}
          >
            {t('projects.typeCampaign')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={creationType === 'project'}
            onClick={() => {
              const currentStatus = creationType === 'campaign' ? campaignStatus : editStatus;
              setCreationType('project');
              if (!description) setDescription(campaignObjective);
              if (primaryOwnerId) setOwnerIds(ids => Array.from(new Set([...ids, primaryOwnerId])));
              if (viewMode === 'board') {
                setEditStatus(currentStatus);
                setCampaignStatus(currentStatus);
              }
            }}
            className={`rounded-[6px] px-3 py-2 text-sm font-semibold transition-colors ${creationType === 'project' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-gray-500'}`}
          >
            {t('projects.typeProject')}
          </button>
        </div>

        {viewMode === 'board' && (
          <div>
            <EntityStatusField
              value={creationType === 'campaign' ? campaignStatus : editStatus}
              onChange={(newStatus) => {
                setEditStatus(newStatus);
                setCampaignStatus(newStatus);
              }}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('projects.nameLabel')} <span className="text-red-500">*</span></label>
          <input type="text" required value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-[8px] bg-white dark:bg-[#0a192f] text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-gray-400 shadow-sm" placeholder={t('projects.namePlaceholder')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="tw-calendar-picker relative"><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('common.startDate')}</label><input type="text" id="create-start-input" readOnly onClick={(e) => { if ((window as any).openCalendar) (window as any).openCalendar({ displayId: 'create-start-input', mode: 'single' }, e); }} value={start} onChange={(e) => setStart(e.target.value)} placeholder="dd/mm/yyyy" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-[8px] bg-white dark:bg-[#0a192f] text-gray-900 dark:text-white cursor-pointer shadow-sm" /></div>
          <div className="tw-calendar-picker relative"><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('common.dueDate')}</label><input type="text" id="create-end-input" readOnly onClick={(e) => { if ((window as any).openCalendar) (window as any).openCalendar({ displayId: 'create-end-input', mode: 'single' }, e); }} value={due} onChange={(e) => setDue(e.target.value)} placeholder="dd/mm/yyyy" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-[8px] bg-white dark:bg-[#0a192f] text-gray-900 dark:text-white cursor-pointer shadow-sm" /></div>
        </div>

        <div className="space-y-3"><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">{t('projects.primaryOwner')} <span className="text-red-500">*</span></label>
          <MultiSelect options={creationPeople.map(p=>({value:String(p.id),label:p.name + (p.departments?.name ? ` · ${p.departments.name}` : '')}))} value={ownerIds} primaryValue={primaryOwnerId} onPrimaryChange={setPrimaryOwnerId} onChange={(ids: string[]) => { setOwnerIds(ids); if (!ids.includes(primaryOwnerId)) setPrimaryOwnerId(ids[0] || ''); }} placeholder={t('projects.tagMembers')} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
            {t('common.department') || 'Phòng ban'}
          </label>
          <select
            value={departmentId}
            onChange={e => setDepartmentId(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-[8px] bg-white dark:bg-[#0a192f] text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
          >
            <option value="">{lang === 'en' ? 'Select department...' : 'Chọn phòng ban...'}</option>
            {creationDepartments.map((d: any) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {creationType === 'campaign' ? <div><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('projects.objectives')}</label><textarea value={campaignObjective} onChange={e=>setCampaignObjective(e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-[8px] bg-white dark:bg-[#0a192f] text-gray-900 dark:text-white" placeholder={t('projects.objectives')} /></div> : <div><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('common.description')}</label><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-[8px] bg-white dark:bg-[#0a192f] text-gray-900 dark:text-white" placeholder={t('tasks.descPlaceholder')} /></div>}

        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm font-semibold text-primary hover:underline">{showAdvanced ? t('projects.hideMore') : t('projects.showMore')}</button>
        {showAdvanced && (creationType === 'project' ? <div className="space-y-4 rounded-[8px] border border-gray-100 dark:border-slate-700 bg-gray-50/70 dark:bg-[#071325]/40 p-4">
          <div><label className="block text-sm font-semibold mb-1">{t('projects.belongsToCampaign')}</label><select value={parentCampaignId} onChange={e=>selectParentCampaign(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-[8px] bg-white dark:bg-[#0a192f]"><option value="">{t('projects.standalone')}</option>{campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="block text-sm font-semibold mb-1">{t('common.priority')}</label><select value={priority} onChange={e=>setPriority(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-[8px] bg-white dark:bg-[#0a192f]"><option value="high">{t('common.high')}</option><option value="medium">{t('common.medium')}</option><option value="low">{t('common.low')}</option></select></div>
          <div><label className="block text-sm font-semibold mb-1">{t('projects.executingMembers')}</label><MultiSelect options={creationPeople.filter(p=>String(p.id)!==primaryOwnerId).map(p=>({value:String(p.id),label:p.name}))} value={executionMemberIds} onChange={setExecutionMemberIds} placeholder={t('projects.tagMembers')} /></div>
          <div><label className="block text-sm font-semibold mb-1">{t('projects.attachments')}</label><input value={attachmentUrl} onChange={e=>setAttachmentUrl(e.target.value)} placeholder={t('projects.pasteLink')} className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-[8px] bg-white dark:bg-[#0a192f]" /><label className="mt-2 flex cursor-pointer items-center justify-center rounded-[8px] border border-dashed border-primary/30 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5"><input type="file" className="sr-only" onChange={e=>setAttachmentFile(e.target.files?.[0] || null)} />{attachmentFile ? attachmentFile.name : t('projects.orChooseFile')}</label></div>
        </div> : <div className="space-y-4 rounded-[8px] border border-gray-100 dark:border-slate-700 bg-gray-50/70 dark:bg-[#071325]/40 p-4"><div><label className="block text-sm font-semibold mb-1">{t('projects.totalBudget')}</label><div className="relative"><input type="number" min="0" value={campaignBudget} onChange={e=>setCampaignBudget(e.target.value)} className="w-full px-3 py-2.5 pr-14 border border-gray-200 dark:border-slate-700 rounded-[8px] bg-white dark:bg-[#0a192f]" placeholder={t('projects.budgetPlaceholder')} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-gray-500 pointer-events-none">VND</span></div></div><div><label className="block text-sm font-semibold mb-2">{t('projects.channels')}</label><div className="grid grid-cols-2 gap-2 text-sm">{['Social Media','OOH','In-store','PR','Digital Ads','CRM'].map(channel => <label key={channel} className="grid grid-flow-col auto-cols-max items-center gap-2 rounded-[6px] bg-white dark:bg-[#0a192f] px-3 py-2"><input type="checkbox" checked={campaignChannels.includes(channel)} onChange={() => setCampaignChannels(values => values.includes(channel) ? values.filter(value => value !== channel) : [...values, channel])} />{channel}</label>)}</div></div><div><label className="block text-sm font-semibold mb-1">{t('projects.attachments')}</label><input value={attachmentUrl} onChange={e=>setAttachmentUrl(e.target.value)} placeholder={t('projects.pasteLink')} className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-[8px] bg-white dark:bg-[#0a192f]" /><label className="mt-2 grid grid-flow-col auto-cols-max items-center justify-center cursor-pointer rounded-[8px] border border-dashed border-primary/30 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5"><input type="file" className="sr-only" onChange={e=>setAttachmentFile(e.target.files?.[0] || null)} />{attachmentFile ? attachmentFile.name : t('projects.orChooseFile')}</label></div></div>)}

        </fieldset>
      </div>
        <div className="p-5 border-t border-gray-200 dark:border-slate-700 flex gap-3 shrink-0 bg-white dark:bg-[#0a192f]"><button type="button" disabled={creating} onClick={() => setCreateOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-[8px] font-bold text-sm hover:bg-gray-50 dark:hover:bg-slate-700">{t('common.cancel')}</button><button disabled={creating || !title.trim() || !primaryOwnerId} type="submit" className="min-w-0 flex-1 disabled:opacity-50 px-4 py-2.5 bg-[#002e6d] hover:bg-[#001f4d] text-white font-bold text-sm rounded-[8px]">{creating ? t('projects.creating') : t('projects.createBtn')}</button></div>
      </form>
      </>}
    </div>
      <ConfirmDeleteModal isOpen={!!projectToDelete} title="Xóa Dự án" message={`Bạn có chắc muốn xóa dự án "${projectToDelete?.name}"? Tất cả subtask của dự án này cũng sẽ bị xóa.`} onConfirm={executeRemoveProject} onCancel={() => setProjectToDelete(null)} />
      <ConfirmDeleteModal isOpen={!!subtaskToDelete} title="Xóa Subtask" message="Bạn có chắc muốn xóa subtask này?" onConfirm={executeRemoveSubtask} onCancel={() => setSubtaskToDelete(null)} />
      <ConfirmDeleteModal isOpen={!!campaignSubtaskToDelete} title="Xóa Subtask" message={`Bạn có chắc muốn xóa subtask "${campaignSubtaskToDelete?.title || ''}"?`} onConfirm={executeRemoveCampaignSubtask} onCancel={() => setCampaignSubtaskToDelete(null)} />
    <ConfirmHideModal isOpen={!!projectToHide} title="Ẩn Dự án" message={`Bạn có chắc muốn ẩn dự án "${projectToHide?.name}"? Dự án sẽ được đưa vào lưu trữ và có thể khôi phục sau.`} onConfirm={executeHideProject} onCancel={() => setProjectToHide(null)} />
  </div>
);
};
