import React, { useState, useEffect } from 'react';
import { Search, Sun, Moon, History, Bell, Sidebar, Globe, LogOut, Home, CheckSquare, FolderKanban, Users, BarChart2, Box, AlertCircle, ChevronRight } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../common/KpiCard';
import { useUiStore } from '../../store/uiStore';
import { useTranslation } from '../../i18n/translations';
import { useAuthStore } from '../../store/authStore';
import { GlobalSearch } from '../features/design/GlobalSearch';

export const Header: React.FC = () => {
  const signOut = useAuthStore(state => state.signOut);
  const { theme, toggleTheme, lang, setLang, toggleSidebar, isSidebarOpen } = useUiStore();
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


  const location = useLocation();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const navGroups = [
    {
      title: t('nav.main'),
      items: [
        { name: t('nav.home'), path: '/', icon: <Home size={18} /> },
        { name: 'Dashboard', path: '/ui-dashboard', icon: <BarChart2 size={18} /> }
      ]
    },
    {
      title: t('nav.tasksProj'),
      items: [
        { name: t('nav.tasks'), path: '/tasks', icon: <CheckSquare size={18} /> },
        { name: t('nav.projects'), path: '/projects', icon: <FolderKanban size={18} /> },
        { name: t('nav.myTasks'), path: '/my-tasks', icon: <Users size={18} /> },
        { name: t('nav.designTeam'), path: '/project', icon: <AlertCircle size={18} /> },
      ]
    },
    {
      title: t('nav.assets'),
      items: [
        { name: t('nav.inventory'), path: '/assets', icon: <Box size={18} /> },
        { name: t('nav.borrow'), path: '/borrow-requests', icon: <History size={18} /> },
      ]
    },
    {
      title: t('nav.teamRep'),
      items: [
        { name: t('nav.team'), path: '/team', icon: <Users size={18} /> },
        { name: 'Members', path: '/members', icon: <Users size={18} /> },
        { name: t('nav.reports'), path: '/reports', icon: <BarChart2 size={18} /> },
      ]
    }
  ];

  // Auto expand the group that contains the current active route on mount or location change
  useEffect(() => {
    if (!isSidebarOpen) {
      const activeGroup = navGroups.find(g => g.items.some(i => i.path === location.pathname));
      if (activeGroup) {
        setExpandedGroup(activeGroup.title);
      }
    }
  }, [location.pathname, isSidebarOpen, t]);


  return (
    <>
    <header className="h-16 flex items-center justify-between px-4 md:px-8 mx-4 mt-4 rounded-2xl card-hub shadow-sm z-[100] relative">
      
      {/* LEFT AREA */}
      <div className="flex items-center gap-4 text-sm font-medium text-gray-600 flex-1 min-w-0 pr-4">
        <Sidebar size={20} onClick={toggleSidebar} className="cursor-pointer hover:text-primary transition-colors hidden md:block" />
        
        {isSidebarOpen ? (
          <div className="hidden md:flex items-center gap-2">
            <span className="hover:text-primary cursor-pointer transition-colors" onClick={toggleSidebar}>{t('header.dashboards')}</span>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 dark:text-gray-100 font-semibold bg-gray-50 dark:bg-slate-700 px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-600">Default</span>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-1 overflow-x-auto hide-scrollbar w-full">
            {navGroups.map(group => (
              <div 
                key={group.title} 
                className={cn(
                  "flex items-center rounded-xl border transition-all duration-300 overflow-hidden flex-shrink-0",
                  expandedGroup === group.title 
                    ? "bg-gray-50/80 dark:bg-slate-800/80 border-gray-200 dark:border-slate-700 shadow-sm" 
                    : "border-transparent hover:bg-gray-50 dark:hover:bg-slate-800"
                )}
              >
                <button 
                  onClick={() => setExpandedGroup(expandedGroup === group.title ? null : group.title)}
                  className={cn(
                    "px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1",
                    expandedGroup === group.title 
                      ? "text-primary dark:text-white" 
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  {group.title}
                  <ChevronRight size={14} className={cn("transition-transform duration-300", expandedGroup === group.title && "rotate-90")} />
                </button>
                
                <div 
                  className={cn(
                    "flex items-center transition-all duration-500 ease-in-out",
                    expandedGroup === group.title ? "max-w-[800px] opacity-100 pr-1 pl-0" : "max-w-0 opacity-0 px-0"
                  )}
                >
                  {group.items.map(item => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) => cn(
                        "px-3 py-1.5 mx-0.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap",
                        isActive 
                          ? "bg-white dark:bg-slate-700 text-primary dark:text-primary shadow-sm border border-gray-200 dark:border-slate-600 font-semibold" 
                          : "text-gray-500 hover:text-primary hover:bg-white dark:text-gray-400 dark:hover:bg-slate-700 dark:hover:text-gray-200"
                      )}
                    >
                      {item.icon}
                      <span className="text-xs">{item.name}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mobile Left: Lang and Theme */}
        <div className="flex md:hidden items-center gap-1">
          <button 
            onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all flex items-center gap-1 font-bold text-xs"
          >
            <Globe size={18} /> <span className="hidden sm:inline">{lang.toUpperCase()}</span>
          </button>
          <button 
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all text-gray-600 dark:text-gray-300"
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
            className="pl-10 pr-16 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm w-32 md:w-56 transition-all text-gray-500 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            {t('header.search')}
          </div>
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-0.5 text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 font-mono">⌘K</kbd>
        </div>
        
        <div className="flex items-center gap-1 md:gap-3 text-gray-600 dark:text-gray-300">
          <button 
            onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all hidden md:flex items-center gap-1 font-bold text-xs"
          >
            <Globe size={18} /> {lang.toUpperCase()}
          </button>
          
          <button 
            onClick={toggleTheme}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all hidden md:block"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all hidden md:block"><History size={20} /></button>
          <button onClick={() => setShowSearch(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all block sm:hidden"><Search size={20} /></button>
          
          <div className="relative">
            <button 
              onClick={() => setShowNotifs(!showNotifs)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all relative"
            >
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            
            {showNotifs && (
              <div className="fixed inset-x-4 top-[80px] sm:absolute sm:inset-auto sm:right-0 sm:top-auto sm:mt-2 w-auto sm:w-80 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 z-[9999] overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 font-semibold text-gray-800 dark:text-gray-100 flex justify-between items-center">
                  <span>Notifications</span>
                  <span className="text-xs text-primary cursor-pointer hover:underline">Mark all as read</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="p-4 border-b border-gray-50 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">System Update</p>
                    <p className="text-xs text-gray-500 mt-1">Vercel deployment was successful. Check out the new offline mode!</p>
                  </div>
                  <div className="p-4 border-b border-gray-50 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Task Assigned</p>
                    <p className="text-xs text-gray-500 mt-1">Admin assigned you to "Hoàn thiện giao diện UI/UX"</p>
                  </div>
                </div>
                <div className="p-3 text-center text-xs text-gray-500 hover:text-primary cursor-pointer border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                  View all notifications
                </div>
              </div>
            )}
          </div>
          
          <button onClick={signOut} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-red-500 rounded-xl transition-all hidden md:block group" title="Logout">
            <LogOut size={20} className="group-hover:stroke-red-500" />
          </button>
        </div>
      </div>
    </header>
      <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </>
  );
};
