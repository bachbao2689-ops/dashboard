import { StatusBadge } from '../components/common/StatusBadge';
import { MultiSelect } from '../components/common/MultiSelect';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkflowHub } from '../hooks/useWorkflowHub';
import { useWorkspaceRealtime } from '../hooks/useWorkspaceRealtime';
import { WorkflowTrackingSummary } from '../components/features/projects/WorkflowTrackingSummary';
import { TaskDetailPanel } from '../components/features/tasks/TaskDetailPanel';
import type { Task } from '../hooks/useTasks';
import { Avatar } from "../components/common/Avatar";

import toast from 'react-hot-toast';
import { useTranslation } from '../i18n/translations';
import { ChevronDown, ChevronRight, FolderKanban, MessageSquare, Plus, Users, X, Edit3, Trash2, CheckCircle2, Calendar, EyeOff, Reply, Send, Search, ArrowUpDown } from 'lucide-react';
import { ConfirmDeleteModal } from '../components/common/ConfirmDeleteModal';
import { ConfirmHideModal } from '../components/common/ConfirmHideModal';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { CampaignPanel, checkDateMatch, type CampaignFilters } from '../components/features/projects/CampaignPanel';
import { SubtaskDetailPanel } from '../components/features/projects/SubtaskDetailPanel';
import { recordTaskDeletion } from '../services/taskDeletionLog';

type Project = { id: string; name: string; description: string | null; status: string; start_date: string | null; due_date: string | null; priority: string; created_by: number | null; campaign_id?: string | null; department_id?: string | null; lead_id?: number | null };
type Person = { id: number; name: string; department_id: string | null; departments?: { name: string } | null };

