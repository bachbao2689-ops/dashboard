import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { DepartmentOption, Member, NewMember, UserRole } from '../../../hooks/useMembers';
import type {MemberAccess} from '../../../services/memberAccounts';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite?: (data: NewMember) => Promise<boolean>;
  onSaveAccess?: (data: MemberAccess) => Promise<boolean>;
  member?: Member;
  departments: DepartmentOption[];
  canAddAdmin: boolean;
}

const fieldClass = 'w-full px-4 py-2.5 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-primary';

/** Same member form/surfaces for creation and the following permissions step. */
export function InviteMemberModal({ isOpen, onClose, onInvite, onSaveAccess, member, departments, canAddAdmin }: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(member?.role || 'member');
  const [departmentId, setDepartmentId] = useState(member?.department_id || '');
  const [jobTitle, setJobTitle] = useState(member?.job_title || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialog=useRef<HTMLDivElement>(null);
  const submitting=useRef(false);
  const permissions=Boolean(member);
  const titleId=permissions?'member-permissions-title':'add-member-title';

  useEffect(()=>{
    if (!isOpen) return;
    const previous=document.activeElement as HTMLElement | null;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    dialog.current?.querySelector<HTMLElement>('input,select,button')?.focus();
    const keydown=(event: KeyboardEvent)=>{
      if (event.key==='Escape' && !submitting.current) onClose();
      if (event.key!=='Tab' || !dialog.current) return;
      const items=Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)'));
      const first=items[0],last=items.at(-1);
      if (event.shiftKey && document.activeElement===first) {event.preventDefault();last?.focus();}
      else if (!event.shiftKey && document.activeElement===last) {event.preventDefault();first?.focus();}
    };
    document.addEventListener('keydown',keydown);
    return ()=>{document.removeEventListener('keydown',keydown);document.body.style.overflow=previousOverflow;if(previous?.isConnected)previous.focus();};
  },[isOpen,onClose]);

  if (!isOpen || typeof document === 'undefined') return null;
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current=true;setIsSubmitting(true);
    try {
      const success=permissions
        ? await onSaveAccess?.({role,department_id:departmentId,job_title:jobTitle})
        : await onInvite?.({email,name});
      if (success) {setEmail('');setName('');onClose();}
    } finally {submitting.current=false;setIsSubmitting(false);}
  };

  return createPortal(
    <div className="fixed inset-0 z-[10050] grid place-items-center p-4 bg-slate-950/45 dark:bg-black/75 backdrop-blur-sm" onClick={() => !isSubmitting && onClose()}>
      <div ref={dialog} data-modal-surface="true" role="dialog" aria-modal="true" aria-labelledby={titleId} className="modal-liquid-glass w-full max-w-lg max-h-[90dvh] overflow-y-auto p-5 sm:p-6 rounded-2xl border border-white/95 dark:border-slate-700/80" onClick={event => event.stopPropagation()}>
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 mb-5">
          <h2 id={titleId} className="text-xl font-semibold text-primary dark:text-white">{permissions?'Phân quyền tài khoản':'Thêm thành viên'}</h2>
          <button type="button" disabled={isSubmitting} onClick={onClose} aria-label="Đóng" className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {permissions ? <div className="rounded-[8px] border border-gray-200 p-3 dark:border-slate-700">
            <p className="font-semibold text-gray-900 dark:text-white break-words">{member?.name}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 break-all">{member?.email}</p>
          </div> : <>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Họ và tên *
              <input required maxLength={120} value={name} onChange={event => setName(event.target.value)} className={`${fieldClass} mt-1`} placeholder="Nhập tên thành viên" />
            </label>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email *
              <input type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className={`${fieldClass} mt-1`} placeholder="ten@congty.com" />
            </label>
          </>}
          {permissions && <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quyền *
                <select value={role} onChange={event => setRole(event.target.value as UserRole)} className={`${fieldClass} mt-1`}>
                  <option value="member">Thành viên</option>
                  <option value="leader">Leader</option>
                  <option value="manager">Manager</option>
                  {canAddAdmin && <option value="admin">Admin</option>}
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phòng ban{!['admin','manager'].includes(role)?' *':''}
                <select required={!['admin','manager'].includes(role)} value={departmentId} onChange={event => setDepartmentId(event.target.value)} className={`${fieldClass} mt-1`}>
                  <option value="">Chọn phòng ban</option>
                  {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Chức danh
              <input maxLength={120} value={jobTitle} onChange={event => setJobTitle(event.target.value)} className={`${fieldClass} mt-1`} placeholder="Ví dụ: Graphic Designer" />
            </label>
          </>}
          <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">{permissions?'Quyền được áp dụng sau khi lưu. Thành viên dùng tài khoản đã xác thực cùng email để đăng nhập.':'Tiếp theo: phân quyền và chọn phòng ban cho hồ sơ mới.'}</p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button type="button" disabled={isSubmitting} onClick={onClose} className="px-4 py-2.5 rounded-[8px] border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300">{permissions?'Để sau':'Hủy'}</button>
            <button type="submit" disabled={isSubmitting} className="btn-add-new px-4 py-2.5 rounded-[8px] disabled:opacity-50">{isSubmitting?'Đang lưu...':permissions?'Lưu phân quyền':'Tạo và phân quyền'}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
