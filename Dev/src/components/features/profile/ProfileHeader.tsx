import React, { useState } from 'react';
import { Settings, Edit3, Shield, Mail, Calendar, LogOut } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { EditProfileModal } from './EditProfileModal';
import { TrashModal } from './TrashModal';
import { Trash2 } from 'lucide-react';
import type { ProfileTab } from '../../../pages/MyTasks';

export const ProfileHeader: React.FC<{ role: string, onTabChange: (tab: ProfileTab) => void }> = ({ role, onTabChange }) => {
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const signOut = useAuthStore(state => state.signOut);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const name = profile?.name || user?.user_metadata?.full_name || 'Chưa cập nhật';
  const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2);
  const title = profile?.job_title || (profile?.employment_level === 'Leader' ? 'Team Lead' : 'Staff');
  const badge = profile?.employment_level || (role === 'admin' ? 'Admin' : role === 'manager' ? 'Manager' : 'Nhân viên');

  return (
    <>
    <div className="card-hub p-6 rounded-2xl relative overflow-hidden shadow-sm">
      {/* Decorative background blur */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
        
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center text-3xl font-bold shadow-sm overflow-hidden">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt={name} className="w-full h-full object-cover" /> : initials}
          </div>
          
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${profile?.employment_level === 'Leader' || role === 'manager' || role === 'admin' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                {badge}
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 mt-3 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1.5"><Mail size={16} /> {profile?.email || user?.email || 'Chưa cập nhật'}</div>
              <div className="flex items-center gap-1.5"><Shield size={16} /> {profile?.department_name || 'Chưa phân team'} · {title}</div>
              <div className="flex items-center gap-1.5"><Calendar size={16} /> {badge}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-gray-200 dark:border-slate-700 text-sm font-medium shadow-sm">
            <Edit3 size={16} /> Edit Profile
          </button>
          
          <button onClick={() => setIsTrashModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-gray-200 dark:border-slate-700 text-sm font-medium shadow-sm text-red-600 hover:text-red-700">
            <Trash2 size={16} /> Đã xóa
          </button>
          <button onClick={() => onTabChange('settings')} className="p-2 bg-white hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-gray-200 dark:border-slate-700 shadow-sm">
            <Settings size={18} />
          </button>
          <button onClick={signOut} className="p-2 bg-white hover:bg-red-50 hover:text-red-500 dark:bg-slate-800 dark:hover:bg-red-900/30 rounded-xl transition-colors border border-gray-200 dark:border-slate-700 text-gray-500 shadow-sm">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
    <EditProfileModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />
    <TrashModal isOpen={isTrashModalOpen} onClose={() => setIsTrashModalOpen(false)} />
    </>
  );
};
