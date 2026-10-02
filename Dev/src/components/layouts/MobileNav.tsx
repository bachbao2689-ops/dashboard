import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, CheckSquare, FolderKanban, Bell, User } from 'lucide-react';
import { cn } from '../common/KpiCard';
import { useTranslation } from '../../i18n/translations';

export const MobileNav: React.FC = () => {
  const { t } = useTranslation();
  
  const navItems = [
    { name: t('nav.home'), path: '/', icon: <Home size={22} /> },
    { name: t('nav.tasks'), path: '/tasks', icon: <CheckSquare size={22} /> },
    { name: t('nav.projects'), path: '/projects', icon: <FolderKanban size={22} /> },
    { name: t('nav.overdue'), path: '/overdue', icon: <Bell size={22} /> },
    { name: t('nav.myTasks'), path: '/my-tasks', icon: <User size={22} /> },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 glass-panel rounded-t-3xl border-b-0 z-50 flex items-center justify-around px-2 shadow-[0_-8px_32px_0_rgba(31,38,135,0.1)]">
      {navItems.map((item) => (
        <NavLink
          key={item.name}
          to={item.path}
          className={({ isActive }) => cn(
            "flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all",
            isActive 
              ? "text-primary bg-white/50 shadow-inner dark:bg-gray-800/50" 
              : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          )}
        >
          {item.icon}
        </NavLink>
      ))}
    </div>
  );
};
