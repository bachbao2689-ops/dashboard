import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronDown, FolderKanban, MessageSquare, Plus, Users, X, Edit3, Trash2, CheckCircle2, Calendar, EyeOff } from 'lucide-react';
import { ConfirmDeleteModal } from '../components/common/ConfirmDeleteModal';
import { ConfirmHideModal } from '../components/common/ConfirmHideModal';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { CampaignPanel } from '../components/features/projects/CampaignPanel';

type Project = { id: string; name: string; description: string | null; status: string; start_date: string | null; due_date: string | null; priority: string; created_by: number | null; campaign_id?: string | null; department_id?: string | null };
type Person = { id: number; name: string; department_id: string | null; departments?: { name: string } | null };

const dateValue = (value: string) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
const priorityClass = (value: string) => value === 'high' || value === 'urgent' ? 'bg-red-100 text-red-700' : value === 'low' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700';
const statusClass = (value: string) => value === 'completed' ? 'bg-emerald-100 text-emerald-700' : value === 'active' || value === 'in-progress' ? 'bg-blue-100 text-blue-700' : value === 'planning' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600';


const MultiSelect = ({ options, value, onChange, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClick); return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = options.filter((o: any) => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={wrapperRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium cursor-pointer flex flex-wrap gap-1 min-h-[44px] shadow-sm">
        {value.length === 0 && <span className="text-gray-400">{placeholder}</span>}
        {value.map((v: string) => {
           const opt = options.find((o: any) => o.value === v);
           return <span key={v} className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs flex items-center gap-1">{opt?.label} <X size={12} onClick={(e) => { e.stopPropagation(); onChange(value.filter((x: string) => x !== v)); }} className="cursor-pointer hover:text-red-500"/></span>
        })}
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-[100] p-2">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm kiếm PIC..." className="w-full p-2 text-sm border-b border-gray-100 dark:border-slate-700 outline-none bg-transparent mb-2"/>
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
             {filtered.map((o: any) => (
               <label key={o.value} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer">
                 <input type="checkbox" checked={value.includes(o.value)} onChange={(e) => {
                    if (e.target.checked) onChange([...value, o.value]);
                    else onChange(value.filter((v: string) => v !== o.value));
                 }} className="rounded border-gray-300 text-primary focus:ring-primary"/>
                 <span className="text-sm font-medium">{o.label}</span>
               </label>
             ))}
             {filtered.length === 0 && <div className="text-center text-sm text-gray-400 p-2">Không tìm thấy</div>}
          </div>
        </div>
      )}
    </div>
  );
};


const getDueStatusColor = (endDateStr?: string | null) => {
  if (!endDateStr) return 'border-transparent';
  const end = new Date(endDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 3) return 'border-green-500';
  if (diffDays >= 2) return 'border-amber-500';
  return 'border-red-500';
};

