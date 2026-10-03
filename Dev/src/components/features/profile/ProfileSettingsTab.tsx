import React, { useState } from 'react';
import { useUiStore } from '../../../store/uiStore';

export const ProfileSettingsTab: React.FC = () => {
  const { theme, toggleTheme } = useUiStore();
  const [settings, setSettings] = useState({
    emailNewTask: true,
    emailDueTask: true,
    notifNewBorrow: true,
    notifBorrowResult: true,
    lang: 'vi',
    timezone: 'Asia/Ho_Chi_Minh'
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings(s => ({ ...s, [key]: !s[key] }));
  };

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <div 
      onClick={onChange}
      className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform ${checked ? 'translate-x-4.5' : ''}`}></div>
    </div>
  );

  return (
    <div className="glass-panel p-6 rounded-3xl space-y-8">
      
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Thông báo email khi được giao task</span>
            <ToggleSwitch checked={settings.emailNewTask} onChange={() => toggle('emailNewTask')} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Thông báo email khi task đến hạn (&lt; 24h)</span>
            <ToggleSwitch checked={settings.emailDueTask} onChange={() => toggle('emailDueTask')} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Thông báo khi có borrow request mới (manager)</span>
            <ToggleSwitch checked={settings.notifNewBorrow} onChange={() => toggle('notifNewBorrow')} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Thông báo khi borrow được duyệt/từ chối (staff)</span>
            <ToggleSwitch checked={settings.notifBorrowResult} onChange={() => toggle('notifBorrowResult')} />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Preferences</h3>
        <div className="space-y-4 max-w-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ngôn ngữ</label>
            <select value={settings.lang} onChange={e => setSettings({...settings, lang: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary outline-none dark:text-white">
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Theme</label>
            <select value={theme} onChange={(e) => {
              if (e.target.value === 'dark' && theme !== 'dark') toggleTheme();
              if (e.target.value === 'light' && theme !== 'light') toggleTheme();
            }} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary outline-none dark:text-white">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
            <select value={settings.timezone} onChange={e => setSettings({...settings, timezone: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary outline-none dark:text-white">
              <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>
      </div>
      
    </div>
  );
};
