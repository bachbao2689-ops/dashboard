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
import {useAuthStore} from '../store/authStore';
import {checkDateMatch,type CampaignFilters} from '../components/features/projects/CampaignPanel';
import {recordTaskDeletion} from '../services/taskDeletionLog';
import {type Project,type Person,strictFormatVN} from '../components/features/projects/projectPresentation';
import {canViewTeamManagement,isGlobalManager} from '../lib/roleScope';
import {isTaskDone} from '../lib/taskTracking';
import {deleteOwnedComment,ownsComment} from '../lib/commentDeletion';
import {editOwnedComment} from '../lib/commentEditing';
import {useRememberedState} from './useRememberedState';
export function useProjectsController(){
  const { t, lang } = useTranslation();
  const [params, setParams] = useSearchParams();
  const workflow = useWorkflowHub();
  const [sourceTask, setSourceTask] = useState<Task | null>(null);
  const loadRequest = useRef(0);
  const profile = useAuthStore(s => s.profile);
  const canCreate = canViewTeamManagement(profile) && (isGlobalManager(profile) || Boolean(profile?.department_id));
  const canManageProject = (project: Project) => Boolean(profile && (project.created_by === profile.id || workflow.tracks.some(track => track.entity_type === 'project' && track.entity_id === project.id && track.root)));
  const [projects, setProjects] = useState<Project[]>([]);   const directory=useWorkspaceDirectory();
  const people=useMemo(()=>(directory.data?.users||[]).map(user=>({...user,id:Number(user.id),departments:user.department})),[directory.data]);
  const [members, setMembers] = useState<Record<string, string[]>>({}); const [selected, setSelected] = useState<Project | null>(null);
  const [storedPicMembers, setPicMembers] = useState<Record<string, string[]>>({});
  const picMembers = useMemo(() => ({ ...storedPicMembers, ...Object.fromEntries(workflow.tracks.filter(track => track.entity_type === 'project').map(track => [track.entity_id, track.pics.map(p => String(p.id))])) }), [storedPicMembers, workflow.tracks]);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [selectedRoot, setSelectedRoot] = useState(false);
  useEffect(() => {
    setSelectedRoot(false);
    const id = selected?.id || selectedCampaign?.id;
    let active = true;
    if (id) supabase.rpc('workflow_root', { k: selected ? 'project' : 'campaign', e: id }).then(({ data }) => { if (active) setSelectedRoot(data === true); });
    return () => { active = false; };
  }, [selected?.id, selectedCampaign?.id, profile?.id,profile?.role,profile?.employment_level]);
  const [projectsExpanded, setProjectsExpanded] = useRememberedState('projects.expanded', true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const creationLock = React.useRef(false);
  const [executionMemberIds, setExecutionMemberIds] = useState<string[]>([]);
  const [projectPrimaryOwners, setProjectPrimaryOwners] = useState<Record<string, number>>({});
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [projectToHide, setProjectToHide] = useState<Project | null>(null);
  const [subtaskToDelete, setSubtaskToDelete] = useState<string | null>(null); const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [campaignSubtaskToDelete, setCampaignSubtaskToDelete] = useState<any | null>(null);
  const [start, setStart] = useState(''); const [due, setDue] = useState(''); const [priority, setPriority] = useState('medium'); const [ownerIds, setOwnerIds] = useState<string[]>([]);
  const [creationType, setCreationType] = useState<'project' | 'campaign'>('project'); const [showAdvanced, setShowAdvanced] = useState(false);
  const [primaryOwnerId, setPrimaryOwnerId] = useState(''); const [parentCampaignId, setParentCampaignId] = useState(''); const [departmentId, setDepartmentId] = useState('');
  const [campaignObjective, setCampaignObjective] = useState(''); const [campaignBudget, setCampaignBudget] = useState(''); const [campaignStatus, setCampaignStatus] = useState('planning');
  const [campaignChannels, setCampaignChannels] = useState<string[]>([]); const [attachmentUrl, setAttachmentUrl] = useState(''); const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignSubtasks, setCampaignSubtasks] = useState<any[]>([]); const [campaignComments, setCampaignComments] = useState<any[]>([]);
  const [campaignNewSubtask, setCampaignNewSubtask] = useState(''); const [campaignSubtaskOwner, setCampaignSubtaskOwner] = useState(''); const [campaignSubtaskDue, setCampaignSubtaskDue] = useState(''); const [showCampaignSubtaskForm, setShowCampaignSubtaskForm] = useState(false); const [campaignComment, setCampaignComment] = useState(''); const [campaignEditMode, setCampaignEditMode] = useState(false);
  const [subtasks, setSubtasks] = useState<any[]>([]); const [comments, setComments] = useState<any[]>([]);
  const [selectedSubtask, setSelectedSubtask] = useState<any | null>(null);
  const [subtaskCommentCounts, setSubtaskCommentCounts] = useState<Record<string, number>>({});
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
  const [newSubtask, setNewSubtask] = useState(''); const [editMode, setEditMode] = useState(false); const [showSubtaskForm, setShowSubtaskForm] = useState(false); const [width, setWidth] = useState(500); const [resizing, setResizing] = useState(false); const [subtaskOwner, setSubtaskOwner] = useState(''); const [subtaskDue, setSubtaskDue] = useState(''); const [comment, setComment] = useState('');

  const panelOpen = Boolean(selected || selectedCampaign);


  useEffect(() => {
    if (!resizing) return;
    const move = (e: MouseEvent) => setWidth(Math.max(400, Math.min(window.innerWidth - e.clientX, 800)));
    const up = () => setResizing(false);
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
  }, [resizing]);



  // Selecting another department's PIC is an explicit invitation, not a global
  // read grant. The database limits their workflow scope to parent or phase.
  const visiblePeople = people;
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
    if (!selectedCampaign || ['done', 'complete', 'completed'].includes((subtask.status || '').toLowerCase())) return;
    const { error } = await supabase.from('campaign_subtasks').update({ status: 'completed' }).eq('id', subtask.id);
    if (error) return toast.error('Không thể hoàn thành subtask');
    const { data } = await supabase.from('campaign_subtasks').select('*, assignee:assignee_id(name,avatar_url)').eq('campaign_id', selectedCampaign.id).order('created_at');
    setCampaignSubtasks(data || []);
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
    for (const task of workflow.tasks) if (task.project_id && task.assignee_id) (result[task.project_id] ||= new Set()).add(String(task.assignee_id));
    for (const track of workflow.tracks) if (track.entity_type === 'project') for (const member of track.sub_pics || []) (result[track.entity_id] ||= new Set()).add(String(member.id));
    return Object.fromEntries(Object.entries(result).map(([id, ids]) => [id, [...ids]]));
  }, [legacySubtaskMembers, workflow.tasks, workflow.tracks]);

  // Filter states
  const [searchTerm, setSearchTerm] = useRememberedState('projects.search', '');
  const [statusFilter, setStatusFilter] = useRememberedState<string>('projects.status', 'open');
  const [picFilter, setPicFilter] = useRememberedState<string>('projects.pic', 'all');
  const [calendarFilter, setCalendarFilter] = useRememberedState<string>('projects.calendar', 'all');
  const [customStartDate, setCustomStartDate] = useRememberedState<string>('projects.startDate', '');
  const [customEndDate, setCustomEndDate] = useRememberedState<string>('projects.endDate', '');
  const [priorityFilter, setPriorityFilter] = useRememberedState<string>('projects.priority', 'all');

  // Dropdown open state
  const [activeDropdown, setActiveDropdown] = useState<'status' | 'pic' | 'calendar' | 'priority' | null>(null);
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
    priorityFilter !== 'all'
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('open');
    setPicFilter('all');
    setCalendarFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setPriorityFilter('all');
    setActiveDropdown(null);
  };

  const campaignFilters = useMemo<CampaignFilters>(() => ({
    searchTerm,
    status: statusFilter,
    picId: picFilter,
    calendar: calendarFilter,
    customStartDate,
    customEndDate,
    priority: priorityFilter
  }), [searchTerm, statusFilter, picFilter, calendarFilter, customStartDate, customEndDate, priorityFilter]);

  const visibleProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return projects.filter(p => {
      // 1. Search filter
      if (term) {
        const nameMatch = (p.name || '').toLowerCase().includes(term);
        const descMatch = (p.description || '').toLowerCase().includes(term);
        if (!nameMatch && !descMatch) return false;
      }

      // 2. Status filter
      if (statusFilter === 'open' && isTaskDone(p.status)) return false;
      if (statusFilter !== 'all' && statusFilter !== 'open') {
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

      return true;
    });
  }, [projects, searchTerm, statusFilter, picFilter, calendarFilter, customStartDate, customEndDate, priorityFilter, members, picMembers, subtaskMembers, projectPrimaryOwners, profile?.id]);


  const load = async () => {
    const token = ++loadRequest.current;
    if (!profile) { setProjects([]); setSelected(null); setSelectedCampaign(null); return; }
    const [projectRes, memberRes, commentRes, subtaskRes, campaignRes, creationRes] = await Promise.all([
      supabase.from('projects').select('*, creator:created_by(name,avatar_url)').neq('status', 'archived').neq('status', 'deleted').order('created_at', { ascending: false }),
      supabase.from('project_members').select('project_id,user_id,workflow_role'),
      supabase.from('project_comments').select('project_id'),
      supabase.from('project_subtasks').select('project_id,assignee_id').not('status','in','(deleted,archived)'),
      supabase.from('campaigns').select('*,lead:lead_id(name,avatar_url),creator:created_by(name,avatar_url)').neq('status','archived').neq('status','deleted').order('name'),
      supabase.from('activity_log').select('entity_id,metadata').eq('entity_type','project').eq('action','creation_details')
    ]);
    if (token !== loadRequest.current) return;
    if (projectRes.error) return toast.error('Không thể tải Project');
    setProjects(projectRes.data || []);
    setSelected(current => current ? (projectRes.data || []).find(p => p.id === current.id) || null : null);
    setMembers((memberRes.data || []).reduce((acc: Record<string, string[]>, item: any) => ({ ...acc, [item.project_id]: [...(acc[item.project_id] || []), String(item.user_id)] }), {}));
    setPicMembers((memberRes.data || []).filter(item => item.workflow_role === 'pic').reduce((acc: Record<string, string[]>, item: any) => ({ ...acc, [item.project_id]: [...(acc[item.project_id] || []), String(item.user_id)] }), {}));

    const commentsMap: Record<string, boolean> = {};
    (commentRes.data || []).forEach(c => commentsMap[c.project_id] = true);
    setHasComments(commentsMap);
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
  };
  useEffect(() => {
    void load();
    return () => { loadRequest.current++; };
  }, [profile?.id, profile?.department_id,profile?.role,profile?.employment_level]);
  useWorkspaceRealtime(['projects','campaigns','project_subtasks','campaign_subtasks','project_members','campaign_members','project_comments','activity_log'], change => {
    if(!change?.table||change.table!=='activity_log'||change.new?.action==='creation_details'||change.eventType==='DELETE')void load();
    const row=change?.new||change?.old;
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
      if (!nextSubtasks.length) return setSubtaskCommentCounts({});
      const { data: subtaskActivities } = await supabase.from('activity_log').select('entity_id').eq('entity_type', 'project_subtask').eq('action', 'comment').in('entity_id', nextSubtasks.map(item => item.id));
      if (!active) return;
      const counts = (subtaskActivities || []).reduce((acc: Record<string, number>, item: any) => ({ ...acc, [item.entity_id]: (acc[item.entity_id] || 0) + 1 }), {});
      setSubtaskCommentCounts(counts);
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
      setCampaignSubtasks((subtaskRes.data || []).filter(task => !['deleted', 'archived'].includes(task.status)));
      setCampaignComments(commentRes.data || []);
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
    setParentCampaignId(''); setDepartmentId(profile?.department_id || ''); setCampaignObjective(''); setCampaignBudget(''); setCampaignStatus('planning'); setCampaignChannels([]); setAttachmentUrl(''); setAttachmentFile(null); setShowAdvanced(false);
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
    const allowed = new Set(visiblePeople.map(person => String(person.id)));
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
          lead_id: Number(primaryOwnerId), status: campaignStatus,
          department_id: profile.department_id || people.find(p => p.id === Number(primaryOwnerId))?.department_id || null,
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
        window.dispatchEvent(new Event('campaigns:changed'));
        toast.success('Đã tạo Campaign');
        const { error: notificationError } = hasCanonicalNotifications() ? {error:null} : await supabase.from('notifications').insert({ user_id: campaign.lead_id, type: 'system', message: profile.name + ' đã giao chiến dịch: ' + campaign.name, entity_type: 'campaign', entity_id: campaign.id });
        if (notificationError) toast.error('Campaign đã tạo; thông báo chưa gửi được.');
      } else {
        const picIds = Array.from(new Set([primaryOwnerId, ...ownerIds]));
        const participantIds = Array.from(new Set([...picIds, ...executionMemberIds]));
        const { data: project, error } = await supabase.from('projects').insert({
          name: title.trim(), description: description || null, start_date: startDate, due_date: endDate, priority,
          status: 'active', campaign_id: parentCampaignId || null,
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
          metadata: { primary_owner_id: Number(primaryOwnerId), owner_ids: picIds.map(Number), member_ids: executionMemberIds.map(Number) }
        });
        if (metadataError) toast.error('Project đã tạo nhưng chưa lưu được phân loại PIC chính.');
        if (!memberError && !hasCanonicalNotifications()) {
          const { error: notificationError } = await supabase.from('notifications').insert(participantIds.map(id => ({ user_id: Number(id), type: 'system', message: profile.name + ' đã giao dự án: ' + project.name, entity_type: 'project', entity_id: project.id })));
          if (notificationError) toast.error('Project đã tạo; thông báo chưa gửi được.');
        }
        toast.success('Đã tạo Project');
        window.dispatchEvent(new Event('projects:changed'));
      }
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo mới. Kiểm tra kết nối và thử lại.');
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
    const { data, error } = await supabase.from('projects').update({ name: title, description, start_date: parseYMD(start), due_date: parseYMD(due), priority, status: editStatus }).eq('id', selected.id).select().single();
    if (error || !data) return toast.error('Lỗi cập nhật');
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
    if (!canManageProject(projectToHide)) { toast.error('Bạn không có quyền ẩn Project này.'); setProjectToHide(null); return; }
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
    if (!canManageProject(project)) return toast.error('Bạn không có quyền ẩn Project này.');
    setProjectToHide(project);
  };



  const executeRemoveProject = async () => {
    if (!projectToDelete) return;
    if (!canManageProject(projectToDelete)) { toast.error('Bạn không có quyền xóa Project này.'); setProjectToDelete(null); return; }
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
    if (!canManageProject(project)) return toast.error('Bạn không có quyền xóa Project này.');
    setProjectToDelete(project);
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
    const { error } = await supabase.from('project_subtasks').insert({ project_id: selected.id, title: newSubtask.trim(), assignee_id: subtaskOwner ? Number(subtaskOwner) : null, due_date: parseYMD(subtaskDue) });
    if (error) return toast.error(error.message);
    setNewSubtask(''); setSubtaskOwner(''); setSubtaskDue(''); setRefreshDetailTrigger(v=>v+1);
    window.dispatchEvent(new Event('projects:changed'));
  };
  const completeSubtask = async (subtask: any) => {
    if (!selected || ['done', 'complete', 'completed'].includes((subtask.status || '').toLowerCase())) return;
    const { error } = await supabase.from('project_subtasks').update({ status: 'completed' }).eq('id', subtask.id);
    if (error) return toast.error('Không thể hoàn thành subtask');
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
  const addCampaignSubtask = async () => { if (!selectedCampaign || !campaignNewSubtask.trim()) return; const { error } = await supabase.from('campaign_subtasks').insert({ campaign_id: selectedCampaign.id, title: campaignNewSubtask.trim(), assignee_id: campaignSubtaskOwner ? Number(campaignSubtaskOwner) : null, due_date: parseYMD(campaignSubtaskDue) });
  if (!error && campaignSubtaskOwner) await notifyStakeholders('campaign', selectedCampaign.id, 'đã giao subtask mới cho bạn: ' + campaignNewSubtask.trim(), campaignSubtaskOwner); if (error) return toast.error('Không thể tạo Subtask Campaign'); setCampaignNewSubtask(''); setCampaignSubtaskOwner(''); setCampaignSubtaskDue(''); setShowCampaignSubtaskForm(false); setRefreshDetailTrigger(v=>v+1);
    supabase.from('campaign_subtasks').select('*, assignee:assignee_id(name,avatar_url)').eq('campaign_id', selectedCampaign.id).order('created_at').then(res => setCampaignSubtasks(res.data || [])); };
  const addCampaignComment = async (overrideBody?: string) => {
    const raw = typeof overrideBody === 'string' ? overrideBody : campaignComment;
    if (!selectedCampaign || !raw.trim() || !profile?.id) return;
    const body = raw.trim();
    const { error } = await supabase.from('activity_log').insert({ workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca', user_id: profile.id, action: 'comment', entity_type: 'campaign', entity_id: selectedCampaign.id, metadata: { body } });
    if (error) return toast.error('Không thể gửi bình luận');
    await notifyStakeholders('campaign', selectedCampaign.id, 'đã bình luận trong chiến dịch: ' + selectedCampaign.name);
    setCampaignComment('');
    setRefreshDetailTrigger(v=>v+1);
    supabase.from('activity_log').select('*, user:user_id(name,avatar_url)').eq('entity_type', 'campaign').eq('entity_id', selectedCampaign.id).eq('action', 'comment').order('created_at').then(res => setCampaignComments(res.data || []));
  };
  const completeCampaign = async () => { if (!selectedCampaign) return; const { error } = await supabase.from('campaigns').update({ status: 'completed' }).eq('id', selectedCampaign.id); if (error) return toast.error('Không thể hoàn thành Campaign'); const updated = { ...selectedCampaign, status: 'completed' }; setSelectedCampaign(updated); window.dispatchEvent(new Event('campaigns:changed')); toast.success('Đã hoàn thành Campaign');
    await notifyStakeholders('campaign', selectedCampaign.id, 'đã đánh dấu hoàn thành chiến dịch: ' + selectedCampaign.name); };
  const saveCampaignEdit = async () => { if (!selectedCampaign || !title.trim() || !selectedRoot) return; const { data, error } = await supabase.from('campaigns').update({ name: title.trim(), status: editStatus, objective: campaignObjective || null, start_date: parseYMD(start), end_date: parseYMD(due), budget: campaignBudget ? Number(campaignBudget) : null, lead_id: primaryOwnerId ? Number(primaryOwnerId) : null }).eq('id', selectedCampaign.id).select('*, lead:lead_id(name,avatar_url), creator:created_by(name,avatar_url)').single(); if (error || !data) return toast.error('Không thể cập nhật Campaign'); setSelectedCampaign(data); setCampaigns(items => items.map(item => item.id === data.id ? data : item)); setCampaignEditMode(false); window.dispatchEvent(new Event('campaigns:changed')); toast.success('Đã lưu Campaign');
    await notifyStakeholders('campaign', selectedCampaign.id, 'đã cập nhật thông tin chiến dịch: ' + title); };

 return {editStatus,setEditStatus,t,lang,setParams,workflow,sourceTask,setSourceTask,profile,canCreate,canManageProject,projects,people,selected,setSelected,picMembers,selectedCampaign,setSelectedCampaign,selectedRoot,projectsExpanded,setProjectsExpanded,createOpen,setCreateOpen,creating,executionMemberIds,setExecutionMemberIds,projectPrimaryOwners,projectToDelete,setProjectToDelete,deletingIds,projectToHide,setProjectToHide,subtaskToDelete,setSubtaskToDelete,title,setTitle,description,setDescription,campaignSubtaskToDelete,setCampaignSubtaskToDelete,start,setStart,due,setDue,priority,setPriority,ownerIds,setOwnerIds,creationType,setCreationType,showAdvanced,setShowAdvanced,primaryOwnerId,setPrimaryOwnerId,parentCampaignId,campaignObjective,setCampaignObjective,campaignBudget,setCampaignBudget,campaignChannels,setCampaignChannels,attachmentUrl,setAttachmentUrl,attachmentFile,setAttachmentFile,campaigns,campaignSubtasks,campaignComments,campaignNewSubtask,setCampaignNewSubtask,campaignSubtaskOwner,setCampaignSubtaskOwner,campaignSubtaskDue,setCampaignSubtaskDue,showCampaignSubtaskForm,setShowCampaignSubtaskForm,campaignComment,setCampaignComment,campaignEditMode,setCampaignEditMode,subtasks,setSubtasks,comments,selectedSubtask,setSelectedSubtask,subtaskCommentCounts,recentlyCompletedSubtaskId,setRecentlyCompletedSubtaskId,setRefreshDetailTrigger,removeComment,saveEditedComment,newSubtask,setNewSubtask,editMode,setEditMode,showSubtaskForm,setShowSubtaskForm,width,resizing,setResizing,subtaskOwner,setSubtaskOwner,subtaskDue,setSubtaskDue,comment,setComment,panelOpen,visiblePeople,projectCommentInput,projectMentionOptions,chooseProjectMention,campaignEditingSubtaskId,setCampaignEditingSubtaskId,campaignEditSubtaskTitle,setCampaignEditSubtaskTitle,campaignEditSubtaskOwner,setCampaignEditSubtaskOwner,campaignEditSubtaskDue,setCampaignEditSubtaskDue,campaignCommentInput,campaignMentionOptions,chooseCampaignMention,removeCampaignSubtask,completeCampaignSubtask,saveEditedCampaignSubtask,removeCampaignComment,saveEditedCampaignComment,hasComments,subtaskMembers,searchTerm,setSearchTerm,statusFilter,setStatusFilter,picFilter,setPicFilter,calendarFilter,setCalendarFilter,customStartDate,setCustomStartDate,customEndDate,setCustomEndDate,priorityFilter,setPriorityFilter,activeDropdown,setActiveDropdown,toolbarRef,hasActiveFilters,handleResetFilters,campaignFilters,visibleProjects,completeProject,resetCreateForm,selectParentCampaign,createItem,editingSubtaskId,setEditingSubtaskId,editSubtaskTitle,setEditSubtaskTitle,editSubtaskOwner,setEditSubtaskOwner,editSubtaskDue,setEditSubtaskDue,executeRemoveSubtask,executeRemoveCampaignSubtask,removeSubtask,saveEditedSubtask,saveInlineEdit,executeHideProject,archiveProject,executeRemoveProject,removeProject,addSubtask,completeSubtask,addComment,addCampaignSubtask,addCampaignComment,completeCampaign,saveCampaignEdit};
}
