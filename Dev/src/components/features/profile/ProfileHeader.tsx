import { ActionButton } from '../../common/ActionButton';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Bell, BellOff, Camera, Edit3, LogOut, Mail, Settings, Shield, X } from 'lucide-react';
import { useAuthStore, assertOwnAuthAccount } from '../../../store/authStore';
import { useUiStore } from '../../../store/uiStore';
import { supabase } from '../../../services/supabase';
import { toast } from 'react-hot-toast';
import { EditProfileModal } from './EditProfileModal';
import { CropModal } from '../../common/CropModal';
import { ProfileKpis } from './ProfileKpis';
import { useTranslation } from '../../../i18n/translations';
import {
  captureAnchorRect,
  computeAnchoredPopoverCoords,
  type AnchoredPopoverCoords,
} from '../../../lib/anchoredPopoverPosition';

export const ProfileHeader: React.FC<{ role: string }> = ({ role }) => {
  const { t, lang } = useTranslation();
  const isEn = lang === 'en';
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);
  const updateUserMetadata = useAuthStore((state) => state.updateUserMetadata);

  const notificationsMuted = useUiStore((state) => state.notificationsMuted);
  const toggleNotificationsMuted = useUiStore((state) => state.toggleNotificationsMuted);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [initialEditTab, setInitialEditTab] = useState<'profile' | 'password'>('profile');
  const [isUploading, setIsUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<AnchoredPopoverCoords>({
    top: 84,
    left: 16,
    placeAbove: false,
  });
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const settingsPopoverRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = useCallback(() => {
    const rect = captureAnchorRect(settingsTriggerRef.current);
    if (!rect || typeof window === 'undefined') return;
    setMenuCoords(
      computeAnchoredPopoverCoords(
        rect,
        272,
        152,
        window.innerWidth,
        window.innerHeight,
        8,
        12
      )
    );
  }, []);

  useEffect(() => {
    if (searchParams.get('action') === 'change-password') {
      setInitialEditTab('password');
      setIsEditModalOpen(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('action');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!settingsMenuOpen) return;
    updateMenuPosition();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsMenuOpen(false);
    };
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        settingsTriggerRef.current &&
        !settingsTriggerRef.current.contains(target) &&
        settingsPopoverRef.current &&
        !settingsPopoverRef.current.contains(target)
      ) {
        setSettingsMenuOpen(false);
      }
    };
    const onScrollOrResize = () => updateMenuPosition();

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [settingsMenuOpen, updateMenuPosition]);

  const handleToggleSettingsMenu = () => {
    if (!settingsMenuOpen) {
      updateMenuPosition();
      setSettingsMenuOpen(true);
      return;
    }
    setSettingsMenuOpen(false);
  };

  const handleToggleMuteNotifications = () => {
    const nextMuted = !notificationsMuted;
    toggleNotificationsMuted();
    toast.success(
      nextMuted
        ? isEn
          ? 'Notifications muted'
          : 'Đã tắt thông báo'
        : isEn
          ? 'Notifications enabled'
          : 'Đã bật lại thông báo',
      { id: 'profile-notif-mute' }
    );
  };

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
      assertOwnAuthAccount();
      const path = `${user.id}/${Date.now()}.jpg`;
      const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });

      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: 'image/jpeg' });
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

  const name = profile?.name || user?.user_metadata?.full_name || t('profile.notUpdated');
  const initials = name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2);
  const dbRole = profile?.role || 'member';
  const roleDisplay =
    dbRole === 'admin'
      ? 'Admin'
      : dbRole === 'manager'
        ? 'Manager'
        : dbRole === 'leader'
          ? 'Leader'
          : lang === 'vi'
            ? 'Nhân viên'
            : 'Staff';
  const title =
    profile?.job_title ||
    (profile?.employment_level === 'Leader' || dbRole === 'leader'
      ? 'Team Lead'
      : lang === 'vi'
        ? 'Nhân viên'
        : 'Staff');
  const badge = profile?.employment_level || roleDisplay;
  const teamDept =
    !profile?.department_name ||
    profile.department_name === 'Chưa phân team' ||
    profile.department_name === 'Unassigned team'
      ? t('profile.noTeamAssigned')
      : profile.department_name;

  return (
    <>
      <div className="card-hub relative rounded-2xl p-4 shadow-sm sm:p-5">
        {/* Decorative background blur */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1fr_auto] xl:grid-cols-[auto_1fr_auto] items-center gap-4">
          <div className="col-span-1 grid grid-cols-[auto_1fr] items-center gap-4 min-w-0 sm:min-w-[240px]">
            <div className="relative group">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#002e6d] to-[#1d5bb8] text-2xl font-bold text-white shadow-sm transition-all hover:ring-2 hover:ring-[#002e6d] hover:ring-offset-2 cursor-pointer"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={name} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 grid place-items-center transition-opacity">
                  {isUploading ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Camera size={20} className="text-white" />
                  )}
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="min-w-0">
              <div className="inline-grid grid-flow-col auto-cols-max items-center gap-2 max-w-full">
                <h1 className="max-w-full truncate text-xl font-bold text-gray-900 dark:text-white">
                  {name}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    profile?.employment_level === 'Leader' ||
                    dbRole === 'leader' ||
                    dbRole === 'manager' ||
                    dbRole === 'admin'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}
                >
                  {badge}
                </span>
              </div>

              <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <div className="grid grid-cols-[auto_1fr] items-start gap-1.5">
                  <Mail size={14} className="mt-0.5 shrink-0" />
                  <span className="block max-w-full truncate">
                    {profile?.email || user?.email || t('profile.notUpdated')}
                  </span>
                </div>
                <div className="grid grid-cols-[auto_1fr] items-start gap-1.5">
                  <Shield size={14} className="mt-0.5 shrink-0" />
                  <span className="block max-w-full truncate">
                    {teamDept} · {title}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 xl:col-span-1 w-full min-w-0 xl:min-w-[420px]">
            <ProfileKpis role={role} />
          </div>

          <div className="mobile-actions-row col-span-1 md:col-auto inline-grid grid-flow-col auto-cols-max items-center justify-end gap-2 justify-self-end">
            <button
              ref={settingsTriggerRef}
              type="button"
              onClick={handleToggleSettingsMenu}
              aria-expanded={settingsMenuOpen}
              aria-haspopup="dialog"
              aria-label={isEn ? 'Settings' : 'Cài đặt'}
              title={isEn ? 'Settings' : 'Cài đặt'}
              className={`relative p-2 min-h-[38px] min-w-[38px] grid place-items-center rounded-xl transition-all border shadow-sm cursor-pointer ${
                settingsMenuOpen
                  ? 'bg-[#002e6d]/10 text-[#002e6d] border-[#002e6d]/40 shadow-xs dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/40'
                  : 'bg-white hover:bg-[#eef4ff] hover:text-[#002e6d] hover:border-blue-200/80 border-slate-200/90 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 text-gray-700 dark:text-slate-200'
              }`}
            >
              <Settings size={18} />
              {notificationsMuted && (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800 shadow-2xs"
                />
              )}
            </button>

            <ActionButton
              icon={<LogOut size={18} />}
              onClick={signOut}
              aria-label={t('profile.logout')}
              className="p-2 min-h-[38px] min-w-[38px] grid place-items-center bg-white hover:bg-red-50 hover:text-red-500 dark:bg-slate-800 dark:hover:bg-red-900/30 rounded-xl transition-colors border border-gray-200 dark:border-slate-700 text-gray-500 shadow-sm"
            />
          </div>
        </div>
      </div>

      {settingsMenuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={settingsPopoverRef}
            role="dialog"
            aria-label={isEn ? 'Profile settings' : 'Cài đặt hồ sơ'}
            data-anchored-popover="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: `${menuCoords.top}px`,
              left: `${menuCoords.left}px`,
              zIndex: 9999,
            }}
            className="w-[272px] max-w-[calc(100vw-24px)] rounded-[14px] border border-white/95 dark:border-slate-800/90 bg-white/95 dark:bg-[#071325]/95 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,46,109,0.14),0_2px_8px_rgba(0,0,0,0.04),inset_0_1.5px_1px_0_rgba(255,255,255,1)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] text-xs text-gray-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden"
          >
            {/* Compact Header matching chat CommentPreviewPopover UX/UI */}
            <div className="grid grid-cols-[1fr_auto] items-center px-3.5 py-2.5 border-b border-slate-200/75 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#0a192f]/80">
              <div className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5">
                <Settings size={14} className="text-[#002e6d] dark:text-sky-400" />
                <span className="font-bold text-gray-900 dark:text-white">
                  {isEn ? 'Settings' : 'Cài đặt'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSettingsMenuOpen(false)}
                aria-label={isEn ? 'Close' : 'Đóng'}
                title={isEn ? 'Close' : 'Đóng'}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Settings Functions */}
            <div className="p-2 grid grid-cols-1 gap-1">
              <button
                type="button"
                onClick={() => {
                  setSettingsMenuOpen(false);
                  setIsEditModalOpen(true);
                }}
                className="w-full px-2.5 py-2.5 rounded-[8px] grid grid-cols-[auto_1fr] items-center gap-2.5 text-left text-xs font-semibold text-gray-800 dark:text-slate-100 hover:bg-[#eef4ff] hover:text-[#002e6d] dark:hover:bg-slate-800/80 dark:hover:text-sky-300 transition-colors cursor-pointer"
              >
                <Edit3 size={15} className="text-[#002e6d] dark:text-sky-400" />
                <span>{t('profile.editProfile')}</span>
              </button>

              <div
                onClick={handleToggleMuteNotifications}
                className="w-full px-2.5 py-2 rounded-[8px] grid grid-cols-[1fr_auto] items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="inline-grid grid-flow-col auto-cols-max items-center gap-2.5 min-w-0">
                  {notificationsMuted ? (
                    <BellOff size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <Bell size={15} className="text-slate-500 dark:text-slate-400 shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-gray-800 dark:text-slate-100 truncate">
                    {isEn ? 'Mute notifications' : 'Tắt thông báo'}
                  </span>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={notificationsMuted}
                  aria-label={isEn ? 'Mute notifications' : 'Tắt thông báo'}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleMuteNotifications();
                  }}
                  className={`w-11 h-6 rounded-full p-0.5 inline-grid grid-cols-[1fr] items-center cursor-pointer transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-inner shrink-0 ${
                    notificationsMuted ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    style={{ backgroundColor: '#ffffff' }}
                    className={`w-5 h-5 rounded-full !bg-white dark:!bg-white shadow-md transform transition-transform duration-300 ease-in-out pointer-events-none ${
                      notificationsMuted ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setInitialEditTab('profile');
        }}
        initialTab={initialEditTab}
      />
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
