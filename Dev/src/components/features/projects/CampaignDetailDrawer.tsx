import {EntityStatusField} from './EntityStatusField';
import {EntityActionBadges} from './EntityActionBadges';
import React from 'react';
import {supabase} from '../../../services/supabase';
import toast from 'react-hot-toast';
import {WorkflowTrackingSummary} from './WorkflowTrackingSummary';

import {Avatar} from '../../common/Avatar';
import {SmartCommentInput} from '../comments/SmartCommentInput';
import {CommentMessage} from '../comments/CommentMessage';
import {MultiSelect} from '../../common/MultiSelect';
import {MessageSquare,Plus,Users,X,Trash2,Calendar,Clock3,ListTodo} from 'lucide-react';
import {dateValue,priorityClass,getCampaignPriority,setCachedCampaignPriority} from './projectPresentation';
import {EntityPinButton} from './EntityPinButton';
import {TaskActivityLogPopover} from '../tasks/TaskActivityLogPopover';
import {TaskPinButton} from '../tasks/TaskPinButton';
import {taskKey,isTaskDone} from '../../../lib/taskTracking';
import {isGlobalManager} from '../../../lib/roleScope';
import type {useProjectsController} from '../../../hooks/useProjectsController';
export function CampaignDetailDrawer({state}:{state:ReturnType<typeof useProjectsController>}){
 const {editStatus,setEditStatus,t,lang,setParams,workflow,setSourceTask,profile,selectedCampaign,setSelectedCampaign,selectedRoot,deletingIds,title,setTitle,start,setStart,due,setDue,primaryOwnerId,setPrimaryOwnerId,campaignObjective,setCampaignObjective,campaignBudget,setCampaignBudget,campaignSubtasks,campaignComments,campaignSubtaskCommentCounts,campaignSubtaskChecklistCounts,campaignSubtaskQuantities,hasMentionOrUnread,campaignNewSubtask,setCampaignNewSubtask,campaignSubtaskOwner,setCampaignSubtaskOwner,campaignSubtaskDue,setCampaignSubtaskDue,campaignSubtaskQuantity,setCampaignSubtaskQuantity,showCampaignSubtaskForm,setShowCampaignSubtaskForm,campaignComment,setCampaignComment,campaignEditMode,setCampaignEditMode,setSelectedSubtask,visiblePeople,statusFilter,campaignCommentInput,removeCampaignSubtask,toggleCampaignSubtask,removeCampaignComment,saveEditedCampaignComment,addCampaignSubtask,addCampaignComment,saveCampaignEdit}=state;
  const formatCreatedAt = (value?: string | null) => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    return `${time} ${date}`;
  };
 const campaignCollaboratorIds = React.useMemo(() => {
   if (!selectedCampaign) return [];
   const ids = new Set<string>();
   if (selectedCampaign.created_by) ids.add(String(selectedCampaign.created_by));
   if (selectedCampaign.lead_id) ids.add(String(selectedCampaign.lead_id));
   const pics = (workflow.tracks.find(track => track.entity_type === 'campaign' && track.entity_id === selectedCampaign.id)?.pics || []);
   pics.forEach(p => ids.add(String(p.id)));
   (campaignSubtasks || []).forEach(s => { if (s.assignee_id) ids.add(String(s.assignee_id)); });
   (campaignComments || []).forEach(c => { if (c.user_id) ids.add(String(c.user_id)); });
   return Array.from(ids);
 }, [selectedCampaign, workflow.tracks, campaignSubtasks, campaignComments]);
 return <>{selectedCampaign && (

        <div className="flex flex-col h-full min-h-0 overflow-hidden">
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
            <div className="grid grid-flow-col auto-cols-max items-center gap-2 min-w-0">
              <h3 className="font-bold text-xl text-gray-900 dark:text-white line-clamp-1">{selectedCampaign.name}</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">{t('projects.campaigns')}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0"><TaskActivityLogPopover entityType="campaign" entityId={selectedCampaign.id} /><EntityPinButton kind="campaign" id={selectedCampaign.id} name={selectedCampaign.name} /><button onClick={() => { setSelectedCampaign(null); setParams({}, { replace: true }); }} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"><X className="w-5 h-5 text-gray-500" /></button></div>
          </div>
          <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
            {campaignEditMode ? <div className="space-y-5"><div><label className="text-xs font-semibold text-gray-500 uppercase">{t('projects.nameLabel')}</label><input value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold outline-none mt-1" /></div><div className="grid grid-cols-2 gap-3"><div className="tw-calendar-picker relative"><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.startDate')}</label><input type="text" id="edit-camp-start-input" readOnly onClick={e => (window as any).openCalendar?.({ displayId: 'edit-camp-start-input', mode: 'single' }, e)} value={start} onChange={e=>setStart(e.target.value)} placeholder="dd/mm/yyyy" className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm cursor-pointer"/></div><div className="tw-calendar-picker relative"><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.endDate')}</label><input type="text" id="edit-camp-due-input" readOnly onClick={e => (window as any).openCalendar?.({ displayId: 'edit-camp-due-input', mode: 'single' }, e)} value={due} onChange={e=>setDue(e.target.value)} placeholder="dd/mm/yyyy" className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm cursor-pointer"/></div></div><div><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.owner')}</label><MultiSelect options={visiblePeople.map(person=>({value:String(person.id),label:person.name+(person.departments?.name?` · ${person.departments.name}`:'')}))} value={primaryOwnerId?[primaryOwnerId]:[]} maxSelected={1} onChange={(ids:string[])=>setPrimaryOwnerId(ids[0]||'')} placeholder={t('common.selectPic')} /></div><EntityStatusField value={editStatus} onChange={setEditStatus} /><div><label className="text-xs font-semibold text-gray-500 uppercase">{t('projects.objectives')}</label><textarea value={campaignObjective} onChange={e=>setCampaignObjective(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none min-h-24 mt-1 text-sm" /></div><div><label className="text-xs font-semibold text-gray-500 uppercase">{t('projects.col.budget')}</label><div className="relative mt-1"><input type="number" min="0" value={campaignBudget} onChange={e=>setCampaignBudget(e.target.value)} className="w-full p-2.5 pr-14 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm font-semibold" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-gray-500 pointer-events-none">VND</span></div></div><div className="grid grid-flow-col auto-cols-max gap-3 justify-end mt-6 pt-4 border-t border-gray-100 dark:border-slate-700"><button onClick={() => setCampaignEditMode(false)} className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 rounded-xl text-sm font-semibold">{t('common.cancel')}</button><button onClick={saveCampaignEdit} className="px-5 py-2.5 bg-[#002e6d] text-white rounded-xl text-sm font-semibold">{t('projects.saveChanges')}</button></div></div> : <div className="space-y-7"><EntityActionBadges
              priority={getCampaignPriority(selectedCampaign)}
              status={selectedCampaign.status || 'planning'}
              onPriorityChange={async (newPriority) => {
                if (!selectedCampaign || !selectedRoot) return;
                setCachedCampaignPriority(selectedCampaign.id, newPriority);
                const updated = { ...selectedCampaign, priority: newPriority };
                setSelectedCampaign(updated);
                if ((state as any).setCampaigns) {
                  (state as any).setCampaigns((items: any[]) => items.map((item: any) => item.id === selectedCampaign.id ? { ...item, priority: newPriority } : item));
                }
                window.dispatchEvent(new Event('campaigns:changed'));
                void workflow.refresh();
                toast.success('Đã cập nhật mức ưu tiên');
                try {
                  await supabase.from('activity_log').insert({
                    workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca',
                    user_id: profile?.id || null,
                    action: 'priority_updated',
                    entity_type: 'campaign',
                    entity_id: selectedCampaign.id,
                    metadata: { priority: newPriority },
                  });
                } catch {}
              }}
              onStatusChange={async (newStatus) => {
                if (!selectedCampaign || !selectedRoot) return;
                const { error } = await supabase.from('campaigns').update({ status: newStatus }).eq('id', selectedCampaign.id);
                if (error) return toast.error('Lỗi cập nhật trạng thái');
                const updated = { ...selectedCampaign, status: newStatus };
                setSelectedCampaign(updated);
                if ((state as any).setCampaigns) {
                  (state as any).setCampaigns((items: any[]) => items.map((item: any) => item.id === selectedCampaign.id ? { ...item, status: newStatus } : item));
                }
                window.dispatchEvent(new Event('campaigns:changed'));
                void workflow.refresh();
                toast.success('Đã cập nhật trạng thái');
              }}
              onEdit={() => {
                setTitle(selectedCampaign.name);
                setEditStatus(selectedCampaign.status || 'planning');
                setStart(selectedCampaign.start_date || '');
                setDue(selectedCampaign.end_date || '');
                setCampaignObjective(selectedCampaign.objective || '');
                setCampaignBudget(selectedCampaign.budget ? String(selectedCampaign.budget) : '');
                setPrimaryOwnerId(selectedCampaign.lead_id ? String(selectedCampaign.lead_id) : '');
                setCampaignEditMode(true);
              }}
              canManage={selectedRoot}
            /><div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 text-sm"><div><p className="text-[10px] uppercase text-gray-400">{t('common.owner')}</p><div className="mt-1 flex flex-wrap gap-2">{(workflow.tracks.find(track => track.entity_type === "campaign" && track.entity_id === selectedCampaign.id)?.pics || []).map(person => <span key={person.id} className="flex items-center gap-1.5 text-xs font-semibold"><Avatar name={person.name} src={person.avatar_url} className="w-5 h-5 text-[10px]"/>{person.name}</span>)}</div></div><div><p className="text-[10px] uppercase text-gray-400 mb-1">{t('common.timeline')}</p><div className="mt-1 flex items-center gap-1.5 flex-wrap text-sm"><span className="font-normal text-gray-700 dark:text-gray-300">{dateValue(selectedCampaign.start_date || '')}</span><span className="text-gray-400">–</span><span className="font-bold text-red-600 dark:text-red-400">{dateValue(selectedCampaign.end_date || '')}</span></div></div><div><p className="text-[10px] uppercase text-gray-400">{t('common.creator')}</p><div className="mt-1 font-semibold flex items-center gap-2"><Avatar name={(selectedCampaign as any)?.creator?.name || '---'} src={(selectedCampaign as any)?.creator?.avatar_url} className="w-5 h-5 text-[10px] shadow-sm" /> <span className="line-clamp-1">{(selectedCampaign as any)?.creator?.name || '---'}</span></div></div></div><WorkflowTrackingSummary kind="campaign" id={selectedCampaign.id} hub={workflow} onOpenTask={setSourceTask} statusFilter={statusFilter} /><section><h3 className="font-bold text-sm mb-2">{t('common.description')}</h3><div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 text-sm text-gray-600 dark:text-gray-300">{selectedCampaign.objective || t('tasks.noDescription')}</div></section>
<section><h3 className="font-bold text-sm flex gap-2 items-center mb-3"><Users size={16}/> {t('projects.subtasks')}</h3><div className="space-y-2">{campaignSubtasks.filter(subtask => subtask.status !== 'deleted' && (statusFilter === 'completed' ? isTaskDone(subtask.status) : true)).map(s => {
  const canToggle = selectedRoot || isGlobalManager(profile) || Number(s.assignee_id) === Number(profile?.id);
  return (
    <div
      key={s.id}
      onClick={() => setSelectedSubtask(s)}
      className={`p-3 rounded-xl border text-sm group relative transition-all cursor-pointer min-w-0 overflow-hidden ${deletingIds.includes(s.id) ? "animate-fade-out" : ""} ${
        isTaskDone(s.status)
          ? 'border-emerald-400/70 dark:border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60'
          : 'border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-gray-100/60 dark:hover:bg-slate-800/70'
      }`}
    >
      {/* Hover action buttons in top-right */}
      <div
        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity grid grid-flow-col auto-cols-max items-center gap-1 z-10"
        onClick={event => event.stopPropagation()}
      >
        <TaskPinButton taskId={taskKey('campaign_subtask', s.id)} size={13} className="!p-1" />
        {selectedRoot && (
          <button
            type="button"
            onClick={() => removeCampaignSubtask(s.id)}
            title={lang === 'en' ? 'Delete subtask' : 'Xóa'}
            aria-label={lang === 'en' ? 'Delete subtask' : 'Xóa'}
            className="p-1 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Main content layout: Checkbox + Column 2 */}
      <div className="grid grid-cols-[auto_1fr] items-start gap-2.5 min-w-0 pr-14 select-none">
        <input
          type="checkbox"
          checked={isTaskDone(s.status)}
          disabled={!canToggle}
          onClick={(e) => e.stopPropagation()}
          onChange={() => void toggleCampaignSubtask(s)}
          className="mt-0.5 w-4 h-4 rounded text-primary border-gray-300 dark:border-slate-600 focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="min-w-0 grid grid-cols-1 gap-1.5">
          {/* Row 1: Title */}
          <span className={`text-sm font-semibold block break-words line-clamp-2 ${isTaskDone(s.status) ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-900 dark:text-white'}`}>
            {s.title}
          </span>

          {/* Row 2: Badges */}
          <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold lowercase ${priorityClass(s.priority || (selectedCampaign as any)?.priority || 'medium')}`}>
              {t(`common.${s.priority || (selectedCampaign as any)?.priority || 'medium'}` as any).toLowerCase()}
            </span>
            {Boolean(campaignSubtaskQuantities?.[s.id] || s.quantity) && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                SL: {campaignSubtaskQuantities?.[s.id] || s.quantity}
              </span>
            )}
            {s.due_date && (
              <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                <Calendar size={11} /> {dateValue(s.due_date)}
              </span>
            )}
            {campaignSubtaskChecklistCounts[s.id]?.total > 0 && (() => {
              const { done, total } = campaignSubtaskChecklistCounts[s.id];
              const isAllDone = done === total && total > 0;
              return (
                <span
                  title={lang === 'en' ? `Checklist: ${done}/${total} completed` : `Đầu việc: ${done}/${total} hoàn thành`}
                  className={`inline-grid grid-flow-col auto-cols-max items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md border ${
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
            {campaignSubtaskCommentCounts[s.id] > 0 && (
              <span title={`${campaignSubtaskCommentCounts[s.id]} ${t('common.comment').toLowerCase()}`} className="inline-grid grid-flow-col auto-cols-max items-center gap-1 text-[11px] text-primary">
                <span className="relative inline-grid place-items-center">
                  <MessageSquare size={12}/>
                  {(Number(s.assignee_id) === Number(profile?.id) || hasMentionOrUnread?.[s.id]) && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm border border-white dark:border-slate-900"></span>}
                </span>
                <span>{campaignSubtaskCommentCounts[s.id]}</span>
              </span>
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
    </div>
  );
})}</div>{selectedRoot && !showCampaignSubtaskForm && <button onClick={() => setShowCampaignSubtaskForm(true)} className="mt-3 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20 w-full text-center border-dashed"><Plus size={16} className="inline mr-1" /> {t('projects.addSubtask')}</button>}
{selectedRoot && showCampaignSubtaskForm && <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3"><input value={campaignNewSubtask} onChange={e=>setCampaignNewSubtask(e.target.value)} placeholder={t('projects.subtaskPlaceholder')} className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"/><div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><select value={campaignSubtaskOwner} onChange={e=>setCampaignSubtaskOwner(e.target.value)} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"><option value="">{t('common.selectPic')}</option>{visiblePeople.map(p => <option key={p.id} value={p.id}>{p.name} {p.departments?.name ? '('+p.departments.name+')' : ''}</option>)}</select><input type="number" min="0" step="1" value={campaignSubtaskQuantity} onChange={e=>setCampaignSubtaskQuantity(e.target.value)} placeholder={t('tasks.quantity')} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"/><div className="tw-calendar-picker relative w-full"><input type="text" id="campaign-subtask-due-input" readOnly onClick={(e) => { if ((window as any).openCalendar) (window as any).openCalendar({ displayId: 'campaign-subtask-due-input', mode: 'single' }, e); }} value={campaignSubtaskDue} onChange={(e) => setCampaignSubtaskDue(e.target.value)} placeholder="dd/mm/yyyy" className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm w-full cursor-pointer"/></div></div><div className="flex gap-2 justify-end"><button onClick={() => setShowCampaignSubtaskForm(false)} className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700">{t('common.cancel')}</button><button onClick={() => { addCampaignSubtask(); }} className="px-3 py-1.5 bg-[#002e6d] text-white text-sm font-semibold rounded-lg shadow-sm">{t('common.add')}</button></div></div>}</section><section><h3 className="font-bold text-sm flex gap-2 items-center mb-3"><MessageSquare size={16}/> {t('common.activityComments')}</h3><div className="space-y-3">{campaignComments.map(c => <CommentMessage key={c.id} id={c.id} authorId={c.user_id} actorId={profile?.id}
        authorName={c.user?.name || 'Member'} avatarUrl={c.user?.avatar_url} body={c.metadata?.body || ''} createdAt={c.created_at} editedAt={c.new_value?.edited_at}
        onEdit={saveEditedCampaignComment} onDelete={removeCampaignComment}
        onReply={()=>{setCampaignComment(value=>`${value}${value && !value.endsWith(' ') ? ' ' : ''}@${(c.user?.name || 'Member').replace(/\s+/g,'')} `);window.setTimeout(()=>campaignCommentInput.current?.focus(),0);}} />)}</div><div className="mt-4"><SmartCommentInput inputRef={campaignCommentInput} value={campaignComment} onChange={setCampaignComment} onSubmit={body => void addCampaignComment(body)} people={visiblePeople} collaboratorIds={campaignCollaboratorIds} placeholder="Add a comment..." /></div></section></div>}

          </div>
        </div>
      )}</>;
}
