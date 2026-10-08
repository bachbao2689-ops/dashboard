import React, { useEffect, useState } from 'react';
import { Bell, Edit3, Shield, Mail, LogOut, History } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { EditProfileModal } from './EditProfileModal';
import { ReportHistoryModal } from './ReportHistoryModal';
import { NotificationLog } from './NotificationLog';
import { ProfileKpis } from './ProfileKpis';

export const ProfileHeader: React.FC<{ role: string }> = ({ role }) => {
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const signOut = useAuthStore(state => state.signOut);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  useEffect(() => {
    if (!isNotificationsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsNotificationsOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isNotificationsOpen]);
  const name = profile?.name || user?.user_metadata?.full_name || 'Chưa cập nhật';
  const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2);
  const dbRole = profile?.role || 'member';
  const roleDisplay = dbRole === 'admin' ? 'Admin' : dbRole === 'manager' ? 'Manager' : dbRole === 'leader' ? 'Leader' : 'Nhân viên';
  const title = profile?.job_title || (profile?.employment_level === 'Leader' || dbRole === 'leader' ? 'Team Lead' : 'Staff');
  const badge = profile?.employment_level || roleDisplay;

  return (
    <>
    <div className="card-hub relative overflow-hidden rounded-2xl p-4 shadow-sm sm:p-5">
      {/* Decorative background blur */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-wrap items-center gap-4">
        
        <div className="order-1 flex min-w-0 flex-1 items-center gap-4 sm:min-w-[240px]">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-2xl font-bold text-white shadow-sm">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt={name} className="w-full h-full object-cover" /> : initials}
          </div>
          
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold text-gray-900 dark:text-white">{name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${profile?.employment_level === 'Leader' || dbRole === 'leader' || dbRole === 'manager' || dbRole === 'admin' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                {badge}
              </span>
            </div>
            
            <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1.5 truncate"><Mail size={14} className="shrink-0" /> <span className="truncate">{profile?.email || user?.email || 'Chưa cập nhật'}</span></div>
              <div className="flex items-center gap-1.5 truncate"><Shield size={14} className="shrink-0" /> <span className="truncate">{profile?.department_name || 'Chưa phân team'} · {title}</span></div>
            </div>
          </div>
        </div>

        <div className="order-3 w-full min-w-0 xl:order-2 xl:w-auto xl:min-w-[420px] xl:flex-[1.35]"><ProfileKpis role={role} /></div>

        <div className="order-2 ml-auto flex flex-wrap items-center justify-end gap-2 xl:order-3">
          <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-gray-200 dark:border-slate-700 text-sm font-medium shadow-sm">
            <Edit3 size={16} /> Edit Profile
          </button>
          <button onClick={() => setIsNotificationsOpen(true)} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
            <Bell size={16} /> Thông báo nội bộ
          </button>
          <button onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-gray-200 dark:border-slate-700 text-sm font-medium shadow-sm text-primary">
            <History size={16} /> Log
          </button>
          
          <button onClick={signOut} aria-label="Đăng xuất" className="p-2 bg-white hover:bg-red-50 hover:text-red-500 dark:bg-slate-800 dark:hover:bg-red-900/30 rounded-xl transition-colors border border-gray-200 dark:border-slate-700 text-gray-500 shadow-sm">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
    <EditProfileModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />
    <ReportHistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
    {isNotificationsOpen && <div role="dialog" aria-modal="true" aria-label="Thông báo nội bộ" className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button type="button" aria-label="Đóng thông báo" onClick={() => setIsNotificationsOpen(false)} className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" />
      <div className="relative max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl shadow-xl"><NotificationLog includeTeam={role === 'manager'} onClose={() => setIsNotificationsOpen(false)} /></div>
    </div>}
    </>
  );
};
