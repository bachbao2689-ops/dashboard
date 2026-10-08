import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useUiStore } from '../../../store/uiStore';

type Preferences = { email_new_task: boolean; email_due_task: boolean; notif_new_borrow: boolean; notif_borrow_result: boolean; language: string; timezone: string };
const defaults: Preferences = { email_new_task: true, email_due_task: true, notif_new_borrow: true, notif_borrow_result: true, language: 'vi', timezone: 'Asia/Ho_Chi_Minh' };

export const ProfileSettingsTab: React.FC = () => {
  const profileId = useAuthStore(state => state.profile?.id);
  const { theme, toggleTheme } = useUiStore();
  const [settings, setSettings] = useState<Preferences>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!profileId) { if (active) setLoading(false); return; }
      const { data, error } = await supabase.from('user_preferences').select('email_new_task, email_due_task, notif_new_borrow, notif_borrow_result, language, timezone').eq('user_id', profileId).maybeSingle();
      if (!active) return;
      if (error) toast.error('Không thể tải cài đặt cá nhân'); else if (data) setSettings(data as Preferences);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [profileId]);

  const save = async (next: Preferences) => {
    if (!profileId) return;
    setSettings(next); setSaving(true);
    const { error } = await supabase.from('user_preferences').upsert({ user_id: profileId, ...next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    setSaving(false);
    if (error) toast.error('Không thể lưu cài đặt'); else toast.success('Đã lưu cài đặt');
  };
  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => <button type="button" aria-pressed={value} onClick={onChange} className={`w-10 h-5 p-1 flex items-center rounded-full transition-colors ${value ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}><span className={`w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-4.5' : ''}`} /></button>;
  const setValue = <K extends keyof Preferences>(key: K, value: Preferences[K]) => void save({ ...settings, [key]: value });
  if (loading) return <div className="card-hub p-6 rounded-2xl text-sm text-gray-500">Đang tải cài đặt…</div>;

  return <div className="card-hub p-6 rounded-2xl shadow-sm space-y-8">
    <section><h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Thông báo {saving && <span className="text-xs text-gray-400 font-normal">Đang lưu…</span>}</h3><div className="space-y-4">
      <div className="flex items-center justify-between"><span className="text-sm font-medium">Email khi được giao task</span><Toggle value={settings.email_new_task} onChange={() => setValue('email_new_task', !settings.email_new_task)} /></div>
      <div className="flex items-center justify-between"><span className="text-sm font-medium">Email khi task đến hạn</span><Toggle value={settings.email_due_task} onChange={() => setValue('email_due_task', !settings.email_due_task)} /></div>
      <div className="flex items-center justify-between"><span className="text-sm font-medium">Thông báo borrow request mới</span><Toggle value={settings.notif_new_borrow} onChange={() => setValue('notif_new_borrow', !settings.notif_new_borrow)} /></div>
      <div className="flex items-center justify-between"><span className="text-sm font-medium">Thông báo kết quả borrow</span><Toggle value={settings.notif_borrow_result} onChange={() => setValue('notif_borrow_result', !settings.notif_borrow_result)} /></div>
    </div></section>
    <section className="border-t border-gray-200 dark:border-[#8fa8d0] pt-6"><h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Tuỳ chỉnh</h3><div className="space-y-4 max-w-sm">
      <label className="block text-sm font-medium">Ngôn ngữ<select value={settings.language} onChange={e => setValue('language', e.target.value)} className="mt-1 block w-full px-4 py-2 rounded-xl border bg-gray-50 dark:bg-slate-900"><option value="vi">Tiếng Việt</option><option value="en">English</option></select></label>
      <label className="block text-sm font-medium">Theme<select value={theme} onChange={e => { if (e.target.value !== theme) toggleTheme(); }} className="mt-1 block w-full px-4 py-2 rounded-xl border bg-gray-50 dark:bg-slate-900"><option value="light">Light</option><option value="dark">Dark</option></select></label>
      <label className="block text-sm font-medium">Timezone<select value={settings.timezone} onChange={e => setValue('timezone', e.target.value)} className="mt-1 block w-full px-4 py-2 rounded-xl border bg-gray-50 dark:bg-slate-900"><option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option><option value="UTC">UTC</option></select></label>
    </div></section>
  </div>;
};
