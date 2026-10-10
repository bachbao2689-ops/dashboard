import { StatusBadge } from '../components/common/StatusBadge';
import { MultiSelect } from '../components/common/MultiSelect';
import React, { useEffect, useMemo, useState } from 'react';
import { Avatar } from "../components/common/Avatar";

import toast from 'react-hot-toast';
import { useTranslation } from '../i18n/translations';
import { ChevronDown, FolderKanban, MessageSquare, Plus, Users, X, Edit3, Trash2, CheckCircle2, Calendar, EyeOff, Reply } from 'lucide-react';
import { ConfirmDeleteModal } from '../components/common/ConfirmDeleteModal';
import { ConfirmHideModal } from '../components/common/ConfirmHideModal';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { CampaignPanel } from '../components/features/projects/CampaignPanel';
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




const getDueStatusColor = (endDateStr?: string | null) => {
  if (!endDateStr) return 'border-transparent';
  const end = new Date(endDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 3) return 'border-green-500';
  if (diffDays >= 1) return 'border-amber-500';
  return 'border-red-500';
};

const getDueStatusLabel = (endDateStr?: string | null) => {
  if (!endDateStr) return null;
  const end = new Date(endDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  const color = diffDays > 3 ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30' : diffDays >= 1 ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30' : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
  const label = diffDays < 0 ? `Trễ ${Math.abs(diffDays)} ngày` : diffDays === 0 ? 'Hôm nay' : `Còn ${diffDays} ngày`;
  
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap ${color}`}>{label}</span>;
};

export const Projects: React.FC = () => {
  const { t } = useTranslation();
  const profile = useAuthStore(s => s.profile);
  const canCreate = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'leader' || profile?.employment_level === 'Leader';
  const [projects, setProjects] = useState<Project[]>([]); const [people, setPeople] = useState<Person[]>([]);
  const [members, setMembers] = useState<Record<string, string[]>>({}); const [selected, setSelected] = useState<Project | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
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



  const visiblePeople = useMemo(() => {
    if (profile?.role === 'admin' || profile?.employment_level === 'manager' || (profile?.role === 'manager' && profile?.employment_level !== 'Leader')) return people;
    return people.filter(person => person.department_id === profile?.department_id);
  }, [people, profile?.role, profile?.employment_level, profile?.department_id]);
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
  const [subtaskMembers, setSubtaskMembers] = useState<Record<string, string[]>>({});

  const canViewAll = profile?.role === 'admin' || profile?.employment_level?.toLowerCase() === 'admin' || profile?.employment_level?.toLowerCase() === 'manager' || (profile?.role === 'manager' && profile?.employment_level !== 'Leader');
  const isLeader = profile?.employment_level === 'Leader' || profile?.role?.toLowerCase() === 'leader';

  const visibleProjects = useMemo(() => {
    if (canViewAll) return projects;
    return projects.filter(p => {
      const isOwner = String(p.created_by) === String(profile?.id);
      const isMember = (members[p.id] || []).includes(String(profile?.id));
      const hasSubtask = (subtaskMembers[p.id] || []).includes(String(profile?.id));
      if (isOwner || isMember || hasSubtask) return true;
      if (isLeader && String(p.department_id) === String(profile?.department_id)) return true;
      return false;
    });
  }, [projects, profile, canViewAll, isLeader, members, subtaskMembers]);


  const load = async () => {
    const [projectRes, peopleRes, memberRes, commentRes, subtaskRes] = await Promise.all([
      supabase.from('projects').select('*, creator:created_by(name,avatar_url)').neq('status', 'archived').neq('status', 'deleted').order('created_at', { ascending: false }),
      supabase.from('users').select('id,name,department_id,avatar_url,departments(name)').eq('is_active', true).order('name'),
      supabase.from('project_members').select('project_id,user_id'),
      supabase.from('project_comments').select('project_id'),
      supabase.from('project_subtasks').select('project_id,assignee_id').neq('status', 'deleted')
    ]);
    if (projectRes.error) return toast.error('Không thể tải Project');
    setProjects(projectRes.data || []); setPeople((peopleRes.data as any) || []);
    setMembers((memberRes.data || []).reduce((acc: Record<string, string[]>, item: any) => ({ ...acc, [item.project_id]: [...(acc[item.project_id] || []), String(item.user_id)] }), {}));
    
    const commentsMap: Record<string, boolean> = {};
    (commentRes.data || []).forEach(c => commentsMap[c.project_id] = true);
    setHasComments(commentsMap);
    const { data: campaignData } = await supabase.from('campaigns').select('id,name,start_date,end_date,lead_id,department_id').neq('status', 'archived').neq('status', 'deleted').order('name');
    setCampaigns((campaignData || []).filter(c => canViewAll || (profile?.department_id && c.department_id === profile.department_id) || c.lead_id === profile?.id));
    const { data: creationDetails } = await supabase.from('activity_log').select('entity_id,metadata').eq('entity_type', 'project').eq('action', 'creation_details');
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
    load();
    const channel = supabase.channel('projects_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_subtasks' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_subtasks' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_comments' }, () => { load(); setRefreshDetailTrigger(v => v + 1); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log' }, () => { load(); setRefreshDetailTrigger(v => v + 1); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const [s, c] = await Promise.all([
        supabase.from('project_subtasks').select('*, assignee:assignee_id(name,avatar_url)').eq('project_id', selected.id).order('created_at'),
        supabase.from('project_comments').select('*, author:author_id(name,avatar_url)').eq('project_id', selected.id).order('created_at')
      ]);
      const nextSubtasks = (s.data || []).filter(item => item.status !== 'deleted');
      setSubtasks(nextSubtasks);
      setComments(c.data || []);
      if (!nextSubtasks.length) return setSubtaskCommentCounts({});
      const { data: subtaskActivities } = await supabase.from('activity_log').select('entity_id').eq('entity_type', 'project_subtask').eq('action', 'comment').in('entity_id', nextSubtasks.map(item => item.id));
      const counts = (subtaskActivities || []).reduce((acc: Record<string, number>, item: any) => ({ ...acc, [item.entity_id]: (acc[item.entity_id] || 0) + 1 }), {});
      setSubtaskCommentCounts(counts);
    })();
  }, [selected, refreshDetailTrigger]);
  useEffect(() => { if (!selectedCampaign) return; (async () => { const [subtaskRes, commentRes] = await Promise.all([supabase.from('campaign_subtasks').select('*, assignee:assignee_id(name,avatar_url)').eq('campaign_id', selectedCampaign.id).order('created_at'), supabase.from('activity_log').select('*, user:user_id(name,avatar_url)').eq('entity_type', 'campaign').eq('entity_id', selectedCampaign.id).eq('action', 'comment').order('created_at')]); setCampaignSubtasks(subtaskRes.data || []); setCampaignComments(commentRes.data || []); })(); }, [selectedCampaign, refreshDetailTrigger]);
  
  
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
    await supabase.from('projects').update({ status: 'completed' }).eq('id', selected.id);
    setSelected({ ...selected, status: 'completed' });
    setProjects(projects.map(p => p.id === selected.id ? { ...p, status: 'completed' } : p));
    toast.success('Đã hoàn thành Project');
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
    setDepartmentId(campaign.department_id || profile?.department_id || '');
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
    const selectedPeople = creationType === 'project' ? [primaryOwnerId, ...ownerIds, ...executionMemberIds] : [primaryOwnerId];
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
        const { error: memberError } = await supabase.from('project_members').insert(participantIds.map(user_id => ({ project_id: project.id, user_id: Number(user_id) })));
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
    await supabase.from('project_members').delete().eq('project_id', selected.id);
    if (ownerIds.length) await supabase.from('project_members').insert(ownerIds.map(user_id => ({ project_id: data.id, user_id: Number(user_id) })));
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

  const addSubtask = async () => { if (!selected || !newSubtask) return; await supabase.from('project_subtasks').insert({ project_id: selected.id, title: newSubtask, assignee_id: subtaskOwner ? Number(subtaskOwner) : null, due_date: parseYMD(subtaskDue) }); setNewSubtask(''); setSubtaskOwner(''); setSubtaskDue(''); setSelected({ ...selected }); };
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
  <div className="h-full flex overflow-hidden relative">
    {/* Left Side: Projects List */}
    <div className={`h-full flex flex-col min-w-0 transition-all duration-300 flex-1 p-1 ${panelOpen ? 'hidden md:flex pr-4' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><FolderKanban className="text-primary"/> Projects/Campaigns</h1><p className="text-sm text-gray-500 mt-1">{t('projects.subtitle')}</p></div>{canCreate && <button onClick={() => { resetCreateForm(); setCreationType('project'); setSelected(null); setSelectedCampaign(null); setCreateOpen(true); }} className="flex items-center gap-1 sm:gap-2 text-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-xl transition-all shadow-sm flex-shrink-0 btn-add-new-light btn-add-new-dark"><Plus className="w-4 h-4" /><span>{t('projects.add')}</span></button>}</div><div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-20 pr-1"><CampaignPanel onSelect={(campaign) => { setSelected(null); setCreateOpen(false); setSelectedCampaign(campaign); }}/><section className="card-hub rounded-2xl overflow-hidden shrink-0"><div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700"><button onClick={() => setProjectsExpanded(value => !value)} aria-expanded={projectsExpanded} className="inline-flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white"><ChevronDown className={`text-gray-500 transition-transform ${projectsExpanded ? '' : '-rotate-90'}`} size={17}/><FolderKanban className="text-violet-500" size={16}/> {t('projects.projects')} <span className="rounded-full bg-violet-100 dark:bg-violet-500/20 px-2 py-0.5 text-xs font-bold text-violet-600 dark:text-violet-400">{visibleProjects.length}</span></button></div>{projectsExpanded && <div className="overflow-x-auto"><table className="w-full min-w-max text-left"><thead className="bg-gray-50 dark:bg-slate-800 text-xs uppercase tracking-wide text-gray-500"><tr><th className="p-4">Project</th><th>Owner</th><th>Dates</th><th>Priority</th><th>Status</th><th className="w-12"/></tr></thead><tbody>{visibleProjects.map(project => <tr key={project.id} onClick={() => { setSelectedCampaign(null); setCreateOpen(false); setSelected(project); }} className={`group border-t border-gray-100 dark:border-slate-800 cursor-pointer hover:bg-primary/5 transition-all duration-300 ${deletingIds.includes(project.id) ? "animate-fade-out" : ""}`}>
<td className="p-4">
  <div className="flex items-center gap-2">
    <b className="text-gray-900 dark:text-white">{project.name}</b>
    {hasComments[project.id] && <span title="Có bình luận" className="relative inline-flex"><MessageSquare size={14} className="text-blue-500" />{Number(project.lead_id) === Number(profile?.id) && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm"></span>}</span>}
  </div>
  <p className="text-xs text-gray-500 truncate max-w-[250px] md:max-w-[400px] lg:max-w-[500px] mt-1">{project.description || 'No description'}</p>
</td>
<td>
  <div className="flex items-center gap-2">
    <div className="flex -space-x-2">
      {(members[project.id] || []).slice(0,4).map(id => { const p = people.find(p=>String(p.id)===id); return <Avatar key={'o'+id} name={p?.name || '?'} src={(p as any)?.avatar_url || undefined} className="w-7 h-7 text-[10px] border-2 border-white dark:border-slate-900 shadow-sm z-10" /> })}
    </div>
    {subtaskMembers[project.id] && subtaskMembers[project.id].length > 0 && (
      <>
        <span className="text-gray-300 dark:text-gray-600 px-1">|</span>
        <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full border border-amber-100 dark:border-amber-800">
          <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400">SUB</span>
          <div className="flex -space-x-2">
            {subtaskMembers[project.id].slice(0,4).map(id => { const p = people.find(p=>String(p.id)===id); return <Avatar key={'s'+id} name={(p?.name || 'Unknown') + ' (Subtask)'} src={(p as any)?.avatar_url || undefined} className="w-6 h-6 text-[9px] border-2 border-white dark:border-slate-900 shadow-sm z-10 opacity-90" /> })}
          </div>
        </div>
      </>
    )}
  </div>
</td>
<td className="text-sm text-gray-600 dark:text-gray-300"><div className="flex items-center gap-2"><span>{dateValue(project.start_date || '')} – {dateValue(project.due_date || '')}</span>{project.due_date && <div className="flex items-center gap-1.5"><div className={`w-3.5 h-3.5 rounded-full border-[2.5px] ${getDueStatusColor(project.due_date)}`} title={`Hạn chót: ${dateValue(project.due_date)}`} />{getDueStatusLabel(project.due_date)}</div>}</div></td>
<td><span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${priorityClass(project.priority || 'medium')}`}>{project.priority || 'medium'}</span></td>
<td><StatusBadge status={project.status || 'active'} /></td>
<td className="w-16 pr-4">{canCreate && <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); void archiveProject(project); }} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Ẩn"><EyeOff size={16}/></button><button onClick={(e) => { e.stopPropagation(); void removeProject(project); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa"><Trash2 size={16}/></button></div>}</td>
</tr>)}</tbody></table>{!projects.length && <div className="p-12 text-center text-gray-500">Chưa có Project nào.</div>}</div>}</section>
  
  
    </div></div>

    {/* Right Side: Detail Panel */}
    <div style={{ '--panel-width': `${width}px` } as React.CSSProperties} className={`h-full bg-white dark:bg-slate-800 rounded-l-3xl shrink-0 ${panelOpen ? 'w-full max-w-full md:max-w-[calc(100vw-40px)] md:w-[var(--panel-width)] md:min-w-[var(--panel-width)] ' + (selectedCampaign ? 'shadow-drawer-campaign border-l border-amber-500/20' : 'shadow-drawer-project border-l border-violet-500/20') : 'w-0 min-w-0 shadow-none border-l-0 border-transparent'} absolute md:relative right-0 top-0 z-[60] flex flex-col overflow-hidden ${!resizing ? 'transition-[width,min-width] duration-300' : ''}`}>
      {panelOpen && <div onMouseDown={() => setResizing(true)} className="hidden md:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />}
      {selected && (
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
            <h3 className="font-bold text-xl text-gray-900 dark:text-white line-clamp-1">{selected.name}</h3>
            <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
            {editMode ? (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Tên Project</label>
                  <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold outline-none mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div><label className="text-xs font-semibold text-gray-500 uppercase">Bắt đầu</label><input type="date" value={start} onChange={e=>setStart(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"/></div>
                   <div><label className="text-xs font-semibold text-gray-500 uppercase">Kết thúc</label><input type="date" value={due} onChange={e=>setDue(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"/></div>
                </div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">Độ ưu tiên</label><select value={priority} onChange={e=>setPriority(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">Người phụ trách (PIC)</label><MultiSelect options={visiblePeople.map(p => ({ value: String(p.id), label: p.name + (p.departments?.name ? ' ('+p.departments.name+')' : '') }))} value={ownerIds} onChange={setOwnerIds} placeholder="Chọn PIC..." /></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">Mô tả</label><textarea value={description} onChange={e=>setDescription(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none min-h-24 mt-1 text-sm" placeholder="Nhập mô tả..."/></div>
                <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <button onClick={() => setEditMode(false)} className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">Hủy</button>
                  <button onClick={saveInlineEdit} className="px-5 py-2.5 bg-[#002e6d] text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-[#002150] transition-colors">Lưu Project</button>
                </div>
              </div>
            ) : (
<div className="space-y-7 animate-in fade-in duration-200">
              <div className="flex gap-2"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800">Project</span><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 capitalize">{selected?.priority || 'medium'} Priority</span></div>
      <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 text-sm"><div><p className="text-[10px] uppercase text-gray-400 mb-1">Owner / PIC</p><div className="mt-1 flex flex-wrap gap-1">{(members[selected?.id || ''] || []).length > 0 ? (members[selected?.id || ''] || []).map(id => { const p = people.find(p=>String(p.id)===id); return p ? <div key={id} className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 rounded-full pr-3 pl-1 py-1"><Avatar name={p.name} src={(p as any).avatar_url || undefined} className="w-5 h-5 text-[10px]" /><span className="text-xs font-semibold">{p.name}{Number(id) === Number(projectPrimaryOwners[selected.id]) && <span className="ml-1 text-primary">· Chính</span>}</span></div> : null }) : 'Unassigned'}</div></div><div><p className="text-[10px] uppercase text-gray-400 mb-1">Timeline</p><div className="mt-1 flex items-center gap-1.5 flex-wrap text-sm"><span className="font-normal text-gray-700 dark:text-gray-300">{dateValue(selected?.start_date || '')}</span><span className="text-gray-400">–</span><span className="font-bold text-red-600 dark:text-red-400">{dateValue(selected?.due_date || '')}</span></div></div><div><p className="text-[10px] uppercase text-gray-400">Created by</p><div className="mt-1 font-semibold flex items-center gap-2"><Avatar name={(selected as any)?.creator?.name || '---'} src={(selected as any)?.creator?.avatar_url} className="w-5 h-5 text-[10px] shadow-sm" /> <span className="line-clamp-1">{(selected as any)?.creator?.name || '---'}</span></div></div></div>
      <section><h3 className="font-bold text-sm mb-2">Description</h3><div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 text-sm text-gray-600 dark:text-gray-300">{selected?.description || 'No description yet.'}</div></section>
      <section><h3 className="font-bold text-sm flex gap-2 items-center mb-3"><Users size={16}/> Subtasks</h3><div className="space-y-2">{subtasks.map(s=>(
  <div key={s.id} onClick={() => { const own = Number(s.assignee_id) === Number(profile?.id); if (own || canCreate) setSelectedSubtask(s); }} className={`p-3 rounded-xl border text-sm group relative transition-all ${(s.status || '').toLowerCase() === 'completed' ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20' : 'bg-slate-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700'} ${recentlyCompletedSubtaskId === s.id ? 'subtask-complete-pulse' : ''} ${(Number(s.assignee_id) === Number(profile?.id) || canCreate) ? 'cursor-pointer hover:border-primary/40 hover:shadow-sm' : ''}`}>
    {editingSubtaskId === s.id ? (
      <div className="space-y-2" onClick={event => event.stopPropagation()}>
         <input value={editSubtaskTitle} onChange={e=>setEditSubtaskTitle(e.target.value)} className="w-full p-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none rounded-lg" />
         <div className="grid grid-cols-2 gap-2">
           <select value={editSubtaskOwner} onChange={e=>setEditSubtaskOwner(e.target.value)} className="p-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none rounded-lg"><option value="">Chọn PIC</option>{visiblePeople.map(p=><option key={p.id} value={p.id}>{p.name} {p.departments?.name ? '('+p.departments.name+')' : ''}</option>)}</select>
           <div className="tw-calendar-picker relative w-full"><input type="text" id={`edit-subtask-due-${s.id}`} readOnly onClick={(e) => { if ((window as any).openCalendar) (window as any).openCalendar({ displayId: `edit-subtask-due-${s.id}`, mode: 'single' }, e); }} value={editSubtaskDue} onChange={(e) => setEditSubtaskDue(e.target.value)} placeholder="dd/mm/yyyy" className="p-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none rounded-lg w-full cursor-pointer" /></div>
         </div>
         <div className="flex gap-2 justify-end">
           <button onClick={()=>setEditingSubtaskId(null)} className="text-xs text-gray-500 hover:text-gray-700">Hủy</button>
           <button onClick={()=>saveEditedSubtask(s.id)} className="text-xs text-primary font-bold">Lưu</button>
         </div>
      </div>
    ) : (
      <div className="flex justify-between items-center w-full">
  <div className="flex items-center gap-3 flex-1">
    <div className="flex-1">
      <div className="flex items-center gap-2"><b className={`text-gray-900 dark:text-white block ${['done', 'complete', 'completed'].includes((s.status || '').toLowerCase()) ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>{s.title}</b>{subtaskCommentCounts[s.id] > 0 && <span title={`${subtaskCommentCounts[s.id]} bình luận`} className="inline-flex items-center gap-1 text-xs text-primary"><span className="relative inline-flex"><MessageSquare size={13}/>{Number(s.assignee_id) === Number(profile?.id) && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm border border-white dark:border-slate-900"></span>}</span>{subtaskCommentCounts[s.id]}</span>}</div>
      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
         <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-md text-gray-700 dark:text-gray-300 font-medium">
           {s.assignee ? (
             <>
               <Avatar name={s.assignee.name} src={s.assignee.avatar_url || undefined} className="w-4 h-4 text-[9px]" />
               {s.assignee.name}
             </>
           ) : 'Unassigned'}
         </span>
         {s.due_date && <span className="flex items-center gap-1 font-bold text-red-600 dark:text-red-400"><Calendar size={12}/> {dateValue(s.due_date)}</span>}
      </div>
    </div>
  </div>
  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 shrink-0" onClick={event => event.stopPropagation()}>
          {Number(s.assignee_id) === Number(profile?.id) && !['done', 'complete', 'completed'].includes((s.status || '').toLowerCase()) && <button onClick={()=>void completeSubtask(s)} className="rounded-lg p-1.5 text-emerald-700 bg-emerald-100 hover:bg-emerald-200" title="Hoàn thành"><CheckCircle2 size={14}/></button>}
          {canCreate && <><button onClick={()=>{ setEditingSubtaskId(s.id); setEditSubtaskTitle(s.title); setEditSubtaskOwner(String(s.assignee_id || '')); setEditSubtaskDue(s.due_date ? dateValue(s.due_date) : ''); }} className="text-gray-400 hover:text-primary"><Edit3 size={14}/></button>
          <button onClick={()=>removeSubtask(s.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button></>}
        </div>
      </div>
    )}
  </div>
))}</div>{!showSubtaskForm && <button onClick={() => setShowSubtaskForm(true)} className="mt-3 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20 w-full text-center border-dashed"><Plus size={16} className="inline mr-1" /> Thêm Subtask</button>}
{showSubtaskForm && <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3"><input value={newSubtask} onChange={e=>setNewSubtask(e.target.value)} placeholder="Tên subtask..." className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"/><div className="grid grid-cols-2 gap-2"><select value={subtaskOwner} onChange={e=>setSubtaskOwner(e.target.value)} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"><option value="">Chọn PIC</option>{visiblePeople.map(p=><option key={p.id} value={p.id}>{p.name} {p.departments?.name ? '('+p.departments.name+')' : ''}</option>)}</select><div className="tw-calendar-picker relative w-full"><input type="text" id="subtask-due-input" readOnly onClick={(e) => { if ((window as any).openCalendar) (window as any).openCalendar({ displayId: 'subtask-due-input', mode: 'single' }, e); }} value={subtaskDue} onChange={(e) => setSubtaskDue(e.target.value)} placeholder="dd/mm/yyyy" className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm w-full cursor-pointer"/></div></div><div className="flex gap-2 justify-end"><button onClick={() => setShowSubtaskForm(false)} className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700">Hủy</button><button onClick={() => { addSubtask(); setShowSubtaskForm(false); }} className="px-3 py-1.5 bg-[#002e6d] text-white text-sm font-semibold rounded-lg shadow-sm">Giao việc</button></div></div>}</section>
      <section><h3 className="font-bold text-sm flex gap-2 items-center mb-3"><MessageSquare size={16}/> Activity & Comments</h3><div className="space-y-3">{comments.map(c => {
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
                    <div className="mt-1 flex justify-end gap-2"><button onClick={() => setEditingCommentId(null)} className="text-xs">Hủy</button><button onClick={() => saveEditedComment(c.id)} className="text-xs font-bold">Lưu</button></div>
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
      })}</div><div className="mt-4 relative"><textarea ref={projectCommentInput} value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (e.nativeEvent.isComposing) return; if (comment.trim()) void addComment(); } }} rows={3} placeholder="Viết bình luận… Gõ @ để nhắc PIC" className="w-full p-3 rounded-xl border border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm" />{projectMentionOptions.length > 0 && <div className="absolute bottom-full mb-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">{projectMentionOptions.map(person => <button key={person.id} onMouseDown={event => event.preventDefault()} onClick={() => chooseProjectMention(person)} className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-700"><b>{person.name}</b><span className="ml-2 text-xs text-gray-400">@{person.name.replace(/\s+/g, '')}</span></button>)}</div>}</div></section>
            </div>
            )}
          </div>
          {!editMode && (<div className="p-5 border-t border-gray-200 dark:border-slate-700 flex gap-3 shrink-0 bg-white dark:bg-slate-800"><button onClick={() => { setTitle(selected.name); setDescription(selected.description || ''); setStart(selected.start_date || ''); setDue(selected.due_date || ''); setPriority(selected.priority || 'medium'); setOwnerIds(members[selected.id] || []); setEditMode(true); }} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"><Edit3 className="w-4 h-4" /> Chỉnh sửa</button><button onClick={completeProject} className="flex-1 px-4 py-2.5 bg-[#002e6d] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-colors"><CheckCircle2 className="w-4 h-4" /> Complete</button></div>)}
        </div>
      )}
      {selectedCampaign && (
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
            <h3 className="font-bold text-xl text-gray-900 dark:text-white line-clamp-1">{selectedCampaign.name}</h3>
            <button onClick={() => setSelectedCampaign(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-gray-500" /></button>
          </div>
          <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
            {campaignEditMode ? <div className="space-y-5"><div><label className="text-xs font-semibold text-gray-500 uppercase">Tên Campaign</label><input value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold outline-none mt-1" /></div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-gray-500 uppercase">Bắt đầu</label><input type="date" value={start} onChange={e=>setStart(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"/></div><div><label className="text-xs font-semibold text-gray-500 uppercase">Kết thúc</label><input type="date" value={due} onChange={e=>setDue(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"/></div></div><div><label className="text-xs font-semibold text-gray-500 uppercase">Owner / PIC</label><select value={primaryOwnerId} onChange={e=>setPrimaryOwnerId(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"><option value="">Chọn PIC</option>{visiblePeople.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div><div><label className="text-xs font-semibold text-gray-500 uppercase">Mục tiêu / KPI</label><textarea value={campaignObjective} onChange={e=>setCampaignObjective(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none min-h-24 mt-1 text-sm" /></div><div><label className="text-xs font-semibold text-gray-500 uppercase">Ngân sách</label><input type="number" min="0" value={campaignBudget} onChange={e=>setCampaignBudget(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm" /></div><div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100 dark:border-slate-700"><button onClick={() => setCampaignEditMode(false)} className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 rounded-xl text-sm font-semibold">Hủy</button><button onClick={saveCampaignEdit} className="px-5 py-2.5 bg-[#002e6d] text-white rounded-xl text-sm font-semibold">Lưu Campaign</button></div></div> : <div className="space-y-7"><div className="flex gap-2"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">Campaign</span><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 capitalize">{selectedCampaign.status || 'planning'}</span></div><div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 text-sm"><div><p className="text-[10px] uppercase text-gray-400">Owner</p><div className="mt-1 font-semibold flex items-center gap-2"><Avatar name={(selectedCampaign as any)?.lead?.name || 'Unassigned'} src={(selectedCampaign as any)?.lead?.avatar_url} className="w-5 h-5 text-[10px] shadow-sm" /> <span className="line-clamp-1">{(selectedCampaign as any)?.lead?.name || 'Unassigned'}</span></div></div><div><p className="text-[10px] uppercase text-gray-400 mb-1">Timeline</p><div className="mt-1 flex items-center gap-1.5 flex-wrap text-sm"><span className="font-normal text-gray-700 dark:text-gray-300">{dateValue(selectedCampaign.start_date || '')}</span><span className="text-gray-400">–</span><span className="font-bold text-red-600 dark:text-red-400">{dateValue(selectedCampaign.end_date || '')}</span></div></div><div><p className="text-[10px] uppercase text-gray-400">Created by</p><div className="mt-1 font-semibold flex items-center gap-2"><Avatar name={(selectedCampaign as any)?.creator?.name || '---'} src={(selectedCampaign as any)?.creator?.avatar_url} className="w-5 h-5 text-[10px] shadow-sm" /> <span className="line-clamp-1">{(selectedCampaign as any)?.creator?.name || '---'}</span></div></div></div><section><h3 className="font-bold text-sm mb-2">Description</h3><div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 text-sm text-gray-600 dark:text-gray-300">{selectedCampaign.objective || 'Chưa có mục tiêu.'}</div></section><section><h3 className="font-bold text-sm flex gap-2 items-center mb-3"><Users size={16}/> Subtasks</h3><div className="space-y-2">{campaignSubtasks.filter(subtask => subtask.status !== 'deleted').map(s => (
  <div key={s.id} className={`group p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border transition-all duration-300 text-sm cursor-pointer ${deletingIds.includes(s.id) ? "animate-fade-out" : ""} ${['done', 'complete', 'completed'].includes((s.status || '').toLowerCase()) ? 'border-emerald-400 dark:border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 bg-white/50 dark:bg-slate-900/50 dark:hover:border-slate-700'}`} onClick={() => setSelectedSubtask(s)}>
    {campaignEditingSubtaskId === s.id ? (
      <div className="space-y-3" onClick={e=>e.stopPropagation()}>
         <input value={campaignEditSubtaskTitle} onChange={e=>setCampaignEditSubtaskTitle(e.target.value)} className="w-full p-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none rounded-lg font-bold" />
         <div className="grid grid-cols-2 gap-2">
           <select value={campaignEditSubtaskOwner} onChange={e=>setCampaignEditSubtaskOwner(e.target.value)} className="p-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none rounded-lg"><option value="">Chọn PIC</option>{visiblePeople.map(p=><option key={p.id} value={p.id}>{p.name} {p.departments?.name ? '('+p.departments.name+')' : ''}</option>)}</select>
           <div className="tw-calendar-picker relative w-full"><input type="text" id={`edit-campaign-subtask-due-${s.id}`} readOnly onClick={(e) => { if ((window as any).openCalendar) (window as any).openCalendar({ displayId: `edit-campaign-subtask-due-${s.id}`, mode: 'single' }, e); }} value={campaignEditSubtaskDue} onChange={(e) => setCampaignEditSubtaskDue(e.target.value)} placeholder="dd/mm/yyyy" className="p-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none rounded-lg w-full cursor-pointer" /></div>
         </div>
         <div className="flex gap-2 justify-end">
           <button onClick={()=>setCampaignEditingSubtaskId(null)} className="text-xs text-gray-500 hover:text-gray-700">Hủy</button>
           <button onClick={()=>saveEditedCampaignSubtask(s.id)} className="text-xs text-primary font-bold">Lưu</button>
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
                 ) : 'Unassigned'}
               </span>
               {s.due_date && <span className="flex items-center gap-1 font-bold text-red-600 dark:text-red-400"><Calendar size={12}/> {dateValue(s.due_date)}</span>}
            </div>
          </div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 shrink-0" onClick={event => event.stopPropagation()}>
          {Number(s.assignee_id) === Number(profile?.id) && !['done', 'complete', 'completed'].includes((s.status || '').toLowerCase()) && <button onClick={()=>void completeCampaignSubtask(s)} className="rounded-lg p-1.5 text-emerald-700 bg-emerald-100 hover:bg-emerald-200" title="Hoàn thành"><CheckCircle2 size={14}/></button>}
          {canCreate && <><button onClick={()=>{ setCampaignEditingSubtaskId(s.id); setCampaignEditSubtaskTitle(s.title); setCampaignEditSubtaskOwner(String(s.assignee_id || '')); setCampaignEditSubtaskDue(s.due_date ? dateValue(s.due_date) : ''); }} className="text-gray-400 hover:text-primary"><Edit3 size={14}/></button>
          <button onClick={()=>removeCampaignSubtask(s.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button></>}
        </div>
      </div>
    )}
  </div>
))}</div>{!showCampaignSubtaskForm && <button onClick={() => setShowCampaignSubtaskForm(true)} className="mt-3 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20 w-full text-center border-dashed"><Plus size={16} className="inline mr-1" /> Thêm Subtask</button>}
{showCampaignSubtaskForm && <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3"><input value={campaignNewSubtask} onChange={e=>setCampaignNewSubtask(e.target.value)} placeholder="Tên subtask..." className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"/><div className="grid grid-cols-2 gap-2"><select value={campaignSubtaskOwner} onChange={e=>setCampaignSubtaskOwner(e.target.value)} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"><option value="">Chọn PIC</option>{visiblePeople.map(p=><option key={p.id} value={p.id}>{p.name} {p.departments?.name ? '('+p.departments.name+')' : ''}</option>)}</select><div className="tw-calendar-picker relative w-full"><input type="text" id="campaign-subtask-due-input" readOnly onClick={(e) => { if ((window as any).openCalendar) (window as any).openCalendar({ displayId: 'campaign-subtask-due-input', mode: 'single' }, e); }} value={campaignSubtaskDue} onChange={(e) => setCampaignSubtaskDue(e.target.value)} placeholder="dd/mm/yyyy" className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm w-full cursor-pointer"/></div></div><div className="flex gap-2 justify-end"><button onClick={() => setShowCampaignSubtaskForm(false)} className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700">Hủy</button><button onClick={() => { addCampaignSubtask(); }} className="px-3 py-1.5 bg-[#002e6d] text-white text-sm font-semibold rounded-lg shadow-sm">Giao việc</button></div></div>}</section><section><h3 className="font-bold text-sm flex gap-2 items-center mb-3"><MessageSquare size={16}/> Activity & Comments</h3><div className="space-y-3">{campaignComments.map(c => {
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
                    <div className="mt-1 flex justify-end gap-2"><button onClick={() => setCampaignEditingCommentId(null)} className="text-xs">Hủy</button><button onClick={() => saveEditedCampaignComment(c.id)} className="text-xs font-bold">Lưu</button></div>
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
      })}</div><div className="mt-4 relative"><textarea ref={campaignCommentInput} value={campaignComment} onChange={e=>setCampaignComment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (e.nativeEvent.isComposing) return; if (campaignComment.trim()) void addCampaignComment(); } }} rows={3} placeholder="Viết bình luận… Gõ @ để nhắc PIC" className="w-full p-3 rounded-xl border border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm" />{campaignMentionOptions.length > 0 && <div className="absolute bottom-full mb-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">{campaignMentionOptions.map(person => <button key={person.id} onMouseDown={event => event.preventDefault()} onClick={() => chooseCampaignMention(person)} className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-700"><b>{person.name}</b><span className="ml-2 text-xs text-gray-400">@{person.name.replace(/\s+/g, '')}</span></button>)}</div>}</div></section></div>}
          </div>
          {!campaignEditMode && <div className="p-5 border-t border-gray-200 dark:border-slate-700 flex gap-3 shrink-0 bg-white dark:bg-slate-800"><button onClick={() => { setTitle(selectedCampaign.name); setStart(selectedCampaign.start_date || ''); setDue(selectedCampaign.end_date || ''); setCampaignObjective(selectedCampaign.objective || ''); setCampaignBudget(selectedCampaign.budget ? String(selectedCampaign.budget) : ''); setPrimaryOwnerId(selectedCampaign.lead_id ? String(selectedCampaign.lead_id) : ''); setCampaignEditMode(true); }} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700"><Edit3 className="w-4 h-4" /> Chỉnh sửa</button><button onClick={completeCampaign} className="flex-1 px-4 py-2.5 bg-[#002e6d] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-colors"><CheckCircle2 className="w-4 h-4" /> Complete</button></div>}
        </div>
      )}
    </div>

    <div style={{ '--drawer-width': `${width}px` } as React.CSSProperties} className={`h-full bg-white dark:bg-slate-800 rounded-l-3xl shrink-0 ${createOpen ? 'w-full max-w-full md:w-[min(var(--drawer-width),100%)] md:min-w-0 shadow-drawer-task border-l border-blue-500/20' : 'w-0 min-w-0 shadow-none border-l-0 border-transparent'} absolute xl:relative right-0 top-0 z-[70] flex flex-col overflow-hidden ${!resizing ? 'transition-[width,min-width] duration-300 ease-out' : ''}`}>
      {createOpen && <>
      <div onMouseDown={() => setResizing(true)} className="hidden md:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0"><h3 className="font-bold text-xl text-gray-900 dark:text-white">Tạo mới</h3><button disabled={creating} aria-label="Đóng tạo mới" onClick={() => setCreateOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-gray-500" /></button></div>
      <form onSubmit={createItem} aria-busy={creating} className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="min-h-0 min-w-0 p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-4">
        <fieldset disabled={creating} className="min-w-0 space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 dark:bg-slate-900 p-1" role="tablist" aria-label="Loại khởi tạo">
          <button type="button" role="tab" aria-selected={creationType === 'campaign'} onClick={() => { setCreationType('campaign'); if (!campaignObjective) setCampaignObjective(description); }} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${creationType === 'campaign' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-gray-500'}`}>🎯 Chiến dịch</button>
          <button type="button" role="tab" aria-selected={creationType === 'project'} onClick={() => { setCreationType('project'); if (!description) setDescription(campaignObjective); if (primaryOwnerId) setOwnerIds(ids => Array.from(new Set([...ids, primaryOwnerId]))); }} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${creationType === 'project' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-gray-500'}`}>📁 Dự án</button>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Tên {creationType === 'project' ? 'dự án' : 'chiến dịch'} <span className="text-red-500">*</span></label>
          <input type="text" required value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-gray-400 shadow-sm" placeholder="Nhập tên..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="tw-calendar-picker relative"><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Ngày bắt đầu</label><input type="text" id="create-start-input" readOnly onClick={(e) => { if ((window as any).openCalendar) (window as any).openCalendar({ displayId: 'create-start-input', mode: 'single' }, e); }} value={start} onChange={(e) => setStart(e.target.value)} placeholder="dd/mm/yyyy" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white cursor-pointer shadow-sm" /></div>
          <div className="tw-calendar-picker relative"><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Ngày kết thúc</label><input type="text" id="create-end-input" readOnly onClick={(e) => { if ((window as any).openCalendar) (window as any).openCalendar({ displayId: 'create-end-input', mode: 'single' }, e); }} value={due} onChange={(e) => setDue(e.target.value)} placeholder="dd/mm/yyyy" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white cursor-pointer shadow-sm" /></div>
        </div>

        <div className="space-y-3"><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">Owner / PIC <span className="text-red-500">*</span></label>
          {creationType === 'project' ? <MultiSelect options={visiblePeople.map(p=>({value:String(p.id),label:p.name}))} value={ownerIds} primaryValue={primaryOwnerId} onPrimaryChange={setPrimaryOwnerId} onChange={(ids: string[]) => { setOwnerIds(ids); if (!ids.includes(primaryOwnerId)) setPrimaryOwnerId(ids[0] || ''); }} placeholder="Tìm và chọn PIC..." /> : <MultiSelect options={visiblePeople.map(p=>({value:String(p.id),label:p.name}))} value={primaryOwnerId ? [primaryOwnerId] : []} maxSelected={1} onChange={(ids: string[]) => setPrimaryOwnerId(ids[0] || '')} placeholder="Chọn người quản lý chiến dịch..." />}
          <p className="text-xs text-gray-500 dark:text-gray-400">PIC chính chịu trách nhiệm theo dõi tiến độ.</p>
        </div>

        {creationType === 'campaign' ? <div><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Mục tiêu chính / KPI</label><textarea value={campaignObjective} onChange={e=>setCampaignObjective(e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white" placeholder="Mục tiêu chiến dịch..." /></div> : <div><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Mô tả</label><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white" placeholder="Ghi chú nhanh..." /></div>}

        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm font-semibold text-primary hover:underline">{showAdvanced ? 'Ẩn tùy chọn nâng cao' : 'Hiển thị thêm tùy chọn'}</button>
        {showAdvanced && (creationType === 'project' ? <div className="space-y-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-900/40 p-4">
          <div><label className="block text-sm font-semibold mb-1">Thuộc Chiến dịch</label><select value={parentCampaignId} onChange={e=>selectParentCampaign(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"><option value="">Dự án độc lập</option>{campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="block text-sm font-semibold mb-1">Mức độ ưu tiên</label><select value={priority} onChange={e=>setPriority(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
          <div><label className="block text-sm font-semibold mb-1">Thành viên thực thi</label><MultiSelect options={visiblePeople.filter(p=>String(p.id)!==primaryOwnerId).map(p=>({value:String(p.id),label:p.name}))} value={executionMemberIds} onChange={setExecutionMemberIds} placeholder="Tag thành viên tham gia..." /></div>
          <div><label className="block text-sm font-semibold mb-1">Đính kèm</label><input value={attachmentUrl} onChange={e=>setAttachmentUrl(e.target.value)} placeholder="Dán link Brief, Drive, Figma..." className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800" /><label className="mt-2 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-primary/30 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5"><input type="file" className="sr-only" onChange={e=>setAttachmentFile(e.target.files?.[0] || null)} />{attachmentFile ? attachmentFile.name : 'Hoặc chọn tài liệu từ máy'}</label></div>
        </div> : <div className="space-y-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-900/40 p-4"><div><label className="block text-sm font-semibold mb-1">Ngân sách tổng</label><input type="number" min="0" value={campaignBudget} onChange={e=>setCampaignBudget(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800" placeholder="Nhập ngân sách dự kiến" /></div><div><label className="block text-sm font-semibold mb-2">Kênh triển khai</label><div className="grid grid-cols-2 gap-2 text-sm">{['Social Media','OOH','In-store','PR','Digital Ads','CRM'].map(channel => <label key={channel} className="flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 px-3 py-2"><input type="checkbox" checked={campaignChannels.includes(channel)} onChange={() => setCampaignChannels(values => values.includes(channel) ? values.filter(value => value !== channel) : [...values, channel])} />{channel}</label>)}</div></div><div><label className="block text-sm font-semibold mb-1">Tệp chiến lược</label><input value={attachmentUrl} onChange={e=>setAttachmentUrl(e.target.value)} placeholder="Dán link Strategy, Master Key Visual..." className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800" /><label className="mt-2 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-primary/30 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5"><input type="file" className="sr-only" onChange={e=>setAttachmentFile(e.target.files?.[0] || null)} />{attachmentFile ? attachmentFile.name : 'Hoặc chọn tài liệu từ máy'}</label></div></div>)}

        </fieldset>
      </div>
        <div className="p-5 border-t border-gray-200 dark:border-slate-700 flex gap-3 shrink-0 bg-white dark:bg-slate-800"><button type="button" disabled={creating} onClick={() => setCreateOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-slate-700">Hủy</button><button disabled={creating || !title.trim() || !primaryOwnerId} type="submit" className="min-w-0 flex-1 disabled:opacity-50 px-4 py-2.5 bg-[#002e6d] hover:bg-[#001f4d] text-white font-bold text-sm rounded-xl">{creating ? 'Đang tạo…' : `Tạo ${creationType === 'project' ? 'dự án' : 'chiến dịch'}`}</button></div>
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
