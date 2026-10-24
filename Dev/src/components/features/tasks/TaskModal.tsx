import toast from "react-hot-toast";
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useTranslation } from '../../../i18n/translations';
import { useWorkspaceDirectory } from '../../../hooks/useWorkspaceData';
import { canViewTeamManagement, isGlobalManager, isDepartmentLeader } from '../../../lib/roleScope';
import { TaskDescriptionEditor } from './TaskDescriptionEditor';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const profile = useAuthStore(state => state.profile);
  const directory = useWorkspaceDirectory(isOpen);
  const canChooseDepartment = isGlobalManager(profile);
  const [title, setTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [projectId, setProjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [description, setDescription] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);

  const [width, setWidth] = useState(500);
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    if (!resizing) return;
    const move = (e: MouseEvent) => setWidth(Math.max(400, Math.min(window.innerWidth - e.clientX, 800)));
    const up = () => setResizing(false);
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
  }, [resizing]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setDepartmentId(profile?.department_id || '');
      void supabase.from('projects').select('id, name').then(({ data, error }) => {
        if (error) console.error('Could not load projects for task form:', error);
        setProjects(data || []);
      });
    } else {
      // Reset form when closed
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setStartDate('');
      setAssigneeId('');
      setProjectId('');
      setDepartmentId('');
      setProjects([]);
    }
  }, [isOpen, profile?.department_id]);

  useEffect(() => {
    // Never retain an assignee from another department after changing the team.
    if (assigneeId && directory.data && !directory.data.users.some(user => String(user.id) === assigneeId && user.department_id === departmentId)) {
      setAssigneeId('');
    }
  }, [departmentId, assigneeId, directory.data]);

  const parseLocal = (s: string) => {
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const p = s.split('/');
    if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
    return s;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !departmentId || !profile?.id) return;
    if (assigneeId && !visibleUsers.some(user => String(user.id) === assigneeId)) {
      toast.error('Người thực hiện không thuộc phòng ban này.');
      return;
    }
    
    setLoading(true);
    try {
      const { data: wsData } = await supabase.from('workspaces').select('id').limit(1).single();
      if (!wsData) throw new Error("No workspace found");
      
      const columnData = await supabase.from('columns').select('id').eq('workspace_id', wsData.id).eq('name', 'Yet to Start').single();
      const colId = columnData.data?.id || null;

      const { error: insertError } = await supabase.from('tasks').insert([{
         title: title.trim(),
         description: description.trim(),
         priority,
         due_date: parseLocal(dueDate),
         start_date: parseLocal(startDate),
         department_id: departmentId,
         assignee_id: assigneeId || null,
         project_id: projectId || null,
         task_ref: 'TK' + Math.floor(Math.random() * 10000),
         status: 'todo',
         column_id: colId,
         workspace_id: wsData.id,
         created_by: profile.id
      }]);

      if (insertError) throw insertError;
      
      onSuccess();
      window.dispatchEvent(new Event('tasks:changed'));
      toast.success('Task created successfully');
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setStartDate('');
      setAssigneeId('');
      setProjectId('');
      setDepartmentId(profile.department_id || '');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const openCal = (id: string, e: React.MouseEvent) => {
    // @ts-ignore
    if (window.openCalendar) {
      // @ts-ignore
      window.openCalendar({ displayId: id, mode: 'single' }, e);
    }
  };

  const departments = directory.data?.departments || [];
  const users = directory.data?.users || [];
  const departmentName = departments.find(department => String(department.id) === String(departmentId))?.name || profile?.department_name || t('tasks.selectDepartment');
  const visibleUsers = departmentId
    ? users.filter(user => String(user.department_id) === String(departmentId) && (canViewTeamManagement(profile) || isDepartmentLeader(profile) || String(user.id) === String(profile?.id)))
    : [];
  const visibleProjects = projects;

  return (
    <>
      {isOpen && (
        <div 
          className="xl:hidden fixed inset-0 bg-slate-900/40 dark:bg-slate-900/60 z-[65] transition-opacity backdrop-blur-xs"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div 
        style={{ '--drawer-width': `${width}px` } as React.CSSProperties} 
        className={`dashboard-detail-drawer bg-white dark:bg-slate-800 shrink-0 ${isOpen ? 'w-full max-w-full xl:max-w-[calc(100vw-32px)] xl:w-[var(--drawer-width)] xl:max-w-[min(var(--drawer-width),50vw)] shadow-drawer-task border border-blue-500/20 opacity-100 pointer-events-auto drawer-slide-in' : 'w-0 min-w-0 shadow-none border-0 opacity-0 pointer-events-none'} z-[75] ${!resizing ? 'transition-[width,opacity] duration-300 ease-out' : ''}`}
      >
        {isOpen && (
          <>
            <div onMouseDown={() => setResizing(true)} className="hidden xl:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
              <div>
                <h3 className="font-bold text-xl text-gray-900 dark:text-white">{t('tasks.createTitle')}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('tasks.createSubtitle')}</p>
              </div>
              <button 
                disabled={loading} 
                aria-label={t('common.close')} 
                onClick={onClose} 
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} aria-busy={loading} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="min-h-0 min-w-0 p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                <fieldset disabled={loading} className="min-w-0 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                      {t('tasks.taskTitle')} <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      maxLength={500}
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
                      placeholder={t('tasks.titlePlaceholder')}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                        {t('common.department')} <span className="text-red-500">*</span>
                      </label>
                      {canChooseDepartment ? (
                        <select required value={departmentId} onChange={e => { setDepartmentId(e.target.value); setAssigneeId(''); }} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm">
                          <option value="">{t('tasks.selectDepartment')}</option>
                          {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
                        </select>
                      ) : (
                        <div className="flex min-h-11 items-center truncate rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 font-medium text-gray-900 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white" title={departmentName}>{departmentName}</div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                        {t('common.assignee')}
                      </label>
                      <select 
                        value={assigneeId}
                        onChange={e => setAssigneeId(e.target.value)}
                        disabled={directory.loading || !!directory.error || !departmentId}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
                      >
                        <option value="">{t('common.unassigned')}</option>
                        {directory.loading && <option disabled>{t('common.loading')}</option>}
                        {visibleUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                      {directory.error && <p className="mt-1 text-xs text-red-600" role="alert">{directory.error}</p>}
                      {!directory.loading && !directory.error && departmentId && visibleUsers.length === 0 && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Chưa có thành viên đang hoạt động trong phòng ban này.</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                        {t('common.priority')}
                      </label>
                      <select 
                        value={priority}
                        onChange={e => setPriority(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
                      >
                        <option value="low">{t('common.low')}</option>
                        <option value="medium">{t('common.medium')}</option>
                        <option value="high">{t('common.high')}</option>
                        <option value="urgent">{t('common.urgent')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                        {t('common.project')}
                      </label>
                      <select 
                        value={projectId}
                        onChange={e => setProjectId(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
                      >
                        <option value="">{t('tasks.noProject')}</option>
                        {visibleProjects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="tw-calendar-picker relative">
                      <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                        {t('common.startDate')}
                      </label>
                      <input 
                        type="text" 
                        id="task-start-input"
                        readOnly
                        onClick={(e) => openCal('task-start-input', e)}
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        placeholder="dd/mm/yyyy"
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-gray-400 dark:placeholder-gray-500 cursor-pointer shadow-sm"
                      />
                    </div>
                    <div className="tw-calendar-picker relative">
                      <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                        {t('common.dueDate')}
                      </label>
                      <input 
                        type="text" 
                        id="task-due-input"
                        readOnly
                        onClick={(e) => openCal('task-due-input', e)}
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        placeholder="dd/mm/yyyy"
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-gray-400 dark:placeholder-gray-500 cursor-pointer shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                      {t('common.description')}
                    </label>
                    <TaskDescriptionEditor 
                      value={description}
                      onChange={setDescription}
                      placeholder={t('tasks.descPlaceholder')}
                    />
                  </div>
                </fieldset>
              </div>

              <div className="p-4 md:p-5 border-t border-gray-200 dark:border-slate-700 flex gap-3 shrink-0 bg-white dark:bg-slate-800" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                <button 
                  type="button" 
                  disabled={loading} 
                  onClick={onClose} 
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  disabled={loading || directory.loading || !!directory.error || !title.trim() || !departmentId}
                  type="submit" 
                  className="min-w-0 flex-1 disabled:opacity-50 px-4 py-2.5 bg-[#002e6d] hover:bg-[#001f4d] text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
                >
                  {loading ? t('tasks.creating') : t('tasks.createBtn')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </>
  );
};
