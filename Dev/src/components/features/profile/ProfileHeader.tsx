import React, { useState } from 'react';
import { Edit3, Shield, Mail, LogOut } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { Camera } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { toast } from 'react-hot-toast';
import { EditProfileModal } from './EditProfileModal';
import { CropModal } from '../../common/CropModal';
import { ProfileKpis } from './ProfileKpis';

export const ProfileHeader: React.FC<{ role: string }> = ({ role }) => {
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const signOut = useAuthStore(state => state.signOut);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const updateUserMetadata = useAuthStore(state => state.updateUserMetadata);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Vui lòng chọn file ảnh');
    if (file.size > 5 * 1024 * 1024) return toast.error('Ảnh tối đa 5MB');
    
    const reader = new FileReader();
    reader.addEventListener('load', () => setCropImageSrc(reader.result?.toString() || null));
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropSubmit = async (croppedBlob: Blob) => {
    if (!user) return;
    setCropImageSrc(null);
    setIsUploading(true);
    
    try {
      const path = `${user.id}/${Date.now()}.jpg`;
      const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: 'image/jpeg' });
      if (error) throw error;
      
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      await updateUserMetadata({ avatar_url: data.publicUrl });
      toast.success('Đã cập nhật ảnh đại diện');
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải ảnh lên.');
    } finally { 
      setIsUploading(false); 
    }
  };
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
          <div className="relative group">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-2xl font-bold text-white shadow-sm transition-all hover:ring-2 hover:ring-primary hover:ring-offset-2"
            >
              {profile?.avatar_url ? <img src={profile.avatar_url} alt={name} className="w-full h-full object-cover" /> : initials}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                {isUploading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Camera size={20} className="text-white" />
                )}
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
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
          <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-gray-200 dark:border-[#8fa8d0] text-sm font-medium shadow-sm">
            <Edit3 size={16} /> Edit Profile
          </button>
          <button onClick={signOut} aria-label="Đăng xuất" className="p-2 bg-white hover:bg-red-50 hover:text-red-500 dark:bg-slate-800 dark:hover:bg-red-900/30 rounded-xl transition-colors border border-gray-200 dark:border-[#8fa8d0] text-gray-500 shadow-sm">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
    <EditProfileModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />
    {cropImageSrc && (
      <CropModal
        imageSrc={cropImageSrc}
        onClose={() => setCropImageSrc(null)}
        onCropComplete={handleCropSubmit}
      />
    )}
    </>
  );
};
