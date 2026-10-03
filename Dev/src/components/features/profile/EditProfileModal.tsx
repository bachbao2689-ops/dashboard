import React, { useState } from 'react';
import { X, Camera, Lock } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import toast from 'react-hot-toast';

export const EditProfileModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const user = useAuthStore(state => state.user);
  const updateUserMetadata = useAuthStore(state => state.updateUserMetadata);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.user_metadata?.full_name || 'Louis Nguyễn',
    phone: '0901234567',
    position: 'Content Manager'
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateUserMetadata({
        full_name: formData.fullName,
        name: formData.fullName,
        phone: formData.phone,
        position: formData.position
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="flex justify-center">
            <div className="relative group cursor-pointer">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center text-3xl font-bold shadow-sm">
                {formData.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={24} className="text-white" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <input type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
              <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position</label>
              <input type="text" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white" />
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-slate-700 space-y-4 mt-2">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5"><Lock size={12} /> Email (Read-only)</label>
                <input type="text" value={user?.email || 'louis@kcoffee.com'} disabled className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-500 cursor-not-allowed" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5"><Lock size={12} /> Department (Read-only)</label>
                <input type="text" value="Marketing" disabled className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-500 cursor-not-allowed" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={isSaving} className="px-5 py-2 font-medium text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
