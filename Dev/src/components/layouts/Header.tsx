import React from 'react';
import { Search, Sun, Moon, History, Bell, Sidebar, Globe, LogOut } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useTranslation } from '../../i18n/translations';

import { useAuthStore } from '../../store/authStore';

export const Header: React.FC = () => {
  const signOut = useAuthStore(state => state.signOut);
  const { theme, toggleTheme, lang, setLang } = useUiStore();
  const { t } = useTranslation();

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-8 mx-4 mt-4 rounded-2xl glass-panel z-10 relative border-b-0 border-white/40">
      <div className="flex items-center gap-4 text-sm font-medium text-gray-600">
        <Sidebar size={20} className="cursor-pointer hover:text-primary transition-colors hidden md:block" />
        
        {/* Mobile Logo */}
        <div className="md:hidden flex items-center gap-2">
          <img src="/logo-light.svg" alt="K COFFEE" className="h-8 w-auto drop-shadow-md block dark:hidden" />
          <img src="/logo-dark.svg" alt="K COFFEE" className="h-8 w-auto drop-shadow-md hidden dark:block" />
        </div>

        <div className="hidden md:flex items-center gap-2">
          <span className="hover:text-primary cursor-pointer transition-colors">{t('header.dashboards')}</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-semibold bg-white/40 px-3 py-1 rounded-lg backdrop-blur-md border border-white/50">Default</span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative group hidden sm:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder={t('header.search')} 
            className="pl-10 pr-4 py-2 bg-white/40 backdrop-blur-md border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white/60 w-32 md:w-56 transition-all placeholder-gray-500 shadow-inner text-gray-800 dark:text-gray-100"
          />
        </div>
        <div className="flex items-center gap-1 md:gap-3 text-gray-600">
          <button 
            onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
            className="p-2 hover:bg-white/50 rounded-xl transition-all flex items-center gap-1 font-bold text-xs"
          >
            <Globe size={18} /> {lang.toUpperCase()}
          </button>
          
          <button 
            onClick={toggleTheme}
            className="p-2 hover:bg-white/50 rounded-xl transition-all hidden sm:block"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <button className="p-2 hover:bg-white/50 rounded-xl transition-all hidden sm:block"><History size={20} /></button>
          <button className="p-2 hover:bg-white/50 rounded-xl transition-all block sm:hidden"><Search size={20} /></button>
          <button className="p-2 hover:bg-white/50 rounded-xl transition-all relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
          
          <button onClick={signOut} className="p-2 hover:bg-white/50 hover:text-red-500 rounded-xl transition-all hidden md:block group" title="Logout">
            <LogOut size={20} className="group-hover:stroke-red-500" />
          </button>
          
          <button className="p-2 hover:bg-white/50 rounded-xl transition-all block md:hidden">
            <img src="https://i.pravatar.cc/150?u=byewind" className="w-6 h-6 rounded-full border border-white/80" alt="avatar" />
          </button>
        </div>
      </div>
    </header>
  );
};
