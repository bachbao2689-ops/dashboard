import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { DepartmentOption, NewMember, UserRole } from '../../../hooks/useMembers';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (data: NewMember) => Promise<boolean>;
  departments: DepartmentOption[];
  canAddAdmin: boolean;
}

const fieldClass = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-primary';

export function InviteMemberModal({ isOpen, onClose, onInvite, departments, canAddAdmin }: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [departmentId, setDepartmentId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const success = await onInvite({ email, name, role, department_id: departmentId, job_title: jobTitle });
      if (success) {
        setEmail(''); setName(''); setRole('member'); setDepartmentId(''); setJobTitle('');
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !isSubmitting && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="add-member-title" className="card-hub w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-white dark:bg-slate-800" onClick={event => event.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 id="add-member-title" className="text-xl font-semibold text-gray-900 dark:text-white">Thêm thành viên</h2>
          <button type="button" disabled={isSubmitting} onClick={onClose} aria-label="Đóng" className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Họ và tên *
            <input required value={name} onChange={event => setName(event.target.value)} className={`${fieldClass} mt-1`} placeholder="Nhập tên thành viên" />
          </label>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email *
            <input type="email" required value={email} onChange={event => setEmail(event.target.value)} className={`${fieldClass} mt-1`} placeholder="ten@congty.com" />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phòng ban *
              <select required value={departmentId} onChange={event => setDepartmentId(event.target.value)} className={`${fieldClass} mt-1`}>
                <option value="">Chọn phòng ban</option>
                {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quyền *
              <select value={role} onChange={event => setRole(event.target.value as UserRole)} className={`${fieldClass} mt-1`}>
                <option value="member">Thành viên</option>
                <option value="leader">Leader</option>
                <option value="manager">Manager</option>
                {canAddAdmin && <option value="admin">Admin</option>}
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Chức danh
            <input value={jobTitle} onChange={event => setJobTitle(event.target.value)} className={`${fieldClass} mt-1`} placeholder="Ví dụ: Graphic Designer" />
          </label>
          <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">Thao tác này tạo hồ sơ nhân sự. Để đăng nhập, thành viên cần có tài khoản Supabase Auth cùng email.</p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" disabled={isSubmitting} onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300">Hủy</button>
            <button type="submit" disabled={isSubmitting || departments.length === 0} className="px-4 py-2.5 rounded-xl bg-[#002e6d] text-white hover:bg-[#001f4d] disabled:opacity-50">{isSubmitting ? 'Đang thêm...' : 'Thêm thành viên'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
