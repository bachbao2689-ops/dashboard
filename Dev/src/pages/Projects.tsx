import {EntityStatusField} from '../components/features/projects/EntityStatusField';
import {useReadEntityNotifications} from '../hooks/useReadEntityNotifications';
import {ActionButton} from '../components/common/ActionButton';
import {StatusBadge} from '../components/common/StatusBadge';
import {MultiSelect} from '../components/common/MultiSelect';
import React from 'react';
import {Link} from 'react-router-dom';
import {officialReadEnabled} from '../services/officialReadOnly';
import {WorkflowTrackingSummary} from '../components/features/projects/WorkflowTrackingSummary';
import {TaskDetailPanel} from '../components/features/tasks/TaskDetailPanel';
import {TaskDescriptionViewer} from '../components/features/tasks/TaskDescriptionViewer';
import {Avatar} from '../components/common/Avatar';
import {SmartCommentInput} from '../components/features/comments/SmartCommentInput';
import {CommentMessage} from '../components/features/comments/CommentMessage';
import {ChevronDown,ChevronRight,FolderKanban,MessageSquare,Plus,Users,X,Trash2,CheckCircle2,Calendar,Clock3,Eye,EyeOff,ListTodo} from 'lucide-react';
import {TaskActivityLogPopover} from '../components/features/tasks/TaskActivityLogPopover';
import {ConfirmDeleteModal} from '../components/common/ConfirmDeleteModal';
import {ConfirmHideModal} from '../components/common/ConfirmHideModal';
import {CampaignPanel} from '../components/features/projects/CampaignPanel';
import {SubtaskDetailPanel} from '../components/features/projects/SubtaskDetailPanel';
import {SearchInput,StatusFilterDropdown,PicFilterDropdown,DateFilterDropdown,PriorityFilterDropdown} from '../components/common/filters';
import {dateValue,priorityClass,getDueStatusColor,getDueStatusLabel} from '../components/features/projects/projectPresentation';
import {useProjectsController} from '../hooks/useProjectsController';
import {useResizableColumns} from '../hooks/useResizableColumns';
import {EntityActionBadges} from '../components/features/projects/EntityActionBadges';
import {EntityNoteCell} from '../components/features/projects/EntityNoteCell';
import {supabase} from '../services/supabase';
import toast from 'react-hot-toast';
import {CampaignDetailDrawer} from '../components/features/projects/CampaignDetailDrawer';
import {EntityInfoPopover} from '../components/features/projects/EntityInfoPopover';
import {EntityPinButton} from '../components/features/projects/EntityPinButton';
import {TaskPinButton} from '../components/features/tasks/TaskPinButton';
import {taskKey,isTaskDone} from '../lib/taskTracking';
import {isGlobalManager} from '../lib/roleScope';
export const Projects:React.FC=()=>{
 const initialProjectColWidths = React.useMemo(() => [340, 190, 250, 130, 160, 250], []);
 const { tableRef: projectTableRef, widths: projectColWidths, startResize: startProjectColResize } = useResizableColumns({
   tableKey: 'projects_table',
   initialWidths: initialProjectColWidths,
   minWidth: 95,
 });
 const state=useProjectsController();
 const rootCampaignIds=React.useMemo(()=>new Set(state.workflow.tracks.filter(track=>track.entity_type==='campaign'&&track.root).map(track=>track.entity_id)),[state.workflow.tracks]);
 const {departments,departmentId,setDepartmentId,editStatus,setEditStatus,t,lang,setParams,workflow,sourceTask,setSourceTask,profile,canCreate,canManageProject,projects,setProjects,people,selected,setSelected,picMembers,selectedCampaign,setSelectedCampaign,selectedRoot,projectsExpanded,setProjectsExpanded,starredCriteriaMap,createOpen,setCreateOpen,creating,executionMemberIds,setExecutionMemberIds,projectPrimaryOwners,projectToDelete,setProjectToDelete,deletingIds,projectToHide,setProjectToHide,subtaskToDelete,setSubtaskToDelete,title,setTitle,description,setDescription,campaignSubtaskToDelete,setCampaignSubtaskToDelete,start,setStart,due,setDue,priority,setPriority,ownerIds,setOwnerIds,creationType,setCreationType,showAdvanced,setShowAdvanced,primaryOwnerId,setPrimaryOwnerId,parentCampaignId,campaignObjective,setCampaignObjective,campaignBudget,setCampaignBudget,campaignChannels,setCampaignChannels,attachmentUrl,setAttachmentUrl,attachmentFile,setAttachmentFile,campaigns,subtasks,setSubtasks,comments,selectedSubtask,setSelectedSubtask,subtaskCommentCounts,subtaskChecklistCounts,hasMentionOrUnread,recentlyCompletedSubtaskId,setRecentlyCompletedSubtaskId,setRefreshDetailTrigger,removeComment,saveEditedComment,newSubtask,setNewSubtask,editMode,setEditMode,showSubtaskForm,setShowSubtaskForm,width,resizing,setResizing,subtaskOwner,setSubtaskOwner,subtaskDue,setSubtaskDue,subtaskQuantity,setSubtaskQuantity,comment,setComment,panelOpen,visiblePeople,projectCommentInput,hasComments,subtaskMembers,searchTerm,setSearchTerm,statusFilter,setStatusFilter,picFilter,setPicFilter,calendarFilter,setCalendarFilter,customStartDate,setCustomStartDate,customEndDate,setCustomEndDate,priorityFilter,setPriorityFilter,activeDropdown,setActiveDropdown,toolbarRef,hasActiveFilters,handleResetFilters,campaignFilters,visibleProjects,resetCreateForm,selectParentCampaign,createItem,executeRemoveSubtask,executeRemoveCampaignSubtask,removeSubtask,saveInlineEdit,executeHideProject,archiveProject,executeRemoveProject,removeProject,addSubtask,completeSubtask,addComment}=state;
 const formatCreatedAt = (value?: string | null) => value ? new Date(value).toLocaleString(lang === 'en' ? 'en-GB' : 'vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
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
 useReadEntityNotifications(selectedCampaign ? 'campaign' : 'project', selectedCampaign?.id || selected?.id, Boolean(panelOpen && !createOpen && (selectedCampaign || selected)));

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
    <div className={`flex min-w-0 flex-1 flex-col p-1 transition-all duration-300 ${panelOpen ? 'hidden xl:flex xl:mr-[calc(var(--panel-width)+16px)] pr-2' : 'pr-1'}`}>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 py-2 sm:py-2.5 mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2 leading-none">
            <FolderKanban className="text-primary"/> {t('projects.title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1.5">{t('projects.subtitle')}</p>
        </div>

        {/* Function Toolbar: Search, Status, PIC, Calendar, Priority, Clear Filters, Add New */}
        <div ref={toolbarRef} className="mobile-actions-row flex flex-wrap items-center gap-2">
          {/* 1. Search */}
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t('projects.searchPlaceholder')}
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
          />

          {/* 5. Priority Filter Button */}
          <PriorityFilterDropdown
            value={priorityFilter}
            onChange={setPriorityFilter}
            isOpen={activeDropdown === 'priority'}
            onToggle={() => setActiveDropdown(activeDropdown === 'priority' ? null : 'priority')}
            onClose={() => setActiveDropdown(null)}
          />

          {/* 6. Reset Filters Button */}
          {hasActiveFilters && (
            <ActionButton icon={<X size={12} />}
              type="button"
              onClick={handleResetFilters}
              title={t('projects.clearFilters')}
              className="h-9 px-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
            >

              <span className="hidden sm:inline">{t('projects.clearFilters')}</span>
            </ActionButton>
          )}

          {/* 7. Add New Button */}
          {officialReadEnabled && <Link to="/main-view" aria-label="Theo dõi Main chỉ đọc" title="Theo dõi Main chỉ đọc" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-2.5 text-xs font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-200"><Eye size={16}/><span className="hidden sm:inline">Xem Main</span></Link>}
          {canCreate && (
            <ActionButton icon={<FolderKanban className="w-4 h-4" />}
              onClick={() => { resetCreateForm(); setCreationType('project'); setSelected(null); setSelectedCampaign(null); setCreateOpen(true); }} 
              className="btn-add-new h-9 flex items-center gap-1.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer ml-1"
            >

              <span>{t('projects.add')}</span>
            </ActionButton>
          )}
        </div>
      </div>
      
      <div className="space-y-6 pb-20 pr-1">
        <CampaignPanel
          onSelect={(campaign) => { setSelected(null); setCreateOpen(false); setSelectedCampaign(campaign); }}
          filters={campaignFilters}
          rootCampaignIds={rootCampaignIds}
          workflowTracks={workflow.tracks}
          starredCriteriaMap={starredCriteriaMap}
        />
        <section className="card-hub rounded-2xl overflow-hidden shrink-0"><div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700"><button onClick={() => setProjectsExpanded(value => !value)} aria-expanded={projectsExpanded} className="inline-flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white"><ChevronDown className={`text-gray-500 transition-transform ${projectsExpanded ? '' : '-rotate-90'}`} size={17}/><FolderKanban className="text-violet-500" size={16}/> {t('projects.projectsAccordion')} <span className="rounded-full bg-violet-100 dark:bg-violet-500/20 px-2 py-0.5 text-xs font-bold text-violet-600 dark:text-violet-400">{visibleProjects.length}</span></button></div>{projectsExpanded && <><div className="space-y-3 p-3 xl:hidden">{visibleProjects.map(project => {
  return <article key={project.id} className={`min-w-0 rounded-xl border border-gray-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/50 ${deletingIds.includes(project.id) ? 'animate-fade-out' : ''}`}>
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5">
      <EntityInfoPopover
        entityType="project"
        entity={project}
        track={workflow.tracks.find(t => t.entity_type === 'project' && t.entity_id === project.id)}
        starredCriteriaMap={starredCriteriaMap}
        leadPerson={(() => {
          const leadId = projectPrimaryOwners[project.id] || (picMembers[project.id] || [])[0];
          const p = people.find(x => String(x.id) === String(leadId));
          return p ? { name: p.name, avatar_url: (p as any).avatar_url } : null;
        })()}
        subPersons={(subtaskMembers[project.id] || []).map(id => {
          const p = people.find(x => String(x.id) === String(id));
          return { id, name: p?.name || 'Unknown', avatar_url: (p as any)?.avatar_url };
        })}
      />
      <button type="button" onClick={() => { setSelectedCampaign(null); setCreateOpen(false); setSelected(project); }} className="block w-full min-w-0 text-left">
        <span className="grid grid-cols-[1fr_auto] items-center gap-1 text-sm font-bold leading-5 text-gray-900 dark:text-white">
          <span className="min-w-0 truncate">{project.name}</span>
          {hasComments[project.id] && <span title={t('common.comment')} className="relative inline-grid place-items-center shrink-0"><MessageSquare size={14} className="text-blue-500" />{(Number(project.lead_id) === Number(profile?.id) || hasMentionOrUnread?.[project.id]) && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm"></span>}</span>}
        </span>
        <span className="mt-1 block truncate text-xs text-gray-500 dark:text-slate-400">{project.description || t('tasks.noDescription')}</span>
      </button>
      <ChevronRight size={15} className="shrink-0 text-gray-400" />
    </div>
    <div className="mt-2 flex min-w-0 items-center gap-2 text-[11px] text-gray-500 dark:text-slate-400">
      <StatusBadge status={project.status || 'active'} />
      <span className="min-w-0 truncate">{project.due_date ? `${t('common.due')} ${dateValue(project.due_date)}` : t('common.noDueDate')}</span>
      {project.due_date && getDueStatusLabel(project.due_date, project.status, lang === 'en')}
      {canManageProject(project) && <div className="ml-auto flex shrink-0 items-center gap-1"><ActionButton icon={<EyeOff size={15} />} type="button" onClick={() => void archiveProject(project)} className="rounded-lg p-1.5 text-amber-600" aria-label={`${t('common.hide')} ${project.name}`}></ActionButton><ActionButton icon={<Trash2 size={15} />} type="button" onClick={() => void removeProject(project)} className="rounded-lg p-1.5 text-red-500" aria-label={`${t('common.delete')} ${project.name}`}></ActionButton></div>}
    </div>
    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-800">
      <EntityNoteCell entityId={project.id} entityType="project" workspaceId={(project as any).workspace_id} canEdit={canManageProject(project)} />
    </div>
  </article>;
})}{visibleProjects.length === 0 && <p className="p-6 text-center text-sm text-gray-500">{projects.length > 0 ? (lang === 'en' ? 'No projects match current filters.' : 'Không có dự án phù hợp bộ lọc.') : t('projects.noProjects')}</p>}</div><div className="hidden overflow-x-auto xl:block">
  <table ref={projectTableRef} className="w-full table-fixed text-left border-collapse">
    <colgroup>
      {projectColWidths.map((w, idx) => (
        <col key={idx} style={{ width: `${w}px` }} />
      ))}
    </colgroup>
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
    <tbody>{visibleProjects.map(project => <tr key={project.id} onClick={() => { setSelectedCampaign(null); setCreateOpen(false); setSelected(project); }} className={`group border-t border-gray-100 dark:border-slate-800 cursor-pointer hover-row-effect hover-row-project transition-all duration-200 ${selected?.id === project.id ? 'bg-violet-50/70 dark:bg-violet-950/20' : ''} ${deletingIds.includes(project.id) ? "animate-fade-out" : ""}`}>
<td className="p-4 relative overflow-hidden">
  <div className="grid grid-flow-col auto-cols-max items-center gap-2 overflow-hidden">
    <EntityInfoPopover
      entityType="project"
      entity={project}
      track={workflow.tracks.find(t => t.entity_type === 'project' && t.entity_id === project.id)}
      starredCriteriaMap={starredCriteriaMap}
      leadPerson={(() => {
        const leadId = projectPrimaryOwners[project.id] || (picMembers[project.id] || [])[0];
        const p = people.find(x => String(x.id) === String(leadId));
        return p ? { name: p.name, avatar_url: (p as any).avatar_url } : null;
      })()}
      subPersons={(subtaskMembers[project.id] || []).map(id => {
        const p = people.find(x => String(x.id) === String(id));
        return { id, name: p?.name || 'Unknown', avatar_url: (p as any)?.avatar_url };
      })}
    />
    <b className="block truncate text-gray-900 dark:text-white">{project.name}</b>
    {hasComments[project.id] && <span title={t('common.comment')} className="relative inline-grid place-items-center shrink-0"><MessageSquare size={14} className="text-blue-500" />{(Number(project.lead_id) === Number(profile?.id) || hasMentionOrUnread?.[project.id]) && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm"></span>}</span>}
  </div>
  <p className="text-xs text-gray-500 truncate mt-1">{project.description || t('tasks.noDescription')}</p>
  {canManageProject(project) && (
    <div 
      onClick={(e) => e.stopPropagation()}
      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-slate-900/95 shadow-sm rounded-lg px-1 py-0.5 border border-gray-200/80 dark:border-slate-700/80 z-10 grid grid-flow-col auto-cols-max items-center gap-0.5"
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
<td className="p-4 overflow-hidden text-center">
  <div className="grid place-content-center">
    <div className="grid grid-flow-col auto-cols-max items-center justify-center gap-2 overflow-hidden mx-auto">
      <div className="grid grid-flow-col auto-cols-max -space-x-2 shrink-0">
        {(picMembers[project.id] || []).slice(0,4).map(id => { const p = people.find(p=>String(p.id)===id); return <Avatar key={'o'+id} name={p?.name || '?'} src={(p as any)?.avatar_url || undefined} className="w-7 h-7 text-[10px] border-2 border-white dark:border-slate-900 shadow-sm z-10" /> })}
      </div>
      {subtaskMembers[project.id] && subtaskMembers[project.id].length > 0 && (
        <>
          <span className="text-gray-300 dark:text-gray-600 px-1 shrink-0">|</span>
          <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 rounded-full border border-violet-100 dark:border-violet-800 shrink-0">
            <span className="text-[9px] font-bold text-violet-700 dark:text-violet-400">SUB</span>
            <div className="grid grid-flow-col auto-cols-max -space-x-2">
              {subtaskMembers[project.id].slice(0,4).map(id => { const p = people.find(p=>String(p.id)===id); return <Avatar key={'s'+id} name={(p?.name || 'Unknown') + ' (Subtask)'} src={(p as any)?.avatar_url || undefined} className="w-6 h-6 text-[9px] border-2 border-white dark:border-slate-900 shadow-sm z-10 opacity-90" /> })}
            </div>
          </div>
        </>
      )}
    </div>
  </div>
</td>
<td className="p-4 overflow-hidden text-sm text-gray-600 dark:text-gray-300 text-center"><div className="grid grid-flow-col auto-cols-max items-center justify-center gap-2 truncate mx-auto"><span>{dateValue(project.start_date || '')} – {dateValue(project.due_date || '')}</span>{project.due_date && <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 shrink-0"><div className={`w-3.5 h-3.5 rounded-full border-[2.5px] ${getDueStatusColor(project.due_date, project.status)}`} title={`${t('common.dueDate')}: ${dateValue(project.due_date)}`} />{getDueStatusLabel(project.due_date, project.status, lang === 'en')}</div>}</div></td>
<td className="p-4 overflow-hidden text-center"><div className="grid place-items-center"><span className={`px-2 py-1 rounded-full text-xs font-medium capitalize truncate ${priorityClass(project.priority || 'medium')}`}>{project.priority || 'medium'}</span></div></td>
<td className="p-4 overflow-hidden text-center"><div className="grid place-items-center"><StatusBadge status={project.status || 'active'} /></div></td>
<td className="p-4 overflow-hidden text-center">
  <EntityNoteCell
    entityId={project.id}
    entityType="project"
    workspaceId={(project as any).workspace_id}
    canEdit={canManageProject(project)}
    alignCenter={true}
  />
</td>
</tr>)}</tbody></table>{!visibleProjects.length && <div className="p-12 text-center text-gray-500">{projects.length > 0 ? (lang === 'en' ? 'No projects match current filters.' : 'Không có dự án phù hợp bộ lọc.') : t('projects.noProjects')}</div>}</div></>}</section>
  
  
    </div></div>

    {sourceTask && <TaskDetailPanel task={workflow.tasks.find(task => task.id === sourceTask.id) || sourceTask} isOpen onClose={() => setSourceTask(null)} onTaskUpdated={() => void workflow.refresh()} />}

    {/* Right Side: Detail Panel */}
    <div style={{ '--panel-width': `${width}px` } as React.CSSProperties} className={`dashboard-detail-drawer bg-white dark:bg-slate-800 shrink-0 ${panelOpen ? 'w-full max-w-full xl:max-w-[calc(100vw-32px)] xl:w-[var(--panel-width)] xl:max-w-[min(var(--panel-width),50vw)] opacity-100 pointer-events-auto ' + (selectedCampaign ? 'shadow-drawer-campaign' : 'shadow-drawer-project') : 'w-0 min-w-0 shadow-none border-0 opacity-0 pointer-events-none'} z-[60] ${!resizing ? 'transition-[width,opacity] duration-300 ease-out' : ''}`}>
      {panelOpen && <div onMouseDown={() => setResizing(true)} className="hidden xl:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />}
      {selected && (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
            <div className="grid grid-flow-col auto-cols-max items-center gap-2 min-w-0">
              <h3 className="font-bold text-xl text-gray-900 dark:text-white line-clamp-1">{selected.name}</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800">{t('projects.projects')}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <TaskActivityLogPopover entityType="project" entityId={selected.id} />
              <EntityPinButton kind="project" id={selected.id} name={selected.name} />
              <button onClick={() => { setSelected(null); setParams({}, { replace: true }); }} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
            {editMode ? (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">{t('projects.nameLabel')}</label>
                  <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold outline-none mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div className="tw-calendar-picker relative"><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.startDate')}</label><input type="text" id="edit-proj-start-input" readOnly onClick={e => (window as any).openCalendar?.({ displayId: 'edit-proj-start-input', mode: 'single' }, e)} value={start} onChange={e=>setStart(e.target.value)} placeholder="dd/mm/yyyy" className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm cursor-pointer"/></div>
                   <div className="tw-calendar-picker relative"><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.endDate')}</label><input type="text" id="edit-proj-due-input" readOnly onClick={e => (window as any).openCalendar?.({ displayId: 'edit-proj-due-input', mode: 'single' }, e)} value={due} onChange={e=>setDue(e.target.value)} placeholder="dd/mm/yyyy" className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm cursor-pointer"/></div>
                </div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.priority')}</label><select value={priority} onChange={e=>setPriority(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"><option value="low">{t('common.low')}</option><option value="medium">{t('common.medium')}</option><option value="high">{t('common.high')}</option><option value="urgent">{t('common.urgent')}</option></select></div>
                <EntityStatusField value={editStatus} onChange={setEditStatus} />
                <div><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.owner')}</label><MultiSelect options={visiblePeople.map(p => ({ value: String(p.id), label: p.name + (p.departments?.name ? ' ('+p.departments.name+')' : '') }))} value={ownerIds} onChange={setOwnerIds} placeholder={t('common.selectPic') + '...'} /></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.description')}</label><textarea value={description} onChange={e=>setDescription(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none min-h-24 mt-1 text-sm" placeholder={t('tasks.descPlaceholder')}/></div>
                <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <button onClick={() => setEditMode(false)} className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">{t('common.cancel')}</button>
                  <button onClick={saveInlineEdit} className="px-5 py-2.5 bg-[#002e6d] text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-[#002150] transition-colors">{t('common.save')}</button>
                </div>
              </div>
            ) : (
<div className="space-y-7 animate-in fade-in duration-200">
              <EntityActionBadges
                priority={selected.priority || 'medium'}
                status={selected.status || 'active'}
                onPriorityChange={async (newPriority) => {
                  if (!selected || !selectedRoot) return;
                  const { error } = await supabase.from('projects').update({ priority: newPriority }).eq('id', selected.id);
                  if (error) return toast.error('Lỗi cập nhật mức ưu tiên');
                  const updated = { ...selected, priority: newPriority };
                  setSelected(updated);
                  setPriority(newPriority);
                  setProjects(items => items.map(p => p.id === selected.id ? { ...p, priority: newPriority } : p));
                  window.dispatchEvent(new Event('projects:changed'));
                  void workflow.refresh();
                  toast.success('Đã cập nhật mức ưu tiên');
                }}
                onStatusChange={async (newStatus) => {
                  if (!selected || !selectedRoot) return;
                  const { error } = await supabase.from('projects').update({ status: newStatus }).eq('id', selected.id);
                  if (error) return toast.error('Lỗi cập nhật trạng thái');
                  const updated = { ...selected, status: newStatus };
                  setSelected(updated);
                  setEditStatus(newStatus);
                  setProjects(items => items.map(p => p.id === selected.id ? { ...p, status: newStatus } : p));
                  window.dispatchEvent(new Event('projects:changed'));
                  void workflow.refresh();
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
                  setEditMode(true);
                }}
                canManage={selectedRoot}
              />
      <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 text-sm"><div><p className="text-[10px] uppercase text-gray-400 mb-1">{t('common.owner')}</p><div className="mt-1 flex flex-wrap gap-1">{(picMembers[selected?.id || ''] || []).length > 0 ? (picMembers[selected?.id || ''] || []).map(id => { const p = people.find(p=>String(p.id)===id); return p ? <div key={id} className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 rounded-full pr-3 pl-1 py-1"><Avatar name={p.name} src={(p as any).avatar_url || undefined} className="w-5 h-5 text-[10px]" /><span className="text-xs font-semibold">{p.name}{Number(id) === Number(projectPrimaryOwners[selected.id]) && <span className="ml-1 text-primary">· {t('common.primary')}</span>}</span></div> : null }) : t('common.unassigned')}</div></div><div><p className="text-[10px] uppercase text-gray-400 mb-1">{t('common.timeline')}</p><div className="mt-1 flex items-center gap-1.5 flex-wrap text-sm"><span className="font-normal text-gray-700 dark:text-gray-300">{dateValue(selected?.start_date || '')}</span><span className="text-gray-400">–</span><span className="font-bold text-red-600 dark:text-red-400">{dateValue(selected?.due_date || '')}</span></div></div><div><p className="text-[10px] uppercase text-gray-400">{t('common.creator')}</p><div className="mt-1 font-semibold flex items-center gap-2"><Avatar name={(selected as any)?.creator?.name || '---'} src={(selected as any)?.creator?.avatar_url} className="w-5 h-5 text-[10px] shadow-sm" /> <span className="line-clamp-1">{(selected as any)?.creator?.name || '---'}</span></div></div></div>
      <WorkflowTrackingSummary kind="project" id={selected.id} hub={workflow} onOpenTask={setSourceTask} statusFilter={statusFilter} /><section><h3 className="font-bold text-sm mb-2">{t('common.description')}</h3><TaskDescriptionViewer description={selected?.description} /></section>
      <section><h3 className="font-bold text-sm flex gap-2 items-center mb-3"><Users size={16}/> {t('projects.subtasks')}</h3><div className="space-y-2">{subtasks.filter(s => statusFilter === 'completed' ? isTaskDone(s.status) : true).map(s=>(
  <div key={s.id} onClick={() => setSelectedSubtask(s)} className={`p-3 rounded-xl border text-sm group relative transition-all ${isTaskDone(s.status) ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20 hover:bg-emerald-100/60' : 'bg-slate-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:bg-violet-50/50 hover:border-violet-200/80 dark:hover:bg-slate-700/50 dark:hover:border-slate-600'} ${recentlyCompletedSubtaskId === s.id ? 'subtask-complete-pulse' : ''} ${(Number(s.assignee_id) === Number(profile?.id) || canCreate) ? 'cursor-pointer' : ''}`}>
      <div className="flex justify-between items-center w-full">
  <div className="flex items-center gap-3 flex-1">
    <div className="flex-1">
      <div className="grid grid-flow-col auto-cols-max items-center gap-2">
        <b className={`text-gray-900 dark:text-white block ${isTaskDone(s.status) ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>{s.title}</b>
        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold lowercase ${priorityClass(s.priority || selected?.priority || 'medium')}`}>
          {t(`common.${s.priority || selected?.priority || 'medium'}` as any).toLowerCase()}
        </span>
        {subtaskChecklistCounts[s.id]?.total > 0 && (() => {
          const { done, total } = subtaskChecklistCounts[s.id];
          const isAllDone = done === total && total > 0;
          return (
            <span
              title={lang === 'en' ? `Checklist: ${done}/${total} completed` : `Đầu việc: ${done}/${total} hoàn thành`}
              className={`inline-grid grid-flow-col auto-cols-max items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md border ${
                isAllDone
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60'
                  : 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-800/60'
              }`}
            >
              <ListTodo size={12} />
              <span>{done}/{total}</span>
            </span>
          );
        })()}
        {subtaskCommentCounts[s.id] > 0 && (
          <span title={`${subtaskCommentCounts[s.id]} ${t('common.comment').toLowerCase()}`} className="inline-grid grid-flow-col auto-cols-max items-center gap-1 text-xs text-primary">
            <span className="relative inline-grid place-items-center">
              <MessageSquare size={13}/>
              {(Number(s.assignee_id) === Number(profile?.id) || hasMentionOrUnread?.[s.id]) && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm border border-white dark:border-slate-900"></span>}
            </span>
            <span>{subtaskCommentCounts[s.id]}</span>
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
         <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-md text-gray-700 dark:text-gray-300 font-medium">
           {s.assignee ? (
             <>
               <Avatar name={s.assignee.name} src={s.assignee.avatar_url || undefined} className="w-4 h-4 text-[9px]" />
               {s.assignee.name}
             </>
           ) : t('common.unassigned')}
         </span>
         {(s.due_date || s.created_at) && <span className="flex flex-col items-start gap-1 min-w-0">
           {s.due_date && <span className="flex items-center gap-1 font-bold text-red-600 dark:text-red-400"><Calendar size={12}/> {dateValue(s.due_date)}</span>}
           {s.created_at && <span className="inline-flex flex-wrap items-center gap-x-1 text-[11px] font-normal text-gray-500 dark:text-gray-400"><Clock3 size={12}/>{formatCreatedAt(s.created_at)}{s.updated_at && new Date(s.updated_at).getTime() > new Date(s.created_at).getTime() + 1000 && <span>· {lang === 'en' ? 'Edited' : 'Đã chỉnh sửa'}</span>}</span>}
         </span>}
      </div>
    </div>
  </div>
  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 shrink-0" onClick={event => event.stopPropagation()}>
          <TaskPinButton taskId={taskKey('project_subtask', s.id)} size={14} className="!p-1.5" />
          {(selectedRoot || isGlobalManager(profile) || Number(s.assignee_id) === Number(profile?.id)) && !isTaskDone(s.status) && <ActionButton icon={<CheckCircle2 size={14}/>} onClick={()=>void completeSubtask(s)} className="rounded-lg p-1.5 text-emerald-700 bg-emerald-100 hover:bg-emerald-200" title={t('common.complete')}></ActionButton>}
          {selectedRoot && <button onClick={()=>removeSubtask(s.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>}
        </div>
      </div>
  </div>
))}</div>{selectedRoot && !showSubtaskForm && <ActionButton icon={<Plus size={16} className="inline mr-1" />} onClick={() => setShowSubtaskForm(true)} className="mt-3 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20 w-full text-center border-dashed"> {t('projects.addSubtask')}</ActionButton>}
{selectedRoot && showSubtaskForm && <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3"><input value={newSubtask} onChange={e=>setNewSubtask(e.target.value)} placeholder={t('projects.subtaskPlaceholder')} className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"/><div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><select value={subtaskOwner} onChange={e=>setSubtaskOwner(e.target.value)} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"><option value="">{t('common.selectPic')}</option>{visiblePeople.map(p=><option key={p.id} value={p.id}>{p.name} {p.departments?.name ? '('+p.departments.name+')' : ''}</option>)}</select><input type="number" min="0" step="1" value={subtaskQuantity} onChange={e=>setSubtaskQuantity(e.target.value)} placeholder={t('tasks.quantity')} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"/><div className="tw-calendar-picker relative w-full"><input type="text" id="subtask-due-input" readOnly onClick={(e) => { if ((window as any).openCalendar) (window as any).openCalendar({ displayId: 'subtask-due-input', mode: 'single' }, e); }} value={subtaskDue} onChange={(e) => setSubtaskDue(e.target.value)} placeholder="dd/mm/yyyy" className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm w-full cursor-pointer"/></div></div><div className="flex gap-2 justify-end"><button onClick={() => setShowSubtaskForm(false)} className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700">{t('common.cancel')}</button><button onClick={() => { addSubtask(); setShowSubtaskForm(false); }} className="px-3 py-1.5 bg-[#002e6d] text-white text-sm font-semibold rounded-lg shadow-sm">{t('common.add')}</button></div></div>}</section>
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
    </div>

    {/* Mobile/Tablet Backdrop when Create Drawer is open */}
    {createOpen && (
      <div 
        className="fixed inset-0 bg-slate-900/30 dark:bg-slate-900/60 z-[70] xl:hidden backdrop-blur-xs transition-opacity"
        onClick={() => setCreateOpen(false)}
      />
    )}

    <div style={{ '--drawer-width': `${width}px` } as React.CSSProperties} className={`dashboard-detail-drawer bg-white dark:bg-slate-800 shrink-0 ${createOpen ? 'w-full max-w-full xl:max-w-[calc(100vw-32px)] xl:w-[var(--drawer-width)] shadow-drawer-task border border-blue-500/20 opacity-100 pointer-events-auto drawer-slide-in' : 'w-0 min-w-0 shadow-none border-0 opacity-0 pointer-events-none'} z-[75] ${!resizing ? 'transition-[width,opacity] duration-300 ease-out' : ''}`}>
      {createOpen && <>
      <div onMouseDown={() => setResizing(true)} className="hidden xl:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0"><h3 className="font-bold text-xl text-gray-900 dark:text-white">{t('projects.createTitle')}</h3><ActionButton icon={<X className="w-5 h-5 text-gray-500" />} disabled={creating} aria-label={t('common.close')} onClick={() => setCreateOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700"></ActionButton></div>
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

        <div>
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
            {t('common.department') || 'Phòng ban'}
          </label>
          <select
            value={departmentId}
            onChange={e => setDepartmentId(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
          >
            <option value="">{lang === 'en' ? 'Select department...' : 'Chọn phòng ban...'}</option>
            {departments.map((d: any) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {creationType === 'campaign' ? <div><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('projects.objectives')}</label><textarea value={campaignObjective} onChange={e=>setCampaignObjective(e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white" placeholder={t('projects.objectives')} /></div> : <div><label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('common.description')}</label><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white" placeholder={t('tasks.descPlaceholder')} /></div>}

        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm font-semibold text-primary hover:underline">{showAdvanced ? t('projects.hideMore') : t('projects.showMore')}</button>
        {showAdvanced && (creationType === 'project' ? <div className="space-y-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-900/40 p-4">
          <div><label className="block text-sm font-semibold mb-1">{t('projects.belongsToCampaign')}</label><select value={parentCampaignId} onChange={e=>selectParentCampaign(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"><option value="">{t('projects.standalone')}</option>{campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="block text-sm font-semibold mb-1">{t('common.priority')}</label><select value={priority} onChange={e=>setPriority(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"><option value="high">{t('common.high')}</option><option value="medium">{t('common.medium')}</option><option value="low">{t('common.low')}</option></select></div>
          <div><label className="block text-sm font-semibold mb-1">{t('projects.executingMembers')}</label><MultiSelect options={visiblePeople.filter(p=>String(p.id)!==primaryOwnerId).map(p=>({value:String(p.id),label:p.name}))} value={executionMemberIds} onChange={setExecutionMemberIds} placeholder={t('projects.tagMembers')} /></div>
          <div><label className="block text-sm font-semibold mb-1">{t('projects.attachments')}</label><input value={attachmentUrl} onChange={e=>setAttachmentUrl(e.target.value)} placeholder={t('projects.pasteLink')} className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800" /><label className="mt-2 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-primary/30 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5"><input type="file" className="sr-only" onChange={e=>setAttachmentFile(e.target.files?.[0] || null)} />{attachmentFile ? attachmentFile.name : t('projects.orChooseFile')}</label></div>
        </div> : <div className="space-y-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-900/40 p-4"><div><label className="block text-sm font-semibold mb-1">{t('projects.totalBudget')}</label><div className="relative"><input type="number" min="0" value={campaignBudget} onChange={e=>setCampaignBudget(e.target.value)} className="w-full px-3 py-2.5 pr-14 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800" placeholder={t('projects.budgetPlaceholder')} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-gray-500 pointer-events-none">VND</span></div></div><div><label className="block text-sm font-semibold mb-2">{t('projects.channels')}</label><div className="grid grid-cols-2 gap-2 text-sm">{['Social Media','OOH','In-store','PR','Digital Ads','CRM'].map(channel => <label key={channel} className="grid grid-flow-col auto-cols-max items-center gap-2 rounded-lg bg-white dark:bg-slate-800 px-3 py-2"><input type="checkbox" checked={campaignChannels.includes(channel)} onChange={() => setCampaignChannels(values => values.includes(channel) ? values.filter(value => value !== channel) : [...values, channel])} />{channel}</label>)}</div></div><div><label className="block text-sm font-semibold mb-1">{t('projects.attachments')}</label><input value={attachmentUrl} onChange={e=>setAttachmentUrl(e.target.value)} placeholder={t('projects.pasteLink')} className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800" /><label className="mt-2 grid grid-flow-col auto-cols-max items-center justify-center cursor-pointer rounded-xl border border-dashed border-primary/30 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5"><input type="file" className="sr-only" onChange={e=>setAttachmentFile(e.target.files?.[0] || null)} />{attachmentFile ? attachmentFile.name : t('projects.orChooseFile')}</label></div></div>)}

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
      <ConfirmDeleteModal isOpen={!!projectToDelete} title="Xóa Dự án" message={`Bạn có chắc muốn xóa dự án "${projectToDelete?.name}"? Tất cả subtask của dự án này cũng sẽ bị xóa.`} onConfirm={executeRemoveProject} onCancel={() => setProjectToDelete(null)} />
      <ConfirmDeleteModal isOpen={!!subtaskToDelete} title="Xóa Subtask" message="Bạn có chắc muốn xóa subtask này?" onConfirm={executeRemoveSubtask} onCancel={() => setSubtaskToDelete(null)} />
      <ConfirmDeleteModal isOpen={!!campaignSubtaskToDelete} title="Xóa Subtask" message={`Bạn có chắc muốn xóa subtask "${campaignSubtaskToDelete?.title || ''}"?`} onConfirm={executeRemoveCampaignSubtask} onCancel={() => setCampaignSubtaskToDelete(null)} />
    <ConfirmHideModal isOpen={!!projectToHide} title="Ẩn Dự án" message={`Bạn có chắc muốn ẩn dự án "${projectToHide?.name}"? Dự án sẽ được đưa vào lưu trữ và có thể khôi phục sau.`} onConfirm={executeHideProject} onCancel={() => setProjectToHide(null)} />
  </div>
);
};