export const Projects: React.FC = () => {
  const profile = useAuthStore(s => s.profile);
  const canCreate = profile?.role === 'admin' || profile?.role === 'manager' || profile?.employment_level === 'Leader';
  const [projects, setProjects] = useState<Project[]>([]); const [people, setPeople] = useState<Person[]>([]);
  const [members, setMembers] = useState<Record<string, string[]>>({}); const [selected, setSelected] = useState<Project | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToHide, setProjectToHide] = useState<Project | null>(null);
  const [subtaskToDelete, setSubtaskToDelete] = useState<string | null>(null); const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [start, setStart] = useState(''); const [due, setDue] = useState(''); const [priority, setPriority] = useState('medium'); const [ownerIds, setOwnerIds] = useState<string[]>([]);
  const [creationType, setCreationType] = useState<'project' | 'campaign'>('project'); const [showAdvanced, setShowAdvanced] = useState(false);
  const [primaryOwnerId, setPrimaryOwnerId] = useState(''); const [parentCampaignId, setParentCampaignId] = useState(''); const [departmentId, setDepartmentId] = useState('');
  const [campaignObjective, setCampaignObjective] = useState(''); const [campaignBudget, setCampaignBudget] = useState(''); const [campaignStatus, setCampaignStatus] = useState('planning');
  const [campaignChannels, setCampaignChannels] = useState<string[]>([]); const [attachmentUrl, setAttachmentUrl] = useState(''); const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignSubtasks, setCampaignSubtasks] = useState<any[]>([]); const [campaignComments, setCampaignComments] = useState<any[]>([]);
  const [campaignNewSubtask, setCampaignNewSubtask] = useState(''); const [campaignSubtaskOwner, setCampaignSubtaskOwner] = useState(''); const [campaignSubtaskDue, setCampaignSubtaskDue] = useState(''); const [showCampaignSubtaskForm, setShowCampaignSubtaskForm] = useState(false); const [campaignComment, setCampaignComment] = useState(''); const [campaignEditMode, setCampaignEditMode] = useState(false);
  const [subtasks, setSubtasks] = useState<any[]>([]); const [comments, setComments] = useState<any[]>([]); const [editingCommentId, setEditingCommentId] = useState<string | null>(null); const [editingCommentText, setEditingCommentText] = useState('');
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

  useEffect(() => {
    if (!createOpen) return;
    const startEl = document.getElementById('create-start-input');
    const dueEl = document.getElementById('create-end-input');
    const handleStartChange = (e: any) => setStart(e.target.value);
    const handleDueChange = (e: any) => setDue(e.target.value);
    startEl?.addEventListener('change', handleStartChange);
    dueEl?.addEventListener('change', handleDueChange);
    return () => {
      startEl?.removeEventListener('change', handleStartChange);
      dueEl?.removeEventListener('change', handleDueChange);
    };
  }, [createOpen]);

  const visiblePeople = useMemo(() => {
    if (profile?.role === 'admin' || profile?.role === 'manager') return people;
    return people.filter(person => person.department_id === profile?.department_id);
  }, [people, profile?.role, profile?.department_id]);
    const [hasComments, setHasComments] = useState<Record<string, boolean>>({});
  const [subtaskMembers, setSubtaskMembers] = useState<Record<string, string[]>>({});

  const load = async () => {
    const [projectRes, peopleRes, memberRes, commentRes, subtaskRes] = await Promise.all([
      supabase.from('projects').select('*, creator:created_by(name)').neq('status', 'archived').order('created_at', { ascending: false }),
      supabase.from('users').select('id,name,department_id,departments(name)').eq('is_active', true).order('name'),
      supabase.from('project_members').select('project_id,user_id'),
      supabase.from('project_comments').select('project_id'),
      supabase.from('project_subtasks').select('project_id,assignee_id')
    ]);
    if (projectRes.error) return toast.error('Không thể tải Project');
    setProjects(projectRes.data || []); setPeople((peopleRes.data as any) || []);
    setMembers((memberRes.data || []).reduce((acc: Record<string, string[]>, item: any) => ({ ...acc, [item.project_id]: [...(acc[item.project_id] || []), String(item.user_id)] }), {}));
    
    const commentsMap: Record<string, boolean> = {};
    (commentRes.data || []).forEach(c => commentsMap[c.project_id] = true);
    setHasComments(commentsMap);
    const { data: campaignData } = await supabase.from('campaigns').select('id,name').order('name');
    setCampaigns(campaignData || []);

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
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const handleChange = (e: any) => {
      const id = e.target?.id;
      if (id === 'subtask-due-input') setSubtaskDue(e.target.value);
      else if (id && id.startsWith('edit-subtask-due-')) setEditSubtaskDue(e.target.value);
    };
    document.addEventListener('change', handleChange);
    return () => document.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => { if (!selected) return; (async () => { const [s, c] = await Promise.all([supabase.from('project_subtasks').select('*, assignee:assignee_id(name)').eq('project_id', selected.id).order('created_at'), supabase.from('project_comments').select('*, author:author_id(name)').eq('project_id', selected.id).order('created_at')]); setSubtasks(s.data || []); setComments(c.data || []); })(); }, [selected]);
  useEffect(() => { if (!selectedCampaign) return; (async () => { const [subtaskRes, commentRes] = await Promise.all([supabase.from('campaign_subtasks').select('*, assignee:assignee_id(name)').eq('campaign_id', selectedCampaign.id).order('created_at'), supabase.from('activity_log').select('*, user:user_id(name)').eq('entity_type', 'campaign').eq('entity_id', selectedCampaign.id).eq('action', 'comment').order('created_at')]); setCampaignSubtasks(subtaskRes.data || []); setCampaignComments(commentRes.data || []); })(); }, [selectedCampaign]);
  
  
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
        const { data: stData } = await supabase.from('project_subtasks').select('assignee_id').eq('project_id', entityId);
        stData?.forEach(s => { if (s.assignee_id) userIds.add(Number(s.assignee_id)); });
      } else {
        const c = campaigns.find(x => x.id === entityId) || selectedCampaign;
        if (c?.created_by) userIds.add(Number(c.created_by));
        if (c?.lead_id) userIds.add(Number(c.lead_id));
        const { data: stData } = await supabase.from('campaign_subtasks').select('assignee_id').eq('campaign_id', entityId);
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
    setTitle(''); setDescription(''); setStart(''); setDue(''); setPriority('medium'); setOwnerIds([]); setPrimaryOwnerId('');
    setParentCampaignId(''); setDepartmentId(profile?.department_id || ''); setCampaignObjective(''); setCampaignBudget(''); setCampaignStatus('planning'); setCampaignChannels([]); setAttachmentUrl(''); setAttachmentFile(null); setShowAdvanced(false);
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
    e.preventDefault(); if (!title.trim() || !primaryOwnerId) return;
    if (creationType === 'campaign') {
      const strategyAsset = await resolveAttachmentUrl('campaigns');
      if (strategyAsset === undefined) return;
      const { data: campaign, error } = await supabase.from('campaigns').insert({
        name: title.trim(), objective: campaignObjective || null, start_date: parseYMD(start), end_date: parseYMD(due),
        budget: campaignBudget ? Number(campaignBudget) : null, channels: campaignChannels, lead_id: Number(primaryOwnerId), status: campaignStatus,
        department_id: profile?.department_id || null, workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca', created_by: profile?.id || 11
      }).select().single();
      if (error) { console.error('Campaign create failed', error); return toast.error(`Không thể tạo Campaign: ${error?.message || 'Lỗi không xác định'}`); }
      if (strategyAsset && campaign && profile?.id) await supabase.from('activity_log').insert({ workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca', user_id: profile.id, action: 'attachment_added', entity_type: 'campaign', entity_id: campaign.id, metadata: { strategy_asset: strategyAsset } });
      window.dispatchEvent(new Event('campaigns:changed'));
      toast.success('Đã tạo Campaign');
      await notifyStakeholders('campaign', campaign.id, 'đã tạo chiến dịch mới: ' + campaign.name);
    } else {
      const projectAttachment = await resolveAttachmentUrl('projects');
      if (projectAttachment === undefined) return;
      const assigneeIds = Array.from(new Set([primaryOwnerId, ...ownerIds]));
      const { data, error } = await supabase.from('projects').insert({
        name: title.trim(), description: description || null, start_date: parseYMD(start), due_date: parseYMD(due), priority,
        status: 'active', campaign_id: parentCampaignId || null, department_id: departmentId || profile?.department_id || null,
        assets_url: projectAttachment, workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca', created_by: profile?.id || 11
      }).select().single();
      if (error || !data) { console.error('Project create failed', error); return toast.error(`Không thể tạo Project: ${error?.message || 'Lỗi không xác định'}`); }
      if (assigneeIds.length) {
        const { error: memberError } = await supabase.from('project_members').insert(assigneeIds.map(user_id => ({ project_id: data.id, user_id: Number(user_id) })));
        if (memberError) toast.error('Project đã tạo nhưng không lưu được toàn bộ PIC');
      }
      toast.success('Đã tạo Project');
      await notifyStakeholders('project', data.id, 'đã tạo dự án mới: ' + data.name);
    }
    setCreateOpen(false); resetCreateForm(); await load();
  };
const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');
  const [editSubtaskOwner, setEditSubtaskOwner] = useState('');
  const [editSubtaskDue, setEditSubtaskDue] = useState('');

  
  const executeRemoveSubtask = async () => {
    if (!subtaskToDelete) return;
    await supabase.from('project_subtasks').update({ status: 'deleted' }).eq('id', subtaskToDelete);
    setSubtasks(subtasks.filter(s => s.id !== subtaskToDelete));
    setSubtaskToDelete(null);
    window.dispatchEvent(new Event('tasks:changed'));
  };

  const removeSubtask = (id: string) => {
    setSubtaskToDelete(id);
  };

  const saveEditedSubtask = async (id: string) => {
    await supabase.from('project_subtasks').update({ title: editSubtaskTitle, assignee_id: editSubtaskOwner ? Number(editSubtaskOwner) : null, due_date: editSubtaskDue || null }).eq('id', id);
    const { data } = await supabase.from('project_subtasks').select('*, assignee:assignee_id(name)').eq('id', id).single();
    setSubtasks(subtasks.map(s => s.id === id ? data : s)); setEditingSubtaskId(null);
  };

  const saveInlineEdit = async () => {
    if (!title || !selected) return;
    const { data, error } = await supabase.from('projects').update({ name: title, description, start_date: start || null, due_date: due || null, priority }).eq('id', selected.id).select().single();
    if (error || !data) return toast.error('Lỗi cập nhật');
    await supabase.from('project_members').delete().eq('project_id', selected.id);
    if (ownerIds.length) await supabase.from('project_members').insert(ownerIds.map(user_id => ({ project_id: data.id, user_id: Number(user_id) })));
    setEditMode(false); load(); toast.success('Đã lưu thông tin');
    await notifyStakeholders('project', selected.id, 'đã cập nhật thông tin dự án: ' + title);
    setSelected({ ...selected, name: title, description, start_date: start || null, due_date: due || null, priority });
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
  const addComment = async () => { if (!selected || !comment) return; await supabase.from('project_comments').insert({ project_id: selected.id, author_id: profile?.id || 11, body: comment }); await notifyStakeholders('project', selected.id, 'đã bình luận trong dự án: ' + selected.name); setComment(''); setSelected({ ...selected }); };
  const addCampaignSubtask = async () => { if (!selectedCampaign || !campaignNewSubtask.trim()) return; const { error } = await supabase.from('campaign_subtasks').insert({ campaign_id: selectedCampaign.id, title: campaignNewSubtask.trim(), assignee_id: campaignSubtaskOwner ? Number(campaignSubtaskOwner) : null, due_date: campaignSubtaskDue || null });
  if (!error && campaignSubtaskOwner) await notifyStakeholders('campaign', selectedCampaign.id, 'đã giao subtask mới cho bạn: ' + campaignNewSubtask.trim(), campaignSubtaskOwner); if (error) return toast.error('Không thể tạo Subtask Campaign'); setCampaignNewSubtask(''); setCampaignSubtaskOwner(''); setCampaignSubtaskDue(''); setShowCampaignSubtaskForm(false); setSelectedCampaign({ ...selectedCampaign }); };
  const addCampaignComment = async () => { if (!selectedCampaign || !campaignComment.trim() || !profile?.id) return; const { error } = await supabase.from('activity_log').insert({ workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca', user_id: profile.id, action: 'comment', entity_type: 'campaign', entity_id: selectedCampaign.id, metadata: { body: campaignComment.trim() } }); if (error) return toast.error('Không thể gửi bình luận'); await notifyStakeholders('campaign', selectedCampaign.id, 'đã bình luận trong chiến dịch: ' + selectedCampaign.name); setCampaignComment(''); setSelectedCampaign({ ...selectedCampaign }); };
  const completeCampaign = async () => { if (!selectedCampaign) return; const { error } = await supabase.from('campaigns').update({ status: 'completed' }).eq('id', selectedCampaign.id); if (error) return toast.error('Không thể hoàn thành Campaign'); const updated = { ...selectedCampaign, status: 'completed' }; setSelectedCampaign(updated); window.dispatchEvent(new Event('campaigns:changed')); toast.success('Đã hoàn thành Campaign');
    await notifyStakeholders('campaign', selectedCampaign.id, 'đã đánh dấu hoàn thành chiến dịch: ' + selectedCampaign.name); };
  const saveCampaignEdit = async () => { if (!selectedCampaign || !title.trim()) return; const { data, error } = await supabase.from('campaigns').update({ name: title.trim(), objective: campaignObjective || null, start_date: start || null, end_date: due || null, budget: campaignBudget ? Number(campaignBudget) : null, lead_id: primaryOwnerId ? Number(primaryOwnerId) : null }).eq('id', selectedCampaign.id).select('*, lead:lead_id(name), creator:created_by(name)').single(); if (error || !data) return toast.error('Không thể cập nhật Campaign'); setSelectedCampaign(data); setCampaignEditMode(false); window.dispatchEvent(new Event('campaigns:changed')); toast.success('Đã lưu Campaign');
    await notifyStakeholders('campaign', selectedCampaign.id, 'đã cập nhật thông tin chiến dịch: ' + title); };
  return (
  <div className="h-full flex overflow-hidden relative">
    {/* Left Side: Projects List */}
    <div className={`h-full flex flex-col min-w-0 transition-all duration-300 flex-1 p-1 space-y-6 overflow-auto ${panelOpen ? 'hidden md:flex pr-4' : ''}`}>
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><FolderKanban className="text-primary"/> Projects/Campaigns</h1><p className="text-sm text-gray-500 mt-1">Theo dõi project, campaign, PIC, subtask và trao đổi.</p></div>{canCreate && <button onClick={() => { resetCreateForm(); setCreationType('project'); setSelected(null); setSelectedCampaign(null); setCreateOpen(true); }} className="flex items-center gap-2 bg-[#002e6d] text-white px-4 py-2 rounded-xl hover:bg-[#001f4d] transition-colors shadow-sm"><Plus className="w-4 h-4" /><span>Add</span></button>}</div><CampaignPanel onSelect={(campaign) => { setSelected(null); setCreateOpen(false); setSelectedCampaign(campaign); }}/><section className="card-hub rounded-2xl overflow-hidden shrink-0"><div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700"><button onClick={() => setProjectsExpanded(value => !value)} aria-expanded={projectsExpanded} className="inline-flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white"><ChevronDown className={`text-gray-500 transition-transform ${projectsExpanded ? '' : '-rotate-90'}`} size={17}/><FolderKanban className="text-primary" size={16}/> Projects <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{projects.length}</span></button></div>{projectsExpanded && <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-50 dark:bg-slate-800 text-xs uppercase tracking-wide text-gray-500"><tr><th className="p-4">Project</th><th>Owner</th><th>Dates</th><th>Priority</th><th>Status</th><th className="w-12"/></tr></thead><tbody>{projects.map(project => <tr key={project.id} onClick={() => { setSelectedCampaign(null); setCreateOpen(false); setSelected(project); }} className="group border-t border-gray-100 dark:border-slate-800 cursor-pointer hover:bg-primary/5">
<td className="p-4">
  <div className="flex items-center gap-2">
    <b className="text-gray-900 dark:text-white">{project.name}</b>
    {hasComments[project.id] && <span title="Có bình luận"><MessageSquare size={14} className="text-blue-500" /></span>}
  </div>
  <p className="text-xs text-gray-500 truncate max-w-[250px] md:max-w-[400px] lg:max-w-[500px] mt-1">{project.description || 'No description'}</p>
</td>
<td>
  <div className="flex items-center gap-2">
    <div className="flex -space-x-2">
      {(members[project.id] || []).slice(0,4).map(id => <span key={id} title={people.find(p=>String(p.id)===id)?.name} className="w-7 h-7 rounded-full bg-primary/15 border-2 border-white dark:border-slate-900 grid place-items-center text-[10px] font-bold z-10">{people.find(p => String(p.id) === id)?.name?.[0] || '?'}</span>)}
    </div>
    {subtaskMembers[project.id] && subtaskMembers[project.id].length > 0 && (
      <>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <div className="flex -space-x-2">
          {subtaskMembers[project.id].slice(0,4).map(id => <span key={id} title={(people.find(p=>String(p.id)===id)?.name || 'Unknown') + ' (Subtask PIC)'} className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 border-2 border-white dark:border-slate-900 grid place-items-center text-[10px] font-bold z-10">{people.find(p => String(p.id) === id)?.name?.[0] || '?'}</span>)}
        </div>
      </>
    )}
  </div>
</td>
<td className="text-sm text-gray-600 dark:text-gray-300"><div className="flex items-center gap-2"><span>{dateValue(project.start_date || '')} – {dateValue(project.due_date || '')}</span>{project.due_date && <div className={`w-3.5 h-3.5 rounded-full border-[2.5px] ${getDueStatusColor(project.due_date)}`} title={`Hạn chót: ${dateValue(project.due_date)}`} />}</div></td>
<td><span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${priorityClass(project.priority || 'medium')}`}>{project.priority || 'medium'}</span></td>
<td><span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusClass(project.status || 'active')}`}>{project.status || 'active'}</span></td>
<td className="w-16 pr-4">{canCreate && <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); void archiveProject(project); }} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Ẩn"><EyeOff size={16}/></button><button onClick={(e) => { e.stopPropagation(); void removeProject(project); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa"><Trash2 size={16}/></button></div>}</td>
</tr>)}</tbody></table>{!projects.length && <div className="p-12 text-center text-gray-500">Chưa có Project nào.</div>}</div>}</section>
  
  
    </div>

    {/* Right Side: Detail Panel */}
    <div style={window.innerWidth >= 768 ? { width: panelOpen ? width : 0, minWidth: panelOpen ? width : 0 } : { width: panelOpen ? '100%' : 0 }} className={`h-full bg-white dark:bg-slate-800 rounded-l-3xl shadow-xl shrink-0 ${panelOpen ? 'border-l-4 border-l-amber-400' : 'border-l-0 border-transparent'} absolute md:relative right-0 top-0 z-[60] flex flex-col overflow-hidden ${!resizing ? 'transition-[width,min-width] duration-300' : ''}`}>
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
              <div className="flex gap-2"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-primary border border-blue-100">Project</span><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">{selected?.priority || 'medium'} Priority</span></div>
      <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 text-sm"><div><p className="text-[10px] uppercase text-gray-400">Owners</p><div className="mt-1 font-semibold line-clamp-2">{(members[selected?.id || ''] || []).map(id=>people.find(p=>String(p.id)===id)?.name).filter(Boolean).join(', ') || 'Unassigned'}</div></div><div><p className="text-[10px] uppercase text-gray-400">Timeline</p><div className="mt-1 font-semibold">{dateValue(selected?.start_date || '')} – {dateValue(selected?.due_date || '')}</div></div><div><p className="text-[10px] uppercase text-gray-400">Created by</p><div className="mt-1 font-semibold line-clamp-1">{(selected as any)?.creator?.name || '---'}</div></div></div>
      <section><h3 className="font-bold text-sm mb-2">Description</h3><div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 text-sm text-gray-600 dark:text-gray-300">{selected?.description || 'No description yet.'}</div></section>
      <section><h3 className="font-bold text-sm flex gap-2 items-center mb-3"><Users size={16}/> Subtasks</h3><div className="space-y-2">{subtasks.map(s=>(
  <div key={s.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-sm group relative">
    {editingSubtaskId === s.id ? (
      <div className="space-y-2">
         <input value={editSubtaskTitle} onChange={e=>setEditSubtaskTitle(e.target.value)} className="w-full p-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none rounded-lg" />
         <div className="grid grid-cols-2 gap-2">
           <select value={editSubtaskOwner} onChange={e=>setEditSubtaskOwner(e.target.value)} className="p-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none rounded-lg"><option value="">Chọn PIC</option>{visiblePeople.map(p=><option key={p.id} value={p.id}>{p.name} {p.departments?.name ? '('+p.departments.name+')' : ''}</option>)}</select>
           <div className="tw-calendar-picker relative w-full"><input type="text" id={`edit-subtask-due-${s.id}`} readOnly onClick={(e) => { if ((window as any).openCalendar) (window as any).openCalendar({ displayId: `edit-subtask-due-${s.id}`, mode: 'single' }, e); }} value={editSubtaskDue} placeholder="dd/mm/yyyy" className="p-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none rounded-lg w-full cursor-pointer" /></div>
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
      <b className="text-gray-900 dark:text-white block">{s.title}</b>
      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
         <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-md text-gray-700 dark:text-gray-300 font-medium">
           {s.assignee ? (
             <>
               <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[8px] uppercase">{s.assignee.name[0]}</span>
               {s.assignee.name}
             </>
           ) : 'Unassigned'}
         </span>
         {s.due_date && <span className="flex items-center gap-1 font-medium text-gray-600 dark:text-gray-400"><Calendar size={12}/> {dateValue(s.due_date)}</span>}
      </div>
    </div>
  </div>
  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 shrink-0">
          <button onClick={()=>{ setEditingSubtaskId(s.id); setEditSubtaskTitle(s.title); setEditSubtaskOwner(String(s.assignee_id || '')); setEditSubtaskDue(s.due_date || ''); }} className="text-gray-400 hover:text-primary"><Edit3 size={14}/></button>
          <button onClick={()=>removeSubtask(s.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
        </div>
      </div>
    )}
  </div>
))}</div>{!showSubtaskForm && <button onClick={() => setShowSubtaskForm(true)} className="mt-3 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20 w-full text-center border-dashed"><Plus size={16} className="inline mr-1" /> Thêm Subtask</button>}
{showSubtaskForm && <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3"><input value={newSubtask} onChange={e=>setNewSubtask(e.target.value)} placeholder="Tên subtask..." className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"/><div className="grid grid-cols-2 gap-2"><select value={subtaskOwner} onChange={e=>setSubtaskOwner(e.target.value)} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"><option value="">Chọn PIC</option>{visiblePeople.map(p=><option key={p.id} value={p.id}>{p.name} {p.departments?.name ? '('+p.departments.name+')' : ''}</option>)}</select><div className="tw-calendar-picker relative w-full"><input type="text" id="subtask-due-input" readOnly onClick={(e) => { if ((window as any).openCalendar) (window as any).openCalendar({ displayId: 'subtask-due-input', mode: 'single' }, e); }} value={subtaskDue} placeholder="dd/mm/yyyy" className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm w-full cursor-pointer"/></div></div><div className="flex gap-2 justify-end"><button onClick={() => setShowSubtaskForm(false)} className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700">Hủy</button><button onClick={() => { addSubtask(); setShowSubtaskForm(false); }} className="px-3 py-1.5 bg-[#002e6d] text-white text-sm font-semibold rounded-lg shadow-sm">Giao việc</button></div></div>}</section>
      <section><h3 className="font-bold text-sm flex gap-2 items-center mb-3"><MessageSquare size={16}/> Activity & Comments</h3><div className="space-y-2">{comments.map(c=>(
  <div key={c.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm group relative">
    <div className="flex justify-between items-start">
      <b>{c.author?.name || 'Member'}</b>
      {true && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          <button onClick={() => { setEditingCommentId(c.id); setEditingCommentText(c.body); }} className="text-gray-400 hover:text-primary"><Edit3 size={14}/></button>
          <button onClick={() => removeComment(c.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
        </div>
      )}
    </div>
    {editingCommentId === c.id ? (
      <div className="mt-2">
        <textarea value={editingCommentText} onChange={e=>setEditingCommentText(e.target.value)} className="w-full p-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg outline-none" rows={2} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEditedComment(c.id); } }} />
        <div className="flex justify-end gap-2 mt-1">
          <button onClick={() => setEditingCommentId(null)} className="text-xs text-gray-500 hover:text-gray-700">Hủy</button>
          <button onClick={() => saveEditedComment(c.id)} className="text-xs text-primary font-bold">Lưu</button>
        </div>
      </div>
    ) : (
      <p className="whitespace-pre-wrap mt-1">{c.body}</p>
    )}
  </div>
))}</div><div className="mt-4 relative"><textarea value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (e.nativeEvent.isComposing) return; if (comment.trim()) { addComment(); } } }} rows={3} placeholder="Viết bình luận cho team... (Nhấn Enter để gửi)" className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm" /></div></section>
            </div>
            )}
          </div>
          {!editMode && (<div className="p-5 border-t border-gray-200 dark:border-slate-700 flex gap-3 shrink-0 bg-white dark:bg-slate-800"><button onClick={() => { setTitle(selected.name); setDescription(selected.description || ''); setStart(selected.start_date || ''); setDue(selected.due_date || ''); setPriority(selected.priority || 'medium'); setOwnerIds(members[selected.id] || []); setEditMode(true); }} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"><Edit3 className="w-4 h-4" /> Chỉnh sửa</button><button onClick={completeProject} className="flex-1 px-4 py-2.5 bg-[#002e6d] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#001f4d] transition-colors"><CheckCircle2 className="w-4 h-4" /> Complete</button></div>)}
        </div>
      )}
      {selectedCampaign && (
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
            <h3 className="font-bold text-xl text-gray-900 dark:text-white line-clamp-1">{selectedCampaign.name}</h3>
            <button onClick={() => setSelectedCampaign(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-gray-500" /></button>
          </div>
          <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
            {campaignEditMode ? <div className="space-y-5"><div><label className="text-xs font-semibold text-gray-500 uppercase">Tên Campaign</label><input value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold outline-none mt-1" /></div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-gray-500 uppercase">Bắt đầu</label><input type="date" value={start} onChange={e=>setStart(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"/></div><div><label className="text-xs font-semibold text-gray-500 uppercase">Kết thúc</label><input type="date" value={due} onChange={e=>setDue(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"/></div></div><div><label className="text-xs font-semibold text-gray-500 uppercase">Owner / PIC</label><select value={primaryOwnerId} onChange={e=>setPrimaryOwnerId(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"><option value="">Chọn PIC</option>{visiblePeople.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div><div><label className="text-xs font-semibold text-gray-500 uppercase">Mục tiêu / KPI</label><textarea value={campaignObjective} onChange={e=>setCampaignObjective(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none min-h-24 mt-1 text-sm" /></div><div><label className="text-xs font-semibold text-gray-500 uppercase">Ngân sách</label><input type="number" min="0" value={campaignBudget} onChange={e=>setCampaignBudget(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm" /></div><div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100 dark:border-slate-700"><button onClick={() => setCampaignEditMode(false)} className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 rounded-xl text-sm font-semibold">Hủy</button><button onClick={saveCampaignEdit} className="px-5 py-2.5 bg-[#002e6d] text-white rounded-xl text-sm font-semibold">Lưu Campaign</button></div></div> : <div className="space-y-7"><div className="flex gap-2"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-primary border border-blue-100">Campaign</span><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 capitalize">{selectedCampaign.status || 'planning'}</span></div><div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 text-sm"><div><p className="text-[10px] uppercase text-gray-400">Owner</p><div className="mt-1 font-semibold">{(selectedCampaign as any)?.lead?.name || 'Unassigned'}</div></div><div><p className="text-[10px] uppercase text-gray-400">Timeline</p><div className="mt-1 font-semibold">{dateValue(selectedCampaign.start_date || '')} – {dateValue(selectedCampaign.end_date || '')}</div></div><div><p className="text-[10px] uppercase text-gray-400">Created by</p><div className="mt-1 font-semibold">{(selectedCampaign as any)?.creator?.name || '---'}</div></div></div><section><h3 className="font-bold text-sm mb-2">Description</h3><div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 text-sm text-gray-600 dark:text-gray-300">{selectedCampaign.objective || 'Chưa có mục tiêu.'}</div></section><section><h3 className="font-bold text-sm flex gap-2 items-center mb-3"><Users size={16}/> Subtasks</h3><div className="space-y-2">{campaignSubtasks.map(subtask => <div key={subtask.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-sm"><b className="text-gray-900 dark:text-white">{subtask.title}</b><div className="flex gap-3 mt-1.5 text-xs text-gray-500"><span>{subtask.assignee?.name || 'Unassigned'}</span>{subtask.due_date && <span>{dateValue(subtask.due_date)}</span>}</div></div>)}</div>{!showCampaignSubtaskForm && <button onClick={() => setShowCampaignSubtaskForm(true)} className="mt-3 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20 w-full text-center border-dashed"><Plus size={16} className="inline mr-1" /> Thêm Subtask</button>}{showCampaignSubtaskForm && <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3"><input value={campaignNewSubtask} onChange={e=>setCampaignNewSubtask(e.target.value)} placeholder="Tên subtask..." className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"/><div className="grid grid-cols-2 gap-2"><select value={campaignSubtaskOwner} onChange={e=>setCampaignSubtaskOwner(e.target.value)} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"><option value="">Chọn PIC</option>{visiblePeople.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><input type="date" value={campaignSubtaskDue} onChange={e=>setCampaignSubtaskDue(e.target.value)} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"/></div><div className="flex gap-2 justify-end"><button onClick={() => setShowCampaignSubtaskForm(false)} className="px-3 py-1.5 text-sm rounded-lg">Hủy</button><button onClick={addCampaignSubtask} className="px-3 py-1.5 bg-[#002e6d] text-white text-sm font-semibold rounded-lg">Giao việc</button></div></div>}</section><section><h3 className="font-bold text-sm flex gap-2 items-center mb-3"><MessageSquare size={16}/> Activity & Comments</h3><div className="space-y-2">{campaignComments.map(activity => <div key={activity.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm"><b>{activity.user?.name || 'Member'}</b><p className="whitespace-pre-wrap mt-1">{activity.metadata?.body}</p></div>)}</div><div className="mt-4"><textarea value={campaignComment} onChange={e=>setCampaignComment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && campaignComment.trim()) { e.preventDefault(); addCampaignComment(); } }} rows={3} placeholder="Viết bình luận cho team... (Nhấn Enter để gửi)" className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm" /></div></section></div>}
          </div>
          {!campaignEditMode && <div className="p-5 border-t border-gray-200 dark:border-slate-700 flex gap-3 shrink-0 bg-white dark:bg-slate-800"><button onClick={() => { setTitle(selectedCampaign.name); setStart(selectedCampaign.start_date || ''); setDue(selectedCampaign.end_date || ''); setCampaignObjective(selectedCampaign.objective || ''); setCampaignBudget(selectedCampaign.budget ? String(selectedCampaign.budget) : ''); setPrimaryOwnerId(selectedCampaign.lead_id ? String(selectedCampaign.lead_id) : ''); setCampaignEditMode(true); }} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700"><Edit3 className="w-4 h-4" /> Chỉnh sửa</button><button onClick={completeCampaign} className="flex-1 px-4 py-2.5 bg-[#002e6d] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#001f4d]"><CheckCircle2 className="w-4 h-4" /> Complete</button></div>}
        </div>
      )}
    </div>

    <div style={window.innerWidth >= 768 ? { width: createOpen ? width : 0, minWidth: createOpen ? width : 0 } : { width: createOpen ? '100%' : 0 }} className={`h-full bg-white dark:bg-slate-800 rounded-l-3xl shadow-xl shrink-0 ${createOpen ? 'border-l-4 border-l-amber-400' : 'border-l-0 border-transparent'} absolute md:relative right-0 top-0 z-[70] flex flex-col overflow-hidden ${!resizing ? 'transition-[width,min-width] duration-300 ease-out' : ''}`}>
      {createOpen && <>
      <div onMouseDown={() => setResizing(true)} className="hidden md:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0"><h3 className="font-bold text-xl text-gray-900 dark:text-white">Tạo mới</h3><button onClick={() => setCreateOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-gray-500" /></button></div>
      <form onSubmit={createItem} className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 dark:bg-slate-900 p-1" role="tablist" aria-label="Loại khởi tạo">
          <button type="button" role="tab" aria-selected={creationType === 'campaign'} onClick={() => setCreationType('campaign')} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${creationType === 'campaign' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-gray-500'}`}>🎯 Chiến dịch</button>
          <button type="button" role="tab" aria-selected={creationType === 'project'} onClick={() => setCreationType('project')} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${creationType === 'project' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-gray-500'}`}>📁 Dự án</button>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Tên {creationType === 'project' ? 'dự án' : 'chiến dịch'} <span className="text-red-500">*</span></label>
          <input type="text" required value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-gray-400 shadow-sm" placeholder="Nhập tên..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="tw-calendar-picker relative"><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Ngày bắt đầu</label><input type="text" id="create-start-input" readOnly onClick={(e) => { if ((window as any).openCalendar) (window as any).openCalendar({ displayId: 'create-start-input', mode: 'single' }, e); }} value={start} placeholder="dd/mm/yyyy" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white cursor-pointer shadow-sm" /></div>
          <div className="tw-calendar-picker relative"><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Ngày kết thúc</label><input type="text" id="create-end-input" readOnly onClick={(e) => { if ((window as any).openCalendar) (window as any).openCalendar({ displayId: 'create-end-input', mode: 'single' }, e); }} value={due} placeholder="dd/mm/yyyy" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white cursor-pointer shadow-sm" /></div>
        </div>

        <div><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Owner / PIC <span className="text-red-500">*</span></label><select required value={primaryOwnerId} onChange={e=>setPrimaryOwnerId(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white"><option value="">Chọn người phụ trách</option>{visiblePeople.map(p=><option key={p.id} value={p.id}>{p.name}{p.departments?.name ? ` (${p.departments.name})` : ''}</option>)}</select></div>

        {creationType === 'campaign' ? <div><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Mục tiêu chính / KPI</label><textarea value={campaignObjective} onChange={e=>setCampaignObjective(e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white" placeholder="Mục tiêu chiến dịch..." /></div> : <div><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Mô tả</label><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white" placeholder="Ghi chú nhanh..." /></div>}

        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm font-semibold text-primary hover:underline">{showAdvanced ? 'Ẩn tùy chọn nâng cao' : 'Hiển thị thêm tùy chọn'}</button>
        {showAdvanced && (creationType === 'project' ? <div className="space-y-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-900/40 p-4">
          <div><label className="block text-sm font-semibold mb-1">Thuộc Chiến dịch</label><select value={parentCampaignId} onChange={e=>setParentCampaignId(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"><option value="">Dự án độc lập</option>{campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="block text-sm font-semibold mb-1">Mức độ ưu tiên</label><select value={priority} onChange={e=>setPriority(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
          <div><label className="block text-sm font-semibold mb-1">Thành viên thực thi</label><MultiSelect options={visiblePeople.filter(p=>String(p.id)!==primaryOwnerId).map(p=>({value:String(p.id),label:p.name}))} value={ownerIds} onChange={setOwnerIds} placeholder="Tag thành viên tham gia..." /></div>
          <div><label className="block text-sm font-semibold mb-1">Đính kèm</label><input value={attachmentUrl} onChange={e=>setAttachmentUrl(e.target.value)} placeholder="Dán link Brief, Drive, Figma..." className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800" /><label className="mt-2 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-primary/30 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5"><input type="file" className="sr-only" onChange={e=>setAttachmentFile(e.target.files?.[0] || null)} />{attachmentFile ? attachmentFile.name : 'Hoặc chọn tài liệu từ máy'}</label></div>
        </div> : <div className="space-y-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-900/40 p-4"><div><label className="block text-sm font-semibold mb-1">Ngân sách tổng</label><input type="number" min="0" value={campaignBudget} onChange={e=>setCampaignBudget(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800" placeholder="Nhập ngân sách dự kiến" /></div><div><label className="block text-sm font-semibold mb-2">Kênh triển khai</label><div className="grid grid-cols-2 gap-2 text-sm">{['Social Media','OOH','In-store','PR','Digital Ads','CRM'].map(channel => <label key={channel} className="flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 px-3 py-2"><input type="checkbox" checked={campaignChannels.includes(channel)} onChange={() => setCampaignChannels(values => values.includes(channel) ? values.filter(value => value !== channel) : [...values, channel])} />{channel}</label>)}</div></div><div><label className="block text-sm font-semibold mb-1">Tệp chiến lược</label><input value={attachmentUrl} onChange={e=>setAttachmentUrl(e.target.value)} placeholder="Dán link Strategy, Master Key Visual..." className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800" /><label className="mt-2 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-primary/30 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5"><input type="file" className="sr-only" onChange={e=>setAttachmentFile(e.target.files?.[0] || null)} />{attachmentFile ? attachmentFile.name : 'Hoặc chọn tài liệu từ máy'}</label></div></div>)}

      </div>
        <div className="p-5 border-t border-gray-200 dark:border-slate-700 flex gap-3 shrink-0 bg-white dark:bg-slate-800"><button type="button" onClick={() => setCreateOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-slate-700">Hủy</button><button type="submit" className="flex-1 px-4 py-2.5 bg-[#002e6d] hover:bg-[#001f4d] text-white font-bold text-sm rounded-xl">Tạo {creationType === 'project' ? 'dự án' : 'chiến dịch'}</button></div>
      </form>
      </>}
    </div>
      <ConfirmDeleteModal isOpen={!!projectToDelete} title="Xóa Dự án" message={`Bạn có chắc muốn xóa dự án "${projectToDelete?.name}"? Tất cả subtask của dự án này cũng sẽ bị xóa.`} onConfirm={executeRemoveProject} onCancel={() => setProjectToDelete(null)} />
      <ConfirmDeleteModal isOpen={!!subtaskToDelete} title="Xóa Subtask" message="Bạn có chắc muốn xóa subtask này?" onConfirm={executeRemoveSubtask} onCancel={() => setSubtaskToDelete(null)} />
    <ConfirmHideModal isOpen={!!projectToHide} title="Ẩn Dự án" message={`Bạn có chắc muốn ẩn dự án "${projectToHide?.name}"? Dự án sẽ được đưa vào lưu trữ và có thể khôi phục sau.`} onConfirm={executeHideProject} onCancel={() => setProjectToHide(null)} />
  </div>
);
};
