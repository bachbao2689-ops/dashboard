import toast from "react-hot-toast";
import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const profile = useAuthStore(state => state.profile);
  const canChooseDepartment = profile?.role === 'admin' || profile?.role === 'manager';
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

  useEffect(() => {
    if (isOpen) {
      fetchFormData();
      // A department leader always creates work in their own department.
      if (!canChooseDepartment && profile?.department_id) setDepartmentId(profile.department_id);
    }
  }, [isOpen, canChooseDepartment, profile?.department_id]);

  useEffect(() => {
    // Never retain an assignee from another department after changing the team.
    if (assigneeId && !users.some(user => String(user.id) === assigneeId && user.department_id === departmentId)) {
      setAssigneeId('');
    }
  }, [departmentId, assigneeId, users]);

  useEffect(() => {
    const startEl = document.getElementById('task-start-input');
    const dueEl = document.getElementById('task-due-input');

    const handleStartChange = (e: any) => setStartDate(e.target.value);
    const handleDueChange = (e: any) => setDueDate(e.target.value);

    startEl?.addEventListener('change', handleStartChange);
    dueEl?.addEventListener('change', handleDueChange);

    return () => {
      startEl?.removeEventListener('change', handleStartChange);
      dueEl?.removeEventListener('change', handleDueChange);
    };
  }, [isOpen]);

  const parseLocal = (s: string) => {
    if (!s) return null;
    const p = s.split(/[-/]/);
    if(p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
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
    if (!title || !departmentId) return;
    
    setLoading(true);
    try {
      const { data: wsData } = await supabase.from('workspaces').select('id, owner_id').limit(1).single();
      if (!wsData) throw new Error("No workspace found");
      
      const columnData = await supabase.from('columns').select('id').eq('workspace_id', wsData.id).eq('name', 'Yet to Start').single();
      const colId = columnData.data?.id || null;

      await supabase.from('tasks').insert([{
         title,
         description,
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
      
      onSuccess();
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
    } catch (err) {
      console.error(err);
      toast.error('Failed to create task');
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
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Task Title <span className="text-red-500">*</span></label>
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
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Department <span className="text-red-500">*</span></label>
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
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Assignee</label>
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Priority</label>
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
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Project</label>
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

        <div className="grid grid-cols-2 gap-4">
          <div className="tw-calendar-picker relative">
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Start Date</label>
            <input 
              type="text" 
              id="task-start-input"
              readOnly
              onClick={(e) => openCal('task-start-input', e)}
              value={startDate}
              placeholder="dd/mm/yyyy"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-gray-400 dark:placeholder-gray-500 cursor-pointer shadow-sm"
            />
          </div>
          <div className="tw-calendar-picker relative">
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Due Date</label>
            <input 
              type="text" 
              id="task-due-input"
              readOnly
              onClick={(e) => openCal('task-due-input', e)}
              value={dueDate}
              placeholder="dd/mm/yyyy"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-gray-400 dark:placeholder-gray-500 cursor-pointer shadow-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Description</label>
          <textarea 
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-gray-400 dark:placeholder-gray-500 min-h-[100px] shadow-sm"
            placeholder="Describe task details..."
          />
        </div>

        <div className="flex justify-end items-center gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="px-6 py-2.5 bg-[#002e6d] hover:bg-[#001f4d] text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm hover:shadow-md"
          >
            {loading ? 'Saving...' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