const strictFormatVN = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  const ymd = dateStr.split('T')[0];
  const parts = ymd.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
};
const dateValue = strictFormatVN;
const priorityClass = (value: string) => value === 'high' || value === 'urgent' ? 'bg-red-100 text-red-700' : value === 'low' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700';




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
      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30">
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
  
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap ${color}`}>{label}</span>;
};

export const Projects: React.FC = () => {
  const { t, lang } = useTranslation();
  const [params, setParams] = useSearchParams();
  const workflow = useWorkflowHub();
  const [sourceTask, setSourceTask] = useState<Task | null>(null);
  const loadRequest = useRef(0);
  const profile = useAuthStore(s => s.profile);
  const canCreate = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'leader' || profile?.employment_level === 'Leader';
  const [projects, setProjects] = useState<Project[]>([]); const [people, setPeople] = useState<Person[]>([]);
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
  }, [selected?.id, selectedCampaign?.id, profile?.id]);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
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
  const [subtasks, setSubtasks] = useState<any[]>([]); const [comments, setComments] = useState<any[]>([]); const [editingCommentId, setEditingCommentId] = useState<string | null>(null); const [editingCommentText, setEditingCommentText] = useState('');
  const [selectedSubtask, setSelectedSubtask] = useState<any | null>(null);
  const [subtaskCommentCounts, setSubtaskCommentCounts] = useState<Record<string, number>>({});
  const [recentlyCompletedSubtaskId, setRecentlyCompletedSubtaskId] = useState<string | null>(null);
  const [refreshDetailTrigger, setRefreshDetailTrigger] = useState(0);

  const removeComment = async (id: string) => { await supabase.from('project_comments').delete().eq('id', id); setComments(comments.filter(c => c.id !== id)); };
  const saveEditedComment = async (id: string) => { await supabase.from('project_comments').update({ body: editingCommentText }).eq('id', id); setComments(comments.map(c => c.id === id ? { ...c, body: editingCommentText } : c)); setEditingCommentId(null); };
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
  const [campaignEditingCommentId, setCampaignEditingCommentId] = useState<string | null>(null);
  const [campaignEditingCommentText, setCampaignEditingCommentText] = useState('');
  const campaignCommentInput = React.useRef<HTMLTextAreaElement>(null);
  const campaignMentionQuery = useMemo(() => campaignComment.match(/(?:^|\s)@([^\s@]*)$/)?.[1]?.toLowerCase() || null, [campaignComment]);
  const campaignMentionOptions = useMemo(() => campaignMentionQuery === null ? [] : visiblePeople.filter(person => person.name.toLowerCase().includes(campaignMentionQuery)).slice(0, 5), [campaignMentionQuery, visiblePeople]);
  const chooseCampaignMention = (person: any) => { setCampaignComment(value => value.replace(/@[^\s@]*$/, `@${person.name.replace(/\s+/g, '')} `)); campaignCommentInput.current?.focus(); };
  
  const removeCampaignSubtask = async (id: string) => { await supabase.from('campaign_subtasks').update({ status: 'deleted' }).eq('id', id); setCampaignSubtasks(campaignSubtasks.filter(s => s.id !== id)); };
  const completeCampaignSubtask = async (subtask: any) => { if (!selectedCampaign || ['done', 'complete', 'completed'].includes((subtask.status || '').toLowerCase())) return; await supabase.from('campaign_subtasks').update({ status: 'completed' }).eq('id', subtask.id); const { data } = await supabase.from('campaign_subtasks').select('*, assignee:assignee_id(name,avatar_url)').eq('campaign_id', selectedCampaign.id).order('created_at'); setCampaignSubtasks(data || []); };
  const saveEditedCampaignSubtask = async (id: string) => { await supabase.from('campaign_subtasks').update({ title: campaignEditSubtaskTitle, due_date: campaignEditSubtaskDue ? (campaignEditSubtaskDue.includes('/') ? campaignEditSubtaskDue.split('/').reverse().join('-') : campaignEditSubtaskDue) : null, assignee_id: campaignEditSubtaskOwner ? Number(campaignEditSubtaskOwner) : null }).eq('id', id); setCampaignEditingSubtaskId(null); const { data } = await supabase.from('campaign_subtasks').select('*, assignee:assignee_id(name,avatar_url)').eq('campaign_id', selectedCampaign.id).order('created_at'); setCampaignSubtasks(data || []); };
  
  const removeCampaignComment = async (id: string) => { await supabase.from('activity_log').delete().eq('id', id); setCampaignComments(campaignComments.filter(c => c.id !== id)); };
  const saveEditedCampaignComment = async (id: string) => { await supabase.from('activity_log').update({ metadata: { body: campaignEditingCommentText } }).eq('id', id); setCampaignComments(campaignComments.map(c => c.id === id ? { ...c, metadata: { ...c.metadata, body: campaignEditingCommentText } } : c)); setCampaignEditingCommentId(null); };
    const [hasComments, setHasComments] = useState<Record<string, boolean>>({});
  const [legacySubtaskMembers, setSubtaskMembers] = useState<Record<string, string[]>>({});
  const subtaskMembers = useMemo(() => {
    const result = Object.fromEntries(Object.entries(legacySubtaskMembers).map(([id, ids]) => [id, new Set(ids)]));
    for (const task of workflow.tasks) if (task.project_id && task.assignee_id) (result[task.project_id] ||= new Set()).add(String(task.assignee_id));
    for (const track of workflow.tracks) if (track.entity_type === 'project') for (const member of track.sub_pics || []) (result[track.entity_id] ||= new Set()).add(String(member.id));
    return Object.fromEntries(Object.entries(result).map(([id, ids]) => [id, [...ids]]));
  }, [legacySubtaskMembers, workflow.tasks, workflow.tracks]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [picFilter, setPicFilter] = useState<string>('all');
  const [calendarFilter, setCalendarFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Dropdown open state
  const [activeDropdown, setActiveDropdown] = useState<'status' | 'pic' | 'calendar' | 'priority' | null>(null);
  const [picSearchQuery, setPicSearchQuery] = useState('');
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
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
    statusFilter !== 'all' ||
    picFilter !== 'all' ||
    calendarFilter !== 'all' ||
    customStartDate ||
    customEndDate ||
    priorityFilter !== 'all'
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
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
      if (statusFilter !== 'all') {
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
    const [projectRes, peopleRes, memberRes, commentRes, subtaskRes] = await Promise.all([
      supabase.from('projects').select('*, creator:created_by(name,avatar_url)').neq('status', 'archived').neq('status', 'deleted').order('created_at', { ascending: false }),
      supabase.from('users').select('id,name,department_id,avatar_url,departments(name)').eq('is_active', true).order('name'),
      supabase.from('project_members').select('project_id,user_id,workflow_role'),
      supabase.from('project_comments').select('project_id'),
      supabase.from('project_subtasks').select('project_id,assignee_id').neq('status', 'deleted')
    ]);
    if (token !== loadRequest.current) return;
    if (projectRes.error) return toast.error('Không thể tải Project');
    setProjects(projectRes.data || []); setPeople((peopleRes.data as any) || []);
    setSelected(current => current ? (projectRes.data || []).find(p => p.id === current.id) || null : null);
    setMembers((memberRes.data || []).reduce((acc: Record<string, string[]>, item: any) => ({ ...acc, [item.project_id]: [...(acc[item.project_id] || []), String(item.user_id)] }), {}));
    setPicMembers((memberRes.data || []).filter(item => item.workflow_role === 'pic').reduce((acc: Record<string, string[]>, item: any) => ({ ...acc, [item.project_id]: [...(acc[item.project_id] || []), String(item.user_id)] }), {}));
    
    const commentsMap: Record<string, boolean> = {};
    (commentRes.data || []).forEach(c => commentsMap[c.project_id] = true);
    setHasComments(commentsMap);
    const { data: campaignData } = await supabase.from('campaigns').select('*,lead:lead_id(name,avatar_url),creator:created_by(name,avatar_url)').neq('status', 'archived').neq('status', 'deleted').order('name');
    if (token !== loadRequest.current) return;
    setCampaigns(campaignData || []);
    setSelectedCampaign((current: any) => current ? (campaignData || []).find(c => c.id === current.id) || null : null);
    const { data: creationDetails } = await supabase.from('activity_log').select('entity_id,metadata').eq('entity_type', 'project').eq('action', 'creation_details');
    if (token !== loadRequest.current) return;
    setProjectPrimaryOwners(Object.fromEntries((creationDetails || []).map(row => [row.entity_id, row.metadata?.primary_owner_id])));

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
  }, [profile?.id, profile?.department_id]);
  useWorkspaceRealtime(['projects', 'campaigns', 'tasks', 'project_subtasks', 'campaign_subtasks', 'project_members', 'campaign_members', 'project_comments', 'activity_log', 'workflow_phases', 'workflow_phase_members'], () => { void load(); setRefreshDetailTrigger(v => v + 1); }, profile?.id);

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
  }, [selected, refreshDetailTrigger]);
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
  }, [selectedCampaign, refreshDetailTrigger]);
  useEffect(() => {
    setSourceTask(null); setSelectedSubtask(null);
    setSubtasks([]); setCampaignSubtasks([]); setComments([]); setCampaignComments([]);
    setEditMode(false); setCampaignEditMode(false); setShowSubtaskForm(false); setShowCampaignSubtaskForm(false);
  }, [selected?.id, selectedCampaign?.id, profile?.id]);
  
  
  const notifyStakeholders = async (type: 'project' | 'campaign', entityId: string, actionMsg: string, singleUserId?: string | number) => {
    if (!profile) return;
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
    window.dispatchEvent(new Event('workspace:changed'));
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
        const { error: notificationError } = await supabase.from('notifications').insert({ user_id: campaign.lead_id, type: 'system', message: profile.name + ' đã giao chiến dịch: ' + campaign.name, entity_type: 'campaign', entity_id: campaign.id });
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
        if (!memberError) {
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
    if (!title || !selected) return;
    const { data, error } = await supabase.from('projects').update({ name: title, description, start_date: parseYMD(start), due_date: parseYMD(due), priority }).eq('id', selected.id).select().single();
    if (error || !data) return toast.error('Lỗi cập nhật');
    const { error: picError } = await supabase.rpc('workflow_set_parent_pics', { p_kind: 'project', p_parent: data.id, p_ids: ownerIds.map(Number) });
    if (picError) { toast.error(picError.message); return; }
    setEditMode(false); load(); toast.success('Đã lưu thông tin');
    await notifyStakeholders('project', selected.id, 'đã cập nhật thông tin dự án: ' + title);
    setSelected({ ...selected, name: title, description, start_date: parseYMD(start), due_date: parseYMD(due), priority });
  };

  
  
  const executeHideProject = async () => {
    if (!projectToHide) return;
    const { error } = await supabase.from('projects').update({ status: 'archived' }).eq('id', projectToHide.id);
    if (error) {
      toast.error('Không thể ẩn Project');
    } else {
      if (selected?.id === projectToHide.id) setSelected(null);
      await load();
      toast.success('Đã ẩn Project');
    }
    setProjectToHide(null);
  };

  const archiveProject = (project: Project) => {
    setProjectToHide(project);
  };


  
  const executeRemoveProject = async () => {
    if (!projectToDelete) return;
    const { error } = await supabase.from('projects').update({ status: 'deleted' }).eq('id', projectToDelete.id);
    if (!error) {
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
    setNewSubtask(''); setSubtaskOwner(''); setSubtaskDue(''); setSelected({ ...selected });
    window.dispatchEvent(new Event('workspace:changed'));
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
    toast.success('Đã hoàn thành subtask');
  };
  const addComment = async () => {
    if (!selected || !comment.trim()) return;
    const body = comment.trim();
    const { error } = await supabase.from('project_comments').insert({ project_id: selected.id, author_id: profile?.id || 11, body });
    if (error) return toast.error('Không thể gửi bình luận');
    const mentionedUsers = people.filter(person => person.id !== profile?.id && body.toLowerCase().includes(`@${person.name.replace(/\s+/g, '').toLowerCase()}`));
    if (mentionedUsers.length) await supabase.from('notifications').insert(mentionedUsers.map(person => ({ user_id: person.id, type: 'system', message: `${profile?.name || 'Một thành viên'} đã nhắc bạn trong dự án: ${selected.name}`, entity_type: 'project', entity_id: selected.id })));
    await notifyStakeholders('project', selected.id, 'đã bình luận trong dự án: ' + selected.name);
    setComment(''); setSelected({ ...selected });
  };
  const addCampaignSubtask = async () => { if (!selectedCampaign || !campaignNewSubtask.trim()) return; const { error } = await supabase.from('campaign_subtasks').insert({ campaign_id: selectedCampaign.id, title: campaignNewSubtask.trim(), assignee_id: campaignSubtaskOwner ? Number(campaignSubtaskOwner) : null, due_date: parseYMD(campaignSubtaskDue) });
  if (!error && campaignSubtaskOwner) await notifyStakeholders('campaign', selectedCampaign.id, 'đã giao subtask mới cho bạn: ' + campaignNewSubtask.trim(), campaignSubtaskOwner); if (error) return toast.error('Không thể tạo Subtask Campaign'); setCampaignNewSubtask(''); setCampaignSubtaskOwner(''); setCampaignSubtaskDue(''); setShowCampaignSubtaskForm(false); setSelectedCampaign({ ...selectedCampaign }); 
    supabase.from('campaign_subtasks').select('*, assignee:assignee_id(name,avatar_url)').eq('campaign_id', selectedCampaign.id).order('created_at').then(res => setCampaignSubtasks(res.data || [])); };
  const addCampaignComment = async () => { if (!selectedCampaign || !campaignComment.trim() || !profile?.id) return; const { error } = await supabase.from('activity_log').insert({ workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca', user_id: profile.id, action: 'comment', entity_type: 'campaign', entity_id: selectedCampaign.id, metadata: { body: campaignComment.trim() } }); if (error) return toast.error('Không thể gửi bình luận'); await notifyStakeholders('campaign', selectedCampaign.id, 'đã bình luận trong chiến dịch: ' + selectedCampaign.name); setCampaignComment(''); setSelectedCampaign({ ...selectedCampaign }); 
    supabase.from('activity_log').select('*, user:user_id(name,avatar_url)').eq('entity_type', 'campaign').eq('entity_id', selectedCampaign.id).eq('action', 'comment').order('created_at').then(res => setCampaignComments(res.data || [])); };
  const completeCampaign = async () => { if (!selectedCampaign) return; const { error } = await supabase.from('campaigns').update({ status: 'completed' }).eq('id', selectedCampaign.id); if (error) return toast.error('Không thể hoàn thành Campaign'); const updated = { ...selectedCampaign, status: 'completed' }; setSelectedCampaign(updated); window.dispatchEvent(new Event('campaigns:changed')); toast.success('Đã hoàn thành Campaign');
    await notifyStakeholders('campaign', selectedCampaign.id, 'đã đánh dấu hoàn thành chiến dịch: ' + selectedCampaign.name); };
  const saveCampaignEdit = async () => { if (!selectedCampaign || !title.trim()) return; const { data, error } = await supabase.from('campaigns').update({ name: title.trim(), objective: campaignObjective || null, start_date: parseYMD(start), end_date: parseYMD(due), budget: campaignBudget ? Number(campaignBudget) : null, lead_id: primaryOwnerId ? Number(primaryOwnerId) : null }).eq('id', selectedCampaign.id).select('*, lead:lead_id(name,avatar_url), creator:created_by(name,avatar_url)').single(); if (error || !data) return toast.error('Không thể cập nhật Campaign'); setSelectedCampaign(data); setCampaignEditMode(false); window.dispatchEvent(new Event('campaigns:changed')); toast.success('Đã lưu Campaign');
    await notifyStakeholders('campaign', selectedCampaign.id, 'đã cập nhật thông tin chiến dịch: ' + title); };
  return (
  <div style={{ '--panel-width': `${width}px` } as React.CSSProperties} className="relative flex min-h-full">
    {/* Mobile/Tablet Backdrop when Detail Drawer is open */}
    {panelOpen && (
      <div 
        className="fixed inset-0 bg-slate-900/30 dark:bg-slate-900/60 z-[55] xl:hidden backdrop-blur-xs transition-opacity"
        onClick={() => { setSelected(null); setSelectedCampaign(null); }}
      />
    )}

    {/* Left Side: Projects List */}
    <div className={`flex min-w-0 flex-1 flex-col p-1 transition-all duration-300 ${panelOpen ? 'hidden md:flex xl:mr-[calc(var(--panel-width)+16px)] pr-2' : 'pr-1'}`}>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 py-2 sm:py-2.5 mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2 leading-none">
            <FolderKanban className="text-primary"/> {t('projects.title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1.5">{t('projects.subtitle')}</p>
        </div>

        {/* Function Toolbar: Search, Status, PIC, Calendar, Priority, Clear Filters, Add New */}
        <div ref={toolbarRef} className="flex flex-wrap items-center gap-2">
          {/* 1. Search */}
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t('projects.searchPlaceholder')}
              className="h-9 pl-8 pr-7 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all w-36 sm:w-48 focus:w-60 shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* 2. Status Filter Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
              className={`h-9 px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                statusFilter !== 'all'
                  ? 'border-primary/40 bg-primary/10 text-primary dark:bg-primary/20 dark:border-primary/50 dark:text-blue-400 font-semibold'
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/60'
              }`}
            >
              <CheckCircle2 size={13} className={statusFilter !== 'all' ? 'text-primary dark:text-blue-400' : 'text-gray-400'} />
              <span>
                {statusFilter === 'all'
                  ? t('projects.filterStatus')
                  : statusFilter === 'in_progress'
                  ? t('projects.statusInProgress')
                  : statusFilter === 'planning'
                  ? t('projects.statusPlanning')
                  : statusFilter === 'completed'
                  ? t('projects.statusCompleted')
                  : statusFilter === 'draft'
                  ? t('projects.statusDraft')
                  : t('projects.statusOnHold')}
              </span>
              <ChevronDown size={12} className={`text-gray-400 transition-transform ${activeDropdown === 'status' ? 'rotate-180' : ''}`} />
            </button>
            {activeDropdown === 'status' && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {t('projects.filterStatus')}
                </div>
                {[
                  { key: 'all', label: t('projects.allStatuses'), dot: 'bg-gray-400' },
                  { key: 'planning', label: t('projects.statusPlanning'), dot: 'bg-amber-400' },
                  { key: 'in_progress', label: t('projects.statusInProgress'), dot: 'bg-sky-400' },
                  { key: 'completed', label: t('projects.statusCompleted'), dot: 'bg-emerald-500' },
                  { key: 'draft', label: t('projects.statusDraft'), dot: 'bg-slate-400' },
                  { key: 'on_hold', label: t('projects.statusOnHold'), dot: 'bg-rose-400' }
                ].map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => { setStatusFilter(opt.key); setActiveDropdown(null); }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ${
                      statusFilter === opt.key ? 'font-bold text-primary dark:text-blue-400 bg-primary/5 dark:bg-primary/10' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                      <span>{opt.label}</span>
                    </span>
                    {statusFilter === opt.key && <CheckCircle2 size={12} className="text-primary dark:text-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. PIC Filter Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setActiveDropdown(activeDropdown === 'pic' ? null : 'pic'); setPicSearchQuery(''); }}
              className={`h-9 px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                picFilter !== 'all'
                  ? 'border-primary/40 bg-primary/10 text-primary dark:bg-primary/20 dark:border-primary/50 dark:text-blue-400 font-semibold'
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/60'
              }`}
            >
              <Users size={13} className={picFilter !== 'all' ? 'text-primary dark:text-blue-400' : 'text-gray-400'} />
              <span className="max-w-[110px] truncate">
                {picFilter === 'all'
                  ? t('projects.filterPic')
                  : picFilter === 'me'
                  ? t('projects.picAssignedToMe')
                  : picFilter === 'unassigned'
                  ? t('projects.picUnassigned')
                  : people.find(p => String(p.id) === picFilter)?.name || t('projects.filterPic')}
              </span>
              <ChevronDown size={12} className={`text-gray-400 transition-transform ${activeDropdown === 'pic' ? 'rotate-180' : ''}`} />
            </button>
            {activeDropdown === 'pic' && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-80">
                <div className="px-1 pb-2">
                  <input
                    type="text"
                    value={picSearchQuery}
                    onChange={e => setPicSearchQuery(e.target.value)}
                    placeholder={t('projects.searchPic')}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto custom-scrollbar flex-1 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => { setPicFilter('all'); setActiveDropdown(null); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ${
                      picFilter === 'all' ? 'font-bold text-primary dark:text-blue-400 bg-primary/5 dark:bg-primary/10' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>{t('projects.allPics')}</span>
                    {picFilter === 'all' && <CheckCircle2 size={12} className="text-primary dark:text-blue-400" />}
                  </button>
                  {profile?.id && (
                    <button
                      type="button"
                      onClick={() => { setPicFilter('me'); setActiveDropdown(null); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ${
                        picFilter === 'me' ? 'font-bold text-primary dark:text-blue-400 bg-primary/5 dark:bg-primary/10' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar name={profile.name || 'Me'} src={profile.avatar_url || undefined} className="w-5 h-5 text-[9px]" />
                        <span>{t('projects.picAssignedToMe')} ({profile.name})</span>
                      </div>
                      {picFilter === 'me' && <CheckCircle2 size={12} className="text-primary dark:text-blue-400" />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setPicFilter('unassigned'); setActiveDropdown(null); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ${
                      picFilter === 'unassigned' ? 'font-bold text-primary dark:text-blue-400 bg-primary/5 dark:bg-primary/10' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>{t('projects.picUnassigned')}</span>
                    {picFilter === 'unassigned' && <CheckCircle2 size={12} className="text-primary dark:text-blue-400" />}
                  </button>
                  <div className="h-px bg-gray-100 dark:bg-slate-700 my-1" />
                  {people
                    .filter(p => p.name.toLowerCase().includes(picSearchQuery.toLowerCase()))
                    .map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setPicFilter(String(p.id)); setActiveDropdown(null); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ${
                          picFilter === String(p.id) ? 'font-bold text-primary dark:text-blue-400 bg-primary/5 dark:bg-primary/10' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar name={p.name} src={(p as any).avatar_url} className="w-5 h-5 text-[9px] shrink-0" />
                          <span className="truncate">{p.name}</span>
                          {p.departments?.name && (
                            <span className="text-[10px] text-gray-400 truncate">({p.departments.name})</span>
                          )}
                        </div>
                        {picFilter === String(p.id) && <CheckCircle2 size={12} className="text-primary dark:text-blue-400 shrink-0" />}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Calendar Filter Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'calendar' ? null : 'calendar')}
              className={`h-9 px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                calendarFilter !== 'all' || customStartDate || customEndDate
                  ? 'border-primary/40 bg-primary/10 text-primary dark:bg-primary/20 dark:border-primary/50 dark:text-blue-400 font-semibold'
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/60'
              }`}
            >
              <Calendar size={13} className={calendarFilter !== 'all' || customStartDate || customEndDate ? 'text-primary dark:text-blue-400' : 'text-gray-400'} />
              <span className="max-w-[120px] truncate">
                {customStartDate || customEndDate
                  ? `${customStartDate ? strictFormatVN(customStartDate) : '...'} - ${customEndDate ? strictFormatVN(customEndDate) : '...'}`
                  : calendarFilter === 'all'
                  ? t('projects.filterCalendar')
                  : calendarFilter === 'ongoing'
                  ? t('projects.dateOngoing')
                  : calendarFilter === 'this_week'
                  ? t('projects.dateThisWeek')
                  : calendarFilter === 'this_month'
                  ? t('projects.dateThisMonth')
                  : calendarFilter === 'due_soon'
                  ? t('projects.dateDueSoon')
                  : t('projects.dateOverdue')}
              </span>
              <ChevronDown size={12} className={`text-gray-400 transition-transform ${activeDropdown === 'calendar' ? 'rotate-180' : ''}`} />
            </button>
            {activeDropdown === 'calendar' && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2.5 animate-in fade-in zoom-in-95 duration-150 space-y-2">
                <div className="px-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {t('projects.filterCalendar')}
                </div>
                <div className="space-y-0.5">
                  {[
                    { key: 'all', label: t('projects.allDates') },
                    { key: 'ongoing', label: t('projects.dateOngoing') },
                    { key: 'this_week', label: t('projects.dateThisWeek') },
                    { key: 'this_month', label: t('projects.dateThisMonth') },
                    { key: 'due_soon', label: t('projects.dateDueSoon') },
                    { key: 'overdue', label: t('projects.dateOverdue') }
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => { setCalendarFilter(opt.key); setCustomStartDate(''); setCustomEndDate(''); setActiveDropdown(null); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ${
                        calendarFilter === opt.key && !customStartDate && !customEndDate
                          ? 'font-bold text-primary dark:text-blue-400 bg-primary/5 dark:bg-primary/10'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {calendarFilter === opt.key && !customStartDate && !customEndDate && <CheckCircle2 size={12} className="text-primary dark:text-blue-400" />}
                    </button>
                  ))}
                </div>
                <div className="h-px bg-gray-100 dark:bg-slate-700 my-1.5" />
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block px-1">
                    {t('projects.dateCustom')}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">{t('projects.startDate')}</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={e => { setCustomStartDate(e.target.value); setCalendarFilter('custom'); }}
                        className="w-full p-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">{t('projects.endDate')}</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={e => { setCustomEndDate(e.target.value); setCalendarFilter('custom'); }}
                        className="w-full p-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. Priority Filter Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'priority' ? null : 'priority')}
              className={`h-9 px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                priorityFilter !== 'all'
                  ? 'border-primary/40 bg-primary/10 text-primary dark:bg-primary/20 dark:border-primary/50 dark:text-blue-400 font-semibold'
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/60'
              }`}
            >
              <ArrowUpDown size={13} className={priorityFilter !== 'all' ? 'text-primary dark:text-blue-400' : 'text-gray-400'} />
              <span>
                {priorityFilter === 'all'
                  ? t('projects.filterPriority')
                  : priorityFilter === 'urgent'
                  ? t('projects.priorityUrgent')
                  : priorityFilter === 'high'
                  ? t('projects.priorityHigh')
                  : priorityFilter === 'medium'
                  ? t('projects.priorityMedium')
                  : t('projects.priorityLow')}
              </span>
              <ChevronDown size={12} className={`text-gray-400 transition-transform ${activeDropdown === 'priority' ? 'rotate-180' : ''}`} />
            </button>
            {activeDropdown === 'priority' && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {t('projects.filterPriority')}
                </div>
                {[
                  { key: 'all', label: t('projects.allPriorities'), dot: 'bg-gray-400' },
                  { key: 'urgent', label: t('projects.priorityUrgent'), dot: 'bg-red-500' },
                  { key: 'high', label: t('projects.priorityHigh'), dot: 'bg-rose-500' },
                  { key: 'medium', label: t('projects.priorityMedium'), dot: 'bg-amber-400' },
                  { key: 'low', label: t('projects.priorityLow'), dot: 'bg-blue-400' }
                ].map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => { setPriorityFilter(opt.key); setActiveDropdown(null); }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ${
                      priorityFilter === opt.key ? 'font-bold text-primary dark:text-blue-400 bg-primary/5 dark:bg-primary/10' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                      <span>{opt.label}</span>
                    </span>
                    {priorityFilter === opt.key && <CheckCircle2 size={12} className="text-primary dark:text-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 6. Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              title={t('projects.clearFilters')}
              className="h-9 px-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
            >
              <X size={12} />
              <span className="hidden sm:inline">{t('projects.clearFilters')}</span>
            </button>
          )}

          {/* 7. Add New Button */}
          {canCreate && (
            <button 
              onClick={() => { resetCreateForm(); setCreationType('project'); setSelected(null); setSelectedCampaign(null); setCreateOpen(true); }} 
              className="btn-add-new h-9 flex items-center gap-1.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer ml-1"
            >
              <FolderKanban className="w-4 h-4" />
              <span>{t('projects.add')}</span>
            </button>
          )}
        </div>
      </div>
      
      <div className="space-y-6 pb-20 pr-1">
        <CampaignPanel onSelect={(campaign) => { setSelected(null); setCreateOpen(false); setSelectedCampaign(campaign); }} filters={campaignFilters} /><section className="card-hub rounded-2xl overflow-hidden shrink-0"><div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700"><button onClick={() => setProjectsExpanded(value => !value)} aria-expanded={projectsExpanded} className="inline-flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white"><ChevronDown className={`text-gray-500 transition-transform ${projectsExpanded ? '' : '-rotate-90'}`} size={17}/><FolderKanban className="text-violet-500" size={16}/> {t('projects.projectsAccordion')} <span className="rounded-full bg-violet-100 dark:bg-violet-500/20 px-2 py-0.5 text-xs font-bold text-violet-600 dark:text-violet-400">{visibleProjects.length}</span></button></div>{projectsExpanded && <><div className="space-y-3 p-3 md:hidden">{visibleProjects.map(project => {
  return <article key={project.id} className={`min-w-0 rounded-xl border border-gray-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/50 ${deletingIds.includes(project.id) ? 'animate-fade-out' : ''}`}>
    <button type="button" onClick={() => { setSelectedCampaign(null); setCreateOpen(false); setSelected(project); }} className="block w-full min-w-0 text-left">
      <span className="flex min-w-0 items-center gap-1 text-sm font-bold leading-5 text-gray-900 dark:text-white"><span className="min-w-0 flex-1 truncate">{project.name}</span>{hasComments[project.id] && <MessageSquare size={14} className="shrink-0 text-blue-500" />}<ChevronRight size={15} className="shrink-0 text-gray-400" /></span>
      <span className="mt-1 block truncate text-xs text-gray-500 dark:text-slate-400">{project.description || t('tasks.noDescription')}</span>
    </button>
    <div className="mt-2 flex min-w-0 items-center gap-2 text-[11px] text-gray-500 dark:text-slate-400">
      <StatusBadge status={project.status || 'active'} />
      <span className="min-w-0 truncate">{project.due_date ? `${t('common.due')} ${dateValue(project.due_date)}` : t('common.noDueDate')}</span>
      {project.due_date && getDueStatusLabel(project.due_date, project.status, lang === 'en')}
      {canCreate && <div className="ml-auto flex shrink-0 items-center gap-1"><button type="button" onClick={() => void archiveProject(project)} className="rounded-lg p-1.5 text-amber-600" aria-label={`${t('common.hide')} ${project.name}`}><EyeOff size={15} /></button><button type="button" onClick={() => void removeProject(project)} className="rounded-lg p-1.5 text-red-500" aria-label={`${t('common.delete')} ${project.name}`}><Trash2 size={15} /></button></div>}
    </div>
  </article>;
})}{visibleProjects.length === 0 && <p className="p-6 text-center text-sm text-gray-500">{projects.length > 0 ? (lang === 'en' ? 'No projects match current filters.' : 'Không có dự án phù hợp bộ lọc.') : t('projects.noProjects')}</p>}</div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-max text-left"><thead className="bg-gray-50 dark:bg-slate-800 text-xs uppercase tracking-wide text-gray-500"><tr><th className="p-4">{t('projects.col.project')}</th><th>{t('projects.col.owner')}</th><th>{t('projects.col.dates')}</th><th>{t('projects.col.priority')}</th><th>{t('projects.col.status')}</th><th className="w-12"/></tr></thead><tbody>{visibleProjects.map(project => <tr key={project.id} onClick={() => { setSelectedCampaign(null); setCreateOpen(false); setSelected(project); }} className={`group border-t border-gray-100 dark:border-slate-800 cursor-pointer hover-row-effect hover-row-project hover:bg-primary/5 transition-all duration-300 ${deletingIds.includes(project.id) ? "animate-fade-out" : ""}`}>
<td className="p-4">
  <div className="flex items-center gap-2">
    <b className="block max-w-[400px] truncate text-gray-900 dark:text-white">{project.name}</b>
    {hasComments[project.id] && <span title="Có bình luận" className="relative inline-flex"><MessageSquare size={14} className="text-blue-500" />{Number(project.lead_id) === Number(profile?.id) && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm"></span>}</span>}
  </div>
  <p className="text-xs text-gray-500 truncate max-w-[250px] md:max-w-[400px] lg:max-w-[500px] mt-1">{project.description || t('tasks.noDescription')}</p>
</td>
<td>
  <div className="flex items-center gap-2">
    <div className="flex -space-x-2">
      {(picMembers[project.id] || []).slice(0,4).map(id => { const p = people.find(p=>String(p.id)===id); return <Avatar key={'o'+id} name={p?.name || '?'} src={(p as any)?.avatar_url || undefined} className="w-7 h-7 text-[10px] border-2 border-white dark:border-slate-900 shadow-sm z-10" /> })}
    </div>
    {subtaskMembers[project.id] && subtaskMembers[project.id].length > 0 && (
      <>
        <span className="text-gray-300 dark:text-gray-600 px-1">|</span>
        <div className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 rounded-full border border-violet-100 dark:border-violet-800">
          <span className="text-[9px] font-bold text-violet-700 dark:text-violet-400">SUB</span>
          <div className="flex -space-x-2">
            {subtaskMembers[project.id].slice(0,4).map(id => { const p = people.find(p=>String(p.id)===id); return <Avatar key={'s'+id} name={(p?.name || 'Unknown') + ' (Subtask)'} src={(p as any)?.avatar_url || undefined} className="w-6 h-6 text-[9px] border-2 border-white dark:border-slate-900 shadow-sm z-10 opacity-90" /> })}
          </div>
        </div>
      </>
    )}
  </div>
</td>
<td className="text-sm text-gray-600 dark:text-gray-300"><div className="flex items-center gap-2"><span>{dateValue(project.start_date || '')} – {dateValue(project.due_date || '')}</span>{project.due_date && <div className="flex items-center gap-1.5"><div className={`w-3.5 h-3.5 rounded-full border-[2.5px] ${getDueStatusColor(project.due_date, project.status)}`} title={`${t('common.dueDate')}: ${dateValue(project.due_date)}`} />{getDueStatusLabel(project.due_date, project.status, lang === 'en')}</div>}</div></td>
<td><span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${priorityClass(project.priority || 'medium')}`}>{project.priority || 'medium'}</span></td>
<td><StatusBadge status={project.status || 'active'} /></td>
<td className="w-16 pr-4">{canCreate && <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); void archiveProject(project); }} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title={t('common.hide')}><EyeOff size={16}/></button><button onClick={(e) => { e.stopPropagation(); void removeProject(project); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={t('common.delete')}><Trash2 size={16}/></button></div>}</td>
</tr>)}</tbody></table>{!visibleProjects.length && <div className="p-12 text-center text-gray-500">{projects.length > 0 ? (lang === 'en' ? 'No projects match current filters.' : 'Không có dự án phù hợp bộ lọc.') : t('projects.noProjects')}</div>}</div></>}</section>
  
  
    </div></div>

    {sourceTask && <TaskDetailPanel task={workflow.tasks.find(task => task.id === sourceTask.id) || sourceTask} isOpen onClose={() => setSourceTask(null)} onTaskUpdated={() => void workflow.refresh()} />}

    {/* Right Side: Detail Panel */}
    <div style={{ '--panel-width': `${width}px` } as React.CSSProperties} className={`dashboard-detail-drawer bg-white dark:bg-slate-800 shrink-0 ${panelOpen ? 'w-full max-w-full md:max-w-[calc(100vw-32px)] md:w-[var(--panel-width)] xl:max-w-[min(var(--panel-width),50vw)] opacity-100 pointer-events-auto ' + (selectedCampaign ? 'shadow-drawer-campaign' : 'shadow-drawer-project') : 'w-0 min-w-0 shadow-none border-0 opacity-0 pointer-events-none'} z-[60] ${!resizing ? 'transition-[width,opacity] duration-300 ease-out' : ''}`}>
      {panelOpen && <div onMouseDown={() => setResizing(true)} className="hidden md:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />}
      {selected && (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
            <h3 className="font-bold text-xl text-gray-900 dark:text-white line-clamp-1">{selected.name}</h3>
            <button onClick={() => { setSelected(null); setParams({}, { replace: true }); }} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
            {editMode ? (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">{t('projects.nameLabel')}</label>
                  <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold outline-none mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.startDate')}</label><input type="date" value={start} onChange={e=>setStart(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"/></div>
                   <div><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.endDate')}</label><input type="date" value={due} onChange={e=>setDue(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"/></div>
                </div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.priority')}</label><select value={priority} onChange={e=>setPriority(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"><option value="low">{t('common.low')}</option><option value="medium">{t('common.medium')}</option><option value="high">{t('common.high')}</option><option value="urgent">{t('common.urgent')}</option></select></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.owner')}</label><MultiSelect options={visiblePeople.map(p => ({ value: String(p.id), label: p.name + (p.departments?.name ? ' ('+p.departments.name+')' : '') }))} value={ownerIds} onChange={setOwnerIds} placeholder={t('common.selectPic') + '...'} /></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.description')}</label><textarea value={description} onChange={e=>setDescription(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none min-h-24 mt-1 text-sm" placeholder={t('tasks.descPlaceholder')}/></div>
                <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <button onClick={() => setEditMode(false)} className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">{t('common.cancel')}</button>
                  <button onClick={saveInlineEdit} className="px-5 py-2.5 bg-[#002e6d] text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-[#002150] transition-colors">{t('common.save')}</button>
                </div>
              </div>
            ) : (
<div className="space-y-7 animate-in fade-in duration-200">
              <div className="flex gap-2"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800">{t('projects.projects')}</span><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 capitalize">{selected?.priority || 'medium'} {t('common.priority').toLowerCase()}</span><StatusBadge status={selected.status}/></div>
      <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 text-sm"><div><p className="text-[10px] uppercase text-gray-400 mb-1">{t('common.owner')}</p><div className="mt-1 flex flex-wrap gap-1">{(picMembers[selected?.id || ''] || []).length > 0 ? (picMembers[selected?.id || ''] || []).map(id => { const p = people.find(p=>String(p.id)===id); return p ? <div key={id} className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 rounded-full pr-3 pl-1 py-1"><Avatar name={p.name} src={(p as any).avatar_url || undefined} className="w-5 h-5 text-[10px]" /><span className="text-xs font-semibold">{p.name}{Number(id) === Number(projectPrimaryOwners[selected.id]) && <span className="ml-1 text-primary">· {t('common.primary')}</span>}</span></div> : null }) : t('common.unassigned')}</div></div><div><p className="text-[10px] uppercase text-gray-400 mb-1">{t('common.timeline')}</p><div className="mt-1 flex items-center gap-1.5 flex-wrap text-sm"><span className="font-normal text-gray-700 dark:text-gray-300">{dateValue(selected?.start_date || '')}</span><span className="text-gray-400">–</span><span className="font-bold text-red-600 dark:text-red-400">{dateValue(selected?.due_date || '')}</span></div></div><div><p className="text-[10px] uppercase text-gray-400">{t('common.creator')}</p><div className="mt-1 font-semibold flex items-center gap-2"><Avatar name={(selected as any)?.creator?.name || '---'} src={(selected as any)?.creator?.avatar_url} className="w-5 h-5 text-[10px] shadow-sm" /> <span className="line-clamp-1">{(selected as any)?.creator?.name || '---'}</span></div></div></div>
      <WorkflowTrackingSummary kind="project" id={selected.id} hub={workflow} onOpenTask={setSourceTask} /><section><h3 className="font-bold text-sm mb-2">{t('common.description')}</h3><div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 text-sm text-gray-600 dark:text-gray-300">{selected?.description || t('tasks.noDescription')}</div></section>
      <section><h3 className="font-bold text-sm flex gap-2 items-center mb-3"><Users size={16}/> {t('projects.subtasks')}</h3><div className="space-y-2">{subtasks.map(s=>(
  <div key={s.id} onClick={() => setSelectedSubtask(s)} className={`p-3 rounded-xl border text-sm group relative transition-all ${(s.status || '').toLowerCase() === 'completed' ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20' : 'bg-slate-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700'} ${recentlyCompletedSubtaskId === s.id ? 'subtask-complete-pulse' : ''} ${(Number(s.assignee_id) === Number(profile?.id) || canCreate) ? 'cursor-pointer hover-row-effect hover:border-transparent' : ''}`}>
    {editingSubtaskId === s.id ? (
      <div className="space-y-2" onClick={event => event.stopPropagation()}>
         <input value={editSubtaskTitle} onChange={e=>setEditSubtaskTitle(e.target.value)} className="w-full p-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none rounded-lg" />
         <div className="grid grid-cols-2 gap-2">
           <select value={editSubtaskOwner} onChange={e=>setEditSubtaskOwner(e.target.value)} className="p-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none rounded-lg"><option value="">{t('common.selectPic')}</option>{visiblePeople.map(p=><option key={p.id} value={p.id}>{p.name} {p.departments?.name ? '('+p.departments.name+')' : ''}</option>)}</select>
           <div className="tw-calendar-picker relative w-full"><input type="text" id={`edit-subtask-due-${s.id}`} readOnly onClick={(e) => { if ((window as any).openCalendar) (window as any).openCalendar({ displayId: `edit-subtask-due-${s.id}`, mode: 'single' }, e); }} value={editSubtaskDue} onChange={(e) => setEditSubtaskDue(e.target.value)} placeholder="dd/mm/yyyy" className="p-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none rounded-lg w-full cursor-pointer" /></div>
         </div>
         <div className="flex gap-2 justify-end">
           <button onClick={()=>setEditingSubtaskId(null)} className="text-xs text-gray-500 hover:text-gray-700">{t('common.cancel')}</button>
           <button onClick={()=>saveEditedSubtask(s.id)} className="text-xs text-primary font-bold">{t('common.save')}</button>
         </div>
      </div>
    ) : (
      <div className="flex justify-between items-center w-full">
  <div className="flex items-center gap-3 flex-1">
    <div className="flex-1">
      <div className="flex items-center gap-2"><b className={`text-gray-900 dark:text-white block ${['done', 'complete', 'completed'].includes((s.status || '').toLowerCase()) ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>{s.title}</b>{subtaskCommentCounts[s.id] > 0 && <span title={`${subtaskCommentCounts[s.id]} ${t('common.comment').toLowerCase()}`} className="inline-flex items-center gap-1 text-xs text-primary"><span className="relative inline-flex"><MessageSquare size={13}/>{Number(s.assignee_id) === Number(profile?.id) && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm border border-white dark:border-slate-900"></span>}</span>{subtaskCommentCounts[s.id]}</span>}</div>
      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
         <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-md text-gray-700 dark:text-gray-300 font-medium">
           {s.assignee ? (
             <>
               <Avatar name={s.assignee.name} src={s.assignee.avatar_url || undefined} className="w-4 h-4 text-[9px]" />
               {s.assignee.name}
             </>
           ) : t('common.unassigned')}
         </span>
         {s.due_date && <span className="flex items-center gap-1 font-bold text-red-600 dark:text-red-400"><Calendar size={12}/> {dateValue(s.due_date)}</span>}
      </div>
    </div>
  </div>
  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 shrink-0" onClick={event => event.stopPropagation()}>
          {Number(s.assignee_id) === Number(profile?.id) && !['done', 'complete', 'completed'].includes((s.status || '').toLowerCase()) && <button onClick={()=>void completeSubtask(s)} className="rounded-lg p-1.5 text-emerald-700 bg-emerald-100 hover:bg-emerald-200" title={t('common.complete')}><CheckCircle2 size={14}/></button>}
          {canCreate && <><button onClick={()=>{ setEditingSubtaskId(s.id); setEditSubtaskTitle(s.title); setEditSubtaskOwner(String(s.assignee_id || '')); setEditSubtaskDue(s.due_date ? dateValue(s.due_date) : ''); }} className="text-gray-400 hover:text-primary"><Edit3 size={14}/></button>
          <button onClick={()=>removeSubtask(s.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button></>}
        </div>
      </div>
    )}
  </div>
))}</div>{!showSubtaskForm && <button onClick={() => setShowSubtaskForm(true)} className="mt-3 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20 w-full text-center border-dashed"><Plus size={16} className="inline mr-1" /> {t('projects.addSubtask')}</button>}
{showSubtaskForm && <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3"><input value={newSubtask} onChange={e=>setNewSubtask(e.target.value)} placeholder={t('projects.subtaskPlaceholder')} className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"/><div className="grid grid-cols-2 gap-2"><select value={subtaskOwner} onChange={e=>setSubtaskOwner(e.target.value)} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"><option value="">{t('common.selectPic')}</option>{visiblePeople.map(p=><option key={p.id} value={p.id}>{p.name} {p.departments?.name ? '('+p.departments.name+')' : ''}</option>)}</select><div className="tw-calendar-picker relative w-full"><input type="text" id="subtask-due-input" readOnly onClick={(e) => { if ((window as any).openCalendar) (window as any).openCalendar({ displayId: 'subtask-due-input', mode: 'single' }, e); }} value={subtaskDue} onChange={(e) => setSubtaskDue(e.target.value)} placeholder="dd/mm/yyyy" className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm w-full cursor-pointer"/></div></div><div className="flex gap-2 justify-end"><button onClick={() => setShowSubtaskForm(false)} className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700">{t('common.cancel')}</button><button onClick={() => { addSubtask(); setShowSubtaskForm(false); }} className="px-3 py-1.5 bg-[#002e6d] text-white text-sm font-semibold rounded-lg shadow-sm">{t('common.add')}</button></div></div>}</section>
      <section><h3 className="font-bold text-sm flex gap-2 items-center mb-3"><MessageSquare size={16}/> {t('common.activityComments')}</h3><div className="space-y-3">{comments.map(c => {
        const mine = Number(c.author_id) === Number(profile?.id);
        return (
          <div key={c.id} className={`group flex ${mine ? 'justify-end' : 'justify-start'} items-end gap-2 animate-slide-up`}>
            {!mine && <Avatar name={c.author?.name || 'Member'} src={(c.author as any)?.avatar_url || undefined} className="w-7 h-7 text-[10px] shadow-sm shrink-0 mb-1" />}
            <div className={`flex max-w-[85%] items-end gap-1.5 ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`rounded-2xl px-3 py-2.5 text-sm shadow-sm flex flex-col ${mine ? 'rounded-br-md bg-[#002e6d] text-white items-end' : 'rounded-bl-md bg-slate-100 text-gray-800 dark:bg-slate-700 dark:text-slate-100 items-start'}`}>
                <p className={`mb-1 text-[11px] font-bold ${mine ? 'text-blue-100' : 'text-gray-500 dark:text-slate-300'}`}>{c.author?.name || 'Member'}</p>
                {editingCommentId === c.id ? (
                  <div>
                    <textarea value={editingCommentText} onChange={e=>setEditingCommentText(e.target.value)} className="w-full min-w-56 rounded-lg border border-blue-200 bg-white p-2 text-gray-900 outline-none" rows={2} />
                    <div className="mt-1 flex justify-end gap-2"><button onClick={() => setEditingCommentId(null)} className="text-xs">{t('common.cancel')}</button><button onClick={() => saveEditedComment(c.id)} className="text-xs font-bold">{t('common.save')}</button></div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{c.body}</p>
                )}
              </div>
              <div className="flex opacity-0 transition-opacity group-hover:opacity-100 pb-2">
                <button onClick={() => { setComment(value => `${value}${value && !value.endsWith(' ') ? ' ' : ''}@${(c.author?.name || 'Member').replace(/\s+/g, '')} `); window.setTimeout(() => projectCommentInput.current?.focus(), 0); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary dark:hover:bg-slate-700" title="Trả lời"><Reply size={14}/></button>
                {mine && <><button onClick={() => { setEditingCommentId(c.id); setEditingCommentText(c.body); }} className="rounded-lg p-1.5 text-gray-400 hover:text-primary"><Edit3 size={14}/></button><button onClick={() => removeComment(c.id)} className="rounded-lg p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14}/></button></>}
              </div>
            </div>
            {mine && <Avatar name={c.author?.name || 'Member'} src={(c.author as any)?.avatar_url || undefined} className="w-7 h-7 text-[10px] shadow-sm shrink-0 mb-1" />}
          </div>
        );
      })}</div><div className="mt-4 relative"><textarea ref={projectCommentInput} value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (e.nativeEvent.isComposing) return; if (comment.trim()) void addComment(); } }} rows={3} placeholder={t('common.commentPlaceholder')} className="w-full p-3 rounded-xl border border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm" />{projectMentionOptions.length > 0 && <div className="absolute bottom-full mb-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">{projectMentionOptions.map(person => <button key={person.id} onMouseDown={event => event.preventDefault()} onClick={() => chooseProjectMention(person)} className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-700"><b>{person.name}</b><span className="ml-2 text-xs text-gray-400">@{person.name.replace(/\s+/g, '')}</span></button>)}</div>}<div className="mt-2 flex justify-end"><button disabled={!comment.trim()} onClick={addComment} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-sm hover:bg-primary/90 transition-colors"><Send size={14} /> {t('common.sendComment')}</button></div></div></section>
            </div>
            )}
          </div>
          {!editMode && selectedRoot && (<div className="p-4 md:p-5 border-t border-gray-200 dark:border-slate-700 flex gap-3 shrink-0 bg-white dark:bg-slate-800" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}><button onClick={() => { setTitle(selected.name); setDescription(selected.description || ''); setStart(selected.start_date || ''); setDue(selected.due_date || ''); setPriority(selected.priority || 'medium'); setOwnerIds(picMembers[selected.id] || []); setEditMode(true); }} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"><Edit3 className="w-4 h-4" /> {t('common.edit')}</button><button onClick={completeProject} className="flex-1 px-4 py-2.5 bg-[#002e6d] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-colors"><CheckCircle2 className="w-4 h-4" /> {t('common.complete')}</button></div>)}
        </div>
      )}
      {selectedCampaign && (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
            <h3 className="font-bold text-xl text-gray-900 dark:text-white line-clamp-1">{selectedCampaign.name}</h3>
            <button onClick={() => { setSelectedCampaign(null); setParams({}, { replace: true }); }} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
          </div>
          <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
            {campaignEditMode ? <div className="space-y-5"><div><label className="text-xs font-semibold text-gray-500 uppercase">{t('projects.nameLabel')}</label><input value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold outline-none mt-1" /></div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.startDate')}</label><input type="date" value={start} onChange={e=>setStart(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"/></div><div><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.endDate')}</label><input type="date" value={due} onChange={e=>setDue(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"/></div></div><div><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.owner')}</label><select value={primaryOwnerId} onChange={e=>setPrimaryOwnerId(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"><option value="">{t('common.selectPic')}</option>{visiblePeople.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div><div><label className="text-xs font-semibold text-gray-500 uppercase">{t('projects.objectives')}</label><textarea value={campaignObjective} onChange={e=>setCampaignObjective(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none min-h-24 mt-1 text-sm" /></div><div><label className="text-xs font-semibold text-gray-500 uppercase">{t('projects.col.budget')}</label><input type="number" min="0" value={campaignBudget} onChange={e=>setCampaignBudget(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm" /></div><div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100 dark:border-slate-700"><button onClick={() => setCampaignEditMode(false)} className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 rounded-xl text-sm font-semibold">{t('common.cancel')}</button><button onClick={saveCampaignEdit} className="px-5 py-2.5 bg-[#002e6d] text-white rounded-xl text-sm font-semibold">{t('projects.saveChanges')}</button></div></div> : <div className="space-y-7"><div className="flex gap-2"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">{t('projects.campaigns')}</span><StatusBadge status={selectedCampaign.status || "planning"}/></div><div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 text-sm"><div><p className="text-[10px] uppercase text-gray-400">{t('common.owner')}</p><div className="mt-1 flex flex-wrap gap-2">{(workflow.tracks.find(track => track.entity_type === "campaign" && track.entity_id === selectedCampaign.id)?.pics || []).map(person => <span key={person.id} className="flex items-center gap-1.5 text-xs font-semibold"><Avatar name={person.name} src={person.avatar_url} className="w-5 h-5 text-[10px]"/>{person.name}</span>)}</div></div><div><p className="text-[10px] uppercase text-gray-400 mb-1">{t('common.timeline')}</p><div className="mt-1 flex items-center gap-1.5 flex-wrap text-sm"><span className="font-normal text-gray-700 dark:text-gray-300">{dateValue(selectedCampaign.start_date || '')}</span><span className="text-gray-400">–</span><span className="font-bold text-red-600 dark:text-red-400">{dateValue(selectedCampaign.end_date || '')}</span></div></div><div><p className="text-[10px] uppercase text-gray-400">{t('common.creator')}</p><div className="mt-1 font-semibold flex items-center gap-2"><Avatar name={(selectedCampaign as any)?.creator?.name || '---'} src={(selectedCampaign as any)?.creator?.avatar_url} className="w-5 h-5 text-[10px] shadow-sm" /> <span className="line-clamp-1">{(selectedCampaign as any)?.creator?.name || '---'}</span></div></div></div><WorkflowTrackingSummary kind="campaign" id={selectedCampaign.id} hub={workflow} onOpenTask={setSourceTask} /><section><h3 className="font-bold text-sm mb-2">{t('common.description')}</h3><div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 text-sm text-gray-600 dark:text-gray-300">{selectedCampaign.objective || t('tasks.noDescription')}</div></section>
<section><h3 className="font-bold text-sm flex gap-2 items-center mb-3"><Users size={16}/> {t('projects.subtasks')}</h3><div className="space-y-2">{campaignSubtasks.filter(subtask => subtask.status !== 'deleted').map(s => (
  <div key={s.id} className={`group p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border transition-all duration-300 text-sm cursor-pointer ${deletingIds.includes(s.id) ? "animate-fade-out" : ""} ${['done', 'complete', 'completed'].includes((s.status || '').toLowerCase()) ? 'border-emerald-400 dark:border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 bg-white/50 dark:bg-slate-900/50 dark:hover:border-slate-700'}`} onClick={() => setSelectedSubtask(s)}>
    {campaignEditingSubtaskId === s.id ? (
      <div className="space-y-3" onClick={e=>e.stopPropagation()}>
         <input value={campaignEditSubtaskTitle} onChange={e=>setCampaignEditSubtaskTitle(e.target.value)} className="w-full p-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none rounded-lg font-bold" />
         <div className="grid grid-cols-2 gap-2">
           <select value={campaignEditSubtaskOwner} onChange={e=>setCampaignEditSubtaskOwner(e.target.value)} className="p-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none rounded-lg"><option value="">{t('common.selectPic')}</option>{visiblePeople.map(p => <option key={p.id} value={p.id}>{p.name} {p.departments?.name ? '('+p.departments.name+')' : ''}</option>)}</select>
           <div className="tw-calendar-picker relative w-full"><input type="text" id={`edit-campaign-subtask-due-${s.id}`} readOnly onClick={(e) => { if ((window as any).openCalendar) (window as any).openCalendar({ displayId: `edit-campaign-subtask-due-${s.id}`, mode: 'single' }, e); }} value={campaignEditSubtaskDue} onChange={(e) => setCampaignEditSubtaskDue(e.target.value)} placeholder="dd/mm/yyyy" className="p-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none rounded-lg w-full cursor-pointer" /></div>
         </div>
         <div className="flex gap-2 justify-end">
           <button onClick={()=>setCampaignEditingSubtaskId(null)} className="text-xs text-gray-500 hover:text-gray-700">{t('common.cancel')}</button>
           <button onClick={()=>saveEditedCampaignSubtask(s.id)} className="text-xs text-primary font-bold">{t('common.save')}</button>
         </div>
      </div>
    ) : (
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-1">
            <div className="flex items-center gap-2"><b className={`text-gray-900 dark:text-white block ${['done', 'complete', 'completed'].includes((s.status || '').toLowerCase()) ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>{s.title}</b></div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
               <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-md text-gray-700 dark:text-gray-300 font-medium">
                 {s.assignee ? (
                   <>
                     <Avatar name={s.assignee.name} src={s.assignee.avatar_url || undefined} className="w-4 h-4 text-[9px]" />
                     {s.assignee.name}
                   </>
                 ) : t('common.unassigned')}
               </span>
               {s.due_date && <span className="flex items-center gap-1 font-bold text-red-600 dark:text-red-400"><Calendar size={12}/> {dateValue(s.due_date)}</span>}
            </div>
          </div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 shrink-0" onClick={event => event.stopPropagation()}>
          {Number(s.assignee_id) === Number(profile?.id) && !['done', 'complete', 'completed'].includes((s.status || '').toLowerCase()) && <button onClick={()=>void completeCampaignSubtask(s)} className="rounded-lg p-1.5 text-emerald-700 bg-emerald-100 hover:bg-emerald-200" title={t('common.complete')}><CheckCircle2 size={14}/></button>}
          {canCreate && <><button onClick={()=>{ setCampaignEditingSubtaskId(s.id); setCampaignEditSubtaskTitle(s.title); setCampaignEditSubtaskOwner(String(s.assignee_id || '')); setCampaignEditSubtaskDue(s.due_date ? dateValue(s.due_date) : ''); }} className="text-gray-400 hover:text-primary"><Edit3 size={14}/></button>
          <button onClick={()=>removeCampaignSubtask(s.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button></>}
        </div>
      </div>
    )}
  </div>
))}</div>{!showCampaignSubtaskForm && <button onClick={() => setShowCampaignSubtaskForm(true)} className="mt-3 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20 w-full text-center border-dashed"><Plus size={16} className="inline mr-1" /> {t('projects.addSubtask')}</button>}
{showCampaignSubtaskForm && <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3"><input value={campaignNewSubtask} onChange={e=>setCampaignNewSubtask(e.target.value)} placeholder={t('projects.subtaskPlaceholder')} className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"/><div className="grid grid-cols-2 gap-2"><select value={campaignSubtaskOwner} onChange={e=>setCampaignSubtaskOwner(e.target.value)} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"><option value="">{t('common.selectPic')}</option>{visiblePeople.map(p => <option key={p.id} value={p.id}>{p.name} {p.departments?.name ? '('+p.departments.name+')' : ''}</option>)}</select><div className="tw-calendar-picker relative w-full"><input type="text" id="campaign-subtask-due-input" readOnly onClick={(e) => { if ((window as any).openCalendar) (window as any).openCalendar({ displayId: 'campaign-subtask-due-input', mode: 'single' }, e); }} value={campaignSubtaskDue} onChange={(e) => setCampaignSubtaskDue(e.target.value)} placeholder="dd/mm/yyyy" className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm w-full cursor-pointer"/></div></div><div className="flex gap-2 justify-end"><button onClick={() => setShowCampaignSubtaskForm(false)} className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700">{t('common.cancel')}</button><button onClick={() => { addCampaignSubtask(); }} className="px-3 py-1.5 bg-[#002e6d] text-white text-sm font-semibold rounded-lg shadow-sm">{t('common.add')}</button></div></div>}</section><section><h3 className="font-bold text-sm flex gap-2 items-center mb-3"><MessageSquare size={16}/> {t('common.activityComments')}</h3><div className="space-y-3">{campaignComments.map(c => {
        const mine = Number(c.user_id) === Number(profile?.id);
        return (
          <div key={c.id} className={`group flex ${mine ? 'justify-end' : 'justify-start'} items-end gap-2 animate-slide-up`}>
            {!mine && <Avatar name={c.user?.name || 'Member'} src={(c.user as any)?.avatar_url || undefined} className="w-7 h-7 text-[10px] shadow-sm shrink-0 mb-1" />}
            <div className={`flex max-w-[85%] items-end gap-1.5 ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`rounded-2xl px-3 py-2.5 text-sm shadow-sm flex flex-col ${mine ? 'rounded-br-md bg-[#002e6d] text-white items-end' : 'rounded-bl-md bg-slate-100 text-gray-800 dark:bg-slate-700 dark:text-slate-100 items-start'}`}>
                <p className={`mb-1 text-[11px] font-bold ${mine ? 'text-blue-100' : 'text-gray-500 dark:text-slate-300'}`}>{c.user?.name || 'Member'}</p>
                {campaignEditingCommentId === c.id ? (
                  <div>
                    <textarea value={campaignEditingCommentText} onChange={e=>setCampaignEditingCommentText(e.target.value)} className="w-full min-w-56 rounded-lg border border-blue-200 bg-white p-2 text-gray-900 outline-none" rows={2} />
                    <div className="mt-1 flex justify-end gap-2"><button onClick={() => setCampaignEditingCommentId(null)} className="text-xs">{t('common.cancel')}</button><button onClick={() => saveEditedCampaignComment(c.id)} className="text-xs font-bold">{t('common.save')}</button></div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{c.metadata?.body}</p>
                )}
              </div>
              <div className="flex opacity-0 transition-opacity group-hover:opacity-100 pb-2">
                <button onClick={() => { setCampaignComment(value => `${value}${value && !value.endsWith(' ') ? ' ' : ''}@${(c.user?.name || 'Member').replace(/\s+/g, '')} `); window.setTimeout(() => campaignCommentInput.current?.focus(), 0); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary dark:hover:bg-slate-700" title="Trả lời"><Reply size={14}/></button>
                {mine && <><button onClick={() => { setCampaignEditingCommentId(c.id); setCampaignEditingCommentText(c.metadata?.body || ''); }} className="rounded-lg p-1.5 text-gray-400 hover:text-primary"><Edit3 size={14}/></button><button onClick={() => removeCampaignComment(c.id)} className="rounded-lg p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14}/></button></>}
              </div>
            </div>
            {mine && <Avatar name={c.user?.name || 'Member'} src={(c.user as any)?.avatar_url || undefined} className="w-7 h-7 text-[10px] shadow-sm shrink-0 mb-1" />}
          </div>
        );
      })}</div><div className="mt-4 relative"><textarea ref={campaignCommentInput} value={campaignComment} onChange={e=>setCampaignComment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (e.nativeEvent.isComposing) return; if (campaignComment.trim()) void addCampaignComment(); } }} rows={3} placeholder={t('common.commentPlaceholder')} className="w-full p-3 rounded-xl border border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm" />{campaignMentionOptions.length > 0 && <div className="absolute bottom-full mb-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">{campaignMentionOptions.map(person => <button key={person.id} onMouseDown={event => event.preventDefault()} onClick={() => chooseCampaignMention(person)} className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-700"><b>{person.name}</b><span className="ml-2 text-xs text-gray-400">@{person.name.replace(/\s+/g, '')}</span></button>)}</div>}<div className="mt-2 flex justify-end"><button disabled={!campaignComment.trim()} onClick={addCampaignComment} className="px-4 py-2 bg-[#002e6d] text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-sm hover:bg-[#002150] transition-colors"><Send size={14} /> {t('common.sendComment')}</button></div></div></section></div>}
          </div>
          {!campaignEditMode && selectedRoot && <div className="p-4 md:p-5 border-t border-gray-200 dark:border-slate-700 flex gap-3 shrink-0 bg-white dark:bg-slate-800" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}><button onClick={() => { setTitle(selectedCampaign.name); setStart(selectedCampaign.start_date || ''); setDue(selectedCampaign.end_date || ''); setCampaignObjective(selectedCampaign.objective || ''); setCampaignBudget(selectedCampaign.budget ? String(selectedCampaign.budget) : ''); setPrimaryOwnerId(selectedCampaign.lead_id ? String(selectedCampaign.lead_id) : ''); setCampaignEditMode(true); }} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700"><Edit3 className="w-4 h-4" /> {t('common.edit')}</button><button onClick={completeCampaign} className="flex-1 px-4 py-2.5 bg-[#002e6d] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-colors"><CheckCircle2 className="w-4 h-4" /> {t('common.complete')}</button></div>}
        </div>
      )}
    </div>

    {/* Mobile/Tablet Backdrop when Create Drawer is open */}
    {createOpen && (
      <div 
        className="fixed inset-0 bg-slate-900/30 dark:bg-slate-900/60 z-[70] xl:hidden backdrop-blur-xs transition-opacity"
        onClick={() => setCreateOpen(false)}
      />
    )}

    <div style={{ '--drawer-width': `${width}px` } as React.CSSProperties} className={`dashboard-detail-drawer bg-white dark:bg-slate-800 shrink-0 ${createOpen ? 'w-full max-w-full md:max-w-[calc(100vw-32px)] md:w-[var(--drawer-width)] shadow-drawer-task border border-blue-500/20 opacity-100 pointer-events-auto drawer-slide-in' : 'w-0 min-w-0 shadow-none border-0 opacity-0 pointer-events-none'} z-[75] ${!resizing ? 'transition-[width,opacity] duration-300 ease-out' : ''}`}>
      {createOpen && <>
      <div onMouseDown={() => setResizing(true)} className="hidden md:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0"><h3 className="font-bold text-xl text-gray-900 dark:text-white">{t('projects.createTitle')}</h3><button disabled={creating} aria-label={t('common.close')} onClick={() => setCreateOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-gray-500" /></button></div>
      <form onSubmit={createItem} aria-busy={creating} className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="min-h-0 min-w-0 p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-4">
        <fieldset disabled={creating} className="min-w-0 space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 dark:bg-slate-900 p-1" role="tablist" aria-label="Loại khởi tạo">
          <button type="button" role="tab" aria-selected={creationType === 'campaign'} onClick={() => { setCreationType('campaign'); if (!campaignObjective) setCampaignObjective(description); }} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${creationType === 'campaign' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-gray-500'}`}>{t('projects.typeCampaign')}</button>
          <button type="button" role="tab" aria-selected={creationType === 'project'} onClick={() => { setCreationType('project'); if (!description) setDescription(campaignObjective); if (primaryOwnerId) setOwnerIds(ids => Array.from(new Set([...ids, primaryOwnerId]))); }} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${creationType === 'project' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-gray-500'}`}>{t('projects.typeProject')}</button>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('projects.nameLabel')} <span className="text-red-500">*</span></label>
          <input type="text" required value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-gray-400 shadow-sm" placeholder={t('projects.namePlaceholder')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="tw-calendar-picker relative"><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('common.startDate')}</label><input type="text" id="create-start-input" readOnly onClick={(e) => { if ((window as any).openCalendar) (window as any).openCalendar({ displayId: 'create-start-input', mode: 'single' }, e); }} value={start} onChange={(e) => setStart(e.target.value)} placeholder="dd/mm/yyyy" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white cursor-pointer shadow-sm" /></div>
          <div className="tw-calendar-picker relative"><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('common.dueDate')}</label><input type="text" id="create-end-input" readOnly onClick={(e) => { if ((window as any).openCalendar) (window as any).openCalendar({ displayId: 'create-end-input', mode: 'single' }, e); }} value={due} onChange={(e) => setDue(e.target.value)} placeholder="dd/mm/yyyy" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white cursor-pointer shadow-sm" /></div>
        </div>

        <div className="space-y-3"><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">{t('projects.primaryOwner')} <span className="text-red-500">*</span></label>
          <MultiSelect options={visiblePeople.map(p=>({value:String(p.id),label:p.name + (p.departments?.name ? ` · ${p.departments.name}` : '')}))} value={ownerIds} primaryValue={primaryOwnerId} onPrimaryChange={setPrimaryOwnerId} onChange={(ids: string[]) => { setOwnerIds(ids); if (!ids.includes(primaryOwnerId)) setPrimaryOwnerId(ids[0] || ''); }} placeholder={t('projects.tagMembers')} />
          <p className="text-xs text-gray-500">PIC ở đây được xem toàn bộ lộ trình. Người chỉ tham gia một phase cần được tag trong Workflow của phase đó.</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('projects.primaryOwnerNote')}</p>
        </div>

        {creationType === 'campaign' ? <div><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('projects.objectives')}</label><textarea value={campaignObjective} onChange={e=>setCampaignObjective(e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white" placeholder={t('projects.objectives')} /></div> : <div><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('common.description')}</label><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white" placeholder={t('tasks.descPlaceholder')} /></div>}

        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm font-semibold text-primary hover:underline">{showAdvanced ? t('projects.hideMore') : t('projects.showMore')}</button>
        {showAdvanced && (creationType === 'project' ? <div className="space-y-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-900/40 p-4">
          <div><label className="block text-sm font-semibold mb-1">{t('projects.belongsToCampaign')}</label><select value={parentCampaignId} onChange={e=>selectParentCampaign(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"><option value="">{t('projects.standalone')}</option>{campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="block text-sm font-semibold mb-1">{t('common.priority')}</label><select value={priority} onChange={e=>setPriority(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"><option value="high">{t('common.high')}</option><option value="medium">{t('common.medium')}</option><option value="low">{t('common.low')}</option></select></div>
          <div><label className="block text-sm font-semibold mb-1">{t('projects.executingMembers')}</label><MultiSelect options={visiblePeople.filter(p=>String(p.id)!==primaryOwnerId).map(p=>({value:String(p.id),label:p.name}))} value={executionMemberIds} onChange={setExecutionMemberIds} placeholder={t('projects.tagMembers')} /></div>
          <div><label className="block text-sm font-semibold mb-1">{t('projects.attachments')}</label><input value={attachmentUrl} onChange={e=>setAttachmentUrl(e.target.value)} placeholder={t('projects.pasteLink')} className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800" /><label className="mt-2 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-primary/30 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5"><input type="file" className="sr-only" onChange={e=>setAttachmentFile(e.target.files?.[0] || null)} />{attachmentFile ? attachmentFile.name : t('projects.orChooseFile')}</label></div>
        </div> : <div className="space-y-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-900/40 p-4"><div><label className="block text-sm font-semibold mb-1">{t('projects.totalBudget')}</label><input type="number" min="0" value={campaignBudget} onChange={e=>setCampaignBudget(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800" placeholder={t('projects.budgetPlaceholder')} /></div><div><label className="block text-sm font-semibold mb-2">{t('projects.channels')}</label><div className="grid grid-cols-2 gap-2 text-sm">{['Social Media','OOH','In-store','PR','Digital Ads','CRM'].map(channel => <label key={channel} className="flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 px-3 py-2"><input type="checkbox" checked={campaignChannels.includes(channel)} onChange={() => setCampaignChannels(values => values.includes(channel) ? values.filter(value => value !== channel) : [...values, channel])} />{channel}</label>)}</div></div><div><label className="block text-sm font-semibold mb-1">{t('projects.attachments')}</label><input value={attachmentUrl} onChange={e=>setAttachmentUrl(e.target.value)} placeholder={t('projects.pasteLink')} className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800" /><label className="mt-2 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-primary/30 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5"><input type="file" className="sr-only" onChange={e=>setAttachmentFile(e.target.files?.[0] || null)} />{attachmentFile ? attachmentFile.name : t('projects.orChooseFile')}</label></div></div>)}

        </fieldset>
      </div>
        <div className="p-5 border-t border-gray-200 dark:border-slate-700 flex gap-3 shrink-0 bg-white dark:bg-slate-800"><button type="button" disabled={creating} onClick={() => setCreateOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-slate-700">{t('common.cancel')}</button><button disabled={creating || !title.trim() || !primaryOwnerId} type="submit" className="min-w-0 flex-1 disabled:opacity-50 px-4 py-2.5 bg-[#002e6d] hover:bg-[#001f4d] text-white font-bold text-sm rounded-xl">{creating ? t('projects.creating') : t('projects.createBtn')}</button></div>
      </form>
      </>}
    </div>
      <SubtaskDetailPanel
        subtask={selectedSubtask}
        entityType={selectedCampaign ? 'campaign_subtask' : 'project_subtask'}
        profile={profile}
        people={people}
        parentName={selected?.name || selectedCampaign?.name}
        onClose={() => setSelectedSubtask(null)}
        onUpdated={(updatedSubtask) => {
          if (updatedSubtask) {
            setSubtasks(current => current.map(item => item.id === updatedSubtask.id ? { ...item, ...updatedSubtask } : item));
            setSelectedSubtask(updatedSubtask);
            if ((updatedSubtask.status || '').toLowerCase() === 'completed') {
              setRecentlyCompletedSubtaskId(updatedSubtask.id);
              window.setTimeout(() => setRecentlyCompletedSubtaskId(current => current === updatedSubtask.id ? null : current), 900);
            }
          }
          setSelected(current => current ? { ...current } : current);
        }}
      />
      <ConfirmDeleteModal isOpen={!!projectToDelete} title="Xóa Dự án" message={`Bạn có chắc muốn xóa dự án "${projectToDelete?.name}"? Tất cả subtask của dự án này cũng sẽ bị xóa.`} onConfirm={executeRemoveProject} onCancel={() => setProjectToDelete(null)} />
      <ConfirmDeleteModal isOpen={!!subtaskToDelete} title="Xóa Subtask" message="Bạn có chắc muốn xóa subtask này?" onConfirm={executeRemoveSubtask} onCancel={() => setSubtaskToDelete(null)} />
      <ConfirmDeleteModal isOpen={!!campaignSubtaskToDelete} title="Xóa Subtask" message={`Bạn có chắc muốn xóa subtask "${campaignSubtaskToDelete?.title || ''}"?`} onConfirm={executeRemoveCampaignSubtask} onCancel={() => setCampaignSubtaskToDelete(null)} />
    <ConfirmHideModal isOpen={!!projectToHide} title="Ẩn Dự án" message={`Bạn có chắc muốn ẩn dự án "${projectToHide?.name}"? Dự án sẽ được đưa vào lưu trữ và có thể khôi phục sau.`} onConfirm={executeHideProject} onCancel={() => setProjectToHide(null)} />
  </div>
);
};
