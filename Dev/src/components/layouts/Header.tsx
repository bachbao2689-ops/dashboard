import React, { useState, useEffect } from 'react';
import { Search, Sun, Moon, History, Bell, Sidebar, Globe, LogOut } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useTranslation } from '../../i18n/translations';
import { useAuthStore } from '../../store/authStore';
import { GlobalSearch } from '../features/design/GlobalSearch';

export const Header: React.FC = () => {
  const signOut = useAuthStore(state => state.signOut);
  const { theme, toggleTheme, lang, setLang, toggleSidebar } = useUiStore();
  const { t } = useTranslation();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Ctrl+K or "/" to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
    <header className="h-16 flex items-center justify-between px-4 md:px-8 mx-4 mt-4 rounded-2xl glass-panel z-[100] relative border-b-0 border-white/40">
      
      {/* LEFT AREA */}
      <div className="flex items-center gap-4 text-sm font-medium text-gray-600">
        <Sidebar size={20} onClick={toggleSidebar} className="cursor-pointer hover:text-primary transition-colors hidden md:block" />
        
        <div className="hidden md:flex items-center gap-2">
          <span className="hover:text-primary cursor-pointer transition-colors" onClick={toggleSidebar}>{t('header.dashboards')}</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-semibold bg-white/40 px-3 py-1 rounded-lg backdrop-blur-md border border-white/50">Default</span>
        </div>

        {/* Mobile Left: Lang and Theme */}
        <div className="flex md:hidden items-center gap-1">
          <button 
            onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
            className="p-1.5 sm:p-2 hover:bg-white/50 rounded-xl transition-all flex items-center gap-1 font-bold text-xs"
          >
            <Globe size={18} /> <span className="hidden sm:inline">{lang.toUpperCase()}</span>
          </button>
          <button 
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 hover:bg-white/50 rounded-xl transition-all text-gray-600 dark:text-gray-300"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </div>

      {/* CENTER AREA (Mobile Logo) */}
      <div className="md:hidden absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        <img src="/logo-light.svg" alt="K COFFEE" className="h-7 sm:h-8 w-auto drop-shadow-md block dark:hidden" />
        <img src="/logo-dark.svg" alt="K COFFEE" className="h-7 sm:h-8 w-auto drop-shadow-md hidden dark:block" />
      </div>

      {/* RIGHT AREA */}
      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative group hidden sm:block" onClick={() => setShowSearch(true)}>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" />
          <div
            className="pl-10 pr-16 py-2 bg-white/40 backdrop-blur-md border border-white/60 rounded-xl text-sm w-32 md:w-56 transition-all text-gray-500 cursor-pointer hover:bg-white/60 shadow-inner"
          >
            {t('header.search')}
          </div>
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-0.5 text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 font-mono">⌘K</kbd>
        </div>
        
        <div className="flex items-center gap-1 md:gap-3 text-gray-600 dark:text-gray-300">
          <button 
            onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
            className="p-2 hover:bg-white/50 rounded-xl transition-all hidden md:flex items-center gap-1 font-bold text-xs"
          >
            <Globe size={18} /> {lang.toUpperCase()}
          </button>
          
          <button 
            onClick={toggleTheme}
            className="p-2 hover:bg-white/50 rounded-xl transition-all hidden md:block"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <button className="p-2 hover:bg-white/50 rounded-xl transition-all hidden md:block"><History size={20} /></button>
          <button onClick={() => setShowSearch(true)} className="p-2 hover:bg-white/50 rounded-xl transition-all block sm:hidden"><Search size={20} /></button>
          
          <div className="relative">
            <button 
              onClick={() => setShowNotifs(!showNotifs)}
              className="p-2 hover:bg-white/50 rounded-xl transition-all relative"
            >
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            
            {showNotifs && (
              <div className="fixed inset-x-4 top-[80px] sm:absolute sm:inset-auto sm:right-0 sm:top-auto sm:mt-2 w-auto sm:w-80 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[9999] overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 font-semibold text-gray-800 dark:text-gray-100 flex justify-between items-center">
                  <span>Notifications</span>
                  <span className="text-xs text-primary cursor-pointer hover:underline">Mark all as read</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="p-4 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">System Update</p>
                    <p className="text-xs text-gray-500 mt-1">Vercel deployment was successful. Check out the new offline mode!</p>
                  </div>
                  <div className="p-4 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Task Assigned</p>
                    <p className="text-xs text-gray-500 mt-1">Admin assigned you to "Hoàn thiện giao diện UI/UX"</p>
                  </div>
                </div>
                <div className="p-3 text-center text-xs text-gray-500 hover:text-primary cursor-pointer border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                  View all notifications
                </div>
              </div>
            )}
          </div>
          
          <button onClick={signOut} className="p-2 hover:bg-white/50 hover:text-red-500 rounded-xl transition-all hidden md:block group" title="Logout">
            <LogOut size={20} className="group-hover:stroke-red-500" />
          </button>
        </div>
      </div>
    </header>
      <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </>
  );
};
