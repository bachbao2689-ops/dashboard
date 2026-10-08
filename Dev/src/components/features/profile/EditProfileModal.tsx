import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Lock } from 'lucide-react';
import { CropModal } from '../../common/CropModal';
import { useAuthStore } from '../../../store/authStore';
import toast from 'react-hot-toast';
import { supabase } from '../../../services/supabase';

export const EditProfileModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const updateUserMetadata = useAuthStore(state => state.updateUserMetadata);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const [formData, setFormData] = useState({
    fullName: user?.user_metadata?.full_name || '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({ fullName: profile?.name || user?.user_metadata?.full_name || '' });
      setAvatarUrl(profile?.avatar_url || null);
    }
  }, [isOpen, user?.user_metadata?.full_name, profile?.name, profile?.avatar_url]);

  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
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
    setIsSaving(true);
    
    try {
      const path = `${user.id}/${Date.now()}.jpg`;
      const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: 'image/jpeg' });
      if (error) throw error;
      
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      await updateUserMetadata({ avatar_url: data.publicUrl });
      setAvatarUrl(data.publicUrl);
      toast.success('Đã cập nhật ảnh đại diện');
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải ảnh lên');
    } finally { setIsSaving(false); }
  };

  const handleUpdatePassword = async () => {
    if (passwords.new.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    if (passwords.new !== passwords.confirm) {
      return toast.error('Passwords do not match');
    }
    
    // OFFLINE DEV BYPASS CHECK
    if (user?.id === 'dev-admin-id') {
      toast.success('Password updated (Offline Mode simulated)');
      setPasswords({ new: '', confirm: '' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.new });
      if (error) throw error;
      
      toast.success('Password updated successfully!');
      setPasswords({ new: '', confirm: '' });
      onClose(); // Optional: close modal after change
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateUserMetadata({
        full_name: formData.fullName,
      });
      toast.success('Profile updated successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50">
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Account Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>
        <div className="flex border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Profile Info
          </button>
          <button 
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'password' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Security & Password
          </button>
        </div>


                <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'profile' ? (
            <>

          <div className="flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center text-3xl font-bold shadow-sm ring-4 ring-gray-50 dark:ring-slate-900/50">
                {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" /> : (formData.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U')}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={24} className="text-white" />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                className="px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-blue-400 rounded-lg transition-colors"
              >
                Đổi ảnh
              </button>
              {avatarUrl && (
                <button 
                  type="button" 
                  onClick={async () => {
                    if (!confirm('Bạn có chắc muốn xoá ảnh đại diện?')) return;
                    setIsSaving(true);
                    try {
                      await updateUserMetadata({ avatar_url: null });
                      setAvatarUrl('');
                      toast.success('Đã xoá ảnh đại diện');
                    } catch (e) {
                      toast.error('Có lỗi xảy ra khi xoá ảnh');
                    } finally {
                      setIsSaving(false);
                    }
                  }} 
                  className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 rounded-lg transition-colors"
                >
                  Xoá ảnh
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <input type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white" />
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-slate-700 space-y-4 mt-2">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5"><Lock size={12} /> Email (Read-only)</label>
                <input type="text" value={user?.email || 'Chưa cập nhật'} disabled className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-500 cursor-not-allowed" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5"><Lock size={12} /> Department (Read-only)</label>
                <input type="text" value={profile?.department_name || 'Chưa phân team'} disabled className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-500 cursor-not-allowed" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5"><Lock size={12} /> Job title & level (Read-only)</label>
                <input type="text" value={[profile?.job_title, profile?.employment_level].filter(Boolean).join(' · ') || 'Chưa cập nhật'} disabled className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-500 cursor-not-allowed" />
              </div>
            </div>
          </div>
        
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                <input 
                  type="password" 
                  value={passwords.new} 
                  onChange={e => setPasswords({...passwords, new: e.target.value})} 
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                <input 
                  type="password" 
                  value={passwords.confirm} 
                  onChange={e => setPasswords({...passwords, confirm: e.target.value})} 
                  placeholder="Repeat new password"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white" 
                />
              </div>
              
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 rounded-xl mt-6">
                <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-500 mb-1">Important Notice</h4>
                <p className="text-xs text-yellow-700 dark:text-yellow-600">
                  Changing your password will immediately secure your account. Make sure to use a strong password.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
            Cancel
          </button>
          {activeTab === 'profile' ? (
            <button onClick={handleSave} disabled={isSaving} className="px-5 py-2 font-medium text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          ) : (
            <button onClick={handleUpdatePassword} disabled={isUpdatingPassword || !passwords.new} className="px-5 py-2 font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          )}
        </div>
      </div>
      {cropImageSrc && (
        <CropModal
          imageSrc={cropImageSrc}
          onClose={() => setCropImageSrc(null)}
          onCropComplete={handleCropSubmit}
        />
      )}
    </div>
  );
};
