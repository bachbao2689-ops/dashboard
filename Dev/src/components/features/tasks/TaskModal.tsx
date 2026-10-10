import toast from "react-hot-toast";
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const profile = useAuthStore(state => state.profile);
  const canChooseDepartment = true;
  const [title, setTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [projectId, setProjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [description, setDescription] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
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
      fetchFormData();
      if (!canChooseDepartment && profile?.department_id) setDepartmentId(profile.department_id);
    } else {
      // Reset form when closed
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setStartDate('');
      setAssigneeId('');
      setProjectId('');
      if (canChooseDepartment) setDepartmentId('');
    }
  }, [isOpen, canChooseDepartment, profile?.department_id]);

  useEffect(() => {
    // Never retain an assignee from another department after changing the team.
    if (assigneeId && !users.some(user => String(user.id) === assigneeId && user.department_id === departmentId)) {
      setAssigneeId('');
    }
  }, [departmentId, assigneeId, users]);

  const parseLocal = (s: string) => {
    if (!s) return null;
    const p = s.split(/[-/]/);
    if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
    return s;
  };

  const fetchFormData = async () => {
    const [usersRes, deptsRes, projectsRes] = await Promise.all([
      supabase.from('users').select('id, name, department_id').eq('is_active', true),
      supabase.from('departments').select('id, name'),
      supabase.from('projects').select('id, name')
    ]);
    if (usersRes.data) setUsers(usersRes.data);
    
    // Seed departments if empty (since DB is fresh)
    if (deptsRes.data && deptsRes.data.length > 0) {
      setDepartments(deptsRes.data);
    } else {
      setDepartments([
        { id: '1', name: 'ECOMMERCE' },
        { id: '2', name: 'KSHOP' },
        { id: '3', name: 'MARKETING' },
        { id: '4', name: 'DESIGN' }
      ]);
    }

    if (projectsRes.data) setProjects(projectsRes.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !departmentId) return;
    
    setLoading(true);
    try {
      const { data: wsData } = await supabase.from('workspaces').select('id, owner_id').limit(1).single();
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
         created_by: wsData.owner_id
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
      setDepartmentId('');
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

  const visibleDepartments = canChooseDepartment
    ? departments
    : departments.filter(department => department.id === profile?.department_id);
  const visibleUsers = departmentId
    ? users.filter(user => user.department_id === departmentId)
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
        className={`h-full bg-white dark:bg-slate-800 rounded-l-3xl shrink-0 ${isOpen ? 'w-full max-w-full md:w-[min(var(--drawer-width),100%)] md:min-w-0 shadow-drawer-task border-l border-blue-500/20 drawer-slide-in' : 'w-0 min-w-0 shadow-none border-l-0 border-transparent'} absolute xl:relative right-0 top-0 z-[70] flex flex-col overflow-hidden ${!resizing ? 'transition-[width,min-width] duration-300 ease-out' : ''}`}
      >
        {isOpen && (
          <>
            <div onMouseDown={() => setResizing(true)} className="hidden md:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
              <div>
                <h3 className="font-bold text-xl text-gray-900 dark:text-white">Tạo mới task</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Khởi tạo công việc mới vào hệ thống</p>
              </div>
              <button 
                disabled={loading} 
                aria-label="Đóng tạo mới task" 
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
                      Task Title <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      maxLength={500}
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
                      placeholder="Describe task briefly"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                        Department <span className="text-red-500">*</span>
                      </label>
                      <select 
                        required
                        value={departmentId}
                        onChange={e => setDepartmentId(e.target.value)}
                        disabled={!canChooseDepartment}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
                      >
                        {canChooseDepartment && <option value="">Select Department</option>}
                        {visibleDepartments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                        Assignee
                      </label>
                      <select 
                        value={assigneeId}
                        onChange={e => setAssigneeId(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
                      >
                        <option value="">Unassigned</option>
                        {visibleUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                        Priority
                      </label>
                      <select 
                        value={priority}
                        onChange={e => setPriority(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                        Project
                      </label>
                      <select 
                        value={projectId}
                        onChange={e => setProjectId(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
                      >
                        <option value="">No Project</option>
                        {visibleProjects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="tw-calendar-picker relative">
                      <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                        Start Date
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
                        Due Date
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
                      Description
                    </label>
                    <textarea 
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-gray-400 dark:placeholder-gray-500 min-h-[100px] shadow-sm"
                      placeholder="Describe task details..."
                    />
                  </div>
                </fieldset>
              </div>

              <div className="p-5 border-t border-gray-200 dark:border-slate-700 flex gap-3 shrink-0 bg-white dark:bg-slate-800">
                <button 
                  type="button" 
                  disabled={loading} 
                  onClick={onClose} 
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  disabled={loading || !title.trim() || !departmentId} 
                  type="submit" 
                  className="min-w-0 flex-1 disabled:opacity-50 px-4 py-2.5 bg-[#002e6d] hover:bg-[#001f4d] text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
                >
                  {loading ? 'Đang tạo…' : 'Tạo task'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </>
  );
};
