import { useRecentItemsStore } from '../store/recentItemsStore';
import {useWorkspaceDirectory} from './useWorkspaceData';
import {hasCanonicalNotifications} from '../store/notificationStore';
import React,{useEffect,useMemo,useState,useRef} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useWorkflowHub} from './useWorkflowHub';
import {useWorkspaceRealtime} from './useWorkspaceRealtime';
import type {Task} from './useTasks';
import toast from 'react-hot-toast';
import {useTranslation} from '../i18n/translations';
import {supabase} from '../services/supabase';
import {readAll} from '../services/workspaceTasks';
import {useAuthStore} from '../store/authStore';
import {checkDateMatch,type CampaignFilters} from '../components/features/projects/CampaignPanel';
import {recordTaskDeletion} from '../services/taskDeletionLog';
import {type Project,type Person,strictFormatVN,getCampaignPriority} from '../components/features/projects/projectPresentation';
import {canViewTeamManagement,isGlobalManager,isAdmin,isDepartmentLeader} from '../lib/roleScope';
import {isTaskDone} from '../lib/taskTracking';
import {deleteOwnedComment,ownsComment} from '../lib/commentDeletion';
import {editOwnedComment} from '../lib/commentEditing';
import {useRememberedState} from './useRememberedState';
import {completeTrackedTask} from '../services/workspaceTasks';
import {saveTaskDeliverables, computeDeliverableQuantity} from '../lib/taskDeliverables';
import {workAssignmentPeople} from '../lib/workAccessScope';
import {parentCreationError} from '../lib/parentCreationError';
import {workspaceChangeRelevant} from '../lib/workspaceInvalidation';
import {saveEntityPhasePermission, loadPhasePermissionsFromLogs} from '../lib/phasePermission';
export function useProjectsController(){
  const { t, lang } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [sourceTask, setSourceTask] = useState<Task | null>(null);
  const [selected, setSelected] = useState<Project | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  // The Projects route reads its own project/campaign subtasks. Loading the
  // complete All Tasks workspace on list entry duplicates six table reads and
  // their activity-history lookups. Load it only when a detail panel needs its
  // workflow summary; the list uses the scoped subtask queries below.
  const workflow = useWorkflowHub({includeTasks:Boolean(selected || selectedCampaign)});
  const loadRequest = useRef(0);
  const profile = useAuthStore(s => s.profile);
  const canCreate = canViewTeamManagement(profile) && (isGlobalManager(profile) || Boolean(profile?.department_id));
  const canManageProject = (project: Project) => Boolean(profile && (isGlobalManager(profile) || project.created_by === profile.id || workflow.tracks.some(track => track.entity_type === 'project' && track.entity_id === project.id && track.root)));
  const [projects, setProjects] = useState<Project[]>([]);   const directory=useWorkspaceDirectory();
  const people=useMemo(()=>(directory.data?.users||[]).map(user=>({...user,id:Number(user.id),departments:user.department})),[directory.data]);
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
  const canHideOrDeleteParent = Boolean(isManager || isLeader);
  const userIsRestricted = isStaff && Boolean(resolvedDeptId || profile?.department_name);
  const [members, setMembers] = useState<Record<string, string[]>>({});
  const [storedPicMembers, setPicMembers] = useState<Record<string, string[]>>({});
  const picMembers = useMemo(() => ({ ...storedPicMembers, ...Object.fromEntries(workflow.tracks.filter(track => track.entity_type === 'project').map(track => [track.entity_id, track.pics.map(p => String(p.id))])) }), [storedPicMembers, workflow.tracks]);
  const [selectedRoot, setSelectedRoot] = useState(false);
  useEffect(() => {
    setSelectedRoot(false);
    const id = selected?.id || selectedCampaign?.id;
    let active = true;
    if (id) supabase.rpc('workflow_root', { k: selected ? 'project' : 'campaign', e: id }).then(({ data }) => { if (active) setSelectedRoot(data === true); });
    return () => { active = false; };
  }, [selected?.id, selectedCampaign?.id, profile?.id,profile?.role,profile?.employment_level]);
  const [projectsExpanded, setProjectsExpanded] = useRememberedState('projects.expanded', true);
  const [, setRecentEntities] = useRememberedState<Record<string, number>>('workflow.recentEntities', {});
  useEffect(() => {
    if (selected?.id) {
      setRecentEntities(prev => ({ ...prev, [`project:${selected.id}`]: Date.now() }));
      useRecentItemsStore.getState().addItem({
        id: String(selected.id),
        title: (selected as any).title || (selected as any).name || "Project",
        kind: "project",
        path: `/projects?project=${selected.id}`,
      });
    } else if (selectedCampaign?.id) {
      setRecentEntities(prev => ({ ...prev, [`campaign:${selectedCampaign.id}`]: Date.now() }));
      useRecentItemsStore.getState().addItem({
        id: String(selectedCampaign.id),
        title: (selectedCampaign as any).title || (selectedCampaign as any).name || "Campaign",
        kind: "campaign",
        path: `/projects?campaign=${selectedCampaign.id}`,
      });
    }
  }, [selected?.id, selectedCampaign?.id]);


  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const creationLock = React.useRef(false);
  const [executionMemberIds, setExecutionMemberIds] = useState<string[]>([]);
  const [projectPrimaryOwners, setProjectPrimaryOwners] = useState<Record<string, number>>({});
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [projectToHide, setProjectToHide] = useState<Project | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<any | null>(null);
  const [campaignToHide, setCampaignToHide] = useState<any | null>(null);
  const [subtaskToDelete, setSubtaskToDelete] = useState<string | null>(null); const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [allowPhaseCreation, setAllowPhaseCreation] = useState(true);
  const [campaignSubtaskToDelete, setCampaignSubtaskToDelete] = useState<any | null>(null);
  const [start, setStart] = useState(''); const [due, setDue] = useState(''); const [priority, setPriority] = useState('medium'); const [ownerIds, setOwnerIds] = useState<string[]>([]);
  const [creationType, setCreationType] = useState<'project' | 'campaign'>('project'); const [showAdvanced, setShowAdvanced] = useState(false);
  const [primaryOwnerId, setPrimaryOwnerId] = useState(''); const [parentCampaignId, setParentCampaignId] = useState(''); const [departmentId, setDepartmentId] = useState('');
  const [campaignObjective, setCampaignObjective] = useState(''); const [campaignBudget, setCampaignBudget] = useState(''); const [campaignStatus, setCampaignStatus] = useState('planning');
  const [campaignChannels, setCampaignChannels] = useState<string[]>([]); const [attachmentUrl, setAttachmentUrl] = useState(''); const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignSubtasks, setCampaignSubtasks] = useState<any[]>([]); const [campaignComments, setCampaignComments] = useState<any[]>([]);
  const [campaignNewSubtask, setCampaignNewSubtask] = useState(''); const [campaignSubtaskOwner, setCampaignSubtaskOwner] = useState(''); const [campaignSubtaskDue, setCampaignSubtaskDue] = useState(''); const [campaignSubtaskQuantity, setCampaignSubtaskQuantity] = useState(''); const [showCampaignSubtaskForm, setShowCampaignSubtaskForm] = useState(false); const [campaignComment, setCampaignComment] = useState(''); const [campaignEditMode, setCampaignEditMode] = useState(false);
  const [subtasks, setSubtasks] = useState<any[]>([]); const [comments, setComments] = useState<any[]>([]);
  const [selectedSubtask, setSelectedSubtask] = useState<any | null>(null);
  useEffect(() => {
    if (selectedSubtask?.id) {
      useRecentItemsStore.getState().addItem({
        id: String(selectedSubtask.id),
        title: (selectedSubtask as any).title || (selectedSubtask as any).name || "Subtask",
        kind: "subtask",
        path: `/projects?subtask=${selectedSubtask.id}`,
      });
    }
  }, [selectedSubtask?.id]);
  const [subtaskCommentCounts, setSubtaskCommentCounts] = useState<Record<string, number>>({});
  const [subtaskChecklistCounts, setSubtaskChecklistCounts] = useState<Record<string, { total: number; done: number }>>({});
  const [campaignSubtaskCommentCounts, setCampaignSubtaskCommentCounts] = useState<Record<string, number>>({});
  const [campaignSubtaskChecklistCounts, setCampaignSubtaskChecklistCounts] = useState<Record<string, { total: number; done: number }>>({});
  const [subtaskQuantities, setSubtaskQuantities] = useState<Record<string, number>>({});
  const [campaignSubtaskQuantities, setCampaignSubtaskQuantities] = useState<Record<string, number>>({});
  const [hasCampaignComments, setHasCampaignComments] = useState<Record<string, boolean>>({});
  const [hasMentionOrUnread, setHasMentionOrUnread] = useState<Record<string, boolean>>({});
  const [recentlyCompletedSubtaskId, setRecentlyCompletedSubtaskId] = useState<string | null>(null);
  const [refreshDetailTrigger, setRefreshDetailTrigger] = useState(0);

  const commentMutationLock = useRef(new Set<string>());
  const removeComment = async (id: string) => {
    const comment=comments.find(c=>String(c.id)===String(id)),key=`project:${id}`;
    if(!selected||!profile?.id||!comment||!ownsComment(profile.id,comment.author_id)) throw new Error('Bạn chỉ được xóa bình luận của mình.');
    if(commentMutationLock.current.has(key)) return false;
    commentMutationLock.current.add(key);
    try {
      await deleteOwnedComment(supabase,{kind:'project',id:selected.id},id,profile.id);
      setComments(current=>current.filter(c=>String(c.id)!==String(id))); return true;
    } finally {commentMutationLock.current.delete(key);}
  };
  const saveEditedComment = async (id: string, body: string) => {
    const comment=comments.find(c=>String(c.id)===String(id)),key=`project:${id}`;
    if(!selected||!profile?.id||!comment||!ownsComment(profile.id,comment.author_id)) throw new Error('Bạn chỉ được sửa bình luận của mình.');
    if(commentMutationLock.current.has(key)) return false;
    commentMutationLock.current.add(key);
    try {
      await editOwnedComment(supabase,{kind:'project',id:selected.id},id,profile.id,body);
      setComments(current=>current.map(c=>String(c.id)===String(id)?{...c,body:body.trim(),edited_at:new Date().toISOString()}:c)); return true;
    } finally {commentMutationLock.current.delete(key);}
  };
  const [editStatus, setEditStatus] = useState('active');
  const [newSubtask, setNewSubtask] = useState(''); const [editMode, setEditMode] = useState(false); const [showSubtaskForm, setShowSubtaskForm] = useState(false); const [width, setWidth] = useState(500); const [resizing, setResizing] = useState(false); const [subtaskOwner, setSubtaskOwner] = useState(''); const [subtaskDue, setSubtaskDue] = useState(''); const [subtaskQuantity, setSubtaskQuantity] = useState(''); const [subtaskPriority, setSubtaskPriority] = useState('medium'); const [campaignSubtaskPriority, setCampaignSubtaskPriority] = useState('medium'); const [comment, setComment] = useState('');

  const panelOpen = Boolean(selected || selectedCampaign);


  useEffect(() => {
    if (!resizing) return;
    const move = (e: MouseEvent) => {
      const scaleEl = document.querySelector('.dashboard-scale') as HTMLElement | null;
      const zoom = scaleEl ? parseFloat(getComputedStyle(scaleEl).zoom || '1') || 1 : 1;
      const rawWidth = (window.innerWidth - e.clientX) / zoom;
      setWidth(Math.max(400, Math.min(Math.round(rawWidth), 860)));
    };
    const up = () => setResizing(false);
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
  }, [resizing]);



  // Selecting another department's PIC is an explicit invitation, not a global
  const visiblePeople = people;
  const creationPeople=useMemo(()=>workAssignmentPeople(profile,people),[profile,people]);
  const creationDepartments=departments;
  const projectCommentInput = React.useRef<HTMLTextAreaElement>(null);
  const projectMentionQuery = useMemo(() => comment.match(/(?:^|\s)@([^\s@]*)$/)?.[1]?.toLowerCase() || null, [comment]);
  const projectMentionOptions = useMemo(() => projectMentionQuery === null ? [] : visiblePeople.filter(person => person.name.toLowerCase().includes(projectMentionQuery)).slice(0, 5), [projectMentionQuery, visiblePeople]);
  const chooseProjectMention = (person: Person) => {
    setComment(value => value.replace(/@[^\s@]*$/, `@${person.name.replace(/\s+/g, '')} `));
    projectCommentInput.current?.focus();
  };
  const [campaignEditingSubtaskId, setCampaignEditingSubtaskId] = useState<string | null>(null);
  const [campaignEditSubtaskTitle, setCampaignEditSubtaskTitle] = useState('');
  const [campaignEditSubtaskOwner, setCampaignEditSubtaskOwner] = useState('');
  const [campaignEditSubtaskDue, setCampaignEditSubtaskDue] = useState('');
  const campaignCommentInput = React.useRef<HTMLTextAreaElement>(null);
  const campaignMentionQuery = useMemo(() => campaignComment.match(/(?:^|\s)@([^\s@]*)$/)?.[1]?.toLowerCase() || null, [campaignComment]);
  const campaignMentionOptions = useMemo(() => campaignMentionQuery === null ? [] : visiblePeople.filter(person => person.name.toLowerCase().includes(campaignMentionQuery)).slice(0, 5), [campaignMentionQuery, visiblePeople]);
  const chooseCampaignMention = (person: any) => { setCampaignComment(value => value.replace(/@[^\s@]*$/, `@${person.name.replace(/\s+/g, '')} `)); campaignCommentInput.current?.focus(); };

  const removeCampaignSubtask = async (id: string) => { await supabase.from('campaign_subtasks').update({ status: 'deleted' }).eq('id', id); setCampaignSubtasks(campaignSubtasks.filter(s => s.id !== id)); };
  const completeCampaignSubtask = async (subtask: any) => {
    if (!selectedCampaign || !profile?.id || (!selectedRoot && !isGlobalManager(profile) && Number(subtask.assignee_id) !== Number(profile.id)) || isTaskDone(subtask.status)) return;
    try { await completeTrackedTask(`cs-${subtask.id}`); }
    catch (error: any) { return toast.error(error?.message || 'Không thể hoàn thành subtask. Kiểm tra quyền hoặc tải lại dữ liệu.'); }
    setCampaignSubtasks(current => current.map(item => item.id === subtask.id ? { ...item, status: 'completed' } : item));
    window.dispatchEvent(new Event('tasks:changed'));
    window.dispatchEvent(new Event('campaigns:changed'));
    toast.success('Đã hoàn thành subtask');
  };
  const saveEditedCampaignSubtask = async (id: string) => { await supabase.from('campaign_subtasks').update({ title: campaignEditSubtaskTitle, due_date: campaignEditSubtaskDue ? (campaignEditSubtaskDue.includes('/') ? campaignEditSubtaskDue.split('/').reverse().join('-') : campaignEditSubtaskDue) : null, assignee_id: campaignEditSubtaskOwner ? Number(campaignEditSubtaskOwner) : null }).eq('id', id); setCampaignEditingSubtaskId(null); const { data } = await supabase.from('campaign_subtasks').select('*, assignee:assignee_id(name,avatar_url)').eq('campaign_id', selectedCampaign.id).order('created_at'); setCampaignSubtasks(data || []); };

  const removeCampaignComment = async (id: string) => {
    const comment=campaignComments.find(c=>String(c.id)===String(id)),key=`campaign:${id}`;
    if(!selectedCampaign||!profile?.id||!comment||!ownsComment(profile.id,comment.user_id)) throw new Error('Bạn chỉ được xóa bình luận của mình.');
    if(commentMutationLock.current.has(key)) return false;
    commentMutationLock.current.add(key);
    try {
      await deleteOwnedComment(supabase,{kind:'campaign',id:selectedCampaign.id},id,profile.id);
      setCampaignComments(current=>current.filter(c=>String(c.id)!==String(id))); return true;
    } finally {commentMutationLock.current.delete(key);}
  };
  const saveEditedCampaignComment = async (id: string, body: string) => {
    const comment=campaignComments.find(c=>String(c.id)===String(id)),key=`campaign:${id}`;
    if(!selectedCampaign||!profile?.id||!comment||!ownsComment(profile.id,comment.user_id)) throw new Error('Bạn chỉ được sửa bình luận của mình.');
    if(commentMutationLock.current.has(key)) return false;
    commentMutationLock.current.add(key);
    try {
      await editOwnedComment(supabase,{kind:'campaign',id:selectedCampaign.id},id,profile.id,body);
      setCampaignComments(current=>current.map(c=>String(c.id)===String(id)?{...c,metadata:{...c.metadata,body:body.trim()}}:c)); return true;
    } finally {commentMutationLock.current.delete(key);}
  };

    const [hasComments, setHasComments] = useState<Record<string, boolean>>({});
  const [legacySubtaskMembers, setSubtaskMembers] = useState<Record<string, string[]>>({});
  const subtaskMembers = useMemo(() => {
    const result = Object.fromEntries(Object.entries(legacySubtaskMembers).map(([id, ids]) => [id, new Set(ids)]));
    for (const track of workflow.tracks) if (track.entity_type === 'project') for (const member of track.sub_pics || []) (result[track.entity_id] ||= new Set()).add(String(member.id));
    return Object.fromEntries(Object.entries(result).map(([id, ids]) => [id, [...ids]]));
  }, [legacySubtaskMembers, workflow.tracks]);

  const refreshSubtaskMembers = React.useCallback(async () => {
    const [projectResult, campaignResult] = await Promise.all([
      supabase.from('project_subtasks').select('project_id,assignee_id').not('status','in','(deleted,archived)'),
      supabase.from('campaign_subtasks').select('campaign_id,assignee_id').not('status','in','(deleted,archived)'),
    ]);
    if (projectResult.error || campaignResult.error) return;
    const groupAssignees = (rows: any[], parentKey: 'project_id' | 'campaign_id') => {
      const grouped: Record<string, Set<string>> = {};
      (rows || []).forEach(row => {
        if (!row.assignee_id) return;
        const parentId = String(row[parentKey]);
        (grouped[parentId] ||= new Set()).add(String(row.assignee_id));
      });
      return Object.fromEntries(Object.entries(grouped).map(([id, ids]) => [id, [...ids]]));
    };
    setSubtaskMembers(groupAssignees(projectResult.data || [], 'project_id'));
    setCampaignSubtaskMembers(groupAssignees(campaignResult.data || [], 'campaign_id'));
    window.dispatchEvent(new Event('project-tree:changed'));
  }, []);

  // View mode & Filter states
  const [viewMode, setViewMode] = useRememberedState<'list' | 'board'>('projects.viewMode', 'list');
  const [searchTerm, setSearchTerm] = useRememberedState('projects.search', '');
  const [statusFilter, setStatusFilter] = useRememberedState<string>('projects.status', 'open');
  const [picFilter, setPicFilter] = useRememberedState<string>('projects.pic', 'all');
  const [calendarFilter, setCalendarFilter] = useRememberedState<string>('projects.calendar', 'all');
  const [customStartDate, setCustomStartDate] = useRememberedState<string>('projects.startDate', '');
  const [customEndDate, setCustomEndDate] = useRememberedState<string>('projects.endDate', '');
  const [priorityFilter, setPriorityFilter] = useRememberedState<string>('projects.priority', 'all');
  const [departmentFilter, setDepartmentFilter] = useRememberedState<string>('projects.departmentFilter.v2', '');
  const effectiveDepartmentFilter = departmentFilter;
  const [campaignSubtaskMembers, setCampaignSubtaskMembers] = useState<Record<string, string[]>>({});

  // Dropdown open state
  const [activeDropdown, setActiveDropdown] = useState<'status' | 'pic' | 'calendar' | 'priority' | 'department' | 'view' | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest('[data-filter-popover]')) return;
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeDropdown]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    statusFilter !== 'open' ||
    picFilter !== 'all' ||
    calendarFilter !== 'all' ||
    customStartDate ||
    customEndDate ||
    priorityFilter !== 'all' ||
    Boolean(departmentFilter)
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('open');
    setPicFilter('all');
    setCalendarFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setPriorityFilter('all');
    setDepartmentFilter('');
    setActiveDropdown(null);
  };

  const campaignFilters = useMemo<CampaignFilters>(() => ({
    searchTerm,
    status: statusFilter,
    picId: picFilter,
    calendar: calendarFilter,
    customStartDate,
    customEndDate,
    priority: priorityFilter,
    departmentId: departmentFilter || undefined,
  }), [searchTerm, statusFilter, picFilter, calendarFilter, customStartDate, customEndDate, priorityFilter, departmentFilter]);

  const visibleProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return projects.filter(p => {
      // 0. Phân quyền tầm view theo 3 cấp: Manager/Admin -> Leader -> Staff
      if (!isManager) {
        const myId = profile?.id;
        const myIdStr = String(myId);
        const isLead = myId && (Number(p.lead_id) === Number(myId) || projectPrimaryOwners[p.id] === myId);
        const isMember = (members[p.id] || []).includes(myIdStr) || (picMembers[p.id] || []).includes(myIdStr);
        const isSub = (subtaskMembers[p.id] || []).includes(myIdStr);
        const isCreator = myId && Number(p.created_by) === Number(myId);

        if (isStaff) {
          // Staff thường: KHÔNG dùng inDept, chỉ thấy khi được giao / tham gia
          if (!isLead && !isMember && !isSub && !isCreator) return false;
        }
      }

      // 1. Search filter
      if (term) {
        const nameMatch = (p.name || '').toLowerCase().includes(term);
        const descMatch = (p.description || '').toLowerCase().includes(term);
        if (!nameMatch && !descMatch) return false;
      }

      // 2. Status filter
      if (statusFilter === 'open') {
        if (viewMode !== 'board' && isTaskDone(p.status)) return false;
      } else if (statusFilter !== 'all') {
        const norm = (p.status || 'active').toLowerCase();
        if (statusFilter === 'in_progress') {
          if (!['active', 'in_progress', 'in-progress'].includes(norm)) return false;
        } else if (statusFilter === 'completed') {
          if (!['done', 'complete', 'completed'].includes(norm)) return false;
        } else if (statusFilter === 'planning') {
          if (!['planning', 'draft', 'pending'].includes(norm)) return false;
        } else if (statusFilter !== norm) {
          return false;
        }
      }

      // 3. PIC filter
      if (picFilter !== 'all') {
        if (picFilter === 'me') {
          const myId = profile?.id;
          const myIdStr = String(myId);
          const isLead = myId && (Number(p.lead_id) === Number(myId) || projectPrimaryOwners[p.id] === myId);
          const isMember = (members[p.id] || []).includes(myIdStr) || (picMembers[p.id] || []).includes(myIdStr);
          const isSub = (subtaskMembers[p.id] || []).includes(myIdStr);
          const isCreator = myId && Number(p.created_by) === Number(myId);
          if (!isLead && !isMember && !isSub && !isCreator) return false;
        } else if (picFilter === 'unassigned') {
          const hasMembers = (members[p.id] || []).length > 0;
          if (p.lead_id || hasMembers) return false;
        } else {
          const targetId = Number(picFilter);
          const targetStr = String(picFilter);
          const isLead = Number(p.lead_id) === targetId || projectPrimaryOwners[p.id] === targetId;
          const isMember = (members[p.id] || []).includes(targetStr) || (picMembers[p.id] || []).includes(targetStr);
          const isSub = (subtaskMembers[p.id] || []).includes(targetStr);
          const isCreator = Number(p.created_by) === targetId;
          if (!isLead && !isMember && !isSub && !isCreator) return false;
        }
      }

      // 4. Priority filter
      if (priorityFilter !== 'all') {
        const pPriority = (p.priority || 'medium').toLowerCase();
        if (pPriority !== priorityFilter.toLowerCase()) return false;
      }

      // 5. Calendar filter
      const isCompleted = ['done', 'complete', 'completed'].includes((p.status || '').toLowerCase());
      if (calendarFilter !== 'all') {
        if (!checkDateMatch(p.start_date, p.due_date, calendarFilter, customStartDate, customEndDate, isCompleted)) {
          return false;
        }
      } else if (customStartDate || customEndDate) {
        if (!checkDateMatch(p.start_date, p.due_date, 'custom', customStartDate, customEndDate, isCompleted)) {
          return false;
        }
      }

      // 6. Department filter
      if (departmentFilter) {
        if (String(p.department_id || '') !== String(departmentFilter)) {
          return false;
        }
      }

      return true;
    });
  }, [workflow.tracks, profile?.role, profile?.employment_level, projects, searchTerm, statusFilter, viewMode, picFilter, calendarFilter, customStartDate, customEndDate, priorityFilter, departmentFilter, members, picMembers, subtaskMembers, projectPrimaryOwners, profile?.id, userIsRestricted, resolvedDeptId]);

  const visibleCampaigns = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return campaigns.filter(c => {
      // 0. Phân quyền tầm view theo 3 cấp: Manager/Admin -> Leader -> Staff
      if (!isManager) {
        const myId = profile?.id != null ? Number(profile.id) : null;
        const myIdStr = String(myId);
        const isLead = myId && Number(c.lead_id) === myId;
        const isCreator = myId && Number(c.creator?.id || c.created_by) === myId;
        const isSub = (campaignSubtaskMembers[c.id] || []).includes(myIdStr);

        if (isStaff) {
          if (!isLead && !isCreator && !isSub) return false;
        }
      }

      // 1. Search filter
      if (term) {
        const nameMatch = (c.name || '').toLowerCase().includes(term);
        const objMatch = (c.objective || '').toLowerCase().includes(term);
        if (!nameMatch && !objMatch) return false;
      }

      // 2. Status filter
      if (statusFilter === 'open') {
        if (viewMode !== 'board' && isTaskDone(c.status)) return false;
      } else if (statusFilter !== 'all') {
        const norm = (c.status || 'planning').toLowerCase();
        if (statusFilter === 'in_progress') {
          if (!['active', 'in_progress', 'in-progress'].includes(norm)) return false;
        } else if (statusFilter === 'completed') {
          if (!['done', 'complete', 'completed'].includes(norm)) return false;
        } else if (statusFilter === 'planning') {
          if (!['planning', 'draft', 'pending'].includes(norm)) return false;
        } else if (statusFilter !== norm) {
          return false;
        }
      }

      // 3. PIC filter
      if (picFilter !== 'all') {
        if (picFilter === 'me') {
          const myId = profile?.id != null ? Number(profile.id) : null;
          const myIdStr = String(myId);
          const isLead = myId && Number(c.lead_id) === myId;
          const isCreator = myId && Number(c.creator?.id || c.created_by) === myId;
          const isSub = (campaignSubtaskMembers[c.id] || []).includes(myIdStr);
          if (!isLead && !isCreator && !isSub) return false;
        } else if (picFilter === 'unassigned') {
          if (c.lead_id || c.lead?.name) return false;
        } else {
          const targetId = Number(picFilter);
          const targetStr = String(picFilter);
          const isLead = Number(c.lead_id) === targetId;
          const isCreator = Number(c.created_by) === targetId;
          const isSub = (campaignSubtaskMembers[c.id] || []).includes(targetStr);
          if (!isLead && !isCreator && !isSub) return false;
        }
      }

      // 4. Priority filter
      if (priorityFilter !== 'all') {
        const pPriority = getCampaignPriority(c).toLowerCase();
        if (pPriority !== priorityFilter.toLowerCase()) return false;
      }

      // 5. Calendar filter
      const isCompleted = ['done', 'complete', 'completed'].includes((c.status || '').toLowerCase());
      if (calendarFilter !== 'all') {
        if (!checkDateMatch(c.start_date, c.end_date, calendarFilter, customStartDate, customEndDate, isCompleted)) {
          return false;
        }
      } else if (customStartDate || customEndDate) {
        if (!checkDateMatch(c.start_date, c.end_date, 'custom', customStartDate, customEndDate, isCompleted)) {
          return false;
        }
      }

      // 6. Department filter
      if (departmentFilter) {
        if (String(c.department_id || '') !== String(departmentFilter)) {
          return false;
        }
      }

      return true;
    });
  }, [workflow.tracks, profile?.role, profile?.employment_level, campaigns, searchTerm, statusFilter, viewMode, picFilter, calendarFilter, customStartDate, customEndDate, priorityFilter, departmentFilter, campaignSubtaskMembers, profile?.id, userIsRestricted, resolvedDeptId]);


  const load = async () => {
    const token = ++loadRequest.current;
    if (!profile) { setProjects([]); setSelected(null); setSelectedCampaign(null); return; }
    void loadPhasePermissionsFromLogs(supabase);
    const [projectRes, memberRes, commentRes, subtaskRes, campaignRes, creationRes, campaignCommentsRes, notificationsRes, campSubtaskRes] = await Promise.all([
      supabase.from('projects').select('*, creator:created_by(name,avatar_url)').neq('status', 'archived').neq('status', 'deleted').order('created_at', { ascending: false }),
      supabase.from('project_members').select('project_id,user_id,workflow_role'),
      supabase.from('project_comments').select('project_id'),
      supabase.from('project_subtasks').select('project_id,assignee_id').not('status','in','(deleted,archived)'),
      supabase.from('campaigns').select('*,lead:lead_id(name,avatar_url),creator:created_by(name,avatar_url)').neq('status','archived').neq('status','deleted').order('name'),
      supabase.from('activity_log').select('entity_id,metadata').eq('entity_type','project').eq('action','creation_details'),
      supabase.from('activity_log').select('entity_id').eq('entity_type', 'campaign').eq('action', 'comment'),
      profile?.id
        ? supabase.from('notifications').select('entity_type, entity_id').eq('user_id', profile.id).eq('is_read', false).in('entity_type', ['project', 'campaign'])
        : Promise.resolve({ data: [] } as any),
      supabase.from('campaign_subtasks').select('campaign_id,assignee_id').not('status','in','(deleted,archived)')
    ]);
    if (token !== loadRequest.current) return;
    if (projectRes.error) return toast.error('Không thể tải Project');
    const projectData=projectRes.data||[];
    setProjects(projectData);
    setSelected(current => current ? projectData.find(p => p.id === current.id) || null : null);
    setMembers((memberRes.data || []).reduce((acc: Record<string, string[]>, item: any) => ({ ...acc, [item.project_id]: [...(acc[item.project_id] || []), String(item.user_id)] }), {}));
    setPicMembers((memberRes.data || []).filter(item => item.workflow_role === 'pic').reduce((acc: Record<string, string[]>, item: any) => ({ ...acc, [item.project_id]: [...(acc[item.project_id] || []), String(item.user_id)] }), {}));

    const commentsMap: Record<string, boolean> = {};
    (commentRes.data || []).forEach(c => commentsMap[c.project_id] = true);
    setHasComments(commentsMap);

    const campCommentsMap: Record<string, boolean> = {};
    (campaignCommentsRes.data || []).forEach((c: any) => campCommentsMap[c.entity_id] = true);
    setHasCampaignComments(campCommentsMap);

    const unreadMap: Record<string, boolean> = {};
    ((notificationsRes as any)?.data || []).forEach((n: any) => {
      if (n.entity_id) unreadMap[n.entity_id] = true;
    });
    setHasMentionOrUnread(unreadMap);
    if(campaignRes.error||creationRes.error)return toast.error('Chưa đồng bộ đầy đủ Project/Campaign.');
    const campaignData=campaignRes.data||[];
    setCampaigns(campaignData);
    setSelectedCampaign((current:any)=>current?campaignData.find(c=>c.id===current.id)||null:null);
    setProjectPrimaryOwners(Object.fromEntries((creationRes.data||[]).map(row=>[row.entity_id,row.metadata?.primary_owner_id])));

    const stMap: Record<string, Set<string>> = {};
    (subtaskRes.data || []).forEach(s => {
       if (!s.assignee_id) return;
       if (!stMap[s.project_id]) stMap[s.project_id] = new Set();
       stMap[s.project_id].add(String(s.assignee_id));
    });
    const subtaskMembersRecord: Record<string, string[]> = {};
    for (const pid in stMap) subtaskMembersRecord[pid] = Array.from(stMap[pid]);
    setSubtaskMembers(subtaskMembersRecord);

    const cStMap: Record<string, Set<string>> = {};
    (campSubtaskRes?.data || []).forEach((s: any) => {
       if (!s.assignee_id) return;
       if (!cStMap[s.campaign_id]) cStMap[s.campaign_id] = new Set();
       cStMap[s.campaign_id].add(String(s.assignee_id));
    });
    const campSubtaskMembersRecord: Record<string, string[]> = {};
    for (const cid in cStMap) campSubtaskMembersRecord[cid] = Array.from(cStMap[cid]);
    setCampaignSubtaskMembers(campSubtaskMembersRecord);
  };
  useEffect(() => {
    void load();
    const handleChanged = () => { void load(); };
    window.addEventListener('projects:changed', handleChanged);
    window.addEventListener('campaigns:changed', handleChanged);
    return () => {
      loadRequest.current++;
      window.removeEventListener('projects:changed', handleChanged);
      window.removeEventListener('campaigns:changed', handleChanged);
    };
  }, [profile?.id, profile?.department_id,profile?.role,profile?.employment_level]);
  useWorkspaceRealtime(['projects','campaigns','project_subtasks','campaign_subtasks','project_members','campaign_members','project_comments','activity_log','users'], change => {
    const row=change?.new||change?.old;
    const table=change?.table;
    if (!table) void load();
    else if (table==='users') { if(workspaceChangeRelevant('workflow',change,profile))void load(); }
    else if (['projects','campaigns','project_members','campaign_members'].includes(table)) void load();
    else if (table==='project_subtasks'||table==='campaign_subtasks') void refreshSubtaskMembers();
    else if (table==='activity_log' && row?.action==='creation_details') void load();
    else if (table==='project_comments' && row?.project_id) {
      const projectId=String(row.project_id);
      if (change.eventType==='DELETE') {
        void supabase.from('project_comments').select('id',{count:'exact',head:true}).eq('project_id',projectId)
          .then(({count,error})=>{if(!error)setHasComments(current=>({...current,[projectId]:Boolean(count)}));});
      } else setHasComments(current=>({...current,[projectId]:true}));
    } else if (table==='activity_log' && row?.entity_type==='campaign' && row?.action==='comment') {
      const campaignId=String(row.entity_id);
      if (change.eventType==='DELETE') {
        void supabase.from('activity_log').select('id',{count:'exact',head:true}).eq('entity_type','campaign').eq('entity_id',campaignId).eq('action','comment')
          .then(({count,error})=>{if(!error)setHasCampaignComments(current=>({...current,[campaignId]:Boolean(count)}));});
      } else setHasCampaignComments(current=>({...current,[campaignId]:true}));
    }
    if(!change?.table||change.eventType==='DELETE'||Boolean(selected&&(row?.project_id===selected.id||row?.entity_id===selected.id||(change.table==='projects'&&row?.id===selected.id)))||Boolean(selectedCampaign&&(row?.campaign_id===selectedCampaign.id||row?.entity_id===selectedCampaign.id||(change.table==='campaigns'&&row?.id===selectedCampaign.id)))||subtasks.some(item=>item.id===row?.entity_id)||campaignSubtasks.some(item=>item.id===row?.entity_id))setRefreshDetailTrigger(v=>v+1);
  }, profile?.id);

  // URL identity supports Workflow → source and browser Back/Forward navigation.
  useEffect(() => {
    const project = params.get('project'), campaign = params.get('campaign');
    if (project) { setSelected(projects.find(p => p.id === project) || null); setSelectedCampaign(null); }
    else if (campaign) { setSelectedCampaign(campaigns.find(c => c.id === campaign) || null); setSelected(null); }
  }, [params.toString(), projects, campaigns]);
  useEffect(() => {
    const project = selected?.id, campaign = selectedCampaign?.id;
    if (project && params.get('project') !== project) setParams({ project }, { replace: true });
    else if (campaign && params.get('campaign') !== campaign) setParams({ campaign }, { replace: true });
  }, [selected?.id, selectedCampaign?.id]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    (async () => {
      const [s, c] = await Promise.all([
        supabase.from('project_subtasks').select('*, assignee:assignee_id(name,avatar_url)').eq('project_id', selected.id).order('created_at'),
        supabase.from('project_comments').select('*, author:author_id(name,avatar_url)').eq('project_id', selected.id).order('created_at')
      ]);
      if (!active) return;
      if (s.error || c.error) return toast.error(s.error?.message || c.error?.message || 'Không thể tải chi tiết Project');
      const nextSubtasks = (s.data || []).filter(item => !['deleted', 'archived'].includes(item.status));
      setSubtasks(nextSubtasks);
      setComments(c.data || []);
      if (!nextSubtasks.length) {
        setSubtaskCommentCounts({});
        setSubtaskChecklistCounts({});
        setSubtaskQuantities({});
        return;
      }
      const [commentsRes, detailsRes] = await Promise.all([
        supabase.from('activity_log').select('entity_id').eq('entity_type', 'project_subtask').eq('action', 'comment').in('entity_id', nextSubtasks.map(item => item.id)),
        readAll(supabase.from('activity_log').select('entity_id, metadata, created_at').eq('entity_type', 'project_subtask').eq('action', 'details_updated').in('entity_id', nextSubtasks.map(item => item.id)).order('created_at', { ascending: false }).order('id', { ascending: false })).then(data => ({data}))
      ]);
      if (!active) return;
      const counts = (commentsRes.data || []).reduce((acc: Record<string, number>, item: any) => ({ ...acc, [item.entity_id]: (acc[item.entity_id] || 0) + 1 }), {});
      setSubtaskCommentCounts(counts);

      const checklistCounts: Record<string, { total: number; done: number }> = {};
      const quantities: Record<string, number> = {};
      const mergedMeta: Record<string, any> = {};
      (detailsRes.data || []).forEach((row: any) => {
        mergedMeta[row.entity_id] = {...(row.metadata || {}), ...(mergedMeta[row.entity_id] || {})};
      });

      Object.entries(mergedMeta).forEach(([entityId, meta]) => {
        const items = Array.isArray(meta.checklist_items) ? meta.checklist_items : [];
        if (items.length > 0) {
          checklistCounts[entityId] = {
            total: items.length,
            done: items.filter((i: any) => i.completed).length,
          };
        }
        const total = computeDeliverableQuantity(meta).totalQuantity;
        if (total > 0) {
          quantities[entityId] = total;
        }
      });
      nextSubtasks.forEach(s => {
        if (!quantities[s.id] && Number(s.quantity) > 0) {
          quantities[s.id] = Number(s.quantity);
        }
      });
      setSubtaskChecklistCounts(checklistCounts);
      setSubtaskQuantities(quantities);
    })();
    return () => { active = false; };
  }, [selected?.id, refreshDetailTrigger, profile?.id]);
  useEffect(() => {
    if (!selectedCampaign) return;
    let active = true;
    void (async () => {
      const [subtaskRes, commentRes] = await Promise.all([
        supabase.from('campaign_subtasks').select('*, assignee:assignee_id(name,avatar_url)').eq('campaign_id', selectedCampaign.id).order('created_at'),
        supabase.from('activity_log').select('*, user:user_id(name,avatar_url)').eq('entity_type', 'campaign').eq('entity_id', selectedCampaign.id).eq('action', 'comment').order('created_at')
      ]);
      if (!active) return;
      if (subtaskRes.error || commentRes.error) return toast.error(subtaskRes.error?.message || commentRes.error?.message || 'Không thể tải chi tiết Campaign');
      const nextCampSubtasks = (subtaskRes.data || []).filter(task => !['deleted', 'archived'].includes(task.status));
      setCampaignSubtasks(nextCampSubtasks);
      setCampaignComments(commentRes.data || []);
      if (!nextCampSubtasks.length) {
        setCampaignSubtaskCommentCounts({});
        setCampaignSubtaskChecklistCounts({});
        setCampaignSubtaskQuantities({});
        return;
      }
      const [stCommentsRes, stDetailsRes] = await Promise.all([
        supabase.from('activity_log').select('entity_id').eq('entity_type', 'campaign_subtask').eq('action', 'comment').in('entity_id', nextCampSubtasks.map(item => item.id)),
        readAll(supabase.from('activity_log').select('entity_id, metadata, created_at').eq('entity_type', 'campaign_subtask').eq('action', 'details_updated').in('entity_id', nextCampSubtasks.map(item => item.id)).order('created_at', { ascending: false }).order('id', { ascending: false })).then(data => ({data}))
      ]);
      if (!active) return;
      const stCounts = (stCommentsRes.data || []).reduce((acc: Record<string, number>, item: any) => ({ ...acc, [item.entity_id]: (acc[item.entity_id] || 0) + 1 }), {});
      setCampaignSubtaskCommentCounts(stCounts);

      const stChecklistCounts: Record<string, { total: number; done: number }> = {};
      const campQuantities: Record<string, number> = {};
      const mergedCampMeta: Record<string, any> = {};
      (stDetailsRes.data || []).forEach((row: any) => {
        mergedCampMeta[row.entity_id] = {...(row.metadata || {}), ...(mergedCampMeta[row.entity_id] || {})};
      });

      Object.entries(mergedCampMeta).forEach(([entityId, meta]) => {
        const items = Array.isArray(meta.checklist_items) ? meta.checklist_items : [];
        if (items.length > 0) {
          stChecklistCounts[entityId] = {
            total: items.length,
            done: items.filter((i: any) => i.completed).length,
          };
        }
        const total = computeDeliverableQuantity(meta).totalQuantity;
        if (total > 0) {
          campQuantities[entityId] = total;
        }
      });
      nextCampSubtasks.forEach(s => {
        if (!campQuantities[s.id] && Number(s.quantity) > 0) {
          campQuantities[s.id] = Number(s.quantity);
        }
      });
      setCampaignSubtaskChecklistCounts(stChecklistCounts);
      setCampaignSubtaskQuantities(campQuantities);
    })();
    return () => { active = false; };
  }, [selectedCampaign?.id, refreshDetailTrigger, profile?.id]);
  useEffect(() => {
    setSourceTask(null); setSelectedSubtask(null);
    setSubtasks([]); setCampaignSubtasks([]); setComments([]); setCampaignComments([]);
    setEditMode(false); setCampaignEditMode(false); setShowSubtaskForm(false); setShowCampaignSubtaskForm(false);
  }, [selected?.id, selectedCampaign?.id, profile?.id,profile?.role,profile?.employment_level]);


  const notifyStakeholders = async (type: 'project' | 'campaign', entityId: string, actionMsg: string, singleUserId?: string | number) => {
    if (!profile || hasCanonicalNotifications()) return;
    const msg = profile.name + ' ' + actionMsg;
    const userIds = new Set<number>();

    if (singleUserId) {
      userIds.add(Number(singleUserId));
    } else {
      if (type === 'project') {
        const p = projects.find(x => x.id === entityId) || selected;
        if (p?.created_by) userIds.add(Number(p.created_by));
        (members[entityId] || []).forEach(m => userIds.add(Number(m)));
        const { data: stData } = await supabase.from('project_subtasks').select('assignee_id').eq('project_id', entityId).neq('status', 'deleted');
        stData?.forEach(s => { if (s.assignee_id) userIds.add(Number(s.assignee_id)); });
      } else {
        const c = campaigns.find(x => x.id === entityId) || selectedCampaign;
        if (c?.created_by) userIds.add(Number(c.created_by));
        if (c?.lead_id) userIds.add(Number(c.lead_id));
        const { data: stData } = await supabase.from('campaign_subtasks').select('assignee_id').eq('campaign_id', entityId).neq('status', 'deleted');
        stData?.forEach(s => { if (s.assignee_id) userIds.add(Number(s.assignee_id)); });
      }
    }

    userIds.delete(Number(profile.id));

    for (const uid of Array.from(userIds)) {
      await supabase.from('notifications').insert({ user_id: uid, type: 'system', message: msg, entity_type: type, entity_id: entityId });
    }
  };

  const completeProject = async () => {
    if (!selected) return;
    const { data, error } = await supabase.from('projects').update({ status: 'completed' }).eq('id', selected.id).select('id').maybeSingle();
    if (error || !data) return toast.error(error?.message || 'Không có quyền cập nhật Project');
    setSelected({ ...selected, status: 'completed' });
    setProjects(projects.map(p => p.id === selected.id ? { ...p, status: 'completed' } : p));
    toast.success('Đã hoàn thành Project');
    window.dispatchEvent(new Event('projects:changed'));
    await notifyStakeholders('project', selected.id, 'đã đánh dấu hoàn thành dự án: ' + selected.name);
  };

  const resetCreateForm = () => {
    setExecutionMemberIds([]);
    setTitle(''); setDescription(''); setStart(new Date().toLocaleDateString('en-GB')); setDue(''); setPriority('medium'); setOwnerIds([]); setPrimaryOwnerId('');
    setParentCampaignId(''); setDepartmentId(profile?.department_id || ''); setCampaignObjective(''); setCampaignBudget(''); setCampaignStatus('planning'); setEditStatus('active'); setCampaignChannels([]); setAttachmentUrl(''); setAttachmentFile(null); setShowAdvanced(false);
    setAllowPhaseCreation(true);
  };

  const selectParentCampaign = (id: string) => {
    setParentCampaignId(id);
    const campaign = campaigns.find(item => item.id === id);
    if (!campaign) { setDepartmentId(profile?.department_id || ''); return; }
    if (!due && campaign.end_date) setDue(strictFormatVN(campaign.end_date));
    if ((!start || start === new Date().toLocaleDateString('en-GB')) && campaign.start_date) setStart(strictFormatVN(campaign.start_date));
    if (!primaryOwnerId && visiblePeople.some(person => person.id === campaign.lead_id)) {
      setPrimaryOwnerId(String(campaign.lead_id));
      setOwnerIds(ids => Array.from(new Set([...ids, String(campaign.lead_id)])));
    }
    setDepartmentId(profile?.department_id || '');
  };

  const resolveAttachmentUrl = async (scope: 'projects' | 'campaigns') => {
    if (attachmentUrl.trim()) return attachmentUrl.trim();
    if (!attachmentFile) return null;
    const cleanName = attachmentFile.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const { data, error } = await supabase.storage.from('attachments').upload(`${scope}/${Date.now()}-${cleanName}`, attachmentFile, { upsert: false });
    if (error || !data) { toast.error('Không tải được file. Hãy dán link file thay thế.'); return undefined; }
    return supabase.storage.from('attachments').getPublicUrl(data.path).data.publicUrl;
  };

  const createItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creationLock.current) return;
    if (!canCreate || !profile?.id) return toast.error('Bạn không có quyền tạo mới.');
    if (!title.trim() || !primaryOwnerId) return toast.error('Nhập tên và chọn người phụ trách chính.');
    const allowed = new Set(creationPeople.map(person => String(person.id)));
    const selectedPeople = [primaryOwnerId, ...ownerIds, ...(creationType === 'project' ? executionMemberIds : [])];
    if (selectedPeople.some(id => !allowed.has(id))) return toast.error('PIC nằm ngoài phạm vi được giao việc.');
    const startDate = parseYMD(start), endDate = parseYMD(due);
    if (startDate && endDate && endDate < startDate) return toast.error('Ngày kết thúc phải từ ngày bắt đầu trở đi.');
    if (creationType === 'project' && parentCampaignId && !campaigns.some(c => c.id === parentCampaignId)) return toast.error('Chiến dịch không còn khả dụng.');
    if (creationType === 'campaign' && campaignBudget && (!Number.isFinite(Number(campaignBudget)) || Number(campaignBudget) < 0)) return toast.error('Ngân sách phải là số không âm.');
    if (attachmentUrl.trim()) {
      try { const url = new URL(attachmentUrl.trim()); if (!['https:', 'http:'].includes(url.protocol)) throw new Error(); }
      catch { return toast.error('Đính kèm cần là link http hoặc https hợp lệ.'); }
    }
    creationLock.current = true; setCreating(true);
    try {
      const asset = await resolveAttachmentUrl(creationType === 'project' ? 'projects' : 'campaigns');
      if (asset === undefined) return;
      if (creationType === 'campaign') {
        const { data: campaign, error } = await supabase.from('campaigns').insert({
          name: title.trim(), objective: campaignObjective || null, start_date: startDate, end_date: endDate,
          budget: campaignBudget ? Number(campaignBudget) : null, channels: campaignChannels,
          lead_id: Number(primaryOwnerId), status: campaignStatus || 'planning',
          department_id: departmentId || profile.department_id || people.find(p => p.id === Number(primaryOwnerId))?.department_id || null,
          workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca', created_by: profile.id
        }).select('*, lead:lead_id(name,avatar_url), creator:created_by(name,avatar_url)').single();
        if (error || !campaign) throw error || new Error('Không nhận được Campaign vừa tạo.');
        const { error: picError } = await supabase.from('campaign_members').insert(Array.from(new Set([primaryOwnerId, ...ownerIds])).map(id => ({ campaign_id: campaign.id, user_id: Number(id), workflow_role: 'pic' })));
        if (picError) toast.error('Campaign đã tạo nhưng chưa lưu được PIC bổ sung.');
        setCreateOpen(false); resetCreateForm(); setSelected(null); setSelectedCampaign(campaign); setCampaignEditMode(false);
        if (asset) {
          const { error: assetError } = await supabase.from('activity_log').insert({ workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca', user_id: profile.id, action: 'attachment_added', entity_type: 'campaign', entity_id: campaign.id, metadata: { strategy_asset: asset } });
          if (assetError) toast.error('Campaign đã tạo nhưng chưa lưu được link tài liệu.');
        }
        await saveEntityPhasePermission(supabase, 'campaign', campaign.id, allowPhaseCreation, profile.id);
        window.dispatchEvent(new Event('campaigns:changed'));
        toast.success('Đã tạo Campaign');
        const { error: notificationError } = hasCanonicalNotifications() ? {error:null} : await supabase.from('notifications').insert({ user_id: campaign.lead_id, type: 'system', message: profile.name + ' đã giao chiến dịch: ' + campaign.name, entity_type: 'campaign', entity_id: campaign.id });
        if (notificationError) toast.error('Campaign đã tạo; thông báo chưa gửi được.');
      } else {
        const picIds = Array.from(new Set([primaryOwnerId, ...ownerIds]));
        const participantIds = Array.from(new Set([...picIds, ...executionMemberIds]));
        const { data: project, error } = await supabase.from('projects').insert({
          name: title.trim(), description: description || null, start_date: startDate, due_date: endDate, priority,
          status: editStatus || 'active', campaign_id: parentCampaignId || null,
          department_id: departmentId || profile.department_id || people.find(p => p.id === Number(primaryOwnerId))?.department_id || null,
          assets_url: asset, workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca', created_by: profile.id
        }).select('*, creator:created_by(name,avatar_url)').single();
        if (error || !project) throw error || new Error('Không nhận được Project vừa tạo.');
        // Once created, leave the create form so a retry cannot duplicate the project.
        setCreateOpen(false); resetCreateForm(); setSelectedCampaign(null); setSelected(project); setEditMode(false);
        const { error: memberError } = await supabase.from('project_members').insert(participantIds.map(user_id => ({ project_id: project.id, user_id: Number(user_id), workflow_role: picIds.includes(user_id) ? 'pic' : 'sub_pic' })));
        if (memberError) toast.error('Project đã tạo nhưng chưa lưu được PIC. Mở Chỉnh sửa để bổ sung.');
        const { error: metadataError } = await supabase.from('activity_log').insert({
          workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca', user_id: profile.id,
          entity_type: 'project', entity_id: project.id, action: 'creation_details',
          metadata: { primary_owner_id: Number(primaryOwnerId), owner_ids: picIds.map(Number), member_ids: executionMemberIds.map(Number), allow_phase_creation: allowPhaseCreation }
        });
        if (metadataError) toast.error('Project đã tạo nhưng chưa lưu được phân loại PIC chính.');
        await saveEntityPhasePermission(supabase, 'project', project.id, allowPhaseCreation, profile.id);
        if (!memberError && !hasCanonicalNotifications()) {
          const { error: notificationError } = await supabase.from('notifications').insert(participantIds.map(id => ({ user_id: Number(id), type: 'system', message: profile.name + ' đã giao dự án: ' + project.name, entity_type: 'project', entity_id: project.id })));
          if (notificationError) toast.error('Project đã tạo; thông báo chưa gửi được.');
        }
        toast.success('Đã tạo Project');
        window.dispatchEvent(new Event('projects:changed'));
      }
      await load();
    } catch (error) {
      toast.error(parentCreationError(error),{id:'parent-create-error'});
    } finally { creationLock.current = false; setCreating(false); }
  };
const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');
  const [editSubtaskOwner, setEditSubtaskOwner] = useState('');
  const [editSubtaskDue, setEditSubtaskDue] = useState('');


  const executeRemoveSubtask = async () => {
    if (!subtaskToDelete) return;
    const subtask = subtasks.find(item => item.id === subtaskToDelete);
    const { error } = await supabase.from('project_subtasks').update({ status: 'deleted' }).eq('id', subtaskToDelete);
    if (error) { toast.error('Không thể xóa subtask'); return; }
    if (profile?.id && subtask) {
      const { error: logError } = await recordTaskDeletion({ userId: profile.id, taskId: subtask.id, entityType: 'project_subtask', title: subtask.title, parentName: selected?.name, parentType: 'project' });
      if (logError) toast.error('Subtask đã xóa nhưng chưa ghi được vào Log');
    }
    setSubtasks(subtasks.filter(s => s.id !== subtaskToDelete));
    setSubtaskToDelete(null);
    window.dispatchEvent(new Event('tasks:changed'));
  };

  const executeRemoveCampaignSubtask = async () => {
    if (!campaignSubtaskToDelete) return;
    setDeletingIds(prev => [...prev, campaignSubtaskToDelete.id]);
    const cached = campaignSubtaskToDelete;
    setCampaignSubtaskToDelete(null);
    setTimeout(async () => {
      const { error } = await supabase.from('campaign_subtasks').update({ status: 'deleted' }).eq('id', cached.id);
      if (error) { toast.error('Không thể xóa subtask'); return; }
      if (profile?.id) {
        const { error: logError } = await recordTaskDeletion({ userId: profile.id, taskId: cached.id, entityType: 'campaign_subtask', title: cached.title, parentName: selectedCampaign?.name, parentType: 'campaign' });
        if (logError) toast.error('Subtask đã xóa nhưng chưa ghi được vào Log');
      }
      setCampaignSubtasks(items => items.filter(item => item.id !== cached.id));
      window.dispatchEvent(new Event('tasks:changed'));
      setDeletingIds(prev => prev.filter(id => id !== cached.id));
    }, 300);
  };

  const removeSubtask = (id: string) => {
    setSubtaskToDelete(id);
  };

  const saveEditedSubtask = async (id: string) => {
    await supabase.from('project_subtasks').update({ title: editSubtaskTitle, assignee_id: editSubtaskOwner ? Number(editSubtaskOwner) : null, due_date: parseYMD(editSubtaskDue) }).eq('id', id);
    const { data } = await supabase.from('project_subtasks').select('*, assignee:assignee_id(name,avatar_url)').eq('id', id).single();
    setSubtasks(subtasks.map(s => s.id === id ? data : s)); setEditingSubtaskId(null);
  };

  const saveInlineEdit = async () => {
    if (!title || !selected || !selectedRoot) return;
    const { data, error } = await supabase.from('projects').update({ name: title, description, start_date: parseYMD(start), due_date: parseYMD(due), priority, status: editStatus, department_id: (typeof departmentId !== 'undefined' && departmentId) ? departmentId : null }).eq('id', selected.id).select().single();
    if (error || !data) return toast.error('Lỗi cập nhật');
    if (typeof saveEntityPhasePermission === 'function') {
      await saveEntityPhasePermission(supabase, 'project', selected.id, typeof allowPhaseCreation !== 'undefined' ? allowPhaseCreation : true, typeof profile !== 'undefined' ? profile?.id : null);
    }
    const samePics = [...ownerIds].sort().join(',') === [...(picMembers[selected.id] || [])].sort().join(',');
    if (!samePics) {
      const { error: picError } = await supabase.rpc('workflow_set_parent_pics', { p_kind: 'project', p_parent: data.id, p_ids: ownerIds.map(Number) });
      if (picError) { setSelected(data); setProjects(items => items.map(item => item.id === data.id ? data : item)); toast.error('Đã lưu thông tin; chưa cập nhật được PIC: ' + picError.message); return; }
    }
    setEditMode(false); setProjects(items => items.map(item => item.id === data.id ? data : item)); setSelected(data); window.dispatchEvent(new Event('projects:changed')); void load(); toast.success('Đã lưu thông tin');
    await notifyStakeholders('project', selected.id, 'đã cập nhật thông tin dự án: ' + title);

  };



  const executeHideProject = async () => {
    if (!projectToHide) return;
    if (!canHideOrDeleteParent) { toast.error('Chỉ Quản lý hoặc Trưởng bộ phận mới có quyền ẩn Project.'); setProjectToHide(null); return; }
    const { data, error } = await supabase.from('projects').update({ status: 'archived' }).eq('id', projectToHide.id).select('id').maybeSingle();
    if (error || !data) {
      toast.error('Không thể ẩn Project');
    } else {
      if (selected?.id === projectToHide.id) setSelected(null);
      await load();
      toast.success('Đã ẩn Project');
    }
    setProjectToHide(null);
  };

  const archiveProject = (project: Project) => {
    if (!canHideOrDeleteParent) return toast.error('Chỉ Quản lý hoặc Trưởng bộ phận mới có quyền ẩn Project.');
    setProjectToHide(project);
  };

  const executeRemoveProject = async () => {
    if (!projectToDelete) return;
    if (!canHideOrDeleteParent) { toast.error('Chỉ Quản lý hoặc Trưởng bộ phận mới có quyền xóa Project.'); setProjectToDelete(null); return; }
    const { data, error } = await supabase.from('projects').update({ status: 'deleted' }).eq('id', projectToDelete.id).select('id').maybeSingle();
    if (!error && data) {
      await supabase.from('project_subtasks').update({ status: 'deleted' }).eq('project_id', projectToDelete.id);
      toast.success('Đã chuyển Project vào thùng rác');
      if (selected?.id === projectToDelete.id) setSelected(null);
      await load();
      window.dispatchEvent(new Event('tasks:changed'));
    } else {
      toast.error('Không thể xóa Project');
    }
    setProjectToDelete(null);
  };

  const removeProject = (project: Project) => {
    if (!canHideOrDeleteParent) return toast.error('Chỉ Quản lý hoặc Trưởng bộ phận mới có quyền xóa Project.');
    setProjectToDelete(project);
  };

  const executeHideCampaign = async () => {
    if (!campaignToHide) return;
    if (!canHideOrDeleteParent) { toast.error('Chỉ Quản lý hoặc Trưởng bộ phận mới có quyền ẩn Campaign.'); setCampaignToHide(null); return; }
    const { data, error } = await supabase.from('campaigns').update({ status: 'archived' }).eq('id', campaignToHide.id).select('id').maybeSingle();
    if (error || !data) {
      toast.error('Không thể ẩn Campaign');
    } else {
      if (selectedCampaign?.id === campaignToHide.id) setSelectedCampaign(null);
      await load();
      toast.success('Đã ẩn Campaign');
    }
    setCampaignToHide(null);
  };

  const archiveCampaign = (campaign: any) => {
    if (!canHideOrDeleteParent) return toast.error('Chỉ Quản lý hoặc Trưởng bộ phận mới có quyền ẩn Campaign.');
    setCampaignToHide(campaign);
  };

  const executeRemoveCampaign = async () => {
    if (!campaignToDelete) return;
    if (!canHideOrDeleteParent) { toast.error('Chỉ Quản lý hoặc Trưởng bộ phận mới có quyền xóa Campaign.'); setCampaignToDelete(null); return; }
    const cached = campaignToDelete;
    setCampaignToDelete(null);
    const { data, error } = await supabase.from('campaigns').update({ status: 'deleted' }).eq('id', cached.id).select('id').maybeSingle();
    if (!error && data) {
      await supabase.from('campaign_subtasks').update({ status: 'deleted' }).eq('campaign_id', cached.id);
      toast.success('Đã chuyển Campaign vào thùng rác');
      if (selectedCampaign?.id === cached.id) setSelectedCampaign(null);
      await load();
      window.dispatchEvent(new Event('tasks:changed'));
    } else {
      toast.error('Không thể xóa Campaign');
    }
  };

  const removeCampaign = (campaign: any) => {
    if (!canHideOrDeleteParent) return toast.error('Chỉ Quản lý hoặc Trưởng bộ phận mới có quyền xóa Campaign.');
    setCampaignToDelete(campaign);
  };



  const parseYMD = (dateStr: string) => {
    if (!dateStr) return null;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const addSubtask = async () => {
    if (!selected || !newSubtask.trim()) return;
    const { data: insertedSubtask, error } = await supabase.from('project_subtasks').insert({ project_id: selected.id, title: newSubtask.trim(), assignee_id: subtaskOwner ? Number(subtaskOwner) : null, due_date: parseYMD(subtaskDue), priority: subtaskPriority || 'medium' }).select('id').single();
    if (error) return toast.error(error.message);
    if (insertedSubtask?.id && (subtaskQuantity || profile?.id)) {
      const numQ = Number(subtaskQuantity);
      await saveTaskDeliverables(
        'project_subtask',
        insertedSubtask.id,
        { _notification_initial: true, quantity: Number.isFinite(numQ) && numQ > 0 ? numQ : null },
        profile?.id,
        (selected as any).workspace_id,
      ).catch((error: any) => {
        toast.error('Đã tạo subtask nhưng chưa lưu được sản lượng: ' + (error?.message || 'Lỗi kết nối'));
      });
    }
    setNewSubtask(''); setSubtaskOwner(''); setSubtaskDue(''); setSubtaskQuantity(''); setSubtaskPriority('medium'); setRefreshDetailTrigger(v=>v+1);
    window.dispatchEvent(new Event('projects:changed'));
  };

  const toggleSubtask = async (subtask: any) => {
    const canToggle = selectedRoot || isGlobalManager(profile) || Number(subtask.assignee_id) === Number(profile?.id);
    if (!canToggle) return;
    if (isTaskDone(subtask.status)) {
      try {
        const { error } = await supabase.from("project_subtasks").update({ status: "in_progress" }).eq("id", subtask.id);
        if (error) throw error;
        const updated = { ...subtask, status: "in_progress" };
        setSubtasks(current => current.map(item => item.id === subtask.id ? updated : item));
        setSelectedSubtask((current: any) => current?.id === subtask.id ? updated : current);
        window.dispatchEvent(new Event("tasks:changed"));
        window.dispatchEvent(new Event("projects:changed"));
        toast.success(lang === "en" ? "Subtask reopened" : "Đã mở lại subtask");
      } catch (error: any) {
        toast.error(error?.message || "Không thể cập nhật subtask");
      }
    } else {
      await completeSubtask(subtask);
    }
  };

  const toggleCampaignSubtask = async (subtask: any) => {
    const canToggle = selectedRoot || isGlobalManager(profile) || Number(subtask.assignee_id) === Number(profile?.id);
    if (!canToggle) return;
    if (isTaskDone(subtask.status)) {
      try {
        const { error } = await supabase.from("campaign_subtasks").update({ status: "in_progress" }).eq("id", subtask.id);
        if (error) throw error;
        const updated = { ...subtask, status: "in_progress" };
        setCampaignSubtasks(current => current.map(item => item.id === subtask.id ? updated : item));
        window.dispatchEvent(new Event("tasks:changed"));
        window.dispatchEvent(new Event("campaigns:changed"));
        toast.success(lang === "en" ? "Subtask reopened" : "Đã mở lại subtask");
      } catch (error: any) {
        toast.error(error?.message || "Không thể cập nhật subtask");
      }
    } else {
      await completeCampaignSubtask(subtask);
    }
  };

  const completeSubtask = async (subtask: any) => {
    if (!selected || !profile?.id || (!selectedRoot && !isGlobalManager(profile) && Number(subtask.assignee_id) !== Number(profile.id)) || isTaskDone(subtask.status)) return;
    try { await completeTrackedTask(`ps-${subtask.id}`); }
    catch (error: any) { return toast.error(error?.message || 'Không thể hoàn thành subtask. Kiểm tra quyền hoặc tải lại dữ liệu.'); }
    const updated = { ...subtask, status: 'completed' };
    setSubtasks(current => current.map(item => item.id === subtask.id ? updated : item));
    setSelectedSubtask((current: any) => current?.id === subtask.id ? updated : current);
    setRecentlyCompletedSubtaskId(subtask.id);
    window.setTimeout(() => setRecentlyCompletedSubtaskId(current => current === subtask.id ? null : current), 900);
    await notifyStakeholders('project', selected.id, `đã hoàn thành subtask: ${subtask.title}`);
    window.dispatchEvent(new Event('tasks:changed'));
    window.dispatchEvent(new Event('projects:changed'));
    toast.success('Đã hoàn thành subtask');
  };
  const addComment = async (overrideBody?: string) => {
    const raw = typeof overrideBody === 'string' ? overrideBody : comment;
    if (!selected || !profile?.id || !raw.trim()) return;
    const body = raw.trim();
    const { error } = await supabase.from('project_comments').insert({ project_id: selected.id, author_id: profile.id, body });
    if (error) return toast.error('Không thể gửi bình luận');
    const mentionedUsers = people.filter(person => person.id !== profile?.id && body.toLowerCase().includes(`@${person.name.replace(/\s+/g, '').toLowerCase()}`));
    if (!hasCanonicalNotifications() && mentionedUsers.length) await supabase.from('notifications').insert(mentionedUsers.map(person => ({ user_id: person.id, type: 'system', message: `${profile?.name || 'Một thành viên'} đã nhắc bạn trong dự án: ${selected.name}`, entity_type: 'project', entity_id: selected.id })));
    await notifyStakeholders('project', selected.id, 'đã bình luận trong dự án: ' + selected.name);
    setComment(''); setRefreshDetailTrigger(v=>v+1);
  };
  const addCampaignSubtask = async () => {
    if (!selectedCampaign || !campaignNewSubtask.trim()) return;
    const { data: insertedCampSubtask, error } = await supabase.from('campaign_subtasks').insert({ campaign_id: selectedCampaign.id, title: campaignNewSubtask.trim(), assignee_id: campaignSubtaskOwner ? Number(campaignSubtaskOwner) : null, due_date: parseYMD(campaignSubtaskDue), priority: campaignSubtaskPriority || 'medium' }).select('id').single();
    if (!error && campaignSubtaskOwner) await notifyStakeholders('campaign', selectedCampaign.id, 'đã giao subtask mới cho bạn: ' + campaignNewSubtask.trim(), campaignSubtaskOwner);
    if (error) {
      console.error('Campaign subtask insert failed', { code: error.code, message: error.message });
      return toast.error(error.message
        ? `Không thể tạo Subtask Campaign: ${error.message}`
        : 'Không thể tạo Subtask Campaign. Kiểm tra quyền PIC/phòng ban rồi thử lại.');
    }
    if (insertedCampSubtask?.id && (campaignSubtaskQuantity || profile?.id)) {
      const numQ = Number(campaignSubtaskQuantity);
      await saveTaskDeliverables(
        'campaign_subtask',
        insertedCampSubtask.id,
        { _notification_initial: true, quantity: Number.isFinite(numQ) && numQ > 0 ? numQ : null },
        profile?.id,
        selectedCampaign.workspace_id,
      ).catch((error: any) => {
        toast.error('Đã tạo subtask nhưng chưa lưu được sản lượng: ' + (error?.message || 'Lỗi kết nối'));
      });
    }
    setCampaignNewSubtask(''); setCampaignSubtaskOwner(''); setCampaignSubtaskDue(''); setCampaignSubtaskQuantity(''); setCampaignSubtaskPriority('medium'); setShowCampaignSubtaskForm(false); setRefreshDetailTrigger(v=>v+1);
    supabase.from('campaign_subtasks').select('*, assignee:assignee_id(name,avatar_url)').eq('campaign_id', selectedCampaign.id).order('created_at').then(res => setCampaignSubtasks(res.data || []));
  };
  const addCampaignComment = async (overrideBody?: string) => {
    const raw = typeof overrideBody === 'string' ? overrideBody : campaignComment;
    if (!selectedCampaign || !raw.trim() || !profile?.id) return;
    const body = raw.trim();
    const { error } = await supabase.from('activity_log').insert({ workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca', user_id: profile.id, action: 'comment', entity_type: 'campaign', entity_id: selectedCampaign.id, metadata: { body } });
    if (error) return toast.error('Không thể gửi bình luận');
    const mentionedNames = (body.match(/@([a-zA-Z0-9_À-ỹ]+)/g) || []).map(m => m.slice(1).toLowerCase());
    const mentionedUsers = people.filter(p => mentionedNames.includes(p.name.replace(/\s+/g, '').toLowerCase()));
    if (!hasCanonicalNotifications() && mentionedUsers.length) {
      await supabase.from('notifications').insert(mentionedUsers.map(person => ({
        user_id: person.id,
        type: 'system',
        message: `${profile?.name || 'Một thành viên'} đã nhắc bạn trong chiến dịch: ${selectedCampaign.name}`,
        entity_type: 'campaign',
        entity_id: selectedCampaign.id
      })));
    }
    await notifyStakeholders('campaign', selectedCampaign.id, 'đã bình luận trong chiến dịch: ' + selectedCampaign.name);
    setCampaignComment('');
    setRefreshDetailTrigger(v=>v+1);
    supabase.from('activity_log').select('*, user:user_id(name,avatar_url)').eq('entity_type', 'campaign').eq('entity_id', selectedCampaign.id).eq('action', 'comment').order('created_at').then(res => setCampaignComments(res.data || []));
  };
  const handleUpdateProjectStatus = async (projectId: string, newStatus: string) => {
    setProjects(current => current.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
    if (selected?.id === projectId) setSelected(current => current ? { ...current, status: newStatus } : null);
    const { error } = await supabase.from('projects').update({ status: newStatus }).eq('id', projectId);
    if (error) {
      toast.error(lang === 'en' ? 'Failed to update project status' : 'Lỗi cập nhật trạng thái dự án');
      void load();
      return;
    }
    window.dispatchEvent(new Event('projects:changed'));
    window.dispatchEvent(new Event('tasks:changed'));
    toast.success(lang === 'en' ? 'Project status updated' : 'Đã cập nhật trạng thái dự án');
  };

  const handleUpdateCampaignStatus = async (campaignId: string, newStatus: string) => {
    setCampaigns(current => current.map(c => c.id === campaignId ? { ...c, status: newStatus } : c));
    if (selectedCampaign?.id === campaignId) setSelectedCampaign((current: any) => current ? { ...current, status: newStatus } : null);
    const { error } = await supabase.from('campaigns').update({ status: newStatus }).eq('id', campaignId);
    if (error) {
      toast.error(lang === 'en' ? 'Failed to update campaign status' : 'Lỗi cập nhật trạng thái chiến dịch');
      void load();
      return;
    }
    window.dispatchEvent(new Event('campaigns:changed'));
    window.dispatchEvent(new Event('tasks:changed'));
    toast.success(lang === 'en' ? 'Campaign status updated' : 'Đã cập nhật trạng thái chiến dịch');
  };

  const completeCampaign = async () => { if (!selectedCampaign) return; const { error } = await supabase.from('campaigns').update({ status: 'completed' }).eq('id', selectedCampaign.id); if (error) return toast.error('Không thể hoàn thành Campaign'); const updated = { ...selectedCampaign, status: 'completed' }; setSelectedCampaign(updated); window.dispatchEvent(new Event('campaigns:changed')); toast.success('Đã hoàn thành Campaign');
    await notifyStakeholders('campaign', selectedCampaign.id, 'đã đánh dấu hoàn thành chiến dịch: ' + selectedCampaign.name); };
  const saveCampaignEdit = async () => { if (!selectedCampaign || !title.trim() || !selectedRoot) return; const { data, error } = await supabase.from('campaigns').update({ name: title.trim(), status: editStatus, objective: campaignObjective || null, start_date: parseYMD(start), end_date: parseYMD(due), budget: campaignBudget ? Number(campaignBudget) : null, lead_id: primaryOwnerId ? Number(primaryOwnerId) : null, department_id: (typeof departmentId !== 'undefined' && departmentId) ? departmentId : null }).eq('id', selectedCampaign.id).select('*, lead:lead_id(name,avatar_url), creator:created_by(name,avatar_url)').single(); if (error || !data) return toast.error('Không thể cập nhật Campaign'); if (typeof saveEntityPhasePermission === 'function') { await saveEntityPhasePermission(supabase, 'campaign', selectedCampaign.id, typeof allowPhaseCreation !== 'undefined' ? allowPhaseCreation : true, typeof profile !== 'undefined' ? profile?.id : null); } setSelectedCampaign(data); setCampaigns(items => items.map(item => item.id === data.id ? data : item)); setCampaignEditMode(false); window.dispatchEvent(new Event('campaigns:changed')); toast.success('Đã lưu Campaign');
    await notifyStakeholders('campaign', selectedCampaign.id, 'đã cập nhật thông tin chiến dịch: ' + title); };

 return {creationPeople,creationDepartments,userIsRestricted,resolvedDeptId,viewMode,setViewMode,visibleCampaigns,handleUpdateProjectStatus,handleUpdateCampaignStatus,campaignStatus,setCampaignStatus,departments,departmentId,setDepartmentId,departmentFilter,effectiveDepartmentFilter,setDepartmentFilter,editStatus,setEditStatus,t,lang,setParams,workflow,sourceTask,setSourceTask,profile,canCreate,canManageProject,canHideOrDeleteParent,projects,setProjects,people,selected,setSelected,picMembers,selectedCampaign,setSelectedCampaign,selectedRoot,projectsExpanded,setProjectsExpanded,createOpen,setCreateOpen,creating,executionMemberIds,setExecutionMemberIds,projectPrimaryOwners,projectToDelete,setProjectToDelete,deletingIds,projectToHide,setProjectToHide,campaignToDelete,setCampaignToDelete,campaignToHide,setCampaignToHide,subtaskToDelete,setSubtaskToDelete,title,setTitle,description,setDescription,campaignSubtaskToDelete,setCampaignSubtaskToDelete,start,setStart,due,setDue,priority,setPriority,ownerIds,setOwnerIds,creationType,setCreationType,showAdvanced,setShowAdvanced,primaryOwnerId,setPrimaryOwnerId,parentCampaignId,campaignObjective,setCampaignObjective,campaignBudget,setCampaignBudget,campaignChannels,setCampaignChannels,attachmentUrl,setAttachmentUrl,attachmentFile,setAttachmentFile,campaigns,setCampaigns,campaignSubtasks,setCampaignSubtasks,campaignComments,campaignNewSubtask,setCampaignNewSubtask,campaignSubtaskOwner,setCampaignSubtaskOwner,campaignSubtaskDue,setCampaignSubtaskDue,campaignSubtaskQuantity,setCampaignSubtaskQuantity,campaignSubtaskPriority,setCampaignSubtaskPriority,showCampaignSubtaskForm,setShowCampaignSubtaskForm,campaignComment,setCampaignComment,campaignEditMode,setCampaignEditMode,subtasks,setSubtasks,comments,selectedSubtask,setSelectedSubtask,subtaskCommentCounts,subtaskChecklistCounts,subtaskQuantities,campaignSubtaskCommentCounts,campaignSubtaskChecklistCounts,campaignSubtaskQuantities,toggleSubtask,toggleCampaignSubtask,hasCampaignComments,hasMentionOrUnread,recentlyCompletedSubtaskId,setRecentlyCompletedSubtaskId,setRefreshDetailTrigger,removeComment,saveEditedComment,newSubtask,setNewSubtask,editMode,setEditMode,showSubtaskForm,setShowSubtaskForm,width,resizing,setResizing,subtaskOwner,setSubtaskOwner,subtaskDue,setSubtaskDue,subtaskQuantity,setSubtaskQuantity,subtaskPriority,setSubtaskPriority,comment,setComment,panelOpen,visiblePeople,projectCommentInput,projectMentionOptions,chooseProjectMention,campaignEditingSubtaskId,setCampaignEditingSubtaskId,campaignEditSubtaskTitle,setCampaignEditSubtaskTitle,campaignEditSubtaskOwner,setCampaignEditSubtaskOwner,campaignEditSubtaskDue,setCampaignEditSubtaskDue,campaignCommentInput,campaignMentionOptions,chooseCampaignMention,removeCampaignSubtask,completeCampaignSubtask,saveEditedCampaignSubtask,removeCampaignComment,saveEditedCampaignComment,hasComments,subtaskMembers,searchTerm,setSearchTerm,statusFilter,setStatusFilter,picFilter,setPicFilter,calendarFilter,setCalendarFilter,customStartDate,setCustomStartDate,customEndDate,setCustomEndDate,priorityFilter,setPriorityFilter,activeDropdown,setActiveDropdown,toolbarRef,hasActiveFilters,handleResetFilters,campaignFilters,visibleProjects,completeProject,resetCreateForm,selectParentCampaign,createItem,editingSubtaskId,setEditingSubtaskId,editSubtaskTitle,setEditSubtaskTitle,editSubtaskOwner,setEditSubtaskOwner,editSubtaskDue,setEditSubtaskDue,executeRemoveSubtask,executeRemoveCampaignSubtask,removeSubtask,saveEditedSubtask,saveInlineEdit,executeHideProject,archiveProject,executeRemoveProject,removeProject,archiveCampaign,executeHideCampaign,removeCampaign,executeRemoveCampaign,addSubtask,completeSubtask,addComment,addCampaignSubtask,addCampaignComment,completeCampaign,saveCampaignEdit,allowPhaseCreation,setAllowPhaseCreation};
}
